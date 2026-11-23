import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import {
  createSession,
  destroySession,
  getCurrentUser,
  pruneExpiredSessions,
} from '@/server/auth/session';
import {
  AnmeldungAbgebrochen,
  RUECKKEHR_PFAD,
  schliesseAnmeldungAb,
  zentralerZugang,
} from '@/server/auth/zentral';
import { zustandsCookieName, zustandsCookieOptionen } from '@/server/auth/zentral-cookie';
import { kontoFuerIdentitaet } from '@/server/auth/zentral-konto';
import { oeffneZustand } from '@/server/auth/zentral-zustand';
import { logger, newRequestId, shortUserId } from '@/server/observability/logger';
import { absoluteUrl, siteUrl } from '@/server/site';

/**
 * Rückkehr vom gemeinsamen Konto (E4.2). Prüft Zustand und Antwort, löst den
 * Code ein, ordnet das Konto zu (`zentral-konto.ts`) und legt eine
 * AIPfad-Sitzung an. Jeder Fehlschlag endet auf /auth/fehler mit einem
 * Grund, nie auf einer Serverfehlerseite.
 */
export const dynamic = 'force-dynamic';

const KEIN_CACHE = { 'Cache-Control': 'no-store' };

function weiter(pfad: string): NextResponse {
  return NextResponse.redirect(absoluteUrl(pfad), { status: 303, headers: KEIN_CACHE });
}

function fehler(grund: string): NextResponse {
  return weiter(`/auth/fehler?grund=${encodeURIComponent(grund)}`);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const zugang = zentralerZugang();
  if (!zugang) return new NextResponse('Nicht gefunden.', { status: 404, headers: KEIN_CACHE });

  const requestId = newRequestId();
  const cookieStore = await cookies();
  const zustand = oeffneZustand(
    cookieStore.get(zustandsCookieName())?.value,
    zugang.zustandsSchluessel,
  );
  // Der Zustand gilt genau einmal. Gelöscht wird mit denselben Attributen wie
  // beim Setzen: Ein `__Host-`-Cookie ohne `Secure` würde der Browser
  // ignorieren, auch beim Löschen.
  cookieStore.set(zustandsCookieName(), '', { ...zustandsCookieOptionen(), maxAge: 0 });

  if (!zustand) {
    // Häufigster Fall: Ein zweiter Tab hat die Anmeldung schon abgeschlossen.
    if (await getCurrentUser()) return weiter('/pfad');
    logger.warn('Rückkehr ohne gültigen Anmeldezustand', { requestId });
    return fehler('abgelaufen');
  }

  // Die öffentliche Adresse, nicht die interne hinter dem Proxy: Sie geht als
  // redirect_uri in den Token-Abruf und muss genau der registrierten gleichen.
  const aktuelleAdresse = new URL(`${RUECKKEHR_PFAD}${request.nextUrl.search}`, siteUrl());

  let ergebnis: Awaited<ReturnType<typeof schliesseAnmeldungAb>>;
  try {
    ergebnis = await schliesseAnmeldungAb(zugang, aktuelleAdresse, zustand);
  } catch (ausnahme) {
    if (ausnahme instanceof AnmeldungAbgebrochen) {
      logger.info('Anmeldung beim gemeinsamen Konto beendet', { requestId, code: ausnahme.code });
      return fehler(ausnahme.code === 'access_denied' ? 'abgebrochen' : 'abgelehnt');
    }
    logger.error('Rückkehr vom gemeinsamen Konto fehlgeschlagen', {
      requestId,
      errorType: ausnahme instanceof Error ? ausnahme.name : 'unbekannt',
      errorCode:
        ausnahme && typeof ausnahme === 'object' && 'code' in ausnahme
          ? String((ausnahme as { code: unknown }).code)
          : undefined,
    });
    return fehler('technisch');
  }

  if (!ergebnis) {
    logger.warn('Gemeinsames Konto ohne verwertbare Adresse', { requestId });
    return fehler('unvollstaendig');
  }

  const { identitaet, idToken } = ergebnis;
  const konto = await kontoFuerIdentitaet(identitaet);
  if (!konto.ok) {
    logger.info('Anmeldung über das gemeinsame Konto abgelehnt', { requestId, grund: konto.grund });
    return fehler(konto.grund);
  }

  // Verwaltungsrechte nur mit zweitem Faktor (docs/E4-KONTO-PLAN.md).
  if (konto.role === 'ADMIN' && !identitaet.zweiFaktoren) {
    logger.warn('Admin-Anmeldung ohne zweiten Faktor abgelehnt', {
      requestId,
      user: shortUserId(konto.userId),
    });
    return fehler('zweiter-faktor');
  }

  // Eine ältere Sitzung in diesem Browser (etwa einer anderen Person) endet.
  await destroySession();
  await pruneExpiredSessions();
  await createSession(konto.userId, { sid: identitaet.sid, idToken });

  logger.info('Anmeldung über das gemeinsame Konto', {
    requestId,
    user: shortUserId(konto.userId),
    art: konto.art,
    zweiFaktoren: identitaet.zweiFaktoren,
  });

  return weiter(konto.onboardingCompleted ? (zustand.ziel ?? '/pfad') : '/onboarding');
}
