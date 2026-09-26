/**
 * Ein eigener Serverprozess für den Nachweis, dass die Ratenbegrenzung
 * tatsächlich geteilt ist.
 *
 * Das Abnahmekriterium aus docs/ENTERPRISE-ROADMAP.md (E03) verlangt den
 * Nachweis über zwei unabhängige Datenbankverbindungen, ausdrücklich "nicht
 * in einem Prozess". Zwei `PrismaClient`-Instanzen nebeneinander wären
 * bereits zwei Verbindungspools, aber eben immer noch ein Prozess mit einem
 * gemeinsamen Modulzustand — und genau der Modulzustand war das Problem, das
 * E03 beseitigt. Deshalb startet der Test diese Datei als echten
 * Kindprozess: getrennter Speicher, getrennter Verbindungspool, nichts
 * Gemeinsames außer der Datenbank.
 *
 * Aufruf (siehe `rate-limit.test.ts`):
 *   tsx --conditions=react-server rate-limit-worker.ts <key> <limit> <windowMs> <now> <versuche>
 *
 * Ausgabe: IMMER eine Zeile JSON auf stdout, auch im Fehlerfall — dann mit
 * dem Feld `fehler`. Der Test kann dadurch zwischen "abgewiesen" und
 * "abgestürzt" unterscheiden, statt aus einem Exitcode raten zu müssen.
 * Etwas, das gar kein JSON ausgibt, lässt den Test beim Einlesen scheitern;
 * ein echter Absturz bleibt also sichtbar.
 *
 * `--conditions=react-server` ist nötig, weil `src/server/security/rate-limit.ts`
 * mit `server-only` markiert ist: Unter der Standardbedingung wirft dieses
 * Paket beim Laden. Next.js lädt Servercode ohnehin unter dieser Bedingung —
 * der Kindprozess bildet damit das Laufzeitverhalten nach, statt die Markierung
 * zu umgehen.
 */
import { checkRateLimit } from '@/server/security/rate-limit';
import { prisma } from '@/server/db/prisma';

export interface WorkerErgebnis {
  erlaubt: number;
  abgewiesen: number;
  fehler?: string;
}

async function main(): Promise<void> {
  const argumente = process.argv.slice(2);
  if (argumente.length !== 5) {
    throw new Error('Erwartet: <key> <limit> <windowMs> <now> <versuche>');
  }
  const [key, limit, windowMs, now, versuche] = argumente as [
    string,
    string,
    string,
    string,
    string,
  ];
  const config = { limit: Number(limit), windowMs: Number(windowMs) };

  let erlaubt = 0;
  let abgewiesen = 0;
  let fehler: string | undefined;

  try {
    // Bewusst alle Versuche gleichzeitig: Nacheinander könnte ein verlorenes
    // Schreiben zwischen zwei Prozessen gar nicht erst entstehen.
    const ergebnisse = await Promise.all(
      Array.from({ length: Number(versuche) }, () => checkRateLimit(key, config, Number(now))),
    );

    for (const ergebnis of ergebnisse) {
      if (ergebnis.allowed) erlaubt += 1;
      else abgewiesen += 1;
    }
  } catch (error) {
    // Kein `allowed` wird hochgezählt: Genau das ist das Sperren bei
    // nicht prüfbarer Grenze, das der Test nachweisen soll.
    fehler = error instanceof Error ? error.name : 'unbekannt';
  }

  const ergebnis: WorkerErgebnis = { erlaubt, abgewiesen, ...(fehler ? { fehler } : {}) };
  process.stdout.write(JSON.stringify(ergebnis));
  await prisma.$disconnect().catch(() => undefined);
}

main().catch((error: unknown) => {
  process.stderr.write(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
});
