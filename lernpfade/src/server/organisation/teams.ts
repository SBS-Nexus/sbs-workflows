import { randomBytes } from 'node:crypto';
import { kuerzelAus, pruefeName, type Person, type Rolle } from '../../domain/organisation/regeln.ts';
import {
  OrganisationsFehler,
  protokolliere,
  verlange,
  type Db,
  type Ergebnis,
  type OrgKontext,
} from './dienst.ts';

/**
 * E5.2 — Teams und Einwilligung (docs/E5-PLAN.md, Abschnitte 5 bis 7).
 *
 * Admin und Lehrkraft legen Teams an und ordnen Mitglieder der Organisation
 * zu. Ob jemand in einem Team namentlich erscheint, entscheidet allein die
 * Person selbst (`setzeFreigabe`), standardmäßig nicht. Einwilligungen stehen
 * nicht im Prüfprotokoll: Das Protokoll hält Verwaltung fest, nicht das
 * Verhalten von Lernenden.
 */

export type TeamKurz = {
  id: string;
  kuerzel: string;
  name: string;
  archiviert: boolean;
  mitglieder: number;
  freigaben: number;
};

export type TeamMitglied = {
  teamMitgliedId: string;
  mitgliedId: string;
  name: string;
  rolle: Rolle;
  freigabe: boolean;
};

export type TeamDetail = TeamKurz & {
  personen: TeamMitglied[];
  /** Mitglieder der Organisation, die noch nicht im Team sind. */
  kandidaten: Array<{ mitgliedId: string; name: string; rolle: Rolle }>;
};

export async function teamsVon(db: Db, k: OrgKontext, person: Person): Promise<TeamKurz[]> {
  verlange(k, person, 'teams.verwalten');
  const teams = await db.team.findMany({
    where: { organizationId: k.organisationId },
    select: {
      id: true,
      slug: true,
      name: true,
      archivedAt: true,
      members: { select: { shareProgress: true } },
    },
    orderBy: [{ archivedAt: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }],
  });
  return teams.map((t) => ({
    id: t.id,
    kuerzel: t.slug,
    name: t.name,
    archiviert: t.archivedAt !== null,
    mitglieder: t.members.length,
    freigaben: t.members.filter((m) => m.shareProgress).length,
  }));
}

export async function legeTeamAn(
  db: Db,
  k: OrgKontext,
  person: Person,
  eingabe: unknown,
): Promise<Ergebnis<{ kuerzel: string }>> {
  verlange(k, person, 'teams.verwalten');
  const geprueft = pruefeName(eingabe);
  if (!geprueft.ok) return { ok: false, meldung: geprueft.grund };
  const basis = kuerzelAus(geprueft.name).replace(/^organisation$/, 'team');
  for (let versuch = 0; versuch < 20; versuch += 1) {
    const kuerzel = versuch === 0 ? basis : `${basis.slice(0, 34)}-${randomBytes(2).toString('hex')}`;
    try {
      const team = await db.team.create({
        data: { organizationId: k.organisationId, slug: kuerzel, name: geprueft.name },
      });
      await protokolliere(db, {
        organisationId: k.organisationId,
        person,
        aktion: 'team.created',
        zielTyp: 'team',
        zielId: team.id,
        satz: `${person.name} hat das Team „${geprueft.name}“ angelegt.`,
      });
      return { ok: true, kuerzel };
    } catch (fehler) {
      if ((fehler as { code?: string }).code !== 'P2002') throw fehler;
    }
  }
  return { ok: false, meldung: 'Gerade ist kein freies Kürzel zu finden. Bitte versuche es erneut.' };
}

