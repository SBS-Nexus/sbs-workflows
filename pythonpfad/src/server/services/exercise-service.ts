import 'server-only';
import { prisma } from '@/server/db/prisma';
import {
  exercisePayloadSchema,
  hintSchema,
  testCaseSchema,
  type ExercisePayload,
  type Hint,
  type Submission,
  type TestCase,
} from '@/domain/content/exercise-payload';
import { toPublicPayload, type PublicExercisePayload } from '@/domain/content/public-view';
import { gradeSubmission, type GradingResult } from '@/domain/grading/grade';
import {
  canRevealSolution,
  evaluateHintAvailability,
  followUpAfterSolution,
  type HintAvailability,
} from '@/domain/hints/hint-ladder';
import {
  DEFAULT_MASTERY_CONFIG,
  updateMastery,
  INITIAL_MASTERY_STATE,
  type ConfidenceLevel,
  type MasteryState,
} from '@/domain/mastery/mastery';
import { daysBetween, scheduleNextReview } from '@/domain/scheduling/spaced-repetition';
import { explainPythonError, type PythonErrorInfo } from '@/domain/errors/python-errors';
import type { ExerciseTypeName } from '@/domain/content/schema';
import { z } from 'zod';

/**
 * Fachdienst rund um Aufgaben.
 *
 * Hier laufen Bewertung, Kompetenzfortschreibung und Wiederholungsplanung
 * zusammen. Die eigentliche Rechenlogik steckt in `src/domain/` und ist dort
 * ohne Datenbank testbar; dieser Dienst kümmert sich um Persistenz und
 * Berechtigungen.
 */

const hintsSchema = z.array(hintSchema);
const testsSchema = z.array(testCaseSchema);

export interface PublicExercise {
  id: string;
  slug: string;
  type: ExerciseTypeName;
  title: string;
  prompt: string;
  payload: PublicExercisePayload;
  starterCode: string | null;
  difficulty: number;
  scaffoldLevel: number;
  transferContext: string | null;
  /** Nur die sichtbaren Tests; versteckte Tests bleiben auf dem Server. */
  publicTests: Array<{ id: string; name: string; expectedStdout?: string; stdin?: string[] }>;
  hiddenTestCount: number;
  /** Verfügbarkeit der Hinweisstufen. */
  hintAvailability: HintAvailability[];
  /** Bereits aufgedeckte Hinweise – nur diese verlassen den Server. */
  revealedHints: Hint[];
  attempts: number;
  solutionRevealed: boolean;
  canRevealSolution: boolean;
  /** Letzter Zwischenstand im Editor. */
  draftCode: string | null;
  lastResult: 'PASSED' | 'PARTIAL' | 'FAILED' | 'SOLUTION_REVEALED' | null;
}

interface ExerciseRow {
  id: string;
  slug: string;
  type: string;
  title: string;
  prompt: string;
  payload: unknown;
  starterCode: string | null;
  solution: string | null;
  solutionNotes: string | null;
  publicTests: unknown;
  hiddenTests: unknown;
  hints: unknown;
  difficulty: number;
  scaffoldLevel: number;
  transferContext: string | null;
  lessonId: string | null;
}

function parseExercise(row: ExerciseRow): {
  payload: ExercisePayload;
  hints: Hint[];
  publicTests: TestCase[];
  hiddenTests: TestCase[];
} {
  return {
    payload: exercisePayloadSchema.parse(row.payload),
    hints: hintsSchema.parse(row.hints ?? []),
    publicTests: testsSchema.parse(row.publicTests ?? []),
    hiddenTests: testsSchema.parse(row.hiddenTests ?? []),
  };
}

