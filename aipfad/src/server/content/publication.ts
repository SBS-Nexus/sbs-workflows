import 'server-only';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Veröffentlichungsstatus über die gesamte Inhaltskette.
 *
 * Jede Ebene der Inhaltshierarchie — Course, CourseModule, Lesson, Exercise —
 * trägt einen eigenen `ContentStatus`. Ein Inhalt ist erst dann lernbar, wenn
 * ALLE Ebenen darüber ebenfalls veröffentlicht sind. Wurde nur ein Modul auf
 * `DRAFT` zurückgesetzt, blieben seine Lektionen und Aufgaben sonst über
 * Pfad, Bibliothek und Wiederholung erreichbar, obwohl die Redaktion das
 * Modul zurückgezogen hat (Codex-Review auf PR #29).
 *
 * Die Bedingungen stehen hier zentral, damit "veröffentlicht" an allen
 * Lesepfaden dasselbe bedeutet und eine neue Ebene nur an einer Stelle
 * ergänzt werden muss — statt als wiederholtes Prädikat in jedem Loader.
 */

/** Ein Modul zählt als veröffentlicht, wenn auch sein Kurs es ist. */
export const veroeffentlichtesModul = {
  status: 'PUBLISHED',
  course: { status: 'PUBLISHED' },
} satisfies Prisma.CourseModuleWhereInput;

/** Eine Lektion samt Modul und Kurs. */
export const veroeffentlichteLektion = {
  status: 'PUBLISHED',
  module: { is: veroeffentlichtesModul },
} satisfies Prisma.LessonWhereInput;

/**
 * Eine Aufgabe samt Lektion, Modul und Kurs.
 *
 * `Exercise.lessonId` ist optional. Eine Aufgabe ohne Lektion hat keine
 * Vorfahren, über die sie zurückgezogen werden könnte — für sie entscheidet
 * deshalb ihr eigener Status.
 */
export const veroeffentlichteAufgabe = {
  status: 'PUBLISHED',
  OR: [{ lessonId: null }, { lesson: { is: veroeffentlichteLektion } }],
} satisfies Prisma.ExerciseWhereInput;
