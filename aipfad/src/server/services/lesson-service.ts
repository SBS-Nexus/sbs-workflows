import 'server-only';
import { prisma } from '@/server/db/prisma';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Lektions-Dienst: lädt veröffentlichte Lektionen samt Konzepten/Aufgaben und
 * verwaltet den Fortschritt (`LessonProgress`).
 */

const lessonWithRelations = {
  include: {
    module: { include: { course: true } },
    concepts: { include: { concept: true } },
    exercises: { where: { status: 'PUBLISHED' as const }, orderBy: { order: 'asc' as const } },
  },
} satisfies Prisma.LessonDefaultArgs;

export type LessonWithRelations = Prisma.LessonGetPayload<typeof lessonWithRelations>;

export async function getLessonBySlug(slug: string): Promise<LessonWithRelations | null> {
  const lesson = await prisma.lesson.findUnique({ where: { slug }, ...lessonWithRelations });
  if (!lesson || lesson.status !== 'PUBLISHED') return null;
  return lesson;
}

/**
 * Markiert eine Lektion als begonnen. Stuft eine bereits `COMPLETED`
 * Lektion NICHT zurück auf `IN_PROGRESS` — erneutes Öffnen zum
 * Nachschlagen darf den erreichten Abschluss nicht rückgängig machen
 * (siehe Codex-Review auf PR #29: bloßes Wiederöffnen setzte den
 * Fortschritt zurück und ließ die Lektion in `getNextStep` erneut
 * auftauchen).
 */
export async function startLesson(userId: string, lessonId: string): Promise<void> {
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  if (existing?.state === 'COMPLETED') return;

  if (existing) {
    await prisma.lessonProgress.update({
      where: { userId_lessonId: { userId, lessonId } },
      data: { state: 'IN_PROGRESS' },
    });
    return;
  }

  await prisma.lessonProgress.create({
    data: { userId, lessonId, state: 'IN_PROGRESS' },
  });
}

export interface LessonCompletionCheck {
  completed: boolean;
  totalExercises: number;
  passedExercises: number;
}

/** Eine Lektion gilt als abgeschlossen, wenn jede Aufgabe mindestens einmal bestanden wurde. */
export async function checkLessonCompletion(
  userId: string,
  lessonId: string,
): Promise<LessonCompletionCheck> {
  const exercises = await prisma.exercise.findMany({
    where: { lessonId, status: 'PUBLISHED' },
    select: { id: true },
  });

  if (exercises.length === 0) {
    return { completed: false, totalExercises: 0, passedExercises: 0 };
  }

  const passedAttempts = await prisma.attempt.findMany({
    where: {
      userId,
      exerciseId: { in: exercises.map((e) => e.id) },
      result: { in: ['PASSED'] },
    },
    select: { exerciseId: true },
    distinct: ['exerciseId'],
  });

  const passedExercises = passedAttempts.length;
  const completed = passedExercises >= exercises.length;

  if (completed) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, state: 'COMPLETED', completedAt: new Date() },
      update: { state: 'COMPLETED', completedAt: new Date() },
    });
  }

  return { completed, totalExercises: exercises.length, passedExercises };
}
