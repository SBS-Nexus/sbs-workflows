import { NextResponse, type NextRequest } from 'next/server';

/**
 * Vorgelagerte Zugriffsprüfung (in Next.js 16 heißt diese Datei `proxy.ts`;
 * sie ersetzt die frühere `middleware.ts`).
 *
 * Die Middleware prüft nur, ob überhaupt ein Sitzungscookie vorhanden ist. Sie
 * spart damit unnötige Seitenaufrufe für nicht angemeldete Besuchende. Die
 * eigentliche Berechtigungsprüfung erfolgt bewusst NICHT hier, sondern in jedem
 * Server-Aufruf über `requireUser()` bzw. `requireAdmin()`: Ein gefälschtes
 * Cookie kommt hier zwar vorbei, scheitert aber sofort an der Datenbankprüfung.
 *
 * Zusätzlich wird der Origin bei zustandsverändernden Anfragen gegen den Host
 * geprüft – eine zweite Verteidigungslinie neben dem CSRF-Token.
 */

const PROTECTED_PREFIXES = [
  '/lernen',
  '/ueben',
  '/projekte',
  '/wiederholen',
  '/fortschritt',
  '/profil',
  '/abfrage',
  '/onboarding',
  '/einstufung',
  '/admin',
];

const SESSION_COOKIE = 'sqlpfad_session';

/**
 * HSTS – nur, wenn die Anwendung wirklich unter HTTPS erreichbar ist.
 *
 * `Strict-Transport-Security` weist den Browser an, diese Domain für die
 * genannte Dauer ausschließlich verschlüsselt anzusprechen. Richtig, wenn es
 * HTTPS gibt – eine Falle, wenn nicht: Einmal für `localhost` gesetzt, sperrt
 * der Browser die unverschlüsselte Entwicklung für zwei Jahre, und zwar für
 * *alle* Projekte unter derselben Adresse. Zurücknehmen lässt sich das nur von
 * Hand in den Browsereinstellungen.
 *
 * Die Entscheidung fällt hier und nicht in `next.config.ts`, weil Next die
 * dortigen Kopfzeilen beim Übersetzen einfriert. Hier wird `APP_URL` bei jeder
 * Anfrage gelesen – Übersetzen und Betreiben bleiben getrennt.
 *
 * `includeSubDomains` ist bewusst dabei, `preload` bewusst nicht: Die Aufnahme
 * in die Vorladeliste der Browser ist praktisch unumkehrbar und gehört zu einer
 * ausdrücklichen Entscheidung, nicht in eine Voreinstellung.
 */
const HSTS_VALUE = 'max-age=63072000; includeSubDomains';

function withStrictTransport(response: NextResponse): NextResponse {
  if ((process.env.APP_URL ?? '').startsWith('https://')) {
    response.headers.set('Strict-Transport-Security', HSTS_VALUE);
  }
  return response;
}

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // --- Herkunftsprüfung für schreibende Anfragen -------------------------
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

  // --- Zugriffsschutz ------------------------------------------------------
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
  matcher: [
    // Statische Dateien werden nicht geprüft.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
