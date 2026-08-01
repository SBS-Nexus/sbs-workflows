/**
 * Zusammenstellung des persönlichen Lernpfads.
 *
 * Der Pfad ist eine geordnete Liste von Lektionen. Er entsteht aus:
 *
 *  - der fachlichen Reihenfolge des Kurses (Modul- und Lektionsordnung)
 *  - dem Ergebnis der diagnostischen Einstufung
 *  - dem angegebenen Lernziel (bestimmt später die Spezialisierung)
 *  - dem täglichen Zeitbudget und dem gewünschten Tempo
 *
 * Grundregel: Es wird nie eine Lektion übersprungen, deren Konzepte später
 * vorausgesetzt werden. Die Einstufung kann Lektionen höchstens als
 * "wahrscheinlich bekannt" markieren – sie bleiben im Pfad, rücken aber nach
 * hinten und werden als kurze Auffrischung angeboten.
 */

export type LearningGoalName =
  | 'GENERAL'
  | 'OFFICE_AUTOMATION'
  | 'DATA_ANALYSIS'
  | 'AI_APPLICATIONS'
  | 'WEB_DEVELOPMENT'
  | 'CAREER_CHANGE';

export type PaceName = 'RELAXED' | 'STEADY' | 'FOCUSED';

export interface PathLessonInput {
  slug: string;
  title: string;
  moduleSlug: string;
  moduleOrder: number;
  lessonOrder: number;
  estimatedMinutes: number;
  primaryConceptSlugs: string[];
}

export interface PathBuildInput {
  lessons: PathLessonInput[];
  /** 0–100 aus der Einstufung. */
  placementScore: number;
  /** Konzepte, die in der Einstufung sicher beherrscht wirkten. */
  demonstratedConceptSlugs: string[];
  learningGoal: LearningGoalName;
  dailyTimeBudget: number;
  pace: PaceName;
}

export interface PathStep {
  slug: string;
  title: string;
  /** "Auffrischung" statt vollständiger Bearbeitung. */
  mode: 'full' | 'refresher';
  estimatedMinutes: number;
}

export interface BuiltPath {
  steps: PathStep[];
  lessonSlugs: string[];
  rationale: string;
  /** Geschätzte Kalendertage bis zum Ende des Kernpfads. */
  estimatedDays: number;
}

const GOAL_LABELS: Record<LearningGoalName, string> = {
  GENERAL: 'Python allgemein verstehen',
  OFFICE_AUTOMATION: 'Büroaufgaben automatisieren',
  DATA_ANALYSIS: 'Daten analysieren',
  AI_APPLICATIONS: 'KI-Anwendungen entwickeln',
  WEB_DEVELOPMENT: 'Webentwicklung verstehen',
  CAREER_CHANGE: 'beruflichen Quereinstieg vorbereiten',
};

export const GOAL_OPTIONS: ReadonlyArray<{
  value: LearningGoalName;
  label: string;
  description: string;
}> = [
  {
    value: 'GENERAL',
    label: 'Python allgemein verstehen',
    description: 'Ein solides Fundament, ohne sich früh festzulegen.',
  },
  {
    value: 'OFFICE_AUTOMATION',
    label: 'Büroaufgaben automatisieren',
    description: 'Dateien sortieren, Tabellen auswerten, Berichte erzeugen.',
  },
  {
    value: 'DATA_ANALYSIS',
    label: 'Daten analysieren',
    description: 'Zahlen zusammenfassen, gruppieren und verständlich darstellen.',
  },
  {
    value: 'AI_APPLICATIONS',
    label: 'KI-Anwendungen entwickeln',
    description: 'Sprachmodelle über Schnittstellen ansprechen und Ergebnisse prüfen.',
  },
  {
    value: 'WEB_DEVELOPMENT',
    label: 'Webentwicklung verstehen',
    description: 'Wie Server, Anfragen und Antworten zusammenspielen.',
  },
  {
    value: 'CAREER_CHANGE',
    label: 'Beruflichen Quereinstieg vorbereiten',
    description: 'Breite Grundlagen plus Tests, Struktur und Projektarbeit.',
  },
];

const PACE_FACTOR: Record<PaceName, number> = {
  RELAXED: 0.75,
  STEADY: 1,
  FOCUSED: 1.35,
};

