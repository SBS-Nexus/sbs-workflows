import { describe, expect, it } from 'vitest';
import {
  alleKonflikteGeloest,
  aufgeloesterInhalt,
  enthaeltMarker,
  fuehreKonfliktBefehlAus,
  loeseKonflikt,
  mitKonfliktMarkern,
  offeneKonflikte,
  type KonfliktZustand,
} from '@/domain/git/merge-conflict';

/**
 * Das Konflikt-Lab soll drei Dinge tragfähig machen: die Marker lesen können,
 * bewusst entscheiden statt raten, und die Reihenfolge auflösen → add → commit
 * kennen. Der mittlere Schritt ist der, den viele überspringen.
 */

const BESCHRIFTUNG = { unser: 'HEAD', ihr: 'feature/preise' };

function start(): KonfliktZustand {
  return {
    datei: {
      pfad: 'preise.md',
      abschnitte: [
        { art: 'gemeinsam', zeilen: ['# Preise', ''] },
        {
          art: 'konflikt',
          id: 'k1',
          unsere: ['Basis: 9 Euro'],
          ihre: ['Basis: 12 Euro'],
        },
        { art: 'gemeinsam', zeilen: ['', 'Alle Preise inklusive Steuern.'] },
      ],
    },
    aufloesungen: {},
    vorgemerkt: false,
    status: 'laeuft',
  };
}

describe('Konfliktmarker', () => {
  it('zeigt die Datei so, wie Git sie hinterlässt', () => {
    const zeilen = mitKonfliktMarkern(start(), BESCHRIFTUNG);
    expect(zeilen).toEqual([
      '# Preise',
      '',
      '<<<<<<< HEAD',
      'Basis: 9 Euro',
      '=======',
      'Basis: 12 Euro',
      '>>>>>>> feature/preise',
      '',
      'Alle Preise inklusive Steuern.',
    ]);
  });

  it('erkennt verbliebene Marker in einem Text', () => {
    expect(enthaeltMarker(['# Titel', '<<<<<<< HEAD'])).toBe(true);
    expect(enthaeltMarker(['# Titel', '======='])).toBe(true);
    expect(enthaeltMarker(['# Titel', 'alles gut'])).toBe(false);
  });

  it('zeigt nach dem Auflösen keine Marker mehr', () => {
    const geloest = loeseKonflikt(start(), 'k1', { art: 'ihre' });
    expect(enthaeltMarker(mitKonfliktMarkern(geloest, BESCHRIFTUNG))).toBe(false);
  });
});

describe('Auflösen', () => {
  it('übernimmt die eigene Fassung', () => {
    const geloest = loeseKonflikt(start(), 'k1', { art: 'unsere' });
    expect(aufgeloesterInhalt(geloest)).toContain('Basis: 9 Euro');
    expect(aufgeloesterInhalt(geloest)).not.toContain('Basis: 12 Euro');
  });

  it('übernimmt die hereingeholte Fassung', () => {
    const geloest = loeseKonflikt(start(), 'k1', { art: 'ihre' });
    expect(aufgeloesterInhalt(geloest)).toContain('Basis: 12 Euro');
  });

  it('übernimmt beide Fassungen nacheinander', () => {
    const geloest = loeseKonflikt(start(), 'k1', { art: 'beide' });
    const inhalt = aufgeloesterInhalt(geloest);
    expect(inhalt).toContain('Basis: 9 Euro');
    expect(inhalt).toContain('Basis: 12 Euro');
  });

  it('erlaubt eine eigene Formulierung', () => {
    const geloest = loeseKonflikt(start(), 'k1', {
      art: 'eigene',
      zeilen: ['Basis: 10 Euro (abgestimmt)'],
    });
    expect(aufgeloesterInhalt(geloest)).toContain('Basis: 10 Euro (abgestimmt)');
  });

  it('führt offene Konflikte auf, bis sie entschieden sind', () => {
    expect(offeneKonflikte(start())).toEqual(['k1']);
    expect(alleKonflikteGeloest(loeseKonflikt(start(), 'k1', { art: 'ihre' }))).toBe(true);
  });
});

describe('Ablauf auflösen → add → commit', () => {
  it('verlangt das Auflösen vor dem Vormerken', () => {
    const ergebnis = fuehreKonfliktBefehlAus(start(), 'git add preise.md');
    expect(ergebnis.ausgabe).toContain('noch Konfliktstellen offen');
    expect(ergebnis.zustand.vorgemerkt).toBe(false);
  });

  it('verlangt das Vormerken vor dem Commit — der übersprungene Schritt', () => {
    const geloest = loeseKonflikt(start(), 'k1', { art: 'ihre' });
    const ergebnis = fuehreKonfliktBefehlAus(geloest, 'git commit');
    expect(ergebnis.ausgabe).toContain('git add');
    expect(ergebnis.zustand.status).toBe('laeuft');
  });

  it('schließt den Merge nach auflösen, add und commit ab', () => {
    let zustand = loeseKonflikt(start(), 'k1', { art: 'ihre' });
    zustand = fuehreKonfliktBefehlAus(zustand, 'git add preise.md').zustand;
    expect(zustand.vorgemerkt).toBe(true);
    zustand = fuehreKonfliktBefehlAus(zustand, 'git commit').zustand;
    expect(zustand.status).toBe('abgeschlossen');
  });

  it('lehnt das Vormerken ab, wenn noch Marker im Text stehen', () => {
    // Wer die Marker in einer eigenen Fassung stehen lässt, würde sie sonst
    // mitcommitten — Git selbst prüft das nicht.
    const zustand = loeseKonflikt(start(), 'k1', {
      art: 'eigene',
      zeilen: ['<<<<<<< HEAD', 'Basis: 9 Euro'],
    });
    const ergebnis = fuehreKonfliktBefehlAus(zustand, 'git add preise.md');
    expect(ergebnis.ausgabe).toContain('Konfliktmarker');
    expect(ergebnis.zustand.vorgemerkt).toBe(false);
  });

  it('nimmt die Vormerkung zurück, wenn danach neu aufgelöst wird', () => {
    let zustand = loeseKonflikt(start(), 'k1', { art: 'ihre' });
    zustand = fuehreKonfliktBefehlAus(zustand, 'git add preise.md').zustand;
    expect(zustand.vorgemerkt).toBe(true);

    zustand = loeseKonflikt(zustand, 'k1', { art: 'unsere' });
    expect(zustand.vorgemerkt).toBe(false);
  });
});

