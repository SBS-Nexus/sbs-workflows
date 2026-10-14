import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { ausDatenmodellArt } from '@/domain/aufgabe/art';
import { istBeurteilbar } from '@/domain/aufgabe/abschluss';
import { bewerteKonzept, type AufgabenErgebnis } from '@/domain/aufgabe/kompetenz';
import type { Versuchsergebnis } from '@/domain/aufgabe/auswahl';
import { readPlatformProgressSource } from '@/server/services/platform-progress-source';
import { readPlatformReviewSource } from '@/server/services/platform-review-source';

/**
 * LP-07 — SQLPfad als schreibgeschützte Fortschrittsquelle, gegen echte Zeilen.
 *
 * Der Kern: SQLPfad hat kein Kompetenzprozentmodell. „Beobachtet" und
 * „bereit" kommen aus derselben Ableitung wie die Wissenslandkarte
 * (`bewerteKonzept` über die letzten eigenen Ergebnisse), nie aus
 * `ConceptMastery.masteryScore`. Projekte heißen „abgegeben", nicht
 * „abgenommen". Es wird nichts geschrieben.
 */

const SESSION_USER = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/server/auth/session', () => ({
  getCurrentUser: async () => (SESSION_USER.id ? { id: SESSION_USER.id } : null),
}));

const PRAEFIX = 'lp07-sql-progress-source';
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
  await prisma.project.updateMany({ data: { status: 'PUBLISHED' } });
}

/** Konzepte mit ihren veröffentlichten, beurteilbaren Aufgaben (Kennungen). */
async function beurteilbareKonzepte(): Promise<Array<{ id: string; aufgaben: string[] }>> {
  const konzepte = await prisma.concept.findMany({
    orderBy: { slug: 'asc' },
    select: {
      id: true,
      exercises: { select: { exercise: { select: { id: true, type: true, status: true } } } },
    },
  });
  return konzepte
    .map((k) => ({
      id: k.id,
      aufgaben: k.exercises
        .map((b) => b.exercise)
        .filter((e) => {
          const art = ausDatenmodellArt(e.type);
          return e.status === 'PUBLISHED' && art !== null && istBeurteilbar(art);
        })
        .map((e) => e.id)
        .sort(),
    }))
    .filter((k) => k.aufgaben.length > 0);
}

/**
 * Die Wissenslandkarte von `/fortschritt`, unabhängig nachgerechnet: dieselbe
 * Abfrage, dieselbe Filterung, dieselbe Bewertung.
 */
async function wissenslandkarte(userId: string) {
  const konzepte = await prisma.concept.findMany({
    select: {
      exercises: {
        select: {
          exercise: {
            select: {
              type: true,
              status: true,
              attempts: {
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { result: true },
              },
            },
          },
        },
      },
    },
  });
  return konzepte.map((konzept) => {
    const ergebnisse: AufgabenErgebnis[] = [];
    for (const bezug of konzept.exercises) {
      if (bezug.exercise.status !== 'PUBLISHED') continue;
      const art = ausDatenmodellArt(bezug.exercise.type);
      if (!art) continue;
      ergebnisse.push({
        art,
        letztesErgebnis: bezug.exercise.attempts[0]?.result as Versuchsergebnis | undefined,
      });
    }
    return bewerteKonzept(ergebnisse).stand;
  });
}

function versuch(userId: string, exerciseId: string, result: Versuchsergebnis, createdAt: Date) {
  return { userId, exerciseId, result, submittedSql: 'SELECT 1', createdAt };
}

