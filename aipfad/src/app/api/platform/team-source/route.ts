import { istPlattformDienst } from '@/server/auth/zentral-zugriff';
import { logger } from '@/server/observability/logger';
import { handleTeamSourceRequest } from '@/server/platform/team-source-http';
import { readTeamStaende } from '@/server/services/platform-team-source';

/**
 * E5.2 — Team-Quelle für die Lernpfade-Plattform (docs/E5-PLAN.md).
 *
 * Nur POST mit dem Diensttoken der Plattform. Summen ab drei bekannten
 * Personen, Einzelwerte nur für benannte; Einzelheiten in
 * `src/server/platform/team-source-http.ts`.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return handleTeamSourceRequest(request, {
    source: 'ai',
    istDienst: istPlattformDienst,
    readTeam: readTeamStaende,
    onError: (event, error) =>
      logger.error(event, { error: error instanceof Error ? error.name : 'unknown' }),
  });
}
