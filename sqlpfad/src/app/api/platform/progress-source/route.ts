import { getCurrentUser } from '@/server/auth/session';
import { getEnv } from '@/server/env';
import { handleProgressSourceRequest } from '@/server/platform/progress-source-http';
import { readPlatformProgressSource } from '@/server/services/platform-progress-source';

/**
 * LP-07 — schreibgeschützte Fortschrittsquelle für den Lernpfade-Hub.
 *
 * Nur GET, keine Abfrageparameter. Die Person ergibt sich allein aus der
 * eigenen Sitzung dieser App; Einzelheiten in
 * `src/server/platform/progress-source-http.ts` und docs/PLATTFORM-QUELLE.md.
 *
 * `force-dynamic`: Die Antwort ist personenbezogen und darf nie als statische
 * Seite vorberechnet oder im Datencache gehalten werden.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return handleProgressSourceRequest(request, {
    source: 'sql',
    resolveUserId: async () => (await getCurrentUser())?.id ?? null,
    readProgress: readPlatformProgressSource,
    hubOrigin: () => getEnv().PLATFORM_HUB_ORIGIN,
    // SQLPfad hat keinen strukturierten Logger; protokolliert wird nur der
    // Ereignisname und die Fehlerart, nie Meldung oder Datensatz.
    onError: (event, error) =>
      console.error(
        JSON.stringify({
          level: 'error',
          message: event,
          error: error instanceof Error ? error.name : 'unknown',
        }),
      ),
  });
}
