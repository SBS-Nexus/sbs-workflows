import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';

/**
 * Die geplante Route selbst, gegen eine echte Datenbank.
 *
 * Geprüft wird die Sicherheitsgrenze und der Weg von der Kopfzeile bis zur
 * gelöschten Zeile — also genau das, was die Unit-Tests nicht abdecken: dort
 * gibt es weder eine Route noch echte Daten.
 *
 * Der Modus steckt in der Umgebung und wird von `getEnv()` einmal
 * zwischengespeichert. Deshalb wird je Fall die Umgebung gesetzt, das
 * Modulregister geleert und die Route frisch importiert.
 */

const PRAEFIX = 'route@integrationtest.local';
const GEHEIMNIS = 'testgeheimnis-nur-fuer-automatisierte-tests';
const TAG = 24 * 60 * 60 * 1000;

async function eigeneZeilenEntfernen(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { contains: PRAEFIX } } });
}

/** Legt eine Zeile an, die älter ist als jede sinnvolle Frist. */
async function alterVersuch(name: string): Promise<string> {
  const nutzer = await prisma.user.create({
    data: {
      email: `${name}-${PRAEFIX}`,
      name: 'Routentest',
      passwordHash: await hashPassword('ein-sicheres-testpasswort-123'),
    },
  });
  const aufgabe = await prisma.exercise.findFirstOrThrow({ select: { id: true } });
  const versuch = await prisma.attempt.create({
    data: {
      userId: nutzer.id,
      exerciseId: aufgabe.id,
      submittedAnswer: {},
      result: 'PASSED',
      hintsUsed: 0,
      durationMs: 5000,
      createdAt: new Date(Date.now() - 3000 * TAG),
    },
  });
  return versuch.id;
}

/**
 * Ruft die Route mit frisch geladener Konfiguration auf. `vi.resetModules()`
 * ist nötig, weil `getEnv()` sein Ergebnis zwischenspeichert und die Route den
 * Modus daraus liest.
 */
async function routeAufrufen(
  authorization: string | null,
  mode: 'dry-run' | 'execute',
): Promise<Response> {
  vi.resetModules();
  process.env.RETENTION_MODE = mode;
  process.env.CRON_SECRET = GEHEIMNIS;

  const { GET } = await import('@/app/api/cron/retention/route');
  const kopfzeilen = new Headers();
  if (authorization !== null) kopfzeilen.set('authorization', authorization);

  return GET(new Request('http://127.0.0.1/api/cron/retention', { headers: kopfzeilen }));
}

