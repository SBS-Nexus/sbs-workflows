import { NextResponse, type NextRequest } from 'next/server';
import { destroyZentraleSitzungen } from '@/server/auth/session';
import { pruefeRueckkanal, zentralerZugang } from '@/server/auth/zentral';
import { UngueltigesAbmeldeToken } from '@/server/auth/zentral-identitaet';
import { neueAnfrageId, protokoll } from '@/server/auth/zentral-protokoll';

/**
 * Rückkanal-Abmeldung (OpenID Connect Back-Channel Logout 1.0, E4.2): Meldet
 * sich jemand beim gemeinsamen Konto ab, schickt es hierher ein signiertes
 * Logout-Token, und die App beendet die zugehörigen Sitzungen. Der Aufruf
 * kommt von Server zu Server, ohne Cookie und ohne Origin.
 */
export const dynamic = 'force-dynamic';

const KOPF = { 'Cache-Control': 'no-store' };
const MAX_INHALT = 16_384;

function abgelehnt(): NextResponse {
  return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: KOPF });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const zugang = zentralerZugang();
  if (!zugang) return new NextResponse('Nicht gefunden.', { status: 404, headers: KOPF });

  const requestId = neueAnfrageId();
  if (
    !(request.headers.get('content-type') ?? '').startsWith('application/x-www-form-urlencoded')
  ) {
    return abgelehnt();
  }
  const inhalt = await request.text();
  if (inhalt.length > MAX_INHALT) return abgelehnt();
  const token = new URLSearchParams(inhalt).get('logout_token');
  if (!token) return abgelehnt();

  let auftrag: Awaited<ReturnType<typeof pruefeRueckkanal>>;
  try {
    auftrag = await pruefeRueckkanal(zugang, token);
  } catch (fehler) {
    if (fehler instanceof UngueltigesAbmeldeToken) {
      protokoll.warn('Rückkanal-Abmeldung abgelehnt', { requestId, grund: fehler.message });
      return abgelehnt();
    }
    protokoll.error('Rückkanal-Abmeldung nicht prüfbar', {
      requestId,
      errorType: fehler instanceof Error ? fehler.name : 'unbekannt',
    });
    return NextResponse.json({ error: 'temporarily_unavailable' }, { status: 503, headers: KOPF });
  }

  const sitzungen = await destroyZentraleSitzungen(auftrag);
  protokoll.info('Rückkanal-Abmeldung', { requestId, sitzungen, mitSid: auftrag.sid !== null });
  return new NextResponse(null, { status: 200, headers: KOPF });
}
