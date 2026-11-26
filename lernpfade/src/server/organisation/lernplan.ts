import type { Person } from '../../domain/organisation/regeln.ts';
import { pruefeName } from '../../domain/organisation/regeln.ts';
import {
  EINTRAEGE_MAX,
  PFAD_NAME,
  pruefeEintrag,
  zielText,
  type Eintrag,
  type Pfad,
} from '../../domain/lernplan/regeln.ts';
import { OrganisationsFehler, protokolliere, verlange, type Db, type Ergebnis, type OrgKontext } from './dienst.ts';

/**
 * E5.3 — Lernpläne (docs/E5-PLAN.md). Ein Plan je Team; Admin und Lehrkraft
 * pflegen ihn, Mitglieder des Teams sehen ihn. Änderungen stehen im
 * Prüfprotokoll.
 */

export type PlanEintrag = Eintrag & { id: string; position: number };
export type Plan = { id: string; name: string; eintraege: PlanEintrag[] };

function tagAus(datum: Date | null): string | null {
  return datum ? datum.toISOString().slice(0, 10) : null;
}

function alsPlan(p: {
  id: string;
  name: string;
  items: Array<{ id: string; position: number; path: string; targetLessons: number | null; dueDate: Date | null }>;
}): Plan {
  return {
    id: p.id,
    name: p.name,
    eintraege: p.items
      .slice()
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      .map((i) => ({ id: i.id, position: i.position, pfad: i.path as Pfad, ziel: i.targetLessons, faellig: tagAus(i.dueDate) })),
  };
}

const PLAN_AUSWAHL = {
  id: true,
  name: true,
  items: { select: { id: true, position: true, path: true, targetLessons: true, dueDate: true } },
} as const;

async function teamDerOrganisation(db: Db, k: OrgKontext, teamId: string) {
  const team = await db.team.findFirst({
    where: { id: teamId, organizationId: k.organisationId },
    select: { id: true, name: true, plan: { select: PLAN_AUSWAHL } },
  });
  if (!team) throw new OrganisationsFehler('nicht-gefunden', 'Dieses Team gibt es nicht (mehr).');
  return team;
}

async function planDerOrganisation(db: Db, k: OrgKontext, planId: string) {
  const plan = await db.learningPlan.findFirst({
    where: { id: planId, team: { organizationId: k.organisationId } },
    select: { ...PLAN_AUSWAHL, team: { select: { id: true, name: true } } },
  });
  if (!plan) throw new OrganisationsFehler('nicht-gefunden', 'Diesen Lernplan gibt es nicht (mehr).');
  return plan;
}

export async function planDesTeams(db: Db, k: OrgKontext, person: Person, teamId: string): Promise<Plan | null> {
  verlange(k, person, 'teams.verwalten');
  const team = await teamDerOrganisation(db, k, teamId);
  return team.plan ? alsPlan(team.plan) : null;
}

export async function legePlanAn(
  db: Db,
  k: OrgKontext,
  person: Person,
  teamId: string,
  eingabe: unknown,
): Promise<Ergebnis<object>> {
  verlange(k, person, 'teams.verwalten');
  const geprueft = pruefeName(eingabe);
  if (!geprueft.ok) return { ok: false, meldung: geprueft.grund };
  const team = await teamDerOrganisation(db, k, teamId);
  if (team.plan) return { ok: false, meldung: 'Dieses Team hat schon einen Lernplan.' };
  try {
    await db.learningPlan.create({ data: { teamId: team.id, name: geprueft.name } });
  } catch (fehler) {
    if ((fehler as { code?: string }).code === 'P2002') return { ok: false, meldung: 'Dieses Team hat schon einen Lernplan.' };
    throw fehler;
  }
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'plan.created',
    zielTyp: 'team',
    zielId: team.id,
    satz: `${person.name} hat den Lernplan „${geprueft.name}“ für das Team „${team.name}“ angelegt.`,
  });
  return { ok: true };
}

