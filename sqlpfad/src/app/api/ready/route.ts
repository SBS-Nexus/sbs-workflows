import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

/**
 * Bereitschaft (E6.2, wie in PythonPfad und AIPfad).
 *
 * Prüft, ob die Anwendung tatsächlich arbeiten kann: Antwortet die Datenbank,
 * und sind Inhalte eingespielt? Die Statusseite der Plattform fragt diesen
 * Endpunkt ab. Die Antwort nennt bewusst keine Verbindungszeichenfolge, keinen
 * Hostnamen und keine Fehlermeldung der Datenbank.
 *
 * SQLPfad hat keinen strukturierten Logger; protokolliert wird nur, was
 * ausfiel und wie lange es dauerte.
 */
export const dynamic = 'force-dynamic';

const KEIN_CACHE = { 'Cache-Control': 'no-store' };

function protokoll(message: string, felder: Record<string, unknown>): void {
  console.error(JSON.stringify({ level: 'error', message, ...felder }));
}

export async function GET(): Promise<NextResponse> {
  const begonnen = Date.now();
  try {
    const [, lessons] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
    ]);
    const durationMs = Date.now() - begonnen;
    if (lessons === 0) {
      protokoll('Bereitschaft verneint: keine veröffentlichten Lektionen', { durationMs });
      return NextResponse.json(
        { status: 'not-ready', reason: 'no-content' },
        { status: 503, headers: KEIN_CACHE },
      );
    }
    return NextResponse.json({ status: 'ready', lessons, durationMs }, { headers: KEIN_CACHE });
  } catch (error) {
    protokoll('Bereitschaft verneint: Datenbank nicht erreichbar', {
      durationMs: Date.now() - begonnen,
      errorType: error instanceof Error ? error.name : 'unbekannt',
    });
    return NextResponse.json(
      { status: 'not-ready', reason: 'database' },
      { status: 503, headers: KEIN_CACHE },
    );
  }
}
