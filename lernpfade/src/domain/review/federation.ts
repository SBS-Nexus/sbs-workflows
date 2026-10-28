import type { ReviewSourceItem, ReviewSourceKind } from './source';

/**
 * LP-05B — föderierte, schreibgeschützte Wiederholungsquellen.
 *
 * Python, SQL und AIPfad bleiben die Systeme der Wahrheit für ihren eigenen
 * Lern- und Planungsstand. Lernpfade sammelt nur ein, prüft, ordnet und zeigt
 * an. Nichts in diesem Modul schreibt irgendwohin zurück.
 *
 * ```text
 * Python source ─┐
 * SQL source ────┼──> Lernpfade federation ──> /wiederholen
 * AIPfad source ─┘
 * ```
 *
 * Das Modul ist reine Logik ohne Netzwerk, ohne Speicher und ohne React. Es
 * nimmt die rohen Antworten der Quellen entgegen und gibt eine geprüfte,
 * deterministisch sortierte Liste samt Zustand je Quelle zurück.
 */

/** Die Quellen, die in LP-05B live angebunden werden können. */
export const FEDERATED_SOURCES = ['python', 'sql', 'ai'] as const;
export type FederatedSource = (typeof FEDERATED_SOURCES)[number];

/**
 * Welche Identität eine Quelle liefern MUSS.
 *
 * Python und AIPfad planen je Aufgabe, SQLPfad je Konzept. Eine SQL-Antwort
 * mit `exercise`-Identität wäre kein harmloser Formatfehler, sondern die
 * Verflachung des SQL-Modells zu einer Aufgabenwarteschlange — sie wird
 * deshalb als ungültig abgewiesen, nicht umgedeutet.
 */
export const SOURCE_KIND_BY_SOURCE: Readonly<Record<FederatedSource, ReviewSourceKind>> = {
  python: 'exercise',
  sql: 'concept',
  ai: 'exercise',
};

/** Version des Leitungsformats. Eine andere Version gilt als ungültig. */
export const REVIEW_SOURCE_SCHEMA_VERSION = 1;

/**
 * Obergrenzen. Keine Lesung ist unbegrenzt.
 *
 * - `perSource`: so viele Einträge fordert der Hub je Quelle an. Eine Quelle,
 *   die mehr liefert, verletzt den Vertrag; ihre Antwort wird verworfen.
 * - `global`: so viele Einträge zeigt der Hub insgesamt, nach der Sortierung.
 */
export const REVIEW_FEDERATION_LIMITS = { perSource: 10, global: 25 } as const;

/** Längengrenzen für Text aus fremder Quelle. */
const MAX_ID_LENGTH = 200;
const MAX_TITLE_LENGTH = 300;
const MAX_TEXT_LENGTH = 4000;
const MAX_CONCEPTS = 50;

/** ISO-8601 in UTC, wie `Date.prototype.toISOString` es schreibt. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export type ReviewPractice = {
  /** Die Aufgabe, an der die Quelle den Eintrag üben lässt — reine Darstellung. */
  exerciseSlug: string;
  exerciseTitle: string;
};

/**
 * Ein geprüfter, namensraumgebundener Eintrag.
 *
 * Erweitert den LP-05A-Vertrag (`ReviewSourceItem`) um den kanonischen
 * Schlüssel, einen Titel und optionale Darstellungsangaben. Bei SQL ist
 * `practice` nur der Ausführungskontext — die Identität bleibt das Konzept.
 */
export type FederatedReviewItem = Omit<ReviewSourceItem, 'source'> & {
  source: FederatedSource;
  key: string;
  title: string;
  practice?: ReviewPractice;
};

/** Eine geprüfte Antwort einer Quelle. */
export type ReviewSourceBatch = {
  source: FederatedSource;
  generatedAt: string;
  items: FederatedReviewItem[];
  nextDueAt?: string;
  truncated: boolean;
};

/**
 * Was der Abruf einer Quelle ergab — bevor sie geprüft wurde.
 *
 * `unauthenticated` ist bewusst ein eigener Zustand: Eine fehlende Anmeldung
 * wird nie zu „keine fälligen Wiederholungen" heruntergestuft.
 */
export type SourceFetchOutcome =
  | { source: FederatedSource; status: 'ok'; body: unknown }
  | { source: FederatedSource; status: 'unauthenticated' }
  | { source: FederatedSource; status: 'unavailable' }
  | { source: FederatedSource; status: 'not_configured' };

export type SourceStatus = 'ok' | 'unauthenticated' | 'unavailable' | 'not_configured';

/** Zustand je Quelle, ohne interne Fehlerdetails. */
export type SourceHealth = {
  status: SourceStatus;
  itemCount: number;
  truncated: boolean;
  nextDueAt?: string;
};

