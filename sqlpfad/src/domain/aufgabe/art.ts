import type { Aufgabenart } from '@/content/typen';

/**
 * Die Aufgabenart im Inhalt und die im Datenmodell.
 *
 * Zwei Namen für dieselbe Sache – der Inhalt ist deutsch, das Datenmodell
 * folgt der Sprache der übrigen Spalten. Beide Richtungen stehen hier an einer
 * Stelle, weil zwei Zuordnungstabellen an zwei Orten irgendwann auseinander
 * laufen: Der Seed schriebe dann eine Art in die Datenbank, die die Anwendung
 * beim Lesen nicht wiedererkennt, und die Aufgabe wäre nicht mehr bearbeitbar.
 */
export const ART_IM_DATENMODELL: Record<Aufgabenart, string> = {
  EINFACHAUSWAHL: 'SINGLE_CHOICE',
  MEHRFACHAUSWAHL: 'MULTIPLE_CHOICE',
  FREITEXT: 'FREE_TEXT',
  ERGEBNIS_VORHERSAGEN: 'PREDICT_RESULT',
  REIHENFOLGE: 'ORDER_CLAUSES',
  ABFRAGE_ERGAENZEN: 'COMPLETE_QUERY',
  FEHLER_FINDEN: 'FIND_ERROR',
  FEHLER_ERKLAEREN: 'EXPLAIN_ERROR',
  ABFRAGE_SCHREIBEN: 'WRITE_QUERY',
  TRANSFER: 'TRANSFER',
};

const AUS_DATENMODELL = new Map<string, Aufgabenart>(
  Object.entries(ART_IM_DATENMODELL).map(([art, wert]) => [wert, art as Aufgabenart]),
);

/**
 * Die Art aus dem Datenmodell zurückübersetzen.
 *
 * `null` heißt: Diese Art kennt der Inhalt nicht. Das Datenmodell führt mehr
 * Arten, als der Lehrplan bisher benutzt – eine davon in der Datenbank
 * anzutreffen ist kein Absturzgrund, aber auch nichts, das sich raten ließe.
 */
export function ausDatenmodellArt(wert: string): Aufgabenart | null {
  return AUS_DATENMODELL.get(wert) ?? null;
}
