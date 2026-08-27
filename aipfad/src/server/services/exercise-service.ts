import 'server-only';
import { prisma } from '@/server/db/prisma';
import { requireUser } from '@/server/auth/session';
import { enforceRateLimit, RATE_LIMITS } from '@/server/security/rate-limit';
import { gradeSubmission, toPublicPayload } from '@/domain/grading/grade';
import {
  exercisePayloadSchema,
  submissionSchema,
  type Submission,
} from '@/domain/content/exercise-payload';
import {
  DEFAULT_MASTERY_CONFIG,
  INITIAL_MASTERY_STATE,
  masteryBand,
  updateMastery,
  type ConfidenceLevel,
  type MasteryState,
} from '@/domain/mastery/mastery';
import { scheduleNextReview } from '@/domain/scheduling/spaced-repetition';
import type { ExerciseTypeName } from '@/domain/content/schema';

/**
 * Aufgaben-Dienst: verbindet die reinen Domainfunktionen (grade/mastery/
 * scheduling) mit Persistenz. Muster aus PythonPfad/SQLPfad
 * (`server/services/exercise-service.ts`): `domain/` bleibt frei von Prisma,
 * dieser Dienst lädt Zustand, ruft die reinen Funktionen auf und speichert
 * das Ergebnis.
 */

export interface PublicExercise {
  id: string;
  slug: string;
  type: ExerciseTypeName;
  title: string;
  prompt: string;
  payload: unknown;
  difficulty: number;
  scaffoldLevel: number;
  transferContext: string | null;
}

/** Lädt eine Aufgabe OHNE Lösungsdaten — sicher für den Client. */
export async function getPublicExercise(slug: string): Promise<PublicExercise | null> {
  const exercise = await prisma.exercise.findUnique({ where: { slug } });
  if (!exercise || exercise.status !== 'PUBLISHED') return null;

  const payload = exercisePayloadSchema.parse(exercise.payload);

  return {
    id: exercise.id,
    slug: exercise.slug,
    type: exercise.type,
    title: exercise.title,
    prompt: exercise.prompt,
    payload: toPublicPayload(payload),
    difficulty: exercise.difficulty,
    scaffoldLevel: exercise.scaffoldLevel,
    transferContext: exercise.transferContext,
  };
}

export interface SubmitAttemptInput {
  exerciseSlug: string;
  submission: Submission;
  hintsUsed: number;
  durationMs: number;
  confidenceBefore?: ConfidenceLevel;
  isReview: boolean;
}

export interface SubmitAttemptResult {
  outcome: 'PASSED' | 'PARTIAL' | 'FAILED' | 'SOLUTION_REVEALED';
  feedback: { tone: 'success' | 'issue' | 'info'; message: string }[];
  marks: Record<string, boolean>;
  masteryUpdates: { conceptSlug: string; delta: number; band: string; reasons: string[] }[];
}

/**
 * Verarbeitet eine eingereichte Antwort: bewertet, aktualisiert die
 * Kompetenz jedes verknüpften Konzepts, plant die nächste Wiederholung.
 */
