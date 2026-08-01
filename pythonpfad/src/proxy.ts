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
  '/labor',
  '/onboarding',
  '/einstufung',
  '/admin',
];

const SESSION_COOKIE = 'pythonpfad_session';

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // --- Herkunftsprüfung für schreibende Anfragen -------------------------
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return new NextResponse('Ungültige Herkunft der Anfrage.', { status: 403 });
        }
      } catch {
        return new NextResponse('Ungültige Herkunft der Anfrage.', { status: 403 });
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
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Statische Dateien und die Pyodide-Laufzeit werden nicht geprüft.
    '/((?!_next/static|_next/image|favicon.ico|pyodide/).*)',
  ],
};
