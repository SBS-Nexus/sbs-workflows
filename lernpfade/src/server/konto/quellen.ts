/**
 * E4.5c: Der Hub-Server fragt die schreibgeschützten Plattformquellen der
 * Apps mit seinem Zugriffstoken ab (`Authorization: Bearer`, von den Apps
 * geprüft, E4.5a). Alle Quellen parallel; eine langsame oder ausgefallene
 * Quelle hält die anderen nicht auf.
 *
 * Weitergereicht wird je Quelle nur der Status und bei 200 die Antwort. Eine
 * Fehlermeldung der App erreicht den Browser nie. Geprüft wird die Antwort im
 * Browser gegen den jeweiligen Vertrag.
 *
 * Reine Logik mit eingespeistem `fetch`, ohne Next prüfbar.
 */

export type QuellenZiel<S extends string> = {
  quelle: S;
  /** Vollständige Adresse der Plattformquelle; `null` = App nicht konfiguriert. */
  adresse: string | null;
};

/** 200 mit Antwort, 401 = App kennt die Person nicht, 404 = nicht konfiguriert, 503 = nicht erreichbar. */
export type QuellenStatus = { status: 200; body: unknown } | { status: 401 | 404 | 503 };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export async function frageQuellenAb<S extends string>(
  ziele: readonly QuellenZiel<S>[],
  token: string,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<Record<S, QuellenStatus>> {
  const eintraege = await Promise.all(
    ziele.map(async ({ quelle, adresse }): Promise<[S, QuellenStatus]> => {
      if (!adresse) return [quelle, { status: 404 }];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const antwort = await fetchImpl(adresse, {
          method: 'GET',
          headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
          cache: 'no-store',
          // Eine Weiterleitung (etwa auf eine Anmeldeseite) ist keine Antwort.
          redirect: 'error',
          signal: controller.signal,
        });
        const typ = antwort.headers.get('content-type') ?? '';
        if (antwort.status === 200 && typ.toLowerCase().startsWith('application/json')) {
          return [quelle, { status: 200, body: (await antwort.json()) as unknown }];
        }
        return [quelle, { status: antwort.status === 401 ? 401 : 503 }];
      } catch {
        return [quelle, { status: 503 }];
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  return Object.fromEntries(eintraege) as Record<S, QuellenStatus>;
}

/**
 * Felder für eine Protokollzeile je Abruf: nur Status je Quelle und Dauer,
 * keine Kennung der Person, kein Token, keine Inhalte.
 */
export function quellenProtokoll<S extends string>(
  ergebnis: Readonly<Record<S, QuellenStatus>>,
): Record<S, number> {
  return Object.fromEntries(
    Object.entries<QuellenStatus>(ergebnis).map(([quelle, eintrag]) => [quelle, eintrag.status]),
  ) as Record<S, number>;
}
