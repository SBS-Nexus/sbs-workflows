import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { readPlatformProgressSource } from '@/server/services/platform-progress-source';
import { readPlatformReviewSource } from '@/server/services/platform-review-source';

/**
 * LP-07 — PythonPfad als schreibgeschützte Fortschrittsquelle, gegen echte Zeilen.
 *
 * Geprüft werden der Leser und die Route mit echter Datenbank: nur die
 * eigenen Zeilen, nur veröffentlichte Inhalte, Zähler und Nenner desselben
 * Bestands, Wiederholungen wie die Wiederholungsquelle, Konzepte über die
 * Voraussetzungsschwelle ohne Rohwert, Projekte als „abgenommen" — und dass
 * nichts geschrieben wird.
 */

const SESSION_USER = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/server/auth/session', () => ({
  getCurrentUser: async () => (SESSION_USER.id ? { id: SESSION_USER.id } : null),
}));

const PRAEFIX = 'lp07-progress-source';
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
  await prisma.project.updateMany({ data: { status: 'PUBLISHED' } });
}

/** Unabhängig gezählt: Lektion, Modul und Kurs veröffentlicht. */
async function veroeffentlichteLektionen() {
  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      status: true,
      module: { select: { id: true, status: true, course: { select: { status: true } } } },
      exercises: { where: { status: 'PUBLISHED' }, select: { id: true }, orderBy: { slug: 'asc' } },
    },
    orderBy: { slug: 'asc' },
  });
  return lessons.filter(
    (l) =>
      l.status === 'PUBLISHED' &&
      l.module.status === 'PUBLISHED' &&
      l.module.course.status === 'PUBLISHED',
  );
}

