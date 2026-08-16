import { describe, expect, it } from 'vitest';
import { beschreibeStand, bewerteKonzept, type AufgabenErgebnis } from '@/domain/aufgabe/kompetenz';

/**
 * Was hier steht, liest jemand über sich selbst. „Sitzt" für ein Konzept, das
 * nur einmal richtig angekreuzt wurde, wäre eine Schmeichelei mit Folgen: Wer
 * ihr glaubt, übt es nicht mehr.
 */

const auswahl = (letztesErgebnis?: AufgabenErgebnis['letztesErgebnis']): AufgabenErgebnis => ({
  art: 'EINFACHAUSWAHL',
  letztesErgebnis,
});
const schreiben: AufgabenErgebnis = { art: 'ABFRAGE_SCHREIBEN' };

describe('Der Stand eines Konzepts', () => {
  it('ist ungeübt, solange nichts bearbeitet wurde', () => {
    const kompetenz = bewerteKonzept([auswahl(), auswahl()]);
    expect(kompetenz.stand).toBe('ungeuebt');
    expect(kompetenz.gesamt).toBe(2);
  });

  it('sitzt erst, wenn alle beurteilbaren Aufgaben sitzen', () => {
    expect(bewerteKonzept([auswahl('PASSED'), auswahl('PASSED')]).stand).toBe('sitzt');
    expect(bewerteKonzept([auswahl('PASSED'), auswahl()]).stand).not.toBe('sitzt');
  });

  it('ist angefangen, wenn das Bearbeitete saß und noch etwas aussteht', () => {
    const kompetenz = bewerteKonzept([auswahl('PASSED'), auswahl(), auswahl()]);
    expect(kompetenz.stand).toBe('angefangen');
    expect(kompetenz).toMatchObject({ gesamt: 3, bearbeitet: 1, geloest: 1 });
  });

  it('ist wackelig, sobald etwas Bearbeitetes nicht saß', () => {
    expect(bewerteKonzept([auswahl('PASSED'), auswahl('FAILED')]).stand).toBe('wackelig');
    expect(bewerteKonzept([auswahl('PARTIAL')]).stand).toBe('wackelig');
  });

  it('hält eine angesehene Lösung nicht für gelöst', () => {
    /*
     * Sonst gälte ein Konzept als beherrscht, weil jemand die Musterlösung
     * aufgeklappt hat - und es verschwände aus der Wiederholung.
     */
    const kompetenz = bewerteKonzept([auswahl('SOLUTION_REVEALED')]);
    expect(kompetenz.stand).toBe('wackelig');
    expect(kompetenz.geloest).toBe(0);
  });

  it('zählt Schreibaufgaben nicht mit', () => {
    // Sie lassen sich ohne Übungsserver nicht beurteilen; sie mitzuzählen
    // hieße, ein Konzept dauerhaft unter „unvollständig" zu führen.
    const kompetenz = bewerteKonzept([auswahl('PASSED'), schreiben, schreiben]);
    expect(kompetenz.stand).toBe('sitzt');
    expect(kompetenz.gesamt).toBe(1);
  });

  it('sagt es, wenn sich zu einem Konzept gar nichts beurteilen lässt', () => {
    const kompetenz = bewerteKonzept([schreiben, schreiben]);
    expect(kompetenz.stand).toBe('nicht-beurteilbar');
    expect(beschreibeStand(kompetenz)).toContain('Übungsserver');
  });

  it('erklärt jeden Stand in einem Satz', () => {
    // Ein Wort ohne Erklärung wäre eine Note. Die Zahlen dahinter müssen
    // nachzählbar sein.
    for (const aufgaben of [
      [auswahl()],
      [auswahl('PASSED'), auswahl()],
      [auswahl('FAILED')],
      [auswahl('PASSED')],
      [schreiben],
    ]) {
      expect(beschreibeStand(bewerteKonzept(aufgaben)).length).toBeGreaterThan(10);
    }
  });
});
