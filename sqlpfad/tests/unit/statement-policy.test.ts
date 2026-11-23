import { describe, expect, it } from 'vitest';
import {
  bestimmeKlasse,
  entferneKommentareUndLiterale,
  pruefeAnweisung,
  teileAnweisungen,
} from '@/domain/sql/statement-policy';

const NUR_LESEN = ['SELECT'] as const;

describe('Kommentare und Literale entfernen', () => {
  it('lässt das Wort DELETE in einem Kommentar unberührt', () => {
    // Ohne diesen Schritt lehnt die Prüfung eine harmlose Abfrage ab, nur weil
    // in einer Notiz ein Schlüsselwort steht.
    const sql = 'SELECT Name FROM Kunden -- delete war hier mal\nWHERE Aktiv = 1';
    expect(bestimmeKlasse(sql)).toBe('SELECT');
  });

  it('lässt Schlüsselwörter in Zeichenfolgen unberührt', () => {
    const sql = "SELECT * FROM Notizen WHERE Text = 'bitte drop table ausführen'";
    expect(bestimmeKlasse(sql)).toBe('SELECT');
  });

  it('kommt mit verdoppelten Apostrophen zurecht', () => {
    const sql = "SELECT * FROM Kunden WHERE Name = 'O''Brien'";
    expect(bestimmeKlasse(sql)).toBe('SELECT');
  });

  it('behandelt geschachtelte Blockkommentare', () => {
    const sql = 'SELECT 1 /* aussen /* innen */ noch aussen */ FROM Kunden';
    expect(entferneKommentareUndLiterale(sql)).not.toContain('innen');
    expect(bestimmeKlasse(sql)).toBe('SELECT');
  });

  it('behält Bezeichner in eckigen Klammern', () => {
    // [Order Details] ist ein Tabellenname, kein Text.
    const sql = 'SELECT * FROM [Bestell Positionen]';
    expect(entferneKommentareUndLiterale(sql)).toContain('[Bestell Positionen]');
  });
});

