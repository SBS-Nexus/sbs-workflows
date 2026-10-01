/**
 * Das kanonische Verzeichnis der prüfpflichtigen Vorgänge (E07/ENT-B06).
 *
 * EINE Liste, nicht zwei. Die Zuordnung Vorgang -> Eigentümerpunkt ist die
 * Quelle; der Typ `AuditAction` wird daraus abgeleitet. Zwei getrennte
 * Listen — etwa ein String-Union hier und eine Eigentümertabelle dort —
 * liefen unweigerlich auseinander, und der Fehler fiele erst auf, wenn ein
 * Vorgang keinen Erzeuger hat oder ein Erzeuger keinen Vorgang.
 *
 * Bewusst KEIN Prisma-Enum in der Datenbank. Die Spalte `AuditEvent.action`
 * ist `String`; die zulässige Menge erzwingt der Dienst in `service.ts`. Ein
 * Enum wäre eine zweite Liste an einer dritten Stelle und verlangte für
 * jeden künftigen Vorgang eine Migration — für eine Zusicherung, die die
 * Anwendung ohnehin prüfen muss, weil sie die Einzige ist, die schreibt.
 *
 * Der Eigentümer sagt, WER den Erzeuger mitbringt. E07 bringt keinen: Die
 * Grundlage entsteht hier, die Ereignisse entstehen dort, wo der jeweilige
 * Vorgang entsteht. Wer einen prüfpflichtigen Vorgang einführt, liefert
 * seinen Erzeuger in derselben Änderung mit.
 */

export const AUDIT_ACTION_OWNERS = {
  // --- Fundament ---
  PERSONAL_DATA_EXPORTED: 'E04B',
  ACCOUNT_DELETED: 'E04C',
  ORGANIZATION_CREATED: 'E08B',
  ORGANIZATION_UPDATED: 'E08B',
  ORGANIZATION_MEMBER_ADDED: 'E08B',
  ORGANIZATION_MEMBER_REMOVED: 'E08B',
  ORGANIZATION_MEMBER_ROLE_CHANGED: 'E08B',
  PLATFORM_ROLE_MIGRATED: 'E09B',

  // --- Bezahlter Einsatz ---
  COHORT_CREATED: 'E11A',
  COHORT_UPDATED: 'E11A',
  COHORT_DELETED: 'E11A',
  COURSE_ASSIGNMENT_CREATED: 'E11B',
  COURSE_ASSIGNMENT_REMOVED: 'E11B',
  OIDC_CONFIGURATION_CHANGED: 'E12',
  ORGANIZATION_SUSPENDED: 'E13A',
  ORGANIZATION_REACTIVATED: 'E13A',
  ORGANIZATION_DELETED: 'E13B',
} as const;

/** Eine zulässige Vorgangsbezeichnung. Abgeleitet, nicht zweitgeschrieben. */
export type AuditAction = keyof typeof AUDIT_ACTION_OWNERS;

/** Der Punkt, der den Erzeuger dieses Vorgangs mitbringt. */
export type AuditActionOwner = (typeof AUDIT_ACTION_OWNERS)[AuditAction];

/** Alle Bezeichnungen, in der Reihenfolge des Verzeichnisses. */
export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_OWNERS) as AuditAction[];

/**
 * Laufzeitprüfung für Werte, die von außen kommen.
 *
 * Nötig, weil TypeScript an der Dienstgrenze nichts garantiert: Ein Wert aus
 * der Datenbank, aus einem Test oder aus einer späteren Route ist zur
 * Laufzeit eine beliebige Zeichenkette.
 */
export function istAuditAction(wert: unknown): wert is AuditAction {
  return typeof wert === 'string' && Object.hasOwn(AUDIT_ACTION_OWNERS, wert);
}
