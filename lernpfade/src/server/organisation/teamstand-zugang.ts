import 'server-only';
import { normalizeSourceBaseUrl } from '../../domain/review/fetch-source.ts';
import type { Person } from '../../domain/organisation/regeln.ts';
import { REVIEW_SOURCE_APP_URLS } from '../../lib/catalog.ts';
import type { Db, OrgKontext } from './dienst.ts';
import { dienstkontoEingerichtet, diensttoken } from './dienstkonto.ts';
import { teamStand, type TeamStand } from './teamstand.ts';

/**
 * E5.2 — Teamstand mit den echten Abhängigkeiten: Adressen der Apps aus dem
 * Katalog und das Diensttoken der Plattform. Für Seite und CSV dieselbe
 * Quelle, damit die CSV nie mehr enthält als die Übersicht.
 */
export function teamstandEingerichtet(): boolean {
  return dienstkontoEingerichtet();
}

export function ladeTeamStand(db: Db, k: OrgKontext, person: Person, teamId: string): Promise<TeamStand | null> {
  return teamStand(db, k, person, teamId, {
    adressen: {
      python: normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS.python),
      sql: normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS.sql),
      ai: normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS.ai),
    },
    token: () => diensttoken(),
    fetchImpl: (adresse, init) => fetch(adresse, init),
  });
}