async function teamDerOrganisation(db: Db, k: OrgKontext, teamId: string) {
  const team = await db.team.findFirst({
    where: { id: teamId, organizationId: k.organisationId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!team) throw new OrganisationsFehler('nicht-gefunden', 'Dieses Team gibt es nicht (mehr).');
  return team;
}

export async function team(db: Db, k: OrgKontext, person: Person, kuerzel: string): Promise<TeamDetail | null> {
  verlange(k, person, 'teams.verwalten');
  const t = await db.team.findUnique({
    where: { organizationId_slug: { organizationId: k.organisationId, slug: kuerzel } },
    select: {
      id: true,
      slug: true,
      name: true,
      archivedAt: true,
      members: {
        select: {
          id: true,
          shareProgress: true,
          membership: { select: { id: true, displayName: true, role: true } },
        },
      },
    },
  });
  if (!t) return null;
  const imTeam = new Set(t.members.map((m) => m.membership.id));
  const alle = await db.membership.findMany({
    where: { organizationId: k.organisationId },
    select: { id: true, displayName: true, role: true },
    orderBy: { displayName: 'asc' },
  });
  const personen = t.members
    .map((m) => ({
      teamMitgliedId: m.id,
      mitgliedId: m.membership.id,
      name: m.membership.displayName,
      rolle: m.membership.role,
      freigabe: m.shareProgress,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return {
    id: t.id,
    kuerzel: t.slug,
    name: t.name,
    archiviert: t.archivedAt !== null,
    mitglieder: personen.length,
    freigaben: personen.filter((p) => p.freigabe).length,
    personen,
    kandidaten: alle
      .filter((m) => !imTeam.has(m.id))
      .map((m) => ({ mitgliedId: m.id, name: m.displayName, rolle: m.role })),
  };
}

export async function fuegeHinzu(
  db: Db,
  k: OrgKontext,
  person: Person,
  teamId: string,
  mitgliedId: string,
): Promise<Ergebnis<object>> {
  verlange(k, person, 'teams.verwalten');
  const t = await teamDerOrganisation(db, k, teamId);
  if (t.archivedAt) return { ok: false, meldung: 'Archivierte Teams nehmen niemanden mehr auf.' };
  const m = await db.membership.findFirst({
    where: { id: mitgliedId, organizationId: k.organisationId },
    select: { id: true, displayName: true },
  });
  if (!m) return { ok: false, meldung: 'Diese Person ist nicht Mitglied der Organisation.' };
  try {
    await db.teamMembership.create({ data: { teamId: t.id, membershipId: m.id } });
  } catch (fehler) {
    if ((fehler as { code?: string }).code === 'P2002') return { ok: true };
    throw fehler;
  }
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'team.member-added',
    zielTyp: 'team',
    zielId: t.id,
    satz: `${person.name} hat ${m.displayName} ins Team „${t.name}“ aufgenommen.`,
  });
  return { ok: true };
}

export async function entferneAusTeam(
  db: Db,
  k: OrgKontext,
  person: Person,
  teamMitgliedId: string,
): Promise<Ergebnis<object>> {
  verlange(k, person, 'teams.verwalten');
  const tm = await db.teamMembership.findFirst({
    where: { id: teamMitgliedId, team: { organizationId: k.organisationId } },
    select: { id: true, team: { select: { id: true, name: true } }, membership: { select: { displayName: true } } },
  });
  if (!tm) return { ok: false, meldung: 'Diese Person ist nicht (mehr) im Team.' };
  await db.teamMembership.delete({ where: { id: tm.id } });
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'team.member-removed',
    zielTyp: 'team',
    zielId: tm.team.id,
    satz: `${person.name} hat ${tm.membership.displayName} aus dem Team „${tm.team.name}“ genommen.`,
  });
  return { ok: true };
}

export async function archiviereTeam(
  db: Db,
  k: OrgKontext,
  person: Person,
  teamId: string,
  archivieren: boolean,
): Promise<Ergebnis<object>> {
  verlange(k, person, 'teams.verwalten');
  const t = await teamDerOrganisation(db, k, teamId);
  if ((t.archivedAt !== null) === archivieren) return { ok: true };
  await db.team.update({ where: { id: t.id }, data: { archivedAt: archivieren ? new Date() : null } });
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: archivieren ? 'team.archived' : 'team.restored',
    zielTyp: 'team',
    zielId: t.id,
    satz: archivieren
      ? `${person.name} hat das Team „${t.name}“ archiviert.`
      : `${person.name} hat das Team „${t.name}“ wieder geöffnet.`,
  });
  return { ok: true };
}

/** Die eigenen Teams einer Person in einer Organisation, mit ihrer Einwilligung. */
export async function eigeneTeams(
  db: Db,
  k: OrgKontext,
  person: Person,
): Promise<Array<{ teamMitgliedId: string; team: string; archiviert: boolean; freigabe: boolean; seit: Date | null }>> {
  const liste = await db.teamMembership.findMany({
    where: { membership: { organizationId: k.organisationId, sub: person.sub } },
    select: {
      id: true,
      shareProgress: true,
      consentChangedAt: true,
      team: { select: { name: true, archivedAt: true } },
    },
    orderBy: { team: { name: 'asc' } },
  });
  return liste.map((t) => ({
    teamMitgliedId: t.id,
    team: t.team.name,
    archiviert: t.team.archivedAt !== null,
    freigabe: t.shareProgress,
    seit: t.consentChangedAt,
  }));
}

/**
 * Einwilligung geben oder zurücknehmen. Nur die Person selbst, für ihre
 * eigene Teamzugehörigkeit; wirkt sofort.
 */
export async function setzeFreigabe(
  db: Db,
  person: Person,
  teamMitgliedId: string,
  freigabe: boolean,
  jetzt = new Date(),
): Promise<Ergebnis<object>> {
  const geaendert = await db.teamMembership.updateMany({
    where: { id: teamMitgliedId, membership: { sub: person.sub }, NOT: { shareProgress: freigabe } },
    data: { shareProgress: freigabe, consentChangedAt: jetzt },
  });
  if (geaendert.count === 1) return { ok: true };
  const vorhanden = await db.teamMembership.findFirst({
    where: { id: teamMitgliedId, membership: { sub: person.sub } },
    select: { id: true },
  });
  return vorhanden ? { ok: true } : { ok: false, meldung: 'Diese Teamzugehörigkeit gibt es nicht (mehr).' };
}