export type FederatedReview = {
  items: FederatedReviewItem[];
  sources: Record<FederatedSource, SourceHealth>;
  /** `true`, wenn die globale Obergrenze Einträge abgeschnitten hat. */
  truncated: boolean;
};

/** Ungültige Antwort einer Quelle. Die Meldung ist intern, nie für die Oberfläche. */
export class ReviewSourceContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewSourceContractError';
  }
}

/** Kanonischer Schlüssel: `<source>:<sourceKind>:<sourceItemId>`. */
export function canonicalReviewKey(
  source: FederatedSource,
  sourceKind: ReviewSourceKind,
  sourceItemId: string,
): string {
  return `${source}:${sourceKind}:${sourceItemId}`;
}

export function isFederatedSource(value: unknown): value is FederatedSource {
  return typeof value === 'string' && (FEDERATED_SOURCES as readonly string[]).includes(value);
}

function fail(message: string): never {
  throw new ReviewSourceContractError(message);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') fail(`${field} must be a string`);
  const normalized = value.trim();
  if (!normalized) fail(`${field} must not be empty`);
  if (normalized.length > maxLength) fail(`${field} is too long`);
  return normalized;
}

/** Ein Zeitpunkt als ISO-8601 in UTC, der sich verlustfrei zurückschreiben lässt. */
export function isoTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string' || !ISO_UTC.test(value)) fail(`${field} must be ISO-8601 UTC`);
  const time = Date.parse(value);
  if (!Number.isFinite(time)) fail(`${field} is not a valid date`);
  const canonical = new Date(time).toISOString();
  // `2026-02-30T…` parst in manchen Laufzeiten zu einem anderen Tag; was sich
  // nicht unverändert zurückschreiben lässt, ist kein echter Zeitpunkt.
  if (canonical.slice(0, 19) !== value.slice(0, 19)) fail(`${field} is not a real date`);
  return canonical;
}

function optionalNonNegativeInt(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail(`${field} must be a non-negative integer`);
  }
  return value;
}

function parsePractice(value: unknown): ReviewPractice | undefined {
  if (value === undefined || value === null) return undefined;
  const practice = record(value, 'practice');
  return {
    exerciseSlug: text(practice.exerciseSlug, 'practice.exerciseSlug', MAX_ID_LENGTH),
    exerciseTitle: text(practice.exerciseTitle, 'practice.exerciseTitle', MAX_TITLE_LENGTH),
  };
}

function parseItem(value: unknown, source: FederatedSource, index: number): FederatedReviewItem {
  const raw = record(value, `items[${index}]`);
  const field = (name: string): string => `items[${index}].${name}`;

  if (raw.source !== source) fail(`${field('source')} does not match the batch source`);

  const expectedKind = SOURCE_KIND_BY_SOURCE[source];
  if (raw.sourceKind !== expectedKind) {
    fail(`${field('sourceKind')} must be ${expectedKind} for ${source}`);
  }

  const sourceItemId = text(raw.sourceItemId, field('sourceItemId'), MAX_ID_LENGTH);

  if (!Array.isArray(raw.conceptIds) || raw.conceptIds.length > MAX_CONCEPTS) {
    fail(`${field('conceptIds')} must be a bounded array`);
  }
  const conceptIds = raw.conceptIds.map((id, i) =>
    text(id, `${field('conceptIds')}[${i}]`, MAX_ID_LENGTH),
  );

  // Die SQL-Identität ist das Konzept selbst; ihre Konzeptliste muss es tragen.
  if (expectedKind === 'concept' && !conceptIds.includes(sourceItemId)) {
    fail(`${field('conceptIds')} must contain the concept identity`);
  }

  const reason = raw.reason === undefined ? undefined : text(raw.reason, field('reason'), MAX_TITLE_LENGTH);
  const repetition = optionalNonNegativeInt(raw.repetition, field('repetition'));
  const practice = parsePractice(raw.practice);

  return {
    key: canonicalReviewKey(source, expectedKind, sourceItemId),
    source,
    sourceKind: expectedKind,
    sourceItemId,
    pathSlug: source,
    conceptIds,
    title: text(raw.title, field('title'), MAX_TITLE_LENGTH),
    prompt: text(raw.prompt, field('prompt'), MAX_TEXT_LENGTH),
    answer: text(raw.answer, field('answer'), MAX_TEXT_LENGTH),
    dueAt: isoTimestamp(raw.dueAt, field('dueAt')),
    ...(repetition === undefined ? {} : { repetition }),
    ...(reason === undefined ? {} : { reason }),
    ...(practice === undefined ? {} : { practice }),
  };
}

