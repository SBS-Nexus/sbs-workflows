import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import {
  checkRateLimit,
  pruneExpiredBuckets,
  __rateLimitKeyHash,
  __resetRateLimits,
} from '@/server/security/rate-limit';
import type { WorkerErgebnis } from './rate-limit-worker';

const ausfuehren = promisify(execFile);
const projektWurzel = path.resolve(import.meta.dirname, '..', '..');
const workerPfad = path.join(projektWurzel, 'tests', 'integration', 'rate-limit-worker.ts');

/**
 * Alle Schlüssel dieser Datei tragen dasselbe Präfix. Aufgeräumt wird
 * ausschließlich, was dazu gehört — kein `TRUNCATE`, keine fremden Zeilen
 * (docs/TESTING.md, Abschnitt zur Testisolation).
 */
const PRAEFIX = 'integrationstest-ratengrenze';
const schluessel = (name: string): string => `${PRAEFIX}:${name}`;

const ALLE_SCHLUESSEL = [
  'grenze',
  'fenster',
  'retry',
  'getrennt-a',
  'getrennt-b',
  'digest',
  'wettlauf',
  'zwei-prozesse-nacheinander',
  'zwei-prozesse-gleichzeitig',
  'ausfall',
  'abgelaufen',
  'gueltig',
  'frisch',
  ...Array.from({ length: 5 }, (_, i) => `aufraeum-grenze-${i}`),
].map(schluessel);

async function eigeneZeilenEntfernen(): Promise<void> {
  await __resetRateLimits(ALLE_SCHLUESSEL);
}

/**
 * Startet den Worker als echten Kindprozess mit eigenem Verbindungspool.
 * `datenbank` erlaubt es, ihm bewusst eine unerreichbare Adresse zu geben.
 */
async function workerLauf(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
  versuche: number,
  datenbank: string | undefined = process.env.TEST_DATABASE_URL,
): Promise<WorkerErgebnis> {
  const { stdout } = await ausfuehren(
    'npx',
    [
      'tsx',
      '--conditions=react-server',
      workerPfad,
      key,
      String(limit),
      String(windowMs),
      String(now),
      String(versuche),
    ],
    { cwd: projektWurzel, env: { ...process.env, DATABASE_URL: datenbank } },
  );

  return JSON.parse(stdout) as WorkerErgebnis;
}

