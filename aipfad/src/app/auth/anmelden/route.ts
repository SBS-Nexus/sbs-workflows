import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { starteAnmeldung, zentralerZugang } from '@/server/auth/zentral';
import { STARTSEITE } from '@/server/auth/zentral-app';
import { zustandsCookieName, zustandsCookieOptionen } from '@/server/auth/zentral-cookie';
import { sicheresZiel, versiegleZustand } from '@/server/auth/zentral-zustand';
import { neueAnfrageId, protokoll } from '@/server/auth/zentral-protokoll';
import { absoluteUrl } from '@/server/site';

/**
 * Start der Anmeldung über das gemeinsame Konto (E4.2). Merkt sich Zustand
 * und Ziel im signierten Cookie und leitet zu konto.lernpfade.net.
 * `?modus=registrieren` öffnet dort gleich die Registrierung, `?ziel=/pfad`
 * bestimmt, wohin es danach geht (nur relative Pfade dieser App).
 * `?erneut=1` kommt nur von /auth/rueckkehr und kennzeichnet den zweiten
 * Versuch nach verlorenem Zustand (`nachVerlorenemZustand()`).
 */
export const dynamic = 'force-dynamic';

const KEIN_CACHE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const zugang = zentralerZugang();
  if (!zugang) return new NextResponse('Nicht gefunden.', { status: 404, headers: KEIN_CACHE });

  const ziel = sicheresZiel(request.nextUrl.searchParams.get('ziel'));
  // `?bestaetigen=1`: frische Anmeldung, auch für schon Angemeldete.
  const frischAnmelden = request.nextUrl.searchParams.get('bestaetigen') === '1';
  if (!frischAnmelden && (await getCurrentUser())) {
    return NextResponse.redirect(absoluteUrl(ziel ?? STARTSEITE), {
      status: 303,
      headers: KEIN_CACHE,
    });
  }

  try {
    const { adresse, zustand } = await starteAnmeldung(zugang, {
      ziel,
      registrieren: request.nextUrl.searchParams.get('modus') === 'registrieren',
      zweiterVersuch: request.nextUrl.searchParams.get('erneut') === '1',
      frischAnmelden,
    });
    (await cookies()).set(
      zustandsCookieName(),
      versiegleZustand(zustand, zugang.zustandsSchluessel),
      zustandsCookieOptionen(),
    );
    return NextResponse.redirect(adresse, { status: 303, headers: KEIN_CACHE });
  } catch (fehler) {
    protokoll.error('Anmeldung beim gemeinsamen Konto nicht startbar', {
      requestId: neueAnfrageId(),
      errorType: fehler instanceof Error ? fehler.name : 'unbekannt',
    });
    return NextResponse.redirect(absoluteUrl('/auth/fehler?grund=nicht-erreichbar'), {
      status: 303,
      headers: KEIN_CACHE,
    });
  }
}
