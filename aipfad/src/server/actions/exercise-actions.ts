'use server';

import { requireUser } from '@/server/auth/session';
import {
  submitAttempt,
  revealNextHint,
  type SubmitAttemptResult,
  type RevealHintResult,
} from '@/server/services/exercise-service';
import { submissionSchema, type Submission } from '@/domain/content/exercise-payload';
import type { ConfidenceLevel } from '@/domain/mastery/mastery';

/**
 * Die Sitzungsprüfung (`requireUser()`) sitzt bewusst hier, nicht im
 * Service — derselbe Aufbau wie PythonPfad/SQLPfad: `server/services/*`
 * bleibt von `next/headers` unabhängig und dadurch ohne laufenden
 * Next.js-Request testbar (siehe tests/integration/exercise-service.test.ts).
 */

export interface SubmitExerciseInput {
  exerciseSlug: string;
  submission: Submission;
  durationMs: number;
  confidenceBefore?: ConfidenceLevel;
  isReview: boolean;
}

export async function submitExerciseAction(
  input: SubmitExerciseInput,
): Promise<SubmitAttemptResult> {
  const user = await requireUser();
  const submission = submissionSchema.parse(input.submission);
  return submitAttempt(user.id, { ...input, submission });
}

export async function revealHintAction(exerciseSlug: string): Promise<RevealHintResult> {
  const user = await requireUser();
  return revealNextHint(user.id, exerciseSlug);
}
