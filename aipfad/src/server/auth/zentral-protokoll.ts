import 'server-only';

/**
 * Protokollzeilen der Anmeldung über das gemeinsame Konto (Vertrag
 * docs/learning-auth/). Eigenes Modul, weil nicht jede App ein
 * Protokollmodul hat. Eine Zeile je Ereignis als JSON mit `message`, wie
 * Railway sie strukturiert anzeigt.
 *
 * Personendaten und Geheimnisse gehören nie hinein. Felder mit diesen Namen
 * werden ersetzt, auch wenn sie versehentlich mitgegeben werden.
 */

const VERBOTEN = new Set([
  'email',
  'name',
  'password',
  'passwort',
  'token',
  'idToken',
  'code',
  'state',
  'nonce',
  'codeVerifier',
  'clientSecret',
]);

type Felder = Record<string, unknown>;

function schreibe(stufe: 'info' | 'warn' | 'error', meldung: string, felder: Felder = {}): void {
  const sauber: Felder = {};
  for (const [schluessel, wert] of Object.entries(felder)) {
    if (wert === undefined) continue;
    sauber[schluessel] = VERBOTEN.has(schluessel) ? '[entfernt]' : wert;
  }
  const zeile = JSON.stringify({
    ts: new Date().toISOString(),
    level: stufe,
    message: meldung,
    bereich: 'zentrale-anmeldung',
    ...sauber,
  });
  if (stufe === 'error') console.error(zeile);
  else if (stufe === 'warn') console.warn(zeile);
  else console.info(zeile);
}

export const protokoll = {
  info: (meldung: string, felder?: Felder) => schreibe('info', meldung, felder),
  warn: (meldung: string, felder?: Felder) => schreibe('warn', meldung, felder),
  error: (meldung: string, felder?: Felder) => schreibe('error', meldung, felder),
};

/** Kurze Kennung je Anfrage, um zusammengehörige Zeilen zu finden. */
export function neueAnfrageId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Die ersten acht Zeichen einer Konto-ID: genug zum Zuordnen, nicht mehr. */
export function kurzeKontoId(id: string): string {
  return id.slice(0, 8);
}
