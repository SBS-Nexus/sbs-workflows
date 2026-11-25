/**
 * E5.2 — Team-Quelle für die Lernpfade-Plattform (docs/E5-PLAN.md).
 *
 * Diese Datei ist in PythonPfad, SQLPfad und AIPfad wortgleich
 * (scripts/check-platform-sources.mjs). Sie ist die HTTP-Grenze und der
 * Vertrag: Die Plattform schickt die Mitglieder eines Teams (`sub` aus dem
 * gemeinsamen Konto) und je Person, ob sie ihren Stand namentlich zeigt. Die
 * App rechnet selbst zusammen und gibt heraus:
 *
 *  - Summen nur, wenn die App mindestens drei der Personen kennt; sonst wären
 *    es Aussagen über Einzelne.
 *  - Einzelwerte nur für Personen, die die Plattform als „benannt“ meldet:
 *    Lektionen, fällige Wiederholungen und der Tag der letzten Aktivität.
 *  - Nie Versuche, Zeiten, Fehlermeldungen, Code oder Kompetenzwerte.
 *
 * Nur POST mit dem Diensttoken der Plattform (`istPlattformDienst`); ein
 * Personentoken oder eine Sitzung öffnet nichts. Keine CORS-Freigabe: Der
 * Aufruf kommt nur vom Server der Plattform.
 */

import type { PlatformProgressSource } from './progress-source-http';

export type PlatformTeamSourceName = 'python' | 'sql' | 'ai';

export const TEAM_SOURCE_SCHEMA_VERSION = 1;
/** Höchstens so viele Personen je Anfrage. */
export const TEAM_SOURCE_MAX_MITGLIEDER = 500;
/** Summen erst ab so vielen Personen, die die App kennt. */
export const TEAM_SOURCE_SUMMEN_AB = 3;
/** Größe des Anfragekörpers in Bytes. */
const MAX_KOERPER = 64 * 1024;

export type TeamAnfrage = {
  schemaVersion: typeof TEAM_SOURCE_SCHEMA_VERSION;
  mitglieder: Array<{ sub: string; benannt: boolean }>;
};

export type TeamSummen = {
  /** Personen, die die App kennt (dort schon über das Konto angemeldet). */
  personen: number;
  /** Davon mit Lernaktivität. */
  aktiv: number;
  lektionen: { abgeschlossen: number; jePerson: number };
  wiederholungenFaellig: number;
};

export type TeamBenannt = {
  sub: string;
  lektionen: { completed: number; total: number };
  wiederholungenFaellig: number;
  /** Tag der letzten Aktivität (Europe/Berlin), ohne Uhrzeit. */
  letzteAktivitaet: string | null;
};

export type PlatformTeamSource = {
  schemaVersion: typeof TEAM_SOURCE_SCHEMA_VERSION;
  source: PlatformTeamSourceName;
  generatedAt: string;
  angefragt: number;
  bekannt: number;
  summen: TeamSummen | null;
  benannt: TeamBenannt[];
};

const SUB = /^[A-Za-z0-9_-]{1,200}$/;

/** Streng: genau diese Felder, eindeutige `sub`, höchstens 500 Personen. */
export function parseTeamAnfrage(koerper: unknown): TeamAnfrage | null {
  if (typeof koerper !== 'object' || koerper === null || Array.isArray(koerper)) return null;
  const k = koerper as Record<string, unknown>;
  if (Object.keys(k).sort().join(',') !== 'mitglieder,schemaVersion') return null;
  if (k.schemaVersion !== TEAM_SOURCE_SCHEMA_VERSION || !Array.isArray(k.mitglieder)) return null;
  if (k.mitglieder.length > TEAM_SOURCE_MAX_MITGLIEDER) return null;
  const gesehen = new Set<string>();
  const mitglieder: TeamAnfrage['mitglieder'] = [];
  for (const m of k.mitglieder as unknown[]) {
    if (typeof m !== 'object' || m === null || Array.isArray(m)) return null;
    const e = m as Record<string, unknown>;
    if (Object.keys(e).sort().join(',') !== 'benannt,sub') return null;
    if (typeof e.sub !== 'string' || !SUB.test(e.sub) || typeof e.benannt !== 'boolean')
      return null;
    if (gesehen.has(e.sub)) return null;
    gesehen.add(e.sub);
    mitglieder.push({ sub: e.sub, benannt: e.benannt });
  }
  return { schemaVersion: TEAM_SOURCE_SCHEMA_VERSION, mitglieder };
}

