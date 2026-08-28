import 'server-only';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { enforceRateLimit, RATE_LIMITS } from '@/server/security/rate-limit';
import { gradeSubmission, toPublicPayload } from '@/domain/grading/grade';
import {
  exercisePayloadSchema,
  submissionSchema,
  hintSchema,
  type Hint,
  type Submission,
} from '@/domain/content/exercise-payload';
import { evaluateHintAvailability } from '@/domain/hints/hint-ladder';
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
  /**
   * Nur die Stufennummern der vorhandenen Hinweise — genug, damit der Client
   * weiß, wie viele Stufen es gibt und ob noch weitere folgen. Die
   * eigentlichen Hinweistexte werden erst über `revealNextHint()` einzeln und
   * geprüft ausgeliefert (siehe docs/LERNMODELL.md §4: "Nicht freigegebene
   * Hinweise verlassen den Server gar nicht erst").
   */
  hintLevels: number[];
}

/** Lädt eine Aufgabe OHNE Lösungsdaten — sicher für den Client. */
export async function getPublicExercise(slug: string): Promise<PublicExercise | null> {
  const exercise = await prisma.exercise.findUnique({ where: { slug } });
  if (!exercise || exercise.status !== 'PUBLISHED') return null;

  const payload = exercisePayloadSchema.parse(exercise.payload);
  const hints = z.array(hintSchema).parse(exercise.hints);

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
    hintLevels: hints.map((h) => h.level).sort((a, b) => a - b),
  };
}

export type RevealHintResult = { hint: Hint } | { blocked: true; reason: string };

/**
 * Gibt den jeweils NÄCHSTEN Hinweis frei, sofern die Hinweisleiter das
 * erlaubt. Bewusst ohne einen vom Client gewählten Ziel-Level: eine frühere
 * Fassung ließ den Client die gewünschte Stufe angeben und leitete
 * `revealedLevel` daraus ab (`requestedLevel - 1`) — das machte die
 * Reihenfolgeprüfung wirkungslos, ein direkter Aufruf mit `requestedLevel: 5`
 * hätte bei ausreichender Versuchszahl sofort die Musterlösung
 * ausgeliefert, ohne die Stufen 1–4 je gesehen zu haben (Code-Review auf
 * PR #29). Jetzt bestimmt ausschließlich die Datenbank, welche Stufe als
 * Nächstes an der Reihe ist: `revealedLevel` kommt aus echten
 * `HintReveal`-Zeilen, `attempts` aus echten `Attempt`-Zeilen — beides für
 * diesen Nutzer und diese Aufgabe, nichts davon vom Client beeinflussbar.
 * Eine erfolgreich freigegebene Stufe wird sofort persistiert, damit sie
 * beim nächsten Aufruf (auch nach einem Seitenneuladen) nicht erneut als
 * "nächste" gilt.
 */
export async function revealNextHint(
  userId: string,
  exerciseSlug: string,
): Promise<RevealHintResult> {
  enforceRateLimit(`hint:${userId}`, RATE_LIMITS.hintReveal);

  const exercise = await prisma.exercise.findUnique({ where: { slug: exerciseSlug } });
  if (!exercise || exercise.status !== 'PUBLISHED') {
    throw new Error('Aufgabe nicht gefunden.');
  }

  const hints = z.array(hintSchema).parse(exercise.hints);

  const [attempts, revealedLevel] = await Promise.all([
    prisma.attempt.count({ where: { userId, exerciseId: exercise.id } }),
    highestRevealedHintLevel(userId, exercise.id),
  ]);

  const nextLevel = revealedLevel + 1;
  const target = hints.find((h) => h.level === nextLevel);
  if (!target) {
    return { blocked: true, reason: 'Es gibt für diese Aufgabe keine weiteren Hinweise.' };
  }

  const availability = evaluateHintAvailability(hints, { revealedLevel, attempts });
  const status = availability.find((a) => a.level === nextLevel);

  if (!status?.available) {
    return {
      blocked: true,
      reason: status?.blockedReason ?? 'Dieser Hinweis ist noch nicht freigegeben.',
    };
  }

  await prisma.hintReveal.upsert({
    where: { userId_exerciseId_level: { userId, exerciseId: exercise.id, level: nextLevel } },
    create: { userId, exerciseId: exercise.id, level: nextLevel },
    update: {},
  });

  return { hint: target };
}

