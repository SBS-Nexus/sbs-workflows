import 'server-only';
import { prisma } from '@/server/db/prisma';
import { enforceRateLimit, RATE_LIMITS } from '@/server/security/rate-limit';

/**
 * Dienst für Labs (Terminal, Tokenizer, Context-Window, Prompt-Repair). Jedes
 * Lab ist deterministisch – es findet kein Aufruf an einen externen Dienst
 * statt (siehe docs/SECURITY.md).
 */

export class LabNotFoundError extends Error {
  constructor() {
    super('Dieses Lab wurde nicht gefunden.');
    this.name = 'LabNotFoundError';
  }
}

export async function getLabBySlug(slug: string) {
  const lab = await prisma.lab.findUnique({ where: { slug }, include: { concepts: true } });
  if (!lab || lab.status !== 'PUBLISHED') throw new LabNotFoundError();
  return lab;
}

export async function recordLabAttempt(
  userId: string,
  labSlug: string,
  result: unknown,
  completed: boolean,
): Promise<void> {
  enforceRateLimit(`labAttempt:${userId}`, RATE_LIMITS.labAttempt);

  const lab = await getLabBySlug(labSlug);

  await prisma.labAttempt.create({
    data: {
      userId,
      labId: lab.id,
      result: result as object,
      completed,
      completedAt: completed ? new Date() : null,
    },
  });
}

export async function listLabsWithStatus(userId: string) {
  const labs = await prisma.lab.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { slug: 'asc' },
  });

  const completions = await prisma.labAttempt.findMany({
    where: { userId, completed: true, labId: { in: labs.map((l) => l.id) } },
    select: { labId: true },
    distinct: ['labId'],
  });
  const completedIds = new Set(completions.map((c) => c.labId));

  return labs.map((lab) => ({ ...lab, completed: completedIds.has(lab.id) }));
}
