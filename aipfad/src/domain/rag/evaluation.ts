import { precisionUndRecall } from '@/domain/retrieval/ranking';
import { chunkEnthaeltGruppe, type Chunk } from './chunking';
import type { Aussage, GepruefteAussage } from './antwort';

/**
 * Grundlegende RAG-Evaluation: Retrieval-Qualität und Antwortqualität
 * getrennt betrachten.
 *
 *  - Retrieval: Wie viele Kontext-Chunks tragen eine benötigte Aussage
 *    (Precision), und wie viele der tragenden Chunks im ganzen Bestand
 *    landeten im Kontext (Recall)? Gerechnet mit `precisionUndRecall` aus
 *    LP-10A.
 *  - Antwort: Welcher Anteil der benötigten Aussagen ist belegt
 *    (Vollständigkeit), und wird etwas ohne Beleg als Tatsache ausgegeben?
 *
 * "Benötigt" ist ein fachliches Urteil aus der Lab-Konfiguration, kein
 * berechneter Wert. Nicht definierte Maße sind `null`, nie 0 oder 1.
 */

export interface RagBewertung {
  kontextPrecision: number | null;
  kontextRecall: number | null;
  /** Belegte benötigte Aussagen / benötigte Aussagen. */
  vollstaendigkeit: number | null;
  fehlend: string[];
  /** Als Tatsache ausgegebene Aussagen ohne Beleg im Kontext. Muss 0 sein. */
  ungestuetzteFakten: number;
  /**
   * Hat die simulierte Antwort das fachlich richtige Ergebnis? Ohne
   * benötigte Aussagen ist "nicht genügend Informationen" richtig.
   */
  ergebnisKorrekt: boolean;
}

export function bewerteRag(input: {
  geprueft: readonly GepruefteAussage[];
  benoetigteAussagen: readonly string[];
  kontext: readonly Chunk[];
  alleChunks: readonly Chunk[];
}): RagBewertung {
  const nachId = new Map(input.geprueft.map((g) => [g.aussage.id, g]));
  for (const id of input.benoetigteAussagen) {
    if (!nachId.has(id)) throw new Error(`Benötigte Aussage "${id}" ist unbekannt.`);
  }
  const benoetigt: Aussage[] = input.benoetigteAussagen.map(
    (id) => (nachId.get(id) as GepruefteAussage).aussage,
  );

  const tragendeIds = input.alleChunks
    .filter((chunk) =>
      benoetigt.some((a) => a.belege.some((gruppe) => chunkEnthaeltGruppe(chunk, gruppe))),
    )
    .map((c) => c.id);
  const retrieval = precisionUndRecall(
    input.kontext.map((c) => c.id),
    tragendeIds,
  );

  const fehlend = input.benoetigteAussagen.filter((id) => nachId.get(id)?.status !== 'belegt');
  const ungestuetzteFakten = input.geprueft.filter(
    (g) => g.status === 'belegt' && g.belegChunks.length === 0,
  ).length;
  const irgendwasBelegt = input.geprueft.some((g) => g.status === 'belegt');

  return {
    kontextPrecision: benoetigt.length === 0 ? null : retrieval.precision,
    kontextRecall: retrieval.recall,
    vollstaendigkeit:
      benoetigt.length === 0 ? null : (benoetigt.length - fehlend.length) / benoetigt.length,
    fehlend,
    ungestuetzteFakten,
    ergebnisKorrekt:
      benoetigt.length === 0 ? !irgendwasBelegt : fehlend.length === 0 && ungestuetzteFakten === 0,
  };
}