describe('Anweisungen trennen', () => {
  it('trennt an den Semikola', () => {
    expect(teileAnweisungen('SELECT 1; SELECT 2')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('ignoriert ein abschließendes Semikolon', () => {
    expect(teileAnweisungen('SELECT 1;')).toEqual(['SELECT 1']);
  });

  it('trennt nicht an einem Semikolon in einer Zeichenfolge', () => {
    // Ein einfaches split(';') würde hier zwei kaputte Hälften erzeugen.
    const sql = "SELECT * FROM Notizen WHERE Text = 'a;b'";
    expect(teileAnweisungen(sql)).toEqual([sql]);
  });

  it('trennt nicht an einem Semikolon in einem Kommentar', () => {
    const sql = 'SELECT 1 -- hier steht ein ; im Text\n';
    expect(teileAnweisungen(sql)).toHaveLength(1);
  });

  it('gibt für eine leere Eingabe nichts zurück', () => {
    expect(teileAnweisungen('  \n /* nur ein Kommentar */ \n ')).toEqual([]);
  });

  it('behält den Originaltext jeder Anweisung', () => {
    // Die Lernende soll ihre Anweisung unverändert wiedersehen, nicht eine
    // von Literalen befreite Fassung.
    const teile = teileAnweisungen("SELECT 'O''Brien'; SELECT [Bestell Positionen].A FROM X");
    expect(teile[0]).toBe("SELECT 'O''Brien'");
    expect(teile[1]).toContain('[Bestell Positionen]');
  });
});

describe('Anweisungsklassen', () => {
  it.each([
    ['SELECT Name FROM Kunden', 'SELECT'],
    ['  select 1', 'SELECT'],
    ["INSERT INTO Kunden (Name) VALUES ('A')", 'DML'],
    ['UPDATE Kunden SET Aktiv = 0', 'DML'],
    ['DELETE FROM Kunden WHERE KundeId = 1', 'DML'],
    ['CREATE TABLE T (A int)', 'DDL'],
    ['ALTER TABLE T ADD B int', 'DDL'],
    ['BEGIN TRANSACTION', 'TRANSAKTION'],
    ['DECLARE @x int', 'PROGRAMMIERUNG'],
  ])('%s ist %s', (sql, erwartet) => {
    expect(bestimmeKlasse(sql)).toBe(erwartet);
  });

  it('erkennt ein CTE als das, was danach kommt', () => {
    // Ein führendes WITH gehört zum CTE. Entscheidend ist die Anweisung
    // dahinter - sonst gälte jede CTE-Lösung als unbekannt.
    const sql = 'WITH Aktive AS (SELECT * FROM Kunden WHERE Aktiv = 1) SELECT * FROM Aktive';
    expect(bestimmeKlasse(sql)).toBe('SELECT');
  });
});

describe('Serverweite Befehle', () => {
  it.each([
    "EXEC xp_cmdshell 'dir'",
    "BACKUP DATABASE Uebung TO DISK = 'x'",
    "CREATE LOGIN hacker WITH PASSWORD = 'x'",
    'USE master',
    "SELECT * FROM OPENROWSET('x','y','z')",
    "EXECUTE AS LOGIN = 'sa'",
    'SHUTDOWN',
  ])('lehnt ab: %s', (sql) => {
    const ergebnis = pruefeAnweisung(sql, ['SELECT', 'DML', 'DDL']);
    expect(ergebnis.erlaubt).toBe(false);
    expect(ergebnis.klasse).toBe('SERVER');
  });

  it('lehnt WAITFOR ab, weil es den Übungsserver blockiert', () => {
    expect(pruefeAnweisung("WAITFOR DELAY '00:10:00'", ['SELECT']).erlaubt).toBe(false);
  });
});

describe('Aufgabenbezogene Freigabe', () => {
  it('lässt SELECT in einer Lesenaufgabe zu', () => {
    expect(pruefeAnweisung('SELECT Name FROM Kunden', NUR_LESEN).erlaubt).toBe(true);
  });

  it('lehnt UPDATE in einer Lesenaufgabe ab und erklärt warum', () => {
    const ergebnis = pruefeAnweisung('UPDATE Kunden SET Aktiv = 0', NUR_LESEN);
    expect(ergebnis.erlaubt).toBe(false);
    // Die Begründung erklärt die Aufgabe, statt zu tadeln.
    expect(ergebnis.begruendung).toContain('Lesen von Daten');
  });

  it('lässt UPDATE zu, wo die Lektion es übt', () => {
    expect(pruefeAnweisung('UPDATE Kunden SET Aktiv = 0', ['SELECT', 'DML']).erlaubt).toBe(true);
  });

  it('weist unverständliche Eingaben freundlich zurück', () => {
    const ergebnis = pruefeAnweisung('kunden alle bitte', NUR_LESEN);
    expect(ergebnis.erlaubt).toBe(false);
    expect(ergebnis.begruendung).toContain('SELECT');
  });

  it('formuliert keine strafende Rückmeldung', () => {
    /*
     * Dieselbe Haltung wie in PythonPfad: Wer in einer SELECT-Lektion ein
     * UPDATE schreibt, hat die Aufgabe missverstanden und nichts Böses vor.
     */
    for (const sql of [
      'UPDATE Kunden SET Aktiv = 0',
      'CREATE TABLE T (A int)',
      'DECLARE @x int',
      'SELECT 1 DELETE FROM Kunden',
      'SELECT * INTO Kopie FROM Kunden',
    ]) {
      const { begruendung } = pruefeAnweisung(sql, NUR_LESEN);
      expect(begruendung).not.toMatch(/verboten|unerlaubt|falsch|Fehler|nicht erlaubt/i);
    }
  });
});

/*
 * T-SQL trennt Anweisungen auch ohne Semikolon: `SELECT 1 DELETE FROM Kunden`
 * sind für SQL Server zwei Anweisungen, und beide laufen – nachgewiesen in
 * tests/sql/mehrfachanweisung.integration.test.ts. Die Zerlegung an den
 * Semikola sieht nur eine, deren erstes Wort SELECT ist.
 */
describe('Weitere Anweisung ohne Semikolon hinter einem SELECT', () => {
  it('lehnt den gemeldeten Fall in einer Leseaufgabe ab', () => {
    const sql = 'SELECT 1 DELETE FROM Kunden';
    expect(teileAnweisungen(sql)).toHaveLength(1);
    const ergebnis = pruefeAnweisung(sql, NUR_LESEN);
    expect(ergebnis.erlaubt).toBe(false);
    expect(ergebnis.klasse).toBe('DML');
    expect(ergebnis.begruendung).toContain('DELETE');
    expect(ergebnis.begruendung).toContain('Semikolon');
    expect(ergebnis.begruendung).toContain('Lesen von Daten');
  });

  it.each([
    ['DML', "SELECT * FROM Kunden UPDATE Kunden SET Name = N'x'"],
    ['DML', "SELECT 1 INSERT INTO Kunden (Name) VALUES (N'x')"],
    [
      'DML',
      'SELECT 1 MERGE Kunden AS z USING (SELECT 1 AS a) AS q ON 1 = 0 ' +
        "WHEN NOT MATCHED THEN INSERT (Name) VALUES (N'x');",
    ],
    ['DDL', 'SELECT 1 DROP TABLE Kunden'],
    ['DDL', 'SELECT 1 TRUNCATE TABLE Kunden'],
    ['DDL', 'SELECT 1 CREATE TABLE T (a int)'],
    ['DDL', 'SELECT 1 ALTER TABLE Kunden ADD x int'],
    ['DDL', 'SELECT * INTO Kopie FROM Kunden'],
    ['PROGRAMMIERUNG', "SELECT 1 EXEC sp_rename 'Kunden', 'K'"],
    ['PROGRAMMIERUNG', "SELECT 1 EXEC('DELETE FROM Kunden')"],
    ['PROGRAMMIERUNG', "SELECT 1 EXECUTE ('DELETE FROM Kunden')"],
    ['PROGRAMMIERUNG', 'SELECT 1 DECLARE @x int'],
    ['PROGRAMMIERUNG', 'SELECT 1 IF 1 = 1 DELETE FROM Kunden'],
    ['PROGRAMMIERUNG', 'SELECT 1 WHILE 1 = 0 BREAK'],
    ['PROGRAMMIERUNG', 'SELECT 1 SET NOCOUNT ON'],
    ['PROGRAMMIERUNG', 'SELECT 1 PRINT 1'],
    ['TRANSAKTION', 'SELECT 1 BEGIN TRANSACTION'],
    ['SERVER', 'SELECT 1 GRANT SELECT ON Kunden TO public'],
    ['SERVER', 'SELECT 1 DENY SELECT ON Kunden TO public'],
    ['SERVER', "SELECT 1 DBCC CHECKIDENT('Kunden', RESEED, 0)"],
  ])('lehnt %s ab: %s', (klasse, sql) => {
    const ergebnis = pruefeAnweisung(sql, NUR_LESEN);
    expect(ergebnis.erlaubt).toBe(false);
    expect(ergebnis.klasse).toBe(klasse);
  });

  it.each([
    ['Zeilenumbruch', 'SELECT 1\nDELETE FROM Kunden'],
    ['Tabulator', 'SELECT 1\tDELETE FROM Kunden'],
    ['Blockkommentar ohne Leerraum', 'SELECT 1/**/DELETE FROM Kunden'],
    ['geschachtelter Kommentar', 'SELECT 1/* a /* b */ c */DELETE FROM Kunden'],
    ['Zeilenkommentar', 'SELECT 1 -- nur ein Kommentar\nDELETE FROM Kunden'],
    ['Zahl direkt davor', 'SELECT 1DELETE FROM Kunden'],
    ['Dezimalzahl direkt davor', 'SELECT 1.5DELETE FROM Kunden'],
    ['Exponent direkt davor', 'SELECT 1e5DELETE FROM Kunden'],
    // Ein Exponent ohne Ziffern ist für SQL Server eine Zahl (Review DEV-02).
    ['Exponent ohne Ziffern', 'SELECT 1eDELETE FROM Kunden'],
    ['Exponent mit Vorzeichen ohne Ziffern', 'SELECT 1E+DELETE FROM Kunden'],
    ['Punkt und Exponent', 'SELECT 1.eDELETE FROM Kunden'],
    ['Bruch ohne Vorkomma und Exponent', 'SELECT .5eDELETE FROM Kunden'],
    // Ein einzelner Wagenrücklauf beendet den Zeilenkommentar (Review DEV-02).
    ['Zeilenkommentar bis Wagenrücklauf', 'SELECT 1 -- nur ein Kommentar\rDELETE FROM Kunden'],
    ['Zeichenfolge direkt davor', "SELECT 'a'DELETE FROM Kunden"],
    ['Klammer direkt davor', 'SELECT (1)DELETE FROM Kunden'],
    ['Bezeichner in Klammern davor', 'SELECT [Name]DELETE FROM Kunden'],
    ['Kleinschreibung', 'select 1 delete from Kunden'],
    ['hinter einem CTE', 'WITH k AS (SELECT 1 AS a) SELECT * FROM k DELETE FROM Kunden'],
    ['hinter einer Unterabfrage', 'SELECT * FROM (SELECT 1 AS a) AS t DELETE FROM Kunden'],
  ])('erkennt sie auch mit %s', (_wie, sql) => {
    const ergebnis = pruefeAnweisung(sql, NUR_LESEN);
    expect(ergebnis.erlaubt).toBe(false);
    expect(ergebnis.klasse).toBe('DML');
  });

  it('erkennt das Muster auch nach einem Semikolon in der zweiten Anweisung', () => {
    // Jede Teilanweisung wird einzeln geprüft; die versteckte steckt im zweiten Teil.
    const teile = teileAnweisungen('SELECT 1; SELECT 2 DELETE FROM Kunden');
    expect(teile.map((t) => pruefeAnweisung(t, NUR_LESEN).erlaubt)).toEqual([true, false]);
  });

  it('lässt die versteckte Anweisung zu, wo ihre Klasse ohnehin erlaubt ist', () => {
    // In einer DML-Lektion ist `SELECT …; DELETE …` zulässig – ohne Semikolon
    // ist es für den Server dieselbe Eingabe.
    expect(pruefeAnweisung('SELECT 1 DELETE FROM Kunden', ['SELECT', 'DML']).erlaubt).toBe(true);
    // DDL bleibt dort trotzdem draußen.
    expect(pruefeAnweisung('SELECT 1 DROP TABLE Kunden', ['SELECT', 'DML']).erlaubt).toBe(false);
  });

  it('meldet für SELECT … INTO, dass eine Tabelle entsteht', () => {
    const ergebnis = pruefeAnweisung('SELECT * INTO Kopie FROM Kunden', NUR_LESEN);
    expect(ergebnis.begruendung).toContain('neue Tabelle');
  });
});

/*
 * Die Gegenseite: Die Suche nach versteckten Anweisungen darf keine
 * legitime Abfrage treffen. Jede dieser Abfragen ist in einer Leseaufgabe
 * zulässig; die meisten stammen so oder ähnlich aus dem Lehrplan.
 */
describe('Legitime SELECTs bleiben erlaubt', () => {
  it.each([
    ['Schlüsselwort in einer Zeichenfolge', "SELECT * FROM Notizen WHERE Text = 'bitte delete'"],
    ['Schlüsselwort mit verdoppeltem Apostroph', "SELECT 'O''Brien delete' AS Text"],
    ['Unicode-Zeichenfolge', "SELECT N'Update folgt' AS Hinweis"],
    [
      'Schlüsselwort im Zeilenkommentar',
      'SELECT Name FROM Kunden -- delete später\nWHERE Aktiv = 1',
    ],
    ['Schlüsselwort im Blockkommentar', 'SELECT Name /* drop table */ FROM Kunden'],
    ['Schlüsselwort als Bezeichner in eckigen Klammern', 'SELECT [Update], [Delete] FROM [Insert]'],
    ['eckige Klammer im Bezeichner', 'SELECT [a]]delete] FROM Kunden'],
    ['Schlüsselwort als Bezeichner in Anführungszeichen', 'SELECT "Update" FROM Kunden'],
    ['Schlüsselwort als Alias in Zeichenfolge', "SELECT 1 AS 'Delete'"],
    ['Variable mit Schlüsselwortnamen', 'SELECT @delete'],
    ['temporäre Tabelle mit Schlüsselwortnamen', 'SELECT * FROM #drop'],
    [
      'Wort, das ein Schlüsselwort enthält',
      'SELECT Updated, Deleted, Insertion, Settings FROM Log',
    ],
    ['OPENJSON ist kein OPEN', "SELECT * FROM OPENJSON(N'[1,2]')"],
    [
      'Seitenumbruch mit FETCH',
      'SELECT Name FROM Kunden ORDER BY Name OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY',
    ],
    [
      'Seitenumbruch mit FETCH FIRST ROW',
      'SELECT Name FROM Kunden ORDER BY Name OFFSET 0 ROWS FETCH FIRST 1 ROW ONLY',
    ],
    [
      'CTE mit zwei Definitionen',
      'WITH a AS (SELECT 1 AS x), b AS (SELECT x FROM a) SELECT * FROM b',
    ],
    ['UNION, EXCEPT, INTERSECT', 'SELECT 1 UNION ALL SELECT 2 EXCEPT SELECT 3 INTERSECT SELECT 1'],
    [
      'Unterabfrage in WHERE',
      'SELECT * FROM Kunden WHERE KundeId IN (SELECT KundeId FROM Auftraege)',
    ],
    [
      'EXISTS',
      'SELECT * FROM Kunden k WHERE EXISTS (SELECT 1 FROM Auftraege a WHERE a.KundeId = k.KundeId)',
    ],
    ['CASE … END', "SELECT CASE WHEN Aktiv = 1 THEN N'ja' ELSE N'nein' END AS Status FROM Kunden"],
    [
      'Fensterfunktion mit ROWS',
      'SELECT SUM(Betrag) OVER (ORDER BY Datum ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM Auftraege',
    ],
    [
      'GROUP BY und HAVING',
      'SELECT Stadt, COUNT(*) FROM Kunden GROUP BY Stadt HAVING COUNT(*) > 1',
    ],
    ['Datumsfunktionen', "SELECT DATEADD(day, 1, '2026-01-01'), YEAR(GETDATE())"],
    ['TOP WITH TIES', 'SELECT TOP 3 WITH TIES Name FROM Kunden ORDER BY Umsatz DESC'],
    [
      'CROSS APPLY',
      'SELECT * FROM Kunden k CROSS APPLY (SELECT TOP 1 * FROM Auftraege a WHERE a.KundeId = k.KundeId) x',
    ],
    ['Tabellenhinweis', 'SELECT * FROM Kunden WITH (NOLOCK)'],
    ['FOR JSON', 'SELECT Name FROM Kunden FOR JSON PATH'],
    ['Umlaute im Bezeichner', 'SELECT Größe, Straße FROM Lager'],
    ['Hexadezimalzahl', 'SELECT 0xDE AS Wert'],
    ['Exponenten', 'SELECT 1e5 AS a, 1.5E-3 AS b, 2E+2 AS c'],
    [
      'Zeilenkommentar mit Windows-Zeilenende',
      'SELECT Name FROM Kunden -- delete später\r\nWHERE Aktiv = 1',
    ],
    ['Geldbetrag', 'SELECT $1.50 AS Preis'],
    ['NULL-Prüfung', 'SELECT * FROM Kunden WHERE Telefon IS NOT NULL'],
    ['zwei SELECTs ohne Semikolon', 'SELECT 1 SELECT 2'],
  ])('%s', (_was, sql) => {
    const ergebnis = pruefeAnweisung(sql, NUR_LESEN);
    expect(ergebnis, sql).toEqual({ erlaubt: true, klasse: 'SELECT', begruendung: '' });
  });
});

/*
 * Review DEV-02: Auch hinter einer Änderung oder einer Transaktion kann ohne
 * Semikolon eine weitere Anweisung stehen, und es zählt jede, nicht nur die
 * erste. Die Fälle sind am Server nachgestellt – siehe
 * tests/sql/mehrfachanweisung.integration.test.ts.
 */
const LESEN_UND_AENDERN = ['SELECT', 'DML'] as const;
const MIT_TRANSAKTION = ['SELECT', 'DML', 'TRANSAKTION'] as const;

describe('Weitere Anweisung hinter einer Änderung oder Transaktion', () => {
  it.each([
    ['DDL', 'SELECT 1 DELETE FROM Kunden WHERE 1 = 0 DROP TABLE Kunden'],
    ['DDL', 'DELETE FROM Kunden WHERE 1 = 0 DROP TABLE Kunden'],
    ['DDL', 'INSERT INTO Kunden (Name) SELECT Name FROM Kunden WHERE 1 = 0 TRUNCATE TABLE Kunden'],
    ['DDL', "UPDATE Kunden SET Name = N'x' WHERE 1 = 0 CREATE TABLE T (a int)"],
    ['DDL', 'DELETE FROM Kunden WHERE 1 = 0 SELECT * INTO Kopie FROM Kunden'],
    ['DDL', 'DELETE FROM Kunden WHERE 1 = 0 -- x\rDROP TABLE Kunden'],
    ['PROGRAMMIERUNG', "UPDATE Kunden SET Name = Name WHERE 1 = 0 EXEC('DROP TABLE Kunden')"],
    ['PROGRAMMIERUNG', 'UPDATE Kunden SET Name = Name SET NOCOUNT ON'],
    ['PROGRAMMIERUNG', 'INSERT INTO Kunden (Name) VALUES (1) DECLARE @x int'],
    ['TRANSAKTION', "UPDATE Kunden SET Name = N'x' COMMIT"],
    [
      'DDL',
      'MERGE Kunden AS z USING (SELECT 1 AS a) AS q ON 1 = 0 ' +
        'WHEN NOT MATCHED BY SOURCE THEN DELETE DROP TABLE Kunden',
    ],
  ])('lehnt %s in einer Änderungsaufgabe ab: %s', (klasse, sql) => {
    expect(teileAnweisungen(sql)).toHaveLength(1);
    const ergebnis = pruefeAnweisung(sql, LESEN_UND_AENDERN);
    expect(ergebnis.erlaubt).toBe(false);
    expect(ergebnis.klasse).toBe(klasse);
  });

  it('meldet die erste nicht erlaubte, nicht die erste überhaupt', () => {
    const ergebnis = pruefeAnweisung(
      'SELECT 1 DELETE FROM Kunden WHERE 1 = 0 DROP TABLE Kunden',
      LESEN_UND_AENDERN,
    );
    expect(ergebnis.begruendung).toContain('DROP');
    expect(ergebnis.begruendung).not.toContain('DELETE');
  });

  it('lehnt DDL auch hinter einer Transaktion ab', () => {
    const ergebnis = pruefeAnweisung(
      'BEGIN TRANSACTION DELETE FROM Kunden WHERE 1 = 0 DROP TABLE Kunden',
      MIT_TRANSAKTION,
    );
    expect(ergebnis.erlaubt).toBe(false);
    expect(ergebnis.klasse).toBe('DDL');
  });

  /*
   * Die Gegenseite: INTO und SET gehören zu INSERT, MERGE und UPDATE selbst.
   * Die ersten drei sind die Musterlösungen aus Modul 4.
   */
  it.each([
    [
      LESEN_UND_AENDERN,
      "INSERT INTO Kunden (KundeId, Name, Stadt, Telefon, KundeSeit) VALUES (9, 'Reiter GmbH', 'Speyer', NULL, '2024-03-01')",
    ],
    [LESEN_UND_AENDERN, "UPDATE Kunden SET Stadt = 'Mannheim' WHERE KundeId = 4"],
    [MIT_TRANSAKTION, 'UPDATE Auftraege SET MitarbeiterId = 2 WHERE AuftragId = 5'],
    [LESEN_UND_AENDERN, 'INSERT Kunden DEFAULT VALUES'],
    [LESEN_UND_AENDERN, 'INSERT INTO Kunden (Name) SELECT Name FROM Alt WHERE Aktiv = 1'],
    [
      LESEN_UND_AENDERN,
      "UPDATE TOP (5) Kunden WITH (ROWLOCK) SET Stadt = N'x', Aktiv = 0 WHERE KundeId > 1",
    ],
    [
      LESEN_UND_AENDERN,
      'UPDATE k SET Umsatz = (SELECT SUM(Betrag) FROM Auftraege a WHERE a.KundeId = k.KundeId) ' +
        'FROM Kunden k WHERE k.KundeId IN (SELECT KundeId FROM Auftraege)',
    ],
    [
      LESEN_UND_AENDERN,
      "UPDATE Kunden SET Name = N'x' OUTPUT deleted.Name, inserted.Name INTO Protokoll (Alt, Neu) WHERE KundeId = 1",
    ],
    [
      LESEN_UND_AENDERN,
      "INSERT INTO Kunden (Name) OUTPUT inserted.KundeId INTO Protokoll (KundeId) VALUES (N'x')",
    ],
    [LESEN_UND_AENDERN, 'DELETE TOP (1) FROM Kunden OUTPUT deleted.* INTO Archiv WHERE Aktiv = 0'],
    [LESEN_UND_AENDERN, 'DELETE k FROM Kunden k JOIN Auftraege a ON a.KundeId = k.KundeId'],
    [LESEN_UND_AENDERN, 'WITH alt AS (SELECT * FROM Kunden WHERE Aktiv = 0) DELETE FROM alt'],
    [
      LESEN_UND_AENDERN,
      "MERGE INTO Kunden AS z USING (SELECT 1 AS Id, N'x' AS Name) AS q ON z.KundeId = q.Id " +
        'WHEN MATCHED THEN UPDATE SET Name = q.Name ' +
        'WHEN NOT MATCHED THEN INSERT (KundeId, Name) VALUES (q.Id, q.Name) ' +
        'WHEN NOT MATCHED BY SOURCE THEN DELETE ' +
        'OUTPUT $action INTO Protokoll (Aktion);',
    ],
    [
      MIT_TRANSAKTION,
      "BEGIN TRANSACTION UPDATE Kunden SET Stadt = N'x' WHERE KundeId = 4 " +
        'SELECT Stadt FROM Kunden ROLLBACK TRANSACTION',
    ],
  ])('lässt zu: %j %s', (erlaubt, sql) => {
    expect(pruefeAnweisung(sql, erlaubt), sql).toMatchObject({ erlaubt: true, begruendung: '' });
  });

  it('sucht in DDL nicht: Fremdschlüssel mit ON DELETE SET NULL bleiben erlaubt', () => {
    const sql =
      'CREATE TABLE Termine (TerminId int PRIMARY KEY, AuftragId int NULL ' +
      'REFERENCES Auftraege(AuftragId) ON DELETE SET NULL ON UPDATE CASCADE)';
    expect(pruefeAnweisung(sql, ['DDL']).erlaubt).toBe(true);
  });
});

describe('Zeilenkommentar endet auch beim Wagenrücklauf', () => {
  it('entfernt nur den Kommentar, nicht den Rest', () => {
    expect(entferneKommentareUndLiterale('SELECT 1 --x\rDELETE')).toMatch(/1\s+DELETE/);
  });

  it('trennt an einem Semikolon hinter dem Kommentar', () => {
    expect(teileAnweisungen('SELECT 1 --x\r; DELETE FROM Kunden')).toEqual([
      'SELECT 1 --x',
      'DELETE FROM Kunden',
    ]);
  });

  it('findet dahinter versteckte Serverbefehle', () => {
    expect(pruefeAnweisung('SELECT 1 --x\rUSE master', NUR_LESEN).klasse).toBe('SERVER');
  });
});

describe('Kommentare trennen wie Leerraum', () => {
  it('fügt an der Stelle eines Blockkommentars Leerraum ein', () => {
    // Für SQL Server ist `1/**/DELETE` dasselbe wie `1 DELETE`.
    expect(entferneKommentareUndLiterale('SELECT 1/**/DELETE')).toMatch(/1\s+DELETE/);
  });
});
