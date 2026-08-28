import { describe, expect, it, beforeEach } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { startLesson, checkLessonCompletion } from '@/server/services/lesson-service';
import { submitAttempt } from '@/server/services/exercise-service';

/**
 * Regressionstest für den Codex-Fund "Completed Lesson Regression" (PR #29):
 * `startLesson()` durfte eine bereits `COMPLETED` Lektion nicht mehr auf
 * `IN_PROGRESS` zurückstufen, nur weil sie erneut geöffnet wird.
 */
describe('Lektionsfortschritt bleibt beim erneuten Öffnen erhalten', () => {
  const email = 'lesson-progress@integrationtest.local';
  let userId: string;
  let lessonId: string;
  let exerciseId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Lektionstest',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    userId = user.id;

    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { slug: 'was-ist-aipfad' },
      include: { exercises: true },
    });
    lessonId = lesson.id;
    const exercise = lesson.exercises[0];
    if (!exercise) throw new Error('Testfixtur: Lektion hat keine Aufgabe.');
    exerciseId = exercise.id;
  });

  it('bleibt COMPLETED und behält completedAt, wenn eine abgeschlossene Lektion erneut geöffnet wird', async () => {
    await startLesson(userId, lessonId);

    // Lektion abschließen: die einzige Aufgabe bestehen.
    const exercise = await prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId } });
    const payload = exercise.payload as { correctOptionId: string };
    await submitAttempt(userId, {
      exerciseSlug: exercise.slug,
      submission: { kind: 'singleChoice', optionId: payload.correctOptionId },
      durationMs: 1000,
      isReview: false,
    });
    const completion = await checkLessonCompletion(userId, lessonId);
    expect(completion.completed).toBe(true);

    const afterCompletion = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId } },
    });
    expect(afterCompletion.state).toBe('COMPLETED');
    expect(afterCompletion.completedAt).not.toBeNull();
    const completedAt = afterCompletion.completedAt;

    // Erneutes Öffnen (z. B. zum Nachschlagen) darf den Abschluss nicht zurücksetzen.
    await startLesson(userId, lessonId);

    const afterReopen = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId } },
    });
    expect(afterReopen.state).toBe('COMPLETED');
    expect(afterReopen.completedAt).toEqual(completedAt);

    const completionAfterReopen = await checkLessonCompletion(userId, lessonId);
    expect(completionAfterReopen.completed).toBe(true);
  });

  it('legt eine neue Lektion normal als IN_PROGRESS an', async () => {
    await startLesson(userId, lessonId);
    const progress = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId } },
    });
    expect(progress.state).toBe('IN_PROGRESS');
  });
});
