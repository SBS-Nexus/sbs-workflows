'use server';

import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { requireUser } from '@/server/auth/session';
import { enforceRateLimit, RATE_LIMITS, RateLimitError } from '@/server/security/rate-limit';
import { askTutor } from '@/server/tutor/provider';
import { TUTOR_MODES, type TutorContext, type TutorReply } from '@/domain/tutor/types';
import { hintSchema } from '@/domain/content/exercise-payload';
import { z as zod } from 'zod';

const requestSchema = z.object({
  mode: z.enum(TUTOR_MODES),
  exerciseSlug: z.string().max(120).optional(),
  question: z.string().max(1000).optional(),
  code: z.string().max(20_000).optional(),
  traceback: z.string().max(8000).optional(),
});

export type TutorActionResult =
  { ok: true; reply: TutorReply; fellBack: boolean } | { ok: false; error: string };

export async function askTutorAction(
  input: z.input<typeof requestSchema>,
): Promise<TutorActionResult> {
  const user = await requireUser();

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Die Anfrage konnte nicht gelesen werden.' };

  try {
    enforceRateLimit(`tutor:${user.id}`, RATE_LIMITS.tutor);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const context = await buildContext(user.id, parsed.data.exerciseSlug);
  if (!context) return { ok: false, error: 'Zu dieser Aufgabe liegen keine Angaben vor.' };

  const exercise = parsed.data.exerciseSlug
    ? await prisma.exercise.findUnique({
        where: { slug: parsed.data.exerciseSlug },
        select: { solution: true },
      })
    : null;

  const result = await askTutor(
    {
      mode: parsed.data.mode,
      ...(parsed.data.exerciseSlug !== undefined ? { exerciseSlug: parsed.data.exerciseSlug } : {}),
      ...(parsed.data.question !== undefined ? { question: parsed.data.question } : {}),
      ...(parsed.data.code !== undefined ? { code: parsed.data.code } : {}),
      ...(parsed.data.traceback !== undefined ? { traceback: parsed.data.traceback } : {}),
    },
    context,
    { consent: user.aiTutorConsent, solution: exercise?.solution ?? null },
  );

  // Gespeichert wird nur die Antwort des Tutors, nicht der eingereichte Code.
  await prisma.tutorInteraction.create({
    data: {
      userId: user.id,
      exerciseId: null,
      mode: parsed.data.mode,
      response: result.reply.paragraphs.join('\n\n').slice(0, 4000),
      provider: result.reply.provider,
    },
  });

  return { ok: true, reply: result.reply, fellBack: result.fellBack };
}

async function buildContext(
  userId: string,
  exerciseSlug: string | undefined,
): Promise<TutorContext | null> {
  if (!exerciseSlug) {
    return {
      exerciseTitle: 'Allgemeine Frage',
      exercisePrompt: 'Keine Aufgabe ausgewählt.',
      concepts: [],
      masteryByConcept: {},
      attempts: 0,
      hintsRevealed: 0,
      maxHintLevel: 0,
      lastPassedTests: 0,
      lastTotalTests: 0,
    };
  }

  const exercise = await prisma.exercise.findUnique({
    where: { slug: exerciseSlug },
    include: { concepts: { include: { concept: true } } },
  });
  if (!exercise) return null;

  const attempts = await prisma.attempt.findMany({
    where: { userId, exerciseId: exercise.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { hintsUsed: true, passedTests: true, totalTests: true, result: true },
  });

  const mastery = await prisma.conceptMastery.findMany({
    where: { userId, conceptId: { in: exercise.concepts.map((c) => c.conceptId) } },
    include: { concept: { select: { slug: true } } },
  });

  const hints = zod.array(hintSchema).parse(exercise.hints ?? []);
  const latest = attempts[0];

  return {
    exerciseTitle: exercise.title,
    exercisePrompt: exercise.prompt,
    concepts: exercise.concepts.map((c) => ({
      slug: c.concept.slug,
      name: c.concept.name,
      description: c.concept.description,
    })),
    masteryByConcept: Object.fromEntries(
      mastery.map((m) => [m.concept.slug, Math.round(m.masteryScore)]),
    ),
    attempts: attempts.filter((a) => a.result !== 'SOLUTION_REVEALED').length,
    hintsRevealed: attempts.reduce((max, a) => Math.max(max, a.hintsUsed), 0),
    maxHintLevel: hints.reduce((max, h) => Math.max(max, h.level), 0),
    lastPassedTests: latest?.passedTests ?? 0,
    lastTotalTests: latest?.totalTests ?? 0,
  };
}