export function buildLearningPath(input: PathBuildInput): BuiltPath {
  const demonstrated = new Set(input.demonstratedConceptSlugs);

  const ordered = [...input.lessons].sort(
    (a, b) => a.moduleOrder - b.moduleOrder || a.lessonOrder - b.lessonOrder,
  );

  const steps: PathStep[] = ordered.map((lesson) => {
    // Eine Lektion wird zur Auffrischung, wenn ALLE ihre neuen Konzepte in der
    // Einstufung sicher gezeigt wurden.
    const allKnown =
      lesson.primaryConceptSlugs.length > 0 &&
      lesson.primaryConceptSlugs.every((slug) => demonstrated.has(slug));

    return {
      slug: lesson.slug,
      title: lesson.title,
      mode: allKnown ? 'refresher' : 'full',
      estimatedMinutes: allKnown
        ? Math.max(4, Math.round(lesson.estimatedMinutes * 0.4))
        : lesson.estimatedMinutes,
    };
  });

  const totalMinutes = steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);
  const effectiveDaily = Math.max(5, input.dailyTimeBudget * PACE_FACTOR[input.pace]);
  const estimatedDays = Math.ceil(totalMinutes / effectiveDaily);

  const refreshers = steps.filter((s) => s.mode === 'refresher').length;

  return {
    steps,
    lessonSlugs: steps.map((s) => s.slug),
    rationale: buildRationale({
      goal: input.learningGoal,
      placementScore: input.placementScore,
      refreshers,
      totalLessons: steps.length,
      dailyTimeBudget: input.dailyTimeBudget,
      estimatedDays,
    }),
    estimatedDays,
  };
}

function buildRationale(input: {
  goal: LearningGoalName;
  placementScore: number;
  refreshers: number;
  totalLessons: number;
  dailyTimeBudget: number;
  estimatedDays: number;
}): string {
  const parts: string[] = [];

  parts.push(`Dein Ziel: ${GOAL_LABELS[input.goal]}.`);

  if (input.placementScore < 30) {
    parts.push(
      'Die Einstufung zeigt, dass du bei den Grundlagen anfängst. Der Pfad beginnt deshalb ganz vorne und geht in kleinen Schritten weiter.',
    );
  } else if (input.placementScore < 65) {
    parts.push(
      'Einiges kam dir in der Einstufung schon bekannt vor. Die betreffenden Lektionen bleiben im Pfad, sind aber als kurze Auffrischung angelegt.',
    );
  } else {
    parts.push(
      'Du hast in der Einstufung vieles sicher gelöst. Der Pfad überspringt trotzdem nichts – er kürzt Bekanntes nur ab, damit keine Lücke entsteht, auf die später aufgebaut wird.',
    );
  }

  if (input.refreshers > 0) {
    parts.push(
      `${input.refreshers} von ${input.totalLessons} Lektionen sind als Auffrischung markiert.`,
    );
  }

  parts.push(
    `Bei ${input.dailyTimeBudget} Minuten am Tag brauchst du für den Kernpfad grob ${input.estimatedDays} Lerntage. Das ist eine Schätzung, kein Plan, den du einhalten musst.`,
  );

  return parts.join(' ');
}

/**
 * Nächster sinnvoller Schritt im Pfad.
 *
 * Fällige Wiederholungen haben Vorrang vor neuem Stoff: Erst festigen, was
 * bereits begonnen wurde, dann erweitern.
 */
export interface NextStepInput {
  lessonSlugs: string[];
  completedLessonSlugs: string[];
  inProgressLessonSlug?: string | null;
  dueReviewCount: number;
}

export type NextStep =
  | { kind: 'review'; count: number; label: string; href: string }
  | { kind: 'continue'; lessonSlug: string; label: string; href: string }
  | { kind: 'start'; lessonSlug: string; label: string; href: string }
  | { kind: 'done'; label: string; href: string };

export function determineNextStep(input: NextStepInput): NextStep {
  if (input.dueReviewCount > 0) {
    return {
      kind: 'review',
      count: input.dueReviewCount,
      label:
        input.dueReviewCount === 1
          ? 'Eine Wiederholung ist heute fällig'
          : `${input.dueReviewCount} Wiederholungen sind heute fällig`,
      href: '/wiederholen',
    };
  }

  if (input.inProgressLessonSlug) {
    return {
      kind: 'continue',
      lessonSlug: input.inProgressLessonSlug,
      label: 'Angefangene Lektion fortsetzen',
      href: `/lernen/${input.inProgressLessonSlug}`,
    };
  }

  const completed = new Set(input.completedLessonSlugs);
  const next = input.lessonSlugs.find((slug) => !completed.has(slug));

  if (!next) {
    return {
      kind: 'done',
      label: 'Kernpfad abgeschlossen – weiter mit einem Projekt',
      href: '/projekte',
    };
  }

  return {
    kind: 'start',
    lessonSlug: next,
    label: 'Nächste Lektion beginnen',
    href: `/lernen/${next}`,
  };
}
