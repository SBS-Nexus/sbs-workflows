import type { Antwort } from './bewertung';

/**
 * In welcher Reihenfolge die Optionen einer Aufgabe erscheinen.
 *
 * Im Lehrplan steht die richtige Antwort jeder Einfachauswahl an erster
 * Stelle, bei Mehrfachauswahl stehen die richtigen vorn, und die Bausteine
 * einer Reihenfolge-Aufgabe stehen in der richtigen Reihenfolge. So lassen
 * sich Inhalte gut pflegen – angezeigt so, war die erste Option immer richtig
 * und die Reihenfolge-Aufgabe beim Öffnen schon gelöst. Eine Prüfung, die man
 * an der Position besteht, prüft nichts.
 *
 * Deshalb eine eigene Anzeigereihenfolge je Person und Aufgabe:
 *
 *  - **deterministisch** aus Konto und Aufgabe: Beim Neuladen springt nichts,
 *    und der Server kann die Antwort ohne gespeicherten Zustand zurückrechnen;
 *  - **nie die Lehrplanreihenfolge** (bei mehr als einer Option): sonst wäre
 *    die Reihenfolge-Aufgabe in einem von n! Fällen schon gelöst;
 *  - der Browser bekommt **nur Anzeigepositionen**. Welche Lehrplanposition
 *    dahintersteht, rechnet allein der Server aus. Im Quelltext der Seite steht
 *    damit weiterhin nichts, woran sich die richtige Antwort ablesen ließe.
 *
 * Kein Sicherheitsmerkmal: Wer Konto-Kennung und Verfahren kennt, kann die
 * Reihenfolge nachrechnen – und betrügt damit niemanden außer sich selbst.
 *
 * `anordnung(...)[anzeigeposition]` ist die Position im Lehrplan.
 */
export function anordnung(anzahl: number, schluessel: string): number[] {
  const positionen = Array.from({ length: anzahl }, (_x, index) => index);
  if (anzahl < 2) return positionen;

  const zufall = mulberry32(xmur3(schluessel));
  // Fisher-Yates, von hinten nach vorn.
  for (let i = anzahl - 1; i > 0; i -= 1) {
    const j = Math.floor(zufall() * (i + 1));
    [positionen[i], positionen[j]] = [positionen[j] as number, positionen[i] as number];
  }

  // Nie die Lehrplanreihenfolge: um eins verschieben, falls der Zufall sie traf.
  if (positionen.every((wert, index) => wert === index)) {
    return [...positionen.slice(1), positionen[0] as number];
  }
  return positionen;
}

/** Die Werte in Anzeigereihenfolge. */
export function ordneAn<T>(werte: readonly T[], reihenfolge: readonly number[]): T[] {
  return reihenfolge.map((position) => werte[position] as T);
}

/**
 * Eine Antwort von Anzeigepositionen auf Lehrplanpositionen zurückrechnen.
 *
 * Positionen außerhalb der Anzeige bleiben, wie sie sind: Die Bewertung weist
 * sie als ungültig zurück, statt dass hier still etwas daraus wird.
 */
export function zurAufLehrplan(antwort: Antwort, reihenfolge: readonly number[]): Antwort {
  const zurueck = (position: number): number => reihenfolge[position] ?? position;
  switch (antwort.art) {
    case 'auswahl':
      return { art: 'auswahl', gewaehlt: antwort.gewaehlt.map(zurueck) };
    case 'reihenfolge':
      return { art: 'reihenfolge', reihenfolge: antwort.reihenfolge.map(zurueck) };
    default:
      return antwort;
  }
}

/** Schlüssel der Anordnung: eine Person, eine Aufgabe. */
export function anordnungsSchluessel(userId: string, aufgabeSlug: string): string {
  return `${userId}:${aufgabeSlug}`;
}

/** Zeichenkette → 32-Bit-Startwert (xmur3). */
function xmur3(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Kleiner, reproduzierbarer Zufallsgenerator (mulberry32). */
function mulberry32(start: number): () => number {
  let a = start;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
