import 'server-only';

/**
 * Strukturierte Protokollierung. Übernommen aus PythonPfad/SQLPfad. Eine
 * Zeile je Ereignis, als JSON. Verboten sind personenbezogene und
 * lösungsverratende Felder – auch dann, wenn sie versehentlich mitgegeben
 * werden.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  requestId?: string;
  user?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const VERBOTENE_FELDER = new Set([
  'email',
  'password',
  'passwort',
  'passwordHash',
  'token',
  'tokenHash',
  'csrfSecret',
  'submittedAnswer',
  'solutionNotes',
  'name',
]);

function bereinigen(fields: LogFields): Record<string, unknown> {
  const sauber: Record<string, unknown> = {};
  for (const [schluessel, wert] of Object.entries(fields)) {
    sauber[schluessel] = VERBOTENE_FELDER.has(schluessel) ? '[entfernt]' : wert;
  }
  return sauber;
}

function shortUserIdInternal(userId: string): string {
  return userId.slice(0, 8);
}

function schreiben(level: LogLevel, message: string, fields: LogFields = {}): void {
  const zeile = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...bereinigen(fields),
  });

  if (level === 'error') console.error(zeile);
  else if (level === 'warn') console.warn(zeile);
  else console.info(zeile);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => {
    if (process.env.NODE_ENV === 'production') return;
    schreiben('debug', message, fields);
  },
  info: (message: string, fields?: LogFields) => schreiben('info', message, fields),
  warn: (message: string, fields?: LogFields) => schreiben('warn', message, fields),
  error: (message: string, fields?: LogFields) => schreiben('error', message, fields),
};

export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const shortUserId = shortUserIdInternal;
