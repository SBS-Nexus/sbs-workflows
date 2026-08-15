import { describe, expect, it } from 'vitest';
import {
  istBeurteilbar,
  istLektionAbgeschlossen,
  type AufgabenStand,
} from '@/domain/aufgabe/abschluss';
import { LEHRPLAN } from '@/content';

describe('Was sich ohne Übungsserver beurteilen lässt', () => {
  it('zählt Auswahl, Reihenfolge, Vorhersage und Freitext dazu', () => {
    for (const art of [
      'EINFACHAUSWAHL',
      'MEHRFACHAUSWAHL',
      'REIHENFOLGE',
      'ERGEBNIS_VORHERSAGEN',
      'FREITEXT',
      'FEHLER_ERKLAEREN',
    ] as const) {
      expect(istBeurteilbar(art)).toBe(true);
    }
  });

  it('zählt geschriebene Abfragen nicht dazu', () => {
    for (const art of [
      'ABFRAGE_SCHREIBEN',
      'ABFRAGE_ERGAENZEN',
      'FEHLER_FINDEN',
      'TRANSFER',
    ] as const) {
      expect(istBeurteilbar(art)).toBe(false);
    }
  });

  it('lässt jede Lektion des Lehrplans erreichbar sein', () => {
    /*
     * Der wichtigste Test hier. Eine Lektion aus lauter Schreibaufgaben wäre
     * nach dieser Regel nie abzuschließen - und das sähe für die Lernende wie
     * ein eigenes Versäumnis aus, nicht wie eine fehlende Funktion.
     */
    for (const modul of LEHRPLAN.module) {
      for (const lektion of modul.lektionen) {
        const beurteilbar = lektion.aufgaben.filter((aufgabe) => istBeurteilbar(aufgabe.art));
        expect(
          beurteilbar.length,
          `${lektion.slug} hat keine Aufgabe, die sich ohne Übungsserver beurteilen lässt`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('Abschluss einer Lektion', () => {
  const auswahl = (letztesErgebnis?: AufgabenStand['letztesErgebnis']): AufgabenStand => ({
    art: 'EINFACHAUSWAHL',
    letztesErgebnis,
  });
  const schreiben: AufgabenStand = { art: 'ABFRAGE_SCHREIBEN' };

  it('ist erreicht, wenn alle beurteilbaren Aufgaben sitzen', () => {
    expect(istLektionAbgeschlossen([auswahl('PASSED'), auswahl('PASSED'), schreiben])).toBe(true);
  });

  it('ist nicht erreicht, solange eine offen ist', () => {
    expect(istLektionAbgeschlossen([auswahl('PASSED'), auswahl(undefined)])).toBe(false);
    expect(istLektionAbgeschlossen([auswahl('PASSED'), auswahl('FAILED')])).toBe(false);
    expect(istLektionAbgeschlossen([auswahl('PASSED'), auswahl('PARTIAL')])).toBe(false);
  });

  it('lässt eine angesehene Lösung nicht als gelöst gelten', () => {
    expect(istLektionAbgeschlossen([auswahl('PASSED'), auswahl('SOLUTION_REVEALED')])).toBe(false);
  });

  it('ist nicht erreicht, wenn es nichts Beurteilbares gibt', () => {
    // Sonst gälte eine Lektion aus lauter Schreibaufgaben als abgeschlossen,
    // ohne dass jemand etwas getan hätte.
    expect(istLektionAbgeschlossen([schreiben, schreiben])).toBe(false);
    expect(istLektionAbgeschlossen([])).toBe(false);
  });
});
