import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { getPublicExercise } from '@/server/services/exercise-service';
import { getLessonBySlug, startLesson } from '@/server/services/lesson-service';
import { getNextStep } from '@/server/services/path-service';

/**
 * Ein Inhalt ist nur lernbar, wenn seine VOLLSTÄNDIGE Kette veröffentlicht
 * ist — Kurs, Modul, Lektion, Aufgabe. Vor der Behebung prüften die Loader
 * jeweils nur die eigene Ebene: Ein auf `DRAFT` zurückgesetztes Modul nahm
 * seine Lektionen und Aufgaben nicht mit, sie blieben über Pfad, Bibliothek
 * und Wiederholung erreichbar (Codex-Review auf PR #29).
 */
describe('Veröffentlichung über die gesamte Inhaltskette', () => {
  const email = 'content-publication@integrationtest.local';
  const lessonSlug = 'was-ist-aipfad';
  const exerciseSlug = 'was-ist-aipfad-single-choice';
  let userId: string;
  let lessonId: string;
  let moduleId: string;
  let exerciseId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Veröffentlichungstest',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    userId = user.id;

    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { slug: lessonSlug } });
    lessonId = lesson.id;
    moduleId = lesson.moduleId;
    const exercise = await prisma.exercise.findUniqueOrThrow({ where: { slug: exerciseSlug } });
    exerciseId = exercise.id;
  });

  afterEach(async () => {
    // Inhalte sind geteilte Testdaten — Ausgangszustand wiederherstellen.
    await prisma.exercise.updateMany({ data: { status: 'PUBLISHED' } });
    await prisma.lesson.updateMany({ data: { status: 'PUBLISHED' } });
    await prisma.courseModule.updateMany({ data: { status: 'PUBLISHED' } });
    await prisma.course.updateMany({ data: { status: 'PUBLISHED' } });
    await prisma.user.deleteMany({ where: { email } });
  });

  it('A) vollständig veröffentlicht: Lektion und Aufgabe sind erreichbar', async () => {
    await expect(getLessonBySlug(lessonSlug)).resolves.not.toBeNull();
    await expect(getPublicExercise(exerciseSlug)).resolves.not.toBeNull();
  });

  it('B) Modul auf DRAFT: Lektion und Aufgabe sind NICHT erreichbar', async () => {
    await prisma.courseModule.update({ where: { id: moduleId }, data: { status: 'DRAFT' } });

    await expect(getLessonBySlug(lessonSlug)).resolves.toBeNull();
    await expect(getPublicExercise(exerciseSlug)).resolves.toBeNull();
  });

  it('C) Lektion auf DRAFT: Lektion und Aufgabe sind NICHT erreichbar', async () => {
    await prisma.lesson.update({ where: { id: lessonId }, data: { status: 'DRAFT' } });

    await expect(getLessonBySlug(lessonSlug)).resolves.toBeNull();
    await expect(getPublicExercise(exerciseSlug)).resolves.toBeNull();
  });

  it('D) Aufgabe auf DRAFT: die Aufgabe ist NICHT erreichbar', async () => {
    await prisma.exercise.update({ where: { id: exerciseId }, data: { status: 'DRAFT' } });

    await expect(getPublicExercise(exerciseSlug)).resolves.toBeNull();
    // Die Lektion selbst bleibt erreichbar, führt die Aufgabe aber nicht mehr.
    const lesson = await getLessonBySlug(lessonSlug);
    expect(lesson?.exercises.some((e) => e.id === exerciseId)).toBe(false);
  });

  it('Kurs auf DRAFT: nichts darunter ist erreichbar', async () => {
    await prisma.course.updateMany({ data: { status: 'DRAFT' } });

    await expect(getLessonBySlug(lessonSlug)).resolves.toBeNull();
    await expect(getPublicExercise(exerciseSlug)).resolves.toBeNull();
  });

  it('E) begonnene Lektion unter zurückgezogenem Modul wird nicht fortgesetzt', async () => {
    await startLesson(userId, lessonId, 2);
    const vorher = await getNextStep(userId);
    expect(vorher.kind === 'lesson' && vorher.lessonSlug).toBe(lessonSlug);

    await prisma.courseModule.update({ where: { id: moduleId }, data: { status: 'DRAFT' } });

    const nachher = await getNextStep(userId);
    expect(nachher.kind === 'lesson' && nachher.lessonSlug).not.toBe(lessonSlug);
  });

  it('F) fällige Wiederholung unter zurückgezogenem Modul wird nicht angeboten', async () => {
    await prisma.reviewQueueItem.create({
      data: { userId, exerciseId, dueAt: new Date(Date.now() - 60_000) },
    });
    const vorher = await getNextStep(userId);
    expect(vorher.kind).toBe('review');

    await prisma.courseModule.update({ where: { id: moduleId }, data: { status: 'DRAFT' } });

    const nachher = await getNextStep(userId);
    expect(nachher.kind).not.toBe('review');
  });
});
