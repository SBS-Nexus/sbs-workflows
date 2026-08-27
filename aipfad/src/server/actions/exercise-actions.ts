'use server';

import { submitAttempt, type SubmitAttemptResult } from '@/server/services/exercise-service';
import { submissionSchema, type Submission } from '@/domain/content/exercise-payload';
import type { ConfidenceLevel } from '@/domain/mastery/mastery';

export interface SubmitExerciseInput {
  exerciseSlug: string;
  submission: Submission;
  hintsUsed: number;
  durationMs: number;
  confidenceBefore?: ConfidenceLevel;
  isReview: boolean;
}

export async function submitExerciseAction(
  input: SubmitExerciseInput,
): Promise<SubmitAttemptResult> {
  const submission = submissionSchema.parse(input.submission);
  return submitAttempt({ ...input, submission });
}
