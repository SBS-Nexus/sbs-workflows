import { isoTimestamp, ReviewSourceContractError } from '../review/federation.ts';

/**
 * LP-07 — Vertrag der schreibgeschützten Fortschrittsquellen (Schema 1).
 *
 * PythonPfad, SQLPfad und AIPfad liefern je `GET /api/platform/progress-source`
 * einen kleinen, aggregierten Stand der angemeldeten Person. Dieses Modul
 * prüft ihn streng — unbekannte Felder, unbekannte Versionen, unechte Zahlen
 * und widersprüchliche Werte machen die ganze Antwort ungültig. Lieber
 * „SQL derzeit nicht verfügbar" als ein erfundener Fortschritt.
 *
 * Bewusst NICHT vereinheitlicht: Was „bereit" bei Konzepten und „erledigt" bei
 * Projekten bedeutet, ist je Quelle fest vorgegeben und wird geprüft
 * (`CONCEPT_CRITERION_BY_SOURCE`, `PROJECT_KIND_BY_SOURCE`). Eine Quelle, die
 * eine fremde Semantik behauptet, ist ungültig.
 */

export const PROGRESS_SOURCES = ['python', 'sql', 'ai'] as const;
export type ProgressSource = (typeof PROGRESS_SOURCES)[number];

export const PROGRESS_SOURCE_SCHEMA_VERSION = 1;

/** Obergrenze für jeden Zähler — weit über jedem echten Bestand, schützt vor Unsinn. */
export const MAX_PROGRESS_COUNT = 1_000_000;

export type ConceptCriterion = 'prerequisite-ready' | 'all-assessable-tasks-last-passed';
export type ProjectKind = 'accepted' | 'submitted' | 'unsupported';

export const CONCEPT_CRITERION_BY_SOURCE: Readonly<Record<ProgressSource, ConceptCriterion>> = {
  python: 'prerequisite-ready',
  sql: 'all-assessable-tasks-last-passed',
  ai: 'prerequisite-ready',
};

export const PROJECT_KIND_BY_SOURCE: Readonly<Record<ProgressSource, ProjectKind>> = {
  python: 'accepted',
  sql: 'submitted',
  ai: 'unsupported',
};

export type ProgressProjects =
  | { kind: 'accepted'; done: number; total: number }
  | { kind: 'submitted'; done: number; total: number }
  | { kind: 'unsupported' };

/** Ein geprüfter Stand genau einer Quelle. */
export type SourceProgress = {
  source: ProgressSource;
  generatedAt: string;
  hasActivity: boolean;
  lessons: { completed: number; total: number };
  reviewsDue: number;
  concepts: { observed: number; ready: number; criterion: ConceptCriterion };
  lastActiveAt: string | null;
  projects: ProgressProjects;
};

/** Ungültige Antwort einer Quelle. Die Meldung ist intern, nie für die Oberfläche. */
export class ProgressContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgressContractError';
  }
}

function fail(message: string): never {
  throw new ProgressContractError(message);
}

export function isProgressSource(value: unknown): value is ProgressSource {
  return typeof value === 'string' && (PROGRESS_SOURCES as readonly string[]).includes(value);
}

/** Ein Objekt mit genau diesen eigenen Schlüsseln — keine fehlenden, keine zusätzlichen. */
function exact(value: unknown, keys: readonly string[], field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${field} must be an object`);
  if (Object.getPrototypeOf(value) !== Object.prototype) fail(`${field} must be a plain object`);
  const own = Object.keys(value);
  if (own.length !== keys.length || !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) {
    fail(`${field} has missing or unexpected fields`);
  }
  return value as Record<string, unknown>;
}

function count(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > MAX_PROGRESS_COUNT) {
    fail(`${field} must be a bounded non-negative integer`);
  }
  return value;
}

function timestamp(value: unknown, field: string): string {
  try {
    return isoTimestamp(value, field);
  } catch (error) {
    if (error instanceof ReviewSourceContractError) fail(error.message);
    throw error;
  }
}

function parseProjects(value: unknown, source: ProgressSource): ProgressProjects {
  const expected = PROJECT_KIND_BY_SOURCE[source];
  if (expected === 'unsupported') {
    const raw = exact(value, ['kind'], 'projects');
    if (raw.kind !== 'unsupported') fail(`projects.kind must be unsupported for ${source}`);
    return { kind: 'unsupported' };
  }
  const raw = exact(value, ['kind', 'done', 'total'], 'projects');
  if (raw.kind !== expected) fail(`projects.kind must be ${expected} for ${source}`);
  const done = count(raw.done, 'projects.done');
  const total = count(raw.total, 'projects.total');
  if (done > total) fail('projects.done exceeds total');
  return { kind: expected, done, total };
}

/**
 * Prüft die rohe Antwort einer Quelle gegen Schema 1.
 *
 * Schlägt geschlossen fehl. Geprüft werden: genau die erlaubten Felder auf
 * jeder Ebene, Version, Quelle, quellspezifische Semantik, endliche
 * nichtnegative Ganzzahlen, `completed ≤ total`, `ready ≤ observed`,
 * `done ≤ total`, echte ISO-Zeitpunkte — und dass „keine Aktivität" nicht
 * neben vorhandenen Belegen behauptet wird.
 */
export function parseSourceProgress(body: unknown, expectedSource: ProgressSource): SourceProgress {
  const raw = exact(
    body,
    ['schemaVersion', 'source', 'generatedAt', 'participation', 'lessons', 'reviews', 'concepts', 'activity', 'projects'],
    'progress',
  );

  if (raw.schemaVersion !== PROGRESS_SOURCE_SCHEMA_VERSION) fail('unsupported schemaVersion');
  if (raw.source !== expectedSource) fail('source does not match the requested source');

  const participation = exact(raw.participation, ['hasActivity'], 'participation');
  if (typeof participation.hasActivity !== 'boolean') fail('participation.hasActivity must be a boolean');

  const lessons = exact(raw.lessons, ['completed', 'total'], 'lessons');
  const completed = count(lessons.completed, 'lessons.completed');
  const total = count(lessons.total, 'lessons.total');
  if (completed > total) fail('lessons.completed exceeds total');

  const reviews = exact(raw.reviews, ['due'], 'reviews');
  const reviewsDue = count(reviews.due, 'reviews.due');

  const concepts = exact(raw.concepts, ['observed', 'ready', 'criterion'], 'concepts');
  const observed = count(concepts.observed, 'concepts.observed');
  const ready = count(concepts.ready, 'concepts.ready');
  if (ready > observed) fail('concepts.ready exceeds observed');
  const criterion = CONCEPT_CRITERION_BY_SOURCE[expectedSource];
  if (concepts.criterion !== criterion) fail(`concepts.criterion must be ${criterion} for ${expectedSource}`);

  const activity = exact(raw.activity, ['lastActiveAt'], 'activity');
  const lastActiveAt = activity.lastActiveAt === null ? null : timestamp(activity.lastActiveAt, 'activity.lastActiveAt');

  const projects = parseProjects(raw.projects, expectedSource);

  const hasActivity = participation.hasActivity;
  const evidence =
    completed > 0 || observed > 0 || lastActiveAt !== null || (projects.kind !== 'unsupported' && projects.done > 0);
  if (!hasActivity && evidence) fail('participation.hasActivity contradicts the reported evidence');

  return {
    source: expectedSource,
    generatedAt: timestamp(raw.generatedAt, 'generatedAt'),
    hasActivity,
    lessons: { completed, total },
    reviewsDue,
    concepts: { observed, ready, criterion },
    lastActiveAt,
    projects,
  };
}
