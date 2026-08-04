/**
 * Unscharfe Suche für die Befehlspalette.
 *
 * Warum eine eigene Umsetzung statt einer Bibliothek: Der Bedarf ist eng
 * umrissen (einige hundert Einträge, Suche im Browser, Treffer sollen
 * hervorgehoben werden), und deutsche Inhalte stellen eine Anforderung, die
 * die verbreiteten Pakete nicht erfüllen – „Schleife" muss auch auf „schleife"
 * und „Ausführen" auch auf „ausfuhren" antworten. Ein zusätzliches Paket im
 * Client-Bundle wäre dafür unverhältnismäßig.
 *
 * Verfahren: Teilfolgen-Suche mit Bewertung. Jedes Zeichen der Eingabe muss in
 * dieser Reihenfolge im Text vorkommen, muss aber nicht zusammenhängen. Die
 * Bewertung bevorzugt Treffer, die
 *   - am Wortanfang stehen,
 *   - zusammenhängen,
 *   - früh im Text liegen,
 *   - einen großen Teil des Textes abdecken.
 */

/** Ein zusammenhängender Trefferbereich, für die Hervorhebung. */
export interface MatchRange {
  start: number;
  /** Ausschließlich, wie bei `slice`. */
  end: number;
}

export interface FuzzyMatch {
  /** Höher ist besser. Ohne Treffer wird `null` geliefert, nicht 0. */
  score: number;
  ranges: MatchRange[];
}

/**
 * Vereinheitlicht Text für den Vergleich: Kleinschreibung, diakritische
 * Zeichen entfernt, ß als ss.
 *
 * Diese Fassung ist für Vergleiche gedacht, bei denen die Länge keine Rolle
 * spielt. Für die Trefferhervorhebung wird `foldPreservingLength` benutzt.
 */
export function foldForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe');
}

/**
 * Faltet zeichenweise und liefert garantiert genau ein Zeichen je Eingabezeichen.
 *
 * Das ist die Voraussetzung dafür, dass die ermittelten Trefferbereiche ohne
 * Umrechnung auf den Originaltext passen. „ä" wird deshalb zu „a" (nicht „ae")
 * und „ß" zu „s" (nicht „ss"). Für die Suche genügt das, weil die Eingabe
 * genauso behandelt wird: Wer „strasse" tippt, findet „Straße", weil beide
 * Seiten zu „strase" werden.
 */
function foldPreservingLength(value: string): string {
  let result = '';
  // Bewusst über UTF-16-Einheiten und nicht über Codepunkte: Nur so bleibt die
  // Länge auch bei Ersatzzeichenpaaren (etwa Emoji) exakt erhalten.
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === undefined) continue;
    const mapped = SINGLE_CHAR_FOLD[char];
    if (mapped !== undefined) {
      result += mapped;
      continue;
    }
    const lower = char.toLowerCase();
    const stripped = lower.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    // Ein Zeichen kann sich in mehrere zerlegen. Wir nehmen genau das erste,
    // damit jede Position im Original genau einer im Vergleichstext entspricht.
    result += stripped.length > 0 ? (stripped[0] ?? lower) : lower;
  }
  return result;
}

/**
 * Zeichen, die sich nicht durch Zerlegung falten lassen und deshalb einzeln
 * abgebildet werden. Jeder Eintrag ist genau ein Zeichen lang – die
 * Längentreue ist die ganze Geschäftsgrundlage dieser Tabelle.
 */
const SINGLE_CHAR_FOLD: Readonly<Record<string, string>> = {
  ß: 's',
  æ: 'a',
  Æ: 'a',
  œ: 'o',
  Œ: 'o',
  ø: 'o',
  Ø: 'o',
  đ: 'd',
  ł: 'l',
};

