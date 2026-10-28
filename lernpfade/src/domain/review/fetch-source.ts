import type { FederatedSource, SourceFetchOutcome } from './federation';

const KNOWN_SOURCES: readonly FederatedSource[] = ['python', 'sql', 'ai'];

/**
 * Abruf einer Wiederholungsquelle aus dem Browser (LP-05B).
 *
 * Warum aus dem Browser und nicht vom Hub-Server: Der Hub hat keine Konten,
 * keine Datenbank und keine Geheimnisse. Das Sitzungscookie jeder App gehört
 * nur dieser App (host-only, `httpOnly`, `SameSite=Lax`); der Hub-Server sieht
 * es nie und soll es nie sehen. Nur der Browser kann die Anfrage mit der
 * eigenen Sitzung der Quelle stellen — und die Quelle leitet die Person
 * daraus serverseitig ab. Eine `userId` schickt der Hub nie mit.
 *
 * Diese Datei ist reine Logik mit eingespeistem `fetch`, damit sie ohne
 * Browser prüfbar bleibt.
 */

/** Der einzige Pfad, den der Hub bei einer Quelle anfragt. */
export const REVIEW_SOURCE_PATH = '/api/platform/review-source';

/** Nach dieser Zeit gilt eine Quelle als nicht verfügbar. */
export const REVIEW_SOURCE_TIMEOUT_MS = 5000;

export type SourceEndpoint = {
  source: FederatedSource;
  /** Basisadresse der App, etwa `https://python.example.org`. `null` = nicht verbunden. */
  baseUrl: string | null;
};

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Nur http(s)-Origins ohne Pfad, Abfrage, Fragment oder Zugangsdaten. */
export function normalizeSourceBaseUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== '/' && url.pathname !== '') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function reviewSourceUrl(baseUrl: string, limit: number): string {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  const url = new URL(REVIEW_SOURCE_PATH, baseUrl);
  url.searchParams.set('limit', String(limit));
  return url.toString();
}

/**
 * Fragt eine Quelle ab und übersetzt das Ergebnis in einen Zustand.
 *
 * - 200 mit JSON → `ok` (geprüft wird später in der Föderation)
 * - 401 → `unauthenticated`
 * - alles andere, Zeitüberschreitung, Netzwerk- oder CORS-Fehler → `unavailable`
 *
 * Weitergereicht wird nie eine Fehlermeldung, nur der Zustand.
 */
export async function fetchReviewSource(
  endpoint: SourceEndpoint,
  limit: number,
  fetchImpl: FetchLike,
  timeoutMs: number = REVIEW_SOURCE_TIMEOUT_MS,
): Promise<SourceFetchOutcome> {
  const baseUrl = normalizeSourceBaseUrl(endpoint.baseUrl);
  if (!baseUrl) return { source: endpoint.source, status: 'not_configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(reviewSourceUrl(baseUrl, limit), {
      method: 'GET',
      // Die Sitzung der QUELLE, nicht des Hubs: Das Cookie bleibt host-only
      // bei der App; der Browser hängt es an, der Hub liest es nie.
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store',
      // Eine Weiterleitung (etwa auf eine Anmeldeseite) ist keine Antwort.
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (response.status === 401) return { source: endpoint.source, status: 'unauthenticated' };
    if (response.status !== 200) return { source: endpoint.source, status: 'unavailable' };

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      return { source: endpoint.source, status: 'unavailable' };
    }

    return { source: endpoint.source, status: 'ok', body: (await response.json()) as unknown };
  } catch {
    return { source: endpoint.source, status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Liest die ausdrücklich freigeschalteten Live-Quellen aus einer Liste wie
 * `python,sql,ai`. Unbekannte Einträge fallen weg; leer heißt: keine
 * Live-Quelle, nur das Demo-Deck. Reihenfolge und Doppelungen spielen keine
 * Rolle.
 */
export function parseEnabledSources(value: string | undefined | null): FederatedSource[] {
  if (!value) return [];
  const wanted = new Set(value.split(',').map((part) => part.trim().toLowerCase()));
  return KNOWN_SOURCES.filter((source) => wanted.has(source));
}
