import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { logger, newRequestId } from '@/server/observability/logger';

/**
 * Bereitschaft.
 *
 * Prüft, ob die Anwendung tatsächlich arbeiten kann – also ob die Datenbank
 * antwortet und die Inhalte eingespielt sind. Ein Lastverteiler soll erst
 * dann Verkehr schicken, wenn beides zutrifft.
 *
 * Die Antwort nennt bewusst keine Verbindungszeichenfolge, keinen Hostnamen
 * und keine Fehlermeldung der Datenbank. Ein Bereitschaftsendpunkt ist von
 * außen erreichbar, und eine hilfreiche Fehlermeldung wäre dort vor allem für
 * Fremde hilfreich.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const requestId = newRequestId();
  const begonnen = Date.now();

  try {
    // Zwei Fragen in einem Rutsch: Antwortet die Datenbank, und stehen
    // Inhalte bereit? Eine leere Datenbank ist technisch erreichbar, aber die
    // Anwendung wäre für Lernende unbrauchbar.
    const [, lessons] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
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
    // Der Grund wandert ins Protokoll, nicht in die Antwort.
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
