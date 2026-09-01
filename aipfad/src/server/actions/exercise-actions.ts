'use server';

import { requireUser } from '@/server/auth/session';
import {
  submitAttempt,
  revealNextHint,
  type SubmitAttemptResult,
  type RevealHintResult,
} from '@/server/services/exercise-service';
import { z } from 'zod';
import { submissionSchema, type Submission } from '@/domain/content/exercise-payload';
import { CONFIDENCE_LEVELS, type ConfidenceLevel } from '@/domain/mastery/mastery';

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

/**
 * Die vollständige Eingabe wird geprüft, nicht nur `submission`. Ein
 * `'use server'`-Einstiegspunkt bekommt, was der Client sendet — die
 * TypeScript-Signatur ist zur Laufzeit nicht vorhanden. Zuvor erreichten
 * `durationMs` (Postgres `int4`) und `confidenceBefore` (Enum-Spalte) die
 * Datenbank ungeprüft; ein zu großer oder falsch getippter Wert endete in
 * einem Prisma-Fehler statt in einer sauberen Ablehnung, und
 * docs/SECURITY.md fordert ausdrücklich Zod an jeder Server-Action-Grenze
 * (Code-Review auf PR #29).
 */
const exerciseSlugSchema = z.string().min(1).max(200);

const submitExerciseInputSchema = z.object({
  exerciseSlug: exerciseSlugSchema,
  submission: submissionSchema,
  // Höchstens 24 Stunden — alles darüber ist keine Bearbeitungsdauer mehr.
  durationMs: z.number().int().min(0).max(86_400_000),
  confidenceBefore: z.enum(CONFIDENCE_LEVELS).optional(),
  isReview: z.boolean(),
});

export async function submitExerciseAction(
  input: SubmitExerciseInput,
): Promise<SubmitAttemptResult> {
  const user = await requireUser();
  return submitAttempt(user.id, submitExerciseInputSchema.parse(input));
}

export async function revealHintAction(exerciseSlug: string): Promise<RevealHintResult> {
  const user = await requireUser();
  return revealNextHint(user.id, exerciseSlugSchema.parse(exerciseSlug));
}