describe('Geplanter Aufbewahrungslauf (Route)', () => {
  beforeEach(eigeneZeilenEntfernen);
  afterAll(async () => {
    await eigeneZeilenEntfernen();
    process.env.RETENTION_MODE = 'dry-run';
  });

  it('weist einen Aufruf ohne Kopfzeile ab und löscht nichts', async () => {
    const versuchId = await alterVersuch('ohne-kopfzeile');

    const antwort = await routeAufrufen(null, 'execute');

    expect(antwort.status).toBe(401);
    // Entscheidend: abgewiesen BEVOR irgendetwas gelöscht wurde.
    expect(await prisma.attempt.findUnique({ where: { id: versuchId } })).not.toBeNull();
  });

  it('weist ein falsches Geheimnis ab und löscht nichts', async () => {
    const versuchId = await alterVersuch('falsches-geheimnis');

    const antwort = await routeAufrufen(`Bearer ${'X'.repeat(GEHEIMNIS.length)}`, 'execute');

    expect(antwort.status).toBe(401);
    expect(await prisma.attempt.findUnique({ where: { id: versuchId } })).not.toBeNull();
  });

  it('zählt im Trockenlauf mit gültigem Geheimnis, ohne zu löschen', async () => {
    const versuchId = await alterVersuch('trockenlauf');

    const antwort = await routeAufrufen(`Bearer ${GEHEIMNIS}`, 'dry-run');
    const bericht = (await antwort.json()) as {
      mode: string;
      status: string;
      totalCandidateCount: number;
      totalDeletedCount: number;
    };

    expect(antwort.status).toBe(200);
    expect(bericht.mode).toBe('dry-run');
    expect(bericht.status).toBe('success');
    expect(bericht.totalCandidateCount).toBeGreaterThanOrEqual(1);
    expect(bericht.totalDeletedCount).toBe(0);
    expect(await prisma.attempt.findUnique({ where: { id: versuchId } })).not.toBeNull();
  });

  it('löscht im Ernstfall mit gültigem Geheimnis', async () => {
    const versuchId = await alterVersuch('ernstfall');

    const antwort = await routeAufrufen(`Bearer ${GEHEIMNIS}`, 'execute');
    const bericht = (await antwort.json()) as { mode: string; totalDeletedCount: number };

    expect(antwort.status).toBe(200);
    expect(bericht.mode).toBe('execute');
    expect(bericht.totalDeletedCount).toBeGreaterThanOrEqual(1);
    expect(await prisma.attempt.findUnique({ where: { id: versuchId } })).toBeNull();
  });

  it('bleibt beim zweiten Aufruf erfolgreich und löscht nichts mehr', async () => {
    await alterVersuch('zweimal');

    await routeAufrufen(`Bearer ${GEHEIMNIS}`, 'execute');
    const zweite = await routeAufrufen(`Bearer ${GEHEIMNIS}`, 'execute');
    const bericht = (await zweite.json()) as { status: string; totalDeletedCount: number };

    expect(zweite.status).toBe(200);
    expect(bericht.status).toBe('success');
    expect(bericht.totalDeletedCount).toBe(0);
  });

  it('antwortet mit 500, wenn eine Regel scheitert, und führt die übrigen aus', async () => {
    // Die Route nimmt die produktive Liste. Für diesen Fall wird sie ersetzt:
    // Eine kaputte Datenart soll die anderen nicht aufhalten, aber der
    // geplante Aufruf muss sichtbar fehlschlagen — sonst zeigt die
    // Aufrufübersicht ein grünes Häkchen, während nichts aufgeräumt wird.
    vi.resetModules();
    process.env.RETENTION_MODE = 'execute';
    process.env.CRON_SECRET = GEHEIMNIS;

    const nachlaeufer = { gelaufen: false };
    vi.doMock('@/server/retention/rules', () => ({
      PRODUKTIVE_REGELN: [
        {
          id: 'KAPUTT',
          dataCategory: 'Kaputt',
          retentionDaysEnvVar: 'KAPUTT_DAYS',
          retentionDays: () => 30,
          cutoffAt: (now: Date, tage: number) => new Date(now.getTime() - tage * TAG),
          countCandidates: () => Promise.reject(new RangeError('Zählen fehlgeschlagen')),
          deleteCandidates: () => Promise.resolve(0),
        },
        {
          id: 'DANACH',
          dataCategory: 'Danach',
          retentionDaysEnvVar: 'DANACH_DAYS',
          retentionDays: () => 30,
          cutoffAt: (now: Date, tage: number) => new Date(now.getTime() - tage * TAG),
          countCandidates: () => {
            nachlaeufer.gelaufen = true;
            return Promise.resolve(0);
          },
          deleteCandidates: () => Promise.resolve(0),
        },
      ],
    }));

    try {
      const { GET } = await import('@/app/api/cron/retention/route');
      const kopfzeilen = new Headers({ authorization: `Bearer ${GEHEIMNIS}` });
      const antwort = await GET(
        new Request('http://127.0.0.1/api/cron/retention', { headers: kopfzeilen }),
      );
      const bericht = (await antwort.json()) as {
        status: string;
        rules: { ruleId: string; status: string; errorType?: string }[];
      };

      expect(antwort.status).toBe(500);
      expect(bericht.status).toBe('partial-failure');
      expect(bericht.rules.map((r) => r.status)).toEqual(['failed', 'success']);
      // Die nachfolgende Regel ist wirklich gelaufen, nicht nur gemeldet.
      expect(nachlaeufer.gelaufen).toBe(true);
      // Auch hier: nur die Fehlerart, nicht die Meldung.
      expect(bericht.rules[0]?.errorType).toBe('RangeError');
      expect(JSON.stringify(bericht)).not.toContain('fehlgeschlagen');
    } finally {
      vi.doUnmock('@/server/retention/rules');
      vi.resetModules();
    }
  });

  it('antwortet ohne Zwischenspeicherung', async () => {
    const antwort = await routeAufrufen(`Bearer ${GEHEIMNIS}`, 'dry-run');
    expect(antwort.headers.get('cache-control')).toBe('no-store');
  });

  it('nennt in der Antwort weder Geheimnis noch Datensatzinhalte', async () => {
    await alterVersuch('keine-preisgabe');

    const antwort = await routeAufrufen(`Bearer ${GEHEIMNIS}`, 'dry-run');
    const alsText = await antwort.text();

    expect(alsText).not.toContain(GEHEIMNIS);
    expect(alsText).not.toContain(PRAEFIX);
    expect(alsText).not.toContain('postgresql://');
  });

  it('gibt bei abgewiesenem Aufruf nichts über die Konfiguration preis', async () => {
    const antwort = await routeAufrufen('Bearer falsch', 'dry-run');
    const alsText = await antwort.text();

    expect(alsText).not.toContain(GEHEIMNIS);
    // Auch kein Hinweis darauf, ob überhaupt ein Geheimnis gesetzt ist.
    expect(alsText).not.toContain('CRON_SECRET');
    expect(JSON.parse(alsText)).toEqual({ status: 'unauthorized' });
  });
});
