import { z } from 'zod';

/**
 * Diagnostische Einstufung. Muster aus PythonPfad/SQLPfad (siehe
 * docs/LERNMODELL.md §7):
 *  - Beginnt mit Aufgaben, die ohne Vorwissen lösbar sind (logisches Denken).
 *  - Fachbegriffe kommen erst in späteren Fragen vor und werden dort erklärt.
 *  - Keine Zeitbegrenzung, keine Punktzahl im klassischen Sinn.
 *  - "Weiß ich nicht" ist überall eine gleichwertige Antwortmöglichkeit und
 *    wird nicht schlechter bewertet als ein falscher Rateversuch.
 *
 * Ergebnis ist ein Wert von 0–100 sowie eine Liste von Konzepten, die
 * offensichtlich schon sitzen. Beides beeinflusst nur die Ausgestaltung des
 * Pfads, niemals dessen Vollständigkeit – es wird nie eine Lektion übersprungen.
 */

export const PLACEMENT_VERSION = '1.0.0';

export type PlacementBand = 'beginner' | 'advanced-beginner' | 'refresher';

export const placementQuestionSchema = z.object({
  id: z.string().min(1),
  /** Bereich, den die Frage abfragt. */
  area: z.enum(['logic', 'technical-basics', 'ai-exposure', 'ai-concepts']),
  question: z.string().min(10),
  /** Optionaler Kontext (z. B. ein Beispieltext), auf den sich die Frage bezieht. */
  context: z.string().optional(),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .min(2),
  correctOptionId: z.string().min(1),
  /** Konzept, das mit dieser Frage plausibel belegt wird. */
  demonstratesConceptSlug: z.string().optional(),
  /** Gewicht der Frage im Gesamtergebnis. */
  weight: z.number().min(0.5).max(2).default(1),
  /** Erklärung – wird nach Abschluss der Einstufung gezeigt. */
  explanation: z.string().min(10),
});

export type PlacementQuestion = z.infer<typeof placementQuestionSchema>;
export type PlacementQuestionDraft = z.input<typeof placementQuestionSchema>;

/** Antwortmöglichkeit, die in jeder Frage zusätzlich angeboten wird. */
export const DONT_KNOW_OPTION_ID = 'weiss-nicht';

export interface PlacementAnswer {
  questionId: string;
  optionId: string;
}

export interface PlacementResult {
  score: number;
  band: PlacementBand;
  demonstratedConceptSlugs: string[];
  byArea: Record<PlacementQuestion['area'], { correct: number; total: number }>;
  message: string;
  version: string;
}

export function evaluatePlacement(
  questions: readonly PlacementQuestion[],
  answers: readonly PlacementAnswer[],
): PlacementResult {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.optionId]));

  const byArea: PlacementResult['byArea'] = {
    logic: { correct: 0, total: 0 },
    'technical-basics': { correct: 0, total: 0 },
    'ai-exposure': { correct: 0, total: 0 },
    'ai-concepts': { correct: 0, total: 0 },
  };

  let achieved = 0;
  let possible = 0;
  const demonstrated: string[] = [];

  for (const question of questions) {
    possible += question.weight;
    byArea[question.area].total += 1;

    const given = answerMap.get(question.id);
    const correct = given === question.correctOptionId;

    if (correct) {
      achieved += question.weight;
      byArea[question.area].correct += 1;
      if (question.demonstratesConceptSlug) {
        demonstrated.push(question.demonstratesConceptSlug);
      }
    }
  }

  const score = possible === 0 ? 0 : Math.round((achieved / possible) * 100);
  const band: PlacementBand =
    score < 35 ? 'beginner' : score < 70 ? 'advanced-beginner' : 'refresher';

  return {
    score,
    band,
    demonstratedConceptSlugs: dedupeReliable(demonstrated, questions),
    byArea,
    message: MESSAGES[band],
    version: PLACEMENT_VERSION,
  };
}

/** Ein Konzept gilt nur als gezeigt, wenn ALLE zugehörigen Fragen richtig
 * beantwortet wurden – eine einzelne richtige Antwort kann geraten sein. */
function dedupeReliable(demonstrated: string[], questions: readonly PlacementQuestion[]): string[] {
  const counts = new Map<string, number>();
  for (const slug of demonstrated) counts.set(slug, (counts.get(slug) ?? 0) + 1);

  const available = new Map<string, number>();
  for (const question of questions) {
    if (question.demonstratesConceptSlug) {
      available.set(
        question.demonstratesConceptSlug,
        (available.get(question.demonstratesConceptSlug) ?? 0) + 1,
      );
    }
  }

  return [...counts.entries()]
    .filter(([slug, count]) => {
      const total = available.get(slug) ?? 1;
      return count >= total;
    })
    .map(([slug]) => slug);
}

const MESSAGES: Record<PlacementBand, string> = {
  beginner:
    'Du startest bei den Grundlagen. Genau dafür ist AIPfad gebaut: Jedes Konzept wird von vorne erklärt, mit einem Alltagsbeispiel und einer Visualisierung, die du selbst erkunden kannst.',
  'advanced-beginner':
    'Ein Teil der Grundlagen ist dir vertraut. Die entsprechenden Lektionen bekommst du als kurze Auffrischung, damit du deine Zeit auf das Neue verwenden kannst.',
  refresher:
    'Du bringst schon einiges mit. Der Pfad kürzt Bekanntes ab, überspringt es aber nicht ganz – so bleibt sicher, dass keine Lücke offenbleibt, auf der später aufgebaut wird.',
};
