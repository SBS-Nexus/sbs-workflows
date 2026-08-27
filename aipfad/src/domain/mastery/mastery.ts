import type { ExerciseTypeName } from '@/domain/content/schema';

/**
 * Kompetenzmodell. Muster aus PythonPfad/SQLPfad (siehe docs/LERNMODELL.md):
 *
 *  - **Deterministisch und nachvollziehbar.** Kein maschinelles Lernen, keine
 *    versteckten Gewichte. Jede Veränderung lässt sich auf eine Regel
 *    zurückführen, die hier im Klartext steht und getestet ist.
 *  - **Versioniert.** Jeder gespeicherte Wert trägt die Version des
 *    Algorithmus, mit dem er entstanden ist.
 *  - **Konfigurierbar.** Alle Zahlen stehen in `DEFAULT_MASTERY_CONFIG`.
 *  - **Nicht diskriminierend.** Nur Merkmale der Bearbeitung fließen ein
 *    (Korrektheit, Eigenständigkeit, Transferleistung, Fehlerart, Abstand zur
 *    letzten Übung). Keine Bearbeitungsgeschwindigkeit als Leistungsmaß.
 *
 * Unterschied zu PythonPfad: Diese Ausbaustufe führt keinen Code aus, daher
 * gibt es keine SYNTAX/INDENTATION-Fehlerklasse. `ErrorCategory` unterscheidet
 * stattdessen SURFACE (Detail übersehen), INCOMPLETE (teilweise richtig) und
 * MISCONCEPTION (grundlegendes Fehlverständnis) – siehe prisma/schema.prisma.
 *
 * Der Wert ist eine Orientierung für die Planung, keine Messung einer Person.
 */

export const MASTERY_ALGORITHM_VERSION = '1.0.0';

export type MasteryOutcome = 'PASSED' | 'PARTIAL' | 'FAILED' | 'SOLUTION_REVEALED';

export type ErrorCategoryName = 'NONE' | 'SURFACE' | 'INCOMPLETE' | 'MISCONCEPTION';

export type ConfidenceLevel = 'UNSURE' | 'RATHER_UNSURE' | 'RATHER_SURE' | 'VERY_SURE';

export interface MasteryConfig {
  version: string;
  /** Maximaler Zugewinn einer einzelnen, vollständig eigenständigen Lösung. */
  baseGain: number;
  /** Zusatzfaktor für bestandene Transferaufgaben. */
  transferBonus: number;
  /** Zusatzfaktor für bestandene, zeitlich verzögerte Wiederholungen. */
  delayedReviewBonus: number;
  /** Abzug je genutztem Hinweis (multiplikativ). */
  hintPenaltyPerLevel: number;
  /** Kleinster verbleibender Eigenständigkeitsfaktor trotz vieler Hinweise. */
  minIndependence: number;
  /** Rückstufung bei Detailfehler (SURFACE). */
  surfaceErrorPenalty: number;
  /** Rückstufung bei grundlegendem Fehlverständnis (MISCONCEPTION). */
  misconceptionPenalty: number;
  /** Zusätzliche Rückstufung, wenn derselbe Fehlertyp erneut auftritt. */
  repeatedErrorPenalty: number;
  /** Obergrenze, solange eine Musterlösung angesehen und nicht neu belegt wurde. */
  solutionRevealedCap: number;
  /** Anteil des Zugewinns bei teilweise richtiger Lösung. */
  partialFactor: number;
  /** Stabilitätswachstum bei Erfolg. */
  stabilityGrowth: number;
  /** Stabilitätsverlust bei Misserfolg. */
  stabilityDecay: number;
  /** Grenzwert, ab dem ein Konzept als Voraussetzung erfüllt gilt. */
  unlockThreshold: number;
}

export const DEFAULT_MASTERY_CONFIG: MasteryConfig = {
  version: MASTERY_ALGORITHM_VERSION,
  baseGain: 18,
  transferBonus: 1.45,
  delayedReviewBonus: 1.25,
  hintPenaltyPerLevel: 0.18,
  minIndependence: 0.25,
  surfaceErrorPenalty: 2,
  misconceptionPenalty: 7,
  repeatedErrorPenalty: 4,
  solutionRevealedCap: 59,
  partialFactor: 0.35,
  stabilityGrowth: 1.6,
  stabilityDecay: 0.45,
  unlockThreshold: 70,
};

export interface MasteryState {
  masteryScore: number;
  /** Gedächtnisstabilität in Tagen. */
  stability: number;
  /** Personenbezogene Schwierigkeit 1.0–5.0. */
  difficulty: number;
  successfulRetrievals: number;
  failedRetrievals: number;
  transferSuccesses: number;
}

