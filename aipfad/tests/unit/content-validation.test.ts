import { describe, expect, it } from 'vitest';
import {
  courseSchema,
  conceptSchema,
  labSchema,
  validateCourseGraph,
  type ConceptContent,
  type ConceptDraft,
} from '@/domain/content/schema';
import { course } from '@/content/course';
import { concepts as conceptDrafts } from '@/content/concepts';
import { labs as labDrafts } from '@/content/labs';

function parseAll() {
  const parsedCourse = courseSchema.parse(course);
  const parsedConcepts: ConceptContent[] = conceptDrafts.map((c) => conceptSchema.parse(c));
  const parsedLabs = labDrafts.map((l) => labSchema.parse(l));
  return { parsedCourse, parsedConcepts, parsedLabs };
}

describe('AIPfad content (Stage 0/1/4/5)', () => {
  it('parses and validates without errors', () => {
    const { parsedCourse, parsedConcepts, parsedLabs } = parseAll();
    const result = validateCourseGraph({
      course: parsedCourse,
      concepts: parsedConcepts,
      labs: parsedLabs,
    });
    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('has no cycles in the concept prerequisite graph', () => {
    const { parsedConcepts } = parseAll();
    const bySlug = new Map(parsedConcepts.map((c) => [c.slug, c]));
    const visit = (slug: string, trail: Set<string>): void => {
      expect(trail.has(slug)).toBe(false);
      const next = new Set(trail).add(slug);
      for (const pre of bySlug.get(slug)?.prerequisiteSlugs ?? []) {
        if (bySlug.has(pre)) visit(pre, next);
      }
    };
    for (const concept of parsedConcepts) visit(concept.slug, new Set());
  });

  it('rejects placeholder text via validateCourseGraph', () => {
    const { parsedCourse, parsedConcepts, parsedLabs } = parseAll();
    const withPlaceholder = structuredClone(parsedCourse);
    const firstLesson = withPlaceholder.modules[0]?.lessons[0];
    if (!firstLesson) throw new Error('Testfixtur: keine Lektion vorhanden.');
    firstLesson.everydayProblem = 'TODO: Platzhaltertext für diese Lektion einfügen.';

    const result = validateCourseGraph({
      course: withPlaceholder,
      concepts: parsedConcepts,
      labs: parsedLabs,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes('Platzhaltertext'))).toBe(true);
  });

  it('detects a concept-cycle if one is introduced', () => {
    const { parsedConcepts, parsedCourse, parsedLabs } = parseAll();
    const withCycle: ConceptContent[] = structuredClone(parsedConcepts);
    const [first, second] = withCycle;
    if (!first || !second) throw new Error('Testfixtur: zu wenige Konzepte.');
    first.prerequisiteSlugs = [...first.prerequisiteSlugs, second.slug];
    second.prerequisiteSlugs = [...second.prerequisiteSlugs, first.slug];

    const result = validateCourseGraph({
      course: parsedCourse,
      concepts: withCycle,
      labs: parsedLabs,
    });
    expect(result.issues.some((i) => i.message.includes('Zyklische Voraussetzung'))).toBe(true);
  });

  it('every lesson has a scaffold-level ≥4 exercise or is flagged with a warning', () => {
    const { parsedCourse } = parseAll();
    for (const mod of parsedCourse.modules) {
      for (const lesson of mod.lessons) {
        const hasReducedScaffold = lesson.exercises.some((e) => e.scaffoldLevel >= 4);
        expect(hasReducedScaffold).toBe(true);
      }
    }
  });

  it('every lesson has at least two reflection prompts', () => {
    const { parsedCourse } = parseAll();
    for (const mod of parsedCourse.modules) {
      for (const lesson of mod.lessons) {
        expect(lesson.reflectionPrompts.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('has a real, non-placeholder concept graph with all four modules represented', () => {
    const { parsedCourse } = parseAll();
    expect(parsedCourse.modules).toHaveLength(4);
    const totalLessons = parsedCourse.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    expect(totalLessons).toBeGreaterThanOrEqual(10);
  });

  it('placement-relevant concept slugs referenced in content actually exist', () => {
    const { parsedConcepts } = parseAll();
    const slugs = new Set(parsedConcepts.map((c) => c.slug));
    // Stichprobe: Konzepte, auf die die Startseite/Nachschlagen-Seite verweisen.
    for (const slug of ['context-window', 'token', 'halluzination', 'prompt-ziel-und-kontext']) {
      expect(slugs.has(slug)).toBe(true);
    }
  });

  it('draft concepts have unique slugs', () => {
    const slugs = (conceptDrafts as ConceptDraft[]).map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
