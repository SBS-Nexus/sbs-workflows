'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import {
  acceptInvitation,
  createCohort,
  createInvitation,
  createOrganisation,
  getOrgContext,
  setProgressConsent,
} from '@/server/services/organisation-service';
import { prisma } from '@/server/db/prisma';

/**
 * Server Actions für den Organisationsbereich.
 *
 * Jede Aktion prüft die Mitgliedschaft neu. Dass die aufrufende Seite schon
 * geprüft hat, genügt nicht: Server Actions sind eigene Einstiegspunkte und
 * lassen sich unabhängig von der Seite aufrufen, auf der ihr Knopf steht.
 */

export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
  /** Einmalig angezeigter Einladungslink. */
  invitationUrl?: string;
}

const organisationSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib einen Namen mit mindestens zwei Zeichen an.').max(120),
  description: z.string().trim().max(500).default(''),
});

export async function createOrganisationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = organisationSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? '',
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Die Eingaben passen noch nicht.',
    };
  }

  const { slug } = await createOrganisation(user.id, parsed.data.name, parsed.data.description);
  revalidatePath('/organisation');
  return {
    ok: true,
    message: `Organisation angelegt. Sie ist unter /organisation/${slug} erreichbar.`,
  };
}

const cohortSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  name: z.string().trim().min(2, 'Bitte gib einen Namen mit mindestens zwei Zeichen an.').max(120),
  description: z.string().trim().max(500).default(''),
});

export async function createCohortAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = cohortSchema.safeParse({
    organizationSlug: formData.get('organizationSlug'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Die Eingaben passen noch nicht.',
    };
  }

  const context = await getOrgContext(user.id, parsed.data.organizationSlug);
  if (!context) return { ok: false, error: 'Diese Organisation ist für dich nicht zugänglich.' };

  try {
    await createCohort(context, user.id, parsed.data.name, parsed.data.description);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Das hat nicht geklappt.' };
  }

  revalidatePath(`/organisation/${parsed.data.organizationSlug}`);
  return { ok: true, message: `Kohorte „${parsed.data.name}" angelegt.` };
}

const invitationSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  role: z.enum(['OWNER', 'TEACHER', 'MEMBER']),
  cohortSlug: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email('Das sieht nicht nach einer E-Mail-Adresse aus.')
    .optional()
    .or(z.literal('')),
});

export async function createInvitationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = invitationSchema.safeParse({
    organizationSlug: formData.get('organizationSlug'),
    role: formData.get('role'),
    cohortSlug: formData.get('cohortSlug') ?? undefined,
    email: formData.get('email') ?? '',
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Die Eingaben passen noch nicht.',
    };
  }

  const context = await getOrgContext(user.id, parsed.data.organizationSlug);
  if (!context) return { ok: false, error: 'Diese Organisation ist für dich nicht zugänglich.' };

  try {
    const { token, expiresAt } = await createInvitation(context, user.id, {
      role: parsed.data.role,
      cohortSlug: parsed.data.cohortSlug || null,
      email: parsed.data.email || null,
    });

    revalidatePath(`/organisation/${parsed.data.organizationSlug}`);
    return {
      ok: true,
      // Der Link wird genau einmal angezeigt. Er steht nirgends im Klartext in
      // der Datenbank und lässt sich deshalb später nicht erneut hervorholen.
      invitationUrl: `/einladung/${token}`,
      message: `Der Link gilt bis zum ${expiresAt.toLocaleDateString('de-DE')}. Er wird nur jetzt angezeigt – kopiere ihn, bevor du die Seite verlässt.`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Das hat nicht geklappt.' };
  }
}

export async function acceptInvitationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const token = String(formData.get('token') ?? '');
  if (token.length === 0) return { ok: false, error: 'Es fehlt der Einladungscode.' };

  const result = await acceptInvitation(user.id, token);
  if (!result.ok) return { ok: false, error: result.reason };

  revalidatePath('/organisation');
  return { ok: true, message: `Du gehörst jetzt zu „${result.organizationName}".` };
}

export async function setConsentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const cohortId = String(formData.get('cohortId') ?? '');
  const consent = formData.get('consent') === 'true';

  // Nur die eigene Mitgliedschaft. Ohne diese Prüfung ließe sich über eine
  // fremde Kennung die Einwilligung einer anderen Person setzen.
  const membership = await prisma.cohortMembership.findUnique({
    where: { cohortId_userId: { cohortId, userId: user.id } },
    select: { id: true },
  });
  if (!membership) return { ok: false, error: 'Diese Kohorte gehört nicht zu deinem Konto.' };

  await setProgressConsent(user.id, cohortId, consent);
  revalidatePath('/profil');

  return {
    ok: true,
    message: consent
      ? 'Deine Lehrkräfte sehen deinen Stand jetzt namentlich. Du kannst das jederzeit zurücknehmen.'
      : 'Dein Stand fließt ab sofort nur noch in Summenwerte ein.',
  };
}
