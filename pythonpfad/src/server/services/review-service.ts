import 'server-only';
import { prisma } from '@/server/db/prisma';
import { buildReviewBatch, formatInterval } from '@/domain/scheduling/spaced-repetition';
import { getPublicExercise, type PublicExercise } from './exercise-service';

/**
 * Fachdienst für das Wiederholungscenter.
 *
 * Zwei Quellen fließen zusammen:
 *  - individuell geplante Wiederholungen (ReviewQueueItem, aus dem Scheduler)
 *  - kuratierte Wiederholungssets, die mehrere Lektionen mischen
 */

export interface DueReview {
  exerciseSlug: string;
  exerciseTitle: string;
  lessonSlug: string | null;
  lessonTitle: string | null;
  dueAt: Date;
  overdueDays: number;
  repetition: number;
  reason: string;
  conceptNames: string[];
}

export interface ReviewCenterData {
  due: DueReview[];
  /** Bald fällige Wiederholungen – nur zur Orientierung, ohne Druck. */
  upcoming: Array<{ exerciseTitle: string; dueAt: Date; inDays: string }>;
  sets: Array<{
    slug: string;
    title: string;
    description: string;
    available: boolean;
    blockedReason: string | null;
    exerciseCount: number;
  }>;
  totalScheduled: number;
}

export async function getReviewCenterData(
  userId: string,
  now: Date = new Date(),
): Promise<ReviewCenterData> {
  const items = await prisma.reviewQueueItem.findMany({
    where: { userId },
    include: {
      exercise: {
        include: {
          lesson: { select: { slug: true, title: true } },
          concepts: { include: { concept: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { dueAt: 'asc' },
  });

  const masteryRows = await prisma.conceptMastery.findMany({
    where: { userId },
    select: { conceptId: true, masteryScore: true },
  });
  const masteryByConcept = new Map(masteryRows.map((m) => [m.conceptId, m.masteryScore]));

  const candidates = items.map((item, index) => ({
    exerciseId: item.exerciseId,
    conceptIds: item.exercise.concepts.map((c) => c.conceptId),
    dueAt: item.dueAt,
    masteryScore: Math.min(
      ...item.exercise.concepts.map((c) => masteryByConcept.get(c.conceptId) ?? 0),
      100,
    ),
    introducedIndex: index,
  }));

  const batch = buildReviewBatch(candidates, { now, maxItems: 12 });
  const itemById = new Map(items.map((i) => [i.exerciseId, i]));

  const due: DueReview[] = batch
    .map((candidate) => itemById.get(candidate.exerciseId))
    .filter((item): item is (typeof items)[number] => Boolean(item))
    .map((item) => ({
      exerciseSlug: item.exercise.slug,
      exerciseTitle: item.exercise.title,
      lessonSlug: item.exercise.lesson?.slug ?? null,
      lessonTitle: item.exercise.lesson?.title ?? null,
      dueAt: item.dueAt,
      overdueDays: Math.max(
        0,
        Math.floor((now.getTime() - item.dueAt.getTime()) / (24 * 3600 * 1000)),
      ),
      repetition: item.repetition,
      reason: item.reason,
      conceptNames: item.exercise.concepts.map((c) => c.concept.name),
    }));

  const upcoming = items
    .filter((item) => item.dueAt.getTime() > now.getTime())
    .slice(0, 5)
    .map((item) => ({
      exerciseTitle: item.exercise.title,
      dueAt: item.dueAt,
      inDays: formatInterval((item.dueAt.getTime() - now.getTime()) / (24 * 3600 * 1000)),
    }));

  // --- Kuratierte Sets ------------------------------------------------------
  const sets = await prisma.reviewSet.findMany({
    where: { status: 'PUBLISHED' },
    include: { items: { select: { exerciseId: true } } },
  });

  const completedLessons = await prisma.lessonProgress.findMany({
    where: { userId, state: 'COMPLETED' },
    include: { lesson: { select: { slug: true } } },
  });
  const completedSlugs = new Map(
    completedLessons.map((p) => [p.lesson.slug, p.completedAt ?? p.updatedAt]),
  );

  const setViews = sets.map((set) => {
    const missing = set.requiredLessonSlugs.filter((slug) => !completedSlugs.has(slug));

    if (missing.length > 0) {
      return {
        slug: set.slug,
        title: set.title,
        description: set.description,
        available: false,
        blockedReason:
          missing.length === 1
            ? 'Noch eine Lektion aus diesem Bereich offen.'
            : `Noch ${missing.length} Lektionen aus diesem Bereich offen.`,
        exerciseCount: set.items.length,
      };
    }

    const lastCompleted = Math.max(
      ...set.requiredLessonSlugs.map((slug) => completedSlugs.get(slug)?.getTime() ?? 0),
    );
    const daysSince = (now.getTime() - lastCompleted) / (24 * 3600 * 1000);

    if (daysSince < set.unlockAfterDays) {
      const remaining = Math.ceil(set.unlockAfterDays - daysSince);
      return {
        slug: set.slug,
        title: set.title,
        description: set.description,
        available: false,
        blockedReason: `Wird in ${remaining === 1 ? 'einem Tag' : `${remaining} Tagen`} frei. Ein Abstand macht die Wiederholung wirksamer.`,
        exerciseCount: set.items.length,
      };
    }

    return {
      slug: set.slug,
      title: set.title,
      description: set.description,
      available: true,
      blockedReason: null,
      exerciseCount: set.items.length,
    };
  });

  return { due, upcoming, sets: setViews, totalScheduled: items.length };
}

export async function getReviewSetExercises(
  userId: string,
  setSlug: string,
): Promise<{ title: string; description: string; exercises: PublicExercise[] } | null> {
  const set = await prisma.reviewSet.findUnique({
    where: { slug: setSlug },
    include: {
      items: { include: { exercise: { select: { slug: true } } }, orderBy: { order: 'asc' } },
    },
  });

  if (!set || set.status !== 'PUBLISHED') return null;

  const exercises: PublicExercise[] = [];
  for (const item of set.items) {
    const view = await getPublicExercise(userId, item.exercise.slug);
    if (view) exercises.push(view);
  }

  return { title: set.title, description: set.description, exercises };
}

/** Markiert eine geplante Wiederholung als erledigt. */
export async function completeReviewItem(userId: string, exerciseSlug: string): Promise<void> {
  const exercise = await prisma.exercise.findUnique({
    where: { slug: exerciseSlug },
    select: { id: true },
  });
  if (!exercise) return;

  await prisma.reviewQueueItem
    .update({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
      data: { completedAt: new Date() },
    })
    .catch(() => undefined);
}