/** Deterministische Ordnung: zuerst das älteste Fälligkeitsdatum, dann der Schlüssel. */
export function compareReviewItems(a: FederatedReviewItem, b: FederatedReviewItem): number {
  if (a.dueAt !== b.dueAt) return a.dueAt < b.dueAt ? -1 : 1;
  if (a.key === b.key) return 0;
  return a.key < b.key ? -1 : 1;
}

/**
 * Prüft die rohe Antwort einer Quelle gegen den Vertrag.
 *
 * Schlägt geschlossen fehl: Ein einziger ungültiger Eintrag verwirft die
 * ganze Antwort dieser Quelle. Lieber „SQL nicht verfügbar" als eine
 * Wiederholung mit erfundenem Datum oder fremder Identität.
 */
export function parseReviewSourceBatch(
  body: unknown,
  expectedSource: FederatedSource,
  requestedLimit: number = REVIEW_FEDERATION_LIMITS.perSource,
): ReviewSourceBatch {
  const raw = record(body, 'batch');

  if (raw.schemaVersion !== REVIEW_SOURCE_SCHEMA_VERSION) fail('unsupported schemaVersion');
  if (raw.source !== expectedSource) fail('batch source does not match the requested source');
  if (typeof raw.truncated !== 'boolean') fail('truncated must be a boolean');
  if (!Array.isArray(raw.items)) fail('items must be an array');
  if (raw.items.length > requestedLimit) fail('source returned more items than requested');

  const items = raw.items.map((item, index) => parseItem(item, expectedSource, index));

  const keys = new Set<string>();
  for (const item of items) {
    if (keys.has(item.key)) fail(`duplicate item ${item.key}`);
    keys.add(item.key);
  }

  const nextDueAt =
    raw.nextDueAt === undefined || raw.nextDueAt === null
      ? undefined
      : isoTimestamp(raw.nextDueAt, 'nextDueAt');

  return {
    source: expectedSource,
    generatedAt: isoTimestamp(raw.generatedAt, 'generatedAt'),
    items: [...items].sort(compareReviewItems),
    truncated: raw.truncated,
    ...(nextDueAt === undefined ? {} : { nextDueAt }),
  };
}

function emptyHealth(status: SourceStatus): SourceHealth {
  return { status, itemCount: 0, truncated: false };
}

/**
 * Führt die Antworten aller Quellen zusammen.
 *
 * validieren → Namensraum → zusammenführen → deterministisch sortieren →
 * global deckeln → Zustand je Quelle.
 *
 * Eine ausgefallene oder ungültige Quelle macht die übrigen nicht unbrauchbar.
 * Interne Fehlermeldungen bleiben hier; nach außen geht nur der Zustand.
 */
export function federateReviewSources(
  outcomes: readonly SourceFetchOutcome[],
  limits: { perSource: number; global: number } = REVIEW_FEDERATION_LIMITS,
): FederatedReview {
  if (!Number.isInteger(limits.perSource) || limits.perSource < 1) {
    throw new RangeError('perSource limit must be a positive integer');
  }
  if (!Number.isInteger(limits.global) || limits.global < 1) {
    throw new RangeError('global limit must be a positive integer');
  }

  const sources = Object.fromEntries(
    FEDERATED_SOURCES.map((source) => [source, emptyHealth('not_configured')]),
  ) as Record<FederatedSource, SourceHealth>;

  const seen = new Set<FederatedSource>();
  const merged: FederatedReviewItem[] = [];

  for (const outcome of outcomes) {
    if (!isFederatedSource(outcome.source)) continue;
    // Jede Quelle zählt einmal; eine doppelte Meldung ist ein Programmfehler.
    if (seen.has(outcome.source)) throw new Error(`duplicate outcome for ${outcome.source}`);
    seen.add(outcome.source);

    if (outcome.status !== 'ok') {
      sources[outcome.source] = emptyHealth(outcome.status);
      continue;
    }

    try {
      const batch = parseReviewSourceBatch(outcome.body, outcome.source, limits.perSource);
      merged.push(...batch.items);
      sources[outcome.source] = {
        status: 'ok',
        itemCount: batch.items.length,
        truncated: batch.truncated,
        ...(batch.nextDueAt === undefined ? {} : { nextDueAt: batch.nextDueAt }),
      };
    } catch (error) {
      if (!(error instanceof ReviewSourceContractError)) throw error;
      sources[outcome.source] = emptyHealth('unavailable');
    }
  }

  const sorted = merged.sort(compareReviewItems);
  return {
    items: sorted.slice(0, limits.global),
    sources,
    truncated: sorted.length > limits.global,
  };
}