const TAG = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Nur der Tag, nie die Uhrzeit. */
export function tagAus(iso: string | null): string | null {
  if (!iso) return null;
  const datum = new Date(iso);
  return Number.isNaN(datum.getTime()) ? null : TAG.format(datum);
}

/**
 * Rechnet aus den Ständen der bekannten Personen die Antwort. `staende`
 * enthält nur Personen, die die App kennt (über `sub`).
 */
export function buildTeamSource(
  source: PlatformTeamSourceName,
  anfrage: TeamAnfrage,
  staende: ReadonlyMap<string, PlatformProgressSource>,
  now: Date,
): PlatformTeamSource {
  const bekannt = anfrage.mitglieder.filter((m) => staende.has(m.sub));
  const alle = bekannt.map((m) => staende.get(m.sub)!);
  const summen: TeamSummen | null =
    alle.length >= TEAM_SOURCE_SUMMEN_AB
      ? {
          personen: alle.length,
          aktiv: alle.filter((s) => s.participation.hasActivity).length,
          lektionen: {
            abgeschlossen: alle.reduce((summe, s) => summe + s.lessons.completed, 0),
            jePerson: Math.max(...alle.map((s) => s.lessons.total)),
          },
          wiederholungenFaellig: alle.reduce((summe, s) => summe + s.reviews.due, 0),
        }
      : null;
  return {
    schemaVersion: TEAM_SOURCE_SCHEMA_VERSION,
    source,
    generatedAt: now.toISOString(),
    angefragt: anfrage.mitglieder.length,
    bekannt: bekannt.length,
    summen,
    benannt: bekannt
      .filter((m) => m.benannt)
      .map((m) => {
        const s = staende.get(m.sub)!;
        return {
          sub: m.sub,
          lektionen: { completed: s.lessons.completed, total: s.lessons.total },
          wiederholungenFaellig: s.reviews.due,
          letzteAktivitaet: tagAus(s.activity.lastActiveAt),
        };
      }),
  };
}

export type TeamSourceHandlerDeps = {
  source: PlatformTeamSourceName;
  /** Prüft das Diensttoken der Plattform. */
  istDienst: (request: Request) => Promise<boolean>;
  /** Stand je bekannter Person, nach `sub`. Unbekannte fehlen in der Map. */
  readTeam: (
    subs: readonly string[],
    query: { now: Date },
  ) => Promise<Map<string, PlatformProgressSource>>;
  now?: () => Date;
  onError?: (event: string, error: unknown) => void;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function handleTeamSourceRequest(
  request: Request,
  deps: TeamSourceHandlerDeps,
): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let erlaubt: boolean;
  try {
    erlaubt = await deps.istDienst(request);
  } catch (error) {
    deps.onError?.('platform_team_source_auth_failed', error);
    return json(500, { error: 'unavailable' });
  }
  if (!erlaubt) return json(401, { error: 'unauthenticated' });

  let anfrage: TeamAnfrage | null = null;
  try {
    const text = await request.text();
    if (text.length > MAX_KOERPER) return json(413, { error: 'too_large' });
    anfrage = parseTeamAnfrage(JSON.parse(text));
  } catch {
    anfrage = null;
  }
  if (!anfrage) return json(400, { error: 'invalid_request' });

  try {
    const now = deps.now ? deps.now() : new Date();
    const staende = await deps.readTeam(
      anfrage.mitglieder.map((m) => m.sub),
      { now },
    );
    return json(200, buildTeamSource(deps.source, anfrage, staende, now));
  } catch (error) {
    deps.onError?.('platform_team_source_read_failed', error);
    return json(500, { error: 'unavailable' });
  }
}
