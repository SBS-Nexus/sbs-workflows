import 'server-only';
import { prisma } from '@/server/db/prisma';
import { z } from 'zod';
import { getPublicExercise, type PublicExercise } from './exercise-service';

/**
 * Fachdienst für Lektionen und den Lernpfad.
 */

const workedExampleSchema = z.object({
  code: z.string(),
  annotations: z.array(z.object({ line: z.number(), text: z.string() })),
  output: z.string(),
  trace: z
    .array(z.object({ step: z.number(), description: z.string(), state: z.string() }))
    .default([]),
});

const commonMistakesSchema = z.array(
  z.object({ mistake: z.string(), why: z.string(), fix: z.string() }),
);

export interface LessonView {
  id: string;
  slug: string;
  title: string;
  moduleTitle: string;
  moduleSlug: string;
  learningObjectives: string[];
  everydayProblem: string;
  mentalModel: string;
  workedExample: z.infer<typeof workedExampleSchema>;
  commonMistakes: z.infer<typeof commonMistakesSchema>;
  reflectionPrompts: string[];
  estimatedMinutes: number;
  concepts: Array<{ slug: string; name: string; description: string; isPrimary: boolean }>;
  exercises: PublicExercise[];
  progress: {
    state: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    lastSection: string;
    completedAt: Date | null;
  };
  /** Vorherige und nächste Lektion im persönlichen Pfad. */
  previousSlug: string | null;
  nextSlug: string | null;
}

export async function getLessonView(
  userId: string,
  lessonSlug: string,
): Promise<LessonView | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: lessonSlug },
    include: {
      module: { select: { title: true, slug: true } },
      concepts: { include: { concept: true } },
      exercises: { where: { status: 'PUBLISHED' }, orderBy: { order: 'asc' } },
    },
  });

  if (!lesson || lesson.status !== 'PUBLISHED') return null;

  const exercises: PublicExercise[] = [];
  for (const exercise of lesson.exercises) {
    const view = await getPublicExercise(userId, exercise.slug);
    if (view) exercises.push(view);
  }

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
  });

  const path = await prisma.learningPath.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { lessonSlugs: true },
  });

  const slugs = path?.lessonSlugs ?? [];
  const index = slugs.indexOf(lessonSlug);

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    moduleTitle: lesson.module.title,
    moduleSlug: lesson.module.slug,
    learningObjectives: lesson.learningObjectives,
    everydayProblem: lesson.everydayProblem,
    mentalModel: lesson.mentalModel,
    workedExample: workedExampleSchema.parse(lesson.workedExample),
    commonMistakes: commonMistakesSchema.parse(lesson.commonMistakes),
    reflectionPrompts: lesson.reflectionPrompts,
    estimatedMinutes: lesson.estimatedMinutes,
    concepts: lesson.concepts.map((lc) => ({
      slug: lc.concept.slug,
      name: lc.concept.name,
      description: lc.concept.description,
      isPrimary: lc.isPrimary,
    })),
    exercises,
    progress: {
      state: progress?.state ?? 'NOT_STARTED',
      lastSection: progress?.lastSection ?? 'objective',
      completedAt: progress?.completedAt ?? null,
    },
    previousSlug: index > 0 ? (slugs[index - 1] ?? null) : null,
    nextSlug: index >= 0 && index < slugs.length - 1 ? (slugs[index + 1] ?? null) : null,
  };
}

/**
 * Öffnet eine Lektion.
 *
 * Eine bereits abgeschlossene Lektion bleibt abgeschlossen. Sonst würde das
 * bloße Nachschlagen einer alten Lektion sie aus den Abschlusszahlen nehmen,
 * den nächsten Schritt im Dashboard verändern und Wiederholungssets wieder
 * sperren, deren Freigabe an abgeschlossenen Lektionen hängt.
 */
export async function markLessonStarted(userId: string, lessonSlug: string): Promise<void> {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: lessonSlug },
    select: { id: true },
  });
  if (!lesson) return;

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    select: { state: true },
  });

  if (existing?.state === 'COMPLETED') return;

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    create: { userId, lessonId: lesson.id, state: 'IN_PROGRESS' },
    update: { state: { set: 'IN_PROGRESS' } },
  });
}

