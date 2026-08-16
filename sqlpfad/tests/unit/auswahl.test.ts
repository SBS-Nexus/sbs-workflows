import { describe, expect, it } from 'vitest';
import {
  waehleUebung,
  waehleWiederholung,
  type Kandidat,
  type Versuchsstand,
} from '@/domain/aufgabe/auswahl';

/**
 * Die Auswahl entscheidet, was jemand als Nächstes sieht. Ist sie falsch,
 * merkt das niemand – die Seite ist voll, die Aufgaben sind echt, und trotzdem
 * übt die Lernende das Falsche.
 */

const KANDIDATEN: Kandidat[] = [
  { aufgabeSlug: 'a1', lektionSlug: 'l1' },
  { aufgabeSlug: 'a2', lektionSlug: 'l1' },
  { aufgabeSlug: 'a3', lektionSlug: 'l1' },
  { aufgabeSlug: 'b1', lektionSlug: 'l2' },
  { aufgabeSlug: 'b2', lektionSlug: 'l2' },
  { aufgabeSlug: 'c1', lektionSlug: 'l3' },
];

function stand(ergebnis: Versuchsstand['letztesErgebnis'], tagImMai: number): Versuchsstand {
  return {
    letztesErgebnis: ergebnis,
    zuletztAm: new Date(`2026-05-${String(tagImMai).padStart(2, '0')}`),
  };
}

describe('Üben', () => {
  it('mischt über die Lektionen, statt eine nach der anderen abzuarbeiten', () => {
    /*
     * Der eigentliche Zweck der Seite. Vier JOIN-Aufgaben am Stück üben das
     * Ausführen; eine JOIN-Aufgabe zwischen zwei anderen übt das Erkennen.
     */
    const gewaehlt = waehleUebung(KANDIDATEN, new Map(), 6);
    expect(gewaehlt.map((kandidat) => kandidat.lektionSlug)).toEqual([
      'l1',
      'l2',
      'l3',
      'l1',
      'l2',
      'l1',
    ]);
  });

  it('behält die Reihenfolge innerhalb einer Lektion', () => {
    const gewaehlt = waehleUebung(KANDIDATEN, new Map(), 6).filter(
      (kandidat) => kandidat.lektionSlug === 'l1',
    );
    expect(gewaehlt.map((kandidat) => kandidat.aufgabeSlug)).toEqual(['a1', 'a2', 'a3']);
  });

  it('nimmt Unbearbeitetes vor Nichtsitzendem und beides vor Gekonntem', () => {
    const staende = new Map<string, Versuchsstand>([
      ['a1', stand('PASSED', 1)],
      ['b1', stand('FAILED', 2)],
    ]);
    const gewaehlt = waehleUebung(KANDIDATEN, staende, 6).map((k) => k.aufgabeSlug);

    expect(gewaehlt.indexOf('a2')).toBeLessThan(gewaehlt.indexOf('b1'));
    expect(gewaehlt.indexOf('b1')).toBeLessThan(gewaehlt.indexOf('a1'));
  });

  it('hält eine angesehene Lösung nicht für Können', () => {
    /*
     * SOLUTION_REVEALED sagt nichts darüber aus, ob es beim nächsten Mal
     * allein gelingt. Als „sitzt" gewertet, verschwände die Aufgabe genau
     * dann aus der Übung, wenn sie am nötigsten wäre.
     */
    const staende = new Map<string, Versuchsstand>([
      ['a1', stand('SOLUTION_REVEALED', 1)],
      ['a2', stand('PASSED', 1)],
    ]);
    const gewaehlt = waehleUebung(KANDIDATEN, staende, 6).map((k) => k.aufgabeSlug);

    // Gleiches Datum, gleiche Lektion - der einzige Unterschied ist das
    // Ergebnis. Die angesehene Lösung muss vor der gekonnten Aufgabe stehen.
    expect(gewaehlt.indexOf('a1')).toBeLessThan(gewaehlt.indexOf('a2'));

    // Und sie steht auch in der Wiederholung, die gekonnte nicht.
    const wiederholung = waehleWiederholung(KANDIDATEN, staende, 10).map((k) => k.aufgabeSlug);
    expect(wiederholung).toContain('a1');
    expect(wiederholung).not.toContain('a2');
  });

  it('liefert bei gleicher Ausgangslage immer dasselbe', () => {
    // Ohne diese Eigenschaft wäre „ich mache da weiter, wo ich war" ein
    // Glücksspiel - und der Test darüber wertlos.
    const eins = waehleUebung(KANDIDATEN, new Map(), 4);
    const zwei = waehleUebung(KANDIDATEN, new Map(), 4);
    expect(eins).toEqual(zwei);
  });

  it('gibt nie mehr zurück als gewünscht', () => {
    expect(waehleUebung(KANDIDATEN, new Map(), 2)).toHaveLength(2);
    expect(waehleUebung(KANDIDATEN, new Map(), 0)).toHaveLength(0);
    expect(waehleUebung(KANDIDATEN, new Map(), -5)).toHaveLength(0);
  });
});

describe('Wiederholen', () => {
  it('nimmt nur, was zuletzt nicht saß', () => {
    const staende = new Map<string, Versuchsstand>([
      ['a1', stand('PASSED', 5)],
      ['a2', stand('FAILED', 4)],
      ['b1', stand('PARTIAL', 3)],
      ['c1', stand('SOLUTION_REVEALED', 2)],
    ]);
    expect(waehleWiederholung(KANDIDATEN, staende, 10).map((k) => k.aufgabeSlug)).toEqual([
      'c1',
      'b1',
      'a2',
    ]);
  });

  it('nimmt nichts auf, was nie bearbeitet wurde', () => {
    /*
     * Eine nie bearbeitete Aufgabe zu „wiederholen" wäre nichts, was
     * wiederholt würde - und die Seite behauptete einen Rückstand, den es
     * nicht gibt.
     */
    expect(waehleWiederholung(KANDIDATEN, new Map(), 10)).toEqual([]);
  });

  it('nimmt das am längsten Zurückliegende zuerst', () => {
    const staende = new Map<string, Versuchsstand>([
      ['a1', stand('FAILED', 20)],
      ['b1', stand('FAILED', 3)],
    ]);
    expect(waehleWiederholung(KANDIDATEN, staende, 10).map((k) => k.aufgabeSlug)).toEqual([
      'b1',
      'a1',
    ]);
  });

  it('ist leer, wenn alles sitzt – und das ist kein Rückstand', () => {
    const staende = new Map<string, Versuchsstand>(
      KANDIDATEN.map((kandidat) => [kandidat.aufgabeSlug, stand('PASSED', 1)]),
    );
    expect(waehleWiederholung(KANDIDATEN, staende, 10)).toEqual([]);
  });
});
