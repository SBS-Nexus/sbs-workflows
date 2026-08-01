import type { ConfidenceLevel, MasteryState } from '@/domain/mastery/mastery';
import type { ErrorCategoryName } from '@/domain/errors/python-errors';

/**
 * Wiederholungsplanung.
 *
 * Ausgangspunkt ist die im Lernmodell genannte Intervallleiter
 * (Ende der Lerneinheit → 1 → 3 → 7 → 14 → 30 Tage). Sie wird individuell
 * gestreckt oder gestaucht, abhängig von:
 *
 *  - Erfolg bzw. Misserfolg beim letzten Abruf
 *  - Anzahl benötigter Hinweise (Eigenständigkeit)
 *  - Gedächtnisstabilität und personenbezogener Schwierigkeit des Konzepts
 *  - Selbsteinschätzung im Verhältnis zum Ergebnis
 *  - Art des Fehlers (Schreibweise vs. Konzept)
 *  - bereits nachgewiesener Transferleistung
 *
 * Bearbeitungsdauer geht bewusst NICHT als Leistungsmaß ein: Gründliches
 * Nachdenken ist erwünscht, nicht Tempo.
 */

export const SCHEDULER_VERSION = '1.0.0';

/** Basisleiter in Tagen. Index = Anzahl bisheriger erfolgreicher Wiederholungen. */
export const BASE_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30] as const;

/** Kürzestes und längstes Intervall in Tagen. */
export const MIN_INTERVAL_DAYS = 0;
export const MAX_INTERVAL_DAYS = 120;

export interface ScheduleInput {
  /** Zustand des Konzepts NACH der Aktualisierung durch updateMastery(). */
  mastery: MasteryState;
  /** Wievielte Wiederholung war das? 0 = Erstbearbeitung. */
  repetition: number;
  passed: boolean;
  hintsUsed: number;
  errorType: ErrorCategoryName;
  confidenceBefore?: ConfidenceLevel | null;
  /** Zeitpunkt der Bearbeitung. */
  now: Date;
}

