import { describe, expect, it } from 'vitest';
import { BEKANNTE_NUMMERN, erklaereSqlFehler, nummerAus } from '@/domain/sql/fehler';

/**
 * Eine Fehlererklärung ist der Moment, in dem eine Lernende entweder etwas
 * versteht oder aufgibt. Entsprechend wird hier nicht nur geprüft, ob etwas
 * zurückkommt, sondern auch *was für ein Ton* zurückkommt.
 */

describe('Fehlernummer lesen', () => {
  it('liest die Nummer aus einer vollständigen Meldung', () => {
    const meldung = "Msg 207, Level 16, State 1, Line 3\nInvalid column name 'Stadtt'.";
    expect(nummerAus(meldung)).toBe(207);
  });

  it('liest sie auch in Kleinschreibung', () => {
    expect(nummerAus('msg 208, level 16')).toBe(208);
  });

  it('liest eine allein stehende Nummer am Zeilenanfang', () => {
    // Manche Treiber liefern nur "8120 Column ... is invalid ...".
    expect(nummerAus('8120 Column Kunden.Name is invalid in the select list.')).toBe(8120);
  });

  it('gibt undefined zurück, wenn keine Nummer erkennbar ist', () => {
    expect(nummerAus('Verbindung zum Übungsserver unterbrochen.')).toBeUndefined();
  });
});

describe('Jede hinterlegte Nummer erklärt sich vollständig', () => {
  it('deckt die geplanten Fehlerbilder ab', () => {
    // Diese Nummern sind die, die in den Lektionen tatsächlich vorkommen.
    // Fällt eine weg, soll der Test das melden und nicht der Lernende.
    for (const nummer of [102, 207, 208, 4104, 245, 8134, 515, 547, 2627, 8120, 512, 229, 1205]) {
      expect(BEKANNTE_NUMMERN).toContain(nummer);
    }
  });

  it.each(BEKANNTE_NUMMERN)('Nummer %i liefert alle vier Teile', (nummer) => {
    const erklaerung = erklaereSqlFehler({ nummer, meldung: `Msg ${nummer}, Level 16, State 1` });

    expect(erklaerung.kategorie).not.toBe('UNBEKANNT');
    expect(erklaerung.bedeutung.length).toBeGreaterThan(20);
    expect(erklaerung.moeglicheUrsachen.length).toBeGreaterThan(0);
    expect(erklaerung.woSuchen.length).toBeGreaterThan(20);
    expect(erklaerung.kontrollfrage).toMatch(/\?$/);
  });

  it.each(BEKANNTE_NUMMERN)('Nummer %i formuliert Ursachen als Möglichkeiten', (nummer) => {
    /*
     * Der Server weiß nicht, was gemeint war. Eine Ursache, die wie eine
     * Diagnose klingt, kostet mehr Zeit als gar keine - deshalb steht die
     * Unsicherheit im Feldnamen und darf im Text nicht widerrufen werden.
     */
    const { moeglicheUrsachen } = erklaereSqlFehler({ nummer, meldung: `Msg ${nummer}` });
    for (const ursache of moeglicheUrsachen) {
      expect(ursache).not.toMatch(/^(Du hast|Sie haben|Der Fehler ist)/);
    }
  });

  it.each(BEKANNTE_NUMMERN)('Nummer %i benutzt keine strafende Sprache', (nummer) => {
    // Dieselbe Haltung wie in PythonPfad und in der Statement-Policy.
    const erklaerung = erklaereSqlFehler({ nummer, meldung: `Msg ${nummer}` });
    const text = [
      erklaerung.bedeutung,
      erklaerung.woSuchen,
      erklaerung.kontrollfrage,
      ...erklaerung.moeglicheUrsachen,
    ].join(' ');

    expect(text).not.toMatch(/falsch gemacht|dein Fehler|leider|natürlich|einfach nur|Schuld/i);
  });
});

