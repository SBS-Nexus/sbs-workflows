import { NextResponse, type NextRequest } from 'next/server';
import { zustandSchreiben } from '@/server/konto/cookies';
import { hubKonto } from '@/server/konto/einstellungen';
import { starteAnmeldung } from '@/server/konto/oidc';
import { sicheresZiel, versiegleZustand } from '@/server/konto/zentral-zustand';

/**
 * Anmeldung im Hub über das gemeinsame Konto (E4.5b). `?ziel=/fortschritt`
 * bestimmt, wohin es danach geht (nur relative Pfade des Hubs).
 * `?bestaetigen=1` verlangt eine frische Anmeldung beim Konto (E5.1: nach dem
 * Einrichten des zweiten Faktors, damit er im Token steht).
 */
export const dynamic = 'force-dynamic';

const KEIN_CACHE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const konto = hubKonto();
  if (!konto) return new NextResponse('Nicht gefunden.', { status: 404, headers: KEIN_CACHE });

  try {
    const { adresse, zustand } = await starteAnmeldung(konto, {
      ziel: sicheresZiel(request.nextUrl.searchParams.get('ziel')),
      zweiterVersuch: request.nextUrl.searchParams.get('erneut') === '1',
      frisch: request.nextUrl.searchParams.get('bestaetigen') === '1',
    });
    await zustandSchreiben(konto, versiegleZustand(zustand, konto.sitzungsGeheimnis));
    return NextResponse.redirect(adresse, { status: 303, headers: KEIN_CACHE });
  } catch (fehler) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Anmeldung im Hub nicht startbar',
        bereich: 'hub-anmeldung',
        errorType: fehler instanceof Error ? fehler.name : 'unbekannt',
      }),
    );
    return NextResponse.redirect(`${konto.basis}/?anmeldung=nicht-erreichbar`, {
      status: 303,
      headers: KEIN_CACHE,
    });
  }
}
