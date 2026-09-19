import { z } from 'zod';

/**
 * Diagnostische Einstufung. Muster aus PythonPfad/SQLPfad (siehe
 * docs/LERNMODELL.md §4):
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

/**
 * Das Band zu einer Punktzahl.
 *
 * An einer Stelle: Die Ergebnisseite rechnet frisch, eine gespeicherte
 * Punktzahl wird später wieder eingeordnet — zwei Fassungen derselben
 * Grenzen liefen unweigerlich auseinander.
 */
export function bandZuPunktzahl(score: number): PlacementBand {
  return score < 35 ? 'beginner' : score < 70 ? 'advanced-beginner' : 'refresher';
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
  const band = bandZuPunktzahl(score);

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

/**
 * Einordnung je Band — reine Ermutigung, keine Aussage über den Umfang.
 *
 * Diese Sätze werden in `pfadBegruendung()` hinter die Grundregel gehängt und
 * mit ihr gespeichert. Sie dürfen deshalb nie behaupten, der Pfad werde
 * gekürzt, abgekürzt oder etwas werde als Auffrischung markiert: Beides
 * widerspräche dem Satz davor, und beides gibt es nicht — der Pfad enthält
 * für jedes Band dieselben Lektionen. `pfadBegruendung` prüft das in
 * tests/unit/placement.test.ts für alle drei Bänder.
 */
const MESSAGES: Record<PlacementBand, string> = {
  beginner:
    'Du startest bei den Grundlagen. Genau dafür ist AIPfad gebaut: Jedes Konzept wird von vorne erklärt, mit einem Alltagsbeispiel und einer Visualisierung, die du selbst erkunden kannst.',
  'advanced-beginner':
    'Ein Teil der Grundlagen ist dir vertraut. Durch diese Lektionen kommst du vermutlich schnell hindurch — sie bleiben trotzdem im Pfad, damit keine Lücke offenbleibt.',
  refresher:
    'Du bringst schon einiges mit. Vieles im Pfad dürfte dir bekannt vorkommen; wie schnell du die Lektionen durchgehst, bestimmst du selbst.',
};

// ---------------------------------------------------------------------------
// Was der Browser sehen darf
// ---------------------------------------------------------------------------

/** Eine Frage, wie sie im Browser erscheint — ohne Lösung und Erklärung. */
export interface OeffentlicheFrage {
  id: string;
  area: PlacementQuestion['area'];
  question: string;
  context?: string;
  options: { id: string; text: string }[];
}

/** Die zusätzliche Antwort, die in JEDER Frage angeboten wird. */
const DONT_KNOW_TEXT = 'Weiß ich nicht';

/**
 * Bereitet die Fragen für den Browser auf.
 *
 * `correctOptionId` und `explanation` bleiben hier. Der zeitliche Ablauf ist
 * dabei der Punkt: VOR dem Absenden verlässt weder eine Lösung noch eine
 * Erklärung noch eine Gewichtung den Server — sonst stünde die Antwort im
 * Browser, bevor sie gegeben ist. NACH dem Abschluss gibt
 * `finalisiereOnboarding()` Erklärungen bewusst heraus: Dann sind sie
 * Rückmeldung, keine Lösungshilfe. Bewertet wird in beiden Fällen
 * ausschließlich auf dem Server — der Browser schickt Antworten, keine
 * Punktzahl.
 *
 * "Weiß ich nicht" wird hier angehängt, nicht im Inhalt gepflegt: Die Option
 * gilt laut Lernmodell für jede Frage, und eine Liste, die man je Frage
 * vergessen kann, wäre genau die Stelle, an der sie irgendwann fehlt.
 */
export function oeffentlicheFragen(questions: readonly PlacementQuestion[]): OeffentlicheFrage[] {
  return questions.map((frage) => ({
    id: frage.id,
    area: frage.area,
    question: frage.question,
    ...(frage.context === undefined ? {} : { context: frage.context }),
    options: [
      ...frage.options.map((option) => ({ id: option.id, text: option.text })),
      { id: DONT_KNOW_OPTION_ID, text: DONT_KNOW_TEXT },
    ],
  }));
}

/**
 * Das Einstufungsergebnis, wie es der Browser sehen darf — nach Abschluss.
 *
 * Zwei Felder, weil die Ergebnisanzeige genau zwei braucht. `band`,
 * `byArea`, `demonstratedConceptSlugs` und `version` sind innere Größen der
 * Bewertung: Sie steuern Begründungstext und künftige Ausbauten, gehören
 * aber niemandem im Browser.
 */
export interface OeffentlichesPlacementErgebnis {
  score: number;
  message: string;

  // Die inneren Felder stehen hier ausdrücklich als "gibt es hier nicht".
  // Ohne sie wäre ein vollständiges `PlacementResult` diesem Typ strukturell
  // zuweisbar: Die Überschussprüfung von TypeScript greift nur bei frisch
  // hingeschriebenen Objekten, nicht bei einer Variablen. `platzierung:
  // ergebnis` wäre also durchgegangen — genau der Fehler, den dieser Typ
  // verhindern soll. Mit `?: never` scheitert das beim Übersetzen.
  band?: never;
  byArea?: never;
  demonstratedConceptSlugs?: never;
  version?: never;
}

/**
 * Schneidet das vollständige Ergebnis auf das zu, was hinausgehen darf.
 *
 * Als eigener Typ und nicht als Weglassen im React-Baum: Ein `PlacementResult`
 * mit ausgelassenen Feldern bliebe ein `PlacementResult`, und das nächste
 * Feld darin wäre wieder draußen, ohne dass jemand es merkt. So muss man den
 * Typ ändern, um etwas hinzuzufügen — und das vollständige Ergebnis
 * stattdessen durchzureichen, scheitert beim Übersetzen.
 */
export function oeffentlichesErgebnis(ergebnis: PlacementResult): OeffentlichesPlacementErgebnis {
  return { score: ergebnis.score, message: ergebnis.message };
}

/**
 * Prüft eine eingegangene Antwort gegen die maßgeblichen Fragen.
 *
 * Der Browser darf Kennungen schicken, sonst nichts. Eine unbekannte Frage
 * oder eine Option, die es zu dieser Frage nicht gibt, wird abgelehnt,
 * statt stillschweigend als falsch gewertet zu werden — sonst sähe ein
 * Tippfehler in der Maske aus wie eine falsche Antwort.
 */
export function antwortFehler(
  questions: readonly PlacementQuestion[],
  antwort: PlacementAnswer,
): string | null {
  const frage = questions.find((q) => q.id === antwort.questionId);
  if (!frage) return `Unbekannte Frage "${antwort.questionId}".`;

  const gueltig =
    antwort.optionId === DONT_KNOW_OPTION_ID ||
    frage.options.some((option) => option.id === antwort.optionId);
  if (!gueltig) {
    return `Antwort "${antwort.optionId}" gehört nicht zur Frage "${antwort.questionId}".`;
  }
  return null;
}

/**
 * Begründungstext für den Lernpfad, abgeleitet aus dem Band.
 *
 * Der Pfad selbst bleibt vollständig — es wird nie eine Lektion
 * übersprungen (siehe docs/LERNMODELL.md). Die Einstufung ändert also
 * nicht, WAS im Pfad steht, sondern wie er eingeordnet wird. Ohne
 * Einstufung steht die neutrale Begründung.
 */
export function pfadBegruendung(band: PlacementBand | null): string {
  const grundregel =
    'Dieser Pfad enthält alle Lektionen dieser Ausbaustufe in der vorgesehenen Reihenfolge. ' +
    'Es wird nie eine Lektion übersprungen — spätere Inhalte bauen darauf auf.';
  if (band === null) return grundregel;
  return `${grundregel} ${MESSAGES[band]}`;
}

// ---------------------------------------------------------------------------
// Inhaltsprüfung
// ---------------------------------------------------------------------------

/**
 * Befund der Inhaltsprüfung. Absichtlich dieselbe Form wie in
 * `domain/content/schema.ts`, damit der Inhalts-Validator beide Quellen
 * gleich behandeln kann.
 */
export interface PlacementBefund {
  severity: 'error' | 'warning';
  where: string;
  message: string;
}

/**
 * Prüft die Fragen der Einstufung auf sich selbst.
 *
 * Das Schema prüft jede Frage für sich; hier geht es um das, was erst im
 * Zusammenspiel auffällt: doppelte Kennungen, eine richtige Antwort, die es
 * gar nicht gibt, und die Kollision mit "Weiß ich nicht" — diese Kennung
 * hängt die Maske an jede Frage an, und eine gleichnamige Option im Inhalt
 * wäre nicht mehr auseinanderzuhalten.
 */
export function validatePlacementQuestions(
  questions: readonly PlacementQuestion[],
): PlacementBefund[] {
  const befunde: PlacementBefund[] = [];
  const gesehen = new Set<string>();

  if (questions.length === 0) {
    befunde.push({
      severity: 'error',
      where: 'placement',
      message: 'Keine Einstufungsfragen vorhanden.',
    });
  }

  for (const frage of questions) {
    const where = `placement:${frage.id}`;

    if (gesehen.has(frage.id)) {
      befunde.push({ severity: 'error', where, message: 'Doppelte Fragekennung.' });
    }
    gesehen.add(frage.id);

    const optionen = new Set<string>();
    for (const option of frage.options) {
      if (optionen.has(option.id)) {
        befunde.push({
          severity: 'error',
          where,
          message: `Doppelte Optionskennung "${option.id}".`,
        });
      }
      optionen.add(option.id);

      if (option.id === DONT_KNOW_OPTION_ID) {
        befunde.push({
          severity: 'error',
          where,
          message: `Die Kennung "${DONT_KNOW_OPTION_ID}" ist für "Weiß ich nicht" reserviert und wird jeder Frage angehängt.`,
        });
      }
    }

    if (!optionen.has(frage.correctOptionId)) {
      befunde.push({
        severity: 'error',
        where,
        message: `correctOptionId "${frage.correctOptionId}" zeigt auf keine Option.`,
      });
    }
  }

  // Ohne Frage in einem Bereich bleibt das Ergebnis dort leer — die Anzeige
  // je Bereich zeigt dann eine Null, die nichts bedeutet.
  const bereiche = new Set(questions.map((frage) => frage.area));
  for (const bereich of ['logic', 'technical-basics', 'ai-exposure', 'ai-concepts'] as const) {
    if (!bereiche.has(bereich)) {
      befunde.push({
        severity: 'warning',
        where: 'placement',
        message: `Kein Fragenbereich "${bereich}" — die Auswertung je Bereich bleibt dort leer.`,
      });
    }
  }

  return befunde;
}
