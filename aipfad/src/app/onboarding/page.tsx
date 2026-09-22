import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { SectionHeading } from '@/components/ui/primitives';
import { placementFragenFuerBrowser } from '@/server/services/onboarding-service';
import { OnboardingFlow } from './onboarding-flow';

export const metadata: Metadata = {
  title: 'Einrichtung',
  alternates: { canonical: '/onboarding' },
};

/**
 * Onboarding und Einstufung in einem Ablauf — ein Bildschirm, eine
 * Entscheidung.
 *
 * Vier Einstellungen, dann die Wahl, ob die diagnostische Einstufung
 * gemacht wird. Sie ist freiwillig (docs/LERNMODELL.md §4) und ändert nie
 * den Umfang des Pfads, nur seine Einordnung.
 *
 * Gespeichert wird erst am Ende, in einem Schritt: Vorher gibt es keinen
 * Zwischenstand, den ein Abbruch zurücklassen könnte.
 */
export default async function OnboardingPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (user.onboardingCompleted) redirect('/pfad');

  return (
    <main id="hauptinhalt" className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <SectionHeading
        eyebrow="Kurz und unverbindlich"
        description="Ein paar Fragen, keine Wertung — jederzeit in den Einstellungen änderbar."
      >
        Bevor es losgeht
      </SectionHeading>
      <OnboardingFlow fragen={placementFragenFuerBrowser()} />
    </main>
  );
}
