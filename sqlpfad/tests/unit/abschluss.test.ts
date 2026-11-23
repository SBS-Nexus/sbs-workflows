import { describe, expect, it } from 'vitest';
import {
  fasseLektionZusammen,
  istBeurteilbar,
  istLektionAbgeschlossen,
  OHNE_UEBUNGSSERVER,
  zaehltZurBeurteilung,
  type AufgabenStand,
} from '@/domain/aufgabe/abschluss';
import { LEHRPLAN } from '@/content';
import type { Aufgabenart } from '@/content/typen';

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

describe('Validator und Bewertung sind sich einig', () => {
  it('stuft dieselben Arten als „braucht Ausführung" ein', () => {
    /*
     * Der Validator führt eine eigene Liste, damit er nicht von der
     * Bewertungslogik abhängt. Zwei Listen laufen auseinander, sobald eine
     * Aufgabenart dazukommt – und dann meldet der Validator eine Lücke, die es
     * nicht gibt, oder übersieht eine, die es gibt.
     */
    const alleArten: Aufgabenart[] = [
      'EINFACHAUSWAHL',
      'MEHRFACHAUSWAHL',
      'FREITEXT',
      'ERGEBNIS_VORHERSAGEN',
      'REIHENFOLGE',
      'ABFRAGE_ERGAENZEN',
      'FEHLER_FINDEN',
      'FEHLER_ERKLAEREN',
      'ABFRAGE_SCHREIBEN',
      'TRANSFER',
    ];

    const lautBewertung = alleArten.filter((art) => !istBeurteilbar(art)).sort();
    const lautValidator = alleArten
      .filter((art) => BRAUCHT_AUSFUEHRUNG_IM_VALIDATOR.has(art))
      .sort();

    expect(lautValidator).toEqual(lautBewertung);
  });
});

/**
 * Die Liste, die `src/content/validator.ts` führt – hier gespiegelt, damit der
 * Test sie mit `istBeurteilbar` vergleichen kann, ohne dass der Validator sie
 * exportieren muss.
 */
const BRAUCHT_AUSFUEHRUNG_IM_VALIDATOR = new Set<Aufgabenart>([
  'ABFRAGE_ERGAENZEN',
  'ABFRAGE_SCHREIBEN',
  'FEHLER_FINDEN',
  'TRANSFER',
]);

describe('Mit eingeschaltetem Übungsserver', () => {
  const MIT = { uebungsserver: true };
  const auswahl: AufgabenStand = { art: 'EINFACHAUSWAHL', letztesErgebnis: 'PASSED' };
  const pruefbar = (letztesErgebnis?: AufgabenStand['letztesErgebnis']): AufgabenStand => ({
    art: 'ABFRAGE_SCHREIBEN',
    amErgebnisPruefbar: true,
    letztesErgebnis,
  });
  const aendernd: AufgabenStand = { art: 'ABFRAGE_SCHREIBEN', amErgebnisPruefbar: false };

  it('zählen die Schreibaufgaben mit, die der Server am Ergebnis bewertet', () => {
    expect(zaehltZurBeurteilung(pruefbar(), MIT)).toBe(true);
    expect(zaehltZurBeurteilung(pruefbar(), OHNE_UEBUNGSSERVER)).toBe(false);
    // Änderungsaufgaben bewertet er nicht – sie zählen auch mit Server nicht.
    expect(zaehltZurBeurteilung(aendernd, MIT)).toBe(false);
  });

  it('schließt eine Lektion erst, wenn auch die bewerteten Schreibaufgaben sitzen', () => {
    // Vorher galt sie hier schon als abgeschlossen: Die Schreibaufgabe zählte
    // nicht, obwohl der Server sie bewertete.
    expect(istLektionAbgeschlossen([auswahl, pruefbar()], MIT)).toBe(false);
    expect(istLektionAbgeschlossen([auswahl, pruefbar('FAILED')], MIT)).toBe(false);
    expect(istLektionAbgeschlossen([auswahl, pruefbar('PASSED')], MIT)).toBe(true);
    expect(istLektionAbgeschlossen([auswahl, pruefbar('PASSED'), aendernd], MIT)).toBe(true);
  });

  it('bleibt ohne Server bei der bisherigen Regel', () => {
    expect(istLektionAbgeschlossen([auswahl, pruefbar()])).toBe(true);
  });
});

describe('Stand einer Lektion', () => {
  it('zählt nach derselben Regel wie der Abschluss', () => {
    const staende: AufgabenStand[] = [
      { art: 'EINFACHAUSWAHL', letztesErgebnis: 'PASSED' },
      { art: 'EINFACHAUSWAHL', letztesErgebnis: 'FAILED' },
      { art: 'ABFRAGE_SCHREIBEN', amErgebnisPruefbar: true, letztesErgebnis: 'PASSED' },
    ];
    expect(fasseLektionZusammen(staende)).toEqual({ gesamt: 2, geloest: 1 });
    expect(fasseLektionZusammen(staende, { uebungsserver: true })).toEqual({
      gesamt: 3,
      geloest: 2,
    });
  });
});
