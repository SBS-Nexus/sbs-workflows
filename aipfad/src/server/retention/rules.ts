import 'server-only';
import { prisma } from '@/server/db/prisma';
import { getEnv } from '@/server/env';
import { cutoffFromDays } from '@/server/retention/runner';
import type { RetentionRule } from '@/server/retention/types';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Die Aufbewahrungsregeln, die im Betrieb wirklich laufen.
 *
 * Diese Datei ist die eine Stelle, an der sich entscheidet, welche Datenarten
 * automatisch aufgeräumt werden. Eine neue Art kommt hier dazu — sichtbar in
 * jeder Durchsicht, nicht über Verzeichnis-Absuche, Dekoratoren oder ein
 * Plugin-System, bei dem man die Liste erst zur Laufzeit kennt.
 */

/**
 * Versuchsdaten (`Attempt`).
 *
 * Bis E04A lag diese Logik in `server/auth/session.ts:applyRetentionPolicy()`
 * und hatte keinen Aufrufer. Sie ist hierher gewandert und dort entfernt
 * worden: Aufbewahrung ist keine Sitzungsverwaltung, und zwei Fassungen
 * derselben Löschbedingung wären genau die Doppelung, die später auseinander
 * läuft. Die Bedingung selbst ist unverändert — `createdAt < cutoff`, Frist aus
 * `ATTEMPT_RETENTION_DAYS`, 0 schaltet ab.
 */
function attemptRetentionWhere(cutoff: Date): Prisma.AttemptWhereInput {
  return { createdAt: { lt: cutoff } };
}

export const attemptRetentionRule: RetentionRule = {
  id: 'ATTEMPT_RETENTION',
  dataCategory: 'Attempt',
  retentionDaysEnvVar: 'ATTEMPT_RETENTION_DAYS',

  retentionDays: () => getEnv().ATTEMPT_RETENTION_DAYS,

  cutoffAt: cutoffFromDays,

  // Zählen und Löschen bauen ihre Prisma-Bedingung über dieselbe Funktion.
  // Damit gibt es für Attempt nur eine Stelle für die fachliche Grenze
  // `createdAt < cutoff`; Trockenlauf und Ernstfall können hier nicht durch
  // zwei getrennte Where-Literale auseinanderdriften.
  countCandidates: (cutoff) => prisma.attempt.count({ where: attemptRetentionWhere(cutoff) }),

  deleteCandidates: async (cutoff) => {
    const ergebnis = await prisma.attempt.deleteMany({ where: attemptRetentionWhere(cutoff) });
    return ergebnis.count;
  },
};

/**
 * Die verbindliche Liste für den Betrieb.
 *
 * Heute genau eine Regel. E07 soll `AUDIT_RETENTION` hier anfügen können, ohne
 * am Lauf, an der Route oder am Zeitplan etwas zu ändern.
 */
export const PRODUKTIVE_REGELN: readonly RetentionRule[] = [attemptRetentionRule];
