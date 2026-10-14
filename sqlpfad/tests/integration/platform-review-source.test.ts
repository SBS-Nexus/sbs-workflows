import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { waehleAufgabenZuKonzepten } from '@/server/wiederholung';
import { readPlatformReviewSource } from '@/server/services/platform-review-source';

/**
 * LP-05B — SQLPfad als schreibgeschützte Wiederholungsquelle, gegen echte Zeilen.
 *
 * Der Kern: Die kanonische Identität ist das KONZEPT. Die gewählte Aufgabe
 * ist nur Darstellungsangabe. Es wird nichts geschrieben und keine
 * Warteschlange ausmaterialisiert.
 */

const SESSION_USER = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/server/auth/session', () => ({
  getCurrentUser: async () => (SESSION_USER.id ? { id: SESSION_USER.id } : null),
}));

const PRAEFIX = 'lp05b-sql-review-source';
const NOW = new Date('2026-10-01T12:00:00.000Z');
const TAG = 24 * 60 * 60 * 1000;
const HUB = 'https://lernpfade.integrationstest.example';

async function nutzer(name: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `${name}-${PRAEFIX}@integrationtest.local`,
      name: 'Quellentest',
      passwordHash: await hashPassword('ein-testpasswort-123'),
    },
  });
  return user.id;
}

async function aufraeumen(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { contains: PRAEFIX } } });
  await prisma.exercise.updateMany({ data: { status: 'PUBLISHED' } });
}

/** Konzepte, die mindestens eine veröffentlichte Übungsaufgabe haben. */
async function uebbareKonzepte(): Promise<string[]> {
  const zuordnungen = await prisma.exerciseConcept.findMany({
    where: { exercise: { status: 'PUBLISHED', lesson: { status: 'PUBLISHED' } } },
    select: { conceptId: true },
    orderBy: { conceptId: 'asc' },
  });
  return [...new Set(zuordnungen.map((z) => z.conceptId))];
}

function faellig(userId: string, conceptId: string, nextReviewAt: Date) {
  return { userId, conceptId, nextReviewAt, repetitions: 1, stability: 1, lastPracticedAt: NOW };
}

