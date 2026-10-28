/**
 * LP-07 — schreibgeschützte Fortschrittsquelle für den Lernpfade-Hub.
 *
 * Diese Datei ist in PythonPfad, SQLPfad und AIPfad wortgleich vorhanden
 * (getrennte Bereitstellungen, kein gemeinsames Paket). Sie enthält nur
 * Vertrag, Prüfung und HTTP-Grenze — keinen Datenbankzugriff. Der Leser der
 * jeweiligen App steht in `src/server/services/platform-progress-source.ts`.
 *
 * Bewusst eine EIGENE Route neben `review-source`: Fortschritt und fällige
 * Wiederholungen sind verschiedene Verträge mit verschiedener Datenmenge.
 *
 * Sicherheitsgrenze (wie LP-05B):
 *  - Wessen Daten gelesen werden, entscheidet AUSSCHLIESSLICH die eigene
 *    Sitzung dieser App. Diese Route nimmt keinen einzigen Abfrageparameter
 *    an; jeder wird mit 400 abgewiesen — insbesondere eine `userId`.
 *  - Nur GET. Kein Schreiben.
 *  - Antworten sind personenbezogen: `Cache-Control: private, no-store`.
 *  - CORS nur für genau EINE konfigurierte Hub-Origin
 *    (`PLATFORM_HUB_ORIGIN`). Ohne Konfiguration keine CORS-Kopfzeilen.
 *  - Fehler verlassen den Server nur als fester Code, nie als Meldung.
 *
 * Datensparsamkeit: Die Antwort enthält nur aggregierte Zahlen, feste
 * Aufzählungswerte und einen Zeitstempel — keine Namen, keine Kennungen,
 * keine Titel, keine Inhalte, keine Rohwerte eines Kompetenzmodells.
 */

export type PlatformProgressSourceName = 'python' | 'sql' | 'ai';

export const PROGRESS_SOURCE_SCHEMA_VERSION = 1;

/**
 * Was „bereit" bei Konzepten bedeutet — quellspezifisch, nicht vergleichbar:
 *  - `prerequisite-ready`: PythonPfad/AIPfad, Kompetenzwert erfüllt die
 *    Voraussetzungsschwelle der App (`meetsPrerequisite`).
 *  - `all-assessable-tasks-last-passed`: SQLPfad, alle beurteilbaren Aufgaben
 *    des Konzepts saßen beim letzten Versuch (Stand „sitzt").
 */
export type ConceptCriterion = 'prerequisite-ready' | 'all-assessable-tasks-last-passed';

/**
 * Projektstand — quellspezifisch:
 *  - `accepted`: Projekte mit abgenommener Abgabe (PythonPfad).
 *  - `submitted`: abgegebene Projekte; SQLPfad nimmt nicht fachlich ab.
 *  - `unsupported`: Die App kennt keine Projekte (AIPfad).
 */
export type ProjectKind = 'accepted' | 'submitted' | 'unsupported';

export type PlatformProgressProjects =
  | { kind: 'accepted'; done: number; total: number }
  | { kind: 'submitted'; done: number; total: number }
  | { kind: 'unsupported' };

export type PlatformProgressSource = {
  schemaVersion: typeof PROGRESS_SOURCE_SCHEMA_VERSION;
  source: PlatformProgressSourceName;
  generatedAt: string;
  participation: { hasActivity: boolean };
  lessons: { completed: number; total: number };
  reviews: { due: number };
  concepts: { observed: number; ready: number; criterion: ConceptCriterion };
  activity: { lastActiveAt: string | null };
  projects: PlatformProgressProjects;
};

/** Was der Leser einer App liefert — vor der Prüfung. */
export type PlatformProgressInput = {
  lessons: { completed: number; total: number };
  /** Begonnene oder abgeschlossene Lektionen (auch zurückgezogene) — nur für `hasActivity`. */
  startedLessons: number;
  reviewsDue: number;
  concepts: { observed: number; ready: number };
  lastActiveAt: Date | null;
  /** `null`, wenn die App keine Projekte kennt. */
  projects: { done: number; total: number } | null;
};

export const CONCEPT_CRITERION_BY_SOURCE: Readonly<
  Record<PlatformProgressSourceName, ConceptCriterion>
> = {
  python: 'prerequisite-ready',
  sql: 'all-assessable-tasks-last-passed',
  ai: 'prerequisite-ready',
};

export const PROJECT_KIND_BY_SOURCE: Readonly<Record<PlatformProgressSourceName, ProjectKind>> = {
  python: 'accepted',
  sql: 'submitted',
  ai: 'unsupported',
};

/** Ein Datensatz der eigenen Datenbank verletzt den Vertrag. Intern, nie nach außen. */
export class ProgressSourceIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgressSourceIntegrityError';
  }
}

function count(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ProgressSourceIntegrityError(`${field} must be a non-negative integer`);
  }
  return value;
}

function iso(value: Date, field: string): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new ProgressSourceIntegrityError(`${field} must be a valid Date`);
  }
  return value.toISOString();
}

/**
 * Baut die Antwort und prüft sie dabei. Schlägt geschlossen fehl: Ein
 * widersprüchlicher Wert verwirft die ganze Antwort.
 */
