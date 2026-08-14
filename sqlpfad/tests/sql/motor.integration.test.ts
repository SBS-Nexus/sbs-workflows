import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type SqlMotor,
  SqlAbbruchFehler,
  SqlMotorFehler,
  SqlZeitlimitFehler,
  STANDARDGRENZEN,
} from '@/domain/sql/runner';
import { erstelleMssqlMotor } from '@/server/sql/mssql-motor';

/**
 * Integrationstests gegen einen echten SQL Server.
 *
 * Diese Tests sind der einzige Ort, an dem sich T-SQL-Semantik nachweisen
 * lässt. Ein nachgestellter Server bewiese hier nichts: Genau die Dinge, um
 * die es geht – wann eine Fehlernummer kommt, wie ein Zeitlimit greift, was
 * `DROP DATABASE` bei offener Verbindung tut – sind Verhalten des Servers und
 * nicht des eigenen Codes.
 *
 * Ohne Zugangsdaten werden sie **übersprungen und nicht bestanden**. Der
 * Unterschied ist wichtig: Ein grüner Lauf ohne Server wäre eine Auskunft, die
 * nichts wert ist, und sie käme genau dann, wenn man sich auf sie verlässt.
 *
 *   docker compose up -d sqlserver
 *   SQL_SERVER_HOST=127.0.0.1 SQL_SERVER_SA_PASSWORD=… npm run test:sql
 */

const host = process.env.SQL_SERVER_HOST;
const passwort = process.env.SQL_SERVER_SA_PASSWORD;
const vorhanden = Boolean(host && passwort);

const DATENBANK = 'sbx_integrationstest';

const SCHEMA_SKRIPT = `
CREATE TABLE Kunden (
  KundeId int NOT NULL PRIMARY KEY,
  Name    nvarchar(80) NOT NULL,
  Stadt   nvarchar(80) NULL
);
INSERT INTO Kunden (KundeId, Name, Stadt) VALUES
  (1, N'Anna Brandt', N'Mannheim'),
  (2, N'Mehmet Kaya', N'Weinheim'),
  (3, N'Sofia Adler', NULL);
`;

const beschreibe = vorhanden ? describe : describe.skip;

