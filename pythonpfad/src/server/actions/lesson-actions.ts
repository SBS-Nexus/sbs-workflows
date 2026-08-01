'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import {
  completeLesson,
  markLessonStarted,
  saveSection,
  type LessonCompletionCheck,
} from '@/server/services/lesson-service';

const completeSchema = z.object({
  lessonSlug: z.string().min(1).max(120),
  reflection: z.string().max(4000).optional(),
});

export async function completeLessonAction(
  input: z.input<typeof completeSchema>,
): Promise<{ ok: boolean; check: LessonCompletionCheck; message: string }> {
  const user = await requireUser();
  const parsed = completeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      check: { completed: false, openExerciseSlugs: [], passedCount: 0, totalCount: 0 },
      message: 'Die Anfrage konnte nicht gelesen werden.',
    };
  }

  const check = await completeLesson(user.id, parsed.data.lessonSlug, parsed.data.reflection);

  revalidatePath(`/lernen/${parsed.data.lessonSlug}`);
  revalidatePath('/lernen');
  revalidatePath('/fortschritt');

  return {
    ok: check.completed,
    check,
    message: check.completed
      ? 'Lektion abgeschlossen. Die Wiederholungen sind eingeplant.'
      : `Noch ${check.totalCount - check.passedCount} von ${check.totalCount} Aufgaben offen. Eine Lektion gilt erst als abgeschlossen, wenn du jede Aufgabe einmal selbst gelöst hast.`,
  };
}

export async function startLessonAction(lessonSlug: string): Promise<void> {
  const user = await requireUser();
  await markLessonStarted(user.id, lessonSlug);
}

export async function saveSectionAction(lessonSlug: string, section: string): Promise<void> {
  const user = await requireUser();
  await saveSection(user.id, lessonSlug, section.slice(0, 60));
}
