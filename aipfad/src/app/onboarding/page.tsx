import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { SectionHeading } from '@/components/ui/primitives';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = {
  title: 'Einrichtung',
  alternates: { canonical: '/onboarding' },
};

/**
 * Kurzes Onboarding statt langer Selbsteinschätzung (siehe
 * docs/LERNMODELL.md §51: "Praktisches Placement statt langer
 * Selbsteinschätzung. Nutzer darf Placement überspringen."). Vier Fragen,
 * keine Wertung.
 */
export default async function OnboardingPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (user.onboardingCompleted) redirect('/pfad');

  return (
    <main id="hauptinhalt" className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <SectionHeading
        eyebrow="Kurz und unverbindlich"
        description="Vier Fragen, keine Wertung — jederzeit in den Einstellungen änderbar."
      >
        Bevor es losgeht
      </SectionHeading>
      <OnboardingForm />
    </main>
  );
}
