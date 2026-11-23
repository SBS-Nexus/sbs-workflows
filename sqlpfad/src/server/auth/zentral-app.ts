import 'server-only';

/**
 * App-eigene Werte der Anmeldung über das gemeinsame Konto. Nicht Teil des
 * Vertrags docs/learning-auth/; die Vertragsdateien lesen sie von hier.
 */

/** Name des Zustandscookies; unter https mit `__Host-`-Präfix. */
export const ANMELDE_COOKIE = 'sqlpfad_anmeldung';

/** Wohin es nach der Anmeldung geht, wenn kein Ziel gemerkt ist. */
export const STARTSEITE = '/fortschritt';
