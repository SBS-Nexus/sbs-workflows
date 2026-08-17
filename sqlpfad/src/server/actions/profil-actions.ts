'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';

/**
 * Einstellungen im Profil.
 *
 * Zwei Gruppen, aus zwei Gründen getrennt:
 *
 * **Die Lernangaben** – Vorkenntnisse, Ziel, Zeit, Tempo – kamen bisher nur im
 * Einstieg vor und ließen sich danach nie mehr ändern. Wer nach vier Wochen
 * keine Anfängerin mehr ist, blieb im Profil dauerhaft als solche stehen. Sie
 * sind Selbstauskunft und kein Testergebnis; sie zu ändern, ist keine
 * Zurücksetzung des Fortschritts und darf sich auch nicht so anfühlen.
 *
 * **Die Darstellung** – Farbschema und Bewegungsreduktion – lag bisher
 * ausschließlich im localStorage. Das ist schnell und geräteweise: Wer sich am
 * Abend auf einem anderen Rechner anmeldet, sieht wieder das Standardschema.
 * Für die Bewegungsreduktion ist das mehr als eine Unbequemlichkeit – sie ist
 * eine Barrierefreiheitseinstellung, und die soll der Person folgen, nicht dem
 * Browser.
 */

// --- Lernangaben -----------------------------------------------------------

export interface ProfilState {
  ok: boolean;
  meldung?: string;
}

const lernangabenSchema = z.object({
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

export async function speichereLernangaben(
  _vorher: ProfilState,
  formData: FormData,
): Promise<ProfilState> {
  const user = await requireUser();

  const geprueft = lernangabenSchema.safeParse({
    experience: formData.get('experience'),
    learningGoal: formData.get('learningGoal'),
    dailyTimeBudget: formData.get('dailyTimeBudget'),
    pace: formData.get('pace'),
  });

  if (!geprueft.success) {
    return { ok: false, meldung: 'Bitte fülle alle vier Angaben aus.' };
  }

  await prisma.user.update({ where: { id: user.id }, data: geprueft.data });

  revalidatePath('/profil');
  return {
    ok: true,
    meldung:
      'Gespeichert. Die Angaben steuern die Reihenfolge und die Beispiele – dein Fortschritt ' +
      'bleibt unverändert.',
  };
}

// --- Darstellung -----------------------------------------------------------

const darstellungSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  reduceMotion: z.boolean(),
});

/**
 * Farbschema und Bewegungsreduktion am Konto festhalten.
 *
 * Wird sowohl vom Profil als auch vom Umschalter in der Kopfzeile aufgerufen.
 * **Ohne Anmeldung passiert nichts** – der Umschalter steht auch auf der
 * Startseite, und dort gibt es kein Konto, an dem etwas zu speichern wäre. Das
 * ist kein Fehlerfall und wird deshalb auch nicht als einer gemeldet.
 */
export async function speichereDarstellung(daten: unknown): Promise<{ gespeichert: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { gespeichert: false };

  const geprueft = darstellungSchema.safeParse(daten);
  if (!geprueft.success) return { gespeichert: false };

  await prisma.user.update({
    where: { id: user.id },
    data: { theme: geprueft.data.theme, reduceMotion: geprueft.data.reduceMotion },
  });

  return { gespeichert: true };
}
