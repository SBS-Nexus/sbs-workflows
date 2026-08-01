import { z } from 'zod';
import { exercisePayloadSchema, hintSchema, testCaseSchema } from './exercise-payload';

/**
 * Zod-Schemata für redaktionelle Inhalte.
 *
 * Die Inhalte liegen als typisierte TypeScript-Module unter `src/content/` und
 * werden beim Seeding gegen diese Schemata geprüft. Dadurch schlägt fehlerhafter
 * Inhalt beim Build bzw. beim Seeding fehl und nicht erst im Browser.
 *
 * `validateCourse()` prüft zusätzlich Beziehungen, die ein reines Schema nicht
 * abbilden kann (existierende Konzepte, eindeutige Slugs, sinnvolle Hinweisleiter,
 * Vorhandensein von Tests bei Code-Aufgaben).
 */

export const contentStatusSchema = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);

export const exerciseTypeSchema = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'FREE_TEXT',
  'PREDICT_OUTPUT',
  'PARSONS',
  'CODE_COMPLETION',
  'FIND_ERROR',
  'EXPLAIN_ERROR',
  'WRITE_CODE',
  'REFACTOR',
  'WRITE_TEST',
  'COMPARE_SOLUTION',
  'MINI_PROJECT',
  'SPACED_REVIEW',
  'TRANSFER',
]);

export type ExerciseTypeName = z.infer<typeof exerciseTypeSchema>;

/** Aufgabentypen, die zwingend ausführbaren Code erfordern. */
export const CODE_EXERCISE_TYPES: ReadonlySet<ExerciseTypeName> = new Set([
  'WRITE_CODE',
  'REFACTOR',
  'WRITE_TEST',
  'MINI_PROJECT',
]);

export const conceptSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug: nur Kleinbuchstaben, Ziffern und Bindestriche'),
  name: z.string().min(2),
  description: z.string().min(20),
  difficulty: z.number().int().min(1).max(5),
  prerequisiteSlugs: z.array(z.string()).default([]),
});

export type ConceptContent = z.infer<typeof conceptSchema>;
export type ConceptDraft = z.input<typeof conceptSchema>;

export const exerciseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: exerciseTypeSchema,
  title: z.string().min(3),
  prompt: z.string().min(10),
  payload: exercisePayloadSchema,
  starterCode: z.string().optional(),
  solution: z.string().optional(),
  solutionNotes: z.string().optional(),
  publicTests: z.array(testCaseSchema).default([]),
  hiddenTests: z.array(testCaseSchema).default([]),
  hints: z.array(hintSchema).default([]),
  difficulty: z.number().int().min(1).max(5).default(2),
  /** Gerüst-Stufe nach Abschnitt 3.4 des Lernmodells: 1 = viel Hilfe, 6 = keine. */
  scaffoldLevel: z.number().int().min(1).max(6).default(3),
  transferContext: z.string().optional(),
  conceptSlugs: z.array(z.string()).min(1),
  status: contentStatusSchema.default('PUBLISHED'),
});

export type ExerciseContent = z.infer<typeof exerciseSchema>;
/** Autorensicht: Felder mit Standardwerten dürfen weggelassen werden. */
export type ExerciseDraft = z.input<typeof exerciseSchema>;

export const workedExampleSchema = z.object({
  code: z.string().min(10),
  /** Zeilenkommentare: 1-basierte Zeilennummer -> Erklärung. */
  annotations: z
    .array(
      z.object({
        line: z.number().int().min(1),
        text: z.string().min(5),
      }),
    )
    .min(1),
  /** Was das Programm ausgibt, wenn man es laufen lässt. */
  output: z.string(),
  /** Schritt-für-Schritt-Nachvollzug (Code-Tracing, Abschnitt D/E). */
  trace: z
    .array(
      z.object({
        step: z.number().int().min(1),
        description: z.string().min(5),
        state: z.string().min(1),
      }),
    )
    .default([]),
});

