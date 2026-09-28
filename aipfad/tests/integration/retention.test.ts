import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { attemptRetentionRule, PRODUKTIVE_REGELN } from '@/server/retention/rules';
import { runRetention } from '@/server/retention/runner';

/**
 * Die Aufbewahrung gegen eine echte Datenbank.
 *
 * Was hier steht, lässt sich nur mit echten Zeilen zeigen: dass der
 * Trockenlauf wirklich nichts löscht, dass der Ernstfall genau die zu alten
 * Zeilen trifft, dass ein zweiter Lauf nichts mehr findet, und dass die Grenze
 * dort liegt, wo sie dokumentiert ist. Die Orchestrierung — zweite Regel,
 * Teilfehler, abgeschaltete Frist — steht in `tests/unit/retention-runner.test.ts`.
 */

const PRAEFIX = 'aufbewahrung@integrationtest.local';
const JETZT = new Date('2026-06-15T12:00:00.000Z');
const TAG = 24 * 60 * 60 * 1000;

/** Nur die eigenen Zeilen entfernen, keine fremden (docs/TESTING.md). */
async function eigeneZeilenEntfernen(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { contains: PRAEFIX } } });
}

async function nutzerAnlegen(name: string): Promise<string> {
  const nutzer = await prisma.user.create({
    data: {
      email: `${name}-${PRAEFIX}`,
      name: 'Aufbewahrungstest',
      passwordHash: await hashPassword('ein-sicheres-testpasswort-123'),
    },
  });
  return nutzer.id;
}

async function aufgabeHolen(): Promise<string> {
  const aufgabe = await prisma.exercise.findFirstOrThrow({ select: { id: true } });
  return aufgabe.id;
}

async function versuchAnlegen(
  userId: string,
  exerciseId: string,
  createdAt: Date,
): Promise<string> {
  const versuch = await prisma.attempt.create({
    data: {
      userId,
      exerciseId,
      submittedAnswer: {},
      result: 'PASSED',
      hintsUsed: 0,
      durationMs: 5000,
      createdAt,
    },
  });
  return versuch.id;
}

const zaehle = (userId: string): Promise<number> => prisma.attempt.count({ where: { userId } });

/** Ein Lauf über die echte Attempt-Regel, mit fester Uhr. */
function lauf(mode: 'dry-run' | 'execute', now: Date = JETZT) {
  return runRetention({ rules: [attemptRetentionRule], mode, now, runId: `test-${mode}` });
}

