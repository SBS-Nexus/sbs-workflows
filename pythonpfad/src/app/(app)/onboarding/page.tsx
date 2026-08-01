import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Willkommen' };

export default async function OnboardingPage(): Promise<React.ReactElement> {
  const user = await requireUser();

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      experience: true,
      learningGoal: true,
      dailyTimeBudget: true,
      pace: true,
      selfAssessment: true,
      onboardingCompleted: true,
      placementCompleted: true,
    },
  });

  if (profile.onboardingCompleted && profile.placementCompleted) redirect('/lernen');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold text-[var(--accent)]">Schritt 1 von 2</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Willkommen, {user.name}.
        </h1>
        <p className="mt-3 text-[var(--text-muted)]">
          Fünf kurze Fragen, damit dein Lernpfad zu dir passt. Es gibt keine falschen Antworten, und
          du kannst alles später im Profil ändern.
        </p>
      </header>

      <OnboardingForm
        defaults={{
          experience: profile.experience,
          learningGoal: profile.learningGoal,
          dailyTimeBudget: profile.dailyTimeBudget,
          pace: profile.pace,
          selfAssessment: profile.selfAssessment,
        }}
      />
    </div>
  );
}