export const lessonSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  learningObjectives: z.array(z.string().min(20)).min(1),
  everydayProblem: z.string().min(40),
  mentalModel: z.string().min(40),
  workedExample: workedExampleSchema,
  reflectionPrompts: z.array(z.string().min(10)).min(2),
  commonMistakes: z
    .array(
      z.object({
        mistake: z.string().min(10),
        why: z.string().min(10),
        fix: z.string().min(10),
      }),
    )
    .min(1),
  estimatedMinutes: z.number().int().min(3).max(60),
  contentVersion: z.string().default('1.0.0'),
  status: contentStatusSchema.default('PUBLISHED'),
  /** Konzepte, die diese Lektion neu einführt. */
  primaryConceptSlugs: z.array(z.string()).min(1),
  /** Konzepte, die vorausgesetzt und mit geübt werden (Interleaving). */
  supportingConceptSlugs: z.array(z.string()).default([]),
  prerequisiteConceptSlugs: z.array(z.string()).default([]),
  exercises: z.array(exerciseSchema).min(1),
});

export type LessonContent = z.infer<typeof lessonSchema>;
export type LessonDraft = z.input<typeof lessonSchema>;

export const moduleSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  summary: z.string().min(30),
  rationale: z.string().min(30),
  prerequisiteModuleSlugs: z.array(z.string()).default([]),
  status: contentStatusSchema.default('PUBLISHED'),
  lessons: z.array(lessonSchema).min(1),
});

export type ModuleContent = z.infer<typeof moduleSchema>;
export type ModuleDraft = z.input<typeof moduleSchema>;

export const courseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  description: z.string().min(30),
  version: z.string().default('1.0.0'),
  modules: z.array(moduleSchema).min(1),
});

export type CourseContent = z.infer<typeof courseSchema>;
export type CourseDraft = z.input<typeof courseSchema>;

export const reviewSetSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  description: z.string().min(20),
  unlockAfterDays: z.number().int().min(0).max(90),
  requiredLessonSlugs: z.array(z.string()).min(1),
  exerciseSlugs: z.array(z.string()).min(3),
});

export type ReviewSetContent = z.infer<typeof reviewSetSchema>;
export type ReviewSetDraft = z.input<typeof reviewSetSchema>;

export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  description: z.string().min(40),
  difficulty: z.number().int().min(1).max(5),
  requirements: z.array(z.string().min(10)).min(3),
  milestones: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(3),
        description: z.string().min(20),
        /** IDs der Tests, die diesen Meilenstein belegen. */
        testIds: z.array(z.string()).min(1),
        hint: z.string().min(10),
      }),
    )
    .min(2),
  starterFiles: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
        readOnly: z.boolean().default(false),
      }),
    )
    .min(1),
  rubric: z
    .array(
      z.object({
        criterion: z.string().min(3),
        description: z.string().min(20),
      }),
    )
    .min(3),
  tests: z.array(testCaseSchema).min(2),
  estimatedMinutes: z.number().int().min(10).max(600),
  conceptSlugs: z.array(z.string()).min(1),
  status: contentStatusSchema.default('PUBLISHED'),
});

export type ProjectContent = z.infer<typeof projectSchema>;
export type ProjectDraft = z.input<typeof projectSchema>;

// ---------------------------------------------------------------------------
// Beziehungsprüfungen (das, was Zod allein nicht abdeckt)
// ---------------------------------------------------------------------------

export interface ContentIssue {
  severity: 'error' | 'warning';
  where: string;
  message: string;
}

export interface ContentValidationResult {
  ok: boolean;
  issues: ContentIssue[];
}

/** Platzhalter, die in veröffentlichten Inhalten nicht vorkommen dürfen. */
const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /coming soon/i,
  /lesson content here/i,
  /platzhalter/i,
];

function checkPlaceholders(where: string, text: string, issues: ContentIssue[]): void {
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        severity: 'error',
        where,
        message: `Platzhaltertext gefunden (${pattern.source}). Veröffentlichte Inhalte müssen ausformuliert sein.`,
      });
      return;
    }
  }
}

/**
 * Prüft einen Kurs samt Konzepten, Wiederholungssets und Projekten auf
 * Konsistenz. Wird vom Seed-Skript, vom Adminbereich (vor "Published") und von
 * den Unit-Tests verwendet.
 */
