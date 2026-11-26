import 'server-only';
import { erzeugeFehlerbericht } from './fehlerbericht';

/**
 * E6.3 — Fehlerbericht des Dienstes: verbindet den Kern (`fehlerbericht.ts`)
 * mit Umgebung, Netz und Protokoll. Kanonisch in `docs/learning-fehlerbericht/`.
 *
 * Ohne `SENTRY_DSN` (lokal, Tests, CI) geht nichts hinaus. Die Version kommt
 * aus `RAILWAY_GIT_COMMIT_SHA`, die Umgebung aus `SENTRY_ENVIRONMENT`
 * (Voreinstellung `production`).
 */

const dienst = erzeugeFehlerbericht({
  umgebung: () => process.env,
  fetchImpl: (adresse, init) => fetch(adresse, init),
  jetzt: Date.now,
  kennung: () => crypto.randomUUID().replace(/-/g, ''),
  warne: (meldung) =>
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'warn',
        message: meldung,
        bereich: 'fehlerbericht',
      }),
    ),
});

export const sendeFehler = dienst.sende;
export const meldeAnfragefehler = dienst.meldeAnfragefehler;
export const empfangeBrowserbericht = dienst.empfangeBrowserbericht;
