import type { AuditAction } from '@/server/audit/actions';
import type { AuditMetadata } from '@/server/audit/redaction';

/**
 * Die Schnittstelle der Auditgrundlage (E07/ENT-B06).
 *
 * Ohne Prisma und ohne `server-only`, damit Validierung und Schwärzung auf
 * der Unit-Ebene prüfbar bleiben — dieselbe Trennung wie im
 * Aufbewahrungsrahmen aus E04A.
 *
 * NUR ANFÜGEN UND LESEN. Es gibt hier absichtlich keinen Typ für Ändern
 * oder Löschen: Was die Schnittstelle nicht beschreibt, kann ein Aufrufer
 * nicht versehentlich benutzen. Das ist eine Zusicherung der
 * ANWENDUNGSSCHNITTSTELLE, keine Manipulationssicherheit der Datenbank —
 * wer Schreibrechte auf der Datenbank hat, kann Zeilen weiterhin ändern.
 */

/** Eingabe für das Anfügen. `occurredAt` vergibt der Dienst. */
export interface AppendAuditEventInput {
  action: AuditAction;
  /** Abbild, kein Fremdschlüssel. Fehlt, wenn kein Akteur beteiligt war. */
  actorUserId?: string;
  /** Abbild, kein Fremdschlüssel. Es gibt bis E08 keine Organisationen. */
  organizationId?: string;
  /** Art des betroffenen Gegenstands, etwa `User`. */
  targetType: string;
  targetId?: string;
  /** Knappe betriebliche Tatsachen. Wird vor dem Schreiben geschwärzt. */
  metadata?: Record<string, unknown>;
}

/** Eine gelesene Auditzeile. */
export interface AuditEventRecord {
  id: string;
  action: AuditAction;
  actorUserId: string | null;
  organizationId: string | null;
  targetType: string;
  targetId: string | null;
  metadata: AuditMetadata;
  occurredAt: Date;
}

/**
 * Filter für das Lesen.
 *
 * Bewusst knapp: genau die Zugriffe, für die es einen belegten Bedarf gibt
 * (E04B liest die Zeilen der angemeldeten Person; eine spätere
 * Organisationsprüfung liest die einer Organisation; eine Prüfung nach
 * Vorgangsart über einen Zeitraum). Jeder davon hat einen passenden Index.
 *
 * `actorUserId` kommt in E04B aus der SITZUNG, nie aus der Eingabe. E07
 * baut dafür keine Route; wer später eine baut, muss diese Grenze selbst
 * ziehen.
 */
export interface AuditEventQuery {
  actorUserId?: string;
  organizationId?: string;
  action?: AuditAction;
  /** Untergrenze, einschließlich. */
  occurredFrom?: Date;
  /** Obergrenze, ausschließlich — dieselbe Halboffenheit wie die Grenze der Aufbewahrung. */
  occurredBefore?: Date;
  /** Höchstzahl der Zeilen. Gedeckelt, siehe `HOECHSTES_LIMIT`. */
  take?: number;
}
