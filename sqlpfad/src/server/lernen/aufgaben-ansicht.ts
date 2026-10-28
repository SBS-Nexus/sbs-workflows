import 'server-only';
import type { AufgabenAnsicht } from '@/components/aufgabe/aufgaben-karte';
import { ausDatenmodellArt } from '@/domain/aufgabe/art';
import { anordnung, anordnungsSchluessel, ordneAn } from '@/domain/aufgabe/anordnung';

/**
 * Was von einer Aufgabe an den Browser geht – an genau einer Stelle gebaut.
 *
 * Lektionsseite, Üben und Wiederholen zeigen dieselben Aufgaben. Früher baute
 * jede ihre Ansicht selbst; jetzt kommt die Anzeigereihenfolge der Optionen
 * dazu (`src/domain/aufgabe/anordnung.ts`), und die muss überall dieselbe
 * sein, sonst rechnet der Server eine Antwort auf die falschen Optionen
 * zurück.
 *
 * Die Nutzlast enthält neben den Optionen auch `richtig` und `aufloesung`.
 * Beides bleibt hier: Ein Auswahlfeld, dessen richtige Antwort im Quelltext
 * steht, prüft nichts. Deshalb wird die Ansicht Feld für Feld zusammengesetzt.
 */

export interface AufgabenZeile {
  slug: string;
  type: string;
  title: string;
  prompt: string;
  payload: unknown;
  starterSql: string | null;
  hints: unknown;
  solutionSql: string | null;
  solutionNotes: string | null;
}

/** Die Optionen in Lehrplanreihenfolge – nur Zeichenketten. */
export function optionenAus(nutzlast: unknown): string[] {
  const optionen = (nutzlast as { optionen?: unknown } | null)?.optionen;
  return Array.isArray(optionen)
    ? optionen.filter((eintrag): eintrag is string => typeof eintrag === 'string')
    : [];
}

/** Die Anzeigereihenfolge dieser Optionen für diese Person. */
export function anzeigereihenfolge(
  userId: string,
  aufgabeSlug: string,
  nutzlast: unknown,
): number[] {
  return anordnung(optionenAus(nutzlast).length, anordnungsSchluessel(userId, aufgabeSlug));
}

export function baueAufgabenAnsicht(zeile: AufgabenZeile, userId: string): AufgabenAnsicht | null {
  const art = ausDatenmodellArt(zeile.type);
  if (!art) return null;

  const optionen = optionenAus(zeile.payload);
  return {
    slug: zeile.slug,
    art,
    titel: zeile.title,
    aufgabenstellung: zeile.prompt,
    optionen: ordneAn(optionen, anzeigereihenfolge(userId, zeile.slug, zeile.payload)),
    startSql: zeile.starterSql ?? '',
    hinweise: Array.isArray(zeile.hints)
      ? zeile.hints.filter((eintrag): eintrag is string => typeof eintrag === 'string')
      : [],
    hatLoesung: Boolean(zeile.solutionSql ?? zeile.solutionNotes),
  };
}
