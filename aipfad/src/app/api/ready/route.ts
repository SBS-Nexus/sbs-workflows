import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { veroeffentlichteLektion } from '@/server/content/publication';
import { logger, newRequestId } from '@/server/observability/logger';

/**
 * Bereitschaft. Prüft, ob die Datenbank antwortet und Inhalte eingespielt
 * sind. Die Antwort nennt bewusst keine Verbindungszeichenfolge, keinen
 * Hostnamen und keine Fehlermeldung der Datenbank.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const requestId = newRequestId();
  const begonnen = Date.now();

  try {
    const [, lessons] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.lesson.count({ where: veroeffentlichteLektion }),
    ]);

    const durationMs = Date.now() - begonnen;

    if (lessons === 0) {
      logger.warn('Bereitschaft verneint: keine veröffentlichten Lektionen', {
        requestId,
        durationMs,
      });
      return NextResponse.json(
        { status: 'not-ready', reason: 'no-content' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      { status: 'ready', lessons, durationMs },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    logger.error('Bereitschaft verneint: Datenbank nicht erreichbar', {
      requestId,
      durationMs: Date.now() - begonnen,
      errorType: error instanceof Error ? error.name : 'unbekannt',
    });

    return NextResponse.json(
      { status: 'not-ready', reason: 'database' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
