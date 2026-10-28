import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { veroeffentlichteAufgabe, veroeffentlichteLektion } from '@/server/content/publication';
import { readPlatformProgressSource } from '@/server/services/platform-progress-source';
import { readPlatformReviewSource } from '@/server/services/platform-review-source';

/**
 * LP-07 — AIPfad als schreibgeschützte Fortschrittsquelle, gegen echte Zeilen.
 *
 * Geprüft werden der Leser und die Route mit echter Datenbank: dieselben
 * Veröffentlichungsprädikate wie `/fortschritt` der App, Wiederholungen wie die
 * Wiederholungsquelle, Konzepte über die Voraussetzungsschwelle ohne Rohwert,
 * Projekte als „nicht unterstützt" — und dass nichts geschrieben wird.
 */

const SESSION_USER = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/server/auth/session', () => ({
  getCurrentUser: async () => (SESSION_USER.id ? { id: SESSION_USER.id } : null),
}));

const PRAEFIX = 'lp07-ai-progress-source';
const NOW = new Date('2026-10-01T12:00:00.000Z');
const TAG = 24 * 60 * 60 * 1000;
const HUB = 'https://lernpfade.integrationstest.example';

async function nutzer(name: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `${name}-${PRAEFIX}@integrationtest.local`,
      name: 'Fortschrittstest',
      passwordHash: await hashPassword('ein-testpasswort-123'),
    },
  });
  return user.id;
}

async function aufraeumen(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { contains: PRAEFIX } } });
  await prisma.exercise.updateMany({ data: { status: 'PUBLISHED' } });
  await prisma.lesson.updateMany({ data: { status: 'PUBLISHED' } });
  await prisma.courseModule.updateMany({ data: { status: 'PUBLISHED' } });
  await prisma.course.updateMany({ data: { status: 'PUBLISHED' } });
}

