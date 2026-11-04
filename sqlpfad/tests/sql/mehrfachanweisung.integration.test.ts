import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  erstelleSqlRunner,
  type SqlMotor,
  SqlMotorFehler,
  type SqlRunner,
  STANDARDGRENZEN,
} from '@/domain/sql/runner';
import { erstelleMssqlMotor } from '../../runner/mssql-motor';

/**
 * Mehrere Anweisungen ohne Semikolon – gegen einen echten SQL Server.
 *
 * T-SQL verlangt zwischen zwei Anweisungen kein Semikolon. `SELECT 1 DELETE
 * FROM Kunden` sind deshalb zwei Anweisungen, und der Motor schickt die ganze
 * Eingabe als einen Batch. Die Anweisungsprüfung hat das früher nicht
 * gesehen: Sie trennt an den Semikola und sah ein einziges SELECT.
 *
 * Diese Datei hält drei Dinge fest, die sich nur am Server zeigen lassen:
 *
 *  1. **Der Befund ist echt.** Am Motor vorbei (wie in
 *     berechtigung.integration.test.ts) führt der Server beide Anweisungen
 *     aus, und die Daten der eigenen Sandbox ändern sich.
 *  2. **Die Grenze hält trotzdem.** Auch versteckt hinter einem SELECT
 *     erreicht nichts eine fremde Sandbox oder legt Serverobjekte an. Die
 *     Plattformdatenbank liegt ohnehin nicht auf diesem Server.
 *  3. **Die Prüfung schließt die Lücke, ohne legitime Abfragen zu treffen.**
 *     Über den Runner (mit Prüfung) werden dieselben Eingaben abgelehnt und
 *     ändern nichts; legitime Abfragen laufen weiter.
 *
 * Alle Daten sind synthetisch. Ohne Zugangsdaten übersprungen, nicht
 * bestanden – siehe motor.integration.test.ts.
 */

const host = process.env.SQL_SERVER_HOST;
const passwort = process.env.SQL_SERVER_SA_PASSWORD;
const vorhanden = Boolean(host && passwort);

const EIGENE = 'sbx_mehrfach_eigene';
const FREMDE = 'sbx_mehrfach_fremde';

const SCHEMA_SKRIPT = `
CREATE TABLE Kunden (
  KundeId int NOT NULL PRIMARY KEY,
  Name    nvarchar(80) NOT NULL,
  Stadt   nvarchar(80) NULL,
  Aktiv   bit NOT NULL
);
INSERT INTO Kunden (KundeId, Name, Stadt, Aktiv) VALUES
  (1, N'Testkundin A', N'Musterstadt', 1),
  (2, N'Testkunde B', N'Beispielheim', 1),
  (3, N'Testkundin C', NULL, 0);
CREATE TABLE Auftraege (
  AuftragId int NOT NULL PRIMARY KEY,
  KundeId   int NOT NULL,
  Betrag    decimal(10, 2) NOT NULL,
  Datum     date NOT NULL
);
INSERT INTO Auftraege (AuftragId, KundeId, Betrag, Datum) VALUES
  (10, 1, 120.00, '2026-01-05'),
  (11, 1, 80.50, '2026-02-10'),
  (12, 2, 45.00, '2026-03-15');
`;

const beschreibe = vorhanden ? describe : describe.skip;

