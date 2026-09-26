/**
 * Misst, was die Ratenbegrenzung seit E03 je Anfrage zusätzlich kostet.
 *
 * Das Abnahmekriterium in docs/ENTERPRISE-ROADMAP.md verlangt einen
 * GEMESSENEN Zusatzaufwand, keinen geschätzten. Deshalb dieses Skript statt
 * einer Zahl im Fließtext: Wer die Zahl anzweifelt, führt es aus.
 *
 *   npm run perf:rate-limit
 *
 * Gemessen wird der vollständige Weg durch `checkRateLimit()` — Transaktion,
 * Zeilensperre, Entscheidung, Zurückschreiben — gegen die Datenbank aus
 * `DATABASE_URL`. Vorher lag der Zähler im Arbeitsspeicher; sein Aufwand war
 * eine Feldoperation und damit gegenüber jedem Datenbankzugriff
 * vernachlässigbar. Die hier gemessene Dauer IST deshalb der Zusatzaufwand,
 * nicht die Differenz zweier Messungen.
 *
 * Gemessen wird nach FÜLLSTAND der Zeile, denn davon hängt der Aufwand ab:
 * Die gespeicherte Zeitpunktliste ist so lang wie das jeweilige Limit, und
 * das reicht von 5 (`register`) bis 240 (`submitAttempt`). Ein einzelner
 * Mittelwert über einen willkürlichen Füllstand wäre eine Zahl ohne Aussage.
 * Der Füllstand wird vor jeder Messung gesetzt — außerhalb der Zeitnahme.
 *
 * MIT GEMESSEN, und das gehört offengelegt: `checkRateLimit()` stößt intern
 * jede hundertste Anfrage einen Aufräumlauf an. Der liegt damit INNERHALB der
 * gestoppten Zeit, und der Zähler dafür läuft über das ganze Skript weiter.
 * Ungefähr jede hundertste Messung trägt also zusätzlich ein `DELETE` — das
 * ist echter Aufwand je Anfrage und deshalb richtig hier, erklärt aber einen
 * Teil der Streuung, die man sonst dem Rechner zuschriebe. Auf p50 wirkt es
 * sich nicht aus, auf p95 und den Höchstwert kann es das.
 *
 * Bewusst NICHT gemessen: Anfragen unter Wettstreit um denselben Schlüssel.
 * Die sind per Konstruktion serialisiert — die Zeilensperre ist ja der Zweck
 * der Übung — und eine Zahl daraus sagt mehr über die gewählte
 * Gleichzeitigkeit als über die Anwendung.
 */
import { performance } from 'node:perf_hooks';
import {
  checkRateLimit,
  __rateLimitKeyHash,
  __resetRateLimits,
} from '@/server/security/rate-limit';
import { prisma } from '@/server/db/prisma';

const AUFWAERMEN = 50;
const STICHPROBE = 300;
const PRAEFIX = 'messung-ratengrenze';
const FENSTER_MS = 60 * 60 * 1000;

/**
 * Füllstände, die im Betrieb wirklich vorkommen: eine frische Zeile, eine
 * ausgereizte Anmeldegrenze (`login`, 10) und die größte Grenze überhaupt
 * (`submitAttempt`, 240) — der ungünstigste Fall dieses Datenmodells.
 */
const FUELLSTAENDE = [0, 10, 120, 240];

function perzentil(werte: number[], anteil: number): number {
  const sortiert = [...werte].sort((a, b) => a - b);
  const index = Math.min(sortiert.length - 1, Math.max(0, Math.ceil(anteil * sortiert.length) - 1));
  return sortiert[index] ?? 0;
}

function bericht(name: string, dauern: number[]): void {
  const auf = (wert: number): string => wert.toFixed(3);
  console.log(
    `${name.padEnd(28)} n=${dauern.length}  p50=${auf(perzentil(dauern, 0.5))} ms  ` +
      `p95=${auf(perzentil(dauern, 0.95))} ms  ` +
      `min=${auf(Math.min(...dauern))} ms  max=${auf(Math.max(...dauern))} ms`,
  );
}

/** Setzt die Zeile auf genau `fuellstand` Zeitpunkte im laufenden Fenster. */
async function fuellstandSetzen(key: string, fuellstand: number, jetzt: number): Promise<void> {
  const keyHash = __rateLimitKeyHash(key);
  const hits = Array.from(
    { length: fuellstand },
    (_, i) => new Date(jetzt - (fuellstand - i) * 10),
  );
  await prisma.rateLimitBucket.upsert({
    where: { keyHash },
    create: { keyHash, hits, expiresAt: new Date(jetzt + FENSTER_MS) },
    update: { hits, expiresAt: new Date(jetzt + FENSTER_MS) },
  });
}

async function messen(fuellstand: number): Promise<number[]> {
  const key = `${PRAEFIX}:fuellstand-${fuellstand}`;
  // Limit knapp über dem Füllstand: Der gemessene Versuch wird ERLAUBT und
  // schreibt damit den vollen Weg. Der abgewiesene Fall schreibt weniger und
  // sähe zu günstig aus.
  const config = { limit: fuellstand + 1, windowMs: FENSTER_MS };
  const dauern: number[] = [];

  for (let lauf = 0; lauf < AUFWAERMEN + STICHPROBE; lauf += 1) {
    const jetzt = Date.now();
    await fuellstandSetzen(key, fuellstand, jetzt);

    const start = performance.now();
    await checkRateLimit(key, config, jetzt);
    const dauer = performance.now() - start;

    if (lauf >= AUFWAERMEN) dauern.push(dauer);
  }

  await __resetRateLimits([key]);
  return dauern;
}

async function main(): Promise<void> {
  const zeilen = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
  const version = zeilen[0]?.version ?? 'unbekannt';

  console.log('Ratenbegrenzung — Zusatzaufwand je Anfrage');
  console.log('------------------------------------------------------------');
  console.log(`Datenbank:      ${version.split(' ').slice(0, 2).join(' ')}`);
  console.log(`Node:           ${process.version}`);
  console.log(`Plattform:      ${process.platform}/${process.arch}`);
  console.log(`Aufwärmläufe:   ${AUFWAERMEN} je Füllstand (nicht gewertet)`);
  console.log(`Stichprobe:     ${STICHPROBE} je Füllstand, nacheinander`);
  console.log('');

  for (const fuellstand of FUELLSTAENDE) {
    bericht(`${fuellstand} Zeitpunkte in Zeile`, await messen(fuellstand));
  }

  console.log('');
  console.log('Vorbehalt: gemessen auf einem Entwicklungsrechner gegen eine');
  console.log('PostgreSQL-Instanz auf derselben Maschine (Loopback, keine');
  console.log('Netzstrecke, kein Verbindungs-Proxy). Auf der Zielplattform');
  console.log('kommen Netzlaufzeit und Poolverhalten hinzu. Diese Zahlen sind');
  console.log('eine Untergrenze und ausdrücklich KEINE Produktionslatenz.');

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
