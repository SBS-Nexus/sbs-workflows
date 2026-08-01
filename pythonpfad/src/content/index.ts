import {
  courseSchema,
  conceptSchema,
  projectSchema,
  reviewSetSchema,
  validateCourseGraph,
  type ConceptContent,
  type ContentValidationResult,
  type CourseContent,
  type ProjectContent,
  type ReviewSetContent,
} from '@/domain/content/schema';
import { concepts } from './concepts';
import { modulDigitaleGrundlagen } from './modules/00-digitale-grundlagen';
import { modulErsteSchritte } from './modules/01-erste-schritte';
import { modulEntscheidungen } from './modules/02-entscheidungen';
import { modulSchleifen } from './modules/03-schleifen';
import { projects } from './projects';
import { reviewSets } from './review-sets';
import { placementQuestions } from './placement';
import { placementQuestionSchema, type PlacementQuestion } from '@/domain/placement/placement';
import { z } from 'zod';

/**
 * Einstiegspunkt für alle redaktionellen Inhalte.
 *
 * Inhalte liegen als typisierte TypeScript-Module vor und nicht als Markdown
 * oder JSON. Der Grund: Die Struktur einer Lektion ist reichhaltig (Worked
 * Example mit Zeilenanmerkungen, Hinweisleiter, Testfälle). Als TypeScript
 * bekommt die Redaktion beim Schreiben sofortige Rückmeldung durch den Compiler,
 * und `parseContent()` prüft zusätzlich alles, was Typen allein nicht abdecken.
 */

export const rawCourse = {
  slug: 'python-grundlagen',
  title: 'Python von Grund auf',
  description:
    'Der Kernpfad von den ersten Begriffen bis zu Schleifen: verstehen, selbst schreiben, anwenden. Jede Lektion endet mit einer Aufgabe, die du ohne Vorlage löst.',
  version: '1.0.0',
  modules: [modulDigitaleGrundlagen, modulErsteSchritte, modulEntscheidungen, modulSchleifen],
};

/**
 * Geprüfte Inhalte. Anders als die Autorenfassung unter `src/content/` sind
 * hier alle Standardwerte gesetzt – nachgelagerter Code muss deshalb nirgends
 * auf fehlende Felder prüfen.
 */
export interface ParsedContent {
  course: CourseContent;
  concepts: ConceptContent[];
  reviewSets: ReviewSetContent[];
  projects: ProjectContent[];
  placementQuestions: PlacementQuestion[];
  validation: ContentValidationResult;
}

/**
 * Prüft sämtliche Inhalte gegen die Schemata und die Beziehungsregeln.
 *
 * Wirft bei Schemafehlern. Beziehungsfehler werden im Ergebnis gemeldet, damit
 * das Seed-Skript sie gesammelt ausgeben kann statt beim ersten Problem
 * abzubrechen.
 */
export function parseContent(): ParsedContent {
  const parsedConcepts = z.array(conceptSchema).parse(concepts);
  const parsedCourse = courseSchema.parse(rawCourse);
  const parsedReviewSets = z.array(reviewSetSchema).parse(reviewSets);
  const parsedProjects = z.array(projectSchema).parse(projects);
  const parsedPlacement = z.array(placementQuestionSchema).parse(placementQuestions);

  const validation = validateCourseGraph({
    course: parsedCourse,
    concepts: parsedConcepts,
    reviewSets: parsedReviewSets,
    projects: parsedProjects,
  });

  return {
    course: parsedCourse,
    concepts: parsedConcepts,
    reviewSets: parsedReviewSets,
    projects: parsedProjects,
    placementQuestions: parsedPlacement,
    validation,
  };
}

/** Kennzahlen für Dokumentation und Tests. */
export function contentStats(): {
  modules: number;
  lessons: number;
  exercises: number;
  exerciseKinds: number;
  exerciseTypes: number;
  concepts: number;
  reviewSets: number;
  projects: number;
} {
  const lessons = rawCourse.modules.flatMap((m) => m.lessons);
  const exercises = lessons.flatMap((l) => l.exercises);

  return {
    modules: rawCourse.modules.length,
    lessons: lessons.length,
    exercises: exercises.length,
    exerciseKinds: new Set(exercises.map((e) => e.payload.kind)).size,
    exerciseTypes: new Set(exercises.map((e) => e.type)).size,
    concepts: concepts.length,
    reviewSets: reviewSets.length,
    projects: projects.length,
  };
}

export { concepts, projects, reviewSets, placementQuestions };