beschreibe('Mehrfachanweisungen ohne Semikolon gegen SQL Server', () => {
  let motor: SqlMotor;
  let runner: SqlRunner;

  /** Am Motor – also an der Anweisungsprüfung – vorbei, in der eigenen Sandbox. */
  const amMotorVorbei = (sqlText: string, sandboxId = EIGENE): ReturnType<SqlMotor['fuehreAus']> =>
    motor.fuehreAus(
      { sandboxId, ausfuehrungId: 'mehrfach', sql: sqlText, erlaubteKlassen: ['SELECT'] },
      STANDARDGRENZEN,
    );

  /** Über den Runner, wie eine Leseaufgabe: mit Anweisungsprüfung. */
  const alsLeseaufgabe = (sqlText: string): ReturnType<SqlRunner['execute']> =>
    runner.execute({
      sandboxId: EIGENE,
      ausfuehrungId: 'mehrfach-runner',
      sql: sqlText,
      erlaubteKlassen: ['SELECT'],
    });

  const anzahlKunden = async (sandboxId = EIGENE): Promise<unknown> =>
    (await amMotorVorbei('SELECT COUNT(*) FROM Kunden', sandboxId)).resultset?.zeilen[0]?.[0];

  const tabellen = async (): Promise<string[]> =>
    (
      (await amMotorVorbei("SELECT name FROM sys.tables WHERE type = 'U' ORDER BY name")).resultset
        ?.zeilen ?? []
    ).map(([name]) => String(name));

  beforeAll(async () => {
    motor = erstelleMssqlMotor({
      host: host as string,
      port: Number(process.env.SQL_SERVER_PORT ?? 1433),
      verwaltung: { benutzer: 'sa', passwort: passwort as string },
      verschluesseln: true,
      zertifikatNichtPruefen: true,
      ladeSchemaSkript: async () => SCHEMA_SKRIPT,
    });
    runner = erstelleSqlRunner(motor);
    await motor.setzeSandboxZurueck(FREMDE);
  }, 180_000);

  // Jeder Fall beginnt mit der unveränderten eigenen Sandbox.
  beforeEach(async () => {
    await motor.setzeSandboxZurueck(EIGENE);
  }, 120_000);

  afterAll(async () => {
    await motor.setzeSandboxZurueck(EIGENE).catch(() => undefined);
    await motor.setzeSandboxZurueck(FREMDE).catch(() => undefined);
  }, 120_000);

  describe('Befund: der Server führt beide Anweisungen aus', () => {
    it('löscht mit SELECT 1 DELETE FROM Kunden die Daten der eigenen Sandbox', async () => {
      expect(await anzahlKunden()).toBe(3);
      const ergebnis = await amMotorVorbei('SELECT 1 DELETE FROM Kunden');
      // Erste Ergebnismenge vom SELECT. Der Treiber zählt die Zeilen aller
      // Anweisungen zusammen: eine vom SELECT und drei gelöschte vom DELETE.
      expect(ergebnis.resultset?.zeilen).toEqual([[1]]);
      expect(ergebnis.betroffeneZeilen).toBe(4);
      expect(await anzahlKunden()).toBe(0);
    });

    /*
     * Welche Formen ohne Semikolon der Server tatsächlich als zweite
     * Anweisung ausführt. Gemessen an der Wirkung, nicht an der Antwort.
     */
    it.each([
      ['Zeilenumbruch', 'SELECT 1\nDELETE FROM Kunden'],
      ['Blockkommentar ohne Leerraum', 'SELECT 1/**/DELETE FROM Kunden'],
      ['Zahl direkt davor', 'SELECT 1DELETE FROM Kunden'],
      ['Zeichenfolge direkt davor', "SELECT 'a'DELETE FROM Kunden"],
      ['Klammer direkt davor', 'SELECT (1)DELETE FROM Kunden'],
      ['hinter einem CTE', 'WITH k AS (SELECT 1 AS a) SELECT * FROM k DELETE FROM Kunden'],
      ['TRUNCATE', 'SELECT 1 TRUNCATE TABLE Kunden'],
      ['dynamisches SQL', "SELECT 1 EXEC('DELETE FROM Kunden')"],
      ['IF davor', 'SELECT 1 IF 1 = 1 DELETE FROM Kunden'],
    ])('leert Kunden auch mit %s', async (_wie, sqlText) => {
      await amMotorVorbei(sqlText);
      expect(await anzahlKunden()).toBe(0);
    });

    it('ändert Daten mit einem UPDATE hinter dem SELECT', async () => {
      await amMotorVorbei("SELECT 1 UPDATE Kunden SET Name = N'geändert'");
      const ergebnis = await amMotorVorbei("SELECT COUNT(*) FROM Kunden WHERE Name = N'geändert'");
      expect(ergebnis.resultset?.zeilen).toEqual([[3]]);
    });

    it('fügt mit einem INSERT hinter dem SELECT Zeilen hinzu', async () => {
      await amMotorVorbei("SELECT 1 INSERT INTO Kunden VALUES (9, N'neu', NULL, 1)");
      expect(await anzahlKunden()).toBe(4);
    });

    it('verwirft mit DROP TABLE hinter dem SELECT eine Tabelle', async () => {
      await amMotorVorbei('SELECT 1 DROP TABLE Auftraege');
      expect(await tabellen()).toEqual(['Kunden']);
    });

    it('legt mit SELECT … INTO eine Tabelle an', async () => {
      await amMotorVorbei('SELECT * INTO Kopie FROM Kunden');
      expect(await tabellen()).toContain('Kopie');
    });

    it('führt THROW ohne Semikolon davor nicht aus, sondern meldet einen Syntaxfehler', async () => {
      // Deshalb steht THROW nicht in der Liste der Prüfung.
      await expect(amMotorVorbei("SELECT 1 THROW 50000, 'x', 1")).rejects.toBeInstanceOf(
        SqlMotorFehler,
      );
    });
  });

  describe('Grenze: auch versteckt nichts über die eigene Sandbox hinaus', () => {
    it.each([
      ['in der fremden Sandbox löschen', `SELECT 1 DELETE FROM ${FREMDE}.dbo.Kunden`],
      ['die fremde Sandbox lesen', `SELECT 1 SELECT * FROM ${FREMDE}.dbo.Kunden`],
      ['die fremde Sandbox verwerfen', `SELECT 1 DROP DATABASE ${FREMDE}`],
      ['eine Datenbank anlegen', 'SELECT 1 CREATE DATABASE sbx_mehrfach_neu'],
      [
        'einen Anmeldenamen anlegen',
        "SELECT 1 CREATE LOGIN lrn_mehrfach WITH PASSWORD = 'Aa1!aaaaaaaa'",
      ],
      ['sich zum Besitzer machen', 'SELECT 1 ALTER ROLE db_owner ADD MEMBER CURRENT_USER'],
      ['eine Shell aufrufen', "SELECT 1 EXEC master.dbo.xp_cmdshell 'whoami'"],
      ['die Datenbank wechseln', `SELECT 1 USE ${FREMDE}`],
    ])('kann nicht %s', async (_was, sqlText) => {
      await expect(amMotorVorbei(sqlText)).rejects.toBeInstanceOf(SqlMotorFehler);
    });

    it('sieht auch hinter einem SELECT nur die eigene Datenbank', async () => {
      const ergebnis = await amMotorVorbei('SELECT 1 SELECT name FROM sys.databases');
      // Der Motor wertet nur die erste Ergebnismenge aus; die Liste prüft
      // berechtigung.integration.test.ts. Hier zählt, dass nichts scheitert
      // und keine weitere Datenbank auftaucht.
      expect(ergebnis.resultset?.zeilen).toEqual([[1]]);
      const liste = await amMotorVorbei('SELECT name FROM sys.databases');
      const namen = (liste.resultset?.zeilen ?? []).map(([name]) => String(name));
      expect(namen.every((name) => ['master', 'tempdb', EIGENE].includes(name))).toBe(true);
    });

    it('lässt die fremde Sandbox nach all dem unverändert', async () => {
      for (const sqlText of [
        `SELECT 1 DELETE FROM ${FREMDE}.dbo.Kunden`,
        `SELECT 1 DROP DATABASE ${FREMDE}`,
      ]) {
        await amMotorVorbei(sqlText).catch(() => undefined);
      }
      expect(await anzahlKunden(FREMDE)).toBe(3);
    });
  });

  describe('Prüfung: über den Runner abgelehnt und folgenlos', () => {
    it.each([
      'SELECT 1 DELETE FROM Kunden',
      'SELECT 1\nDELETE FROM Kunden',
      'SELECT 1/**/DELETE FROM Kunden',
      'SELECT 1DELETE FROM Kunden',
      "SELECT 'a'DELETE FROM Kunden",
      'SELECT (1)DELETE FROM Kunden',
      'WITH k AS (SELECT 1 AS a) SELECT * FROM k DELETE FROM Kunden',
      'SELECT 1 TRUNCATE TABLE Kunden',
      "SELECT 1 EXEC('DELETE FROM Kunden')",
      'SELECT 1 IF 1 = 1 DELETE FROM Kunden',
      "SELECT 1 UPDATE Kunden SET Name = N'geändert'",
      'SELECT 1 DROP TABLE Auftraege',
      'SELECT * INTO Kopie FROM Kunden',
    ])('lehnt ab, ohne etwas zu ändern: %s', async (sqlText) => {
      const ergebnis = await alsLeseaufgabe(sqlText);
      expect(ergebnis.art).toBe('abgelehnt');
      expect(await anzahlKunden()).toBe(3);
      expect(await tabellen()).toEqual(['Auftraege', 'Kunden']);
    });

    /*
     * Die Gegenseite am Server: Diese Abfragen sind gültiges T-SQL, enthalten
     * Schlüsselwörter an harmlosen Stellen und müssen weiter laufen.
     */
    it.each([
      ["SELECT Name FROM Kunden WHERE Name = N'bitte delete'", 0],
      ['SELECT [Name] AS [Update], Stadt AS "Delete" FROM Kunden', 3],
      ['SELECT Name /* drop table */ FROM Kunden -- delete\n', 3],
      ['SELECT Name FROM Kunden ORDER BY Name OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY', 1],
      [
        'WITH a AS (SELECT KundeId FROM Auftraege), b AS (SELECT DISTINCT KundeId FROM a) SELECT * FROM b',
        2,
      ],
      ['SELECT KundeId FROM Kunden UNION ALL SELECT KundeId FROM Auftraege EXCEPT SELECT 3', 2],
      [
        'SELECT * FROM Kunden k WHERE EXISTS (SELECT 1 FROM Auftraege a WHERE a.KundeId = k.KundeId)',
        2,
      ],
      ["SELECT CASE WHEN Aktiv = 1 THEN N'ja' ELSE N'nein' END FROM Kunden", 3],
      [
        'SELECT SUM(Betrag) OVER (ORDER BY Datum ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM Auftraege',
        3,
      ],
      ['SELECT TOP 1 WITH TIES KundeId FROM Auftraege ORDER BY KundeId', 2],
      ["SELECT * FROM OPENJSON(N'[1,2,3]')", 3],
      ['SELECT 0xDE AS Wert, $1.50 AS Preis, 1e2 AS Hundert', 1],
    ])('lässt laufen: %s', async (sqlText, zeilen) => {
      const ergebnis = await alsLeseaufgabe(sqlText);
      expect(ergebnis.art, JSON.stringify(ergebnis)).toBe('erfolg');
      if (ergebnis.art === 'erfolg') expect(ergebnis.resultset.zeilen).toHaveLength(zeilen);
    });
  });
});
