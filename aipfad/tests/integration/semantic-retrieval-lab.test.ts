import { execSync } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { getLabBySlug, LabNotFoundError, listLabsWithStatus } from '@/server/services/lab-service';
import { getPublicExercise, submitAttempt } from '@/server/services/exercise-service';
import { recordLabCompletionAction } from '@/server/actions/lab-actions';
import { semanticRetrievalConfigSchema } from '@/domain/labs/semantic-retrieval-config';
import { labs as labDrafts } from '@/content/labs';

/**
 * LP-10A gegen die echte Testdatenbank.
 *
 * Geprüft wird, dass Modul und Lab nicht nur im Quelltext stehen, sondern
 * geseedet, über die bestehende Server Action abgeschlossen und dem
 * angemeldeten Konto zugeordnet werden — und dass dabei nichts Bestehendes
 * verloren geht.
 *
 * Nur `@/server/auth/session` ist ersetzt: Die Sitzung kommt in einem
 * Integrationstest nicht aus einem Cookie. Action, Dienst, Ratenbegrenzung
 * und Datenbank sind die echten.
 */

const SESSION_USER = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/server/auth/session', () => ({
  requireUser: async () => {
    if (!SESSION_USER.id) throw new Error('Nicht angemeldet.');
    return { id: SESSION_USER.id };
  },
  getCurrentUser: async () => (SESSION_USER.id ? { id: SESSION_USER.id } : null),
}));

const PRAEFIX = 'lp10a-semantische-suche';
const LAB = 'semantische-suche-lab';
const ZEITSTEMPEL = { completedAt: '2026-11-07T12:00:00.000Z' };

async function nutzer(name: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `${name}-${PRAEFIX}@integrationtest.local`,
      name: 'Retrievaltest',
      passwordHash: await hashPassword('ein-testpasswort-123'),
    },
  });
  return user.id;
}

async function aufraeumen(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { contains: PRAEFIX } } });
}