describe('SQLPfad-Wiederholungsquelle (LP-05B, echte Datenbank)', () => {
  let anna: string;
  let bert: string;

  beforeEach(async () => {
    await aufraeumen();
    anna = await nutzer('anna');
    bert = await nutzer('bert');
    SESSION_USER.id = null;
  });

  afterEach(aufraeumen);

  it('liefert nur eigene, fällige Konzepte — Identität bleibt das Konzept', async () => {
    const [k1, k2, k3] = await uebbareKonzepte();
    if (!k1 || !k2 || !k3) throw new Error('Seed enthält zu wenige übbare Konzepte');

    await prisma.conceptMastery.createMany({
      data: [
        faellig(anna, k1, new Date(NOW.getTime() - TAG)),
        faellig(anna, k2, new Date(NOW.getTime() - 3 * TAG)),
        // Zukunft: nicht fällig.
        faellig(anna, k3, new Date(NOW.getTime() + 2 * TAG)),
        // Fremde Zeile, fällig.
        faellig(bert, k1, new Date(NOW.getTime() - 10 * TAG)),
      ],
    });

    const batch = await readPlatformReviewSource(anna, { limit: 10, now: NOW });
    expect(batch.source).toBe('sql');
    expect(batch.items.map((item) => item.sourceItemId)).toEqual([k2, k1]);
    for (const item of batch.items) {
      expect(item.sourceKind).toBe('concept');
      expect(item.conceptIds).toEqual([item.sourceItemId]);
      // Die Aufgabe ist Darstellung, nicht Identität.
      expect(item.practice?.exerciseSlug).toBeTruthy();
      expect(item.sourceItemId).not.toBe(item.practice?.exerciseSlug);
    }
    expect(batch.nextDueAt).toBe(new Date(NOW.getTime() + 2 * TAG).toISOString());

    const fremd = await readPlatformReviewSource(bert, { limit: 10, now: NOW });
    expect(fremd.items.map((item) => item.sourceItemId)).toEqual([k1]);
  });

  it('wählt die Übungsaufgabe mit der bestehenden, deterministischen Auswahl', async () => {
    const konzepte = (await uebbareKonzepte()).slice(0, 4);
    await prisma.conceptMastery.createMany({
      data: konzepte.map((k, i) => faellig(anna, k, new Date(NOW.getTime() - (i + 1) * TAG))),
    });

    const erwartet = await waehleAufgabenZuKonzepten(anna, konzepte);
    const batch = await readPlatformReviewSource(anna, { limit: 10, now: NOW });
    for (const item of batch.items) {
      expect(item.practice?.exerciseSlug).toBe(erwartet.get(item.sourceItemId));
    }
    expect(await readPlatformReviewSource(anna, { limit: 10, now: NOW })).toEqual(batch);
  });

  it('zwei Konzepte auf derselben Aufgabe bleiben zwei Einträge', async () => {
    const geteilt = await prisma.exercise.findFirst({
      where: {
        status: 'PUBLISHED',
        lesson: { status: 'PUBLISHED' },
        concepts: { some: {} },
      },
      orderBy: { slug: 'asc' },
      select: {
        slug: true,
        concepts: { select: { conceptId: true }, orderBy: { conceptId: 'asc' } },
      },
    });
    const mehrere = await prisma.exercise.findMany({
      where: { status: 'PUBLISHED', lesson: { status: 'PUBLISHED' } },
      select: {
        slug: true,
        concepts: { select: { conceptId: true }, orderBy: { conceptId: 'asc' } },
      },
    });
    const kandidat = mehrere.find((exercise) => exercise.concepts.length >= 2) ?? geteilt;
    if (!kandidat || kandidat.concepts.length < 2) return; // Seed ohne geteilte Aufgabe: nichts zu prüfen.
    const [a, b] = kandidat.concepts.map((c) => c.conceptId);
    if (!a || !b) return;

    await prisma.conceptMastery.createMany({
      data: [
        faellig(anna, a, new Date(NOW.getTime() - TAG)),
        faellig(anna, b, new Date(NOW.getTime() - TAG)),
      ],
    });
    const batch = await readPlatformReviewSource(anna, { limit: 10, now: NOW });
    const ids = batch.items.map((item) => item.sourceItemId);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('hält die Obergrenze ein, meldet Kürzung und sortiert stabil nach Konzept', async () => {
    const konzepte = (await uebbareKonzepte()).slice(0, 5);
    expect(konzepte).toHaveLength(5);
    const gleich = new Date(NOW.getTime() - TAG);
    await prisma.conceptMastery.createMany({ data: konzepte.map((k) => faellig(anna, k, gleich)) });

    const batch = await readPlatformReviewSource(anna, { limit: 3, now: NOW });
    expect(batch.items.map((item) => item.sourceItemId)).toEqual([...konzepte].sort().slice(0, 3));
    expect(batch.truncated).toBe(true);
    expect((await readPlatformReviewSource(anna, { limit: 5, now: NOW })).truncated).toBe(false);
  });

  it('lässt Konzepte ohne veröffentlichte Übungsaufgabe aus', async () => {
    const [k1] = await uebbareKonzepte();
    if (!k1) throw new Error('Seed enthält zu wenige übbare Konzepte');
    await prisma.conceptMastery.create({ data: faellig(anna, k1, new Date(NOW.getTime() - TAG)) });

    const zuordnungen = await prisma.exerciseConcept.findMany({
      where: { conceptId: k1 },
      select: { exerciseId: true },
    });
    await prisma.exercise.updateMany({
      where: { id: { in: zuordnungen.map((z) => z.exerciseId) } },
      data: { status: 'DRAFT' },
    });

    const batch = await readPlatformReviewSource(anna, { limit: 10, now: NOW });
    expect(batch.items).toEqual([]);
  });

  it('nicht übbare Konzepte verdrängen keine übbaren und sind nie „als Nächstes"', async () => {
    const [kA, kB] = await uebbareKonzepte();
    if (!kA || !kB) throw new Error('Seed enthält zu wenige übbare Konzepte');
    const zuordnungen = await prisma.exerciseConcept.findMany({
      where: { conceptId: { in: [kA, kB] } },
      select: { exerciseId: true },
    });
    await prisma.exercise.updateMany({
      where: { id: { in: zuordnungen.map((z) => z.exerciseId) } },
      data: { status: 'DRAFT' },
    });
    const [k2, k3] = await uebbareKonzepte();
    if (!k2 || !k3) throw new Error('Seed enthält zu wenige übbare Konzepte');

    // kA ist am längsten fällig, aber nicht übbar; k2 ist übbar und fällig.
    // kB hat den frühesten künftigen Termin, ist aber nicht übbar — als
    // „als Nächstes" zählt deshalb k3.
    await prisma.conceptMastery.createMany({
      data: [
        faellig(anna, kA, new Date(NOW.getTime() - 3 * TAG)),
        faellig(anna, k2, new Date(NOW.getTime() - TAG)),
        faellig(anna, kB, new Date(NOW.getTime() + TAG)),
        faellig(anna, k3, new Date(NOW.getTime() + 2 * TAG)),
      ],
    });

    const batch = await readPlatformReviewSource(anna, { limit: 1, now: NOW });
    expect(batch.items.map((item) => item.sourceItemId)).toEqual([k2]);
    expect(batch.truncated).toBe(false);
    expect(batch.nextDueAt).toBe(new Date(NOW.getTime() + 2 * TAG).toISOString());
  });

  it('schreibt nichts und materialisiert keine Warteschlange', async () => {
    const konzepte = (await uebbareKonzepte()).slice(0, 3);
    await prisma.conceptMastery.createMany({
      data: konzepte.map((k, i) => faellig(anna, k, new Date(NOW.getTime() - (i + 1) * TAG))),
    });
    const vorher = await prisma.conceptMastery.findMany({
      where: { userId: anna },
      orderBy: { conceptId: 'asc' },
    });

    const batch = await readPlatformReviewSource(anna, { limit: 10, now: NOW });
    expect(batch.items.length).toBeGreaterThan(0);

    expect(
      await prisma.conceptMastery.findMany({
        where: { userId: anna },
        orderBy: { conceptId: 'asc' },
      }),
    ).toEqual(vorher);
    expect(await prisma.reviewQueueItem.count({ where: { userId: anna } })).toBe(0);
    expect(await prisma.attempt.count({ where: { userId: anna } })).toBe(0);

    const text = JSON.stringify(batch);
    const loesungen = await prisma.exercise.findMany({
      where: { slug: { in: batch.items.map((item) => item.practice?.exerciseSlug ?? '') } },
      select: { solutionSql: true, solutionNotes: true },
    });
    for (const loesung of loesungen) {
      for (const geheim of [loesung.solutionSql, loesung.solutionNotes]) {
        if (geheim && geheim.trim().length > 20) expect(text).not.toContain(geheim.trim());
      }
    }
  });

  it('Route: Umfang allein aus der Sitzung, fremde Kennung abgewiesen, nicht teilbar gecacht', async () => {
    const [k1, k2] = await uebbareKonzepte();
    if (!k1 || !k2) throw new Error('Seed enthält zu wenige übbare Konzepte');
    await prisma.conceptMastery.createMany({
      data: [
        faellig(anna, k1, new Date(Date.now() - TAG)),
        faellig(bert, k2, new Date(Date.now() - TAG)),
      ],
    });

    process.env.PLATFORM_HUB_ORIGIN = HUB;
    const { GET } = await import('@/app/api/platform/review-source/route');
    const anfrage = (query = '') =>
      new Request(`http://localhost/api/platform/review-source${query}`, {
        headers: { origin: HUB },
      });

    SESSION_USER.id = null;
    expect((await GET(anfrage())).status).toBe(401);

    SESSION_USER.id = anna;
    const eigene = await GET(anfrage('?limit=5'));
    expect(eigene.status).toBe(200);
    expect(eigene.headers.get('cache-control')).toContain('no-store');
    expect(eigene.headers.get('access-control-allow-origin')).toBe(HUB);
    const body = (await eigene.json()) as {
      items: Array<{ sourceItemId: string; sourceKind: string }>;
    };
    expect(body.items.map((item) => item.sourceItemId)).toEqual([k1]);
    expect(body.items[0]?.sourceKind).toBe('concept');

    for (const query of [`?userId=${bert}`, `?limit=5&userId=${bert}`]) {
      const fremd = await GET(anfrage(query));
      expect(fremd.status).toBe(400);
      expect(await fremd.text()).not.toContain(k2);
    }
  });
});
