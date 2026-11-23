import { execSync } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { getLabBySlug, LabNotFoundError, listLabsWithStatus } from '@/server/services/lab-service';
import { submitAttempt } from '@/server/services/exercise-service';
import { recordLabCompletionAction } from '@/server/actions/lab-actions';
import { ragPipelineConfigSchema } from '@/domain/labs/rag-pipeline-config';
import { semanticRetrievalConfigSchema } from '@/domain/labs/semantic-retrieval-config';
import { labs as labDrafts } from '@/content/labs';

/**
 * LP-10B gegen die echte Testdatenbank.
 *
 * Modul, Konzepte und RAG-Lab werden geseedet, der Abschluss läuft über die
 * bestehende Server Action und gehört allein dem angemeldeten Konto.
 * LP-10A und alle älteren Labs bleiben nutzbar. Nur die Sitzung ist ersetzt.
 */

const SESSION_USER = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/server/auth/session', () => ({
  requireUser: async () => {
    if (!SESSION_USER.id) throw new Error('Nicht angemeldet.');
    return { id: SESSION_USER.id };
  },
  getCurrentUser: async () => (SESSION_USER.id ? { id: SESSION_USER.id } : null),
}));

const PRAEFIX = 'lp10b-rag-pipeline';
const LAB = 'rag-pipeline-lab';
const ZEITSTEMPEL = { completedAt: '2026-11-08T12:00:00.000Z' };
const BESTEHENDE_LABS = [
  'terminal-lab',
  'tokenizer-lab',
  'context-window-lab',
  'prompt-repair-lab',
  'git-state-lab',
  'branch-lab',
  'merge-conflict-lab',
  'semantische-suche-lab',
];

async function nutzer(name: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `${name}-${PRAEFIX}@integrationtest.local`,
      name: 'RAG-Test',
      passwordHash: await hashPassword('ein-testpasswort-123'),
    },
  });
  return user.id;
}

async function aufraeumen(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { contains: PRAEFIX } } });
}

