import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db/prisma';
import { meetsPrerequisite } from '@/domain/mastery/mastery';
import {
  buildPlatformProgressSource,
  latestDate,
  type PlatformProgressSource,
} from '@/server/platform/progress-source-http';

/**
 * LP-07 — PythonPfad als schreibgeschützte Fortschrittsquelle.
 *
 * PythonPfad bleibt das System der Wahrheit. Dieser Leser zählt nur; er ruft
 * keine schreibende Funktion auf (kein `touchLearningSession`, kein
 * Mastery-Update, keine Planung) und gibt nur Aggregate hinaus.
 *
 * Semantik (siehe docs/LEARNING-PLATFORM.md, Abschnitt 12):
 *  - Lektionen: veröffentlicht über die ganze Kette Lektion → Modul → Kurs.
 *    Zähler und Nenner meinen denselben Bestand; eine abgeschlossene Lektion
 *    eines zurückgezogenen Moduls zählt nicht mit.
 *  - Wiederholungen: dieselbe Wahrheit wie die Wiederholungsquelle (LP-05B) —
 *    eigene, offene, fällige `ReviewQueueItem` veröffentlichter Aufgaben.
 *  - Konzepte: beobachtet = eigene Kompetenzbelege (`ConceptMastery`, entsteht
 *    nur durch Bearbeitung); bereit = `meetsPrerequisite` der App. Der
 *    Rohwert 0–100 verlässt die App nicht.
 *  - Projekte: `accepted` — veröffentlichte Projekte mit abgenommener Abgabe.
 *  - Letzte Aktivität: der späteste erfasste Lernvorgang — Versuch,
 *    Lernsitzung (Aufgaben, Projekte) oder Lektionsabschluss. Bloßes Öffnen
 *    einer Seite zählt nicht.
 */

const veroeffentlichteLektion = {
  status: 'PUBLISHED',
  module: { is: { status: 'PUBLISHED', course: { is: { status: 'PUBLISHED' } } } },
} satisfies Prisma.LessonWhereInput;

/** Dieselbe Kette wie in `platform-review-source.ts`. */
const veroeffentlichteAufgabe = {
  status: 'PUBLISHED',
  OR: [{ lessonId: null }, { lesson: { is: veroeffentlichteLektion } }],
} satisfies Prisma.ExerciseWhereInput;

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
    projectsTotal,
    projectsAccepted,
    lastAttempt,
    lastSession,
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
    prisma.project.count({ where: { status: 'PUBLISHED' } }),
    prisma.projectSubmission.count({
      where: { userId, status: 'ACCEPTED', project: { status: 'PUBLISHED' } },
    }),
    prisma.attempt.aggregate({ where: { userId }, _max: { createdAt: true } }),
    prisma.learningSession.aggregate({ where: { userId }, _max: { lastActivityAt: true } }),
    prisma.lessonProgress.aggregate({ where: { userId }, _max: { completedAt: true } }),
  ]);

  const scores = mastery.map((row) => row.masteryScore).filter(isValidScore);

  return buildPlatformProgressSource(
    'python',
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
        lastSession._max.lastActivityAt,
        lastCompletion._max.completedAt,
      ),
      projects: { done: projectsAccepted, total: projectsTotal },
    },
    now,
  );
}
