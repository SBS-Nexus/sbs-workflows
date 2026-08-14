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
    for (const sql of ['UPDATE Kunden SET Aktiv = 0', 'CREATE TABLE T (A int)', 'DECLARE @x int']) {
      const { begruendung } = pruefeAnweisung(sql, NUR_LESEN);
      expect(begruendung).not.toMatch(/verboten|unerlaubt|falsch|Fehler|nicht erlaubt/i);
    }
  });
});