describe('Bezeichner aus der Meldung', () => {
  it('nennt die Spalte beim Namen', () => {
    const erklaerung = erklaereSqlFehler({
      meldung: "Msg 207, Level 16, State 1, Line 3\nInvalid column name 'Stadtt'.",
    });
    expect(erklaerung.kategorie).toBe('SPALTE');
    expect(erklaerung.bedeutung).toContain('Stadtt');
  });

  it('nennt die Tabelle beim Namen', () => {
    const erklaerung = erklaereSqlFehler({
      meldung: "Msg 208, Level 16, State 1, Line 1\nInvalid object name 'Kunde'.",
    });
    expect(erklaerung.kategorie).toBe('OBJEKT');
    expect(erklaerung.bedeutung).toContain('Kunde');
  });

  it('kommt ohne Bezeichner aus, wenn die Meldung keinen enthält', () => {
    const erklaerung = erklaereSqlFehler({ nummer: 207, meldung: 'Invalid column name.' });
    expect(erklaerung.bedeutung.length).toBeGreaterThan(20);
    // Kein leerer Platzhalter, wo ein Name stehen sollte.
    expect(erklaerung.bedeutung).not.toContain('„"');
    expect(erklaerung.bedeutung).not.toContain('undefined');
  });
});

describe('Häufige Anfängerfehler landen in der richtigen Kategorie', () => {
  it.each([
    ["Msg 102, Level 15, State 1, Line 1\nIncorrect syntax near 'FORM'.", 'SYNTAX'],
    [
      "Msg 4104, Level 16, State 1\nThe multi-part identifier 'k.Name' could not be bound.",
      'ALIAS',
    ],
    ['Msg 8134, Level 16, State 1\nDivide by zero error encountered.', 'DATENTYP'],
    ['Msg 512, Level 16, State 1\nSubquery returned more than 1 value.', 'UNTERABFRAGE'],
    ['Msg 2627, Level 14, State 1\nViolation of PRIMARY KEY constraint.', 'SCHLUESSEL'],
  ])('%s', (meldung, kategorie) => {
    expect(erklaereSqlFehler({ meldung }).kategorie).toBe(kategorie);
  });
});

describe('Unbekannte Meldungen', () => {
  const unbekannt = erklaereSqlFehler({
    meldung: "Msg 99999, Level 16, State 1\nSomething nobody has documented here 'X'.",
  });

  it('rät keine Ursache zusammen', () => {
    /*
     * Der wichtigste Test dieser Datei. Eine erfundene Erklärung klingt
     * genauso überzeugend wie eine richtige und schickt die Lernende in die
     * falsche Richtung. Lieber ehrlich nichts wissen.
     */
    expect(unbekannt.kategorie).toBe('UNBEKANNT');
    expect(unbekannt.moeglicheUrsachen).toHaveLength(0);
  });

  it('sagt offen, dass keine Erklärung vorliegt', () => {
    expect(unbekannt.bedeutung).toMatch(/keine ausführliche Erklärung/i);
  });

  it('gibt trotzdem eine brauchbare Suchstrategie', () => {
    expect(unbekannt.woSuchen.length).toBeGreaterThan(20);
    expect(unbekannt.kontrollfrage).toMatch(/\?$/);
  });

  it('behält die Originalmeldung bei', () => {
    expect(unbekannt.original).toContain('Something nobody has documented');
  });

  it('behandelt eine Meldung ganz ohne Nummer gleich', () => {
    const ohneNummer = erklaereSqlFehler({ meldung: 'Die Verbindung wurde unterbrochen.' });
    expect(ohneNummer.kategorie).toBe('UNBEKANNT');
    expect(ohneNummer.moeglicheUrsachen).toHaveLength(0);
  });
});

describe('Die Originalmeldung bleibt sichtbar', () => {
  it('gibt sie unverändert zurück', () => {
    // Wer später beruflich mit SQL arbeitet, muss genau diese Texte lesen
    // können. Sie wegzusperren wäre kurzfristig freundlich.
    const meldung = "Msg 207, Level 16, State 1, Line 3\nInvalid column name 'Stadtt'.";
    expect(erklaereSqlFehler({ meldung }).original).toBe(meldung);
  });
});
