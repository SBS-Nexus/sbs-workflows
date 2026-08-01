'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import { enforceRateLimit, RATE_LIMITS, RateLimitError } from '@/server/security/rate-limit';
import { submissionSchema } from '@/domain/content/exercise-payload';
import {
  getGradingBundle,
  revealHint,
  revealSolution,
  saveDraft,
  submitAttempt,
  type SubmitResult,
} from '@/server/services/exercise-service';
import { completeReviewItem } from '@/server/services/review-service';
import { recordAnonymousEvent } from '@/server/services/lesson-service';
import { touchLearningSession } from '@/server/services/progress-service';
import type { Hint, TestCase } from '@/domain/content/exercise-payload';

/**
 * Server Actions rund um die Bearbeitung einzelner Aufgaben.
 *
 * Die Bewertung passiert ausschließlich hier auf dem Server. Der Browser
 * liefert bei Code-Aufgaben nur die Testergebnisse seines Pyodide-Laufs; alle
 * übrigen Aufgabenformen werden vollständig serverseitig ausgewertet, sodass
 * die richtigen Antworten den Server nie verlassen.
 */

const confidenceSchema = z.enum(['UNSURE', 'RATHER_UNSURE', 'RATHER_SURE', 'VERY_SURE']).nullable();

const submitInputSchema = z.object({
  exerciseSlug: z.string().min(1).max(120),
  lessonSlug: z.string().max(120).nullable().optional(),
  submission: submissionSchema,
  hintsUsed: z.number().int().min(0).max(5),
  durationMs: z
    .number()
    .int()
    .min(0)
    .max(6 * 60 * 60 * 1000),
  confidenceBefore: confidenceSchema.optional(),
  confidenceAfter: confidenceSchema.optional(),
  isReview: z.boolean().optional(),
});

export type SubmitExerciseResponse = ({ ok: true } & SubmitResult) | { ok: false; error: string };

export async function submitExerciseAction(
  input: z.input<typeof submitInputSchema>,
): Promise<SubmitExerciseResponse> {
  const user = await requireUser();

  const parsed = submitInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Die Abgabe konnte nicht gelesen werden. Bitte lade die Seite neu.',
    };
  }

  try {
    enforceRateLimit(`submit:${user.id}`, RATE_LIMITS.submitAttempt);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const result = await submitAttempt({
    userId: user.id,
    exerciseSlug: parsed.data.exerciseSlug,
    submission: parsed.data.submission,
    hintsUsed: parsed.data.hintsUsed,
    durationMs: parsed.data.durationMs,
    confidenceBefore: parsed.data.confidenceBefore ?? null,
    confidenceAfter: parsed.data.confidenceAfter ?? null,
    isReview: parsed.data.isReview ?? false,
  });

  if ('error' in result) return { ok: false, error: result.error };

  await touchLearningSession(user.id);
  await recordAnonymousEvent(
    `attempt_${result.grading.outcome.toLowerCase()}`,
    parsed.data.exerciseSlug,
    parsed.data.durationMs / 1000,
  );

  if (result.grading.outcome === 'PASSED' && parsed.data.isReview) {
    await completeReviewItem(user.id, parsed.data.exerciseSlug);
  }

  if (parsed.data.lessonSlug) revalidatePath(`/lernen/${parsed.data.lessonSlug}`);
  revalidatePath('/fortschritt');
  revalidatePath('/wiederholen');

  return { ok: true, ...result };
}

const revealHintSchema = z.object({
  exerciseSlug: z.string().min(1).max(120),
  level: z.number().int().min(1).max(5),
});

export async function revealHintAction(
  input: z.input<typeof revealHintSchema>,
): Promise<{ ok: true; hint: Hint } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = revealHintSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Ungültige Anfrage.' };

  const result = await revealHint(user.id, parsed.data.exerciseSlug, parsed.data.level);
  if ('error' in result) return { ok: false, error: result.error };

  await recordAnonymousEvent('hint_revealed', parsed.data.exerciseSlug, parsed.data.level);
  return { ok: true, hint: result.hint };
}

export async function revealSolutionAction(
  exerciseSlug: string,
): Promise<
  | { ok: true; solution: string; notes: string | null; followUp: { reason: string } }
  | { ok: false; error: string }
> {
  const user = await requireUser();
  const result = await revealSolution(user.id, exerciseSlug);
  if ('error' in result) return { ok: false, error: result.error };

  await recordAnonymousEvent('solution_revealed', exerciseSlug);
  revalidatePath('/fortschritt');

  return {
    ok: true,
    solution: result.solution,
    notes: result.notes,
    followUp: { reason: result.followUp.reason },
  };
}

/**
 * Liefert die Testfälle für den Prüflauf im Browser.
 *
 * Bewusst getrennt vom Laden der Aufgabe: Versteckte Tests gehen erst beim
 * Absenden über die Leitung.
 */
export async function getGradingTestsAction(
  exerciseSlug: string,
): Promise<{ ok: true; tests: TestCase[] } | { ok: false; error: string }> {
  await requireUser();
  const bundle = await getGradingBundle(exerciseSlug);
  if (!bundle) return { ok: false, error: 'Aufgabe nicht gefunden.' };
  return { ok: true, tests: bundle.tests };
}

const draftSchema = z.object({
  lessonSlug: z.string().min(1).max(120),
  exerciseSlug: z.string().min(1).max(120),
  code: z.string().max(20_000),
});

export async function saveDraftAction(input: z.input<typeof draftSchema>): Promise<void> {
  const user = await requireUser();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return;

  await saveDraft(user.id, parsed.data.lessonSlug, parsed.data.exerciseSlug, parsed.data.code);
}