describe('Aufbewahrung (Integration mit echter Datenbank)', () => {
  beforeEach(eigeneZeilenEntfernen);
  afterAll(eigeneZeilenEntfernen);

  it('zählt im Trockenlauf und lässt beide Zeilen stehen', async () => {
    const userId = await nutzerAnlegen('trocken');
    const exerciseId = await aufgabeHolen();
    // ATTEMPT_RETENTION_DAYS ist in tests/integration/setup.ts fest auf 365 gepinnt.
    await versuchAnlegen(userId, exerciseId, new Date(JETZT.getTime() - 400 * TAG));
    await versuchAnlegen(userId, exerciseId, new Date(JETZT.getTime() - 10 * TAG));

    const bericht = await lauf('dry-run');
    const regel = bericht.rules[0];

    expect(regel?.ruleId).toBe('ATTEMPT_RETENTION');
    expect(regel?.candidateCount).toBe(1);
    expect(regel?.deletedCount).toBe(0);
    expect(bericht.status).toBe('success');
    // Entscheidend: Es steht noch alles da.
    expect(await zaehle(userId)).toBe(2);
  });

  it('entfernt im Ernstfall genau die zu alte Zeile', async () => {
    const userId = await nutzerAnlegen('ernst');
    const exerciseId = await aufgabeHolen();
    const alt = await versuchAnlegen(userId, exerciseId, new Date(JETZT.getTime() - 400 * TAG));
    const jung = await versuchAnlegen(userId, exerciseId, new Date(JETZT.getTime() - 10 * TAG));

    const bericht = await lauf('execute');

    expect(bericht.rules[0]?.deletedCount).toBe(1);
    expect(await prisma.attempt.findUnique({ where: { id: alt } })).toBeNull();
    expect(await prisma.attempt.findUnique({ where: { id: jung } })).not.toBeNull();
  });

  it('ändert beim zweiten Ernstfall nichts mehr', async () => {
    const userId = await nutzerAnlegen('idempotent');
    const exerciseId = await aufgabeHolen();
    await versuchAnlegen(userId, exerciseId, new Date(JETZT.getTime() - 400 * TAG));
    await versuchAnlegen(userId, exerciseId, new Date(JETZT.getTime() - 10 * TAG));

    expect((await lauf('execute')).rules[0]?.deletedCount).toBe(1);

    const zweiter = await lauf('execute');
    expect(zweiter.rules[0]?.deletedCount).toBe(0);
    expect(zweiter.status).toBe('success');
    expect(await zaehle(userId)).toBe(1);
  });

  it('bleibt sicher, wenn zwei Läufe sich überschneiden', async () => {
    // Vercel sichert keine Zustellung "genau einmal" zu; Aufrufe können sich
    // überschneiden oder doppelt ankommen. Die Löschbedingung selbst trägt
    // das: Zwei gleichzeitige Läufe löschen zusammen dieselbe Menge, und
    // keiner scheitert.
    const userId = await nutzerAnlegen('gleichzeitig');
    const exerciseId = await aufgabeHolen();
    for (let i = 0; i < 6; i += 1) {
      await versuchAnlegen(userId, exerciseId, new Date(JETZT.getTime() - (400 + i) * TAG));
    }
    const jung = await versuchAnlegen(userId, exerciseId, new Date(JETZT.getTime() - 10 * TAG));

    const [a, b] = await Promise.all([lauf('execute'), lauf('execute')]);

    expect(a.status).toBe('success');
    expect(b.status).toBe('success');
    // Zusammen genau die sechs alten Zeilen — keine doppelt gezählt.
    expect((a.rules[0]?.deletedCount ?? 0) + (b.rules[0]?.deletedCount ?? 0)).toBe(6);
    expect(await zaehle(userId)).toBe(1);
    expect(await prisma.attempt.findUnique({ where: { id: jung } })).not.toBeNull();
  });

  it('löscht genau bei `createdAt < cutoff`, nicht auf der Grenze', async () => {
    const userId = await nutzerAnlegen('grenze');
    const exerciseId = await aufgabeHolen();
    const cutoff = new Date(JETZT.getTime() - 365 * TAG);

    const davor = await versuchAnlegen(userId, exerciseId, new Date(cutoff.getTime() - 1));
    const genau = await versuchAnlegen(userId, exerciseId, cutoff);
    const danach = await versuchAnlegen(userId, exerciseId, new Date(cutoff.getTime() + 1));

    const trocken = await lauf('dry-run');
    expect(trocken.rules[0]?.candidateCount).toBe(1);
    expect(trocken.rules[0]?.deletedCount).toBe(0);

    const ernstfall = await lauf('execute');
    expect(ernstfall.rules[0]?.candidateCount).toBe(1);
    expect(ernstfall.rules[0]?.deletedCount).toBe(1);

    expect(await prisma.attempt.findUnique({ where: { id: davor } })).toBeNull();
    // Auf der Grenze bleibt die Zeile: `lt`, nicht `lte`. Diese Unterscheidung
    // stammt aus der Vorgängerfassung und wurde bewusst nicht verändert.
    expect(await prisma.attempt.findUnique({ where: { id: genau } })).not.toBeNull();
    expect(await prisma.attempt.findUnique({ where: { id: danach } })).not.toBeNull();
  });

  it('führt genau die produktiv angemeldete Regel aus, die Attempt-Regel', async () => {
    const bericht = await runRetention({
      rules: PRODUKTIVE_REGELN,
      mode: 'dry-run',
      now: JETZT,
      runId: 'test-registry',
    });

    expect(bericht.rules.map((r) => r.ruleId)).toEqual(['ATTEMPT_RETENTION']);
    expect(attemptRetentionRule.retentionDaysEnvVar).toBe('ATTEMPT_RETENTION_DAYS');
  });

  it('nennt im Bericht keine Datensatzinhalte und keinen Nutzerbezug', async () => {
    const userId = await nutzerAnlegen('datenschutz');
    const exerciseId = await aufgabeHolen();
    await versuchAnlegen(userId, exerciseId, new Date(JETZT.getTime() - 400 * TAG));

    const bericht = await lauf('execute');
    const alsText = JSON.stringify(bericht);

    // Zahlen ja, Inhalte nein: weder die Kennung des Kontos noch die
    // Adresse dürfen im Bericht auftauchen.
    expect(alsText).not.toContain(userId);
    expect(alsText).not.toContain(PRAEFIX);
    expect(alsText).not.toContain(exerciseId);
    expect(bericht.rules[0]?.deletedCount).toBe(1);
  });
});
