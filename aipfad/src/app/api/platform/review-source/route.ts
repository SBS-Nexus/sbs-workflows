import { getCurrentUser } from '@/server/auth/session';
import { getEnv } from '@/server/env';
import { logger } from '@/server/observability/logger';
import { handleReviewSourceRequest } from '@/server/platform/review-source-http';
import { readPlatformReviewSource } from '@/server/services/platform-review-source';

/**
 * LP-05B — schreibgeschützte Wiederholungsquelle für den Lernpfade-Hub.
 *
 * Nur GET. Die Person ergibt sich allein aus der eigenen Sitzung dieser App;
 * Einzelheiten und Begründung in `src/server/platform/review-source-http.ts`
 * und docs/SECURITY.md.
 *
 * `force-dynamic`: Die Antwort ist personenbezogen und darf nie als statische
 * Seite vorberechnet oder im Datencache gehalten werden.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return handleReviewSourceRequest(request, {
    source: 'ai',
    resolveUserId: async () => (await getCurrentUser())?.id ?? null,
    readBatch: readPlatformReviewSource,
    hubOrigin: () => getEnv().PLATFORM_HUB_ORIGIN,
    onError: (event, error) =>
      logger.error(event, { error: error instanceof Error ? error.name : 'unknown' }),
  });
}
