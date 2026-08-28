import { describe, expect, it, beforeEach } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { submitAttempt, revealNextHint } from '@/server/services/exercise-service';

/**
 * Regressionstests für zwei Codex-Funde auf PR #29:
 *  - "Repeated Error Detection": der gerade erstellte Attempt durfte sich
 *    nicht selbst als "letzten fehlgeschlagenen Versuch" finden.
 *  - "Hint Ladder": Hinweise müssen serverseitig anhand echter
 *    Versuchszahlen freigegeben werden, nicht anhand client-gemeldeter Werte.
 */
describe('Aufgaben-Dienst', () => {
  const email = 'exercise-service@integrationtest.local';
  let userId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Aufgabentest',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    userId = user.id;
  });

  describe('Fehlerwiederholung', () => {
    it('wertet den ersten Fehler eines Typs NICHT als Wiederholung', async () => {
      // "was-kann-ai-scenario" hat eine "problematic"-Option, die MISCONCEPTION auslöst.
      const result = await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'a' }, // falsch, korrekt ist 'b'
        durationMs: 500,
        isReview: false,
      });

      expect(result.outcome).toBe('FAILED');
      const update = result.masteryUpdates[0];
      expect(update).toBeDefined();
      expect(update?.reasons.some((r) => r.includes('erneut'))).toBe(false);
    });

    it('wertet den zweiten Fehler DESSELBEN Typs als Wiederholung', async () => {
      await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'a' },
        durationMs: 500,
        isReview: false,
      });

      const second = await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'c' }, // andere falsche Option, gleicher errorType
        durationMs: 500,
        isReview: false,
      });

      expect(second.outcome).toBe('FAILED');
      const update = second.masteryUpdates[0];
      expect(update?.reasons.some((r) => r.includes('erneut'))).toBe(true);
    });

    it('ein PASSED-Attempt erzeugt keine falsche Wiederholungsbewertung', async () => {
      await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'a' },
        durationMs: 500,
        isReview: false,
      });

      const passed = await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'b' }, // korrekt
        durationMs: 500,
        isReview: false,
      });

      expect(passed.outcome).toBe('PASSED');
      const update = passed.masteryUpdates[0];
      expect(update?.reasons.some((r) => r.includes('erneut'))).toBe(false);
    });
  });

  describe('Hinweisleiter', () => {
    it('gibt Hinweisstufe 1 ohne vorherige Versuche frei', async () => {
      const result = await revealNextHint(userId, 'was-ist-aipfad-single-choice');
      expect('hint' in result).toBe(true);
      if ('hint' in result) {
        expect(result.hint.level).toBe(1);
      }
    });

    it('blockiert Hinweisstufe 2 ohne einen eigenen Versuch', async () => {
      await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 1
      const result = await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 2
      expect('blocked' in result).toBe(true);
    });

    it('gibt Hinweisstufe 2 erst nach einem echten, in der DB gespeicherten Versuch frei', async () => {
      await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'a' },
        durationMs: 500,
        isReview: false,
      });

      await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 1
      const result = await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 2
      expect('hint' in result).toBe(true);
    });

    it('lässt sich NICHT durch wiederholte Aufrufe ohne echte Versuche über Stufe 1 hinaus täuschen', async () => {
      // Kein Attempt in der DB — auch ein manipulierter Client, der
      // `revealNextHint` beliebig oft aufruft, kommt ohne echten Versuch nicht
      // über Stufe 1 hinaus: die Prüfung beruht ausschließlich auf der echten
      // Versuchszahl aus der Datenbank. Es gibt keinen Client-Parameter mehr,
      // über den sich eine Zielstufe direkt anfordern ließe.
      await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 1
      const result = await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 2
      expect('blocked' in result).toBe(true);

      const attemptCount = await prisma.attempt.count({ where: { userId } });
      expect(attemptCount).toBe(0);
    });

    it('erneutes Ansehen einer bereits freigegebenen Stufe zählt nicht doppelt zu hintsUsed', async () => {
      const first = await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 1
      expect('hint' in first).toBe(true);
      const again = await revealNextHint(userId, 'was-ist-aipfad-single-choice');
      // Ohne einen echten Versuch bleibt Stufe 2 blockiert — ein erneuter Aufruf
      // legt keine zweite Stufe-1-Zeile an.
      expect('blocked' in again).toBe(true);

      const revealCount = await prisma.hintReveal.count({ where: { userId } });
      expect(revealCount).toBe(1);
    });
  });
});
