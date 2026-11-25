import { NextResponse } from 'next/server';
import { PROGRESS_SOURCES } from '@/domain/progress/contract';
import { progressSourceUrl, PROGRESS_SOURCE_TIMEOUT_MS } from '@/domain/progress/fetch-progress';
import { normalizeSourceBaseUrl } from '@/domain/review/fetch-source';
import { REVIEW_SOURCE_APP_URLS } from '@/lib/catalog';
import { sitzungLesen, sitzungLoeschen, sitzungSchreiben } from '@/server/konto/cookies';
import { hubKonto } from '@/server/konto/einstellungen';
import { aktualisiere } from '@/server/konto/oidc';

/**
 * E4.5c: Fortschritt aller Pfade über den Hub-Server. Der Hub ruft die
 * schreibgeschützten Plattformquellen der Apps mit seinem Zugriffstoken ab
 * (`Authorization: Bearer`, von den Apps geprüft, E4.5a) und reicht Status und
 * Antwort je Quelle durch. Der Browser fragt nur diese Route, gleiche Herkunft.
 *
 * Läuft das Zugriffstoken bald ab, wird es hier einmal aktualisiert; schlägt
 * das fehl (beim Konto abgemeldet), endet auch die Sitzung im Hub.
 */
export const dynamic = 'force-dynamic';

const KEIN_CACHE = { 'Cache-Control': 'no-store' };
const VORLAUF_MS = 60_000;

export async function GET(): Promise<NextResponse> {
  const konto = hubKonto();
  if (!konto)
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: KEIN_CACHE });

  let sitzung = await sitzungLesen(konto);
  if (!sitzung) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: KEIN_CACHE });
  }
  if (sitzung.gueltigBis - VORLAUF_MS < Date.now()) {
    const neu = await aktualisiere(konto, sitzung);
    if (!neu) {
      await sitzungLoeschen(konto);
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: KEIN_CACHE });
    }
    await sitzungSchreiben(konto, neu);
    sitzung = neu;
  }

  const token = sitzung.zugriffstoken;
  const eintraege = await Promise.all(
    PROGRESS_SOURCES.map(async (quelle) => {
      const basis = normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS[quelle]);
      if (!basis) return [quelle, { status: 404 }] as const;
      try {
        const antwort = await fetch(progressSourceUrl(basis), {
          headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(PROGRESS_SOURCE_TIMEOUT_MS),
        });
        const typ = antwort.headers.get('content-type') ?? '';
        if (antwort.status === 200 && typ.toLowerCase().startsWith('application/json')) {
          return [quelle, { status: 200, body: (await antwort.json()) as unknown }] as const;
        }
        return [quelle, { status: antwort.status === 401 ? 401 : 503 }] as const;
      } catch {
        return [quelle, { status: 503 }] as const;
      }
    }),
  );

  return NextResponse.json({ quellen: Object.fromEntries(eintraege) }, { headers: KEIN_CACHE });
}