/**
 * Merkt sich den zuletzt geöffneten Abschnitt, damit auf einem anderen Gerät
 * an derselben Stelle weitergelesen werden kann.
 *
 * Wie bei `markLessonStarted` bleibt eine abgeschlossene Lektion abgeschlossen –
 * der Abschnitt wird trotzdem festgehalten.
 */
export async function saveSection(
  userId: string,
  lessonSlug: string,
  section: string,
): Promise<void> {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: lessonSlug },
    select: { id: true },
  });
  if (!lesson) return;

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    select: { state: true },
  });

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    create: { userId, lessonId: lesson.id, state: 'IN_PROGRESS', lastSection: section },
    update: {
      lastSection: section,
      ...(existing?.state === 'COMPLETED' ? {} : { state: 'IN_PROGRESS' as const }),
    },
  });
}

export interface LessonCompletionCheck {
  completed: boolean;
  /** Aufgaben, die noch nicht eigenständig bestanden wurden. */
  openExerciseSlugs: string[];
  passedCount: number;
  totalCount: number;
}

/**
 * Eine Lektion gilt als abgeschlossen, wenn jede Aufgabe mindestens einmal
 * bestanden wurde. Reines Durchklicken genügt ausdrücklich nicht – und eine
 * angesehene Musterlösung zählt nicht als Bestehen.
 */
export async function checkLessonCompletion(
  userId: string,
  lessonSlug: string,
): Promise<LessonCompletionCheck> {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: lessonSlug },
    include: { exercises: { where: { status: 'PUBLISHED' }, select: { id: true, slug: true } } },
  });

  if (!lesson) return { completed: false, openExerciseSlugs: [], passedCount: 0, totalCount: 0 };

  const passed = await prisma.attempt.findMany({
    where: {
      userId,
      exerciseId: { in: lesson.exercises.map((e) => e.id) },
      result: 'PASSED',
    },
    select: { exerciseId: true },
    distinct: ['exerciseId'],
  });

  const passedIds = new Set(passed.map((p) => p.exerciseId));
  const open = lesson.exercises.filter((e) => !passedIds.has(e.id));

  return {
    completed: open.length === 0 && lesson.exercises.length > 0,
    openExerciseSlugs: open.map((e) => e.slug),
    passedCount: passedIds.size,
    totalCount: lesson.exercises.length,
  };
}

export async function completeLesson(
  userId: string,
  lessonSlug: string,
  reflection?: string,
): Promise<LessonCompletionCheck> {
  const check = await checkLessonCompletion(userId, lessonSlug);
  if (!check.completed) return check;

  const lesson = await prisma.lesson.findUnique({
    where: { slug: lessonSlug },
    select: { id: true },
  });
  if (!lesson) return check;

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    create: {
      userId,
      lessonId: lesson.id,
      state: 'COMPLETED',
      completedAt: new Date(),
      lastSection: 'reflection',
    },
    update: { state: 'COMPLETED', completedAt: new Date(), lastSection: 'reflection' },
  });

  if (reflection && reflection.trim().length > 0) {
    // Die Reflexion wird als anonymes Analyse-Ereignis gezählt, aber inhaltlich
    // nicht gespeichert: Sie dient dem eigenen Denken, nicht der Auswertung.
    await recordAnonymousEvent('lesson_reflection_written', lessonSlug);
  }

  await recordAnonymousEvent('lesson_completed', lessonSlug);

  return { ...check, completed: true };
}

/** Anonymes Produktereignis – bewusst ohne Nutzerbezug. */
export async function recordAnonymousEvent(
  eventType: string,
  contentSlug?: string,
  value?: number,
): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.analyticsEvent
    .create({
      data: {
        eventType,
        contentSlug: contentSlug ?? null,
        value: value ?? null,
        occurredOn: today,
      },
    })
    .catch(() => undefined);
}
