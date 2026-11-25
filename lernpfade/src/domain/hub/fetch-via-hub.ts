/**
 * E4.5c: Abruf der Plattformquellen über den eigenen Hub-Server.
 *
 * Mit dem gemeinsamen Konto fragt der Browser nicht mehr jede App selbst,
 * sondern einmal den eigenen Hub (gleiche Herkunft): `/api/hub/fortschritt`
 * oder `/api/hub/wiederholen`. Der Hub-Server ruft die Quellen mit seinem
 * Zugriffstoken ab und reicht Status und Antwort je Quelle unverändert durch;
 * geprüft wird danach wie bisher gegen den jeweiligen Vertrag.
 *
 * Ein einziger Abruf je Seite, weil das Aktualisieren des Zugriffstokens nur
 * einmal gleichzeitig laufen darf (ZITADEL gibt dabei ein neues
 * Aktualisierungstoken aus).
 *
 * Reine Logik mit eingespeistem `fetch`, ohne Browser prüfbar.
 */

export type HubQuellenErgebnis<S extends string> =
  | { source: S; status: 'ok'; body: unknown }
  | { source: S; status: 'unauthenticated' }
  | { source: S; status: 'unavailable' };

export type HubAbruf<S extends string> = {
  /**
   * Der Hub selbst kennt keine Sitzung (mehr), etwa weil die Person sich beim
   * Konto abgemeldet hat. Dann ist keine Quelle „nicht verbunden“, sondern die
   * Anmeldung im Hub abgelaufen; die Seite bietet die neue Anmeldung an.
   */
  abgemeldet: boolean;
  outcomes: HubQuellenErgebnis<S>[];
};

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export async function fetchSourcesViaHub<S extends string>(
  path: string,
  sources: readonly S[],
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<HubAbruf<S>> {
  const alle = (status: 'unauthenticated' | 'unavailable'): HubQuellenErgebnis<S>[] =>
    sources.map((source) => ({ source, status }));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(path, {
      method: 'GET',
      credentials: 'same-origin',
      mode: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (response.status === 401) return { abgemeldet: true, outcomes: alle('unauthenticated') };
    if (response.status !== 200) return { abgemeldet: false, outcomes: alle('unavailable') };
    const daten = (await response.json()) as {
      quellen?: Record<string, { status?: unknown; body?: unknown }>;
    };
    return {
      abgemeldet: false,
      outcomes: sources.map((source): HubQuellenErgebnis<S> => {
        const eintrag = daten.quellen?.[source];
        if (eintrag?.status === 200 && eintrag.body !== undefined) {
          return { source, status: 'ok', body: eintrag.body };
        }
        if (eintrag?.status === 401) return { source, status: 'unauthenticated' };
        return { source, status: 'unavailable' };
      }),
    };
  } catch {
    return { abgemeldet: false, outcomes: alle('unavailable') };
  } finally {
    clearTimeout(timer);
  }
}
