import type { NextRequest } from 'next/server';
import { darf } from '@/domain/organisation/regeln';
import { teamCsv } from '@/domain/team/csv';
import { kontext, protokolliere } from '@/server/organisation/dienst';
import { team } from '@/server/organisation/teams';
import { ladeTeamStand, teamstandEingerichtet } from '@/server/organisation/teamstand-zugang';
import { orgZugang } from '@/server/organisation/zugang';

/**
 * E5.2 — Teamstand als CSV. Dieselben Rechte und dieselben Daten wie die
 * Teamseite (zweiter Faktor, Admin oder Lehrkraft); jeder Export steht im
 * Prüfprotokoll. Nie im Zwischenspeicher.
 */
export const dynamic = 'force-dynamic';

const KOPF = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ kuerzel: string; team: string }> },
): Promise<Response> {
  const { kuerzel, team: teamKuerzel } = await params;
  const zugang = await orgZugang();
  if (!zugang?.person) return new Response('Nicht gefunden.', { status: 404, headers: KOPF });
  const { db, person } = zugang;
  const k = await kontext(db, person.sub, kuerzel);
  if (!k || !darf(k.rolle, 'teams.verwalten') || !person.zweiFaktoren || !teamstandEingerichtet()) {
    return new Response('Nicht gefunden.', { status: 404, headers: KOPF });
  }
  const t = await team(db, k, person, teamKuerzel);
  if (!t) return new Response('Nicht gefunden.', { status: 404, headers: KOPF });
  const stand = await ladeTeamStand(db, k, person, t.id);
  if (!stand) return new Response('Nicht gefunden.', { status: 404, headers: KOPF });

  const quellen = Object.values(stand.quellen).flatMap((q) => (q.status === 'ok' ? [q.quelle] : []));
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'team.exported',
    zielTyp: 'team',
    zielId: t.id,
    satz: `${person.name} hat den Stand des Teams „${t.name}“ als CSV heruntergeladen.`,
  });
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(teamCsv(stand.personen, quellen), {
    headers: {
      ...KOPF,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="team-${t.kuerzel}-${datum}.csv"`,
    },
  });
}