describe('AIPfad-Fortschrittsquelle (LP-07, echte Datenbank)', () => {
  let anna: string;
  let bert: string;

  beforeEach(async () => {
    await aufraeumen();
    anna = await nutzer('anna');
    bert = await nutzer('bert');
    SESSION_USER.id = null;
  });

  afterEach(aufraeumen);

  it('ohne eigene Aktivität: ehrliche Nullen, kein Zeitpunkt, Projekte nicht unterstützt', async () => {
    const stand = await readPlatformProgressSource(anna, { now: NOW });
    expect(stand).toEqual({
      schemaVersion: 1,
      source: 'ai',
      generatedAt: NOW.toISOString(),
      participation: { hasActivity: false },
      lessons: {
        completed: 0,
        total: await prisma.lesson.count({ where: veroeffentlichteLektion }),
      },
      reviews: { due: 0 },
      concepts: { observed: 0, ready: 0, criterion: 'prerequisite-ready' },
      activity: { lastActiveAt: null },
      projects: { kind: 'unsupported' },
    });
    expect(stand.lessons.total).toBeGreaterThan(0);
  });

  it('zählt nur eigene Belege — wie /fortschritt der App und die Wiederholungsquelle', async () => {
    const lektionen = await prisma.lesson.findMany({
      where: veroeffentlichteLektion,
      orderBy: { slug: 'asc' },
      take: 3,
    });
    const aufgaben = await prisma.exercise.findMany({
      where: veroeffentlichteAufgabe,
      orderBy: { slug: 'asc' },
      take: 4,
    });
    const konzepte = await prisma.concept.findMany({ orderBy: { slug: 'asc' }, take: 4 });
    const lab = await prisma.lab.findFirst({ orderBy: { slug: 'asc' } });
    const [l1, l2, l3] = lektionen;
    const [a1, a2, a3, a4] = aufgaben;
    const [k1, k2, k3, k4] = konzepte;
    if (!l1 || !l2 || !l3 || !a1 || !a2 || !a3 || !a4 || !k1 || !k2 || !k3 || !k4 || !lab) {
      throw new Error('Seed enthält zu wenige Inhalte');
    }

    await prisma.lessonProgress.createMany({
      data: [
        {
          userId: anna,
          lessonId: l1.id,
          state: 'COMPLETED',
          completedAt: new Date(NOW.getTime() - 4 * TAG),
        },
        { userId: anna, lessonId: l2.id, state: 'IN_PROGRESS' },
        { userId: bert, lessonId: l3.id, state: 'COMPLETED', completedAt: NOW },
      ],
    });
    await prisma.reviewQueueItem.createMany({
      data: [
        { userId: anna, exerciseId: a1.id, dueAt: new Date(NOW.getTime() - TAG) },
        { userId: anna, exerciseId: a2.id, dueAt: new Date(NOW.getTime() + TAG) },
        { userId: anna, exerciseId: a3.id, dueAt: new Date(NOW.getTime() - TAG), completedAt: NOW },
        { userId: bert, exerciseId: a4.id, dueAt: new Date(NOW.getTime() - TAG) },
      ],
    });
    await prisma.conceptMastery.createMany({
      data: [
        { userId: anna, conceptId: k1.id, masteryScore: 70 },
        { userId: anna, conceptId: k2.id, masteryScore: 69.9 },
        { userId: anna, conceptId: k3.id, masteryScore: 12 },
        { userId: bert, conceptId: k4.id, masteryScore: 99 },
      ],
    });
    await prisma.attempt.create({
      data: {
        userId: anna,
        exerciseId: a1.id,
        submittedAnswer: { gewaehlt: ['a'] },
        result: 'PASSED',
        createdAt: new Date(NOW.getTime() - 2 * TAG),
      },
    });
    const spaetester = new Date(NOW.getTime() - 20 * 60 * 1000);
    await prisma.labAttempt.create({
      data: {
        userId: anna,
        labId: lab.id,
        result: {},
        startedAt: new Date(NOW.getTime() - TAG),
        completedAt: spaetester,
      },
    });
    await prisma.labAttempt.create({
      data: { userId: bert, labId: lab.id, result: {}, startedAt: NOW },
    });

    const stand = await readPlatformProgressSource(anna, { now: NOW });
    expect(stand.participation).toEqual({ hasActivity: true });
    expect(stand.lessons).toEqual({
      completed: 1,
      total: await prisma.lesson.count({ where: veroeffentlichteLektion }),
    });
    expect(stand.reviews).toEqual({ due: 1 });
    expect(stand.concepts).toEqual({ observed: 3, ready: 1, criterion: 'prerequisite-ready' });
    expect(stand.projects).toEqual({ kind: 'unsupported' });
    expect(stand.activity).toEqual({ lastActiveAt: spaetester.toISOString() });

    // Dieselbe Zahl wie die Wiederholungsquelle und wie `/fortschritt` der App.
    const wiederholung = await readPlatformReviewSource(anna, { limit: 25, now: NOW });
    expect(stand.reviews.due).toBe(wiederholung.items.length);
    expect(stand.reviews.due).toBe(
      await prisma.reviewQueueItem.count({
        where: {
          userId: anna,
          completedAt: null,
          dueAt: { lte: NOW },
          exercise: veroeffentlichteAufgabe,
        },
      }),
    );

    // Zurückgezogenes Modul: Lektion fällt aus Zähler und Nenner, Aufgabe aus den Wiederholungen.
    const vorher = stand.lessons.total;
    const modul = await prisma.lesson.findUniqueOrThrow({
      where: { id: l1.id },
      select: { moduleId: true },
    });
    await prisma.courseModule.update({ where: { id: modul.moduleId }, data: { status: 'DRAFT' } });
    const nachher = await readPlatformProgressSource(anna, { now: NOW });
    expect(nachher.lessons.completed).toBe(0);
    expect(nachher.lessons.total).toBe(
      await prisma.lesson.count({ where: veroeffentlichteLektion }),
    );
    expect(nachher.lessons.total).toBeLessThan(vorher);

    const text = JSON.stringify(stand);
    for (const verboten of [anna, bert, '69.9', k1.id, l1.id, lab.id]) {
      expect(text).not.toContain(verboten);
    }
  });

  it('schreibt nichts', async () => {
    const [a1] = await prisma.exercise.findMany({ where: veroeffentlichteAufgabe, take: 1 });
    const [k1] = await prisma.concept.findMany({ take: 1 });
    if (!a1 || !k1) throw new Error('Seed enthält zu wenige Inhalte');
    await prisma.reviewQueueItem.create({ data: { userId: anna, exerciseId: a1.id, dueAt: NOW } });
    await prisma.conceptMastery.create({
      data: { userId: anna, conceptId: k1.id, masteryScore: 80 },
    });

    const momentaufnahme = async () => ({
      reviews: await prisma.reviewQueueItem.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      mastery: await prisma.conceptMastery.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      progress: await prisma.lessonProgress.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      attempts: await prisma.attempt.count({ where: { userId: anna } }),
      labs: await prisma.labAttempt.count({ where: { userId: anna } }),
      events: await prisma.analyticsEvent.count(),
    });
    const vorher = await momentaufnahme();
    await readPlatformProgressSource(anna, { now: NOW });
    expect(await momentaufnahme()).toEqual(vorher);
  });

  it('Route: Umfang allein aus der Sitzung, keine Parameter, nicht teilbar zwischengespeichert', async () => {
    process.env.PLATFORM_HUB_ORIGIN = HUB;
    const { GET } = await import('@/app/api/platform/progress-source/route');
    const anfrage = (query = '', origin = HUB) =>
      new Request(`http://localhost/api/platform/progress-source${query}`, {
        headers: origin ? { origin } : {},
      });

    SESSION_USER.id = null;
    const ohne = await GET(anfrage());
    expect(ohne.status).toBe(401);
    expect(ohne.headers.get('access-control-allow-origin')).toBe(HUB);

    SESSION_USER.id = anna;
    const eigene = await GET(anfrage());
    expect(eigene.status).toBe(200);
    expect(eigene.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(eigene.headers.get('vary')).toBe('Origin, Cookie');
    expect(eigene.headers.get('access-control-allow-credentials')).toBe('true');
    const body = (await eigene.json()) as { source: string; projects: { kind: string } };
    expect(body.source).toBe('ai');
    expect(body.projects).toEqual({ kind: 'unsupported' });

    for (const query of [`?userId=${bert}`, '?limit=5', '?x=1']) {
      const fremd = await GET(anfrage(query));
      expect(fremd.status).toBe(400);
      expect(await fremd.text()).toBe(JSON.stringify({ error: 'invalid_request' }));
    }

    const fremdeHerkunft = await GET(anfrage('', 'https://evil.example'));
    expect(fremdeHerkunft.headers.get('access-control-allow-origin')).toBeNull();
  });
});
