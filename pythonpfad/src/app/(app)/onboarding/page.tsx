import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { OnboardingForm } from './onboarding-form';
import { Schrittanzeige } from '@/components/ui/schrittanzeige';
import { heroGradient, moduleTheme } from '@/domain/design/module-theme';
import { EckStufen } from '@/components/ui/zierformen';

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
      {/*
       * Der erste Bildschirm nach der Anmeldung. Er entscheidet mit darüber,
       * ob jemand weitermacht – deshalb hier derselbe Verlauf wie auf dem
       * Lernpfad und nicht eine graue Formularseite.
       */}
      <header
        style={{ backgroundImage: heroGradient(moduleTheme(0)) }}
        className="relative isolate mb-8 overflow-hidden rounded-3xl p-6 text-white sm:p-8 muster-punkte-hell muster-verlauf"
      >
        <EckStufen
          farbe="#ffffff"
          className="pointer-events-none absolute -right-4 -top-6 -z-10 size-52 opacity-80"
        />
        <Schrittanzeige aktuell={1} />
        <h1 className="mt-4 text-display-sm font-black leading-tight tracking-[-0.02em]">
          Willkommen, {user.name}.
        </h1>
        <p className="mt-3 max-w-prose text-white/80">
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
