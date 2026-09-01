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

/**
 * Regressionstest für den Codex-Fund "Make first-time lesson starts atomic"
 * (PR #29, exakter Head fdfa141): die Absicherung des Abschlusses hatte das
 * ursprüngliche `upsert` durch ein `findUnique` + `create` ersetzt. Zwei
 * gleichzeitige Aufrufe — zwei Tabs, überlappende Navigation — sahen dann
 * beide "keine Zeile vorhanden" und liefen beide ins `create`; der
 * Unique-Index auf (userId, lessonId) ließ einen davon mit P2002 scheitern
 * und die Seite mit 500 antworten.
 */
describe('Gleichzeitiges Öffnen derselben Lektion', () => {
  const email = 'lesson-progress-race@integrationtest.local';
  let userId: string;
  let lessonId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Wettlauftest',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    userId = user.id;
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { slug: 'was-ist-aipfad' } });
    lessonId = lesson.id;
  });

  it('legt bei parallelen Erstaufrufen genau eine Zeile an, ohne zu scheitern', async () => {
    // Mit der früheren Lesen-dann-Schreiben-Folge scheiterte hier mindestens
    // einer der Aufrufe an der Unique-Bedingung.
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => startLesson(userId, lessonId)),
    );

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toEqual([]);

    const rows = await prisma.lessonProgress.findMany({ where: { userId, lessonId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.state).toBe('IN_PROGRESS');
  });

  it('behält COMPLETED auch bei parallelen Aufrufen bei', async () => {
    await prisma.lessonProgress.create({
      data: { userId, lessonId, state: 'COMPLETED', completedAt: new Date() },
    });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => startLesson(userId, lessonId)),
    );
    expect(results.filter((r) => r.status === 'rejected')).toEqual([]);

    const row = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId } },
    });
    expect(row.state).toBe('COMPLETED');
  });
});

/**
 * Regressionstests für zwei Codex-Funde auf PR #29 (Head f8931c9):
 *  - "Preserve the original lesson completion timestamp": Der
 *    Reflexionsschritt ruft `checkLessonCompletion()` bei jedem Aufruf erneut
 *    auf. Bei einer bereits abgeschlossenen Lektion ist die Bedingung
 *    weiterhin erfüllt, sodass der ursprüngliche Abschlusszeitpunkt jedes Mal
 *    durch den aktuellen ersetzt wurde.
 *  - "Resume an in-progress lesson at its saved step": `lastSection` wurde
 *    nirgends geschrieben, jede unterbrochene Lektion begann wieder bei
 *    Schritt 1.
 */
describe('Abschlusszeitpunkt und zuletzt geöffneter Schritt', () => {
  const email = 'lesson-progress-details@integrationtest.local';
  let userId: string;
  let lessonId: string;
  let exerciseSlug: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Detailtest',
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
    exerciseSlug = exercise.slug;
  });

  it('behält den ursprünglichen Abschlusszeitpunkt bei erneuter Prüfung', async () => {
    await startLesson(userId, lessonId);
    const exercise = await prisma.exercise.findUniqueOrThrow({ where: { slug: exerciseSlug } });
    const payload = exercise.payload as { correctOptionId: string };
    await submitAttempt(userId, {
      exerciseSlug,
      submission: { kind: 'singleChoice', optionId: payload.correctOptionId },
      durationMs: 1000,
      isReview: false,
    });

    await checkLessonCompletion(userId, lessonId);
    const ersterAbschluss = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId } },
    });
    expect(ersterAbschluss.completedAt).not.toBeNull();

    // Erneutes Öffnen des Reflexionsschritts ruft die Prüfung wieder auf.
    await new Promise((resolve) => setTimeout(resolve, 25));
    await checkLessonCompletion(userId, lessonId);

    const nachErneuterPruefung = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId } },
    });
    expect(nachErneuterPruefung.completedAt).toEqual(ersterAbschluss.completedAt);
  });

  it('merkt sich den zuletzt geöffneten Schritt', async () => {
    await startLesson(userId, lessonId, 1);
    await startLesson(userId, lessonId, 3);

    const fortschritt = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId } },
    });
    expect(fortschritt.lastSection).toBe('3');
  });

  it('rührt den gemerkten Schritt einer abgeschlossenen Lektion nicht an', async () => {
    await startLesson(userId, lessonId, 2);
    await prisma.lessonProgress.update({
      where: { userId_lessonId: { userId, lessonId } },
      data: { state: 'COMPLETED', completedAt: new Date() },
    });

    await startLesson(userId, lessonId, 1);

    const fortschritt = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId } },
    });
    expect(fortschritt.state).toBe('COMPLETED');
    expect(fortschritt.lastSection).toBe('2');
  });
});
