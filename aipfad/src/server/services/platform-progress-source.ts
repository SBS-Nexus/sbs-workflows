import 'server-only';
import { prisma } from '@/server/db/prisma';
import { veroeffentlichteAufgabe, veroeffentlichteLektion } from '@/server/content/publication';
import { meetsPrerequisite } from '@/domain/mastery/mastery';
import {
  buildPlatformProgressSource,
  latestDate,
  type PlatformProgressSource,
} from '@/server/platform/progress-source-http';

/**
 * LP-07 — AIPfad als schreibgeschützte Fortschrittsquelle.
 *
 * AIPfad bleibt das System der Wahrheit. Dieser Leser zählt nur und gibt nur
 * Aggregate hinaus; er ruft keine schreibende Funktion auf.
 *
 * Semantik (siehe docs/LEARNING-PLATFORM.md im Repository-Wurzelverzeichnis,
 * Abschnitt 12) — dieselben Prädikate wie `/fortschritt` der App:
 *  - Lektionen: `veroeffentlichteLektion` für Zähler UND Nenner.
 *  - Wiederholungen: eigene, offene, fällige `ReviewQueueItem` mit
 *    `veroeffentlichteAufgabe` — dieselbe Zahl wie `/fortschritt` und die
 *    Wiederholungsquelle (LP-05B).
 *  - Konzepte: beobachtet = eigene Kompetenzbelege (`ConceptMastery`, entsteht
 *    nur durch Bearbeitung); bereit = `meetsPrerequisite` der App. Der
 *    Rohwert 0–100 verlässt die App nicht.
 *  - Projekte: AIPfad kennt keine Projekte — `unsupported`, nicht „0 von 0".
 *  - Letzte Aktivität: der späteste erfasste Lernvorgang — Aufgabenversuch,
 *    Lab-Interaktion oder Lektionsabschluss.
 */

/** Nur ein Wert 0–100 ist ein fachlich gültiger Kompetenzbeleg. */
function isValidScore(score: number): boolean {
  return Number.isFinite(score) && score >= 0 && score <= 100;
}

export async function readPlatformProgressSource(
  userId: string,
  query: { now: Date },
): Promise<PlatformProgressSource> {
  const { now } = query;
  if (!userId) throw new TypeError('userId is required');

  const [
    lessonsTotal,
    lessonsCompleted,
    startedLessons,
    reviewsDue,
    mastery,
    lastAttempt,
    lastLab,
    lastCompletion,
  ] = await Promise.all([
    prisma.lesson.count({ where: veroeffentlichteLektion }),
    prisma.lessonProgress.count({
      where: { userId, state: 'COMPLETED', lesson: veroeffentlichteLektion },
    }),
    prisma.lessonProgress.count({ where: { userId, state: { not: 'NOT_STARTED' } } }),
    prisma.reviewQueueItem.count({
      where: { userId, completedAt: null, dueAt: { lte: now }, exercise: veroeffentlichteAufgabe },
    }),
    prisma.conceptMastery.findMany({ where: { userId }, select: { masteryScore: true } }),
    prisma.attempt.aggregate({ where: { userId }, _max: { createdAt: true } }),
    prisma.labAttempt.aggregate({
      where: { userId },
      _max: { startedAt: true, completedAt: true },
    }),
    prisma.lessonProgress.aggregate({ where: { userId }, _max: { completedAt: true } }),
  ]);

  const scores = mastery.map((row) => row.masteryScore).filter(isValidScore);

  return buildPlatformProgressSource(
    'ai',
    {
      lessons: { completed: lessonsCompleted, total: lessonsTotal },
      startedLessons,
      reviewsDue,
      concepts: {
        observed: scores.length,
        ready: scores.filter((score) => meetsPrerequisite(score)).length,
      },
      lastActiveAt: latestDate(
        lastAttempt._max.createdAt,
        lastLab._max.startedAt,
        lastLab._max.completedAt,
        lastCompletion._max.completedAt,
      ),
      projects: null,
    },
    now,
  );
}
