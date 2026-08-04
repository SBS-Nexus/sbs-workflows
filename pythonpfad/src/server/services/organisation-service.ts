import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/server/db/prisma';
import {
  buildCohortInsights,
  type CohortInsights,
  type LearnerSnapshot,
} from '@/domain/organisation/cohort-insights';
import {
  can,
  mayViewNamedProgress,
  type OrgCapability,
  type OrgRoleName,
} from '@/domain/organisation/permissions';

/**
 * Fachdienst für Organisationen, Kohorten und Einladungen.
 *
 * Datensparsamkeit ist hier keine Nebenbedingung, sondern die Bauform: Der
 * Dienst liefert Summenwerte, und die namentliche Einzelansicht kommt nur
 * zustande, wenn die betroffene Person eingewilligt hat. Es gibt bewusst keine
 * Funktion, die einer Lehrkraft einzelne Versuche, Zeiten oder Fehlermeldungen
 * herausgibt – auch nicht mit Einwilligung. Was eine Lehrkraft sieht, ist der
 * Stand, nicht der Weg dorthin.
 */

/** Einladungen laufen nach dieser Frist ab. */
export const INVITATION_TTL_DAYS = 14;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface OrgContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrgRoleName;
}

/**
 * Mitgliedschaft der abrufenden Person in einer Organisation.
 *
 * Liefert `null`, wenn keine besteht. Aufrufer müssen das behandeln – es gibt
 * absichtlich keine Fassung, die eine Standardrolle zurückgibt.
 */
export async function getOrgContext(
  userId: string,
  organizationSlug: string,
): Promise<OrgContext | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId, organization: { slug: organizationSlug } },
    select: {
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!membership) return null;

  return {
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    role: membership.role,
  };
}

export async function listOrganisations(
  userId: string,
): Promise<Array<{ slug: string; name: string; role: OrgRoleName; cohortCount: number }>> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: {
      role: true,
      organization: {
        select: { slug: true, name: true, _count: { select: { cohorts: true } } },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return memberships.map((membership) => ({
    slug: membership.organization.slug,
    name: membership.organization.name,
    role: membership.role,
    cohortCount: membership.organization._count.cohorts,
  }));
}

/** Wirft, wenn die Rolle die Fähigkeit nicht mitbringt. */
export function assertCapability(context: OrgContext, capability: OrgCapability): void {
  if (!can(context.role, capability)) {
    throw new Error('Für diesen Schritt fehlt die Berechtigung in dieser Organisation.');
  }
}

async function writeAudit(input: {
  organizationId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
}): Promise<void> {
  await prisma.auditEntry.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      summary: input.summary,
    },
  });
}

/** Erzeugt aus einem Namen einen eindeutigen Slug. */
async function uniqueOrgSlug(name: string): Promise<string> {
  const basis =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'organisation';

  for (let versuch = 0; versuch < 50; versuch += 1) {
    const kandidat = versuch === 0 ? basis : `${basis}-${versuch + 1}`;
    const vorhanden = await prisma.organization.findUnique({
      where: { slug: kandidat },
      select: { id: true },
    });
    if (!vorhanden) return kandidat;
  }
  return `${basis}-${randomBytes(4).toString('hex')}`;
}

export async function createOrganisation(
  userId: string,
  name: string,
  description = '',
): Promise<{ slug: string }> {
  const slug = await uniqueOrgSlug(name);

  const organization = await prisma.organization.create({
    data: {
      slug,
      name,
      description,
      // Wer eine Organisation anlegt, ist ihre Inhaberin oder ihr Inhaber.
      memberships: { create: { userId, role: 'OWNER' } },
    },
    select: { id: true, slug: true },
  });

  await writeAudit({
    organizationId: organization.id,
    actorId: userId,
    action: 'organisation.created',
    targetType: 'organisation',
    targetId: organization.id,
    summary: `Organisation „${name}" angelegt.`,
  });

  return { slug: organization.slug };
}

