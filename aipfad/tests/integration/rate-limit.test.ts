import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import './setup';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
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
  'aufraeum-wettlauf',
  'dauernd-weg',
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
    // Wird `expiresAt` gegen `now()` der Datenbank verglichen, deutet
    // PostgreSQL die Spalte (UTC-Wanduhrzeit, ohne Zeitzone) mit der Zeitzone
    // der SITZUNG. Auf einem Rechner in `Europe/Berlin` liegt eine frisch
    // geschriebene Zeile damit scheinbar um den Zonenversatz in der
    // Vergangenheit, wird beim nächsten Aufräumen entfernt — und der Zähler
    // beginnt mitten im Fenster von vorn. Die CI läuft in UTC (Versatz null),
    // dort wäre nichts zu sehen gewesen.
    //
    // Die SPALTENART schützt davor nicht: Der Fehler tritt mit `timestamp`
    // genauso auf wie mit `timestamptz`. Tragend ist allein, dass
    // `pruneExpiredBuckets()` seinen Vergleichszeitpunkt aus der Anwendung
    // bekommt.
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

  it('löscht keine Zeile, die während des Aufräumens aufgefrischt wird', async () => {
    // Der Aufräumlauf wählt in einer Unterabfrage aus, was zum
    // Anweisungsbeginn abgelaufen war. Bis das `DELETE` die Zeile wirklich
    // erwischt, kann eine gleichzeitige Anfrage sie längst fortgeschrieben
    // haben — dann löschte der Lauf einen LEBENDEN Zähler, und die Grenze
    // begänne mitten im Fenster von vorn.
    //
    // Nachgestellt mit einer zweiten, unabhängigen Verbindung, die die Zeile
    // sperrt, den Aufräumlauf auflaufen lässt und erst danach auffrischt.
    const keyHash = __rateLimitKeyHash(schluessel('aufraeum-wettlauf'));
    const zweiteVerbindung = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }),
    });

    try {
      await prisma.rateLimitBucket.create({
        data: { keyHash, hits: [], expiresAt: new Date(Date.now() - 60_000) },
      });

      let aufraeumen: Promise<number> | undefined;

      await zweiteVerbindung.$transaction(async (tx) => {
        await tx.$executeRaw`
          SELECT "keyHash" FROM rate_limit_buckets WHERE "keyHash" = ${keyHash} FOR UPDATE`;

        // Der Lauf blockiert ab hier an der Zeilensperre.
        aufraeumen = pruneExpiredBuckets(500);
        await new Promise((fertig) => setTimeout(fertig, 500));

        await tx.$executeRaw`
          UPDATE rate_limit_buckets
          SET "expiresAt" = ${new Date(Date.now() + 3_600_000)}
          WHERE "keyHash" = ${keyHash}`;
      });

      await aufraeumen;

      const zeile = await prisma.rateLimitBucket.findUnique({ where: { keyHash } });
      expect(zeile).not.toBeNull();
      expect(zeile?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    } finally {
      await prisma.rateLimitBucket.deleteMany({ where: { keyHash } });
      await zweiteVerbindung.$disconnect().catch(() => undefined);
    }
  });

  it('bleibt bei gleichzeitigem, aggressivem Aufräumen antwortfähig', async () => {
    // Ein Aufräumlauf mit einem Vergleichszeitpunkt weit in der ZUKUNFT trifft
    // jede Zeile, auch die lebenden, und läuft hier parallel zu den Anfragen.
    //
    // Was dieser Test NACHWEIST: Unter dauerndem Wegräumen liefert jede
    // Anfrage eine wohlgeformte Antwort, keine bleibt hängen, keine wirft.
    //
    // Er trifft dabei AUCH den Neu-Ansatz in `zaehleUndPruefe()` für den Fall,
    // dass die Zeile genau zwischen Anlegen und Sperren verschwindet — aber
    // nicht verlässlich, sondern je nach Lauf. Belegt durch Mutation: Mit
    // `HOECHSTENS_ANLAEUFE = 1` scheitert dieser Test in etwa der Hälfte der
    // Läufe (gemessen 2 von 5, in einer unabhängigen Prüfung 3 von 5) mit
    // `RateLimitUnavailableError`. Dass die Schleife hier greift, ist also
    // nachgewiesen; verlassen sollte man sich auf die Abdeckung nicht.
    //
    // Was auch dieser Test NICHT prüft: ob der Neu-Ansatz den Zählstand
    // KORREKT erhält. Die Grenze steht bewusst hoch, damit der Lauf nicht an
    // legitimen Abweisungen scheitert — geprüft wird Antwortfähigkeit, nicht
    // Genauigkeit unter Wegräumen.
    const key = schluessel('dauernd-weg');
    const config = { limit: 50, windowMs: 60_000 };
    const zukunft = new Date(Date.now() + 3_600_000);

    let weiterLoeschen = true;
    const loescher = (async () => {
      for (let lauf = 0; lauf < 30 && weiterLoeschen; lauf += 1) {
        await pruneExpiredBuckets(500, zukunft);
      }
    })();

    try {
      const ergebnisse = await Promise.all(
        Array.from({ length: 30 }, () => checkRateLimit(key, config, Date.now())),
      );

      for (const ergebnis of ergebnisse) {
        expect(typeof ergebnis.allowed).toBe('boolean');
        expect(ergebnis.remaining).toBeGreaterThanOrEqual(0);
        expect(ergebnis.retryAfterSeconds).toBeGreaterThanOrEqual(0);
      }
      // Die Grenze ist großzügig genug, dass ohne Fehler alle durchkommen.
      expect(ergebnisse.every((ergebnis) => ergebnis.allowed)).toBe(true);
    } finally {
      // Der Löschlauf MUSS abgewartet werden, auch wenn oben etwas scheitert.
      // Sonst läuft er in den nächsten Test hinein und räumt dessen Zeilen
      // weg — ein Fehler hier brächte dann einen zweiten, scheinbar fremden
      // zum Scheitern.
      weiterLoeschen = false;
      await loescher;
    }
  }, 60_000);

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