/** Zustand der Hinweisleiter für eine Person und eine Aufgabe. */
async function getLadderState(
  userId: string,
  exerciseId: string,
): Promise<{ attempts: number; revealedLevel: number; solutionRevealed: boolean }> {
  const attempts = await prisma.attempt.findMany({
    where: { userId, exerciseId },
    select: { hintsUsed: true, result: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const realAttempts = attempts.filter((a) => a.result !== 'SOLUTION_REVEALED').length;
  const revealedLevel = attempts.reduce((max, a) => Math.max(max, a.hintsUsed), 0);
  const solutionRevealed = attempts.some((a) => a.result === 'SOLUTION_REVEALED');

  return { attempts: realAttempts, revealedLevel, solutionRevealed };
}

export async function getPublicExercise(
  userId: string,
  exerciseSlug: string,
): Promise<PublicExercise | null> {
  const row = await prisma.exercise.findUnique({ where: { slug: exerciseSlug } });
  if (!row || row.status !== 'PUBLISHED') return null;

  const parsed = parseExercise(row);
  const ladder = await getLadderState(userId, row.id);

  const progress = row.lessonId
    ? await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId: row.lessonId } },
        select: { draftCode: true },
      })
    : null;

  const drafts = (progress?.draftCode ?? {}) as Record<string, string>;

  const lastAttempt = await prisma.attempt.findFirst({
    where: { userId, exerciseId: row.id },
    orderBy: { createdAt: 'desc' },
    select: { result: true },
  });

  return {
    id: row.id,
    slug: row.slug,
    type: row.type as ExerciseTypeName,
    title: row.title,
    prompt: row.prompt,
    payload: toPublicPayload(parsed.payload, row.slug),
    starterCode: row.starterCode,
    difficulty: row.difficulty,
    scaffoldLevel: row.scaffoldLevel,
    transferContext: row.transferContext,
    publicTests: parsed.publicTests.map((t) => ({
      id: t.id,
      name: t.name,
      ...(t.expectedStdout !== undefined ? { expectedStdout: t.expectedStdout } : {}),
      ...(t.stdin !== undefined ? { stdin: t.stdin } : {}),
    })),
    hiddenTestCount: parsed.hiddenTests.length,
    hintAvailability: evaluateHintAvailability(parsed.hints, {
      attempts: ladder.attempts,
      revealedLevel: ladder.revealedLevel,
    }),
    revealedHints: parsed.hints.filter((h) => h.level <= ladder.revealedLevel),
    attempts: ladder.attempts,
    solutionRevealed: ladder.solutionRevealed,
    canRevealSolution: canRevealSolution(
      { attempts: ladder.attempts, revealedLevel: ladder.revealedLevel },
      parsed.hints,
    ),
    draftCode: drafts[row.slug] ?? null,
    lastResult: lastAttempt?.result ?? null,
  };
}

/**
 * Liefert die Testfälle für einen Prüflauf im Browser.
 *
 * Bewusst ein eigener Aufruf: Versteckte Tests werden erst beim Absenden
 * ausgeliefert, nicht schon beim Laden der Aufgabe.
 */
