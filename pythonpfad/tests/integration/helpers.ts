import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { hashPassword } from '@/server/auth/password';

/**
 * Gemeinsame Hilfsmittel für Integrationstests.
 *
 * Jeder Test legt sein eigenes Konto an und räumt es hinterher weg. Dadurch
 * beeinflussen sich die Tests nicht gegenseitig, obwohl sie dieselbe Datenbank
 * verwenden.
 */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

export async function createTestUser(
  overrides: Partial<{ role: 'LEARNER' | 'ADMIN'; onboardingCompleted: boolean }> = {},
): Promise<{ id: string; email: string }> {
  const email = `test-${randomUUID()}@example.org`;
  const user = await prisma.user.create({
    data: {
      email,
      name: 'Testperson',
      passwordHash: await hashPassword('einTestPasswort2026'),
      role: overrides.role ?? 'LEARNER',
      onboardingCompleted: overrides.onboardingCompleted ?? true,
      placementCompleted: true,
      placementScore: 40,
    },
    select: { id: true, email: true },
  });
  return user;
}

export async function deleteTestUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}

export async function exerciseIdBySlug(slug: string): Promise<string> {
  const row = await prisma.exercise.findUniqueOrThrow({
    where: { slug },
    select: { id: true },
  });
  return row.id;
}
