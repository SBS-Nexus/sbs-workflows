import { getCurrentUser } from '@/server/auth/session';
import { nutzerAusHubToken } from '@/server/auth/zentral-zugriff';
import { getEnv } from '@/server/env';
import { logger } from '@/server/observability/logger';
import { handleProgressSourceRequest } from '@/server/platform/progress-source-http';
import { readPlatformProgressSource } from '@/server/services/platform-progress-source';

/**
 * LP-07 — schreibgeschützte Fortschrittsquelle für den Lernpfade-Hub.
 *
 * Nur GET, keine Abfrageparameter. Die Person ergibt sich allein aus der
 * eigenen Sitzung dieser App; Einzelheiten in
 * `src/server/platform/progress-source-http.ts`.
 *
 * `force-dynamic`: Die Antwort ist personenbezogen und darf nie als statische
 * Seite vorberechnet oder im Datencache gehalten werden.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return handleProgressSourceRequest(request, {
    source: 'python',
    // E4.5: Mit `Authorization: Bearer` gilt nur das Zugriffstoken des Hubs.
    resolveUserId: async () => {
      const hub = await nutzerAusHubToken(request);
      return hub.art === 'token' ? hub.userId : ((await getCurrentUser())?.id ?? null);
    },
    readProgress: readPlatformProgressSource,
    hubOrigin: () => getEnv().PLATFORM_HUB_ORIGIN,
    onError: (event, error) =>
      logger.error(event, { error: error instanceof Error ? error.name : 'unknown' }),
  });
}
