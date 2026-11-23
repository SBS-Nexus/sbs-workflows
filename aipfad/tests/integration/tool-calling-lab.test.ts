import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { getLabBySlug, LabNotFoundError, listLabsWithStatus } from '@/server/services/lab-service';
import { recordLabCompletionAction } from '@/server/actions/lab-actions';
import { toolCallingConfigSchema } from '@/domain/labs/tool-calling-config';
import { labs as labDrafts } from '@/content/labs';

/**
 * LP-11B.1: Nachweis auf der isolierten CI-Postgres-Datenbank.
 * Nutzt den bestehenden Seed; keine zweite Lab-Action oder Testumgehung.
 */
const SESSION_USER = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/server/auth/session', () => ({
  requireUser: async () => {
    if (!SESSION_USER.id) throw new Error('Nicht angemeldet.');
    return { id: SESSION_USER.id };
  },
  getCurrentUser: async () => (SESSION_USER.id ? { id: SESSION_USER.id } : null),
}));

const PREFIX = 'lp11b1-tool-contract';
const LAB = 'tool-calling-offline-lab';
const ZEITSTEMPEL = { completedAt: '2026-11-10T10:00:00.000Z' };

async function nutzer(kennung: string): Promise<string> {
  const row = await prisma.user.create({
    data: {
      email: `${kennung}-${PREFIX}@integrationtest.local`,
      name: 'Tool-Lab-Test',
      passwordHash: await hashPassword('integration-test-passwort-123'),
    },
  });
  return row.id;
}

async function aufraeumen(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { contains: PREFIX } } });
}

describe('LP-11B.1: Tool-Calling-Lab (echte Testdatenbank)', () => {
  let anna: string;
  let bert: string;

  beforeEach(async () => {
    SESSION_USER.id = null;
    await aufraeumen();
    anna = await nutzer('anna');
    bert = await nutzer('bert');
  });

  afterAll(aufraeumen);

  it('seedet drei veröffentlichte Lektionen und genau ein gültiges Offline-Lab', async () => {
    const modul = await prisma.courseModule.findUniqueOrThrow({
      where: { slug: 'structured-outputs-tool-calling' },
      include: { lessons: { orderBy: { order: 'asc' }, include: { exercises: true } } },
    });
    const rag = await prisma.courseModule.findUniqueOrThrow({
      where: { slug: 'rag-wissen-mit-quellen' },
    });
    expect(modul.status).toBe('PUBLISHED');
    expect(modul.order).toBe(rag.order + 1);
    expect(modul.lessons).toHaveLength(3);
    expect(modul.lessons.flatMap((l) => l.exercises)).toHaveLength(9);

    const lab = await getLabBySlug(LAB);
    const quelle = labDrafts.find((l) => l.slug === LAB);
    expect(lab.kind).toBe('TOOL_CALLING');
    expect(toolCallingConfigSchema.parse(lab.config)).toEqual(
      toolCallingConfigSchema.parse(quelle?.config),
    );
    expect(await prisma.lab.count({ where: { slug: LAB } })).toBe(1);
    expect(lab.concepts.map((c) => c.slug)).toContain('tool-berechtigung');
  });

  it('speichert den Lab-Abschluss nur für die angemeldete Person', async () => {
    SESSION_USER.id = anna;
    await recordLabCompletionAction(LAB, ZEITSTEMPEL);
    const abschluss = await prisma.labAttempt.findMany({
      where: { lab: { slug: LAB }, userId: { in: [anna, bert] } },
    });
    expect(abschluss.map((a) => a.userId)).toEqual([anna]);
    expect(abschluss[0]?.completed).toBe(true);
    expect(abschluss[0]?.result).toEqual(ZEITSTEMPEL);
    expect((await listLabsWithStatus(anna)).find((l) => l.slug === LAB)?.completed).toBe(true);
    expect((await listLabsWithStatus(bert)).find((l) => l.slug === LAB)?.completed).toBe(false);
  });

  it('übernimmt keine fremde Nutzerkennung aus dem Lab-Ergebnis', async () => {
    SESSION_USER.id = bert;
    await recordLabCompletionAction(LAB, { ...ZEITSTEMPEL, userId: anna });
    const abschluss = await prisma.labAttempt.findMany({
      where: { lab: { slug: LAB }, userId: { in: [anna, bert] } },
    });
    expect(abschluss.map((a) => a.userId)).toEqual([bert]);
    expect(abschluss[0]?.result).toEqual(ZEITSTEMPEL);
  });

  it('fordert eine Sitzung an und erhält andere Lab-Abschlüsse unverändert', async () => {
    await expect(recordLabCompletionAction(LAB, ZEITSTEMPEL)).rejects.toThrow();
    SESSION_USER.id = anna;
    await expect(
      recordLabCompletionAction('tool-calling-offline-lab-unbekannt', ZEITSTEMPEL),
    ).rejects.toBeInstanceOf(LabNotFoundError);
    await recordLabCompletionAction('rag-pipeline-lab', ZEITSTEMPEL);
    const vorher = await prisma.labAttempt.findFirstOrThrow({
      where: { userId: anna, lab: { slug: 'rag-pipeline-lab' } },
    });
    await recordLabCompletionAction(LAB, ZEITSTEMPEL);
    expect(await prisma.labAttempt.findUniqueOrThrow({ where: { id: vorher.id } })).toEqual(vorher);
  });
});
