import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { veroeffentlichteAufgabe } from '@/server/content/publication';
import { readPlatformReviewSource } from '@/server/services/platform-review-source';

/**
 * LP-05B — AIPfad als schreibgeschützte Wiederholungsquelle, gegen echte Zeilen.
 *
 * Geprüft wird der Leser selbst und die Route mit echter Datenbank: nur die
 * eigenen Zeilen, nur fällige und offene, nur veröffentlichte Inhalte,
 * deterministische Reihenfolge, harte Obergrenze — und dass nichts
 * geschrieben wird.
 */

const SESSION_USER = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/server/auth/session', () => ({
  getCurrentUser: async () => (SESSION_USER.id ? { id: SESSION_USER.id } : null),
}));

const PRAEFIX = 'lp05b-review-source';
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
  await prisma.lesson.updateMany({ data: { status: 'PUBLISHED' } });
  await prisma.courseModule.updateMany({ data: { status: 'PUBLISHED' } });
  await prisma.course.updateMany({ data: { status: 'PUBLISHED' } });
}

async function fuenfVeroeffentlichteAufgaben() {
  return prisma.exercise.findMany({
    where: veroeffentlichteAufgabe,
    orderBy: { slug: 'asc' },
    take: 5,
    select: { id: true, slug: true, lessonId: true, solutionNotes: true },
  });
}

