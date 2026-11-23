import { chunkEnthaelt, chunkEnthaeltGruppe, type Chunk, type SatzVerweis } from './chunking';

/**
 * Deterministischer Antwort-Simulator für das RAG-Lab.
 *
 * Hier wird KEINE Antwort generiert. Die möglichen Aussagen sind
 * redaktionell vorgegeben und je mit den Sätzen verknüpft, die sie belegen.
 * Der Simulator entscheidet nur, welche dieser Aussagen der ausgewählte
 * Kontext tatsächlich trägt:
 *
 *  - `belegt`            ein Chunk im Kontext aus einer aktuellen Quelle
 *                        enthält eine vollständige Belegsgruppe
 *  - `veraltet`          nur Chunks aus veralteten Quellen tragen sie
 *  - `widerspruechlich`  belegt, aber eine ausschließende Aussage ist
 *                        ebenfalls aus aktueller Quelle belegt
 *  - `unbelegt`          kein Chunk im Kontext trägt sie
 *
 * Als Tatsache ausgegeben wird nur `belegt`, und jeder Quellenverweis zeigt
 * auf einen Chunk, der wirklich im Kontext liegt. Einen anderen Verweis
 * kann diese Funktion nicht erzeugen.
 */

export type QuellenStatus = 'aktuell' | 'veraltet';

export interface Quelle {
  id: string;
  status: QuellenStatus;
}

export interface Aussage {
  id: string;
  text: string;
  /** Alternative Belege; jede Gruppe muss vollständig in EINEM Chunk liegen. */
  belege: readonly (readonly SatzVerweis[])[];
  /** Eine Quelle, auf die sich die Aussage beruft — womöglich nicht im Kontext. */
  zitierteQuelle?: string;
  /** Aussagen, die nicht gleichzeitig zutreffen können. */
  schliesstAus?: readonly string[];
}

export type AussageStatus = 'belegt' | 'veraltet' | 'widerspruechlich' | 'unbelegt';

export interface GepruefteAussage {
  aussage: Aussage;
  status: AussageStatus;
  /** Chunks im Kontext, die die Aussage vollständig tragen — nur aus dem Kontext. */
  belegChunks: Chunk[];
  /** Aussagen, mit denen sie im Widerspruch steht (beide aktuell belegt). */
  widersprichtDen: string[];
  /** Alle Sätze einer Belegsgruppe liegen im Kontext, aber in verschiedenen Chunks. */
  getrennt: boolean;
  /** Die zitierte Quelle kommt im Kontext nicht vor. */
  erfundeneQuelle: boolean;
}

export const NICHT_GENUEGEND_INFORMATIONEN =
  'Nicht genügend Informationen: Die bereitgestellten Quellen beantworten diese Frage nicht.';

export function pruefeAussagen(
  aussagen: readonly Aussage[],
  kontext: readonly Chunk[],
  quellen: readonly Quelle[],
): GepruefteAussage[] {
  const statusVon = new Map(quellen.map((q) => [q.id, q.status]));
  const gesehen = new Set<string>();
  for (const aussage of aussagen) {
    if (gesehen.has(aussage.id)) throw new Error(`Doppelte Aussagekennung "${aussage.id}".`);
    gesehen.add(aussage.id);
  }

  const vorlaeufig = aussagen.map((aussage): GepruefteAussage => {
    const tragend = kontext.filter((chunk) =>
      aussage.belege.some((gruppe) => chunkEnthaeltGruppe(chunk, gruppe)),
    );
    for (const chunk of tragend) {
      if (!statusVon.has(chunk.dokumentId)) {
        throw new Error(`Chunk "${chunk.id}" stammt aus einer unbekannten Quelle.`);
      }
    }
    const aktuell = tragend.filter((c) => statusVon.get(c.dokumentId) === 'aktuell');
    const status: AussageStatus =
      aktuell.length > 0 ? 'belegt' : tragend.length > 0 ? 'veraltet' : 'unbelegt';
    const getrennt =
      tragend.length === 0 &&
      aussage.belege.some(
        (gruppe) =>
          gruppe.length > 1 && gruppe.every((v) => kontext.some((c) => chunkEnthaelt(c, v))),
      );
    const erfundeneQuelle =
      aussage.zitierteQuelle !== undefined &&
      !kontext.some((c) => c.dokumentId === aussage.zitierteQuelle);
    return {
      aussage,
      status,
      // Als Beleg zählen bei einer belegten Aussage nur aktuelle Quellen.
      belegChunks: status === 'belegt' ? aktuell : tragend,
      widersprichtDen: [],
      getrennt,
      erfundeneQuelle,
    };
  });

  // Widerspruch ist symmetrisch: Es genügt, wenn eine Seite ihn erklärt.
  const nachId = new Map(vorlaeufig.map((g) => [g.aussage.id, g]));
  for (const geprueft of vorlaeufig) {
    for (const andereId of geprueft.aussage.schliesstAus ?? []) {
      const andere = nachId.get(andereId);
      if (!andere) continue;
      if (geprueft.status !== 'belegt' && geprueft.status !== 'widerspruechlich') continue;
      if (andere.status !== 'belegt' && andere.status !== 'widerspruechlich') continue;
      geprueft.status = 'widerspruechlich';
      andere.status = 'widerspruechlich';
      if (!geprueft.widersprichtDen.includes(andereId)) geprueft.widersprichtDen.push(andereId);
      if (!andere.widersprichtDen.includes(geprueft.aussage.id)) {
        andere.widersprichtDen.push(geprueft.aussage.id);
      }
    }
  }

  return vorlaeufig;
}

export interface SimulierteAntwort {
  /** Aussagen, die als belegte Tatsache ausgegeben werden — mit Verweisen. */
  belegt: GepruefteAussage[];
  /** Aussagen, die ausdrücklich NICHT als Tatsache ausgegeben werden. */
  zurueckgehalten: GepruefteAussage[];
  /** Kein einziger Beleg: Die korrekte Ausgabe ist "nicht genügend Informationen". */
  nichtGenuegend: boolean;
}

export function simuliereAntwort(geprueft: readonly GepruefteAussage[]): SimulierteAntwort {
  const belegt = geprueft.filter((g) => g.status === 'belegt');
  return {
    belegt,
    zurueckgehalten: geprueft.filter((g) => g.status !== 'belegt'),
    nichtGenuegend: belegt.length === 0,
  };
}
