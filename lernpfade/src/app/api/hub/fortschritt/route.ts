import type { NextResponse } from 'next/server';
import { PROGRESS_SOURCES } from '@/domain/progress/contract';
import { progressSourceUrl, PROGRESS_SOURCE_TIMEOUT_MS } from '@/domain/progress/fetch-progress';
import { normalizeSourceBaseUrl } from '@/domain/review/fetch-source';
import { REVIEW_SOURCE_APP_URLS } from '@/lib/catalog';
import { antwortMitQuellen } from '@/server/konto/hub-quellen';

/**
 * E4.5c: Fortschritt aller Pfade über den Hub-Server
 * (`src/server/konto/hub-quellen.ts`). Je App die Fortschrittsquelle.
 */
export const dynamic = 'force-dynamic';

export function GET(): Promise<NextResponse> {
  return antwortMitQuellen(
    'fortschritt',
    PROGRESS_SOURCES.map((quelle) => {
      const basis = normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS[quelle]);
      return { quelle, adresse: basis ? progressSourceUrl(basis) : null };
    }),
    PROGRESS_SOURCE_TIMEOUT_MS,
  );
}