async function highestRevealedHintLevel(userId: string, exerciseId: string): Promise<number> {
  const latest = await prisma.hintReveal.findFirst({
    where: { userId, exerciseId },
    orderBy: { level: 'desc' },
    select: { level: true },
  });
  return latest?.level ?? 0;
}

/** Echte Anzahl unterschiedlicher, für diese Aufgabe bereits freigegebener Hinweisstufen. */
async function revealedHintCount(userId: string, exerciseId: string): Promise<number> {
  return prisma.hintReveal.count({ where: { userId, exerciseId } });
}

export interface SubmitAttemptInput {
  exerciseSlug: string;
  submission: Submission;
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
export async function submitAttempt(
  userId: string,
  input: SubmitAttemptInput,
): Promise<SubmitAttemptResult> {
  enforceRateLimit(`submit:${userId}`, RATE_LIMITS.submitAttempt);

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

  // Maßgeblich ist die Anzahl serverseitig persistierter Hinweis-Freigaben
  // (HintReveal), nicht eine Angabe des Clients — sonst könnte jemand die
  // volle Hinweisleiter nutzen und trotzdem `hintsUsed: 0` einreichen, und
  // die Kompetenzberechnung würde eine gesehene Musterlösung wie eine
  // eigenständige Lösung werten (Code-Review auf PR #29).
  //
  // Muss VOR dem Anlegen des neuen Attempts ermittelt werden — sonst findet
  // die Abfrage unten den soeben erstellten Versuch als "letzten
  // fehlgeschlagenen Versuch" und stuft jeden ersten Fehler fälschlich als
  // Wiederholung desselben Fehlertyps ein (siehe Codex-Review auf PR #29).
  // Die Konzept-Abfragen sind voneinander unabhängig und laufen parallel
  // statt nacheinander (ebenfalls Code-Review auf PR #29).
  const [hintsUsed, lastFailedAttemptEntries] = await Promise.all([
    revealedHintCount(userId, exercise.id),
    Promise.all(
      exercise.concepts.map(async (link) => {
        const lastFailedAttempt = await prisma.attempt.findFirst({
          where: {
            userId,
            exercise: { concepts: { some: { conceptId: link.conceptId } } },
            result: { in: ['FAILED', 'PARTIAL'] },
          },
          orderBy: { createdAt: 'desc' },
          select: { errorType: true },
        });
        return [link.conceptId, lastFailedAttempt] as const;
      }),
    ),
  ]);
  const lastFailedAttemptsByConcept = new Map(lastFailedAttemptEntries);

  await prisma.attempt.create({
    data: {
      userId,
      exerciseId: exercise.id,
      submittedAnswer: submission,
      result: grading.outcome,
      errorType: grading.errorType,
      hintsUsed,
      durationMs: input.durationMs,
      confidenceBefore: input.confidenceBefore,
      isReview: input.isReview,
    },
  });

  const masteryUpdates: SubmitAttemptResult['masteryUpdates'] = [];

  for (const link of exercise.concepts) {
    const existing = await prisma.conceptMastery.findUnique({
      where: { userId_conceptId: { userId, conceptId: link.conceptId } },
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
    // letzte fehlgeschlagene Versuch zu einer Aufgabe desselben Konzepts,
    // ermittelt VOR dem gerade erstellten Attempt (siehe oben).
    const lastFailedAttempt = lastFailedAttemptsByConcept.get(link.conceptId) ?? null;

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
        hintsUsed,
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
      where: { userId_conceptId: { userId, conceptId: link.conceptId } },
      create: {
        userId,
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
    where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
  });

  const primaryConcept = exercise.concepts[0];
  const conceptMastery = primaryConcept
    ? await prisma.conceptMastery.findUnique({
        where: { userId_conceptId: { userId, conceptId: primaryConcept.conceptId } },
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
      hintsUsed,
      errorType: grading.errorType,
      confidenceBefore: input.confidenceBefore ?? null,
      now,
    });

    await prisma.reviewQueueItem.upsert({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
      create: {
        userId,
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
