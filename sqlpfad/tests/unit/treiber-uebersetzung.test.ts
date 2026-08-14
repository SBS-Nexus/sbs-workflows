import { describe, expect, it } from 'vitest';
import { SqlAbbruchFehler, SqlMotorFehler, SqlZeitlimitFehler } from '@/domain/sql/runner';
import { uebersetzeTreiberfehler, zuResultset } from '@/domain/sql/treiber-uebersetzung';
import {
  alsBezeichner,
  sandboxDatenbankName,
  UngueltigerBezeichnerFehler,
} from '@/domain/sql/bezeichner';

describe('Treiberergebnis in ein Resultset', () => {
  it('behält die Spaltenreihenfolge', () => {
    const ergebnis = zuResultset(
      [
        ['Anna', 3],
        ['Mehmet', 1],
      ],
      [{ name: 'Name' }, { name: 'Anzahl' }],
    );
    expect(ergebnis.spalten).toEqual(['Name', 'Anzahl']);
    expect(ergebnis.zeilen[0]).toEqual(['Anna', 3]);
  });

  it('behält zwei gleichnamige Spalten als zwei Spalten', () => {
    /*
     * Der Grund für den arrayRowMode. Als Objekt hätte `SELECT Name, Name`
     * eine Spalte - ein anderes Ergebnis als das, was die Datenbank geliefert
     * hat, und damit eine falsche Bewertung.
     */
    const ergebnis = zuResultset([['Anna', 'Anna']], [{ name: 'Name' }, { name: 'Name' }]);
    expect(ergebnis.spalten).toHaveLength(2);
    expect(ergebnis.zeilen[0]).toHaveLength(2);
  });

  it('gibt einer namenlosen Spalte einen Platzhalter', () => {
    // `SELECT 1` liefert eine Spalte ohne Namen. Ohne Platzhalter stünde in
    // der Kopfzeile nichts, und die Tabelle sähe kaputt aus.
    const ergebnis = zuResultset([[1]], [{}]);
    expect(ergebnis.spalten).toEqual(['Spalte1']);
  });

  it('macht aus undefined ein NULL', () => {
    // In der Datenbank gibt es diesen Unterschied nicht; beim Vergleich schon.
    const ergebnis = zuResultset([[undefined]], [{ name: 'Stadt' }]);
    expect(ergebnis.zeilen[0]?.[0]).toBeNull();
  });

  it('behält NULL als NULL', () => {
    const ergebnis = zuResultset([[null]], [{ name: 'Stadt' }]);
    expect(ergebnis.zeilen[0]?.[0]).toBeNull();
  });

  it('wandelt einen Buffer in Uint8Array', () => {
    const ergebnis = zuResultset([[Buffer.from([1, 2, 3])]], [{ name: 'Daten' }]);
    expect(ergebnis.zeilen[0]?.[0]).toBeInstanceOf(Uint8Array);
  });

  it('behält ein Datum als Datum', () => {
    const wert = new Date('2026-03-01T00:00:00Z');
    expect(zuResultset([[wert]], [{ name: 'Datum' }]).zeilen[0]?.[0]).toBe(wert);
  });

  it('stellt ein bigint als Text dar statt es zu runden', () => {
    /*
     * 9007199254740993 ist die erste ungerade Zahl jenseits von 2^53. Als
     * Gleitkommazahl wird sie zu ...992 - die Lernende bekäme ein falsches
     * Ergebnis angezeigt, ohne dass irgendwo ein Fehler stünde.
     */
    const ergebnis = zuResultset([[9007199254740993n]], [{ name: 'Nummer' }]);
    expect(ergebnis.zeilen[0]?.[0]).toBe('9007199254740993');
  });

  it('kommt mit einem leeren Ergebnis zurecht', () => {
    const ergebnis = zuResultset([], [{ name: 'Name' }]);
    expect(ergebnis.spalten).toEqual(['Name']);
    expect(ergebnis.zeilen).toEqual([]);
  });
});

