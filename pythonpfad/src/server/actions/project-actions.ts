'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import {
  getProjectTests,
  saveProjectDraft,
  submitProject,
  type ProjectSubmitResult,
} from '@/server/services/project-service';
import { touchLearningSession } from '@/server/services/progress-service';
import type { TestCase } from '@/domain/content/exercise-payload';

const filesSchema = z
  .array(z.object({ path: z.string().max(200), content: z.string().max(60_000) }))
  .max(10);

const submitSchema = z.object({
  projectSlug: z.string().min(1).max(120),
  files: filesSchema,
  testResults: z.array(z.object({ id: z.string(), passed: z.boolean() })).max(50),
  reflection: z.string().max(4000).optional(),
});

export async function submitProjectAction(
  input: z.input<typeof submitSchema>,
): Promise<{ ok: true; result: ProjectSubmitResult } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Die Abgabe konnte nicht gelesen werden.' };

  const result = await submitProject({
    userId: user.id,
    projectSlug: parsed.data.projectSlug,
    files: parsed.data.files,
    testResults: parsed.data.testResults,
    ...(parsed.data.reflection !== undefined ? { reflection: parsed.data.reflection } : {}),
  });

  if ('error' in result) return { ok: false, error: result.error };

  await touchLearningSession(user.id);
  revalidatePath(`/projekte/${parsed.data.projectSlug}`);
  revalidatePath('/projekte');
  revalidatePath('/fortschritt');

  return { ok: true, result };
}

export async function getProjectTestsAction(
  projectSlug: string,
): Promise<{ ok: true; tests: TestCase[] } | { ok: false; error: string }> {
  await requireUser();
  const tests = await getProjectTests(projectSlug);
  if (tests.length === 0) return { ok: false, error: 'Projekt nicht gefunden.' };
  return { ok: true, tests };
}

const draftSchema = z.object({ projectSlug: z.string().min(1).max(120), files: filesSchema });

export async function saveProjectDraftAction(input: z.input<typeof draftSchema>): Promise<void> {
  const user = await requireUser();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return;
  await saveProjectDraft(user.id, parsed.data.projectSlug, parsed.data.files);
}
