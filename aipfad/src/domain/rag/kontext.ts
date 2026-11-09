import { rangliste, topK, type RanglistenEintrag } from '@/domain/retrieval/ranking';
import type { Chunk } from './chunking';

/**
 * Kontextauswahl für RAG: Ranking → Top-k → Kontextbudget.
 *
 * Ranking und Top-k stammen unverändert aus `domain/retrieval/` (LP-10A) —
 * dieselbe Kosinusähnlichkeit, dieselbe Tie-Break-Regel. Neu ist nur das
 * Kontextbudget: Die Top-k-Chunks werden in Rangfolge übernommen, solange
 * ihre Einheiten ins Budget passen. Ein Chunk, der nicht mehr passt, wird
 * übersprungen; spätere, kleinere Chunks können noch nachrücken.
 *
 * Das Budget ist ein simuliertes, didaktisches Kontextfenster in
 * Wort-Einheiten — kein Token-Limit eines bestimmten Modells.
 */

export type Ausschlussgrund = 'top-k' | 'budget';

export interface KontextEintrag {
  chunk: Chunk;
  /** Platz in der Rangliste, 1-basiert. */
  platz: number;
  score: number;
  rechnung: RanglistenEintrag['rechnung'];
  /** `null`: im Kontext. Sonst der Grund, warum der Chunk fehlt. */
  ausgeschlossen: Ausschlussgrund | null;
}

export interface Kontext {
  /** Alle bewerteten Chunks in Rangfolge, mit Status. */
  eintraege: KontextEintrag[];
  /** Nur die übernommenen Chunks, in Rangfolge. */
  imKontext: Chunk[];
  belegteEinheiten: number;
  budget: number;
  /** Chunks ohne definierte Ähnlichkeit (Nullvektor), ausdrücklich ausgewiesen. */
  nichtVergleichbar: string[];
}

export function waehleKontext(
  anfrageVektor: readonly number[],
  chunks: readonly Chunk[],
  optionen: { k: number; budget: number },
): Kontext {
  const { budget } = optionen;
  if (!Number.isInteger(budget) || budget < 0) {
    throw new RangeError(`Das Budget muss eine ganze Zahl ≥ 0 sein, war ${String(budget)}.`);
  }

  const nachId = new Map(chunks.map((c) => [c.id, c]));
  const liste = rangliste(
    anfrageVektor,
    chunks.map((c) => ({ id: c.id, vektor: c.vektor })),
  );
  const auswahl = topK(liste.eintraege, optionen.k);
  const imTop = new Set(auswahl.treffer.map((t) => t.id));

  let belegt = 0;
  const eintraege: KontextEintrag[] = liste.eintraege.map((eintrag) => {
    const chunk = nachId.get(eintrag.id);
    if (!chunk) throw new Error(`Unbekannter Chunk "${eintrag.id}" in der Rangliste.`);
    let ausgeschlossen: Ausschlussgrund | null = null;
    if (!imTop.has(eintrag.id)) {
      ausgeschlossen = 'top-k';
    } else if (belegt + chunk.einheiten > budget) {
      ausgeschlossen = 'budget';
    } else {
      belegt += chunk.einheiten;
    }
    return {
      chunk,
      platz: eintrag.platz,
      score: eintrag.score,
      rechnung: eintrag.rechnung,
      ausgeschlossen,
    };
  });

  return {
    eintraege,
    imKontext: eintraege.filter((e) => e.ausgeschlossen === null).map((e) => e.chunk),
    belegteEinheiten: belegt,
    budget,
    nichtVergleichbar: liste.ausgeschlossen.map((a) => a.id),
  };
}
