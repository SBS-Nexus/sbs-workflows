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
 * Auditzeilen (`AuditEvent`, E07/ENT-B06).
 *
 * Die zweite produktive Regel — und der Beleg, dass der Rahmen aus E04A
 * hält, was er versprochen hat: Sie kommt hier als Listeneintrag dazu, ohne
 * eine Zeile am Lauf, an der Route oder am Zeitplan zu ändern.
 *
 * Diese Regel ist der EINZIGE Löschweg für Auditzeilen. Sie löscht
 * ausschließlich nach Alter und kann keine einzelne Spur entfernen; einen
 * fachlichen Löschpfad gibt es nicht (`src/server/audit/service.ts`).
 *
 * Die Frist ist streng größer als 0 (`env.ts`), anders als bei `Attempt`.
 * Abschalten wäre hier kein Ruhezustand, sondern die Zusage, nie zu
 * löschen — und damit das Gegenteil des Aufbewahrungsvertrags.
 */
function auditRetentionWhere(cutoff: Date): Prisma.AuditEventWhereInput {
  return { occurredAt: { lt: cutoff } };
}

export const auditRetentionRule: RetentionRule = {
  id: 'AUDIT_RETENTION',
  dataCategory: 'AuditEvent',
  retentionDaysEnvVar: 'AUDIT_RETENTION_DAYS',

  retentionDays: () => getEnv().AUDIT_RETENTION_DAYS,

  cutoffAt: cutoffFromDays,

  // Dieselbe Bauweise wie bei Attempt: EINE Stelle für die fachliche Grenze,
  // von Zählen und Löschen gemeinsam benutzt.
  countCandidates: (cutoff) => prisma.auditEvent.count({ where: auditRetentionWhere(cutoff) }),

  deleteCandidates: async (cutoff) => {
    const ergebnis = await prisma.auditEvent.deleteMany({ where: auditRetentionWhere(cutoff) });
    return ergebnis.count;
  },
};

/**
 * Die verbindliche Liste für den Betrieb.
 *
 * Seit E07 zwei Regeln. Jede trägt ihre eigene Frist aus ihrer eigenen
 * Variablen; sie laufen nacheinander und unabhängig, und eine scheiternde
 * hält die andere nicht auf (siehe `runner.ts`).
 */
export const PRODUKTIVE_REGELN: readonly RetentionRule[] = [
  attemptRetentionRule,
  auditRetentionRule,
];
