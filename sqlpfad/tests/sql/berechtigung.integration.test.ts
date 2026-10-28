import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type SqlMotor, SqlMotorFehler, STANDARDGRENZEN } from '@/domain/sql/runner';
import { erstelleMssqlMotor } from '../../runner/mssql-motor';

/**
 * Die Sicherheitsgrenze aus docs/SQL-RUNNER.md, Abschnitt 4 – gegen einen
 * echten SQL Server.
 *
 * Die Anweisungsprüfung ist ausdrücklich keine Sicherheitsgrenze; die Grenze
 * ist das Berechtigungsmodell: Lernenden-SQL läuft unter einem eigenen
 * Anmeldenamen je Sandbox, mit Lesen, Schreiben und Strukturänderung **in der
 * eigenen Datenbank** und nichts darüber hinaus. Was das heißt, lässt sich nur
 * am Server zeigen. Diese Tests rufen deshalb den Motor direkt auf, also an
 * der Anweisungsprüfung vorbei – genau so, als hätte jemand eine Lücke in ihr
 * gefunden.
 *
 * Ohne Zugangsdaten übersprungen, nicht bestanden – siehe
 * motor.integration.test.ts.
 */

const host = process.env.SQL_SERVER_HOST;
const passwort = process.env.SQL_SERVER_SA_PASSWORD;
const vorhanden = Boolean(host && passwort);

const EIGENE = 'sbx_grenze_eigene';
const FREMDE = 'sbx_grenze_fremde';

const SCHEMA_SKRIPT = `
CREATE TABLE Notizen (
  NotizId int NOT NULL PRIMARY KEY,
  Text    nvarchar(80) NOT NULL
);
INSERT INTO Notizen (NotizId, Text) VALUES (1, N'nur für diese Sandbox');
`;

const beschreibe = vorhanden ? describe : describe.skip;

beschreibe('Berechtigungsgrenze der Sandbox gegen SQL Server', () => {
  let motor: SqlMotor;

  const inEigener = (sqlText: string): ReturnType<SqlMotor['fuehreAus']> =>
    motor.fuehreAus(
      {
        sandboxId: EIGENE,
        ausfuehrungId: 'grenze',
        sql: sqlText,
        erlaubteKlassen: ['SELECT', 'DML', 'DDL'],
      },
      STANDARDGRENZEN,
    );

  beforeAll(async () => {
    motor = erstelleMssqlMotor({
      host: host as string,
      port: Number(process.env.SQL_SERVER_PORT ?? 1433),
      verwaltung: { benutzer: 'sa', passwort: passwort as string },
      verschluesseln: true,
      zertifikatNichtPruefen: true,
      ladeSchemaSkript: async () => SCHEMA_SKRIPT,
    });
    await motor.setzeSandboxZurueck(EIGENE);
    await motor.setzeSandboxZurueck(FREMDE);
  }, 180_000);

  afterAll(async () => {
    await motor.setzeSandboxZurueck(EIGENE).catch(() => undefined);
    await motor.setzeSandboxZurueck(FREMDE).catch(() => undefined);
  }, 120_000);

  it('arbeitet in der eigenen Datenbank: lesen, schreiben, Struktur ändern', async () => {
    // Die Gegenprobe zu allem Folgenden: Ohne sie bestünden die Tests auch
    // dann, wenn der Anmeldename überhaupt nichts dürfte.
    await inEigener('CREATE TABLE Entwurf (Id int NOT NULL)');
    await inEigener('INSERT INTO Entwurf (Id) VALUES (1), (2)');
    const ergebnis = await inEigener('SELECT COUNT(*) AS Anzahl FROM Entwurf');
    expect(ergebnis.resultset?.zeilen).toEqual([[2]]);
  });

  it('läuft unter dem Sandbox-Anmeldenamen, nicht unter der Verwaltung', async () => {
    const ergebnis = await inEigener(
      "SELECT SUSER_SNAME() AS Anmeldename, IS_SRVROLEMEMBER('sysadmin') AS Sysadmin, IS_MEMBER('db_owner') AS Besitzer",
    );
    const [anmeldename, sysadmin, besitzer] = ergebnis.resultset?.zeilen[0] ?? [];
    expect(anmeldename).not.toBe('sa');
    expect(String(anmeldename)).toMatch(/^lrn_/);
    expect(sysadmin).toBe(0);
    expect(besitzer).toBe(0);
  });

  it('liest keine fremde Sandbox, auch nicht mit vollem Namen', async () => {
    await expect(inEigener(`SELECT Text FROM ${FREMDE}.dbo.Notizen`)).rejects.toBeInstanceOf(
      SqlMotorFehler,
    );
  });

  it('sieht fremde Sandboxes nicht einmal in der Liste', async () => {
    const ergebnis = await inEigener('SELECT name FROM sys.databases');
    const namen = (ergebnis.resultset?.zeilen ?? []).map(([name]) => name);
    expect(namen).not.toContain(FREMDE);
    expect(namen.every((name) => ['master', 'tempdb', EIGENE].includes(String(name)))).toBe(true);
  });

  it.each([
    ['eine Datenbank anlegen', 'CREATE DATABASE sbx_grenze_neu'],
    ['einen Anmeldenamen anlegen', "CREATE LOGIN lrn_grenze_neu WITH PASSWORD = 'Aa1!aaaaaaaa'"],
    ['sich selbst zum Besitzer machen', 'ALTER ROLE db_owner ADD MEMBER CURRENT_USER'],
    ['Rechte an sich selbst vergeben', 'GRANT CONTROL ON DATABASE::sbx_grenze_eigene TO public'],
    ['eine Shell aufrufen', "EXEC master.dbo.xp_cmdshell 'whoami'"],
    ['eine fremde Sandbox verwerfen', `DROP DATABASE ${FREMDE}`],
  ])('darf nicht %s', async (_was, sqlText) => {
    await expect(inEigener(sqlText)).rejects.toBeInstanceOf(SqlMotorFehler);
  });

  it('lässt die fremde Sandbox nach all dem unberührt', async () => {
    // Nicht nur abgewiesen, sondern folgenlos: Die fremde Datenbank steht noch
    // und enthält, was sie enthielt – gelesen über ihren eigenen Anmeldenamen.
    const ergebnis = await motor.fuehreAus(
      {
        sandboxId: FREMDE,
        ausfuehrungId: 'grenze-fremde',
        sql: 'SELECT Text FROM Notizen',
        erlaubteKlassen: ['SELECT'],
      },
      STANDARDGRENZEN,
    );
    expect(ergebnis.resultset?.zeilen).toEqual([['nur für diese Sandbox']]);
  });
});
