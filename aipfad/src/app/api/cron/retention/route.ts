import { NextResponse } from 'next/server';
import { getEnv } from '@/server/env';
import { logger, newRequestId } from '@/server/observability/logger';
import { istGueltigerCronAufruf } from '@/server/retention/cron-auth';
import { PRODUKTIVE_REGELN } from '@/server/retention/rules';
import { runRetention } from '@/server/retention/runner';

/**
 * Geplanter Aufbewahrungslauf (E04A/ENT-B03).
 *
 * Vercel ruft diese Route nach dem Zeitplan in `vercel.json` per GET auf und
 * schickt bei gesetztem `CRON_SECRET` den Kopfzeilenwert
 * `Authorization: Bearer <CRON_SECRET>`.
 *
 * Vier Eigenschaften dieser Plattform bestimmen den Aufbau:
 *
 *  - Der Aufruf kommt von außen und ist ohne Prüfung für jeden erreichbar.
 *    Deshalb wird VOR jedem Datenbankzugriff geprüft, und zwar fail closed.
 *  - Aufrufe können sich überschneiden oder doppelt zugestellt werden. Deshalb
 *    muss der Lauf mehrfach ausführbar sein, ohne Schaden anzurichten; das
 *    trägt die Löschbedingung selbst (`createdAt < cutoff`), nicht eine Sperre.
 *  - Ein fehlgeschlagener Aufruf wird von Vercel nicht automatisch wiederholt.
 *    Der nächste planmäßige Lauf ist die Wiederholung; zu alte Daten bleiben
 *    bis dahin liegen und werden dann mit erfasst.
 *  - Es gibt keine Zusicherung „genau einmal". Nichts hier verlässt sich
 *    darauf.
 *
 * Ohne Sitzung, ohne Nutzerbezug: Die Route nimmt weder `userId` noch
 * Mandanten entgegen und liest ausschließlich serverseitige Konfiguration.
 */
export const dynamic = 'force-dynamic';

const KEINE_ZWISCHENSPEICHERUNG = { 'Cache-Control': 'no-store' } as const;

export async function GET(request: Request): Promise<NextResponse> {
  const runId = newRequestId();

  // Erst prüfen, dann irgendetwas tun. Kein Datenbankzugriff, keine
  // Konfigurationsausgabe, kein Hinweis darauf, ob ein Geheimnis gesetzt ist.
  const env = getEnv();
  if (!istGueltigerCronAufruf(request.headers.get('authorization'), env.CRON_SECRET)) {
    logger.warn('Aufbewahrungslauf abgewiesen: Aufruf nicht autorisiert', { runId });
    return NextResponse.json(
      { status: 'unauthorized' },
      { status: 401, headers: KEINE_ZWISCHENSPEICHERUNG },
    );
  }

  const mode = env.RETENTION_MODE;
  logger.info('retention_run_started', { runId, mode, ruleCount: PRODUKTIVE_REGELN.length });

  const report = await runRetention({
    rules: PRODUKTIVE_REGELN,
    mode,
    now: new Date(),
    runId,
    onRuleFinished: (ergebnis) => {
      // Eine Zeile je Regel, niemals eine je gelöschtem Datensatz: Zahlen
      // gehören ins Protokoll, Inhalte nicht.
      const felder = {
        runId,
        mode,
        ruleId: ergebnis.ruleId,
        status: ergebnis.status,
        retentionDays: ergebnis.retentionDays,
        candidateCount: ergebnis.candidateCount,
        deletedCount: ergebnis.deletedCount,
        durationMs: ergebnis.durationMs,
      };

      if (ergebnis.status === 'failed') {
        logger.error('retention_rule_failed', { ...felder, errorType: ergebnis.errorType });
      } else {
        logger.info('retention_rule_completed', felder);
      }
    },
  });

  logger.info('retention_run_completed', {
    runId,
    mode,
    status: report.status,
    totalCandidateCount: report.totalCandidateCount,
    totalDeletedCount: report.totalDeletedCount,
    durationMs: report.durationMs,
  });

  // Ein Teilfehler darf nicht als Erfolg durchgehen: Sonst sieht der Betrieb
  // in der Aufrufübersicht ein grünes Häkchen, während eine Datenart seit
  // Wochen nicht mehr aufgeräumt wird.
  const httpStatus = report.status === 'success' ? 200 : 500;
  return NextResponse.json(report, { status: httpStatus, headers: KEINE_ZWISCHENSPEICHERUNG });
}