export async function createCohort(
  context: OrgContext,
  actorId: string,
  name: string,
  description = '',
): Promise<{ slug: string }> {
  assertCapability(context, 'kohorte.verwalten');

  const basis =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'kohorte';

  let slug = basis;
  for (let versuch = 1; versuch < 50; versuch += 1) {
    const vorhanden = await prisma.cohort.findUnique({
      where: { organizationId_slug: { organizationId: context.organizationId, slug } },
      select: { id: true },
    });
    if (!vorhanden) break;
    slug = `${basis}-${versuch + 1}`;
  }

  const cohort = await prisma.cohort.create({
    data: { organizationId: context.organizationId, slug, name, description },
    select: { id: true, slug: true },
  });

  await writeAudit({
    organizationId: context.organizationId,
    actorId,
    action: 'cohort.created',
    targetType: 'cohort',
    targetId: cohort.id,
    summary: `Kohorte „${name}" angelegt.`,
  });

  return { slug: cohort.slug };
}

export interface CreatedInvitation {
  /** Nur hier im Klartext. In der Datenbank liegt ausschließlich der Hash. */
  token: string;
  expiresAt: Date;
}

export async function createInvitation(
  context: OrgContext,
  actorId: string,
  input: { role: OrgRoleName; cohortSlug?: string | null; email?: string | null },
): Promise<CreatedInvitation> {
  assertCapability(context, 'einladung.verwalten');

  // Eine Lehrkraft darf nicht jemanden zur Inhaberin machen. Sonst ließe sich
  // die Verwaltungsberechtigung über den Umweg einer Einladung erlangen.
  if (input.role === 'OWNER' && context.role !== 'OWNER') {
    throw new Error('Nur die Inhaberin oder der Inhaber kann diese Rolle vergeben.');
  }

  let cohortId: string | null = null;
  if (input.cohortSlug) {
    const cohort = await prisma.cohort.findUnique({
      where: {
        organizationId_slug: { organizationId: context.organizationId, slug: input.cohortSlug },
      },
      select: { id: true },
    });
    if (!cohort) throw new Error('Diese Kohorte gibt es in der Organisation nicht.');
    cohortId = cohort.id;
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

  const invitation = await prisma.invitation.create({
    data: {
      organizationId: context.organizationId,
      cohortId,
      role: input.role,
      tokenHash: hashToken(token),
      email: input.email?.trim().toLowerCase() || null,
      expiresAt,
      createdById: actorId,
    },
    select: { id: true },
  });

  await writeAudit({
    organizationId: context.organizationId,
    actorId,
    action: 'invitation.created',
    targetType: 'invitation',
    targetId: invitation.id,
    summary: `Einladung als ${input.role} erstellt${input.cohortSlug ? ` (Kohorte ${input.cohortSlug})` : ''}.`,
  });

  return { token, expiresAt };
}

export type AcceptResult =
  { ok: true; organizationSlug: string; organizationName: string } | { ok: false; reason: string };

/**
 * Löst eine Einladung ein.
 *
 * Alle Ablehnungsgründe werden gleich ausführlich beantwortet. Eine Antwort,
 * die zwischen „gibt es nicht" und „ist abgelaufen" unterscheidet, verrät
 * einem Fremden, ob ein geratenes Token je gültig war.
 */
export async function acceptInvitation(userId: string, token: string): Promise<AcceptResult> {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      organizationId: true,
      cohortId: true,
      role: true,
      email: true,
      expiresAt: true,
      acceptedAt: true,
      organization: { select: { slug: true, name: true } },
    },
  });

  const ungueltig: AcceptResult = {
    ok: false,
    reason: 'Diese Einladung ist nicht mehr gültig. Bitte lass dir eine neue schicken.',
  };

  if (!invitation) return ungueltig;
  if (invitation.acceptedAt !== null) return ungueltig;
  if (invitation.expiresAt < new Date()) return ungueltig;

  if (invitation.email) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || user.email.toLowerCase() !== invitation.email) {
      return {
        ok: false,
        reason: 'Diese Einladung ist an eine andere E-Mail-Adresse gerichtet.',
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: {
        organizationId_userId: { organizationId: invitation.organizationId, userId },
      },
      create: { organizationId: invitation.organizationId, userId, role: invitation.role },
      // Eine bestehende Rolle wird nicht herabgestuft: Wer schon Lehrkraft ist
      // und eine Mitgliedseinladung einlöst, bleibt Lehrkraft.
      update: {},
    });

    if (invitation.cohortId) {
      await tx.cohortMembership.upsert({
        where: { cohortId_userId: { cohortId: invitation.cohortId, userId } },
        create: { cohortId: invitation.cohortId, userId },
        update: {},
      });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), acceptedById: userId },
    });
  });

  await writeAudit({
    organizationId: invitation.organizationId,
    actorId: userId,
    action: 'invitation.accepted',
    targetType: 'invitation',
    targetId: invitation.id,
    summary: `Einladung eingelöst und als ${invitation.role} beigetreten.`,
  });

  return {
    ok: true,
    organizationSlug: invitation.organization.slug,
    organizationName: invitation.organization.name,
  };
}

