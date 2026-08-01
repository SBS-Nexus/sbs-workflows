'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { requireUser } from '@/server/auth/session';
import { buildLearningPath } from '@/domain/path/learning-path';
import { evaluatePlacement, type PlacementResult } from '@/domain/placement/placement';
import { placementQuestions } from '@/content/placement';

/**
 * Server Actions für Onboarding, Einstufung und Pfadaufbau.
 */

const onboardingSchema = z.object({
  experience: z.enum(['NONE', 'TUTORIALS_ONLY', 'OTHER_LANGUAGE', 'SOME_PYTHON']),
  learningGoal: z.enum([
    'GENERAL',
    'OFFICE_AUTOMATION',
    'DATA_ANALYSIS',
    'AI_APPLICATIONS',
    'WEB_DEVELOPMENT',
    'CAREER_CHANGE',
  ]),
  dailyTimeBudget: z.coerce.number().int().min(5).max(240),
  pace: z.enum(['RELAXED', 'STEADY', 'FOCUSED']),
  selfAssessment: z.coerce.number().int().min(0).max(100),
});

export interface OnboardingState {
  ok: boolean;
  error?: string;
}

export async function saveOnboardingAction(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse({
    experience: formData.get('experience'),
    learningGoal: formData.get('learningGoal'),
    dailyTimeBudget: formData.get('dailyTimeBudget'),
    pace: formData.get('pace'),
    selfAssessment: formData.get('selfAssessment'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Bitte beantworte alle Fragen. Es gibt keine falschen Antworten.',
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      experience: parsed.data.experience,
      learningGoal: parsed.data.learningGoal,
      dailyTimeBudget: parsed.data.dailyTimeBudget,
      pace: parsed.data.pace,
      selfAssessment: parsed.data.selfAssessment,
      onboardingCompleted: true,
    },
  });

  redirect('/einstufung');
}

const placementSchema = z.object({
  answers: z.array(z.object({ questionId: z.string(), optionId: z.string() })),
});

export interface PlacementSubmitResult {
  ok: boolean;
  result?: PlacementResult;
  pathLength?: number;
  error?: string;
}

export async function submitPlacementAction(
  answers: Array<{ questionId: string; optionId: string }>,
): Promise<PlacementSubmitResult> {
  const user = await requireUser();

  const parsed = placementSchema.safeParse({ answers });
  if (!parsed.success) return { ok: false, error: 'Die Antworten konnten nicht gelesen werden.' };

  const result = evaluatePlacement(placementQuestions, parsed.data.answers);

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { learningGoal: true, dailyTimeBudget: true, pace: true },
  });

  const pathLength = await rebuildLearningPath({
    userId: user.id,
    placementScore: result.score,
    demonstratedConceptSlugs: result.demonstratedConceptSlugs,
    learningGoal: profile.learningGoal,
    dailyTimeBudget: profile.dailyTimeBudget,
    pace: profile.pace,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { placementCompleted: true, placementScore: result.score },
  });

  revalidatePath('/lernen');
  revalidatePath('/fortschritt');

  return { ok: true, result, pathLength };
}

/**
 * Baut den Lernpfad neu auf.
 *
 * Wird nach der Einstufung und nach Änderungen am Lernziel aufgerufen.
 * Bereits abgeschlossene Lektionen bleiben abgeschlossen – der Pfad bestimmt
 * nur die Reihenfolge, nicht den Fortschritt.
 */
export async function rebuildLearningPath(input: {
  userId: string;
  placementScore: number;
  demonstratedConceptSlugs: string[];
  learningGoal:
    | 'GENERAL'
    | 'OFFICE_AUTOMATION'
    | 'DATA_ANALYSIS'
    | 'AI_APPLICATIONS'
    | 'WEB_DEVELOPMENT'
    | 'CAREER_CHANGE';
  dailyTimeBudget: number;
  pace: 'RELAXED' | 'STEADY' | 'FOCUSED';
}): Promise<number> {
  const lessons = await prisma.lesson.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      module: { select: { slug: true, order: true, courseId: true } },
      concepts: { where: { isPrimary: true }, include: { concept: { select: { slug: true } } } },
    },
    orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
  });

  if (lessons.length === 0) return 0;

  const built = buildLearningPath({
    lessons: lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      moduleSlug: lesson.module.slug,
      moduleOrder: lesson.module.order,
      lessonOrder: lesson.order,
      estimatedMinutes: lesson.estimatedMinutes,
      primaryConceptSlugs: lesson.concepts.map((c) => c.concept.slug),
    })),
    placementScore: input.placementScore,
    demonstratedConceptSlugs: input.demonstratedConceptSlugs,
    learningGoal: input.learningGoal,
    dailyTimeBudget: input.dailyTimeBudget,
    pace: input.pace,
  });

  const courseId = lessons[0]?.module.courseId;
  if (!courseId) return 0;

  const existing = await prisma.learningPath.findFirst({
    where: { userId: input.userId },
    select: { id: true },
  });

  const path = existing
    ? await prisma.learningPath.update({
        where: { id: existing.id },
        data: { lessonSlugs: built.lessonSlugs, rationale: built.rationale },
        select: { id: true },
      })
    : await prisma.learningPath.create({
        data: {
          userId: input.userId,
          courseId,
          title: 'Mein Weg zu Python',
          lessonSlugs: built.lessonSlugs,
          rationale: built.rationale,
        },
        select: { id: true },
      });

  await prisma.user.update({
    where: { id: input.userId },
    data: { currentPathId: path.id },
  });

  return built.lessonSlugs.length;
}
