/**
 * E6.3 — Fehlerberichte aus dem Browser. Kanonisch in
 * `docs/learning-fehlerbericht/`.
 *
 * Schickt nur Fehlerart, Meldung, Aufrufstapel und den Pfad an die eigene
 * Route `/api/fehlerbericht`, ohne Cookies. Bereinigt und weitergegeben wird
 * auf dem Server. Fehler mit `digest` hat der Server schon gemeldet. Höchstens
 * fünf Berichte je Seitenaufruf, jeder Fehler nur einmal. Scheitert nie
 * selbst.
 */

const ZIEL = '/api/fehlerbericht';
const HOECHSTENS = 5;

let gesendet = 0;
const gesehen = new Set<string>();

export function meldeBrowserfehler(fehler: unknown): void {
  try {
    if (typeof window === 'undefined' || gesendet >= HOECHSTENS) return;
    if (typeof fehler === 'object' && fehler !== null && 'digest' in fehler && fehler.digest)
      return;
    const e =
      fehler instanceof Error
        ? fehler
        : new Error(typeof fehler === 'string' ? fehler : 'Unbekannter Fehler');
    const schluessel = `${e.name}|${e.message}`;
    if (gesehen.has(schluessel)) return;
    gesehen.add(schluessel);
    gesendet += 1;
    const koerper = JSON.stringify({
      typ: String(e.name || 'Error').slice(0, 80),
      meldung: String(e.message).slice(0, 2000),
      stapel: String(e.stack ?? '').slice(0, 8000),
      pfad: window.location.pathname.slice(0, 300),
    });
    void fetch(ZIEL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: koerper,
      credentials: 'omit',
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Ein Fehlerbericht darf die Seite nie stören.
  }
}

/** Unbehandelte Fehler und abgelehnte Zusagen der Seite melden. */
export function beobachteBrowserfehler(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (ereignis) => {
    if (ereignis.error) meldeBrowserfehler(ereignis.error);
  });
  window.addEventListener('unhandledrejection', (ereignis) => meldeBrowserfehler(ereignis.reason));
}
