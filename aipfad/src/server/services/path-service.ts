import 'server-only';
import { prisma } from '@/server/db/prisma';
import { veroeffentlichteAufgabe, veroeffentlichteLektion } from '@/server/content/publication';
import type { LearningPathModel } from '@/generated/prisma/models';

/**
 * Pfad-Dienst: verwaltet den individuellen Lernpfad (`LearningPath`, mit
 * Begründungstext — docs/LERNMODELL.md §7 "Pfadaufbau") und bestimmt den
 * nächsten sinnvollen Schritt. Priorität: fällige Wiederholungen → begonnene
 * Lektion → nächste offene Lektion → alles erledigt.
 *
 * Diese Ausbaustufe hat genau einen Kurs und überspringt nie eine Lektion
 * (siehe LERNMODELL.md "Grundregel") — der Pfad enthält deshalb schlicht alle
 * veröffentlichten Lektionen in Modul-/Lektionsreihenfolge, nicht personalisiert
 * gekürzt. Eine Einstufung kann das später verfeinern, ohne dass sich diese
 * Funktion ändert.
 */

export type NextStep =
  | { kind: 'review'; reviewCount: number }
  | { kind: 'lesson'; lessonSlug: string; lessonTitle: string; step: number }
  | { kind: 'all-done' };

export async function getNextStep(userId: string): Promise<NextStep> {
  // Nur Wiederholungen zu weiterhin veröffentlichten Aufgaben zählen. Wird
  // eine eingeplante Aufgabe redaktionell auf DRAFT zurückgesetzt, wies
  // `getNextStep()` sonst dauerhaft auf das Wiederholungscenter, das die
  // Aufgabe gar nicht mehr anzeigen kann — eine Sackgasse, aus der der
  // Lernpfad nicht mehr herausfand (Codex-Review auf PR #29).
  const reviewCount = await prisma.reviewQueueItem.count({
    where: {
      userId,
      completedAt: null,
      dueAt: { lte: new Date() },
      exercise: veroeffentlichteAufgabe,
    },
  });
  if (reviewCount > 0) return { kind: 'review', reviewCount };

  // Ebenso nur Lektionen, die es noch gibt: Eine begonnene Lektion, die
  // inzwischen auf DRAFT steht, führte über "Weiterlernen" auf eine
  // 404-Seite (Codex-Review auf PR #29).
  const inProgress = await prisma.lessonProgress.findFirst({
    where: { userId, state: 'IN_PROGRESS', lesson: { is: veroeffentlichteLektion } },
    include: { lesson: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (inProgress) {
    // Der zuletzt geöffnete Schritt, damit eine unterbrochene Lektion dort
    // weitergeht, wo sie verlassen wurde (Codex-Review auf PR #29). Steht
    // nichts Verwertbares darin, beginnt sie regulär bei Schritt 1.
    const gespeicherterSchritt = Number.parseInt(inProgress.lastSection, 10);
    return {
      kind: 'lesson',
      lessonSlug: inProgress.lesson.slug,
      lessonTitle: inProgress.lesson.title,
      step:
        Number.isInteger(gespeicherterSchritt) && gespeicherterSchritt > 0
          ? gespeicherterSchritt
          : 1,
    };
  }

  const completed = await prisma.lessonProgress.findMany({
    where: { userId, state: 'COMPLETED' },
    select: { lessonId: true },
  });
  const completedIds = completed.map((l) => l.lessonId);

  const nextLesson = await prisma.lesson.findFirst({
    where: { ...veroeffentlichteLektion, id: { notIn: completedIds } },
    orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
  });
  if (nextLesson) {
    return { kind: 'lesson', lessonSlug: nextLesson.slug, lessonTitle: nextLesson.title, step: 1 };
  }

  return { kind: 'all-done' };
}

/**
 * Liefert den bestehenden Pfad der Person oder legt einen neuen an — alle
 * veröffentlichten Lektionen des (einzigen) Kurses, in Reihenfolge.
 */
export async function getOrCreatePath(userId: string): Promise<LearningPathModel> {
  const existing = await prisma.learningPath.findFirst({ where: { userId } });
  if (existing) return existing;

  const course = await prisma.course.findFirst({
    where: { status: 'PUBLISHED' },
    include: {
      modules: {
        where: { status: 'PUBLISHED' },
        orderBy: { order: 'asc' },
        include: { lessons: { where: { status: 'PUBLISHED' }, orderBy: { order: 'asc' } } },
      },
    },
  });

  if (!course) {
    throw new Error('Kein veröffentlichter Kurs vorhanden — wurde die Datenbank geseedet?');
  }

  const lessonSlugs = course.modules.flatMap((mod) => mod.lessons.map((lesson) => lesson.slug));

  const path = await prisma.learningPath.create({
    data: {
      userId,
      courseId: course.id,
      title: course.title,
      lessonSlugs,
      rationale:
        'Dieser Pfad enthält alle Lektionen dieser Ausbaustufe in der vorgesehenen Reihenfolge. ' +
        'Es wird nie eine Lektion übersprungen — spätere Inhalte bauen darauf auf.',
    },
  });

  await prisma.user.update({ where: { id: userId }, data: { currentPathId: path.id } });

  return path;
}
