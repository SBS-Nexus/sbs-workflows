import type { Person } from '../../domain/organisation/regeln.ts';
import {
  pruefeTeamQuelle,
  TEAM_SOURCE_SCHEMA_VERSION,
  TEAM_SOURCES,
  type TeamQuelle,
  type TeamSourceName,
} from '../../domain/team/contract.ts';
import { protokoll } from '../konto/protokoll.ts';
import { verlange, type Db, type OrgKontext } from './dienst.ts';

/**
 * E5.2 — Stand eines Teams über alle Pfade (docs/E5-PLAN.md, Abschnitt 4).
 *
 * Der Hub schickt jeder App die Mitglieder des Teams (`sub`) und je Person,
 * ob sie eingewilligt hat. Die App rechnet selbst zusammen; der Hub prüft die
 * Antwort streng (`pruefeTeamQuelle`) und ordnet Namen nur den Personen zu,
 * die eingewilligt haben.
 */

export const TEAM_SOURCE_PATH = '/api/platform/team-source';
const FRIST_MS = 8000;

export type QuellenStand =
  | { status: 'ok'; quelle: TeamQuelle }
  | { status: 'nicht-eingerichtet' | 'nicht-erreichbar' | 'ungueltig' };

export type TeamStand = {
  personen: Array<{ sub: string; name: string; freigabe: boolean }>;
  quellen: Record<TeamSourceName, QuellenStand>;
};

type FetchLike = (adresse: string, init: RequestInit) => Promise<Response>;

/** Reiner Abruf einer Quelle: für Tests mit eingespeistem `fetch`. */
export async function frageTeamQuelleAb(
  quelle: TeamSourceName,
  basis: string | null,
  token: string,
  mitglieder: ReadonlyArray<{ sub: string; benannt: boolean }>,
  fetchImpl: FetchLike,
): Promise<QuellenStand> {
  if (!basis) return { status: 'nicht-eingerichtet' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FRIST_MS);
  try {
    const antwort = await fetchImpl(new URL(TEAM_SOURCE_PATH, basis).toString(), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ schemaVersion: TEAM_SOURCE_SCHEMA_VERSION, mitglieder }),
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    if (antwort.status !== 200) return { status: 'nicht-erreichbar' };
    try {
      return {
        status: 'ok',
        quelle: pruefeTeamQuelle(await antwort.json(), {
          source: quelle,
          angefragt: mitglieder.length,
          benanntErlaubt: new Set(mitglieder.filter((m) => m.benannt).map((m) => m.sub)),
        }),
      };
    } catch {
      return { status: 'ungueltig' };
    }
  } catch {
    return { status: 'nicht-erreichbar' };
  } finally {
    clearTimeout(timer);
  }
}

export async function teamStand(
  db: Db,
  k: OrgKontext,
  person: Person,
  teamId: string,
  abhaengig: {
    adressen: Readonly<Record<TeamSourceName, string | null>>;
    token: () => Promise<string | null>;
    fetchImpl: FetchLike;
  },
): Promise<TeamStand | null> {
  verlange(k, person, 'teams.verwalten');
  const team = await db.team.findFirst({
    where: { id: teamId, organizationId: k.organisationId },
    select: { members: { select: { shareProgress: true, membership: { select: { sub: true, displayName: true } } } } },
  });
  if (!team) return null;
  const personen = team.members
    .map((m) => ({ sub: m.membership.sub, name: m.membership.displayName, freigabe: m.shareProgress }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const mitglieder = personen.map((p) => ({ sub: p.sub, benannt: p.freigabe }));

  let token: string | null = null;
  let tokenFehler = false;
  try {
    token = await abhaengig.token();
  } catch (fehler) {
    // Konto nicht erreichbar oder Dienstkonto falsch eingerichtet.
    tokenFehler = true;
    protokoll('hub-team', 'error', 'Diensttoken der Plattform nicht erhältlich', {
      errorType: fehler instanceof Error ? fehler.name : 'unbekannt',
    });
  }
  const beginn = Date.now();
  const eintraege = await Promise.all(
    TEAM_SOURCES.map(async (quelle): Promise<[TeamSourceName, QuellenStand]> => [
      quelle,
      token
        ? await frageTeamQuelleAb(quelle, abhaengig.adressen[quelle], token, mitglieder, abhaengig.fetchImpl)
        : { status: tokenFehler ? 'nicht-erreichbar' : 'nicht-eingerichtet' },
    ]),
  );
  const quellen = Object.fromEntries(eintraege) as Record<TeamSourceName, QuellenStand>;
  protokoll('hub-team', 'info', 'Teamstand über den Hub', {
    dauerMs: Date.now() - beginn,
    personen: personen.length,
    ...Object.fromEntries(eintraege.map(([q, s]) => [q, s.status])),
  });
  return { personen, quellen };
}
