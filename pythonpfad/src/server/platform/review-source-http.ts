/**
 * LP-05B — schreibgeschützte Wiederholungsquelle für den Lernpfade-Hub.
 *
 * Diese Datei ist in PythonPfad, SQLPfad und AIPfad wortgleich vorhanden
 * (getrennte Bereitstellungen, kein gemeinsames Paket). Sie enthält nur
 * Vertrag, Prüfung und HTTP-Grenze — keinen Datenbankzugriff. Der Leser der
 * jeweiligen App steht in `src/server/services/platform-review-source.ts`.
 *
 * Sicherheitsgrenze:
 *  - Wessen Daten gelesen werden, entscheidet AUSSCHLIESSLICH die eigene
 *    Sitzung dieser App. Eine Kennung aus der Anfrage gibt es nicht; jeder
 *    andere Abfrageparameter als `limit` wird abgewiesen.
 *  - Nur GET. Kein Schreiben, kein Abschließen, kein Umplanen.
 *  - Antworten sind personenbezogen: `Cache-Control: private, no-store`.
 *  - CORS nur für genau EINE konfigurierte Hub-Origin. Ohne Konfiguration
 *    gibt es keine CORS-Kopfzeilen, und der Hub kann die Antwort nicht lesen.
 *  - Fehler verlassen den Server nur als fester Code, nie als Meldung.
 */

export type PlatformReviewSourceName = 'python' | 'sql' | 'ai';
export type PlatformReviewSourceKind = 'exercise' | 'concept';

export const REVIEW_SOURCE_SCHEMA_VERSION = 1;
export const REVIEW_SOURCE_DEFAULT_LIMIT = 10;
/** Höchstens so viele Einträge je Anfrage. Mehr wird abgewiesen, nicht gekürzt. */
export const REVIEW_SOURCE_MAX_LIMIT = 25;

const MAX_ID_LENGTH = 200;
const MAX_TITLE_LENGTH = 300;
const MAX_TEXT_LENGTH = 4000;
const MAX_CONCEPTS = 50;

export type PlatformReviewPractice = { exerciseSlug: string; exerciseTitle: string };

/** Ein Eintrag, wie ihn der Leser der App liefert — vor der Prüfung. */
export type PlatformReviewItemInput = {
  sourceKind: PlatformReviewSourceKind;
  sourceItemId: string;
  conceptIds: readonly string[];
  title: string;
  prompt: string;
  answer: string;
  dueAt: Date;
  repetition?: number;
  reason?: string;
  practice?: PlatformReviewPractice;
};

export type PlatformReviewWireItem = {
  source: PlatformReviewSourceName;
  sourceKind: PlatformReviewSourceKind;
  sourceItemId: string;
  conceptIds: string[];
  title: string;
  prompt: string;
  answer: string;
  dueAt: string;
  repetition?: number;
  reason?: string;
  practice?: PlatformReviewPractice;
};

export type PlatformReviewBatch = {
  schemaVersion: typeof REVIEW_SOURCE_SCHEMA_VERSION;
  source: PlatformReviewSourceName;
  generatedAt: string;
  items: PlatformReviewWireItem[];
  nextDueAt: string | null;
  truncated: boolean;
};

/** Ein Datensatz der eigenen Datenbank verletzt den Vertrag. Intern, nie nach außen. */
export class ReviewSourceIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewSourceIntegrityError';
  }
}

/** Anzeigetext: leer ist ein Fehler, überlang wird auf die Vertragsgrenze gekürzt. */
function requiredText(value: string, field: string, maxLength: number): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new ReviewSourceIntegrityError(`${field} must not be empty`);
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

/** Kennung: wird nie gekürzt — eine gekürzte Kennung wäre eine andere Identität. */
function requiredId(value: string, field: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new ReviewSourceIntegrityError(`${field} must not be empty`);
  if (normalized.length > MAX_ID_LENGTH)
    throw new ReviewSourceIntegrityError(`${field} is too long`);
  return normalized;
}

function iso(value: Date, field: string): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new ReviewSourceIntegrityError(`${field} must be a valid Date`);
  }
  return value.toISOString();
}

/**
 * Baut die Antwort und prüft sie dabei. Schlägt geschlossen fehl: Ein
 * ungültiger Datensatz verwirft die ganze Antwort.
 */