describe('AIPfad-Wiederholungsquelle (LP-05B, echte Datenbank)', () => {
  let anna: string;
  let bert: string;

  beforeEach(async () => {
    await aufraeumen();
    anna = await nutzer('anna');
    bert = await nutzer('bert');
    SESSION_USER.id = null;
  });

  afterEach(aufraeumen);

  it('liefert nur die eigenen, fälligen, offenen Zeilen — älteste zuerst', async () => {
    const [a, b, c, d] = await fuenfVeroeffentlichteAufgaben();
    if (!a || !b || !c || !d) throw new Error('Seed enthält zu wenige Aufgaben');

    await prisma.reviewQueueItem.createMany({
      data: [
        { userId: anna, exerciseId: a.id, dueAt: new Date(NOW.getTime() - 2 * TAG), repetition: 2 },
        { userId: anna, exerciseId: b.id, dueAt: new Date(NOW.getTime() - 5 * TAG) },
        // Zukunft: nicht fällig.
        { userId: anna, exerciseId: c.id, dueAt: new Date(NOW.getTime() + 3 * TAG) },
        // Abgeschlossen: nicht mehr offen.
        {
          userId: anna,
          exerciseId: d.id,
          dueAt: new Date(NOW.getTime() - 1 * TAG),
          completedAt: NOW,
        },
        // Fremde Zeile, gleiche Aufgabe, fällig.
        { userId: bert, exerciseId: a.id, dueAt: new Date(NOW.getTime() - 9 * TAG) },
      ],
    });

    const batch = await readPlatformReviewSource(anna, { limit: 10, now: NOW });

    expect(batch.source).toBe('ai');
    expect(batch.items.map((item) => item.sourceItemId)).toEqual([b.id, a.id]);
    expect(batch.items.every((item) => item.sourceKind === 'exercise')).toBe(true);
    expect(batch.items[1]?.repetition).toBe(2);
    expect(batch.truncated).toBe(false);
    expect(batch.nextDueAt).toBe(new Date(NOW.getTime() + 3 * TAG).toISOString());
    expect(batch.generatedAt).toBe(NOW.toISOString());

    // Bert sieht nur seine eigene Zeile.
    const fremd = await readPlatformReviewSource(bert, { limit: 10, now: NOW });
    expect(fremd.items.map((item) => item.sourceItemId)).toEqual([a.id]);
  });

  it('schließt Aufgaben aus, deren Kette nicht veröffentlicht ist', async () => {
    const [a, b, c] = await fuenfVeroeffentlichteAufgaben();
    if (!a || !b || !c) throw new Error('Seed enthält zu wenige Aufgaben');
    for (const exercise of [a, b, c]) {
      await prisma.reviewQueueItem.create({
        data: { userId: anna, exerciseId: exercise.id, dueAt: new Date(NOW.getTime() - TAG) },
      });
    }

    // Aufgabe selbst zurückgezogen.
    await prisma.exercise.update({ where: { id: a.id }, data: { status: 'DRAFT' } });
    // Lektion bzw. Modul zurückgezogen (falls die Aufgabe eine Lektion hat).
    if (b.lessonId) {
      await prisma.lesson.update({ where: { id: b.lessonId }, data: { status: 'ARCHIVED' } });
    } else {
      await prisma.exercise.update({ where: { id: b.id }, data: { status: 'ARCHIVED' } });
    }

    const batch = await readPlatformReviewSource(anna, { limit: 10, now: NOW });
    const ids = batch.items.map((item) => item.sourceItemId);
    expect(ids).not.toContain(a.id);
    expect(ids).not.toContain(b.id);

    // Ein zurückgezogenes Modul nimmt seine Aufgaben mit.
    await prisma.courseModule.updateMany({ data: { status: 'DRAFT' } });
    const nachModul = await readPlatformReviewSource(anna, { limit: 10, now: NOW });
    expect(nachModul.items.filter((item) => item.sourceItemId === c.id)).toHaveLength(
      c.lessonId ? 0 : 1,
    );
  });

  it('hält die Obergrenze ein, meldet Kürzung und sortiert stabil', async () => {
    const aufgaben = await fuenfVeroeffentlichteAufgaben();
    expect(aufgaben).toHaveLength(5);
    const gleich = new Date(NOW.getTime() - TAG);
    await prisma.reviewQueueItem.createMany({
      data: aufgaben.map((exercise) => ({ userId: anna, exerciseId: exercise.id, dueAt: gleich })),
    });

    const erste = await readPlatformReviewSource(anna, { limit: 3, now: NOW });
    expect(erste.items).toHaveLength(3);
    expect(erste.truncated).toBe(true);

    // Gleiche Fälligkeit: stabil nach Aufgabenkennung, bei jedem Aufruf gleich.
    const sortiert = aufgaben.map((exercise) => exercise.id).sort();
    expect(erste.items.map((item) => item.sourceItemId)).toEqual(sortiert.slice(0, 3));
    const zweite = await readPlatformReviewSource(anna, { limit: 3, now: NOW });
    expect(zweite).toEqual(erste);

    const alle = await readPlatformReviewSource(anna, { limit: 5, now: NOW });
    expect(alle.truncated).toBe(false);
  });

  it('schreibt nichts und verrät keine Musterlösung', async () => {
    const [a, b] = await fuenfVeroeffentlichteAufgaben();
    if (!a || !b) throw new Error('Seed enthält zu wenige Aufgaben');
    await prisma.reviewQueueItem.createMany({
      data: [
        { userId: anna, exerciseId: a.id, dueAt: new Date(NOW.getTime() - TAG) },
        { userId: anna, exerciseId: b.id, dueAt: new Date(NOW.getTime() - 2 * TAG) },
      ],
    });

    const vorher = await prisma.reviewQueueItem.findMany({
      where: { userId: anna },
      orderBy: { exerciseId: 'asc' },
    });
    const masteryVorher = await prisma.conceptMastery.count({ where: { userId: anna } });
    const attemptsVorher = await prisma.attempt.count({ where: { userId: anna } });

    const batch = await readPlatformReviewSource(anna, { limit: 10, now: NOW });

    expect(
      await prisma.reviewQueueItem.findMany({
        where: { userId: anna },
        orderBy: { exerciseId: 'asc' },
      }),
    ).toEqual(vorher);
    expect(await prisma.conceptMastery.count({ where: { userId: anna } })).toBe(masteryVorher);
    expect(await prisma.attempt.count({ where: { userId: anna } })).toBe(attemptsVorher);

    const text = JSON.stringify(batch);
    for (const exercise of [a, b]) {
      const geheim = exercise.solutionNotes;
      if (geheim && geheim.trim().length > 20) expect(text).not.toContain(geheim.trim());
    }
    for (const item of batch.items) {
      expect(item.answer.length).toBeGreaterThan(0);
      expect(Object.keys(item)).not.toContain('solution');
      expect(Object.keys(item)).not.toContain('solutionNotes');
    }
  });

  it('Route: Umfang allein aus der Sitzung, keine fremde Kennung, nicht teilbar zwischengespeichert', async () => {
    const [a] = await fuenfVeroeffentlichteAufgaben();
    if (!a) throw new Error('Seed enthält zu wenige Aufgaben');
    await prisma.reviewQueueItem.createMany({
      data: [
        { userId: anna, exerciseId: a.id, dueAt: new Date(Date.now() - TAG) },
        { userId: bert, exerciseId: a.id, dueAt: new Date(Date.now() - 2 * TAG) },
      ],
    });

    process.env.PLATFORM_HUB_ORIGIN = HUB;
    const { GET } = await import('@/app/api/platform/review-source/route');
    const anfrage = (query = '', origin = HUB) =>
      new Request(`http://localhost/api/platform/review-source${query}`, {
        headers: origin ? { origin } : {},
      });

    // Ohne Sitzung: 401 — und auch dann CORS für den Hub, damit er es lesen kann.
    SESSION_USER.id = null;
    const ohne = await GET(anfrage());
    expect(ohne.status).toBe(401);
    expect(ohne.headers.get('access-control-allow-origin')).toBe(HUB);

    // Mit Annas Sitzung: Annas Zeile, nie Berts.
    SESSION_USER.id = anna;
    const eigene = await GET(anfrage('?limit=5'));
    expect(eigene.status).toBe(200);
    expect(eigene.headers.get('cache-control')).toContain('no-store');
    expect(eigene.headers.get('cache-control')).toContain('private');
    expect(eigene.headers.get('access-control-allow-credentials')).toBe('true');
    const body = (await eigene.json()) as { items: Array<{ sourceItemId: string }> };
    expect(body.items).toHaveLength(1);

    const bertsZeile = await prisma.reviewQueueItem.findFirstOrThrow({ where: { userId: bert } });

    // Eine mitgeschickte fremde Kennung wählt nichts aus — sie wird abgewiesen.
    for (const query of [`?userId=${bert}`, `?limit=5&userId=${bert}`, `?user=${bert}`]) {
      const fremd = await GET(anfrage(query));
      expect(fremd.status).toBe(400);
      expect(await fremd.text()).not.toContain(bert);
    }

    // Fremde Herkunft: keine CORS-Freigabe.
    const fremdeHerkunft = await GET(anfrage('', 'https://evil.example'));
    expect(fremdeHerkunft.headers.get('access-control-allow-origin')).toBeNull();

    // Berts Zeile ist unverändert, Anna hat nichts geschrieben.
    expect(await prisma.reviewQueueItem.findFirstOrThrow({ where: { userId: bert } })).toEqual(
      bertsZeile,
    );
  });
});
