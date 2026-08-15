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
 * Deshalb zählen hier die Aufgaben, die sich **beurteilen lassen**. Kommt der
 * Runner dazu, werden die Schreibaufgaben beurteilbar und rutschen ohne
 * Änderung an dieser Datei in dieselbe Regel – `istBeurteilbar` fragt nicht
 * nach einer Liste von Arten, sondern nach der Antwortform.
 *
 * Was ausdrücklich **nicht** genügt: eine angesehene Lösung. Sie sagt nichts
 * darüber aus, ob die Aufgabe allein gelingt.
 */

export interface AufgabenStand {
  art: Aufgabenart;
  letztesErgebnis?: Versuchsergebnis;
}

/** Lässt sich diese Aufgabenart ohne Übungsserver beurteilen? */
export function istBeurteilbar(art: Aufgabenart): boolean {
  return antwortform(art) !== 'sql';
}

/**
 * Ist die Lektion durch?
 *
 * `false` auch dann, wenn es überhaupt keine beurteilbare Aufgabe gibt – sonst
 * gälte eine Lektion aus lauter Schreibaufgaben als abgeschlossen, ohne dass
 * jemand etwas getan hätte.
 */
export function istLektionAbgeschlossen(aufgaben: readonly AufgabenStand[]): boolean {
  const beurteilbare = aufgaben.filter((aufgabe) => istBeurteilbar(aufgabe.art));
  if (beurteilbare.length === 0) return false;
  return beurteilbare.every((aufgabe) => aufgabe.letztesErgebnis === 'PASSED');
}
