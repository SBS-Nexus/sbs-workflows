import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { AppNav } from '@/components/navigation/app-nav';

/**
 * Rahmen für alle angemeldeten Bereiche.
 *
 * Die Prüfung auf eine Sitzung passiert hier zentral. Die Middleware davor
 * schützt zusätzlich, verlässt sich aber bewusst nicht allein darauf: Die
 * eigentliche Berechtigung wird immer dort geprüft, wo die Daten gelesen werden.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');

  const dueReviews = await prisma.reviewQueueItem.count({
    where: { userId: user.id, dueAt: { lte: new Date() } },
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <AppNav userName={user.name} isAdmin={user.role === 'ADMIN'} dueReviews={dueReviews} />
      {/* Unten Platz lassen, damit die mobile Navigationsleiste nichts verdeckt. */}
      <main id="hauptinhalt" className="flex-1 pb-16 sm:pb-0">
        {children}
      </main>
    </div>
  );
}
