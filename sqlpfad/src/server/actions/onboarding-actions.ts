'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { requireUser } from '@/server/auth/session';

/**
 * Der Einstieg.
 *
 * Alle Angaben sind Selbstauskunft und kein Test. Sie steuern die Reihenfolge
 * und die Beispielkontexte – sie sperren nichts. Wer sich unterschätzt,
 * bekommt eine langsamere Reihenfolge, aber keine verschlossene Tür; wer sich
 * überschätzt, kann jederzeit zurück. Ein Einstieg, der Inhalte wegsperrt,
 * bestraft eine ehrliche Antwort, und danach antwortet niemand mehr ehrlich.
 */

export interface OnboardingState {
  ok: boolean;
  error?: string;
}

const schema = z.object({
  experience: z.enum([
    'NONE',
    'SPREADSHEETS_ONLY',
    'READS_QUERIES',
    'WRITES_SIMPLE_QUERIES',
    'OTHER_SQL_DIALECT',
  ]),
  learningGoal: z.enum([
    'GENERAL',
    'REPORTING',
    'DATA_ANALYSIS',
    'APPLICATION_DEVELOPMENT',
    'DATABASE_ADMINISTRATION',
    'CAREER_CHANGE',
  ]),
  dailyTimeBudget: z.coerce.number().int().min(5).max(180),
  pace: z.enum(['RELAXED', 'STEADY', 'FOCUSED']),
});

export async function onboardingAction(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    experience: formData.get('experience'),
    learningGoal: formData.get('learningGoal'),
    dailyTimeBudget: formData.get('dailyTimeBudget'),
    pace: formData.get('pace'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Bitte beantworte alle vier Fragen.' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { ...parsed.data, onboardingCompleted: true },
  });

  redirect('/fortschritt');
}