export function buildPlatformReviewBatch(
  source: PlatformReviewSourceName,
  input: {
    items: readonly PlatformReviewItemInput[];
    truncated: boolean;
    nextDueAt: Date | null;
    now: Date;
  },
): PlatformReviewBatch {
  const expectedKind: PlatformReviewSourceKind = source === 'sql' ? 'concept' : 'exercise';

  const items = input.items.map((item, index): PlatformReviewWireItem => {
    const field = (name: string): string => `items[${index}].${name}`;
    if (item.sourceKind !== expectedKind) {
      throw new ReviewSourceIntegrityError(`${field('sourceKind')} must be ${expectedKind}`);
    }
    const sourceItemId = requiredId(item.sourceItemId, field('sourceItemId'));
    if (item.conceptIds.length > MAX_CONCEPTS) {
      throw new ReviewSourceIntegrityError(`${field('conceptIds')} exceeds ${MAX_CONCEPTS}`);
    }
    const conceptIds = item.conceptIds.map((id, i) =>
      requiredId(id, `${field('conceptIds')}[${i}]`),
    );
    if (expectedKind === 'concept' && !conceptIds.includes(sourceItemId)) {
      throw new ReviewSourceIntegrityError(`${field('conceptIds')} must contain the concept`);
    }
    if (
      item.repetition !== undefined &&
      (!Number.isInteger(item.repetition) || item.repetition < 0)
    ) {
      throw new ReviewSourceIntegrityError(`${field('repetition')} must be a non-negative integer`);
    }

    return {
      source,
      sourceKind: expectedKind,
      sourceItemId,
      conceptIds,
      title: requiredText(item.title, field('title'), MAX_TITLE_LENGTH),
      prompt: requiredText(item.prompt, field('prompt'), MAX_TEXT_LENGTH),
      answer: requiredText(item.answer, field('answer'), MAX_TEXT_LENGTH),
      dueAt: iso(item.dueAt, field('dueAt')),
      ...(item.repetition === undefined ? {} : { repetition: item.repetition }),
      ...(item.reason === undefined
        ? {}
        : { reason: requiredText(item.reason, field('reason'), MAX_TITLE_LENGTH) }),
      ...(item.practice === undefined
        ? {}
        : {
            practice: {
              exerciseSlug: requiredId(item.practice.exerciseSlug, field('practice.exerciseSlug')),
              exerciseTitle: requiredText(
                item.practice.exerciseTitle,
                field('practice.exerciseTitle'),
                MAX_TITLE_LENGTH,
              ),
            },
          }),
    };
  });

  return {
    schemaVersion: REVIEW_SOURCE_SCHEMA_VERSION,
    source,
    generatedAt: iso(input.now, 'generatedAt'),
    items,
    nextDueAt: input.nextDueAt === null ? null : iso(input.nextDueAt, 'nextDueAt'),
    truncated: input.truncated,
  };
}

/**
 * Prüft eine Hub-Origin: `https://host[:port]`, für die lokale Entwicklung
 * auch `http://localhost[:port]`. Kein Pfad, kein Platzhalter, keine Liste.
 * Leer heißt: keine Föderation.
 */
export function isAllowedHubOriginSetting(value: string): boolean {
  if (value === '') return true;
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return false;
    return url.origin === value;
  } catch {
    return false;
  }
}

export type LimitResult = { ok: true; limit: number } | { ok: false };

/**
 * Nur `limit` ist erlaubt, als ganze Zahl von 1 bis zur Obergrenze. Alles
 * andere — insbesondere eine `userId` — wird abgewiesen, nicht ignoriert.
 */
export function parseReviewSourceQuery(url: URL): LimitResult {
  for (const key of url.searchParams.keys()) {
    if (key !== 'limit') return { ok: false };
  }
  const values = url.searchParams.getAll('limit');
  if (values.length === 0) return { ok: true, limit: REVIEW_SOURCE_DEFAULT_LIMIT };
  if (values.length > 1) return { ok: false };
  const raw = values[0] ?? '';
  if (!/^[1-9]\d{0,2}$/.test(raw)) return { ok: false };
  const limit = Number(raw);
  return limit <= REVIEW_SOURCE_MAX_LIMIT ? { ok: true, limit } : { ok: false };
}

export type ReviewSourceHandlerDeps = {
  source: PlatformReviewSourceName;
  /** Kennung der angemeldeten Person — allein aus der eigenen Sitzung. */
  resolveUserId: () => Promise<string | null>;
  readBatch: (userId: string, query: { limit: number; now: Date }) => Promise<PlatformReviewBatch>;
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
export async function handleReviewSourceRequest(
  request: Request,
  deps: ReviewSourceHandlerDeps,
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
    deps.onError?.('platform_review_source_config_failed', error);
    return json(500, { error: 'unavailable' }, headers);
  }

  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' }, headers);

  const query = parseReviewSourceQuery(new URL(request.url));
  if (!query.ok) return json(400, { error: 'invalid_request' }, headers);

  let userId: string | null;
  try {
    userId = await deps.resolveUserId();
  } catch (error) {
    deps.onError?.('platform_review_source_session_failed', error);
    return json(500, { error: 'unavailable' }, headers);
  }
  if (!userId) return json(401, { error: 'unauthenticated' }, headers);

  try {
    const batch = await deps.readBatch(userId, {
      limit: query.limit,
      now: deps.now ? deps.now() : new Date(),
    });
    if (batch.source !== deps.source || batch.items.length > query.limit) {
      throw new ReviewSourceIntegrityError('reader violated the batch contract');
    }
    return json(200, batch, headers);
  } catch (error) {
    deps.onError?.('platform_review_source_read_failed', error);
    return json(500, { error: 'unavailable' }, headers);
  }
}
