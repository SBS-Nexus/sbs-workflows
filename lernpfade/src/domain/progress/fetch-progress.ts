import { normalizeSourceBaseUrl } from '../review/fetch-source.ts';
import { PROGRESS_SOURCES, type ProgressSource } from './contract.ts';

/**
 * Abruf einer Fortschrittsquelle aus dem Browser (LP-07) — dasselbe Muster wie
 * LP-05B (`../review/fetch-source.ts`): Der Browser fragt die App mit deren
 * EIGENER Sitzung an; der Hub-Server sieht weder Cookie noch Kennung, und der
 * Hub schickt nie eine `userId` mit — die Route kennt keinen einzigen
 * Abfrageparameter.
 *
 * Reine Logik mit eingespeistem `fetch`, ohne Browser prüfbar.
 */

/** Der einzige Pfad, den der Hub bei einer Quelle für Fortschritt anfragt. */
export const PROGRESS_SOURCE_PATH = '/api/platform/progress-source';

/** Nach dieser Zeit gilt eine Quelle als nicht verfügbar — unabhängig von den anderen. */
export const PROGRESS_SOURCE_TIMEOUT_MS = 5000;

export type ProgressEndpoint = {
  source: ProgressSource;
  /** Basisadresse der App; `null` = nicht verbunden. */
  baseUrl: string | null;
};

/** Ergebnis des Abrufs — bevor die Antwort geprüft wurde. */
export type ProgressFetchOutcome =
  | { source: ProgressSource; status: 'ok'; body: unknown }
  | { source: ProgressSource; status: 'unauthenticated' }
  | { source: ProgressSource; status: 'unavailable' }
  | { source: ProgressSource; status: 'not_configured' };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export function progressSourceUrl(baseUrl: string): string {
  return new URL(PROGRESS_SOURCE_PATH, baseUrl).toString();
}

/**
 * Fragt eine Quelle ab und übersetzt das Ergebnis in einen Zustand.
 *
 * - 200 mit JSON → `ok` (geprüft wird danach gegen den Vertrag)
 * - 401 → `unauthenticated` — nie „0 Fortschritt"
 * - alles andere, Zeitüberschreitung, Netzwerk-, CORS- oder JSON-Fehler → `unavailable`
 */
export async function fetchProgressSource(
  endpoint: ProgressEndpoint,
  fetchImpl: FetchLike,
  timeoutMs: number = PROGRESS_SOURCE_TIMEOUT_MS,
): Promise<ProgressFetchOutcome> {
  const baseUrl = normalizeSourceBaseUrl(endpoint.baseUrl);
  if (!baseUrl) return { source: endpoint.source, status: 'not_configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(progressSourceUrl(baseUrl), {
      method: 'GET',
      // Die Sitzung der QUELLE: Der Browser hängt ihr Cookie an, der Hub liest es nie.
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
 * Liest die ausdrücklich freigeschalteten Fortschrittsquellen aus einer Liste
 * wie `python,sql,ai`. Eigene Freischaltung, getrennt von LP-05B
 * (`NEXT_PUBLIC_REVIEW_FEDERATION_SOURCES`). Leer heißt: aus.
 */
export function parseProgressSources(value: string | undefined | null): ProgressSource[] {
  if (!value) return [];
  const wanted = new Set(value.split(',').map((part) => part.trim().toLowerCase()));
  return PROGRESS_SOURCES.filter((source) => wanted.has(source));
}
