import type { Instrumentation } from 'next';

/**
 * E6.3 — Serverfehler an den Fehlerbericht. Next ruft `onRequestError` für
 * Seiten, Routen, Server-Aktionen und den Proxy. Kanonisch in
 * `docs/learning-fehlerbericht/`; jede `src/instrumentation.ts` reicht es
 * weiter:
 *
 *   export { onRequestError } from '@/server/fehlerbericht/anfragefehler';
 *
 * Übergeben werden nur Fehler, Methode und Routenmuster; Pfad und Kopfzeilen
 * der Anfrage bleiben hier.
 */
export const onRequestError: Instrumentation.onRequestError = async (fehler, anfrage, kontext) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { meldeAnfragefehler } = await import('./fehlerbericht-server');
  await meldeAnfragefehler(fehler, { method: anfrage.method }, kontext);
};