export async function fuegeEintragHinzu(
  db: Db,
  k: OrgKontext,
  person: Person,
  planId: string,
  eingabe: { pfad: unknown; ziel: unknown; alle: unknown; faellig: unknown },
  jetzt = new Date(),
): Promise<Ergebnis<object>> {
  verlange(k, person, 'teams.verwalten');
  const geprueft = pruefeEintrag(eingabe, jetzt);
  if (!geprueft.ok) return { ok: false, meldung: geprueft.grund };
  const plan = await planDerOrganisation(db, k, planId);
  if (plan.items.length >= EINTRAEGE_MAX) {
    return { ok: false, meldung: `Ein Lernplan hat höchstens ${EINTRAEGE_MAX} Einträge.` };
  }
  const { pfad, ziel, faellig } = geprueft.eintrag;
  await db.learningPlanItem.create({
    data: {
      planId: plan.id,
      position: Math.max(-1, ...plan.items.map((i) => i.position)) + 1,
      path: pfad,
      targetLessons: ziel,
      dueDate: faellig ? new Date(`${faellig}T00:00:00Z`) : null,
    },
  });
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'plan.item-added',
    zielTyp: 'team',
    zielId: plan.team.id,
    satz: `${person.name} hat dem Lernplan „${plan.name}“ ${PFAD_NAME[pfad]} (${zielText(ziel)}${faellig ? `, fällig ${faellig}` : ''}) hinzugefügt.`,
  });
  return { ok: true };
}

export async function entferneEintrag(db: Db, k: OrgKontext, person: Person, eintragId: string): Promise<Ergebnis<object>> {
  verlange(k, person, 'teams.verwalten');
  const eintrag = await db.learningPlanItem.findFirst({
    where: { id: eintragId, plan: { team: { organizationId: k.organisationId } } },
    select: { id: true, path: true, plan: { select: { name: true, team: { select: { id: true } } } } },
  });
  if (!eintrag) return { ok: false, meldung: 'Diesen Eintrag gibt es nicht (mehr).' };
  await db.learningPlanItem.delete({ where: { id: eintrag.id } });
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'plan.item-removed',
    zielTyp: 'team',
    zielId: eintrag.plan.team.id,
    satz: `${person.name} hat ${PFAD_NAME[eintrag.path as Pfad]} aus dem Lernplan „${eintrag.plan.name}“ entfernt.`,
  });
  return { ok: true };
}

/** Einen Eintrag eine Stelle nach oben oder unten; die Positionen bleiben lückenlos. */
export async function verschiebeEintrag(
  db: Db,
  k: OrgKontext,
  person: Person,
  eintragId: string,
  richtung: 'hoch' | 'runter',
): Promise<Ergebnis<object>> {
  verlange(k, person, 'teams.verwalten');
  const eintrag = await db.learningPlanItem.findFirst({
    where: { id: eintragId, plan: { team: { organizationId: k.organisationId } } },
    select: { planId: true },
  });
  if (!eintrag) return { ok: false, meldung: 'Diesen Eintrag gibt es nicht (mehr).' };
  await db.$transaction(async (tx) => {
    const alle = await tx.learningPlanItem.findMany({
      where: { planId: eintrag.planId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const i = alle.findIndex((e) => e.id === eintragId);
    const j = richtung === 'hoch' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= alle.length) return;
    [alle[i], alle[j]] = [alle[j]!, alle[i]!];
    for (const [position, e] of alle.entries()) {
      await tx.learningPlanItem.update({ where: { id: e.id }, data: { position } });
    }
  });
  return { ok: true };
}

export async function loeschePlan(db: Db, k: OrgKontext, person: Person, planId: string): Promise<Ergebnis<object>> {
  verlange(k, person, 'teams.verwalten');
  const plan = await planDerOrganisation(db, k, planId);
  await db.learningPlan.delete({ where: { id: plan.id } });
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'plan.deleted',
    zielTyp: 'team',
    zielId: plan.team.id,
    satz: `${person.name} hat den Lernplan „${plan.name}“ des Teams „${plan.team.name}“ gelöscht.`,
  });
  return { ok: true };
}

/** Lernpläne der offenen Teams, in denen die Person selbst ist. */
export async function eigeneLernplaene(
  db: Db,
  k: OrgKontext,
  person: Person,
): Promise<Array<{ team: string; plan: Plan }>> {
  const liste = await db.teamMembership.findMany({
    where: { membership: { organizationId: k.organisationId, sub: person.sub }, team: { archivedAt: null, plan: { isNot: null } } },
    select: { team: { select: { name: true, plan: { select: PLAN_AUSWAHL } } } },
    orderBy: { team: { name: 'asc' } },
  });
  return liste.flatMap((t) => (t.team.plan ? [{ team: t.team.name, plan: alsPlan(t.team.plan) }] : []));
}