describe('PythonPfad-Fortschrittsquelle (LP-07, echte Datenbank)', () => {
  let anna: string;
  let bert: string;

  beforeEach(async () => {
    await aufraeumen();
    anna = await nutzer('anna');
    bert = await nutzer('bert');
    SESSION_USER.id = null;
  });

  afterEach(aufraeumen);

  it('ohne eigene Aktivität: ehrliche Nullen, kein Zeitpunkt, Nenner aus veröffentlichten Inhalten', async () => {
    const lektionen = await veroeffentlichteLektionen();
    const projekte = await prisma.project.count({ where: { status: 'PUBLISHED' } });
    expect(lektionen.length).toBeGreaterThan(0);

    const stand = await readPlatformProgressSource(anna, { now: NOW });
    expect(stand).toEqual({
      schemaVersion: 1,
      source: 'python',
      generatedAt: NOW.toISOString(),
      participation: { hasActivity: false },
      lessons: { completed: 0, total: lektionen.length },
      reviews: { due: 0 },
      concepts: { observed: 0, ready: 0, criterion: 'prerequisite-ready' },
      activity: { lastActiveAt: null },
      projects: { kind: 'accepted', done: 0, total: projekte },
    });
  });

  it('zählt nur eigene Belege — Lektionen, Wiederholungen, Konzepte, Projekte, letzte Aktivität', async () => {
    const lektionen = await veroeffentlichteLektionen();
    const [l1, l2, l3] = lektionen;
    const aufgaben = lektionen.flatMap((l) => l.exercises.map((e) => e.id));
    const [a1, a2, a3, a4] = aufgaben;
    const konzepte = await prisma.concept.findMany({ orderBy: { slug: 'asc' }, take: 4 });
    const projekte = await prisma.project.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { slug: 'asc' },
      take: 2,
    });
    if (
      !l1 ||
      !l2 ||
      !l3 ||
      !a1 ||
      !a2 ||
      !a3 ||
      !a4 ||
      konzepte.length < 4 ||
      projekte.length < 2
    ) {
      throw new Error('Seed enthält zu wenige Inhalte');
    }

    await prisma.lessonProgress.createMany({
      data: [
        {
          userId: anna,
          lessonId: l1.id,
          state: 'COMPLETED',
          completedAt: new Date(NOW.getTime() - 3 * TAG),
        },
        {
          userId: anna,
          lessonId: l2.id,
          state: 'COMPLETED',
          completedAt: new Date(NOW.getTime() - 2 * TAG),
        },
        { userId: anna, lessonId: l3.id, state: 'IN_PROGRESS' },
        // Bert: darf Annas Zahlen nie verändern.
        { userId: bert, lessonId: l3.id, state: 'COMPLETED', completedAt: NOW },
      ],
    });
    await prisma.reviewQueueItem.createMany({
      data: [
        { userId: anna, exerciseId: a1, dueAt: new Date(NOW.getTime() - TAG) },
        { userId: anna, exerciseId: a2, dueAt: new Date(NOW.getTime() - 4 * TAG) },
        { userId: anna, exerciseId: a3, dueAt: new Date(NOW.getTime() + TAG) },
        { userId: anna, exerciseId: a4, dueAt: new Date(NOW.getTime() - TAG), completedAt: NOW },
        { userId: bert, exerciseId: a3, dueAt: new Date(NOW.getTime() - TAG) },
      ],
    });
    const [k1, k2, k3, k4] = konzepte;
    await prisma.conceptMastery.createMany({
      data: [
        // Genau an der Voraussetzungsschwelle (70) ist bereit, knapp darunter nicht.
        { userId: anna, conceptId: k1!.id, masteryScore: 70 },
        { userId: anna, conceptId: k2!.id, masteryScore: 69.9 },
        { userId: anna, conceptId: k3!.id, masteryScore: 95 },
        { userId: bert, conceptId: k4!.id, masteryScore: 99 },
      ],
    });
    const [p1, p2] = projekte;
    await prisma.projectSubmission.createMany({
      data: [
        { userId: anna, projectId: p1!.id, status: 'ACCEPTED' },
        // Abgegeben, aber nicht abgenommen: zählt bei PythonPfad nicht.
        { userId: anna, projectId: p2!.id, status: 'SUBMITTED' },
        { userId: bert, projectId: p2!.id, status: 'ACCEPTED' },
      ],
    });
    const spaetester = new Date(NOW.getTime() - 30 * 60 * 1000);
    await prisma.attempt.create({
      data: {
        userId: anna,
        exerciseId: a1,
        submittedCode: 'print(1)',
        result: 'PASSED',
        createdAt: new Date(NOW.getTime() - 5 * TAG),
      },
    });
    await prisma.learningSession.create({
      data: { userId: anna, startedAt: new Date(NOW.getTime() - TAG), lastActivityAt: spaetester },
    });
    await prisma.learningSession.create({
      data: { userId: bert, startedAt: NOW, lastActivityAt: NOW },
    });

    const stand = await readPlatformProgressSource(anna, { now: NOW });
    expect(stand.participation).toEqual({ hasActivity: true });
    expect(stand.lessons).toEqual({ completed: 2, total: lektionen.length });
    expect(stand.reviews).toEqual({ due: 2 });
    expect(stand.concepts).toEqual({ observed: 3, ready: 2, criterion: 'prerequisite-ready' });
    expect(stand.projects).toEqual({
      kind: 'accepted',
      done: 1,
      total: await prisma.project.count({ where: { status: 'PUBLISHED' } }),
    });
    expect(stand.activity).toEqual({ lastActiveAt: spaetester.toISOString() });

    // Dieselbe Wahrheit wie die Wiederholungsquelle (LP-05B).
    const wiederholung = await readPlatformReviewSource(anna, { limit: 25, now: NOW });
    expect(stand.reviews.due).toBe(wiederholung.items.length);

    // Kein Rohwert, keine Kennung im Ergebnis.
    const text = JSON.stringify(stand);
    for (const verboten of [anna, bert, '69.9', '95', k1!.id, p1!.id, l1.id]) {
      expect(text).not.toContain(verboten);
    }
  });

  it('Zähler und Nenner folgen derselben Veröffentlichung; Zurückgezogenes zählt nicht', async () => {
    const lektionen = await veroeffentlichteLektionen();
    const [l1, l2] = lektionen;
    const a1 = l1?.exercises[0]?.id;
    const projekt = await prisma.project.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { slug: 'asc' },
    });
    if (!l1 || !l2 || !a1 || !projekt) throw new Error('Seed enthält zu wenige Inhalte');

    await prisma.lessonProgress.createMany({
      data: [
        { userId: anna, lessonId: l1.id, state: 'COMPLETED', completedAt: NOW },
        { userId: anna, lessonId: l2.id, state: 'COMPLETED', completedAt: NOW },
      ],
    });
    await prisma.reviewQueueItem.create({
      data: { userId: anna, exerciseId: a1, dueAt: new Date(NOW.getTime() - TAG) },
    });
    await prisma.projectSubmission.create({
      data: { userId: anna, projectId: projekt.id, status: 'ACCEPTED' },
    });
    const projekteVorher = await prisma.project.count({ where: { status: 'PUBLISHED' } });

    // Das Modul von l1 wird zurückgezogen: l1 verschwindet aus Zähler UND Nenner,
    // seine Aufgabe aus den fälligen Wiederholungen.
    await prisma.courseModule.update({ where: { id: l1.module.id }, data: { status: 'DRAFT' } });
    await prisma.project.update({ where: { id: projekt.id }, data: { status: 'DRAFT' } });
    const nachher = await veroeffentlichteLektionen();

    const stand = await readPlatformProgressSource(anna, { now: NOW });
    expect(stand.lessons.total).toBe(nachher.length);
    expect(stand.lessons.total).toBeLessThan(lektionen.length);
    expect(stand.lessons.completed).toBe(nachher.some((l) => l.id === l2.id) ? 1 : 0);
    expect(stand.lessons.completed).toBeLessThanOrEqual(stand.lessons.total);
    expect(stand.reviews.due).toBe(0);
    expect(stand.projects).toEqual({ kind: 'accepted', done: 0, total: projekteVorher - 1 });
  });

  it('schreibt nichts', async () => {
    const [l1] = await veroeffentlichteLektionen();
    const a1 = l1?.exercises[0]?.id;
    if (!l1 || !a1) throw new Error('Seed enthält zu wenige Inhalte');
    await prisma.lessonProgress.create({
      data: { userId: anna, lessonId: l1.id, state: 'IN_PROGRESS' },
    });
    await prisma.reviewQueueItem.create({ data: { userId: anna, exerciseId: a1, dueAt: NOW } });
    await prisma.learningSession.create({ data: { userId: anna, lastActivityAt: NOW } });

    const momentaufnahme = async () => ({
      progress: await prisma.lessonProgress.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      reviews: await prisma.reviewQueueItem.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      sessions: await prisma.learningSession.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      mastery: await prisma.conceptMastery.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      attempts: await prisma.attempt.count({ where: { userId: anna } }),
      submissions: await prisma.projectSubmission.count({ where: { userId: anna } }),
      events: await prisma.analyticsEvent.count(),
    });
    const vorher = await momentaufnahme();
    await readPlatformProgressSource(anna, { now: NOW });
    expect(await momentaufnahme()).toEqual(vorher);
  });

  it('Route: Umfang allein aus der Sitzung, keine Parameter, nicht teilbar zwischengespeichert', async () => {
    const [l1] = await veroeffentlichteLektionen();
    if (!l1) throw new Error('Seed enthält zu wenige Inhalte');
    await prisma.lessonProgress.create({
      data: { userId: bert, lessonId: l1.id, state: 'COMPLETED', completedAt: NOW },
    });

    process.env.PLATFORM_HUB_ORIGIN = HUB;
    const { GET } = await import('@/app/api/platform/progress-source/route');
    const anfrage = (query = '', origin = HUB) =>
      new Request(`http://localhost/api/platform/progress-source${query}`, {
        headers: origin ? { origin } : {},
      });

    SESSION_USER.id = null;
    const ohne = await GET(anfrage());
    expect(ohne.status).toBe(401);
    expect(await ohne.json()).toEqual({ error: 'unauthenticated' });
    expect(ohne.headers.get('access-control-allow-origin')).toBe(HUB);

    SESSION_USER.id = anna;
    const eigene = await GET(anfrage());
    expect(eigene.status).toBe(200);
    expect(eigene.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(eigene.headers.get('vary')).toBe('Origin, Cookie');
    expect(eigene.headers.get('access-control-allow-origin')).toBe(HUB);
    expect(eigene.headers.get('access-control-allow-credentials')).toBe('true');
    const body = (await eigene.json()) as { source: string; lessons: { completed: number } };
    expect(body.source).toBe('python');
    // Berts Abschluss erscheint nie bei Anna.
    expect(body.lessons.completed).toBe(0);

    for (const query of [`?userId=${bert}`, `?user=${bert}`, '?limit=10']) {
      const fremd = await GET(anfrage(query));
      expect(fremd.status).toBe(400);
      expect(await fremd.text()).toBe(JSON.stringify({ error: 'invalid_request' }));
    }

    const fremdeHerkunft = await GET(anfrage('', 'https://evil.example'));
    expect(fremdeHerkunft.headers.get('access-control-allow-origin')).toBeNull();
  });
});
