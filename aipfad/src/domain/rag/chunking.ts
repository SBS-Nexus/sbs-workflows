import { pruefeVektor, VektorFehler } from '@/domain/retrieval/vektor';

/**
 * Chunking für das RAG-Modul (Stufe 10).
 *
 * Didaktisches Modell, ausdrücklich vereinfacht:
 *  - Ein Dokument ist eine Folge von Sätzen. Chunks bestehen aus ganzen
 *    Sätzen; ein Satz wird nie zerschnitten.
 *  - Jeder Satz trägt einen redaktionell festgelegten Beispielvektor. Der
 *    Vektor eines Chunks ist die komponentenweise Summe seiner Sätze. Weil
 *    die Kosinusähnlichkeit nur die Richtung misst, ist das gleichwertig zum
 *    Mittelwert — ein Chunk "mischt" die Bedeutung seiner Sätze. Ein echtes
 *    Embedding-Modell rechnet anders; das Prinzip (mehr Themen in einem
 *    Chunk verwässern seine Richtung) bleibt.
 *  - Der Umfang eines Chunks wird in didaktischen Einheiten gemessen: eine
 *    Einheit je Wort. Das sind keine Tokens eines bestimmten Modells.
 *
 * Alle Funktionen sind rein, deterministisch und verändern ihre Eingaben
 * nicht.
 */

export interface RagSatz {
  text: string;
  vektor: readonly number[];
}

export interface RagDokument {
  id: string;
  saetze: readonly RagSatz[];
}

export interface ChunkStrategie {
  id: string;
  /** Wie viele Sätze ein Chunk höchstens umfasst. */
  saetzeProChunk: number;
  /** Wie viele Sätze aufeinanderfolgende Chunks teilen. */
  overlap: number;
}

/** Verweis auf einen Satz: Dokument und 0-basierter Satzindex. */
export interface SatzVerweis {
  dokumentId: string;
  satz: number;
}

export interface Chunk {
  /** Deterministisch: `<dokument>:<strategie>:<laufende Nummer ab 1>`. */
  id: string;
  dokumentId: string;
  strategieId: string;
  /** Erster Satz (inklusive), 0-basiert. */
  von: number;
  /** Letzter Satz (inklusive), 0-basiert. */
  bis: number;
  text: string;
  vektor: number[];
  einheiten: number;
}

export function chunkId(dokumentId: string, strategieId: string, laufendeNummer: number): string {
  return `${dokumentId}:${strategieId}:${laufendeNummer}`;
}

/**
 * Didaktische Umfangseinheiten eines Textes: eine Einheit je Wort.
 * Leerer Text hat null Einheiten.
 */
export function einheitenFuerText(text: string): number {
  const woerter = text.trim().split(/\s+/u);
  return woerter.length === 1 && woerter[0] === '' ? 0 : woerter.length;
}

function pruefeStrategie(strategie: ChunkStrategie): void {
  const { saetzeProChunk, overlap } = strategie;
  if (!Number.isInteger(saetzeProChunk) || saetzeProChunk < 1) {
    throw new RangeError(
      `Strategie "${strategie.id}": saetzeProChunk muss eine ganze Zahl ≥ 1 sein, war ${String(saetzeProChunk)}.`,
    );
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= saetzeProChunk) {
    // Overlap ≥ Chunkgröße hieße: kein Fortschritt, die Schleife liefe ewig.
    throw new RangeError(
      `Strategie "${strategie.id}": overlap muss eine ganze Zahl in [0, saetzeProChunk) sein, war ${String(overlap)}.`,
    );
  }
}

/**
 * Teilt ein Dokument in Chunks.
 *
 * Fensterbreite `saetzeProChunk`, Schrittweite `saetzeProChunk − overlap`.
 * Der letzte Chunk endet am letzten Satz; ein Fenster, das nichts Neues mehr
 * abdecken würde, entsteht nicht. Jeder Satz liegt in mindestens einem Chunk.
 */
export function chunkeDokument(dokument: RagDokument, strategie: ChunkStrategie): Chunk[] {
  pruefeStrategie(strategie);
  if (dokument.saetze.length === 0) {
    throw new RangeError(`Dokument "${dokument.id}" hat keine Sätze.`);
  }
  const dimension = dokument.saetze[0]?.vektor.length ?? 0;
  for (const [index, satz] of dokument.saetze.entries()) {
    pruefeVektor(satz.vektor, `Satz ${index + 1} in "${dokument.id}"`);
    if (satz.vektor.length !== dimension) {
      throw new VektorFehler(
        'DIMENSION',
        `Satz ${index + 1} in "${dokument.id}" hat ${satz.vektor.length} statt ${dimension} Dimensionen.`,
      );
    }
  }

  const schritt = strategie.saetzeProChunk - strategie.overlap;
  const letzter = dokument.saetze.length - 1;
  const chunks: Chunk[] = [];

  for (let von = 0; von <= letzter; von += schritt) {
    const bis = Math.min(von + strategie.saetzeProChunk - 1, letzter);
    const saetze = dokument.saetze.slice(von, bis + 1);
    const text = saetze.map((s) => s.text).join(' ');
    const vektor = Array.from({ length: dimension }, (_, d) =>
      saetze.reduce((summe, s) => summe + (s.vektor[d] as number), 0),
    );
    chunks.push({
      id: chunkId(dokument.id, strategie.id, chunks.length + 1),
      dokumentId: dokument.id,
      strategieId: strategie.id,
      von,
      bis,
      text,
      vektor,
      einheiten: einheitenFuerText(text),
    });
    if (bis === letzter) break;
  }
  return chunks;
}

/** Chunks aller Dokumente in Dokumentreihenfolge. Doppelte Dokument-IDs werden abgelehnt. */
export function chunkeBestand(
  dokumente: readonly RagDokument[],
  strategie: ChunkStrategie,
): Chunk[] {
  const gesehen = new Set<string>();
  const alle: Chunk[] = [];
  for (const dokument of dokumente) {
    if (gesehen.has(dokument.id)) {
      throw new Error(`Doppelte Dokumentkennung "${dokument.id}".`);
    }
    gesehen.add(dokument.id);
    alle.push(...chunkeDokument(dokument, strategie));
  }
  return alle;
}

export function chunkEnthaelt(chunk: Chunk, verweis: SatzVerweis): boolean {
  return (
    chunk.dokumentId === verweis.dokumentId &&
    verweis.satz >= chunk.von &&
    verweis.satz <= chunk.bis
  );
}

/**
 * Enthält ein einzelner Chunk ALLE Sätze einer Belegsgruppe?
 *
 * Eine Gruppe sind Sätze, die nur zusammen eine Aussage tragen — etwa eine
 * Regel und ihre Ausnahme ("… gilt diese Einschränkung nicht."). Liegen sie
 * in verschiedenen Chunks, ist keiner der beiden für sich ein Beleg: Das ist
 * der Kontextverlust durch eine ungünstige Trennstelle.
 */
export function chunkEnthaeltGruppe(chunk: Chunk, gruppe: readonly SatzVerweis[]): boolean {
  return gruppe.length > 0 && gruppe.every((verweis) => chunkEnthaelt(chunk, verweis));
}

/**
 * Belegsgruppen, die eine Strategie zerschneidet: Kein einziger Chunk
 * enthält die Gruppe vollständig.
 */
export function getrennteGruppen<T extends { gruppe: readonly SatzVerweis[] }>(
  chunks: readonly Chunk[],
  gruppen: readonly T[],
): T[] {
  return gruppen.filter((g) => !chunks.some((chunk) => chunkEnthaeltGruppe(chunk, g.gruppe)));
}
