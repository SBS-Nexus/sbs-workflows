import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { getPublicExercise, getRevealedHints } from '@/server/services/exercise-service';
import { AppHeader } from '@/components/app/app-header';
import { EmptyState, SectionHeading } from '@/components/ui/primitives';
import { ExerciseRunner } from '@/components/exercise/exercise-runner';

export const metadata: Metadata = {
  title: 'Wiederholen',
  alternates: { canonical: '/wiederholen' },
};

/**
 * Wiederholungscenter: höchstens zwölf fällige Aufgaben je Runde
 * (docs/LERNMODELL.md §3.4), überfällige zuerst. Jede Aufgabe zeigt die
 * Begründung, warum sie gerade jetzt dran ist.
 */
export default async function WiederholenPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (!user.onboardingCompleted) redirect('/onboarding');

  const dueItems = await prisma.reviewQueueItem.findMany({
    where: { userId: user.id, completedAt: null, dueAt: { lte: new Date() } },
    orderBy: { dueAt: 'asc' },
    take: 12,
    include: { exercise: true },
  });

  const exercises = await Promise.all(
    dueItems.map(async (item) => ({
      reason: item.reason,
      exercise: await getPublicExercise(item.exercise.slug),
      // Bereits gesehene Hinweise mitgeben, damit die Leiter nicht bei jedem
      // Aufruf wieder bei null beginnt (Codex-Review auf PR #29).
      revealedHints: await getRevealedHints(user.id, item.exercise.slug),
    })),
  );

  return (
    <>
      <AppHeader userName={user.name} />
      <main id="hauptinhalt" className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Wiederholen"
          description="Höchstens zwölf Aufgaben je Runde — überfällige zuerst. Nichts geht verloren, wenn du ein paar Tage pausierst."
        >
          Festigen
        </SectionHeading>

        {exercises.length === 0 ? (
          <EmptyState
            title="Heute nichts fällig"
            description="Das ist völlig in Ordnung — komm zurück, sobald eine Wiederholung ansteht."
          />
        ) : (
          <ol className="space-y-8">
            {exercises.map(({ reason, exercise, revealedHints }, index) =>
              exercise ? (
                <li
                  key={exercise.id}
                  className="border-t border-[var(--border)] pt-6 first:border-t-0 first:pt-0"
                >
                  <p className="mb-3 font-mono text-xs text-[var(--fg-muted)]">
                    {index + 1}/{exercises.length} · {reason}
                  </p>
                  <p className="mb-4 font-medium">{exercise.prompt}</p>
                  <ExerciseRunner
                    exercise={exercise}
                    isReview
                    initialRevealedHints={revealedHints}
                  />
                </li>
              ) : null,
            )}
          </ol>
        )}
      </main>
    </>
  );
}
