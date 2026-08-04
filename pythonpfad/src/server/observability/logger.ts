import 'server-only';

/**
 * Strukturierte Protokollierung.
 *
 * Eine Zeile je Ereignis, als JSON. Das ist für Menschen etwas sperriger als
 * Fließtext, aber jedes Betriebswerkzeug kann es auswerten – und im Betrieb
 * liest ohnehin selten jemand Zeile für Zeile mit.
 *
 * Was hier NICHT hineingehört, und zwar unabhängig davon, wie nützlich es beim
 * Suchen wäre:
 *  - E-Mail-Adressen, Namen, Sitzungstoken, Passwörter
 *  - eingereichter Code oder Aufgabenlösungen
 *  - vollständige Fehlermeldungen aus Nutzercode
 *
 * Erlaubt ist die Nutzerkennung, weil sie ohne Datenbankzugriff niemanden
 * identifiziert und für die Fehlersuche unverzichtbar ist. Sie wird zusätzlich
 * gekürzt, damit sie in Protokollen nicht als Ganzes auftaucht.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  /** Kennung der Anfrage, damit zusammengehörige Zeilen auffindbar sind. */
  requestId?: string;
  /** Gekürzte Nutzerkennung. Über `shortUserId` erzeugen, nicht selbst kürzen. */
  user?: string;
  /** Dauer in Millisekunden. */
  durationMs?: number;
  [key: string]: unknown;
}

/**
 * Felder, die niemals protokolliert werden – auch nicht, wenn sie jemand
 * versehentlich mitgibt. Die Liste ist die letzte Verteidigungslinie und
 * ersetzt nicht das Nachdenken an der Aufrufstelle.
 */
const VERBOTENE_FELDER = new Set([
  'email',
  'password',
  'passwort',
  'passwordHash',
  'token',
  'tokenHash',
  'csrfSecret',
  'code',
  'submittedCode',
  'solution',
  'name',
]);

function bereinigen(fields: LogFields): Record<string, unknown> {
  const sauber: Record<string, unknown> = {};
  for (const [schluessel, wert] of Object.entries(fields)) {
    if (VERBOTENE_FELDER.has(schluessel)) {
      sauber[schluessel] = '[entfernt]';
      continue;
    }
    sauber[schluessel] = wert;
  }
  return sauber;
}

/** Kürzt eine Nutzerkennung auf acht Zeichen. Für die Zuordnung genügt das. */
export function shortUserId(userId: string): string {
  return userId.slice(0, 8);
}

function schreiben(level: LogLevel, message: string, fields: LogFields = {}): void {
  const zeile = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...bereinigen(fields),
  });

  // Fehler nach stderr, alles andere nach stdout – so trennen die üblichen
  // Betriebsumgebungen von selbst.
  if (level === 'error') console.error(zeile);
  else if (level === 'warn') console.warn(zeile);
  else console.info(zeile);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => {
    // In Produktion werden Debug-Zeilen unterdrückt. Sie sind zum Entwickeln
    // gedacht und blähen die Protokolle sonst unnötig auf.
    if (process.env.NODE_ENV === 'production') return;
    schreiben('debug', message, fields);
  },
  info: (message: string, fields?: LogFields) => schreiben('info', message, fields),
  warn: (message: string, fields?: LogFields) => schreiben('warn', message, fields),
  error: (message: string, fields?: LogFields) => schreiben('error', message, fields),
};

/**
 * Erzeugt eine Anfragekennung.
 *
 * Bewusst kein UUID-Aufruf: Die Kennung dient allein dem Zusammenführen von
 * Protokollzeilen und muss weder eindeutig über alle Zeiten noch fälschungs-
 * sicher sein. Kurz ist hier wertvoller als vollständig.
 */
export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}