describe('SQLPfad-Fortschrittsquelle (LP-07, echte Datenbank)', () => {
  let anna: string;
  let bert: string;

  beforeEach(async () => {
    await aufraeumen();
    anna = await nutzer('anna');
    bert = await nutzer('bert');
    SESSION_USER.id = null;
  });

  afterEach(aufraeumen);

  it('ohne eigene Aktivität: ehrliche Nullen, kein Zeitpunkt, Projekte als „abgegeben"', async () => {
    const stand = await readPlatformProgressSource(anna, { now: NOW });
    expect(stand).toEqual({
      schemaVersion: 1,
      source: 'sql',
      generatedAt: NOW.toISOString(),
      participation: { hasActivity: false },
      lessons: {
        completed: 0,
        total: await prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
      },
      reviews: { due: 0 },
      concepts: { observed: 0, ready: 0, criterion: 'all-assessable-tasks-last-passed' },
      activity: { lastActiveAt: null },
      projects: {
        kind: 'submitted',
        done: 0,
        total: await prisma.project.count({ where: { status: 'PUBLISHED' } }),
      },
    });
  });

  it('Konzepte wie die Wissenslandkarte: beobachtet = bearbeitet, bereit = nur „sitzt"; masteryScore zählt nie', async () => {
    const konzepte = await beurteilbareKonzepte();
    const [sitzt, wackelig, gezeigt, nurScore] = konzepte;
    if (!sitzt || !wackelig || !gezeigt || !nurScore)
      throw new Error('Seed enthält zu wenige beurteilbare Konzepte');

    // „sitzt": jede beurteilbare Aufgabe zuletzt gelöst — ein früherer Fehlversuch zählt nicht mehr.
    await prisma.attempt.createMany({
      data: [
        ...sitzt.aufgaben.map((id) =>
          versuch(anna, id, 'FAILED', new Date(NOW.getTime() - 2 * TAG)),
        ),
        ...sitzt.aufgaben.map((id) => versuch(anna, id, 'PASSED', new Date(NOW.getTime() - TAG))),
        // „wackelig": zuletzt nicht gelöst.
        versuch(anna, wackelig.aufgaben[0]!, 'FAILED', new Date(NOW.getTime() - TAG)),
        // Angesehene Lösung ist bearbeitet, aber nicht gelöst.
        versuch(anna, gezeigt.aufgaben[0]!, 'SOLUTION_REVEALED', new Date(NOW.getTime() - TAG)),
        // Bert: darf Annas Stand nie verändern.
        ...nurScore.aufgaben.map((id) => versuch(bert, id, 'PASSED', NOW)),
      ],
    });
    // Ein hoher Planungswert ohne Bearbeitung ist KEIN Beleg.
    await prisma.conceptMastery.create({
      data: { userId: anna, conceptId: nurScore.id, masteryScore: 100, stability: 30 },
    });

    const stand = await readPlatformProgressSource(anna, { now: NOW });
    const karte = await wissenslandkarte(anna);
    const erwartetBeobachtet = karte.filter(
      (s) => s === 'angefangen' || s === 'wackelig' || s === 'sitzt',
    ).length;
    const erwartetBereit = karte.filter((s) => s === 'sitzt').length;
    expect(stand.concepts).toEqual({
      observed: erwartetBeobachtet,
      ready: erwartetBereit,
      criterion: 'all-assessable-tasks-last-passed',
    });
    // Mindestens das „sitzt"-Konzept ist bereit; das nur geplante nicht beobachtet.
    expect(stand.concepts.ready).toBeGreaterThanOrEqual(1);
    expect(stand.concepts.observed).toBeGreaterThanOrEqual(3);
    expect(stand.concepts.ready).toBeLessThan(stand.concepts.observed);

    const nurBert = await readPlatformProgressSource(bert, { now: NOW });
    const karteBert = await wissenslandkarte(bert);
    expect(nurBert.concepts.ready).toBe(karteBert.filter((s) => s === 'sitzt').length);

    expect(JSON.stringify(stand)).not.toMatch(/masteryScore|"score"|stability/);
  });

  it('zählt nur eigene Lektionen, fällige übbare Konzepte, abgegebene Projekte und die letzte Aktivität', async () => {
    const lektionen = await prisma.lesson.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { slug: 'asc' },
      take: 3,
    });
    const [l1, l2, l3] = lektionen;
    const projekte = await prisma.project.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { slug: 'asc' },
      take: 2,
    });
    const uebbar = await prisma.exerciseConcept.findMany({
      where: { exercise: { status: 'PUBLISHED', lesson: { status: 'PUBLISHED' } } },
      select: { conceptId: true },
      orderBy: { conceptId: 'asc' },
    });
    const [k1, k2, k3] = [...new Set(uebbar.map((z) => z.conceptId))];
    if (!l1 || !l2 || !l3 || projekte.length < 2 || !k1 || !k2 || !k3)
      throw new Error('Seed enthält zu wenige Inhalte');

    await prisma.lessonProgress.createMany({
      data: [
        {
          userId: anna,
          lessonId: l1.id,
          state: 'COMPLETED',
          completedAt: new Date(NOW.getTime() - 3 * TAG),
        },
        { userId: anna, lessonId: l2.id, state: 'IN_PROGRESS', startedAt: NOW },
        { userId: bert, lessonId: l3.id, state: 'COMPLETED', completedAt: NOW },
      ],
    });
    await prisma.conceptMastery.createMany({
      data: [
        {
          userId: anna,
          conceptId: k1,
          nextReviewAt: new Date(NOW.getTime() - TAG),
          repetitions: 1,
        },
        {
          userId: anna,
          conceptId: k2,
          nextReviewAt: new Date(NOW.getTime() - 2 * TAG),
          repetitions: 1,
        },
        {
          userId: anna,
          conceptId: k3,
          nextReviewAt: new Date(NOW.getTime() + TAG),
          repetitions: 1,
        },
        {
          userId: bert,
          conceptId: k3,
          nextReviewAt: new Date(NOW.getTime() - TAG),
          repetitions: 1,
        },
      ],
    });
    const [p1, p2] = projekte;
    await prisma.projectSubmission.createMany({
      data: [
        { userId: anna, projectId: p1!.id, sql: 'SELECT 1', status: 'SUBMITTED', submittedAt: NOW },
        // Gesichert, nicht abgegeben.
        { userId: anna, projectId: p2!.id, sql: 'SELECT 2', status: 'IN_PROGRESS' },
        { userId: bert, projectId: p2!.id, sql: 'SELECT 3', status: 'SUBMITTED', submittedAt: NOW },
      ],
    });
    const spaetester = new Date(NOW.getTime() - 15 * 60 * 1000);
    await prisma.learningSession.create({
      data: { userId: anna, startedAt: new Date(NOW.getTime() - TAG), lastActiveAt: spaetester },
    });
    await prisma.learningSession.create({
      data: { userId: bert, startedAt: NOW, lastActiveAt: NOW },
    });

    const stand = await readPlatformProgressSource(anna, { now: NOW });
    expect(stand.participation).toEqual({ hasActivity: true });
    expect(stand.lessons).toEqual({
      completed: 1,
      total: await prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
    });
    expect(stand.reviews).toEqual({ due: 2 });
    expect(stand.projects).toEqual({
      kind: 'submitted',
      done: 1,
      total: await prisma.project.count({ where: { status: 'PUBLISHED' } }),
    });
    expect(stand.activity).toEqual({ lastActiveAt: spaetester.toISOString() });

    // Dieselbe Wahrheit wie die Wiederholungsquelle (LP-05B).
    const wiederholung = await readPlatformReviewSource(anna, { limit: 25, now: NOW });
    expect(stand.reviews.due).toBe(wiederholung.items.length);

    // Zurückgezogene Lektion und zurückgezogenes Projekt fallen aus Zähler und Nenner.
    const lektionenVorher = stand.lessons.total;
    const projekteVorher = stand.projects.kind === 'submitted' ? stand.projects.total : -1;
    await prisma.lesson.update({ where: { id: l1.id }, data: { status: 'DRAFT' } });
    await prisma.project.update({ where: { id: p1!.id }, data: { status: 'DRAFT' } });
    const nachher = await readPlatformProgressSource(anna, { now: NOW });
    expect(nachher.lessons).toEqual({ completed: 0, total: lektionenVorher - 1 });
    expect(nachher.projects).toEqual({ kind: 'submitted', done: 0, total: projekteVorher - 1 });

    const text = JSON.stringify(stand);
    for (const verboten of [anna, bert, k1, p1!.id, l1.id, 'SELECT']) {
      expect(text).not.toContain(verboten);
    }
  });

  it('schreibt nichts', async () => {
    const [k] = await beurteilbareKonzepte();
    if (!k) throw new Error('Seed enthält zu wenige Konzepte');
    await prisma.attempt.create({ data: versuch(anna, k.aufgaben[0]!, 'PASSED', NOW) });
    await prisma.conceptMastery.create({
      data: { userId: anna, conceptId: k.id, nextReviewAt: NOW },
    });
    await prisma.learningSession.create({ data: { userId: anna, lastActiveAt: NOW } });

    const momentaufnahme = async () => ({
      mastery: await prisma.conceptMastery.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      sessions: await prisma.learningSession.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      progress: await prisma.lessonProgress.findMany({
        where: { userId: anna },
        orderBy: { id: 'asc' },
      }),
      attempts: await prisma.attempt.count({ where: { userId: anna } }),
      queue: await prisma.reviewQueueItem.count(),
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
    expect(body.source).toBe('sql');
    expect(body.projects.kind).toBe('submitted');

    for (const query of [`?userId=${bert}`, '?limit=5', '?source=python']) {
      const fremd = await GET(anfrage(query));
      expect(fremd.status).toBe(400);
      expect(await fremd.text()).toBe(JSON.stringify({ error: 'invalid_request' }));
    }

    const fremdeHerkunft = await GET(anfrage('', 'https://evil.example'));
    expect(fremdeHerkunft.headers.get('access-control-allow-origin')).toBeNull();
  });
});
