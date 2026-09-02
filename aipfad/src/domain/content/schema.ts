import { z } from 'zod';
import { exercisePayloadSchema, hintSchema } from './exercise-payload';

/**
 * Zod-Schemata für redaktionelle Inhalte. Muster aus PythonPfad/SQLPfad
 * (siehe docs/ARCHITEKTUR.md §2.1): Inhalte liegen als typisierte
 * TypeScript-Module unter `src/content/` und werden beim Seeding gegen diese
 * Schemata geprüft. `validateCourseGraph()` prüft zusätzlich Beziehungen, die
 * ein reines Schema nicht abbilden kann.
 *
 * Diese Ausbaustufe modelliert keine Code-Aufgaben (kein Runner), keine
 * ReviewSets und keine Projects – siehe docs/LEHRPLAN.md für den
 * verbleibenden Umfang.
 */

export const contentStatusSchema = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);

export const exerciseTypeSchema = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'ORDERING',
  'FILL_IN',
  'SCENARIO_DECISION',
  'TERMINAL_SIMULATION',
  'PROMPT_REPAIR',
  'INTERPRETATION',
  'CLASSIFICATION',
  'CONFLICT_RESOLUTION',
  'TRANSFER',
  'SPACED_REVIEW',
]);

export type ExerciseTypeName = z.infer<typeof exerciseTypeSchema>;

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
  solutionNotes: z.string().optional(),
  hints: z.array(hintSchema).default([]),
  difficulty: z.number().int().min(1).max(5).default(2),
  /** Gerüst-Stufe: 1 = viel Hilfe, 6 = keine (siehe docs/LERNMODELL.md). */
  scaffoldLevel: z.number().int().min(1).max(6).default(3),
  transferContext: z.string().optional(),
  conceptSlugs: z.array(z.string()).min(1),
  status: contentStatusSchema.default('PUBLISHED'),
});

export type ExerciseContent = z.infer<typeof exerciseSchema>;
/** Autorensicht: Felder mit Standardwerten dürfen weggelassen werden. */
export type ExerciseDraft = z.input<typeof exerciseSchema>;

export const workedExampleSchema = z.object({
  /** Kurzer, durchgerechneter Ablauf oder Vergleich – kein Quelltext. */
  summary: z.string().min(20),
  /** Zeilen-/Schrittanmerkungen: Nummer -> Erklärung. */
  annotations: z
    .array(
      z.object({
        step: z.number().int().min(1),
        text: z.string().min(5),
      }),
    )
    .min(1),
  /** Ergebnis oder Ausgabe des Beispiels. */
  outcome: z.string().min(1),
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
  estimatedMinutes: z.number().int().min(3).max(20),
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

export const labKindSchema = z.enum([
  'TERMINAL',
  'TOKENIZER',
  'CONTEXT_WINDOW',
  'PROMPT_REPAIR',
  'GIT_STATE',
  'BRANCH',
  'MERGE_CONFLICT',
]);

export const labSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  kind: labKindSchema,
  title: z.string().min(3),
  summary: z.string().min(20),
  instructions: z.string().min(20),
  /** Deterministische Konfiguration – typspezifisch, siehe src/domain/labs/. */
  config: z.record(z.string(), z.unknown()),
  estimatedMinutes: z.number().int().min(3).max(30).default(10),
  status: contentStatusSchema.default('PUBLISHED'),
  relatedConceptSlugs: z.array(z.string()).default([]),
});

export type LabContent = z.infer<typeof labSchema>;
export type LabDraft = z.input<typeof labSchema>;

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
 * Prüft einen Kurs samt Konzepten und Labs auf Konsistenz. Wird vom
 * Seed-Skript, vom Content-Validator-Skript und von den Unit-Tests verwendet.
 */
/**
 * Grenze, ab der ein Fließtext auf einer Lernseite zur Textwand wird.
 *
 * Die Regel "ein Bildschirm, eine Entscheidung" lässt sich nicht messen, die
 * Textlänge schon. Der Wert liegt bewusst großzügig: Er soll Ausreißer
 * melden, nicht Prosa verbieten.
 */