describe('LP-10A: Embeddings & semantische Suche (echte Datenbank)', () => {
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
    it('legt das Modul mit vier veröffentlichten Lektionen am Ende des Kurses an', async () => {
      const modul = await prisma.courseModule.findUniqueOrThrow({
        where: { slug: 'embeddings-semantische-suche' },
        include: { lessons: { orderBy: { order: 'asc' }, include: { exercises: true } } },
      });
      expect(modul.status).toBe('PUBLISHED');
      expect(modul.lessons.map((l) => l.slug)).toEqual([
        'vektoren-und-embeddings',
        'aehnlichkeit-berechnen',
        'semantisches-retrieval',
        'retrieval-beurteilen',
      ]);
      for (const lektion of modul.lessons) {
        expect(lektion.status).toBe('PUBLISHED');
        expect(lektion.exercises.length).toBeGreaterThanOrEqual(3);
      }

      const spaeteste = await prisma.courseModule.findFirstOrThrow({
        where: { courseId: modul.courseId },
        orderBy: { order: 'desc' },
      });
      expect(spaeteste.slug).toBe('embeddings-semantische-suche');
    });

    it('verknüpft die neuen Konzepte mit ihren Voraussetzungen', async () => {
      const embedding = await prisma.concept.findUniqueOrThrow({ where: { slug: 'embedding' } });
      const vektor = await prisma.concept.findUniqueOrThrow({
        where: { slug: 'vektor-und-dimension' },
      });
      expect(vektor.prerequisiteIds).toContain(embedding.id);

      const recall = await prisma.concept.findUniqueOrThrow({
        where: { slug: 'precision-und-recall' },
      });
      const topk = await prisma.concept.findUniqueOrThrow({ where: { slug: 'top-k-retrieval' } });
      expect(recall.prerequisiteIds).toContain(topk.id);
    });

    it('legt das Lab mit der neuen Lab-Art und einer gültigen Konfiguration an', async () => {
      const lab = await getLabBySlug(LAB);
      expect(lab.kind).toBe('SEMANTIC_RETRIEVAL');
      expect(lab.concepts.map((c) => c.slug).sort()).toEqual([
        'kosinus-aehnlichkeit',
        'relevanz-vs-aehnlichkeit',
        'semantische-suche',
        'top-k-retrieval',
      ]);
      // Die JSON-Spalte übersteht den Weg durch PostgreSQL verlustfrei: Was
      // das Lab im Browser parst, ist dieselbe gültige Konfiguration.
      const config = semanticRetrievalConfigSchema.parse(lab.config);
      const quelle = labDrafts.find((l) => l.slug === LAB);
      expect(config).toEqual(semanticRetrievalConfigSchema.parse(quelle?.config));
    });

    it('lässt die Aufgaben des Moduls öffentlich laden, ohne Lösungsdaten', async () => {
      const aufgabe = await getPublicExercise('emb-kosinus-fill-in');
      expect(aufgabe).not.toBeNull();
      const oeffentlich = JSON.stringify(aufgabe);
      expect(oeffentlich).not.toContain('accepted');
      expect(oeffentlich).not.toContain('0,889');
    });
  });

  describe('Aufgaben laufen durch die bestehende Bewertung', () => {
    it('bewertet die Rechenaufgabe und schreibt Kompetenz für die neuen Konzepte fort', async () => {
      const ergebnis = await submitAttempt(anna, {
        exerciseSlug: 'emb-kosinus-fill-in',
        submission: { kind: 'fillIn', values: { skalar: '8', laenge: '3', kosinus: '0,89' } },
        durationMs: 6000,
        isReview: false,
      });
      expect(ergebnis.outcome).toBe('PASSED');

      const kosinus = await prisma.concept.findUniqueOrThrow({
        where: { slug: 'kosinus-aehnlichkeit' },
      });
      const mastery = await prisma.conceptMastery.findUnique({
        where: { userId_conceptId: { userId: anna, conceptId: kosinus.id } },
      });
      expect(mastery?.masteryScore).toBeGreaterThan(0);
      // Fremde Konten bleiben unberührt.
      expect(await prisma.conceptMastery.count({ where: { userId: bert } })).toBe(0);
    });

    it('bewertet eine falsche Einsortierung nicht als bestanden', async () => {
      const ergebnis = await submitAttempt(anna, {
        exerciseSlug: 'emb-suchverfahren-klassifikation',
        submission: {
          kind: 'classification',
          zuordnung: {
            bestellnummer: 'semantisch',
            umschreibung: 'semantisch',
            fehlercode: 'semantisch',
            synonym: 'semantisch',
            paragraf: 'semantisch',
          },
        },
        durationMs: 4000,
        isReview: false,
      });
      expect(ergebnis.outcome).not.toBe('PASSED');
    });
  });

  describe('Lab-Abschluss über die bestehende Server Action', () => {
    it('speichert den Abschluss für das angemeldete Konto — und nur für dieses', async () => {
      SESSION_USER.id = anna;
      await recordLabCompletionAction(LAB, ZEITSTEMPEL);

      const versuche = await prisma.labAttempt.findMany({
        where: { lab: { slug: LAB }, user: { email: { contains: PRAEFIX } } },
      });
      expect(versuche).toHaveLength(1);
      expect(versuche[0]?.userId).toBe(anna);
      expect(versuche[0]?.completed).toBe(true);
      expect(versuche[0]?.completedAt).toBeInstanceOf(Date);
      expect(versuche[0]?.result).toEqual(ZEITSTEMPEL);

      const fuerAnna = await listLabsWithStatus(anna);
      const fuerBert = await listLabsWithStatus(bert);
      expect(fuerAnna.find((l) => l.slug === LAB)?.completed).toBe(true);
      expect(fuerBert.find((l) => l.slug === LAB)?.completed).toBe(false);
    });

    it('nimmt keine Nutzerkennung von außen an: Zugeordnet wird allein die Sitzung', async () => {
      SESSION_USER.id = bert;
      // Ein Versuch, einen Abschluss für ein anderes Konto einzuschleusen,
      // scheitert am Ergebnisvertrag der Action — es wird nichts geschrieben.
      await expect(
        recordLabCompletionAction(LAB, { ...ZEITSTEMPEL, userId: anna }),
      ).resolves.toBeUndefined();
      const versuche = await prisma.labAttempt.findMany({
        where: { lab: { slug: LAB }, userId: { in: [anna, bert] } },
      });
      // Zod entfernt unbekannte Felder; der Abschluss gehört Bert, nicht Anna.
      expect(versuche.map((v) => v.userId)).toEqual([bert]);
      expect(versuche[0]?.result).toEqual(ZEITSTEMPEL);
    });

    it('verlangt eine Sitzung', async () => {
      SESSION_USER.id = null;
      await expect(recordLabCompletionAction(LAB, ZEITSTEMPEL)).rejects.toThrow();
      expect(await prisma.labAttempt.count({ where: { lab: { slug: LAB }, userId: anna } })).toBe(
        0,
      );
    });

    it('behandelt einen unbekannten Lab-Slug nicht als gültig', async () => {
      SESSION_USER.id = anna;
      await expect(
        recordLabCompletionAction('semantische-suche-lab-x', ZEITSTEMPEL),
      ).rejects.toBeInstanceOf(LabNotFoundError);
      await expect(getLabBySlug('vector-database-lab')).rejects.toBeInstanceOf(LabNotFoundError);
      expect(await prisma.labAttempt.count({ where: { userId: anna } })).toBe(0);
    });

    it('lehnt ein Ergebnis ohne gültigen Zeitstempel ab, statt still zu speichern', async () => {
      SESSION_USER.id = anna;
      await expect(recordLabCompletionAction(LAB, { completedAt: 'gestern' })).rejects.toThrow();
      await expect(recordLabCompletionAction(LAB, {})).rejects.toThrow();
      expect(await prisma.labAttempt.count({ where: { userId: anna } })).toBe(0);
    });

    it('überschreibt keine bestehenden Fortschritte und lässt andere Labs nutzbar', async () => {
      SESSION_USER.id = anna;
      await recordLabCompletionAction('merge-conflict-lab', ZEITSTEMPEL);
      const vorher = await prisma.labAttempt.findFirstOrThrow({
        where: { userId: anna, lab: { slug: 'merge-conflict-lab' } },
      });

      await recordLabCompletionAction(LAB, ZEITSTEMPEL);
      // Ein zweiter Abschluss desselben Labs legt einen weiteren Versuch an.
      await recordLabCompletionAction(LAB, { completedAt: '2026-11-08T09:30:00.000Z' });

      const nachher = await prisma.labAttempt.findUniqueOrThrow({ where: { id: vorher.id } });
      expect(nachher).toEqual(vorher);
      expect(await prisma.labAttempt.count({ where: { userId: anna, lab: { slug: LAB } } })).toBe(
        2,
      );

      const status = await listLabsWithStatus(anna);
      expect(status.find((l) => l.slug === 'merge-conflict-lab')?.completed).toBe(true);
      expect(status.find((l) => l.slug === LAB)?.completed).toBe(true);
      // Alle bisherigen Labs sind weiterhin veröffentlicht und abrufbar.
      for (const slug of [
        'terminal-lab',
        'tokenizer-lab',
        'context-window-lab',
        'prompt-repair-lab',
        'git-state-lab',
        'branch-lab',
        'merge-conflict-lab',
      ]) {
        await expect(getLabBySlug(slug)).resolves.toMatchObject({ slug, status: 'PUBLISHED' });
      }
    });
  });
});