describe('git status im Konflikt', () => {
  it('nennt die nicht zusammengeführte Datei und die Zahl offener Stellen', () => {
    const ausgabe = fuehreKonfliktBefehlAus(start(), 'git status').ausgabe;
    expect(ausgabe).toContain('beide geändert');
    expect(ausgabe).toContain('preise.md');
    expect(ausgabe).toContain('Offene Konfliktstellen: 1');
  });

  it('weist nach dem Auflösen auf den fehlenden add-Schritt hin', () => {
    const geloest = loeseKonflikt(start(), 'k1', { art: 'ihre' });
    expect(fuehreKonfliktBefehlAus(geloest, 'git status').ausgabe).toContain('git add');
  });
});

/**
 * Ein abgebrochener Merge ist kein zurückgesetzter Merge.
 *
 * Zuvor verwarf `--abort` nur die Entscheidungen und zeigte die Marker sofort
 * wieder an; `git status` meldete weiterhin einen laufenden Merge, und der
 * Abbruch war selbst nach dem Abschluss noch möglich. Echtes Git kann beides
 * nicht: Nach Abbruch oder Merge-Commit gibt es keinen laufenden Merge und
 * keine Konfliktdatei mehr (Codex-Review auf PR #30).
 */
describe('git merge --abort', () => {
  it('verwirft die Entscheidungen und beendet den Merge', () => {
    let zustand = loeseKonflikt(start(), 'k1', { art: 'ihre' });
    zustand = fuehreKonfliktBefehlAus(zustand, 'git add preise.md').zustand;
    const ergebnis = fuehreKonfliktBefehlAus(zustand, 'git merge --abort');

    expect(ergebnis.zustand.aufloesungen).toEqual({});
    expect(ergebnis.zustand.vorgemerkt).toBe(false);
    expect(ergebnis.zustand.status).toBe('abgebrochen');
  });

  it('zeigt danach die eigene Fassung ohne Marker', () => {
    const abgebrochen = fuehreKonfliktBefehlAus(start(), 'git merge --abort').zustand;
    const zeilen = mitKonfliktMarkern(abgebrochen, BESCHRIFTUNG);

    expect(enthaeltMarker(zeilen)).toBe(false);
    expect(zeilen).toContain('Basis: 9 Euro');
    expect(zeilen).not.toContain('Basis: 12 Euro');
  });

  it('meldet danach keinen laufenden Merge mehr', () => {
    const abgebrochen = fuehreKonfliktBefehlAus(start(), 'git merge --abort').zustand;
    const ausgabe = fuehreKonfliktBefehlAus(abgebrochen, 'git status').ausgabe;

    expect(ausgabe).toContain('Kein Merge im Gange');
    expect(ausgabe).not.toContain('Offene Konfliktstellen');
  });

  it('lässt sich nach dem Abschluss NICHT mehr abbrechen', () => {
    let zustand = loeseKonflikt(start(), 'k1', { art: 'ihre' });
    zustand = fuehreKonfliktBefehlAus(zustand, 'git add preise.md').zustand;
    zustand = fuehreKonfliktBefehlAus(zustand, 'git commit').zustand;
    expect(zustand.status).toBe('abgeschlossen');

    const ergebnis = fuehreKonfliktBefehlAus(zustand, 'git merge --abort');
    expect(ergebnis.veraendert).toBe(false);
    expect(ergebnis.zustand.status).toBe('abgeschlossen');
    expect(ergebnis.ausgabe).toContain('Kein Merge im Gange');
  });

  it('nimmt nach dem Abbruch weder Entscheidungen noch add oder commit an', () => {
    const abgebrochen = fuehreKonfliktBefehlAus(start(), 'git merge --abort').zustand;

    expect(loeseKonflikt(abgebrochen, 'k1', { art: 'ihre' })).toBe(abgebrochen);
    expect(fuehreKonfliktBefehlAus(abgebrochen, 'git add preise.md').zustand.vorgemerkt).toBe(
      false,
    );
    expect(fuehreKonfliktBefehlAus(abgebrochen, 'git commit').zustand.status).toBe('abgebrochen');
  });

  it('lässt denselben Merge nach einem Abbruch erneut beginnen', () => {
    const abgebrochen = fuehreKonfliktBefehlAus(start(), 'git merge --abort').zustand;
    const erneut = fuehreKonfliktBefehlAus(abgebrochen, 'git merge feature/preise');

    expect(erneut.zustand.status).toBe('laeuft');
    expect(offeneKonflikte(erneut.zustand)).toEqual(['k1']);
    expect(enthaeltMarker(mitKonfliktMarkern(erneut.zustand, BESCHRIFTUNG))).toBe(true);
  });
});