export function validateCourseGraph(input: {
  course: CourseContent;
  concepts: ConceptContent[];
  reviewSets: ReviewSetContent[];
  projects: ProjectContent[];
}): ContentValidationResult {
  const issues: ContentIssue[] = [];
  const conceptSlugs = new Set(input.concepts.map((c) => c.slug));
  const lessonSlugs = new Set<string>();
  const exerciseSlugs = new Set<string>();
  const introducedConcepts = new Set<string>();

  // --- Konzeptgraph ---------------------------------------------------------
  for (const concept of input.concepts) {
    for (const pre of concept.prerequisiteSlugs) {
      if (!conceptSlugs.has(pre)) {
        issues.push({
          severity: 'error',
          where: `concept:${concept.slug}`,
          message: `Voraussetzung "${pre}" existiert nicht.`,
        });
      }
      if (pre === concept.slug) {
        issues.push({
          severity: 'error',
          where: `concept:${concept.slug}`,
          message: 'Ein Konzept darf nicht seine eigene Voraussetzung sein.',
        });
      }
    }
  }
  detectCycles(input.concepts, issues);

  // --- Module und Lektionen -------------------------------------------------
  const moduleSlugs = new Set(input.course.modules.map((m) => m.slug));
  for (const mod of input.course.modules) {
    for (const pre of mod.prerequisiteModuleSlugs) {
      if (!moduleSlugs.has(pre)) {
        issues.push({
          severity: 'error',
          where: `module:${mod.slug}`,
          message: `Vorausgesetztes Modul "${pre}" existiert nicht.`,
        });
      }
    }

    for (const lesson of mod.lessons) {
      const where = `lesson:${lesson.slug}`;
      if (lessonSlugs.has(lesson.slug)) {
        issues.push({ severity: 'error', where, message: 'Doppelter Lektions-Slug.' });
      }
      lessonSlugs.add(lesson.slug);

      checkPlaceholders(where, `${lesson.everydayProblem} ${lesson.mentalModel}`, issues);

      for (const slug of [
        ...lesson.primaryConceptSlugs,
        ...lesson.supportingConceptSlugs,
        ...lesson.prerequisiteConceptSlugs,
      ]) {
        if (!conceptSlugs.has(slug)) {
          issues.push({
            severity: 'error',
            where,
            message: `Referenziertes Konzept "${slug}" existiert nicht.`,
          });
        }
      }

      // Voraussetzungen müssen vorher eingeführt worden sein.
      for (const slug of lesson.prerequisiteConceptSlugs) {
        if (!introducedConcepts.has(slug)) {
          issues.push({
            severity: 'warning',
            where,
            message: `Konzept "${slug}" wird vorausgesetzt, aber erst später oder nie eingeführt.`,
          });
        }
      }
      for (const slug of lesson.primaryConceptSlugs) introducedConcepts.add(slug);

      // Didaktische Mindestanforderungen an eine veröffentlichte Lektion.
      if (lesson.status === 'PUBLISHED') {
        const kinds = new Set(lesson.exercises.map((e) => e.payload.kind));
        if (kinds.size < 2) {
          issues.push({
            severity: 'warning',
            where,
            message:
              'Weniger als zwei Interaktionsformen. Mastery soll über verschiedene Aufgabenformen nachgewiesen werden.',
          });
        }
        const maxScaffold = Math.max(...lesson.exercises.map((e) => e.scaffoldLevel));
        if (maxScaffold < 4) {
          issues.push({
            severity: 'warning',
            where,
            message:
              'Keine Aufgabe mit reduzierten Hilfen (Gerüst-Stufe ≥ 4). Hilfen sollen im Lektionsverlauf abgebaut werden.',
          });
        }
      }

      for (const exercise of lesson.exercises) {
        validateExercise(exercise, { where: `exercise:${exercise.slug}`, conceptSlugs, issues });
        if (exerciseSlugs.has(exercise.slug)) {
          issues.push({
            severity: 'error',
            where: `exercise:${exercise.slug}`,
            message: 'Doppelter Aufgaben-Slug.',
          });
        }
        exerciseSlugs.add(exercise.slug);
      }
    }
  }

  // --- Wiederholungssets ----------------------------------------------------
  for (const set of input.reviewSets) {
    const where = `reviewSet:${set.slug}`;
    for (const slug of set.requiredLessonSlugs) {
      if (!lessonSlugs.has(slug)) {
        issues.push({ severity: 'error', where, message: `Lektion "${slug}" existiert nicht.` });
      }
    }
    for (const slug of set.exerciseSlugs) {
      if (!exerciseSlugs.has(slug)) {
        issues.push({ severity: 'error', where, message: `Aufgabe "${slug}" existiert nicht.` });
      }
    }
  }

  // --- Projekte -------------------------------------------------------------
  for (const project of input.projects) {
    const where = `project:${project.slug}`;
    const testIds = new Set(project.tests.map((t) => t.id));
    for (const milestone of project.milestones) {
      for (const testId of milestone.testIds) {
        if (!testIds.has(testId)) {
          issues.push({
            severity: 'error',
            where,
            message: `Meilenstein "${milestone.id}" verweist auf unbekannten Test "${testId}".`,
          });
        }
      }
    }
    for (const slug of project.conceptSlugs) {
      if (!conceptSlugs.has(slug)) {
        issues.push({ severity: 'error', where, message: `Konzept "${slug}" existiert nicht.` });
      }
    }
    checkPlaceholders(where, project.description, issues);
  }

  return { ok: issues.every((i) => i.severity !== 'error'), issues };
}