describe('Ratenbegrenzung (Integration mit echter Datenbank)', () => {
  beforeEach(eigeneZeilenEntfernen);
  afterAll(eigeneZeilenEntfernen);

  it('erlaubt bis zur Grenze und weist danach ab', async () => {
    const key = schluessel('grenze');
    const config = { limit: 3, windowMs: 60_000 };
    const now = Date.now();

    expect((await checkRateLimit(key, config, now)).allowed).toBe(true);
    expect((await checkRateLimit(key, config, now)).allowed).toBe(true);
    const dritter = await checkRateLimit(key, config, now);
    expect(dritter.allowed).toBe(true);
    expect(dritter.remaining).toBe(0);
    expect((await checkRateLimit(key, config, now)).allowed).toBe(false);
  });

  it('lässt nach Ablauf des Fensters wieder zu und zählt abgewiesene Versuche nicht mit', async () => {
    const key = schluessel('fenster');
    const config = { limit: 2, windowMs: 60_000 };
    const start = Date.now();

    await checkRateLimit(key, config, start);
    await checkRateLimit(key, config, start);
    expect((await checkRateLimit(key, config, start)).allowed).toBe(false);

    // Ein abgewiesener Versuch darf die Sperre NICHT verlängern: Sonst käme
    // niemand, der einmal gegen die Wand gelaufen ist, je wieder heraus.
    // Nach Fensterbreite ab dem letzten GEZÄHLTEN Versuch ist wieder frei.
    expect((await checkRateLimit(key, config, start + 60_001)).allowed).toBe(true);
  });

  it('meldet eine Wartezeit, die zum ältesten Versuch im Fenster passt', async () => {
    const key = schluessel('retry');
    const config = { limit: 1, windowMs: 60_000 };
    const start = Date.now();

    await checkRateLimit(key, config, start);
    const abgewiesen = await checkRateLimit(key, config, start + 20_000);

    expect(abgewiesen.allowed).toBe(false);
    expect(abgewiesen.remaining).toBe(0);
    // Ältester Versuch bei `start`, Fenster 60 s, jetzt +20 s → noch 40 s.
    expect(abgewiesen.retryAfterSeconds).toBe(40);
  });

  it('führt verschiedene Schlüssel als getrennte Zähler', async () => {
    const a = schluessel('getrennt-a');
    const b = schluessel('getrennt-b');
    const config = { limit: 1, windowMs: 60_000 };
    const now = Date.now();

    expect((await checkRateLimit(a, config, now)).allowed).toBe(true);
    expect((await checkRateLimit(a, config, now)).allowed).toBe(false);
    expect((await checkRateLimit(b, config, now)).allowed).toBe(true);
  });

  it('speichert den Schlüssel nur als Digest, nie im Klartext', async () => {
    const key = schluessel('digest');
    await checkRateLimit(key, { limit: 2, windowMs: 60_000 }, Date.now());

    const zeile = await prisma.rateLimitBucket.findUniqueOrThrow({
      where: { keyHash: __rateLimitKeyHash(key) },
    });

    expect(zeile.keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(zeile)).not.toContain(PRAEFIX);

    // Die Tabelle trägt außer Digest, Zeitpunkten und Ablauf nichts —
    // insbesondere keine Spalte, in der eine Adresse, eine Herkunft oder ein
    // Nutzerbezug landen könnte. Geprüft an der echten Tabelle, nicht am
    // Prisma-Modell: Eine später von Hand hinzugefügte Spalte fiele hier auf.
    const spalten = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'rate_limit_buckets'
      ORDER BY column_name`;
    expect(spalten.map((spalte) => spalte.column_name)).toEqual(['expiresAt', 'hits', 'keyHash']);
  });

  it('bleibt bei gleichzeitigen Anfragen auf denselben Schlüssel atomar', async () => {
    const key = schluessel('wettlauf');
    const config = { limit: 5, windowMs: 60_000 };
    const now = Date.now();

    // Vierzig gleichzeitige Versuche gegen eine Grenze von fünf. Ohne
    // Zeilensperre läsen mehrere denselben Stand, fänden alle Platz und
    // schrieben sich gegenseitig zu — erlaubt wären dann mehr als fünf.
    const ergebnisse = await Promise.all(
      Array.from({ length: 40 }, () => checkRateLimit(key, config, now)),
    );

    expect(ergebnisse.filter((ergebnis) => ergebnis.allowed)).toHaveLength(config.limit);

    const zeile = await prisma.rateLimitBucket.findUniqueOrThrow({
      where: { keyHash: __rateLimitKeyHash(key) },
    });
    expect(zeile.hits).toHaveLength(config.limit);
  });

  it('teilt den Zähler über zwei getrennte Prozesse hinweg', async () => {
    const key = schluessel('zwei-prozesse-nacheinander');
    const config = { limit: 4, windowMs: 60_000 };
    const now = Date.now();

    // Erster Prozess verbraucht das Kontingent vollständig.
    const erster = await workerLauf(key, config.limit, config.windowMs, now, config.limit);
    expect(erster).toEqual({ erlaubt: 4, abgewiesen: 0 });

    // Zweiter, frisch gestarteter Prozess: eigener Speicher, eigener
    // Verbindungspool, kein gemeinsamer Modulzustand. Mit dem alten
    // `new Map()` je Prozess hätte er vier weitere Versuche freigegeben.
    const zweiter = await workerLauf(key, config.limit, config.windowMs, now, config.limit);
    expect(zweiter).toEqual({ erlaubt: 0, abgewiesen: 4 });
  }, 120_000);

  it('lässt zwei gleichzeitige Prozesse die Grenze zusammen nicht überschreiten', async () => {
    const key = schluessel('zwei-prozesse-gleichzeitig');
    const config = { limit: 6, windowMs: 60_000 };
    const now = Date.now();

    // Beide Prozesse laufen zur selben Zeit und versuchen je das volle
    // Kontingent. Zusammen dürfen trotzdem nur sechs durchkommen.
    const [a, b] = await Promise.all([
      workerLauf(key, config.limit, config.windowMs, now, config.limit),
      workerLauf(key, config.limit, config.windowMs, now, config.limit),
    ]);

    expect(a.fehler).toBeUndefined();
    expect(b.fehler).toBeUndefined();
    expect(a.erlaubt + b.erlaubt).toBe(config.limit);
    expect(a.abgewiesen + b.abgewiesen).toBe(config.limit);

    const zeile = await prisma.rateLimitBucket.findUniqueOrThrow({
      where: { keyHash: __rateLimitKeyHash(key) },
    });
    expect(zeile.hits).toHaveLength(config.limit);
  }, 120_000);

  it('sperrt, wenn die Datenbank nicht erreichbar ist (fail closed)', async () => {
    // Ein echter Prozess mit echtem Code gegen eine Adresse, auf der nichts
    // lauscht. Die Entscheidung ist ausdrücklich: Ist die Grenze nicht
    // prüfbar, wird abgewiesen statt durchgelassen (docs/SECURITY.md).
    const ergebnis = await workerLauf(
      schluessel('ausfall'),
      5,
      60_000,
      Date.now(),
      3,
      'postgresql://aipfad:aipfad@127.0.0.1:1/existiert-nicht',
    );

    expect(ergebnis.erlaubt).toBe(0);
    expect(ergebnis.fehler).toBe('RateLimitUnavailableError');
  }, 120_000);

  it('entfernt abgelaufene Zeilen und lässt gültige stehen', async () => {
    const abgelaufen = __rateLimitKeyHash(schluessel('abgelaufen'));
    const gueltig = __rateLimitKeyHash(schluessel('gueltig'));

    await prisma.rateLimitBucket.createMany({
      data: [
        {
          keyHash: abgelaufen,
          hits: [new Date(Date.now() - 120_000)],
          expiresAt: new Date(Date.now() - 60_000),
        },
        { keyHash: gueltig, hits: [new Date()], expiresAt: new Date(Date.now() + 60_000) },
      ],
    });

    const entfernt = await pruneExpiredBuckets(100);

    expect(entfernt).toBeGreaterThanOrEqual(1);
    expect(await prisma.rateLimitBucket.findUnique({ where: { keyHash: abgelaufen } })).toBeNull();
    expect(await prisma.rateLimitBucket.findUnique({ where: { keyHash: gueltig } })).not.toBeNull();
  });

  it('hält eine eben erst geschriebene Zeile nicht für abgelaufen', async () => {
    // Regressionstest für einen Fehler, der in der CI nicht aufgefallen wäre:
    // Mit `timestamptz` schrieb der Treiber den UTC-Zeitpunkt ohne Versatz,
    // und eine Datenbanksitzung in `Europe/Berlin` deutete ihn als Ortszeit.
    // Jede frisch geschriebene Zeile lag damit scheinbar zwei Stunden in der
    // Vergangenheit, wurde beim nächsten Aufräumen entfernt — und der Zähler
    // begann mitten im Fenster von vorn. Die CI läuft in UTC (Versatz null),
    // dort wäre nichts zu sehen gewesen.
    const key = schluessel('frisch');
    const config = { limit: 2, windowMs: 60_000 };

    await checkRateLimit(key, config, Date.now());
    await pruneExpiredBuckets(500);

    const zeile = await prisma.rateLimitBucket.findUnique({
      where: { keyHash: __rateLimitKeyHash(key) },
    });
    expect(zeile).not.toBeNull();

    // Und die Grenze greift danach weiterhin: Der Versuch von eben zählt noch.
    await checkRateLimit(key, config, Date.now());
    expect((await checkRateLimit(key, config, Date.now())).allowed).toBe(false);
  });

  it('räumt je Lauf höchstens so viele Zeilen ab wie erlaubt', async () => {
    const schluesselListe = Array.from({ length: 5 }, (_, i) =>
      __rateLimitKeyHash(schluessel(`aufraeum-grenze-${i}`)),
    );
    await prisma.rateLimitBucket.createMany({
      data: schluesselListe.map((keyHash) => ({
        keyHash,
        hits: [],
        expiresAt: new Date(Date.now() - 60_000),
      })),
    });

    // Der Lauf ist gedeckelt: Es verschwinden genau zwei Zeilen, obwohl fünf
    // abgelaufen sind. Ohne diese Deckelung wäre das Aufräumen ein
    // unbeschränkter Löschvorgang mitten in einer Anfrage.
    expect(await pruneExpiredBuckets(2)).toBe(2);

    // Bewusst "mindestens drei" statt "genau drei": Welche zwei Zeilen der
    // Lauf erwischt, hängt an `ORDER BY "expiresAt"` und damit daran, ob noch
    // ältere abgelaufene Zeilen herumliegen. Gedeckelt ist er in jedem Fall,
    // und genau das ist die Aussage dieses Tests.
    const uebrig = await prisma.rateLimitBucket.count({
      where: { keyHash: { in: schluesselListe } },
    });
    expect(uebrig).toBeGreaterThanOrEqual(3);
  });
});
