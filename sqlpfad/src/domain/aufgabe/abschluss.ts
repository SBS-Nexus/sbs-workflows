import type { Aufgabenart } from '@/content/typen';
import { antwortform } from '@/domain/aufgabe/bewertung';
import type { Versuchsergebnis } from '@/domain/aufgabe/auswahl';

/**
 * Wann eine Lektion als bearbeitet gilt.
 *
 * Die naheliegende Regel – „alle Aufgaben gelöst" – wäre auf dieser
 * Installation unerreichbar. Eine geschriebene Abfrage lässt sich nur am
 * Ergebnis beurteilen, und dafür fehlt der Übungsserver; keine einzige Lektion
 * käme je auf grün. Ein Zustand, den niemand erreichen kann, ist schlimmer als
 * keiner: Er sieht aus wie ein persönliches Versäumnis.
 *
 * Deshalb zählen hier die Aufgaben, die sich **ohne Übungsserver beurteilen
 * lassen**.
 *
 * Ist der Übungsserver eingeschaltet, zählen zusätzlich die Schreibaufgaben,
 * die er am Ergebnis bewertet (`istAmErgebnisPruefbar`: lesend, mit
 * erwartetem Ergebnis). Das entscheidet `zaehltZurBeurteilung` mit dem
 * `Beurteilungsrahmen` – Abschluss, Wissenslandkarte und die Fortschrittsquelle
 * für den Hub wenden dieselbe Regel an. Ohne diese Unterscheidung konnte eine
 * Lektion als abgeschlossen gelten, deren Schreibaufgaben noch offen waren,
 * obwohl der Server sie längst bewertete.
 *
 * Was ausdrücklich **nicht** genügt: eine angesehene Lösung. Sie sagt nichts
 * darüber aus, ob die Aufgabe allein gelingt.
 */

export interface AufgabenStand {
  art: Aufgabenart;
  letztesErgebnis?: Versuchsergebnis;
  /** Bewertet der Übungsserver diese Aufgabe am Ergebnis? Siehe `istAmErgebnisPruefbar`. */
  amErgebnisPruefbar?: boolean;
}

/** Unter welchen Bedingungen beurteilt wird. */
export interface Beurteilungsrahmen {
  /** Ist der Übungsserver eingeschaltet und angeschlossen? */
  uebungsserver: boolean;
}

export const OHNE_UEBUNGSSERVER: Beurteilungsrahmen = { uebungsserver: false };

/** Lässt sich diese Aufgabenart ohne Übungsserver beurteilen? */
export function istBeurteilbar(art: Aufgabenart): boolean {
  return antwortform(art) !== 'sql';
}

/** Zählt diese Aufgabe unter diesen Bedingungen zu dem, was beurteilt wird? */
export function zaehltZurBeurteilung(
  aufgabe: Pick<AufgabenStand, 'art' | 'amErgebnisPruefbar'>,
  rahmen: Beurteilungsrahmen,
): boolean {
  if (istBeurteilbar(aufgabe.art)) return true;
  return rahmen.uebungsserver && aufgabe.amErgebnisPruefbar === true;
}

/**
 * Ist die Lektion durch?
 *
 * `false` auch dann, wenn es überhaupt keine beurteilbare Aufgabe gibt – sonst
 * gälte eine Lektion aus lauter Schreibaufgaben als abgeschlossen, ohne dass
 * jemand etwas getan hätte.
 */
export function istLektionAbgeschlossen(
  aufgaben: readonly AufgabenStand[],
  rahmen: Beurteilungsrahmen = OHNE_UEBUNGSSERVER,
): boolean {
  const beurteilbare = aufgaben.filter((aufgabe) => zaehltZurBeurteilung(aufgabe, rahmen));
  if (beurteilbare.length === 0) return false;
  return beurteilbare.every((aufgabe) => aufgabe.letztesErgebnis === 'PASSED');
}