const MAX_FLIESSTEXT = 600;

/**
 * Befehle, die in Lernprosa auftauchen, gehören in die Befehlsreferenz.
 * Sonst steht im Lernstoff ein Befehl, den niemand nachschlagen kann.
 */
const BEFEHL_IM_TEXT = /\b(git|gh)\s+[a-z][a-z-]*/g;

export function validateCourseGraph(input: {
  course: CourseContent;
  concepts: ConceptContent[];
  labs: LabContent[];
  /**
   * Die Befehle aus der Referenz — für die Prüfung, ob im Lernstoff genannte
   * Befehle auch nachschlagbar sind. Wird nichts übergeben, entfällt die
   * Prüfung (die reinen Inhaltstests brauchen sie nicht).
   */
  referenzBefehle?: string[];
}): ContentValidationResult {
  const issues: ContentIssue[] = [];
  const conceptSlugs = new Set(input.concepts.map((c) => c.slug));
  const lessonSlugs = new Set<string>();
  const exerciseSlugs = new Set<string>();
  const introducedConcepts = new Set<string>();

  // --- Konzeptgraph -----------------------------------------------------
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

  // --- Module und Lektionen ----------------------------------------------
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
      checkTextwand(where, 'everydayProblem', lesson.everydayProblem, issues);
      checkTextwand(where, 'mentalModel', lesson.mentalModel, issues);
      checkBefehleNachschlagbar(where, lesson, input.referenzBefehle, issues);

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

      if (lesson.status === 'PUBLISHED') {
        const kinds = new Set(lesson.exercises.map((e) => e.payload.kind));
        if (kinds.size < 2 && lesson.exercises.length > 1) {
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

  // --- Labs ----------------------------------------------------------------
  const labSlugs = new Set<string>();
  for (const lab of input.labs) {
    const where = `lab:${lab.slug}`;
    if (labSlugs.has(lab.slug)) {
      issues.push({ severity: 'error', where, message: 'Doppelter Lab-Slug.' });
    }
    labSlugs.add(lab.slug);
    checkPlaceholders(where, `${lab.summary} ${lab.instructions}`, issues);
    if (lab.relatedConceptSlugs.length === 0) {
      issues.push({
        severity: 'warning',
        where,
        message:
          'Kein verknüpftes Konzept. Ohne Konzeptbezug taucht das Lab weder im Wissensgraphen noch in der Wiederholung auf.',
      });
    }
    for (const slug of lab.relatedConceptSlugs) {
      if (!conceptSlugs.has(slug)) {
        issues.push({ severity: 'error', where, message: `Konzept "${slug}" existiert nicht.` });
      }
    }
  }

  return { ok: issues.every((i) => i.severity !== 'error'), issues };
}

/**
 * Prüft die Befehlsreferenz selbst.
 *
 * Ein destruktiver oder nicht rückholbarer Befehl MUSS erklären, was genau
 * verloren gehen kann — sonst steht dort eine Warnfarbe ohne Inhalt. Die
 * Bedingung stammt aus `domain/commands/safety.ts`, damit Anzeige und
 * Prüfung dieselbe Regel meinen.
 */
export function validateCommandReference(
  befehle: {
    command: string;
    whatHappens: string;
    safety: { gefahr: string; reversibel: boolean; wirkung: string[] };
  }[],
): ContentValidationResult {
  const issues: ContentIssue[] = [];
  const gesehen = new Set<string>();

  for (const befehl of befehle) {
    const where = `befehl:${befehl.command}`;
    if (gesehen.has(befehl.command)) {
      issues.push({ severity: 'error', where, message: 'Doppelter Befehlseintrag.' });
    }
    gesehen.add(befehl.command);

    checkPlaceholders(where, `${befehl.command} ${befehl.whatHappens}`, issues);

    const heikel = befehl.safety.gefahr === 'destruktiv' || !befehl.safety.reversibel;
    if (heikel && befehl.whatHappens.length < 60) {
      issues.push({
        severity: 'error',
        where,
        message:
          'Destruktiver oder nicht rückholbarer Befehl ohne ausreichende Erklärung. Es muss dastehen, was konkret verloren gehen kann.',
      });
    }

    if (befehl.safety.wirkung.length === 0) {
      issues.push({ severity: 'error', where, message: 'Kein Wirkbereich angegeben.' });
    }
    if (befehl.safety.wirkung.includes('nur-lesend') && befehl.safety.wirkung.length > 1) {
      issues.push({
        severity: 'error',
        where,
        message: '"nur-lesend" schließt andere Wirkbereiche aus — das widerspricht sich.',
      });
    }
  }

  return { ok: issues.every((i) => i.severity !== 'error'), issues };
}

function checkTextwand(where: string, feld: string, text: string, issues: ContentIssue[]): void {
  if (text.length > MAX_FLIESSTEXT) {
    issues.push({
      severity: 'warning',
      where,
      message: `${feld} ist ${text.length} Zeichen lang. Ab ${MAX_FLIESSTEXT} wird daraus eine Textwand — lieber aufteilen oder ins Nachschlagen auslagern.`,
    });
  }
}

/**
 * Nennt eine Lektion einen Git- oder gh-Befehl, muss er in der
 * Befehlsreferenz stehen. Sonst liest jemand "git reset --hard" im Lernstoff
 * und findet nirgends, was der Befehl anrichtet.
 */
function checkBefehleNachschlagbar(
  where: string,
  lesson: LessonContent,
  referenzBefehle: string[] | undefined,
  issues: ContentIssue[],
): void {
  if (!referenzBefehle) return;

  // Auf den Befehlsnamen ohne Argumente normalisieren: In der Referenz steht
  // `git add <datei>`, im Text `git add liesmich.md`.
  const bekannt = new Set(
    referenzBefehle.map((befehl) => befehl.split(/\s+/).slice(0, 2).join(' ')),
  );

  const text = [
    lesson.everydayProblem,
    lesson.mentalModel,
    ...lesson.learningObjectives,
    ...lesson.commonMistakes.flatMap((m) => [m.mistake, m.why, m.fix]),
  ].join(' ');

  const genannt = new Set(text.match(BEFEHL_IM_TEXT) ?? []);
  for (const befehl of genannt) {
    if (!bekannt.has(befehl)) {
      issues.push({
        severity: 'warning',
        where,
        message: `"${befehl}" wird im Lernstoff genannt, steht aber nicht in der Befehlsreferenz.`,
      });
    }
  }
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
  if (p.kind === 'ordering') {
    const itemIds = new Set(p.items.map((i) => i.id));
    if (p.correctOrder.length !== p.items.length) {
      issues.push({
        severity: 'error',
        where,
        message: 'correctOrder passt nicht zur Anzahl der Elemente.',
      });
    }
    for (const id of p.correctOrder) {
      if (!itemIds.has(id)) {
        issues.push({ severity: 'error', where, message: `Unbekannte Element-ID "${id}".` });
      }
    }
  }
  if (p.kind === 'fillIn') {
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
  if (p.kind === 'scenarioDecision' || p.kind === 'promptRepair') {
    if (!p.options.some((o) => o.quality === 'optimal')) {
      issues.push({
        severity: 'error',
        where,
        message: 'Mindestens eine Option muss als "optimal" markiert sein.',
      });
    }
  }
  if (p.kind === 'terminalSimulation') {
    for (const command of p.expectedCommands) {
      const commandName = command.trim().split(/\s+/)[0];
      if (commandName && !p.allowedCommands.includes(commandName)) {
        issues.push({
          severity: 'error',
          where,
          message: `Erwarteter Befehl "${commandName}" steht nicht in allowedCommands.`,
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
