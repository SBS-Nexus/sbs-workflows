import 'server-only';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import {
  evaluatePlacement,
  type PlacementAnswer,
  type PlacementQuestion,
} from '@/domain/placement/placement';

/**
 * Dienst für Onboarding und Einstufung. Die Einstufung markiert Konzepte nur
 * als "wahrscheinlich bekannt" – sie werden dadurch nie übersprungen, nur als
 * kurze Auffrischung gekennzeichnet (siehe docs/LERNMODELL.md §7). Diese
 * Ausbaustufe speichert das Ergebnis (score, band) am Konto; eine feinere
 * "wahrscheinlich bekannt"-Markierung je Lektion ist ein dokumentierter
 * nächster Schritt (docs/LEHRPLAN.md).
 */

export const onboardingSchema = z.object({
  learningGoal: z.enum(['GENERAL', 'DEVELOPER', 'PRODUCT_ROLE', 'GOVERNANCE_ROLE', 'LEADERSHIP']),
  experience: z.enum(['NONE', 'USED_CHATBOTS', 'TECHNICAL_BACKGROUND', 'AI_PRACTITIONER']),
  dailyTimeBudget: z.coerce.number().int().min(5).max(240),
  pace: z.enum(['RELAXED', 'STEADY', 'FOCUSED']),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(userId: string, input: OnboardingInput): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { ...input, onboardingCompleted: true },
  });
}

export async function skipOnboarding(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { onboardingCompleted: true } });
}

export async function submitPlacement(
  userId: string,
  questions: readonly PlacementQuestion[],
  answers: readonly PlacementAnswer[],
) {
  const result = evaluatePlacement(questions, answers);

  await prisma.user.update({
    where: { id: userId },
    data: { placementCompleted: true, placementScore: Math.round(result.score) },
  });

  return result;
}

export async function skipPlacement(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { placementCompleted: true } });
}