export async function submitAttempt(input: SubmitAttemptInput): Promise<SubmitAttemptResult> {
  const user = await requireUser();
  enforceRateLimit(`submit:${user.id}`, RATE_LIMITS.submitAttempt);

  const exercise = await prisma.exercise.findUnique({
    where: { slug: input.exerciseSlug },
    include: { concepts: { include: { concept: true } } },
  });
  if (!exercise || exercise.status !== 'PUBLISHED') {
    throw new Error('Aufgabe nicht gefunden.');
  }

  const payload = exercisePayloadSchema.parse(exercise.payload);
  const submission = submissionSchema.parse(input.submission);
  const grading = gradeSubmission({ payload, submission });

  const now = new Date();

  await prisma.attempt.create({
    data: {
      userId: user.id,
      exerciseId: exercise.id,
      submittedAnswer: submission,
      result: grading.outcome,
      errorType: grading.errorType,
      hintsUsed: input.hintsUsed,
      durationMs: input.durationMs,
      confidenceBefore: input.confidenceBefore,
      isReview: input.isReview,
    },
  });

  const masteryUpdates: SubmitAttemptResult['masteryUpdates'] = [];

  for (const link of exercise.concepts) {
    const existing = await prisma.conceptMastery.findUnique({
      where: { userId_conceptId: { userId: user.id, conceptId: link.conceptId } },
    });

    const previousState: MasteryState = existing
      ? {
          masteryScore: existing.masteryScore,
          stability: existing.stability,
          difficulty: existing.difficulty,
          successfulRetrievals: existing.successfulRetrievals,
          failedRetrievals: existing.failedRetrievals,
          transferSuccesses: existing.transferSuccesses,
        }
      : INITIAL_MASTERY_STATE;

    const daysSinceLastPractice = existing?.lastPracticedAt
      ? (now.getTime() - existing.lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // War der zuletzt aufgezeichnete Fehler beim vorigen Versuch zu diesem
    // Konzept vom selben Typ? Eine grobe, aber ausreichende Näherung: der
    // letzte fehlgeschlagene Versuch zu einer Aufgabe desselben Konzepts.
    const lastFailedAttempt = await prisma.attempt.findFirst({
      where: {
        userId: user.id,
        exercise: { concepts: { some: { conceptId: link.conceptId } } },
        result: { in: ['FAILED', 'PARTIAL'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { errorType: true },
    });

    const update = updateMastery(
      previousState,
      {
        outcome:
          grading.outcome === 'PASSED'
            ? 'PASSED'
            : grading.outcome === 'PARTIAL'
              ? 'PARTIAL'
              : 'FAILED',
        score: grading.score,
        hintsUsed: input.hintsUsed,
        exerciseDifficulty: exercise.difficulty,
        exerciseType: exercise.type,
        scaffoldLevel: exercise.scaffoldLevel,
        weight: link.weight,
        daysSinceLastPractice,
        errorType: grading.errorType,
        repeatedErrorType:
          grading.outcome !== 'PASSED' && lastFailedAttempt?.errorType === grading.errorType,
        confidenceBefore: input.confidenceBefore ?? null,
      },
      DEFAULT_MASTERY_CONFIG,
    );

    await prisma.conceptMastery.upsert({
      where: { userId_conceptId: { userId: user.id, conceptId: link.conceptId } },
      create: {
        userId: user.id,
        conceptId: link.conceptId,
        masteryScore: update.state.masteryScore,
        stability: update.state.stability,
        difficulty: update.state.difficulty,
        successfulRetrievals: update.state.successfulRetrievals,
        failedRetrievals: update.state.failedRetrievals,
        transferSuccesses: update.state.transferSuccesses,
        lastPracticedAt: now,
        algorithmVersion: update.algorithmVersion,
      },
      update: {
        masteryScore: update.state.masteryScore,
        stability: update.state.stability,
        difficulty: update.state.difficulty,
        successfulRetrievals: update.state.successfulRetrievals,
        failedRetrievals: update.state.failedRetrievals,
        transferSuccesses: update.state.transferSuccesses,
        lastPracticedAt: now,
        algorithmVersion: update.algorithmVersion,
      },
    });

    masteryUpdates.push({
      conceptSlug: link.concept.slug,
      delta: update.delta,
      band: masteryBand(update.state.masteryScore),
      reasons: update.reasons,
    });
  }

  // --- Nächste Wiederholung planen -----------------------------------------
  const existingReview = await prisma.reviewQueueItem.findUnique({
    where: { userId_exerciseId: { userId: user.id, exerciseId: exercise.id } },
  });

  const primaryConcept = exercise.concepts[0];
  const conceptMastery = primaryConcept
    ? await prisma.conceptMastery.findUnique({
        where: { userId_conceptId: { userId: user.id, conceptId: primaryConcept.conceptId } },
      })
    : null;

  if (conceptMastery) {
    const schedule = scheduleNextReview({
      mastery: {
        masteryScore: conceptMastery.masteryScore,
        stability: conceptMastery.stability,
        difficulty: conceptMastery.difficulty,
        successfulRetrievals: conceptMastery.successfulRetrievals,
        failedRetrievals: conceptMastery.failedRetrievals,
        transferSuccesses: conceptMastery.transferSuccesses,
      },
      repetition: existingReview?.repetition ?? 0,
      passed: grading.outcome === 'PASSED',
      hintsUsed: input.hintsUsed,
      errorType: grading.errorType,
      confidenceBefore: input.confidenceBefore ?? null,
      now,
    });

    await prisma.reviewQueueItem.upsert({
      where: { userId_exerciseId: { userId: user.id, exerciseId: exercise.id } },
      create: {
        userId: user.id,
        exerciseId: exercise.id,
        dueAt: schedule.dueAt,
        repetition: schedule.repetition,
        reason: schedule.reason,
      },
      update: {
        dueAt: schedule.dueAt,
        repetition: schedule.repetition,
        reason: schedule.reason,
        completedAt: null,
      },
    });
  }

  return {
    outcome: grading.outcome,
    feedback: grading.feedback,
    marks: grading.marks,
    masteryUpdates,
  };
}
