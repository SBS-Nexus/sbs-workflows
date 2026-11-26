import { NextResponse, type NextRequest } from 'next/server';
import { idTokenLesen, sitzungLoeschen } from '@/server/konto/cookies';
import { hubKonto } from '@/server/konto/einstellungen';
import { abmeldeAdresse } from '@/server/konto/oidc';

/**
 * Abmelden im Hub (E4.5b, nur POST): Die Sitzung im Cookie endet, danach geht
 * es zum Abmelden beim gemeinsamen Konto und zurück zur Startseite. Ist das
 * Konto nicht erreichbar, ist man im Hub trotzdem abgemeldet.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const konto = hubKonto();
  if (!konto) return new NextResponse('Nicht gefunden.', { status: 404 });

  // Kommt die Anfrage mit Origin, muss es der Hub selbst sein.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(konto.basis).origin) {
    return new NextResponse('Ungültige Herkunft der Anfrage.', { status: 403 });
  }

  const idToken = await idTokenLesen(konto);
  await sitzungLoeschen(konto);
  let ziel = `${konto.basis}/`;
  try {
    ziel = (await abmeldeAdresse(konto, idToken)).href;
  } catch {
    // Abgemeldet im Hub ist man in jedem Fall.
  }
  return NextResponse.redirect(ziel, { status: 303, headers: { 'Cache-Control': 'no-store' } });
}
