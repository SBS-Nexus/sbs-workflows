import type { SourceProgress } from './contract.ts';

/**
 * „Zuletzt aktiv" einer Quelle — ohne einen Zeitpunkt zu erfinden.
 *
 * Der Vertrag erlaubt Aktivität ohne bekannten Zeitpunkt (z. B. eine begonnene
 * Lektion ohne Versuch und ohne Abschluss). Das ist nicht „noch nie": Die
 * Quelle meldet Aktivität, kennt aber keinen letzten Zeitpunkt. Ein Ersatz
 * aus `generatedAt` wäre falsch, denn das ist der Abrufzeitpunkt.
 */
export type LastActive =
  | { kind: 'timestamp'; at: string }
  /** Aktivität gemeldet, aber kein Zeitpunkt erfasst. */
  | { kind: 'unrecorded' }
  /** Keine Aktivität gemeldet. */
  | { kind: 'never' };

export function lastActiveOf(progress: Pick<SourceProgress, 'hasActivity' | 'lastActiveAt'>): LastActive {
  if (progress.lastActiveAt !== null) return { kind: 'timestamp', at: progress.lastActiveAt };
  return progress.hasActivity ? { kind: 'unrecorded' } : { kind: 'never' };
}
