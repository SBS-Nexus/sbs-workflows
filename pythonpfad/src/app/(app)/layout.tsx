import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { AppNav } from '@/components/navigation/app-nav';
import { CommandCenterProvider } from '@/components/navigation/command-center';
import { ToastProvider } from '@/components/ui/toast';
import { buildCommandIndex } from '@/server/services/navigation-service';

/**
 * Rahmen für alle angemeldeten Bereiche.
 *
 * Die Prüfung auf eine Sitzung passiert hier zentral. Die Middleware davor
 * schützt zusätzlich, verlässt sich aber bewusst nicht allein darauf: Die
 * eigentliche Berechtigung wird immer dort geprüft, wo die Daten gelesen werden.
 *
 * Reihenfolge der Anbieter: Die Befehlspalette meldet Umschaltvorgänge über
 * Kurzmeldungen, braucht also einen ToastProvider über sich.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');

  const [dueReviews, commandIndex] = await Promise.all([
    prisma.reviewQueueItem.count({
      where: { userId: user.id, dueAt: { lte: new Date() } },
    }),
    buildCommandIndex(user.id),
  ]);

  return (
    <ToastProvider>
      <CommandCenterProvider entries={commandIndex}>
        <div className="flex min-h-dvh flex-col">
          <AppNav userName={user.name} isAdmin={user.role === 'ADMIN'} dueReviews={dueReviews} />
          {/* Unten Platz lassen, damit die mobile Navigationsleiste nichts verdeckt. */}
          <main id="hauptinhalt" className="flex-1 pb-16 sm:pb-0">
            {children}
          </main>
        </div>
      </CommandCenterProvider>
    </ToastProvider>
  );
}