describe('Treiberfehler zuordnen', () => {
  it('erkennt ein Zeitlimit', () => {
    const fehler = uebersetzeTreiberfehler({ code: 'ETIMEOUT', message: 'Timeout' }, 5000);
    expect(fehler).toBeInstanceOf(SqlZeitlimitFehler);
    expect((fehler as SqlZeitlimitFehler).grenzeMs).toBe(5000);
  });

  it.each(['ECANCEL', 'EABORT'])('erkennt einen Abbruch (%s)', (code) => {
    // Wer selbst stoppt, hat nichts falsch gemacht - das darf nicht wie ein
    // Fehler aussehen.
    expect(uebersetzeTreiberfehler({ code }, 5000)).toBeInstanceOf(SqlAbbruchFehler);
  });

  it('nimmt die Fehlernummer vom Fehler selbst', () => {
    const fehler = uebersetzeTreiberfehler(
      { code: 'EREQUEST', message: "Invalid column name 'Stadtt'.", number: 207 },
      5000,
    );
    expect(fehler).toBeInstanceOf(SqlMotorFehler);
    expect((fehler as SqlMotorFehler).nummer).toBe(207);
  });

  it('findet die Nummer auch im eingebetteten Originalfehler', () => {
    // Je nach Treiberfassung steht sie an der einen oder der anderen Stelle.
    const fehler = uebersetzeTreiberfehler(
      { code: 'EREQUEST', originalError: { message: 'Invalid object name.', number: 208 } },
      5000,
    );
    expect((fehler as SqlMotorFehler).nummer).toBe(208);
  });

  it('kommt ohne Nummer aus', () => {
    const fehler = uebersetzeTreiberfehler(
      { code: 'EREQUEST', message: 'Etwas ging schief.' },
      5000,
    );
    expect(fehler).toBeInstanceOf(SqlMotorFehler);
    expect((fehler as SqlMotorFehler).nummer).toBeUndefined();
  });

  it('gibt einen Verbindungsfehler unverändert weiter', () => {
    /*
     * Ein abgebrochener Netzweg ist kein Fehler in der Abfrage. Ihn als
     * solchen auszugeben würde die Lernende ihren richtigen Satz durchsuchen
     * lassen.
     */
    const original = Object.assign(new Error('socket hang up'), { code: 'ESOCKET' });
    expect(uebersetzeTreiberfehler(original, 5000)).toBe(original);
  });

  it('macht auch aus einem geworfenen Text einen Fehler', () => {
    expect(uebersetzeTreiberfehler('kaputt', 5000)).toBeInstanceOf(Error);
  });
});

describe('Bezeichner', () => {
  it('klammert einen zulässigen Namen', () => {
    expect(alsBezeichner('sbx_abc123')).toBe('[sbx_abc123]');
  });

  it.each([
    'Kunden]; DROP DATABASE master; --',
    'Kunden; SELECT 1',
    "O'Brien",
    'mit leerzeichen',
    '9beginnt_mit_ziffer',
    '',
    'Umlaut_ä',
    'a'.repeat(64),
  ])('weist ab: %s', (wert) => {
    /*
     * Der Kern des Moduls. Für `CREATE DATABASE` gibt es keine Parameter, der
     * Name muss in den Anweisungstext - also darf nur durch, was zweifelsfrei
     * ein Name ist. Nicht bereinigen, sondern ablehnen: Zwei bereinigte Namen
     * könnten zusammenfallen und damit auf eine fremde Sandbox zeigen.
     */
    expect(() => alsBezeichner(wert)).toThrow(UngueltigerBezeichnerFehler);
  });

  it('nennt den unzulässigen Wert nicht in der Meldung', () => {
    // Eine Fehlermeldung ist kein Ort, an dem fremder Text wiedergegeben wird.
    try {
      alsBezeichner("'; DROP DATABASE master; --");
      expect.unreachable('hätte werfen müssen');
    } catch (fehler) {
      expect((fehler as Error).message).not.toContain('DROP');
    }
  });
});

describe('Name der Sandbox-Datenbank', () => {
  it('ist ein zulässiger Bezeichner', () => {
    const name = sandboxDatenbankName('clv3k2j9a0000abcd1234efgh', 'handwerk');
    expect(() => alsBezeichner(name)).not.toThrow();
    expect(name.startsWith('sbx_')).toBe(true);
  });

  it('unterscheidet zwei Übungsdatensätze derselben Person', () => {
    const a = sandboxDatenbankName('clv3k2j9a0000abcd', 'handwerk');
    const b = sandboxDatenbankName('clv3k2j9a0000abcd', 'bibliothek');
    expect(a).not.toBe(b);
  });

  it('enthält kein personenbezogenes Merkmal', () => {
    // Datenbanknamen stehen in Serverprotokollen und Sicherungsdateien.
    const name = sandboxDatenbankName('clv3k2j9a0000abcd', 'handwerk');
    expect(name).not.toMatch(/@/);
  });

  it('lehnt einen zu langen Namen ab, statt ihn zu kürzen', () => {
    // Ein abgeschnittener Name könnte mit dem einer anderen Sandbox
    // zusammenfallen - und damit auf deren Daten zeigen.
    expect(() => sandboxDatenbankName('a'.repeat(60), 'handwerk')).toThrow(
      UngueltigerBezeichnerFehler,
    );
  });

  it('lehnt einen Slug mit unzulässigen Zeichen ab', () => {
    expect(() => sandboxDatenbankName('clv3k2j9a0000abcd', 'handwerk; DROP')).toThrow(
      UngueltigerBezeichnerFehler,
    );
  });
});
