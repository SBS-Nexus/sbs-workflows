import { empfangeBrowserbericht } from '@/server/fehlerbericht/fehlerbericht-server';

/**
 * E6.3 — Empfang für Fehlerberichte aus dem Browser (`POST /api/fehlerbericht`).
 * Kanonisch in `docs/learning-fehlerbericht/`. Der Server prüft, bereinigt und
 * gibt weiter; der Browser spricht nie selbst mit Sentry.
 */
export async function POST(anfrage: Request): Promise<Response> {
  return empfangeBrowserbericht(anfrage);
}