describe('LP-10A: erneutes Seeden erhält Lernverlauf', () => {
  const projectRoot = path.resolve(import.meta.dirname, '..', '..');
  let carla: string;
  let versuchId: string;
  let fortschrittId: string;

  beforeAll(async () => {
    await aufraeumen();
    carla = await nutzer('carla');
    const lab = await getLabBySlug(LAB);
    const versuch = await prisma.labAttempt.create({
      data: {
        userId: carla,
        labId: lab.id,
        result: ZEITSTEMPEL,
        completed: true,
        completedAt: new Date(),
      },
    });
    versuchId = versuch.id;
    const lektion = await prisma.lesson.findUniqueOrThrow({
      where: { slug: 'aehnlichkeit-berechnen' },
    });
    const fortschritt = await prisma.lessonProgress.create({
      data: { userId: carla, lessonId: lektion.id, state: 'IN_PROGRESS', lastSection: '3' },
    });
    fortschrittId = fortschritt.id;

    // Derselbe Seed wie im Deployment, gegen dieselbe Testdatenbank.
    execSync('npx tsx prisma/seed.ts', {
      cwd: projectRoot,
      env: { ...process.env, SEED_DEMO_USERS: 'false' },
      stdio: 'pipe',
    });
  });

  afterAll(aufraeumen);

  it('behält Lab-Abschluss und Lektionsfortschritt', async () => {
    const versuch = await prisma.labAttempt.findUniqueOrThrow({ where: { id: versuchId } });
    expect(versuch.userId).toBe(carla);
    expect(versuch.completed).toBe(true);
    const fortschritt = await prisma.lessonProgress.findUniqueOrThrow({
      where: { id: fortschrittId },
    });
    expect(fortschritt.state).toBe('IN_PROGRESS');
    expect(fortschritt.lastSection).toBe('3');
    // Kein doppeltes Lab, kein doppeltes Modul durch den zweiten Lauf.
    expect(await prisma.lab.count({ where: { slug: LAB } })).toBe(1);
    expect(
      await prisma.courseModule.count({ where: { slug: 'embeddings-semantische-suche' } }),
    ).toBe(1);
  });
});
