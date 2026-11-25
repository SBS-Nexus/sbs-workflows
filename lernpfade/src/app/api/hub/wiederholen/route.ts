import type { NextResponse } from 'next/server';
import { FEDERATED_SOURCES, REVIEW_FEDERATION_LIMITS } from '@/domain/review/federation';
import {
  normalizeSourceBaseUrl,
  reviewSourceUrl,
  REVIEW_SOURCE_TIMEOUT_MS,
} from '@/domain/review/fetch-source';
import { REVIEW_SOURCE_APP_URLS } from '@/lib/catalog';
import { antwortMitQuellen } from '@/server/konto/hub-quellen';

/**
 * E4.5c: Fällige Wiederholungen aller Pfade über den Hub-Server
 * (`src/server/konto/hub-quellen.ts`). Je App die Wiederholungsquelle mit
 * derselben Obergrenze wie bisher (`perSource`); geprüft und sortiert wird im
 * Browser (`federateReviewSources`).
 */
export const dynamic = 'force-dynamic';

export function GET(): Promise<NextResponse> {
  return antwortMitQuellen(
    'wiederholen',
    FEDERATED_SOURCES.map((quelle) => {
      const basis = normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS[quelle]);
      return {
        quelle,
        adresse: basis ? reviewSourceUrl(basis, REVIEW_FEDERATION_LIMITS.perSource) : null,
      };
    }),
    REVIEW_SOURCE_TIMEOUT_MS,
  );
}