export function buildPlatformProgressSource(
  source: PlatformProgressSourceName,
  input: PlatformProgressInput,
  now: Date,
): PlatformProgressSource {
  const completed = count(input.lessons.completed, 'lessons.completed');
  const total = count(input.lessons.total, 'lessons.total');
  if (completed > total) throw new ProgressSourceIntegrityError('lessons.completed exceeds total');

  const observed = count(input.concepts.observed, 'concepts.observed');
  const ready = count(input.concepts.ready, 'concepts.ready');
  if (ready > observed) throw new ProgressSourceIntegrityError('concepts.ready exceeds observed');

  const due = count(input.reviewsDue, 'reviews.due');
  const startedLessons = count(input.startedLessons, 'startedLessons');
  const lastActiveAt = input.lastActiveAt === null ? null : iso(input.lastActiveAt, 'lastActiveAt');

  const kind = PROJECT_KIND_BY_SOURCE[source];
  let projects: PlatformProgressProjects;
  if (kind === 'unsupported') {
    if (input.projects !== null)
      throw new ProgressSourceIntegrityError(`${source} has no projects`);
    projects = { kind };
  } else {
    if (input.projects === null)
      throw new ProgressSourceIntegrityError(`${source} must report projects`);
    const done = count(input.projects.done, 'projects.done');
    const projectTotal = count(input.projects.total, 'projects.total');
    if (done > projectTotal) throw new ProgressSourceIntegrityError('projects.done exceeds total');
    projects = { kind, done, total: projectTotal };
  }

  const hasActivity =
    lastActiveAt !== null ||
    startedLessons > 0 ||
    completed > 0 ||
    observed > 0 ||
    (projects.kind !== 'unsupported' && projects.done > 0);

  return {
    schemaVersion: PROGRESS_SOURCE_SCHEMA_VERSION,
    source,
    generatedAt: iso(now, 'generatedAt'),
    participation: { hasActivity },
    lessons: { completed, total },
    reviews: { due },
    concepts: { observed, ready, criterion: CONCEPT_CRITERION_BY_SOURCE[source] },
    activity: { lastActiveAt },
    projects,
  };
}

/** Diese Route kennt keinen Abfrageparameter. Jeder — auch ein leerer — wird abgewiesen. */
export function isValidProgressSourceQuery(url: URL): boolean {
  return url.search === '';
}

/** Der späteste von mehreren optionalen Zeitpunkten, oder `null`. */
export function latestDate(...values: ReadonlyArray<Date | null | undefined>): Date | null {
  let latest: Date | null = null;
  for (const value of values) {
    if (value instanceof Date && Number.isFinite(value.getTime()) && (!latest || value > latest)) {
      latest = value;
    }
  }
  return latest;
}

export type ProgressSourceHandlerDeps = {
  source: PlatformProgressSourceName;
  /** Kennung der angemeldeten Person — allein aus der eigenen Sitzung. */
  resolveUserId: () => Promise<string | null>;
  readProgress: (userId: string, query: { now: Date }) => Promise<PlatformProgressSource>;
  /** Konfigurierte Hub-Origin; leer = keine CORS-Freigabe. */
  hubOrigin: () => string;
  now?: () => Date;
  onError?: (event: string, error: unknown) => void;
};

function baseHeaders(): Headers {
  return new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    // Personenbezogen: in keinem geteilten Zwischenspeicher, auch nicht im Browser.
    'Cache-Control': 'private, no-store, max-age=0',
    // Die Antwort hängt an Sitzung und Herkunft.
    Vary: 'Origin, Cookie',
    'X-Content-Type-Options': 'nosniff',
  });
}

function json(status: number, body: unknown, headers: Headers): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Die HTTP-Grenze. Alle Antworten — auch 400/401/500 — tragen dieselben
 * Cache- und (bei passender Herkunft) CORS-Kopfzeilen, damit der Hub
 * „nicht angemeldet" von „nicht erreichbar" unterscheiden kann.
 */
export async function handleProgressSourceRequest(
  request: Request,
  deps: ProgressSourceHandlerDeps,
): Promise<Response> {
  const headers = baseHeaders();

  try {
    const hubOrigin = deps.hubOrigin();
    const origin = request.headers.get('origin');
    if (hubOrigin !== '' && origin === hubOrigin) {
      headers.set('Access-Control-Allow-Origin', hubOrigin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
  } catch (error) {
    deps.onError?.('platform_progress_source_config_failed', error);
    return json(500, { error: 'unavailable' }, headers);
  }

  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' }, headers);

  if (!isValidProgressSourceQuery(new URL(request.url))) {
    return json(400, { error: 'invalid_request' }, headers);
  }

  let userId: string | null;
  try {
    userId = await deps.resolveUserId();
  } catch (error) {
    deps.onError?.('platform_progress_source_session_failed', error);
    return json(500, { error: 'unavailable' }, headers);
  }
  if (!userId) return json(401, { error: 'unauthenticated' }, headers);

  try {
    const progress = await deps.readProgress(userId, { now: deps.now ? deps.now() : new Date() });
    if (
      progress.source !== deps.source ||
      progress.schemaVersion !== PROGRESS_SOURCE_SCHEMA_VERSION
    ) {
      throw new ProgressSourceIntegrityError('reader violated the progress contract');
    }
    return json(200, progress, headers);
  } catch (error) {
    deps.onError?.('platform_progress_source_read_failed', error);
    return json(500, { error: 'unavailable' }, headers);
  }
}
