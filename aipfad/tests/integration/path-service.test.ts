import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { getOrCreatePath } from '@/server/services/path-service';
import { finalisiereOnboarding, type OnboardingInput } from '@/server/services/onboarding-service';

/**
 * E01C: Der Pfaddienst bekommt eigene Integrationsabdeckung.
 *
 * Der einzige produktive Aufruf von getOrCreatePath() liegt hinter dem
 * onboardingCompleted-Gate der Pfadseite. finalisiereOnboarding() legt den
 * Pfad in derselben Transaktion an, in der es onboardingCompleted setzt.
 * Deshalb ist der anfällige "nicht gefunden -> anlegen"-Zweig im normalen
 * Produktfluss derzeit nicht erreichbar. Die Tests halten sowohl diese
 * Invariante als auch die Idempotenz des Dienstes fest.
 */

const EINSTELLUNGEN: OnboardingInput = {
  learningGoal: 'GENERAL',
  experience: 'NONE',
  dailyTimeBudget: 20,
  pace: 'STEADY',
};

describe('Pfaddienst', () => {
  const emails = [
    'path-service-create@integrationtest.local',
    'path-service-reachable@integrationtest.local',
  ];

  async function neuerNutzer(email: string): Promise<string> {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Pfaddiensttest',
        passwordHash: await hashPassword('Testpasswort-123'),
      },
    });
    return user.id;
  }

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('legt im isoliert aufgerufenen Fallback genau einen Pfad an und ist danach idempotent', async () => {
    const userId = await neuerNutzer(emails[0]!);

    const erster = await getOrCreatePath(userId);
    const zweiter = await getOrCreatePath(userId);

    expect(zweiter.id).toBe(erster.id);
    await expect(prisma.learningPath.count({ where: { userId } })).resolves.toBe(1);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.currentPathId).toBe(erster.id);
    expect(user.onboardingCompleted).toBe(false);
  });

  it('erreicht nach regulärem Onboarding nur den bestehenden Pfad', async () => {
    const userId = await neuerNutzer(emails[1]!);

    await finalisiereOnboarding(userId, EINSTELLUNGEN, { art: 'uebersprungen' });

    const vorAufruf = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { onboardingCompleted: true, currentPathId: true },
    });
    expect(vorAufruf.onboardingCompleted).toBe(true);
    expect(vorAufruf.currentPathId).not.toBeNull();

    const vorhandener = await prisma.learningPath.findFirstOrThrow({ where: { userId } });
    expect(vorAufruf.currentPathId).toBe(vorhandener.id);

    const parallel = await Promise.all(Array.from({ length: 8 }, () => getOrCreatePath(userId)));

    expect(new Set(parallel.map((pfad) => pfad.id))).toEqual(new Set([vorhandener.id]));
    await expect(prisma.learningPath.count({ where: { userId } })).resolves.toBe(1);

    const nachAufruf = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { currentPathId: true },
    });
    expect(nachAufruf.currentPathId).toBe(vorhandener.id);
  });
});
