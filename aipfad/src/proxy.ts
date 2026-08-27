import { NextResponse, type NextRequest } from 'next/server';

/**
 * Vorgelagerte Zugriffsprüfung (Next.js 16: `proxy.ts` statt `middleware.ts`).
 * Übernommen aus PythonPfad/SQLPfad. Prüft nur, ob überhaupt ein
 * Sitzungscookie vorhanden ist – die eigentliche Berechtigungsprüfung
 * erfolgt in jedem Server-Aufruf über `requireUser()`/`requireAdmin()`.
 *
 * Zusätzlich wird der Origin bei zustandsverändernden Anfragen gegen den
 * Host geprüft – eine zweite Verteidigungslinie neben dem CSRF-Token.
 */

const PROTECTED_PREFIXES = [
  '/pfad',
  '/lektion',
  '/ueben',
  '/wiederholen',
  '/labs',
  '/fortschritt',
  '/profil',
  '/onboarding',
  '/admin',
];

const SESSION_COOKIE = 'aipfad_session';

const HSTS_VALUE = 'max-age=63072000; includeSubDomains';

function withStrictTransport(response: NextResponse): NextResponse {
  if ((process.env.APP_URL ?? '').startsWith('https://')) {
    response.headers.set('Strict-Transport-Security', HSTS_VALUE);
  }
  return response;
}

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return withStrictTransport(
            new NextResponse('Ungültige Herkunft der Anfrage.', { status: 403 }),
          );
        }
      } catch {
        return withStrictTransport(
          new NextResponse('Ungültige Herkunft der Anfrage.', { status: 403 }),
        );
      }
    }
  }

  const needsSession = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (needsSession && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = '/anmelden';
    url.search = '';
    return withStrictTransport(NextResponse.redirect(url));
  }

  return withStrictTransport(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
