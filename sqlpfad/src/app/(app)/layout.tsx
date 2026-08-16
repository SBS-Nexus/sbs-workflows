import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { AppNav } from '@/components/navigation/app-nav';

/**
 * Rahmen des angemeldeten Bereichs.
 *
 * Die Prüfung steht hier und nicht nur in `src/proxy.ts`. Die vorgelagerte
 * Prüfung dort sieht ausschließlich, ob ein Cookie existiert – ein
 * ausgedachter Wert kommt daran vorbei. Erst hier wird die Sitzung tatsächlich
 * gegen die Datenbank geprüft.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (!user.onboardingCompleted) redirect('/onboarding');

  return (
    <div className="min-h-dvh">
      <AppNav />
      <main id="hauptinhalt" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
