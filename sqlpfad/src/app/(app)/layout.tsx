import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { AppNav } from '@/components/navigation/app-nav';
import { prisma } from '@/server/db/prisma';
import { DarstellungAbgleich } from '@/components/profil/darstellung-abgleich';
import type { Theme } from '@/lib/preferences/appearance';

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

  /*
   * Die am Konto gespeicherte Darstellung. Sie wird an den Browser
   * weitergereicht, damit die Bewegungsreduktion auch auf einem neuen Gerät
   * gilt - sie ist eine Barrierefreiheitseinstellung und gehört zur Person,
   * nicht zum Browser.
   */
  const darstellung = await prisma.user.findUnique({
    where: { id: user.id },
    select: { theme: true, reduceMotion: true },
  });
  const theme: Theme =
    darstellung?.theme === 'light' || darstellung?.theme === 'dark' ? darstellung.theme : 'system';

  return (
    <div className="min-h-dvh">
      <DarstellungAbgleich theme={theme} reduceMotion={darstellung?.reduceMotion ?? false} />
      <AppNav istAdmin={user.role === 'ADMIN'} />
      <main id="hauptinhalt" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
