/**
 * Berechtigungen innerhalb einer Organisation.
 *
 * Bewusst als reine Funktionen und nicht als Prüfung im Datenzugriff: So lässt
 * sich jede Regel einzeln belegen, und dieselbe Regel gilt an jeder Stelle.
 * Die Prüfung selbst passiert trotzdem dort, wo die Daten gelesen werden – die
 * Funktionen hier ersetzen das nicht, sie beschreiben es nur einheitlich.
 *
 * Grundhaltung: Eine Lehrkraft ist keine Aufsicht. Sie soll erkennen können,
 * wo eine Gruppe hängt, um den Unterricht danach auszurichten – nicht, wer
 * wann wie lange am Rechner saß. Deshalb gibt es keine Berechtigung, einzelne
 * Versuche, Zeiten oder Fehlermeldungen einer Person einzusehen, und die
 * namentliche Ansicht setzt eine Einwilligung voraus, die die lernende Person
 * selbst gibt und jederzeit zurücknehmen kann.
 */

export type OrgRoleName = 'OWNER' | 'TEACHER' | 'MEMBER';

/** Was in einer Organisation getan werden kann. */
export type OrgCapability =
  /** Organisation umbenennen, beschreiben, Mitglieder verwalten. */
  | 'organisation.verwalten'
  /** Kohorten anlegen, umbenennen, archivieren. */
  | 'kohorte.verwalten'
  /** Einladungen erstellen und zurückziehen. */
  | 'einladung.verwalten'
  /** Summenwerte einer Kohorte einsehen. */
  | 'kohorte.summen-lesen'
  /** Namentliche Einzelansicht – zusätzlich zur Einwilligung der Person. */
  | 'kohorte.einzeln-lesen'
  /** Prüfprotokoll einsehen. */
  | 'protokoll.lesen';

const CAPABILITIES: Readonly<Record<OrgRoleName, readonly OrgCapability[]>> = {
  OWNER: [
    'organisation.verwalten',
    'kohorte.verwalten',
    'einladung.verwalten',
    'kohorte.summen-lesen',
    'kohorte.einzeln-lesen',
    'protokoll.lesen',
  ],
  TEACHER: [
    'kohorte.verwalten',
    'einladung.verwalten',
    'kohorte.summen-lesen',
    'kohorte.einzeln-lesen',
  ],
  MEMBER: [],
};

export function can(role: OrgRoleName, capability: OrgCapability): boolean {
  return CAPABILITIES[role].includes(capability);
}

/** Deutsche Bezeichnung der Rolle für die Anzeige. */
export const ROLE_LABELS: Readonly<Record<OrgRoleName, string>> = {
  OWNER: 'Inhaberin oder Inhaber',
  TEACHER: 'Lehrkraft',
  MEMBER: 'Lernende Person',
};

export const ROLE_DESCRIPTIONS: Readonly<Record<OrgRoleName, string>> = {
  OWNER: 'Verwaltet die Organisation, legt Kohorten an, lädt ein und sieht das Prüfprotokoll.',
  TEACHER:
    'Legt Kohorten an, lädt ein und sieht den Stand ihrer Kohorten. Kein Zugriff auf die Verwaltung der Organisation.',
  MEMBER: 'Lernt in einer oder mehreren Kohorten. Sieht nur die eigenen Daten.',
};

/**
 * Darf der Fortschritt dieser Person namentlich angezeigt werden?
 *
 * Zwei Bedingungen müssen zusammenkommen: die Berechtigung der abrufenden
 * Person und die Einwilligung der betroffenen. Die Reihenfolge der Prüfung ist
 * gleichgültig, das Zusammenspiel nicht – eine Lehrkraft ohne Einwilligung
 * sieht ebenso wenig wie eine einwilligende Person ohne Lehrkraft.
 */
export function mayViewNamedProgress(viewerRole: OrgRoleName, learnerConsented: boolean): boolean {
  return can(viewerRole, 'kohorte.einzeln-lesen') && learnerConsented;
}

/**
 * Mindestgröße für die Anzeige von Summenwerten.
 *
 * Unterhalb dieser Zahl wird nichts ausgewiesen. In einer Kohorte mit zwei
 * Personen wäre ein Durchschnittswert kein Summenwert mehr, sondern eine
 * Aussage über einzelne Menschen – und zwar eine, der niemand zugestimmt hat.
 */
export const MIN_COHORT_SIZE_FOR_AGGREGATES = 3;

export function mayShowAggregates(memberCount: number): boolean {
  return memberCount >= MIN_COHORT_SIZE_FOR_AGGREGATES;
}
