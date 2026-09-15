import { describe, expect, it, beforeEach } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { getPublicExercise, submitAttempt } from '@/server/services/exercise-service';
import {
  getLessonBySlug,
  checkLessonCompletion,
  startLesson,
} from '@/server/services/lesson-service';
import { listLabsWithStatus } from '@/server/services/lab-service';

/**
 * Ausbaustufe 2 gegen die echte Datenbank.
 *
 * Geprüft wird, dass die neuen Inhalte nicht nur geseedet werden, sondern
 * durch dieselbe Maschinerie laufen wie die der ersten Ausbaustufe:
 * Bewertung, Kompetenzmodell, Wiederholungsplanung und die
 * Veröffentlichungskette über alle Ebenen.
 */
describe('Stage 2: Git & GitHub', () => {
  const email = 'stage2@integrationtest.local';
  let userId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: { email, name: 'Stage2', passwordHash: await hashPassword('ein-testpasswort-123') },
    });
    userId = user.id;
  });

  describe('Inhalte sind vorhanden und veröffentlicht', () => {
    it('seedet beide Git-Module mit ihren Lektionen', async () => {
      const module_ = await prisma.courseModule.findMany({
        where: { slug: { in: ['git-grundlagen', 'git-zusammenarbeit'] } },
        include: { lessons: true },
      });
      expect(module_).toHaveLength(2);
      for (const m of module_) expect(m.lessons.length).toBeGreaterThanOrEqual(6);
    });

    it('seedet die drei Git-Labs mit ihren Konzepten', async () => {
      const labs = await prisma.lab.findMany({
        where: { slug: { in: ['git-state-lab', 'branch-lab', 'merge-conflict-lab'] } },
      });
      expect(labs).toHaveLength(3);
      expect(labs.map((l) => l.kind).sort()).toEqual(['BRANCH', 'GIT_STATE', 'MERGE_CONFLICT']);
      for (const lab of labs) expect(lab.relatedConceptIds.length).toBeGreaterThan(0);
    });

    it('nutzt die neuen Interaktionsformen tatsächlich', async () => {
      const typen = await prisma.exercise.findMany({
        where: { type: { in: ['INTERPRETATION', 'CLASSIFICATION', 'CONFLICT_RESOLUTION'] } },
        select: { type: true },
      });
      const vorhanden = new Set(typen.map((t) => t.type));
      expect(vorhanden).toContain('INTERPRETATION');
      expect(vorhanden).toContain('CLASSIFICATION');
      expect(vorhanden).toContain('CONFLICT_RESOLUTION');
    });

    it('verknüpft die neuen Konzepte in den Voraussetzungsgraphen', async () => {
      // `prerequisiteIds` hält Datenbank-Kennungen, nicht Slugs — deshalb
      // wird zuerst aufgelöst.
      const merge = await prisma.concept.findUniqueOrThrow({ where: { slug: 'merge' } });
      const branch = await prisma.concept.findUniqueOrThrow({ where: { slug: 'branch' } });
      expect(merge.prerequisiteIds).toContain(branch.id);

      // Und die Kette reicht bis in die erste Ausbaustufe hinein.
      const versionsverwaltung = await prisma.concept.findUniqueOrThrow({
        where: { slug: 'versionsverwaltung' },
      });
      const terminal = await prisma.concept.findUniqueOrThrow({
        where: { slug: 'terminal-grundbegriffe' },
      });
      expect(versionsverwaltung.prerequisiteIds).toContain(terminal.id);
    });
  });

  describe('Die neuen Aufgabenformen laufen durch die Bewertung', () => {
    it('bewertet eine Einsortier-Aufgabe und schreibt Kompetenz fort', async () => {
      const aufgabe = await prisma.exercise.findUniqueOrThrow({
        where: { slug: 'drei-orte-klassifikation' },
      });
      const payload = aufgabe.payload as {
        items: { id: string; correctCategoryId: string }[];
      };
      const zuordnung = Object.fromEntries(payload.items.map((i) => [i.id, i.correctCategoryId]));

      const ergebnis = await submitAttempt(userId, {
        exerciseSlug: 'drei-orte-klassifikation',
        submission: { kind: 'classification', zuordnung },
        durationMs: 4000,
        isReview: false,
      });

      expect(ergebnis.outcome).toBe('PASSED');
      expect(ergebnis.masteryUpdates.length).toBeGreaterThan(0);

      const mastery = await prisma.conceptMastery.findMany({ where: { userId } });
      expect(mastery.length).toBeGreaterThan(0);
      expect(mastery[0]?.masteryScore).toBeGreaterThan(0);
    });

    it('bewertet eine Interpretationsaufgabe und plant eine Wiederholung ein', async () => {
      const aufgabe = await prisma.exercise.findUniqueOrThrow({
        where: { slug: 'diff-lesen-interpretation' },
      });
      const payload = aufgabe.payload as { correctOptionId: string };

      const ergebnis = await submitAttempt(userId, {
        exerciseSlug: 'diff-lesen-interpretation',
        submission: { kind: 'interpretation', optionId: payload.correctOptionId },
        durationMs: 5000,
        isReview: false,
      });

      expect(ergebnis.outcome).toBe('PASSED');
      const geplant = await prisma.reviewQueueItem.findFirst({
        where: { userId, exerciseId: aufgabe.id },
      });
      expect(geplant).not.toBeNull();
      expect(geplant?.dueAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('bewertet eine teilweise richtige Konfliktauflösung als PARTIAL', async () => {
      const aufgabe = await prisma.exercise.findUniqueOrThrow({
        where: { slug: 'konflikt-aufloesen' },
      });
      const payload = aufgabe.payload as {
        abschnitte: { art: string; id?: string; korrekt?: string }[];
      };
      const konflikte = payload.abschnitte.filter((a) => a.art === 'konflikt');
      expect(konflikte.length).toBe(2);

      const entscheidungen: Record<string, 'unsere' | 'ihre' | 'beide'> = {};
      konflikte.forEach((k, index) => {
        if (!k.id) return;
        // Genau eine Stelle bewusst falsch beantworten.
        entscheidungen[k.id] =
          index === 0 ? 'unsere' : ((k.korrekt ?? 'ihre') as 'unsere' | 'ihre' | 'beide');
      });

      const ergebnis = await submitAttempt(userId, {
        exerciseSlug: 'konflikt-aufloesen',
        submission: { kind: 'conflictResolution', entscheidungen },
        durationMs: 9000,
        isReview: false,
      });

      expect(ergebnis.outcome).toBe('PARTIAL');
      expect(ergebnis.feedback.some((f) => f.message.includes('feature/preise'))).toBe(true);
    });
  });

  describe('Öffentliche Fassung enthält keine Lösungsdaten', () => {
    it('liefert die Einsortier-Aufgabe ohne richtige Kategorien aus', async () => {
      const oeffentlich = await getPublicExercise('drei-orte-klassifikation');
      const serialisiert = JSON.stringify(oeffentlich);
      expect(serialisiert).not.toContain('correctCategoryId');
      expect(serialisiert).toContain('unversioniert');
    });

    it('liefert die Konfliktaufgabe ohne die richtige Auflösung aus', async () => {
      const oeffentlich = await getPublicExercise('konflikt-aufloesen');
      const serialisiert = JSON.stringify(oeffentlich);
      expect(serialisiert).not.toContain('korrekt');
      expect(serialisiert).toContain('Basis: 9 Euro');
    });
  });

  describe('Fortschritt über die neuen Lektionen', () => {
    it('schließt eine Git-Lektion ab, wenn alle Aufgaben bestanden sind', async () => {
      const lektion = await getLessonBySlug('warum-versionsverwaltung');
      expect(lektion).not.toBeNull();
      await startLesson(userId, lektion!.id, 1);

      for (const aufgabe of lektion!.exercises) {
        const payload = aufgabe.payload as {
          kind: string;
          correctOptionId?: string;
          options?: { id: string; quality?: string }[];
        };
        const optionId =
          payload.kind === 'singleChoice'
            ? payload.correctOptionId
            : payload.options?.find((o) => o.quality === 'optimal')?.id;
        expect(optionId).toBeDefined();

        await submitAttempt(userId, {
          exerciseSlug: aufgabe.slug,
          submission:
            payload.kind === 'singleChoice'
              ? { kind: 'singleChoice', optionId: optionId! }
              : { kind: 'scenarioDecision', optionId: optionId! },
          durationMs: 3000,
          isReview: false,
        });
      }

      const abschluss = await checkLessonCompletion(userId, lektion!.id);
      expect(abschluss.completed).toBe(true);
    });

    it('führt die Git-Labs mit ihrem Abschlusszustand auf', async () => {
      const labs = await listLabsWithStatus(userId);
      const gitLabs = labs.filter((l) =>
        ['git-state-lab', 'branch-lab', 'merge-conflict-lab'].includes(l.slug),
      );
      expect(gitLabs).toHaveLength(3);
      for (const lab of gitLabs) expect(lab.completed).toBe(false);
    });
  });

  describe('Veröffentlichungskette gilt auch für die neuen Inhalte', () => {
    it('macht eine Git-Aufgabe unerreichbar, wenn ihr Modul zurückgezogen wird', async () => {
      const modul = await prisma.courseModule.findUniqueOrThrow({
        where: { slug: 'git-grundlagen' },
      });
      await expect(getPublicExercise('drei-orte-klassifikation')).resolves.not.toBeNull();

      await prisma.courseModule.update({ where: { id: modul.id }, data: { status: 'DRAFT' } });
      try {
        await expect(getPublicExercise('drei-orte-klassifikation')).resolves.toBeNull();
        await expect(getLessonBySlug('die-drei-orte')).resolves.toBeNull();
      } finally {
        await prisma.courseModule.update({
          where: { id: modul.id },
          data: { status: 'PUBLISHED' },
        });
      }
    });
  });
});
