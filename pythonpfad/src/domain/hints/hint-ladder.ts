import type { Hint } from '@/domain/content/exercise-payload';

/**
 * Progressive Hinweisleiter.
 *
 * Ziel ist nicht, Hilfe zu verweigern, sondern sie in der Reihenfolge zu geben,
 * die das eigene Denken am wenigsten ersetzt:
 *
 *   1 Denkimpuls        – eine Frage, die den nächsten eigenen Schritt anstößt
 *   2 Konzept-Hinweis   – Erinnerung an das zugrunde liegende Prinzip
 *   3 Struktur          – Lösungsweg als Pseudocode, ohne Python
 *   4 Teilcode          – nur der kritische Ausschnitt
 *   5 Erklärung         – vollständige Erläuterung samt Musterlösung
 *
 * Stufe 5 wird erst nach mehreren eigenen Versuchen freigegeben. Wer sie nutzt,
 * bekommt anschließend eine ähnliche Aufgabe ohne Vorlage – eine gesehene
 * Lösung zählt ausdrücklich nicht als gemeisterte Aufgabe.
 */

export const HINT_LADDER_VERSION = '1.0.0';

/** Mindestanzahl eigener Versuche, bevor die jeweilige Stufe verfügbar wird. */
export const MIN_ATTEMPTS_FOR_LEVEL: Record<number, number> = {
  1: 0,
  2: 1,
  3: 1,
  4: 2,
  5: 3,
};

export interface HintAvailability {
  level: number;
  available: boolean;
  /** Warum ist die Stufe (noch) nicht verfügbar? */
  blockedReason?: string;
  /** Wie viele Versuche fehlen noch? */
  attemptsMissing: number;
}

export interface HintLadderState {
  /** Höchste bereits aufgedeckte Stufe (0 = keine). */
  revealedLevel: number;
  /** Anzahl echter Einreichversuche für diese Aufgabe. */
  attempts: number;
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Denkimpuls',
  2: 'Konzept',
  3: 'Lösungsstruktur',
  4: 'Teilcode',
  5: 'Vollständige Erklärung',
};

export function hintLevelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? `Stufe ${level}`;
}

/**
 * Prüft, ob eine Hinweisstufe aufgedeckt werden darf.
 *
 * Die Regel lautet: Stufen werden der Reihe nach freigegeben, und jede höhere
 * Stufe setzt eine Mindestanzahl eigener Versuche voraus.
 */
export function evaluateHintAvailability(
  hints: readonly Hint[],
  state: HintLadderState,
): HintAvailability[] {
  return hints.map((hint) => {
    const required = MIN_ATTEMPTS_FOR_LEVEL[hint.level] ?? hint.level - 1;
    const attemptsMissing = Math.max(0, required - state.attempts);

    // Stufen müssen der Reihe nach genommen werden.
    const previousRevealed = hint.level <= state.revealedLevel + 1;

    if (!previousRevealed) {
      return {
        level: hint.level,
        available: false,
        attemptsMissing,
        blockedReason: `Zuerst kommt der Hinweis "${hintLevelLabel(state.revealedLevel + 1)}".`,
      };
    }

    if (attemptsMissing > 0) {
      return {
        level: hint.level,
        available: false,
        attemptsMissing,
        blockedReason:
          attemptsMissing === 1
            ? 'Versuche es zuerst noch einmal selbst. Danach wird dieser Hinweis frei.'
            : `Noch ${attemptsMissing} eigene Versuche, dann wird dieser Hinweis frei.`,
      };
    }

    return { level: hint.level, available: true, attemptsMissing: 0 };
  });
}

export function canRevealSolution(state: HintLadderState, hints: readonly Hint[]): boolean {
  const maxLevel = hints.reduce((max, h) => Math.max(max, h.level), 0);
  const requiredAttempts = MIN_ATTEMPTS_FOR_LEVEL[5] ?? 3;
  return state.attempts >= requiredAttempts && (maxLevel === 0 || state.revealedLevel >= maxLevel);
}

/**
 * Gibt zurück, welche Hinweise an den Browser ausgeliefert werden dürfen.
 * Nicht freigegebene Hinweise verlassen den Server erst gar nicht.
 */
export function visibleHints(hints: readonly Hint[], state: HintLadderState): Hint[] {
  return hints.filter((hint) => hint.level <= state.revealedLevel);
}

/**
 * Nach dem Ansehen einer Musterlösung ist eine Nacharbeit fällig.
 * Diese Struktur beschreibt, was das UI und der Fortschrittsdienst daraus machen.
 */
export interface FollowUpRequirement {
  required: true;
  /** Aufgabe, die stattdessen bearbeitet werden muss. */
  reason: string;
}

export function followUpAfterSolution(): FollowUpRequirement {
  return {
    required: true,
    reason:
      'Du hast die Musterlösung gesehen. Damit das Konzept wirklich sitzt, folgt eine ähnliche Aufgabe ohne Vorlage. Erst die zählt als gelöst.',
  };
}