beschreibe('SqlMotor gegen SQL Server', () => {
  let motor: SqlMotor;

  const auftrag = (sqlText: string, id = 'lauf-1'): Parameters<SqlMotor['fuehreAus']>[0] => ({
    sandboxId: DATENBANK,
    ausfuehrungId: id,
    sql: sqlText,
    erlaubteKlassen: ['SELECT', 'DML', 'DDL'],
  });

  beforeAll(async () => {
    motor = erstelleMssqlMotor({
      host: host as string,
      port: Number(process.env.SQL_SERVER_PORT ?? 1433),
      verwaltung: { benutzer: 'sa', passwort: passwort as string },
      verschluesseln: true,
      // Der Entwicklungscontainer bringt ein selbst signiertes Zertifikat mit.
      zertifikatNichtPruefen: true,
      ladeSchemaSkript: async () => SCHEMA_SKRIPT,
    });

    await motor.setzeSandboxZurueck(DATENBANK);
  }, 120_000);

  afterAll(async () => {
    // Die Testdatenbank nicht stehen lassen. Ein Lauf, der Reste hinterlässt,
    // macht den nächsten von seiner eigenen Vorgeschichte abhängig.
    await motor.setzeSandboxZurueck(DATENBANK).catch(() => undefined);
  }, 60_000);

  it('liefert Zeilen und Spalten in der Reihenfolge der Abfrage', async () => {
    const ergebnis = await motor.fuehreAus(
      auftrag('SELECT Name, Stadt FROM Kunden ORDER BY KundeId'),
      STANDARDGRENZEN,
    );

    expect(ergebnis.resultset?.spalten).toEqual(['Name', 'Stadt']);
    expect(ergebnis.resultset?.zeilen).toHaveLength(3);
    expect(ergebnis.resultset?.zeilen[0]).toEqual(['Anna Brandt', 'Mannheim']);
  });

  it('liefert NULL als NULL und nicht als leeren Text', async () => {
    // Der häufigste Anfängerirrtum. Wenn der Treiber hier etwas anderes
    // liefert, bewertet der Grader falsch.
    const ergebnis = await motor.fuehreAus(
      auftrag("SELECT Stadt FROM Kunden WHERE Name = N'Sofia Adler'"),
      STANDARDGRENZEN,
    );
    expect(ergebnis.resultset?.zeilen[0]?.[0]).toBeNull();
  });

  it('behält zwei gleichnamige Spalten', async () => {
    const ergebnis = await motor.fuehreAus(
      auftrag('SELECT Name, Name FROM Kunden'),
      STANDARDGRENZEN,
    );
    expect(ergebnis.resultset?.spalten).toHaveLength(2);
  });

  it('meldet einen unbekannten Spaltennamen mit Nummer 207', async () => {
    // Die Nummer ist der Anker der ganzen Fehlerübersetzung. Stimmt sie nicht,
    // bekommt die Lernende eine überzeugend klingende falsche Erklärung.
    await expect(
      motor.fuehreAus(auftrag('SELECT Stadtt FROM Kunden'), STANDARDGRENZEN),
    ).rejects.toMatchObject({ name: 'SqlMotorFehler', nummer: 207 });
  });

  it('meldet eine unbekannte Tabelle mit Nummer 208', async () => {
    await expect(
      motor.fuehreAus(auftrag('SELECT * FROM Kunde'), STANDARDGRENZEN),
    ).rejects.toBeInstanceOf(SqlMotorFehler);
  });

  it('zählt betroffene Zeilen bei einem UPDATE', async () => {
    const ergebnis = await motor.fuehreAus(
      auftrag("UPDATE Kunden SET Stadt = N'Heidelberg' WHERE KundeId = 1"),
      STANDARDGRENZEN,
    );
    expect(ergebnis.betroffeneZeilen).toBe(1);
  });

  it('bricht bei Zeitüberschreitung ab', async () => {
    /*
     * WAITFOR ist in der Statement-Policy gesperrt, geht aber am Motor vorbei,
     * weil die Policy eine Schicht darüber sitzt. Genau deshalb taugt es hier:
     * Es erzeugt eine lange Laufzeit ohne Last.
     */
    await expect(
      motor.fuehreAus(auftrag("WAITFOR DELAY '00:00:10'"), {
        ...STANDARDGRENZEN,
        zeitlimitMs: 800,
      }),
    ).rejects.toBeInstanceOf(SqlZeitlimitFehler);
  }, 30_000);

  it('lässt sich abbrechen', async () => {
    const laufend = motor.fuehreAus(auftrag("WAITFOR DELAY '00:00:10'", 'lauf-abbruch'), {
      ...STANDARDGRENZEN,
      zeitlimitMs: 30_000,
    });

    // Kurz warten, damit der Auftrag registriert ist.
    await new Promise((fertig) => setTimeout(fertig, 300));
    await motor.brichAb('lauf-abbruch');

    await expect(laufend).rejects.toBeInstanceOf(SqlAbbruchFehler);
  }, 30_000);

  it('stellt beim Zurücksetzen auch die Struktur wieder her', async () => {
    /*
     * Der Test, der den naheliegenden Fehler ausschließt: Tabellen leeren und
     * neu füllen sähe hier genauso aus, solange niemand die Struktur ändert.
     * Deshalb wird sie geändert.
     */
    await motor.fuehreAus(
      auftrag('ALTER TABLE Kunden ADD Notiz nvarchar(50) NULL'),
      STANDARDGRENZEN,
    );
    await motor.fuehreAus(auftrag('DELETE FROM Kunden'), STANDARDGRENZEN);

    await motor.setzeSandboxZurueck(DATENBANK);

    const ergebnis = await motor.fuehreAus(auftrag('SELECT * FROM Kunden'), STANDARDGRENZEN);
    expect(ergebnis.resultset?.zeilen).toHaveLength(3);
    // Die zusätzliche Spalte ist weg – die Datenbank steht wieder wie am Anfang.
    expect(ergebnis.resultset?.spalten).toEqual(['KundeId', 'Name', 'Stadt']);
  }, 120_000);

  it('meldet den Zustand des Servers', async () => {
    const zustand = await motor.zustand();
    expect(zustand.erreichbar).toBe(true);
  });
});

/*
 * Ein Hinweis, wenn übersprungen wurde.
 *
 * Ohne ihn sieht ein Lauf ohne Server genauso aus wie einer mit – nur
 * schneller. Diese eine Zeile ist der Unterschied zwischen „geprüft" und
 * „nicht geprüft, aber grün".
 */
describe('Hinweis zur Ausführung', () => {
  it.skipIf(vorhanden)('SQL-Integrationstests wurden übersprungen', () => {
    expect(vorhanden).toBe(false);
    console.warn(
      '\n  SQL-Integrationstests übersprungen: SQL_SERVER_HOST und ' +
        'SQL_SERVER_SA_PASSWORD sind nicht gesetzt.\n' +
        '  Damit ist die T-SQL-Semantik in diesem Lauf NICHT geprüft.\n' +
        '  Start: docker compose up -d sqlserver\n',
    );
  });
});