const WORD_BOUNDARY = /[\s\-_/.,:()[\]{}«»„"'`]/;

function isWordStart(text: string, index: number): boolean {
  if (index === 0) return true;
  const previous = text[index - 1];
  if (previous === undefined) return true;
  return WORD_BOUNDARY.test(previous);
}

const SCORE_WORD_START = 12;
const SCORE_CONSECUTIVE = 8;
const SCORE_BASE = 1;
/** Abzug je übersprungenem Zeichen, gedeckelt, damit lange Texte nicht chancenlos sind. */
const PENALTY_GAP = 1;
const PENALTY_GAP_MAX = 12;
/** Abzug für Treffer, die erst im zweiten Anlauf ohne Hervorhebung gefunden wurden. */
const PENALTY_LOOSE = 5;

/**
 * Sucht `query` in `text`.
 *
 * Liefert `null`, wenn nicht alle Zeichen der Eingabe in der richtigen
 * Reihenfolge vorkommen. Eine leere Eingabe gilt als Treffer mit Bewertung 0
 * und ohne hervorgehobene Bereiche – so lässt sich dieselbe Funktion für die
 * ungefilterte Anzeige verwenden.
 */
export function fuzzyMatch(text: string, query: string): FuzzyMatch | null {
  const trimmed = query.trim();
  if (trimmed.length === 0) return { score: 0, ranges: [] };

  const haystack = foldPreservingLength(text);
  const needle = foldPreservingLength(trimmed).replace(/\s+/g, '');
  if (needle.length === 0) return { score: 0, ranges: [] };

  const positions = matchPositions(haystack, needle);
  if (positions !== null) {
    return { score: scorePositions(haystack, needle, positions), ranges: toRanges(positions) };
  }

  // Zweiter Anlauf mit der vollständigen Faltung.
  //
  // Die längentreue Faltung bildet „ß" auf ein einzelnes „s" ab – wer
  // „strasse" tippt, hat aber zwei. Solche Fälle (ß, æ, œ) lassen sich nur
  // erkennen, wenn die Länge verändert werden darf. Dann stimmen die
  // Positionen nicht mehr mit dem Originaltext überein, weshalb hier bewusst
  // keine Trefferbereiche zurückkommen: lieber ohne Hervorhebung gefunden als
  // gar nicht gefunden – und lieber ohne Hervorhebung als mit einer falschen.
  const looseHaystack = foldForSearch(text);
  const looseNeedle = foldForSearch(trimmed).replace(/\s+/g, '');
  const loosePositions = matchPositions(looseHaystack, looseNeedle);
  if (loosePositions === null) return null;

  return {
    score: scorePositions(looseHaystack, looseNeedle, loosePositions) - PENALTY_LOOSE,
    ranges: [],
  };
}

/**
 * Sucht die Positionen der Eingabezeichen im Text.
 *
 * Zwei Durchgänge: Der erste findet überhaupt eine gültige Belegung, der
 * zweite schiebt jeden Treffer so weit nach hinten wie möglich. Ohne den
 * zweiten würde „ausf" in „Code ausführen" das „a" aus „Code" markieren.
 */
function matchPositions(haystack: string, needle: string): number[] | null {
  if (needle.length > haystack.length) return null;

  const positions: number[] = [];
  let cursor = 0;

  for (const char of needle) {
    const found = haystack.indexOf(char, cursor);
    if (found === -1) return null;
    positions.push(found);
    cursor = found + 1;
  }

  for (let i = positions.length - 2; i >= 0; i -= 1) {
    const next = positions[i + 1];
    const current = positions[i];
    const char = needle[i];
    if (next === undefined || current === undefined || char === undefined) continue;
    for (let candidate = next - 1; candidate > current; candidate -= 1) {
      if (haystack[candidate] === char) {
        positions[i] = candidate;
        break;
      }
    }
  }

  return positions;
}

function scorePositions(haystack: string, needle: string, positions: readonly number[]): number {
  let score = 0;
  let previous = -2;

  for (const position of positions) {
    score += SCORE_BASE;
    if (isWordStart(haystack, position)) score += SCORE_WORD_START;
    if (position === previous + 1) score += SCORE_CONSECUTIVE;
    else if (previous >= 0) {
      score -= Math.min((position - previous - 1) * PENALTY_GAP, PENALTY_GAP_MAX);
    }
    previous = position;
  }

  // Früher Beginn und hohe Abdeckung sind Qualitätsmerkmale.
  const first = positions[0] ?? 0;
  score += Math.max(0, 10 - first);
  score += Math.round((needle.length / haystack.length) * 10);

  return score;
}

function toRanges(positions: readonly number[]): MatchRange[] {
  const ranges: MatchRange[] = [];
  for (const position of positions) {
    const last = ranges[ranges.length - 1];
    if (last && last.end === position) last.end = position + 1;
    else ranges.push({ start: position, end: position + 1 });
  }
  return ranges;
}

export interface SearchableEntry {
  /** Wird angezeigt und durchsucht. */
  title: string;
  /** Zusätzlicher Suchtext, der nicht hervorgehoben wird (Kategorie, Stichwörter). */
  keywords?: string;
}

export interface RankedResult<T extends SearchableEntry> {
  item: T;
  score: number;
  ranges: MatchRange[];
}

/**
 * Bewertet und sortiert eine Liste.
 *
 * Der Titel zählt voll, Stichwörter nur mit halbem Gewicht: Ein Treffer im
 * sichtbaren Namen ist für die suchende Person nachvollziehbarer als einer in
 * unsichtbaren Zusatzangaben.
 */
export function rankEntries<T extends SearchableEntry>(
  entries: readonly T[],
  query: string,
  limit = 12,
): RankedResult<T>[] {
  const results: RankedResult<T>[] = [];

  for (const item of entries) {
    const titleMatch = fuzzyMatch(item.title, query);
    if (titleMatch) {
      results.push({ item, score: titleMatch.score, ranges: titleMatch.ranges });
      continue;
    }
    if (item.keywords) {
      const keywordMatch = fuzzyMatch(item.keywords, query);
      if (keywordMatch) {
        results.push({ item, score: Math.round(keywordMatch.score / 2), ranges: [] });
      }
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Bei Gleichstand entscheidet die kürzere Bezeichnung: Sie ist meist die
    // allgemeinere und damit wahrscheinlicher gemeinte.
    if (a.item.title.length !== b.item.title.length) {
      return a.item.title.length - b.item.title.length;
    }
    return a.item.title.localeCompare(b.item.title, 'de');
  });

  return results.slice(0, limit);
}

/**
 * Zerlegt einen Text anhand der Trefferbereiche in Abschnitte.
 * Die Oberfläche muss dadurch keine Indexrechnung anstellen.
 */
export function splitByRanges(
  text: string,
  ranges: readonly MatchRange[],
): Array<{ text: string; highlighted: boolean }> {
  if (ranges.length === 0) return [{ text, highlighted: false }];

  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push({ text: text.slice(cursor, range.start), highlighted: false });
    }
    parts.push({ text: text.slice(range.start, range.end), highlighted: true });
    cursor = range.end;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), highlighted: false });
  }

  return parts;
}