describe('LP-10B: RAG – Wissen mit Quellen nutzen (echte Datenbank)', () => {
  let anna: string;
  let bert: string;

  beforeEach(async () => {
    await aufraeumen();
    anna = await nutzer('anna');
    bert = await nutzer('bert');
    SESSION_USER.id = null;
  });

  afterAll(aufraeumen);

  describe('Seed', () => {
    it('legt das Modul mit vier Lektionen und mindestens zwölf Aufgaben hinter Stufe 9 an', async () => {
      const modul = await prisma.courseModule.findUniqueOrThrow({
        where: { slug: 'rag-wissen-mit-quellen' },
        include: { lessons: { orderBy: { order: 'asc' }, include: { exercises: true } } },
      });
      const stufe9 = await prisma.courseModule.findUniqueOrThrow({
        where: { slug: 'embeddings-semantische-suche' },
      });
      expect(modul.status).toBe('PUBLISHED');
      expect(modul.order).toBe(stufe9.order + 1);
      expect(modul.lessons.map((l) => l.slug)).toEqual([
        'von-dokumenten-zu-chunks',
        'retrieval-fuer-rag',
        'kontext-und-belegte-antworten',
        'rag-fehler-erkennen',
      ]);
      expect(modul.lessons.flatMap((l) => l.exercises).length).toBeGreaterThanOrEqual(12);
    });

    it('verknüpft die neuen Konzepte mit Stufe 9', async () => {
      const chunking = await prisma.concept.findUniqueOrThrow({ where: { slug: 'chunking' } });
      const overlap = await prisma.concept.findUniqueOrThrow({
        where: { slug: 'chunk-overlap-und-trennstellen' },
      });
      expect(overlap.prerequisiteIds).toContain(chunking.id);
    });

    it('legt das RAG-Lab mit der neuen Lab-Art und gültiger Konfiguration an', async () => {
      const lab = await getLabBySlug(LAB);
      expect(lab.kind).toBe('RAG_PIPELINE');
      expect(lab.concepts.map((c) => c.slug)).toContain('belegte-antwort');
      const quelle = labDrafts.find((l) => l.slug === LAB);
      expect(ragPipelineConfigSchema.parse(lab.config)).toEqual(
        ragPipelineConfigSchema.parse(quelle?.config),
      );
    });

    it('lässt LP-10A und alle älteren Labs unverändert nutzbar', async () => {
      for (const slug of BESTEHENDE_LABS) {
        await expect(getLabBySlug(slug)).resolves.toMatchObject({ slug, status: 'PUBLISHED' });
      }
      const retrieval = await getLabBySlug('semantische-suche-lab');
      expect(retrieval.kind).toBe('SEMANTIC_RETRIEVAL');
      expect(semanticRetrievalConfigSchema.safeParse(retrieval.config).success).toBe(true);
    });
  });

  it('bewertet eine RAG-Aufgabe über die bestehende Bewertung', async () => {
    const ergebnis = await submitAttempt(anna, {
      exerciseSlug: 'rag-budget-rechnen',
      submission: { kind: 'fillIn', values: { belegt: '38', mit3: '53', frei: '2' } },
      durationMs: 5000,
      isReview: false,
    });
    expect(ergebnis.outcome).toBe('PASSED');
    expect(await prisma.conceptMastery.count({ where: { userId: bert } })).toBe(0);
  });

  describe('Lab-Abschluss', () => {
    it('speichert den Abschluss nur für das angemeldete Konto', async () => {
      SESSION_USER.id = anna;
      await recordLabCompletionAction(LAB, ZEITSTEMPEL);

      const versuche = await prisma.labAttempt.findMany({
        where: { lab: { slug: LAB }, userId: { in: [anna, bert] } },
      });
      expect(versuche.map((v) => [v.userId, v.completed])).toEqual([[anna, true]]);
      expect(versuche[0]?.result).toEqual(ZEITSTEMPEL);

      expect((await listLabsWithStatus(anna)).find((l) => l.slug === LAB)?.completed).toBe(true);
      expect((await listLabsWithStatus(bert)).find((l) => l.slug === LAB)?.completed).toBe(false);
    });

    it('übernimmt keine Nutzerkennung aus dem Ergebnis', async () => {
      SESSION_USER.id = bert;
      await recordLabCompletionAction(LAB, { ...ZEITSTEMPEL, userId: anna });
      const versuche = await prisma.labAttempt.findMany({
        where: { lab: { slug: LAB }, userId: { in: [anna, bert] } },
      });
      expect(versuche.map((v) => v.userId)).toEqual([bert]);
      expect(versuche[0]?.result).toEqual(ZEITSTEMPEL);
    });

    it('verlangt eine Sitzung und einen bekannten Lab-Slug', async () => {
      await expect(recordLabCompletionAction(LAB, ZEITSTEMPEL)).rejects.toThrow();
      SESSION_USER.id = anna;
      await expect(
        recordLabCompletionAction('rag-pipeline-lab-x', ZEITSTEMPEL),
      ).rejects.toBeInstanceOf(LabNotFoundError);
      expect(await prisma.labAttempt.count({ where: { userId: anna } })).toBe(0);
    });

    it('lässt bestehende Abschlüsse, auch aus LP-10A, unverändert', async () => {
      SESSION_USER.id = anna;
      await recordLabCompletionAction('semantische-suche-lab', ZEITSTEMPEL);
      const vorher = await prisma.labAttempt.findFirstOrThrow({
        where: { userId: anna, lab: { slug: 'semantische-suche-lab' } },
      });
      await recordLabCompletionAction(LAB, ZEITSTEMPEL);
      expect(await prisma.labAttempt.findUniqueOrThrow({ where: { id: vorher.id } })).toEqual(
        vorher,
      );
      const status = await listLabsWithStatus(anna);
      expect(status.find((l) => l.slug === 'semantische-suche-lab')?.completed).toBe(true);
      expect(status.find((l) => l.slug === LAB)?.completed).toBe(true);
    });
  });
});

describe('LP-10B: erneutes Seeden erhält Lernverlauf', () => {
  const projectRoot = path.resolve(import.meta.dirname, '..', '..');
  let carla: string;
  let versuchId: string;
  let fortschrittId: string;

  beforeAll(async () => {
    await aufraeumen();
    carla = await nutzer('carla');
    const lab = await getLabBySlug(LAB);
    versuchId = (
      await prisma.labAttempt.create({
        data: {
          userId: carla,
          labId: lab.id,
          result: ZEITSTEMPEL,
          completed: true,
          completedAt: new Date(),
        },
      })
    ).id;
    const lektion = await prisma.lesson.findUniqueOrThrow({
      where: { slug: 'kontext-und-belegte-antworten' },
    });
    fortschrittId = (
      await prisma.lessonProgress.create({
        data: { userId: carla, lessonId: lektion.id, state: 'IN_PROGRESS', lastSection: '4' },
      })
    ).id;

    execSync('npx tsx prisma/seed.ts', {
      cwd: projectRoot,
      env: { ...process.env, SEED_DEMO_USERS: 'false' },
      stdio: 'pipe',
    });
  });

  afterAll(aufraeumen);

  it('behält Lab-Abschluss und Lektionsfortschritt, ohne Lab oder Modul zu verdoppeln', async () => {
    expect((await prisma.labAttempt.findUniqueOrThrow({ where: { id: versuchId } })).userId).toBe(
      carla,
    );
    expect(
      (await prisma.lessonProgress.findUniqueOrThrow({ where: { id: fortschrittId } })).lastSection,
    ).toBe('4');
    expect(await prisma.lab.count({ where: { slug: LAB } })).toBe(1);
    expect(await prisma.courseModule.count({ where: { slug: 'rag-wissen-mit-quellen' } })).toBe(1);
  });
});