export async function getGradingBundle(
  exerciseSlug: string,
): Promise<{ tests: TestCase[] } | null> {
  const row = await prisma.exercise.findUnique({
    where: { slug: exerciseSlug },
    select: { publicTests: true, hiddenTests: true, status: true },
  });
  if (!row || row.status !== 'PUBLISHED') return null;

  return {
    tests: [
      ...testsSchema.parse(row.publicTests ?? []),
      ...testsSchema.parse(row.hiddenTests ?? []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Hinweise
// ---------------------------------------------------------------------------

export async function revealHint(
  userId: string,
  exerciseSlug: string,
  level: number,
): Promise<{ hint: Hint } | { error: string }> {
  const row = await prisma.exercise.findUnique({
    where: { slug: exerciseSlug },
    select: { id: true, hints: true },
  });
  if (!row) return { error: 'Aufgabe nicht gefunden.' };

  const hints = hintsSchema.parse(row.hints ?? []);
  const ladder = await getLadderState(userId, row.id);
  const availability = evaluateHintAvailability(hints, {
    attempts: ladder.attempts,
    revealedLevel: ladder.revealedLevel,
  });

  const entry = availability.find((a) => a.level === level);
  if (!entry) return { error: 'Diesen Hinweis gibt es nicht.' };
  if (!entry.available) {
    return { error: entry.blockedReason ?? 'Dieser Hinweis ist noch nicht verfügbar.' };
  }

  const hint = hints.find((h) => h.level === level);
  if (!hint) return { error: 'Diesen Hinweis gibt es nicht.' };

  return { hint };
}

export interface RevealedSolution {
  solution: string;
  notes: string | null;
  followUp: { required: true; reason: string };
}

export async function revealSolution(
  userId: string,
  exerciseSlug: string,
): Promise<RevealedSolution | { error: string }> {
  const row = await prisma.exercise.findUnique({ where: { slug: exerciseSlug } });
  if (!row) return { error: 'Aufgabe nicht gefunden.' };

  const parsed = parseExercise(row);
  const ladder = await getLadderState(userId, row.id);

  if (
    !canRevealSolution(
      { attempts: ladder.attempts, revealedLevel: ladder.revealedLevel },
      parsed.hints,
    )
  ) {
    return {
      error:
        'Die Musterlösung wird erst nach mehreren eigenen Versuchen und der vollständigen Hinweisleiter freigegeben. Ein weiterer eigener Versuch bringt dich weiter als die fertige Lösung.',
    };
  }

  const solution = row.solution ?? describeExpectedAnswer(parsed.payload);

  // Das Ansehen wird als Versuch mit dem Ergebnis SOLUTION_REVEALED erfasst.
  // Dadurch wird der Kompetenzwert gedeckelt und eine Nacharbeit eingeplant.
  await recordAttempt({
    userId,
    exerciseId: row.id,
    submittedCode: '',
    result: 'SOLUTION_REVEALED',
    errorType: 'NONE',
    passedTests: 0,
    totalTests: 0,
    hintsUsed: 5,
    durationMs: 0,
    isReview: false,
  });

  await applyMasteryAndSchedule({
    userId,
    exerciseId: row.id,
    exerciseType: row.type as ExerciseTypeName,
    scaffoldLevel: row.scaffoldLevel,
    difficulty: row.difficulty,
    outcome: 'SOLUTION_REVEALED',
    score: 0,
    hintsUsed: 5,
    errorType: 'NONE',
    confidenceBefore: null,
  });

  return { solution, notes: row.solutionNotes, followUp: followUpAfterSolution() };
}

function describeExpectedAnswer(payload: ExercisePayload): string {
  switch (payload.kind) {
    case 'predictOutput':
      return payload.expectedOutput;
    case 'freeText':
      return payload.sampleAnswer;
    case 'findError':
      return payload.explanation;
    default:
      return 'Für diese Aufgabe gibt es keine Musterlösung im Codeformat. Die Erklärung findest du in der Rückmeldung.';
  }
}

// ---------------------------------------------------------------------------
// Einreichen
// ---------------------------------------------------------------------------

export interface SubmitInput {
  userId: string;
  exerciseSlug: string;
  submission: Submission;
  hintsUsed: number;
  durationMs: number;
  confidenceBefore?: ConfidenceLevel | null;
  confidenceAfter?: ConfidenceLevel | null;
  isReview?: boolean;
}

export interface SubmitResult {
  grading: GradingResult;
  /** Deutsche Erklärung, falls das Programm mit einem Fehler abgebrochen ist. */
  errorExplanation: PythonErrorInfo | null;
  masteryChanges: Array<{
    conceptSlug: string;
    conceptName: string;
    before: number;
    after: number;
    reasons: string[];
  }>;
  nextReview: { dueAt: Date; reason: string } | null;
  attemptNumber: number;
}

export async function submitAttempt(input: SubmitInput): Promise<SubmitResult | { error: string }> {
  const row = await prisma.exercise.findUnique({ where: { slug: input.exerciseSlug } });
  if (!row || row.status !== 'PUBLISHED') return { error: 'Aufgabe nicht gefunden.' };

  const parsed = parseExercise(row);
  const allTests = [...parsed.publicTests, ...parsed.hiddenTests];

  const grading = gradeSubmission({
    payload: parsed.payload,
    submission: input.submission,
    allTests,
  });

  const submittedCode =
    input.submission.kind === 'code'
      ? input.submission.code
      : JSON.stringify(input.submission).slice(0, 4000);

  const runtimeError = input.submission.kind === 'code' ? input.submission.runtimeError : null;

  const errorExplanation = runtimeError
    ? explainPythonError(`${runtimeError.type}: ${runtimeError.message}`)
    : null;

  const attempt = await recordAttempt({
    userId: input.userId,
    exerciseId: row.id,
    submittedCode,
    result: grading.outcome,
    errorType: grading.errorType,
    errorSignature: runtimeError?.type ?? null,
    passedTests: grading.passedTests,
    totalTests: grading.totalTests,
    hintsUsed: input.hintsUsed,
    durationMs: input.durationMs,
    confidenceBefore: input.confidenceBefore ?? null,
    confidenceAfter: input.confidenceAfter ?? null,
    isReview: input.isReview ?? false,
  });

  const { masteryChanges, nextReview } = await applyMasteryAndSchedule({
    userId: input.userId,
    exerciseId: row.id,
    exerciseType: row.type as ExerciseTypeName,
    scaffoldLevel: row.scaffoldLevel,
    difficulty: row.difficulty,
    outcome: grading.outcome,
    score: grading.score,
    hintsUsed: input.hintsUsed,
    errorType: grading.errorType,
    confidenceBefore: input.confidenceBefore ?? null,
  });

  const attemptCount = await prisma.attempt.count({
    where: { userId: input.userId, exerciseId: row.id, result: { not: 'SOLUTION_REVEALED' } },
  });

  void attempt;

  return { grading, errorExplanation, masteryChanges, nextReview, attemptNumber: attemptCount };
}

interface RecordAttemptInput {
  userId: string;
  exerciseId: string;
  submittedCode: string;
  result: 'PASSED' | 'PARTIAL' | 'FAILED' | 'SOLUTION_REVEALED';
  errorType: string;
  errorSignature?: string | null;
  passedTests: number;
  totalTests: number;
  hintsUsed: number;
  durationMs: number;
  confidenceBefore?: ConfidenceLevel | null;
  confidenceAfter?: ConfidenceLevel | null;
  isReview?: boolean;
}

async function recordAttempt(input: RecordAttemptInput): Promise<{ id: string }> {
  return prisma.attempt.create({
    data: {
      userId: input.userId,
      exerciseId: input.exerciseId,
      // Der eingereichte Code wird begrenzt gespeichert: Er ist für die
      // Fehleranalyse nützlich, soll aber nicht unbegrenzt wachsen.
      submittedCode: input.submittedCode.slice(0, 20_000),
      result: input.result,
      errorType: input.errorType as never,
      errorSignature: input.errorSignature ?? null,
      passedTests: input.passedTests,
      totalTests: input.totalTests,
      hintsUsed: input.hintsUsed,
      durationMs: Math.min(input.durationMs, 6 * 60 * 60 * 1000),
      confidenceBefore: input.confidenceBefore ?? null,
      confidenceAfter: input.confidenceAfter ?? null,
      isReview: input.isReview ?? false,
    },
    select: { id: true },
  });
}

interface MasteryApplyInput {
  userId: string;
  exerciseId: string;
  exerciseType: ExerciseTypeName;
  scaffoldLevel: number;
  difficulty: number;
  outcome: 'PASSED' | 'PARTIAL' | 'FAILED' | 'SOLUTION_REVEALED';
  score: number;
  hintsUsed: number;
  errorType: string;
  confidenceBefore: ConfidenceLevel | null;
}

async function applyMasteryAndSchedule(input: MasteryApplyInput): Promise<{
  masteryChanges: SubmitResult['masteryChanges'];
  nextReview: SubmitResult['nextReview'];
}> {
  const links = await prisma.exerciseConcept.findMany({
    where: { exerciseId: input.exerciseId },
    include: { concept: { select: { id: true, slug: true, name: true } } },
  });

  const now = new Date();
  const changes: SubmitResult['masteryChanges'] = [];
  let representativeState: MasteryState | null = null;

  for (const link of links) {
    const existing = await prisma.conceptMastery.findUnique({
      where: { userId_conceptId: { userId: input.userId, conceptId: link.conceptId } },
    });

    const previous: MasteryState = existing
      ? {
          masteryScore: existing.masteryScore,
          stability: existing.stability,
          difficulty: existing.difficulty,
          successfulRetrievals: existing.successfulRetrievals,
          failedRetrievals: existing.failedRetrievals,
          transferSuccesses: existing.transferSuccesses,
        }
      : { ...INITIAL_MASTERY_STATE };

    const daysSince = existing?.lastPracticedAt ? daysBetween(existing.lastPracticedAt, now) : 0;

    const lastAttempt = await prisma.attempt.findFirst({
      where: {
        userId: input.userId,
        exercise: { concepts: { some: { conceptId: link.conceptId } } },
        result: { in: ['FAILED', 'PARTIAL'] },
      },
      orderBy: { createdAt: 'desc' },
      skip: 1,
      select: { errorType: true },
    });

    const update = updateMastery(
      previous,
      {
        outcome: input.outcome,
        score: input.score,
        hintsUsed: input.hintsUsed,
        exerciseDifficulty: input.difficulty,
        exerciseType: input.exerciseType,
        scaffoldLevel: input.scaffoldLevel,
        weight: link.weight,
        daysSinceLastPractice: daysSince,
        errorType: input.errorType as never,
        repeatedErrorType: lastAttempt?.errorType === input.errorType,
        confidenceBefore: input.confidenceBefore,
      },
      DEFAULT_MASTERY_CONFIG,
    );

    representativeState ??= update.state;

    await prisma.conceptMastery.upsert({
      where: { userId_conceptId: { userId: input.userId, conceptId: link.conceptId } },
      create: {
        userId: input.userId,
        conceptId: link.conceptId,
        ...update.state,
        lastPracticedAt: now,
        algorithmVersion: update.algorithmVersion,
      },
      update: {
        ...update.state,
        lastPracticedAt: now,
        algorithmVersion: update.algorithmVersion,
      },
    });

    changes.push({
      conceptSlug: link.concept.slug,
      conceptName: link.concept.name,
      before: Math.round(previous.masteryScore),
      after: Math.round(update.state.masteryScore),
      reasons: update.reasons,
    });
  }

  // --- Wiederholung einplanen ---------------------------------------------
  const existingQueueItem = await prisma.reviewQueueItem.findUnique({
    where: { userId_exerciseId: { userId: input.userId, exerciseId: input.exerciseId } },
  });

  const schedule = scheduleNextReview({
    mastery: representativeState ?? { ...INITIAL_MASTERY_STATE },
    repetition: existingQueueItem?.repetition ?? 0,
    passed: input.outcome === 'PASSED',
    hintsUsed: input.hintsUsed,
    errorType: input.errorType as never,
    confidenceBefore: input.confidenceBefore,
    now,
  });

  await prisma.reviewQueueItem.upsert({
    where: { userId_exerciseId: { userId: input.userId, exerciseId: input.exerciseId } },
    create: {
      userId: input.userId,
      exerciseId: input.exerciseId,
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

  // Konzeptbezogene Fälligkeit für das Dashboard.
  for (const link of links) {
    await prisma.conceptMastery.update({
      where: { userId_conceptId: { userId: input.userId, conceptId: link.conceptId } },
      data: { nextReviewAt: schedule.dueAt },
    });
  }

  return {
    masteryChanges: changes,
    nextReview: { dueAt: schedule.dueAt, reason: schedule.reason },
  };
}

/** Speichert den Zwischenstand im Editor, damit auf einem anderen Gerät weitergearbeitet werden kann. */
export async function saveDraft(
  userId: string,
  lessonSlug: string,
  exerciseSlug: string,
  code: string,
): Promise<void> {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: lessonSlug },
    select: { id: true },
  });
  if (!lesson) return;

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    select: { draftCode: true },
  });

  const drafts = { ...((existing?.draftCode ?? {}) as Record<string, string>) };
  drafts[exerciseSlug] = code.slice(0, 20_000);

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    create: { userId, lessonId: lesson.id, state: 'IN_PROGRESS', draftCode: drafts },
    update: { draftCode: drafts },
  });
}
