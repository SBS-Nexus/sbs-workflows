'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { destroyAllSessions, requireUser } from '@/server/auth/session';
import { enforceRateLimit, RATE_LIMITS, RateLimitError } from '@/server/security/rate-limit';
import { rebuildLearningPath } from './onboarding-actions';

/**
 * Kontoverwaltung: Einstellungen, Datenexport, Kontolöschung.
 *
 * Export und Löschung sind keine Zusatzfunktionen, sondern Bestandteil der
 * Datenschutzanforderungen (Auskunft und Löschung). Beide sind hier vollständig
 * umgesetzt, nicht nur angedeutet.
 */

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  learningGoal: z.enum([
    'GENERAL',
    'OFFICE_AUTOMATION',
    'DATA_ANALYSIS',
    'AI_APPLICATIONS',
    'WEB_DEVELOPMENT',
    'CAREER_CHANGE',
  ]),
  dailyTimeBudget: z.coerce.number().int().min(5).max(240),
  pace: z.enum(['RELAXED', 'STEADY', 'FOCUSED']),
  theme: z.enum(['system', 'light', 'dark']),
  reduceMotion: z.coerce.boolean(),
  aiTutorConsent: z.coerce.boolean(),
});

export interface SettingsState {
  ok: boolean;
  message?: string;
  error?: string;
}

export async function saveSettingsAction(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();

  const parsed = settingsSchema.safeParse({
    name: formData.get('name'),
    learningGoal: formData.get('learningGoal'),
    dailyTimeBudget: formData.get('dailyTimeBudget'),
    pace: formData.get('pace'),
    theme: formData.get('theme'),
    reduceMotion: formData.get('reduceMotion') === 'on',
    aiTutorConsent: formData.get('aiTutorConsent') === 'on',
  });

  if (!parsed.success) {
    return { ok: false, error: 'Die Eingaben konnten nicht gespeichert werden.' };
  }

  const before = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { learningGoal: true, dailyTimeBudget: true, pace: true, placementScore: true },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  });

  // Ändert sich das Lernziel oder das Tempo, wird der Pfad neu berechnet.
  if (
    before.learningGoal !== parsed.data.learningGoal ||
    before.pace !== parsed.data.pace ||
    before.dailyTimeBudget !== parsed.data.dailyTimeBudget
  ) {
    await rebuildLearningPath({
      userId: user.id,
      placementScore: before.placementScore ?? 0,
      demonstratedConceptSlugs: [],
      learningGoal: parsed.data.learningGoal,
      dailyTimeBudget: parsed.data.dailyTimeBudget,
      pace: parsed.data.pace,
    });
  }

  revalidatePath('/profil');
  revalidatePath('/fortschritt');

  return { ok: true, message: 'Einstellungen gespeichert.' };
}

/**
 * Vollständiger Export aller personenbezogenen Lerndaten als JSON.
 * Enthält bewusst KEINE Inhalte des Kurses – nur die eigenen Daten.
 */
export async function exportAccountDataAction(): Promise<
  { ok: true; data: string; filename: string } | { ok: false; error: string }
> {
  const user = await requireUser();

  try {
    enforceRateLimit(`export:${user.id}`, RATE_LIMITS.export);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const [profile, attempts, mastery, lessonProgress, submissions, sessions, reviews, tutor] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          email: true,
          name: true,
          locale: true,
          timezone: true,
          experience: true,
          learningGoal: true,
          dailyTimeBudget: true,
          pace: true,
          selfAssessment: true,
          placementScore: true,
          aiTutorConsent: true,
          createdAt: true,
        },
      }),
      prisma.attempt.findMany({
        where: { userId: user.id },
        include: { exercise: { select: { slug: true, title: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.conceptMastery.findMany({
        where: { userId: user.id },
        include: { concept: { select: { slug: true, name: true } } },
      }),
      prisma.lessonProgress.findMany({
        where: { userId: user.id },
        include: { lesson: { select: { slug: true, title: true } } },
      }),
      prisma.projectSubmission.findMany({
        where: { userId: user.id },
        include: { project: { select: { slug: true, title: true } } },
      }),
      prisma.learningSession.findMany({ where: { userId: user.id } }),
      prisma.reviewQueueItem.findMany({
        where: { userId: user.id },
        include: { exercise: { select: { slug: true } } },
      }),
      prisma.tutorInteraction.findMany({ where: { userId: user.id } }),
    ]);

  const payload = {
    exportiertAm: new Date().toISOString(),
    hinweis:
      'Diese Datei enthält alle personenbezogenen Daten, die PythonPfad zu deinem Konto gespeichert hat. Kursinhalte sind nicht enthalten.',
    profil: profile,
    lernfortschritt: lessonProgress.map((p) => ({
      lektion: p.lesson.slug,
      titel: p.lesson.title,
      status: p.state,
      abgeschlossenAm: p.completedAt,
    })),
    versuche: attempts.map((a) => ({
      aufgabe: a.exercise.slug,
      titel: a.exercise.title,
      ergebnis: a.result,
      fehlerart: a.errorType,
      bestandeneTests: a.passedTests,
      testsGesamt: a.totalTests,
      hinweiseGenutzt: a.hintsUsed,
      dauerMs: a.durationMs,
      sicherheitVorher: a.confidenceBefore,
      sicherheitNachher: a.confidenceAfter,
      eingereichterCode: a.submittedCode,
      zeitpunkt: a.createdAt,
    })),
    kompetenzstand: mastery.map((m) => ({
      konzept: m.concept.slug,
      name: m.concept.name,
      wert: m.masteryScore,
      stabilitaet: m.stability,
      naechsteWiederholung: m.nextReviewAt,
      algorithmusVersion: m.algorithmVersion,
    })),
    projekte: submissions.map((s) => ({
      projekt: s.project.slug,
      status: s.status,
      meilensteineErfuellt: s.milestonesDone,
      dateien: s.files,
      reflexion: s.reflection,
    })),
    lernsitzungen: sessions,
    geplanteWiederholungen: reviews.map((r) => ({
      aufgabe: r.exercise.slug,
      faelligAm: r.dueAt,
      wiederholung: r.repetition,
      begruendung: r.reason,
    })),
    tutorAntworten: tutor.map((t) => ({
      modus: t.mode,
      antwort: t.response,
      anbieter: t.provider,
      zeitpunkt: t.createdAt,
    })),
  };

  return {
    ok: true,
    data: JSON.stringify(payload, null, 2),
    filename: `pythonpfad-daten-${new Date().toISOString().slice(0, 10)}.json`,
  };
}

const deleteSchema = z.object({ confirmation: z.string() });

export async function deleteAccountAction(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();

  const parsed = deleteSchema.safeParse({ confirmation: formData.get('confirmation') });
  if (!parsed.success || parsed.data.confirmation.trim().toUpperCase() !== 'LÖSCHEN') {
    return {
      ok: false,
      error: 'Zur Bestätigung muss im Feld genau das Wort LÖSCHEN stehen.',
    };
  }

  // Alle abhängigen Datensätze haben onDelete: Cascade – ein einziger Aufruf
  // entfernt damit sämtliche personenbezogenen Daten.
  await prisma.user.delete({ where: { id: user.id } });
  await destroyAllSessions(user.id).catch(() => undefined);

  redirect('/?geloescht=1');
}
