import type { Aufgabenart } from '@/content/typen';
import { istBeurteilbar } from '@/domain/aufgabe/abschluss';
import type { Versuchsergebnis } from '@/domain/aufgabe/auswahl';

/**
 * Wie es um ein Konzept steht.
 *
 * Bewusst **keine Prozentzahl und kein Kompetenzwert von 0 bis 100.** Eine Zahl
 * mit zwei Nachkommastellen sieht nach Messung aus; was hier vorliegt, ist
 * eine Handvoll Aufgabenergebnisse. „73 % JOIN" wäre eine Genauigkeit, die die
 * Datenlage nicht hergibt – und die Lernende würde anfangen, die Zahl zu
 * optimieren statt zu verstehen.
 *
 * Stattdessen ein Wort und die Zahlen dahinter, aus denen es entsteht. Wer
 * wissen will, warum dort „wackelig" steht, kann es nachzählen.
 *
 * Ebenso bewusst **nicht** persistiert: Das Datenmodell hat `ConceptMastery`
 * mit `stability`, `difficulty` und `nextReviewAt`. Diese Felder gehören zu
 * einem Gedächtnismodell, das es hier noch nicht gibt. Sie mit gerundeten
 * Zahlen zu füllen, damit die Tabelle nicht leer aussieht, hieße, sich später
 * auf Werte zu verlassen, die nie gerechnet wurden. Der Stand wird deshalb bei
 * jedem Aufruf aus den Versuchen abgeleitet – eine einzige Wahrheit, und sie
 * steht in `attempts`.
 */

export type Kompetenzstand =
  /** Noch keine der Aufgaben bearbeitet. */
  | 'ungeuebt'
  /** Was bearbeitet wurde, saß – aber es ist noch nicht alles bearbeitet. */
  | 'angefangen'
  /** Mindestens eine bearbeitete Aufgabe saß beim letzten Mal nicht. */
  | 'wackelig'
  /** Alle beurteilbaren Aufgaben sitzen. */
  | 'sitzt'
  /**
   * Zu diesem Konzept gibt es nur Aufgaben, die ohne Übungsserver nicht
   * beurteilt werden können. Kein Versäumnis der Lernenden – ein Zustand der
   * Installation, und die Oberfläche sagt das auch so.
   */
  | 'nicht-beurteilbar';

export interface AufgabenErgebnis {
  art: Aufgabenart;
  letztesErgebnis?: Versuchsergebnis;
}

export interface Kompetenz {
  stand: Kompetenzstand;
  /** Beurteilbare Aufgaben zu diesem Konzept. */
  gesamt: number;
  /** Davon mindestens einmal bearbeitet. */
  bearbeitet: number;
  /** Davon beim letzten Mal gelöst. */
  geloest: number;
}

export function bewerteKonzept(aufgaben: readonly AufgabenErgebnis[]): Kompetenz {
  const beurteilbare = aufgaben.filter((aufgabe) => istBeurteilbar(aufgabe.art));

  if (beurteilbare.length === 0) {
    return { stand: 'nicht-beurteilbar', gesamt: 0, bearbeitet: 0, geloest: 0 };
  }

  const bearbeitet = beurteilbare.filter((aufgabe) => aufgabe.letztesErgebnis !== undefined).length;
  // Eine angesehene Lösung zählt hier nicht als gelöst - sie sagt nichts
  // darüber aus, ob es allein gelingt.
  const geloest = beurteilbare.filter((aufgabe) => aufgabe.letztesErgebnis === 'PASSED').length;

  const stand: Kompetenzstand =
    bearbeitet === 0
      ? 'ungeuebt'
      : geloest === beurteilbare.length
        ? 'sitzt'
        : bearbeitet > geloest
          ? 'wackelig'
          : 'angefangen';

  return { stand, gesamt: beurteilbare.length, bearbeitet, geloest };
}

/** Ein Satz für die Oberfläche – dieselbe Sprache wie im Rest der Anwendung. */
export function beschreibeStand(kompetenz: Kompetenz): string {
  switch (kompetenz.stand) {
    case 'ungeuebt':
      return 'Noch nicht geübt.';
    case 'angefangen':
      return `${kompetenz.geloest} von ${kompetenz.gesamt} Aufgaben gelöst, der Rest steht noch aus.`;
    case 'wackelig':
      return `${kompetenz.geloest} von ${kompetenz.bearbeitet} bearbeiteten Aufgaben saßen zuletzt.`;
    case 'sitzt':
      return `Alle ${kompetenz.gesamt} Aufgaben saßen beim letzten Mal.`;
    case 'nicht-beurteilbar':
      return 'Dazu gibt es nur Aufgaben, die den Übungsserver brauchen.';
  }
}