/**
 * Einwilligung zur namentlichen Anzeige setzen oder zurücknehmen.
 *
 * Nur die betroffene Person selbst kann das – deshalb gibt es keinen Parameter
 * für eine handelnde dritte Person. Der Zeitpunkt wird festgehalten, damit
 * später nachvollziehbar ist, ab wann die Einwilligung galt.
 */
export async function setProgressConsent(
  userId: string,
  cohortId: string,
  consent: boolean,
): Promise<void> {
  await prisma.cohortMembership.update({
    where: { cohortId_userId: { cohortId, userId } },
    data: { shareProgressWithTeachers: consent, consentChangedAt: new Date() },
  });
}

export interface NamedLearner {
  name: string;
  lessonsCompleted: number;
  exercisesPassed: number;
  lastActiveAt: Date | null;
}

export interface CohortOverview {
  cohort: { slug: string; name: string; description: string; archivedAt: Date | null };
  insights: CohortInsights;
  /** Nur Personen mit Einwilligung. Ohne Einwilligung erscheint niemand. */
  namedLearners: NamedLearner[];
}

export async function getCohortOverview(
  context: OrgContext,
  cohortSlug: string,
  now: Date = new Date(),
): Promise<CohortOverview | null> {
  assertCapability(context, 'kohorte.summen-lesen');

  const cohort = await prisma.cohort.findUnique({
    where: { organizationId_slug: { organizationId: context.organizationId, slug: cohortSlug } },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      archivedAt: true,
      members: {
        select: {
          shareProgressWithTeachers: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!cohort) return null;

  const userIds = cohort.members.map((member) => member.user.id);
  if (userIds.length === 0) {
    return {
      cohort: {
        slug: cohort.slug,
        name: cohort.name,
        description: cohort.description,
        archivedAt: cohort.archivedAt,
      },
      insights: buildCohortInsights([], 0, new Map(), now),
      namedLearners: [],
    };
  }

  const [lessons, attempts, mastery, konzepte] = await Promise.all([
    prisma.lessonProgress.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, state: 'COMPLETED' },
      _count: { _all: true },
    }),
    prisma.attempt.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, exerciseId: true, result: true, createdAt: true },
    }),
    prisma.conceptMastery.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, masteryScore: true, concept: { select: { slug: true } } },
    }),
    prisma.concept.findMany({ select: { slug: true, name: true } }),
  ]);

  const lessonsByUser = new Map(lessons.map((row) => [row.userId, row._count._all]));

  const bestandenByUser = new Map<string, Set<string>>();
  const letzteAktivitaet = new Map<string, Date>();
  for (const attempt of attempts) {
    if (attempt.result === 'PASSED') {
      const menge = bestandenByUser.get(attempt.userId) ?? new Set<string>();
      menge.add(attempt.exerciseId);
      bestandenByUser.set(attempt.userId, menge);
    }
    const bisher = letzteAktivitaet.get(attempt.userId);
    if (!bisher || attempt.createdAt > bisher) {
      letzteAktivitaet.set(attempt.userId, attempt.createdAt);
    }
  }

  const masteryByUser = new Map<string, Record<string, number>>();
  for (const row of mastery) {
    const eintrag = masteryByUser.get(row.userId) ?? {};
    eintrag[row.concept.slug] = row.masteryScore;
    masteryByUser.set(row.userId, eintrag);
  }

  const snapshots: LearnerSnapshot[] = cohort.members.map((member) => ({
    userId: member.user.id,
    lessonsCompleted: lessonsByUser.get(member.user.id) ?? 0,
    exercisesPassed: bestandenByUser.get(member.user.id)?.size ?? 0,
    masteryByConcept: masteryByUser.get(member.user.id) ?? {},
    lastActiveAt: letzteAktivitaet.get(member.user.id) ?? null,
  }));

  const consented = cohort.members.filter((member) => member.shareProgressWithTeachers);

  const namedLearners: NamedLearner[] = consented
    .filter((member) => mayViewNamedProgress(context.role, member.shareProgressWithTeachers))
    .map((member) => ({
      name: member.user.name,
      lessonsCompleted: lessonsByUser.get(member.user.id) ?? 0,
      exercisesPassed: bestandenByUser.get(member.user.id)?.size ?? 0,
      lastActiveAt: letzteAktivitaet.get(member.user.id) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return {
    cohort: {
      slug: cohort.slug,
      name: cohort.name,
      description: cohort.description,
      archivedAt: cohort.archivedAt,
    },
    insights: buildCohortInsights(
      snapshots,
      consented.length,
      new Map(konzepte.map((concept) => [concept.slug, concept.name])),
      now,
    ),
    namedLearners,
  };
}

export async function listCohorts(
  context: OrgContext,
): Promise<
  Array<{
    slug: string;
    name: string;
    description: string;
    memberCount: number;
    archivedAt: Date | null;
  }>
> {
  const cohorts = await prisma.cohort.findMany({
    where: { organizationId: context.organizationId },
    select: {
      slug: true,
      name: true,
      description: true,
      archivedAt: true,
      _count: { select: { members: true } },
    },
    orderBy: [{ archivedAt: 'asc' }, { createdAt: 'desc' }],
  });

  return cohorts.map((cohort) => ({
    slug: cohort.slug,
    name: cohort.name,
    description: cohort.description,
    memberCount: cohort._count.members,
    archivedAt: cohort.archivedAt,
  }));
}

export async function getAuditLog(
  context: OrgContext,
  limit = 50,
): Promise<Array<{ summary: string; actorName: string; createdAt: Date }>> {
  assertCapability(context, 'protokoll.lesen');

  const entries = await prisma.auditEntry.findMany({
    where: { organizationId: context.organizationId },
    select: { summary: true, createdAt: true, actor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return entries.map((entry) => ({
    summary: entry.summary,
    actorName: entry.actor.name,
    createdAt: entry.createdAt,
  }));
}

/** Kohorten der lernenden Person selbst – für die Einwilligungsverwaltung im Profil. */
export async function listOwnCohorts(userId: string): Promise<
  Array<{
    cohortId: string;
    cohortName: string;
    organizationName: string;
    shareProgressWithTeachers: boolean;
  }>
> {
  const memberships = await prisma.cohortMembership.findMany({
    where: { userId },
    select: {
      cohortId: true,
      shareProgressWithTeachers: true,
      cohort: { select: { name: true, organization: { select: { name: true } } } },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return memberships.map((membership) => ({
    cohortId: membership.cohortId,
    cohortName: membership.cohort.name,
    organizationName: membership.cohort.organization.name,
    shareProgressWithTeachers: membership.shareProgressWithTeachers,
  }));
}