export const INITIAL_MASTERY_STATE: MasteryState = {
  masteryScore: 0,
  stability: 1,
  difficulty: 2.5,
  successfulRetrievals: 0,
  failedRetrievals: 0,
  transferSuccesses: 0,
};

export interface MasteryEvidence {
  outcome: MasteryOutcome;
  /** 0.0–1.0 aus der Bewertung. */
  score: number;
  /** Höchste genutzte Hinweisstufe (0 = keine Hilfe). */
  hintsUsed: number;
  /** Schwierigkeit der Aufgabe 1–5. */
  exerciseDifficulty: number;
  exerciseType: ExerciseTypeName;
  /** Gerüst-Stufe der Aufgabe 1–6; höher = weniger Vorgaben. */
  scaffoldLevel: number;
  /** Gewicht der Aufgabe für dieses Konzept, 0.0–1.0. */
  weight: number;
  /** Tage seit der letzten Übung dieses Konzepts. */
  daysSinceLastPractice: number;
  errorType: ErrorCategoryName;
  /** Trat derselbe Fehlertyp bei diesem Konzept schon zuletzt auf? */
  repeatedErrorType: boolean;
  confidenceBefore?: ConfidenceLevel | null;
}

export interface MasteryUpdate {
  state: MasteryState;
  /** Veränderung des Kompetenzwerts (kann negativ sein). */
  delta: number;
  /** Für Menschen lesbare Begründung – wird im Fortschrittsbereich angezeigt. */
  reasons: string[];
  algorithmVersion: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Eigenständigkeit: Wie viel hat die Person selbst geleistet? */
export function independenceFactor(hintsUsed: number, config: MasteryConfig): number {
  return clamp(1 - config.hintPenaltyPerLevel * hintsUsed, config.minIndependence, 1);
}

/**
 * Aufgaben mit weniger Vorgaben belegen mehr. Eine Aufgabe mit hoher
 * Gerüst-Stufe (wenig Hilfe) zeigt mehr Können als eine mit niedriger.
 */
export function scaffoldFactor(scaffoldLevel: number): number {
  const table: Record<number, number> = { 1: 0.3, 2: 0.5, 3: 0.75, 4: 0.9, 5: 1.0, 6: 1.15 };
  return table[clamp(Math.round(scaffoldLevel), 1, 6)] ?? 1;
}

const TRANSFER_TYPES: ReadonlySet<ExerciseTypeName> = new Set(['TRANSFER']);
const REVIEW_TYPES: ReadonlySet<ExerciseTypeName> = new Set(['SPACED_REVIEW']);

/**
 * Berechnet den neuen Kompetenzstand aus dem alten Stand und einem
 * Bearbeitungsergebnis.
 */
export function updateMastery(
  previous: MasteryState,
  evidence: MasteryEvidence,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): MasteryUpdate {
  const reasons: string[] = [];
  const state: MasteryState = { ...previous };

  const isTransfer = TRANSFER_TYPES.has(evidence.exerciseType);
  const isDelayedReview =
    REVIEW_TYPES.has(evidence.exerciseType) || evidence.daysSinceLastPractice >= 1;

  // --- Musterlösung angesehen ---------------------------------------------
  if (evidence.outcome === 'SOLUTION_REVEALED') {
    const cappedScore = Math.min(state.masteryScore, config.solutionRevealedCap);
    const delta = cappedScore - previous.masteryScore;
    return {
      state: {
        ...state,
        masteryScore: round2(cappedScore),
        stability: Math.max(1, state.stability * config.stabilityDecay),
      },
      delta: round2(delta),
      reasons: [
        'Die Musterlösung wurde angesehen. Eine gesehene Lösung belegt noch kein eigenes Können – deshalb steigt der Wert hier nicht.',
        'Als Nächstes kommt eine ähnliche Aufgabe ohne Vorlage.',
      ],
      algorithmVersion: config.version,
    };
  }

  const independence = independenceFactor(evidence.hintsUsed, config);
  const scaffold = scaffoldFactor(evidence.scaffoldLevel);
  const difficultyFactor = 0.7 + 0.12 * clamp(evidence.exerciseDifficulty, 1, 5);
  const weight = clamp(evidence.weight, 0, 1);

  // --- Erfolg ---------------------------------------------------------------
  if (evidence.outcome === 'PASSED' || evidence.outcome === 'PARTIAL') {
    const partial = evidence.outcome === 'PARTIAL' ? config.partialFactor : 1;
    let gain = config.baseGain * independence * scaffold * difficultyFactor * weight * partial;

    // Abnehmender Ertrag: Je höher der Stand, desto kleiner der Zugewinn.
    gain *= (100 - state.masteryScore) / 100 + 0.15;

    if (isTransfer && evidence.outcome === 'PASSED') {
      gain *= config.transferBonus;
      state.transferSuccesses += 1;
      reasons.push(
        'Das Konzept wurde in einem neuen Zusammenhang angewendet. Das zählt besonders stark.',
      );
    }
    if (isDelayedReview && evidence.outcome === 'PASSED') {
      gain *= config.delayedReviewBonus;
      reasons.push(
        `Der Abruf gelang nach ${Math.round(evidence.daysSinceLastPractice)} Tag(en) Pause. Verzögerter Abruf festigt besonders gut.`,
      );
    }

    if (evidence.hintsUsed === 0 && evidence.outcome === 'PASSED') {
      reasons.push('Vollständig eigenständig gelöst.');
    } else if (evidence.hintsUsed > 0) {
      reasons.push(
        `Gelöst mit ${evidence.hintsUsed} Hinweis(en). Der Zugewinn ist dadurch geringer als bei einer Lösung ohne Hilfe.`,
      );
    }
    if (evidence.outcome === 'PARTIAL') {
      reasons.push('Teilweise richtig – ein Teil des Konzepts sitzt bereits.');
    }

    state.masteryScore = clamp(state.masteryScore + gain, 0, 100);
    if (evidence.outcome === 'PASSED') {
      state.successfulRetrievals += 1;
      state.stability = Math.max(
        1,
        state.stability *
          (1 + (config.stabilityGrowth - 1) * independence * (isDelayedReview ? 1.3 : 0.6)),
      );
      state.difficulty = clamp(state.difficulty - 0.12 * independence, 1, 5);
    }

    // Metakognition: richtig, aber unsicher -> zusätzliche Festigung nötig.
    if (
      evidence.outcome === 'PASSED' &&
      (evidence.confidenceBefore === 'UNSURE' || evidence.confidenceBefore === 'RATHER_UNSURE')
    ) {
      state.stability = Math.max(1, state.stability * 0.75);
      reasons.push(
        'Die Lösung war richtig, die Selbsteinschätzung vorher unsicher. Eine zusätzliche Wiederholung hilft, das Vertrauen nachzuziehen.',
      );
    }

    return {
      state: normalize(state),
      delta: round2(state.masteryScore - previous.masteryScore),
      reasons,
      algorithmVersion: config.version,
    };
  }

  // --- Misserfolg -----------------------------------------------------------
  const isSurfaceError = evidence.errorType === 'SURFACE';
  let penalty = isSurfaceError ? config.surfaceErrorPenalty : config.misconceptionPenalty;

  if (isSurfaceError) {
    reasons.push(
      'Der Fehler liegt in einem übersehenen Detail, nicht im Konzept. Das wirkt sich nur gering auf den Kompetenzwert aus.',
    );
  } else {
    reasons.push('Das Konzept greift hier noch nicht sicher.');
  }

  if (evidence.repeatedErrorType && !isSurfaceError) {
    penalty += config.repeatedErrorPenalty;
    reasons.push(
      'Derselbe Fehlertyp trat erneut auf. Dieses Konzept wird gezielt früher wiederholt.',
    );
  }

  // Hohe Sicherheit bei falscher Antwort: deutliches Signal für eine Wissenslücke.
  if (evidence.confidenceBefore === 'VERY_SURE' || evidence.confidenceBefore === 'RATHER_SURE') {
    penalty += 2;
    reasons.push(
      'Die Selbsteinschätzung war sicher, das Ergebnis nicht. Solche Stellen werden leicht übersehen – deshalb kommt die Wiederholung früher.',
    );
  }

  // Teilpunkte mildern den Abzug.
  penalty *= 1 - clamp(evidence.score, 0, 1) * 0.5;

  state.masteryScore = clamp(state.masteryScore - penalty * weight, 0, 100);
  state.failedRetrievals += 1;
  state.stability = Math.max(1, state.stability * config.stabilityDecay);
  state.difficulty = clamp(state.difficulty + 0.2, 1, 5);

  return {
    state: normalize(state),
    delta: round2(state.masteryScore - previous.masteryScore),
    reasons,
    algorithmVersion: config.version,
  };
}

function normalize(state: MasteryState): MasteryState {
  return {
    masteryScore: round2(clamp(state.masteryScore, 0, 100)),
    stability: round2(clamp(state.stability, 1, 400)),
    difficulty: round2(clamp(state.difficulty, 1, 5)),
    successfulRetrievals: state.successfulRetrievals,
    failedRetrievals: state.failedRetrievals,
    transferSuccesses: state.transferSuccesses,
  };
}

// ---------------------------------------------------------------------------
// Kommunikation nach außen
// ---------------------------------------------------------------------------

export type MasteryBand = 'new' | 'building' | 'usable' | 'solid' | 'durable';

export interface MasteryDescription {
  band: MasteryBand;
  label: string;
  /** Was dieser Stand praktisch bedeutet. */
  meaning: string;
  /** Was als Nächstes hilft. */
  nextStep: string;
}

/**
 * Ordnet einen Wert einem Band zu. Nach außen wird das Band kommuniziert,
 * nicht die Nachkommastelle – ein Wert von 82 ist keine objektive Messung
 * menschlicher Fähigkeit.
 */
export function masteryBand(score: number): MasteryBand {
  if (score < 40) return 'new';
  if (score < 60) return 'building';
  if (score < 80) return 'usable';
  if (score < 90) return 'solid';
  return 'durable';
}

const DESCRIPTIONS: Record<MasteryBand, MasteryDescription> = {
  new: {
    band: 'new',
    label: 'Noch neu',
    meaning: 'Du hattest bisher wenig Gelegenheit, dieses Konzept selbst anzuwenden.',
    nextStep: 'Arbeite die Lektion durch und löse die geführten Aufgaben.',
  },
  building: {
    band: 'building',
    label: 'Im Aufbau',
    meaning: 'Mit Hilfen gelingt es, ohne Vorlage ist es noch wackelig.',
    nextStep: 'Versuche die nächste Aufgabe bewusst ohne Hinweis zu starten.',
  },
  usable: {
    band: 'usable',
    label: 'Grundsätzlich anwendbar',
    meaning: 'Du kannst das Konzept in bekannten Situationen einsetzen.',
    nextStep: 'Eine Transferaufgabe in neuem Kontext zeigt, wie tragfähig das ist.',
  },
  solid: {
    band: 'solid',
    label: 'Sicher',
    meaning: 'Das Konzept sitzt auch ohne Vorlage und in wechselnden Aufgaben.',
    nextStep: 'Verknüpfe es mit anderen Konzepten in einem Lab.',
  },
  durable: {
    band: 'durable',
    label: 'Nachhaltig beherrscht',
    meaning: 'Auch nach längeren Pausen gelingt der Abruf zuverlässig.',
    nextStep: 'Gelegentliche Wiederholungen genügen, um das zu halten.',
  },
};

export function describeMastery(score: number): MasteryDescription {
  return DESCRIPTIONS[masteryBand(score)];
}

/** Gilt ein Konzept als ausreichend gefestigt, um darauf aufzubauen? */
export function meetsPrerequisite(
  score: number,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): boolean {
  return score >= config.unlockThreshold;
}

// ---------------------------------------------------------------------------
// Metakognition: Sicherheit gegen Leistung
// ---------------------------------------------------------------------------

export const CONFIDENCE_VALUES: Record<ConfidenceLevel, number> = {
  UNSURE: 0.15,
  RATHER_UNSURE: 0.4,
  RATHER_SURE: 0.7,
  VERY_SURE: 0.95,
};

export interface CalibrationSummary {
  samples: number;
  averageConfidence: number;
  actualSuccessRate: number;
  /** Positiv = Selbstüberschätzung, negativ = Unterschätzung. */
  gap: number;
  message: string;
}

export function summarizeCalibration(
  entries: ReadonlyArray<{ confidence: ConfidenceLevel; passed: boolean }>,
): CalibrationSummary {
  if (entries.length === 0) {
    return {
      samples: 0,
      averageConfidence: 0,
      actualSuccessRate: 0,
      gap: 0,
      message:
        'Sobald du bei einigen Aufgaben deine Sicherheit einschätzt, siehst du hier, wie gut Gefühl und Ergebnis zusammenpassen.',
    };
  }

  const averageConfidence =
    entries.reduce((sum, e) => sum + CONFIDENCE_VALUES[e.confidence], 0) / entries.length;
  const actualSuccessRate = entries.filter((e) => e.passed).length / entries.length;
  const gap = averageConfidence - actualSuccessRate;

  let message: string;
  if (entries.length < 5) {
    message =
      'Noch zu wenige Einschätzungen für eine belastbare Aussage. Schätze bei den nächsten Aufgaben weiter mit ein.';
  } else if (gap > 0.2) {
    message =
      'Deine Einschätzung liegt öfter über dem Ergebnis. Das ist normal und gut zu beheben: Prüfe vor dem Absenden noch einmal, was genau die Aufgabe verlangt.';
  } else if (gap < -0.2) {
    message =
      'Du löst mehr richtig, als du dir zutraust. Deine Einschätzung darf ruhig etwas selbstbewusster ausfallen.';
  } else {
    message =
      'Deine Einschätzung und dein Ergebnis passen gut zusammen. Das ist eine hilfreiche Fähigkeit beim Umgang mit AI-Werkzeugen.';
  }

  return {
    samples: entries.length,
    averageConfidence: round2(averageConfidence),
    actualSuccessRate: round2(actualSuccessRate),
    gap: round2(gap),
    message,
  };
}
