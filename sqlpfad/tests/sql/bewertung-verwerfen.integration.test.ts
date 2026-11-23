import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type SqlMotor, STANDARDGRENZEN } from '@/domain/sql/runner';
import type { AnweisungsKlasse } from '@/domain/sql/statement-policy';
import { erstelleMssqlMotor } from '../../runner/mssql-motor';

/**
 * Bewertungsläufe verändern die Sandbox nicht – auch nicht an der
 * Anweisungsprüfung vorbei (Review DEV-01, F1).
 *
 * Bewertet wird in der Sandbox, in der die Lernende übt. Die
 * Anweisungsprüfung hält Änderungen aus lesenden Aufgaben heraus, ist aber
 * ausdrücklich keine Grenze. Diese Tests rufen den Motor deshalb direkt auf,
 * mit allen Anweisungsklassen erlaubt, als hätte jemand eine Lücke in der
 * Prüfung gefunden – und verlangen, dass danach alles so ist wie vorher.
 *
 * Ohne Zugangsdaten übersprungen, nicht bestanden – siehe
 * motor.integration.test.ts.
 */

const host = process.env.SQL_SERVER_HOST;
const passwort = process.env.SQL_SERVER_SA_PASSWORD;
const vorhanden = Boolean(host && passwort);

const SANDBOX = 'sbx_bewertung_verwerfen';
const ALLE: AnweisungsKlasse[] = ['SELECT', 'DML', 'DDL', 'TRANSAKTION'];

const SCHEMA_SKRIPT = `
CREATE TABLE Kunden (
  KundeId int NOT NULL PRIMARY KEY,
  Name    nvarchar(80) NOT NULL
);
INSERT INTO Kunden (KundeId, Name) VALUES (1, N'Anna'), (2, N'Mehmet'), (3, N'Sofia');
`;

const beschreibe = vorhanden ? describe : describe.skip;

beschreibe('Bewertungsläufe verwerfen alles', () => {
  let motor: SqlMotor;
  let nummer = 0;

  const lauf = (sqlText: string, verwerfen: boolean): ReturnType<SqlMotor['fuehreAus']> =>
    motor.fuehreAus(
      {
        sandboxId: SANDBOX,
        ausfuehrungId: `verwerfen-${(nummer += 1)}`,
        sql: sqlText,
        erlaubteKlassen: ALLE,
        verwerfen,
      },
      STANDARDGRENZEN,
    );

  /** Der Stand der Sandbox: Zeilen in Kunden und Zahl der Tabellen. */
  const stand = async (): Promise<unknown[][]> =>
    (
      await lauf(
        "SELECT (SELECT COUNT(*) FROM Kunden) AS Zeilen, (SELECT COUNT(*) FROM sys.tables WHERE name <> 'Kunden') AS Fremde",
        false,
      )
    ).resultset?.zeilen ?? [];

  beforeAll(async () => {
    motor = erstelleMssqlMotor({
      host: host as string,
      port: Number(process.env.SQL_SERVER_PORT ?? 1433),
      verwaltung: { benutzer: 'sa', passwort: passwort as string },
      verschluesseln: true,
      zertifikatNichtPruefen: true,
      ladeSchemaSkript: async () => SCHEMA_SKRIPT,
    });
    await motor.setzeSandboxZurueck(SANDBOX);
  }, 180_000);

  beforeEach(async () => {
    // Jeder Fall beginnt beim eingespielten Stand.
    expect(await stand()).toEqual([[3, 0]]);
  });

  afterAll(async () => {
    await motor.setzeSandboxZurueck(SANDBOX).catch(() => undefined);
  }, 120_000);

  it('liefert das Ergebnis wie ein gewöhnlicher Lauf', async () => {
    const ergebnis = await lauf('SELECT Name FROM Kunden ORDER BY KundeId', true);
    expect(ergebnis.resultset?.zeilen).toEqual([['Anna'], ['Mehmet'], ['Sofia']]);
    expect(await stand()).toEqual([[3, 0]]);
  });

  it('die Gegenprobe: ohne Verwerfen bleibt eine Änderung', async () => {
    await lauf('DELETE FROM Kunden WHERE KundeId = 3', false);
    expect(await stand()).toEqual([[2, 0]]);
    await motor.setzeSandboxZurueck(SANDBOX);
  }, 120_000);

  it.each([
    ['SELECT mit angehängtem DELETE', 'SELECT 1 DELETE FROM Kunden'],
    ['Änderung und Abfrage', "UPDATE Kunden SET Name = N'x'; SELECT * FROM Kunden"],
    ['SELECT INTO', 'SELECT * INTO Kopie FROM Kunden'],
    ['Struktur', 'ALTER TABLE Kunden ADD Notiz nvarchar(10) NULL; CREATE TABLE Neu (Id int)'],
    ['Änderung, dann Laufzeitfehler', "DELETE FROM Kunden; SELECT CAST('x' AS int)"],
    ['festgeschrieben', 'DELETE FROM Kunden; COMMIT'],
    ['zurückgerollt und danach geändert', 'ROLLBACK; DELETE FROM Kunden'],
    ['festgeschrieben und neu begonnen', 'DELETE FROM Kunden; COMMIT; BEGIN TRANSACTION'],
    ['eigene Transaktion', 'BEGIN TRANSACTION; DELETE FROM Kunden; COMMIT'],
    ['dynamisches SQL', "EXEC('DELETE FROM Kunden')"],
  ])(
    'lässt nichts zurück: %s',
    async (_fall, sqlText) => {
      await lauf(sqlText, true).catch(() => undefined);
      expect(await stand()).toEqual([[3, 0]]);
    },
    120_000,
  );
});