function validateExercise(
  exercise: ExerciseContent,
  ctx: { where: string; conceptSlugs: Set<string>; issues: ContentIssue[] },
): void {
  const { where, conceptSlugs, issues } = ctx;

  checkPlaceholders(where, `${exercise.prompt} ${exercise.title}`, issues);

  for (const slug of exercise.conceptSlugs) {
    if (!conceptSlugs.has(slug)) {
      issues.push({ severity: 'error', where, message: `Konzept "${slug}" existiert nicht.` });
    }
  }

  // Hinweisleiter: aufsteigende, lückenlose Stufen.
  const levels = exercise.hints.map((h) => h.level);
  const sorted = [...levels].sort((a, b) => a - b);
  if (levels.join(',') !== sorted.join(',')) {
    issues.push({ severity: 'error', where, message: 'Hinweise sind nicht aufsteigend sortiert.' });
  }
  if (new Set(levels).size !== levels.length) {
    issues.push({ severity: 'error', where, message: 'Doppelte Hinweisstufe.' });
  }
  if (exercise.hints.length > 0 && levels[0] !== 1) {
    issues.push({
      severity: 'error',
      where,
      message: 'Die Hinweisleiter muss mit Stufe 1 (Denkimpuls) beginnen.',
    });
  }

  const isCodeType = CODE_EXERCISE_TYPES.has(exercise.type);
  const hasCodePayload = exercise.payload.kind === 'code';

  // Aufgabentypen wie WRITE_CODE brauchen zwingend ausführbaren Code.
  // Umgekehrt dürfen TRANSFER und SPACED_REVIEW jede Interaktionsform nutzen –
  // sie beschreiben die didaktische Rolle, nicht die Darstellung.
  if (isCodeType && !hasCodePayload) {
    issues.push({
      severity: 'error',
      where,
      message: `Aufgabentyp ${exercise.type} erfordert eine Code-Nutzlast, gefunden wurde "${exercise.payload.kind}".`,
    });
  }
  const ROLE_TYPES: ReadonlySet<ExerciseTypeName> = new Set([
    'TRANSFER',
    'SPACED_REVIEW',
    'COMPARE_SOLUTION',
    'EXPLAIN_ERROR',
  ]);
  if (hasCodePayload && !isCodeType && !ROLE_TYPES.has(exercise.type)) {
    issues.push({
      severity: 'error',
      where,
      message: `Aufgabentyp ${exercise.type} passt nicht zu einer Code-Nutzlast.`,
    });
  }

  if (hasCodePayload) {
    const total = exercise.publicTests.length + exercise.hiddenTests.length;
    if (total === 0) {
      issues.push({
        severity: 'error',
        where,
        message: 'Code-Aufgaben brauchen mindestens einen automatisierten Test.',
      });
    }
    if (exercise.publicTests.length === 0 && total > 0) {
      issues.push({
        severity: 'warning',
        where,
        message: 'Kein sichtbarer Test. Mindestens ein Test sollte nachvollziehbar sein.',
      });
    }
    if (!exercise.solution) {
      issues.push({
        severity: 'error',
        where,
        message: 'Code-Aufgaben brauchen eine Musterlösung für den Lösungsvergleich.',
      });
    }
    const ids = [...exercise.publicTests, ...exercise.hiddenTests].map((t) => t.id);
    if (new Set(ids).size !== ids.length) {
      issues.push({ severity: 'error', where, message: 'Doppelte Test-IDs.' });
    }
    for (const test of [...exercise.publicTests, ...exercise.hiddenTests]) {
      if (!test.expectedStdout && !test.assertion) {
        issues.push({
          severity: 'error',
          where,
          message: `Test "${test.id}" prüft nichts (weder expectedStdout noch assertion).`,
        });
      }
    }
  }

  // Auswahlaufgaben: richtige Antworten müssen existieren.
  const p = exercise.payload;
  if (p.kind === 'singleChoice' && !p.options.some((o) => o.id === p.correctOptionId)) {
    issues.push({ severity: 'error', where, message: 'correctOptionId zeigt auf keine Option.' });
  }
  if (p.kind === 'multipleChoice') {
    const optionIds = new Set(p.options.map((o) => o.id));
    for (const id of p.correctOptionIds) {
      if (!optionIds.has(id)) {
        issues.push({ severity: 'error', where, message: `Richtige Option "${id}" fehlt.` });
      }
    }
    if (p.correctOptionIds.length === p.options.length) {
      issues.push({
        severity: 'warning',
        where,
        message: 'Alle Optionen sind richtig – das prüft nichts.',
      });
    }
  }
  if (p.kind === 'parsons') {
    const solutionIds = new Set(p.correctOrder);
    const nonDistractors = p.lines.filter((l) => !l.distractor).map((l) => l.id);
    if (nonDistractors.length !== solutionIds.size) {
      issues.push({
        severity: 'error',
        where,
        message: 'correctOrder passt nicht zur Anzahl der Nicht-Ablenker-Zeilen.',
      });
    }
    for (const id of p.correctOrder) {
      if (!p.lines.some((l) => l.id === id)) {
        issues.push({ severity: 'error', where, message: `Unbekannte Zeilen-ID "${id}".` });
      }
    }
  }
  if (p.kind === 'codeCompletion') {
    for (const blank of p.blanks) {
      if (!p.template.includes(`{{blank:${blank.id}}}`)) {
        issues.push({
          severity: 'error',
          where,
          message: `Lücke "${blank.id}" kommt in der Vorlage nicht vor.`,
        });
      }
    }
  }
  if (p.kind === 'findError') {
    for (const line of p.faultyLineNumbers) {
      if (line > p.codeLines.length) {
        issues.push({
          severity: 'error',
          where,
          message: `Fehlerzeile ${line} liegt außerhalb des Codes.`,
        });
      }
    }
  }
  if (exercise.type === 'TRANSFER' && !exercise.transferContext) {
    issues.push({
      severity: 'warning',
      where,
      message: 'Transferaufgabe ohne beschriebenen neuen Kontext.',
    });
  }
}

function detectCycles(concepts: ConceptContent[], issues: ContentIssue[]): void {
  const byslug = new Map(concepts.map((c) => [c.slug, c]));
  const state = new Map<string, 'visiting' | 'done'>();

  const visit = (slug: string, trail: string[]): void => {
    const current = state.get(slug);
    if (current === 'done') return;
    if (current === 'visiting') {
      issues.push({
        severity: 'error',
        where: `concept:${slug}`,
        message: `Zyklische Voraussetzung: ${[...trail, slug].join(' → ')}`,
      });
      return;
    }
    state.set(slug, 'visiting');
    for (const pre of byslug.get(slug)?.prerequisiteSlugs ?? []) {
      if (byslug.has(pre)) visit(pre, [...trail, slug]);
    }
    state.set(slug, 'done');
  };

  for (const concept of concepts) visit(concept.slug, []);
}