export interface ScheduleResult {
  dueAt: Date;
  intervalDays: number;
  repetition: number;
  /** Für Menschen lesbare Begründung – wird im Wiederholungscenter angezeigt. */
  reason: string;
  schedulerVersion: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function baseInterval(repetition: number): number {
  const index = clamp(repetition, 0, BASE_INTERVALS_DAYS.length - 1);
  return BASE_INTERVALS_DAYS[index] ?? 30;
}

export function scheduleNextReview(input: ScheduleInput): ScheduleResult {
  const { mastery, passed, hintsUsed, errorType, confidenceBefore, now } = input;

  // --- Misserfolg: zurück auf eine kurze Wiederholung ----------------------
  if (!passed) {
    const isSurfaceError = errorType === 'SYNTAX' || errorType === 'INDENTATION';
    // Reine Schreibfehler setzen den Lernstand nicht komplett zurück.
    const repetition = isSurfaceError ? Math.max(0, input.repetition - 1) : 0;
    const intervalDays = isSurfaceError ? 1 : 0;
    return {
      dueAt: addDays(now, intervalDays),
      intervalDays,
      repetition,
      reason: isSurfaceError
        ? 'Der Fehler lag in der Schreibweise. Eine kurze Auffrischung morgen genügt.'
        : 'Das Konzept war noch nicht abrufbar. Die Wiederholung steht direkt in dieser Lerneinheit an.',
      schedulerVersion: SCHEDULER_VERSION,
    };
  }

  const repetition = input.repetition + 1;
  let intervalDays = baseInterval(repetition);
  const reasons: string[] = [];

  // --- Eigenständigkeit -----------------------------------------------------
  if (hintsUsed === 0) {
    intervalDays *= 1.15;
    reasons.push('ohne Hinweise gelöst');
  } else if (hintsUsed >= 3) {
    intervalDays *= 0.6;
    reasons.push('mit deutlicher Hilfe gelöst');
  } else {
    intervalDays *= 0.85;
    reasons.push('mit kleiner Hilfe gelöst');
  }

  // --- Stabilität und Schwierigkeit ----------------------------------------
  // stability wächst mit jedem gelungenen Abruf; difficulty wirkt dämpfend.
  const stabilityFactor = clamp(mastery.stability / 4, 0.6, 2.2);
  const difficultyFactor = clamp(2.5 / mastery.difficulty, 0.6, 1.6);
  intervalDays *= stabilityFactor * difficultyFactor;

  // --- Kompetenzstand -------------------------------------------------------
  if (mastery.masteryScore >= 90) {
    intervalDays *= 1.3;
    reasons.push('Konzept sitzt zuverlässig');
  } else if (mastery.masteryScore < 60) {
    intervalDays *= 0.7;
    reasons.push('Konzept noch im Aufbau');
  }

  // --- Transferleistung -----------------------------------------------------
  if (mastery.transferSuccesses >= 2) {
    intervalDays *= 1.15;
    reasons.push('bereits in neuen Zusammenhängen angewendet');
  }

  // --- Metakognition --------------------------------------------------------
  if (confidenceBefore === 'UNSURE' || confidenceBefore === 'RATHER_UNSURE') {
    intervalDays *= 0.7;
    reasons.push('Unsicherheit trotz richtiger Lösung');
  }

  intervalDays = clamp(Math.round(intervalDays * 10) / 10, MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS);

  return {
    dueAt: addDays(now, intervalDays),
    intervalDays,
    repetition,
    reason: `Nächste Wiederholung in ${formatInterval(intervalDays)} (${reasons.join(', ')}).`,
    schedulerVersion: SCHEDULER_VERSION,
  };
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setTime(result.getTime() + Math.round(days * 24 * 60 * 60 * 1000));
  return result;
}

export function formatInterval(days: number): string {
  if (days < 0.5) return 'dieser Lerneinheit';
  if (days < 1.5) return 'einem Tag';
  if (days < 30) return `${Math.round(days)} Tagen`;
  const months = Math.round(days / 30);
  return months === 1 ? 'etwa einem Monat' : `etwa ${months} Monaten`;
}

/** Ist eine geplante Wiederholung heute fällig? */
export function isDue(dueAt: Date, now: Date): boolean {
  return dueAt.getTime() <= now.getTime();
}

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// Interleaving
// ---------------------------------------------------------------------------

export interface InterleaveCandidate {
  exerciseId: string;
  conceptIds: string[];
  dueAt: Date;
  masteryScore: number;
  /** Wie neu ist das zugrunde liegende Konzept? Kleinere Zahl = älter. */
  introducedIndex: number;
}

/**
 * Stellt eine Wiederholungseinheit zusammen.
 *
 * Regeln:
 *  1. Überfällige Aufgaben zuerst – sonst wächst der Rückstand.
 *  2. Innerhalb der Auswahl wird gemischt: Aufgaben zum selben Konzept stehen
 *     nicht direkt hintereinander. Genau das ist der Interleaving-Effekt.
 *  3. Anfängerschutz: Solange weniger als `minConceptsForInterleaving`
 *     unterschiedliche Konzepte eingeführt sind, wird nicht gemischt. Für
 *     Menschen in den ersten Lektionen wäre das nur Überforderung.
 */
export function buildReviewBatch(
  candidates: InterleaveCandidate[],
  options: { now: Date; maxItems: number; minConceptsForInterleaving?: number },
): InterleaveCandidate[] {
  const { now, maxItems, minConceptsForInterleaving = 3 } = options;

  const due = candidates
    .filter((c) => isDue(c.dueAt, now))
    .sort((a, b) => {
      // Überfälligkeit zuerst, dann niedrigerer Kompetenzstand.
      const overdue = a.dueAt.getTime() - b.dueAt.getTime();
      if (overdue !== 0) return overdue;
      return a.masteryScore - b.masteryScore;
    });

  const distinctConcepts = new Set(due.flatMap((c) => c.conceptIds));
  const selected = due.slice(0, maxItems);

  if (distinctConcepts.size < minConceptsForInterleaving) return selected;

  return spreadByConcept(selected);
}

/** Sortiert so um, dass gleiche Konzepte möglichst nicht aufeinanderfolgen. */
function spreadByConcept(items: InterleaveCandidate[]): InterleaveCandidate[] {
  const remaining = [...items];
  const result: InterleaveCandidate[] = [];
  let lastConcepts = new Set<string>();

  while (remaining.length > 0) {
    let pickIndex = remaining.findIndex((c) => !c.conceptIds.some((id) => lastConcepts.has(id)));
    if (pickIndex === -1) pickIndex = 0;
    const [picked] = remaining.splice(pickIndex, 1);
    if (!picked) break;
    result.push(picked);
    lastConcepts = new Set(picked.conceptIds);
  }

  return result;
}
