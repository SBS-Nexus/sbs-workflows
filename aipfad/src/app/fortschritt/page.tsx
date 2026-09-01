import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { veroeffentlichteAufgabe, veroeffentlichteLektion } from '@/server/content/publication';
import { AppHeader } from '@/components/app/app-header';
import { Card, EmptyState, ProgressBar, SectionHeading } from '@/components/ui/primitives';
import { describeMastery } from '@/domain/mastery/mastery';

export const metadata: Metadata = {
  title: 'Fortschritt',
  alternates: { canonical: '/fortschritt' },
};

/**
 * Bänder statt Zahlen (docs/LERNMODELL.md §2.5) — der Kompetenzwert wird nie
 * als Prozentzahl mit Nachkommastelle angezeigt, nur als Band mit Bedeutung
 * und nächstem Schritt. Keine Rangliste, keine künstliche Dringlichkeit.
 */
export default async function FortschrittPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (!user.onboardingCompleted) redirect('/onboarding');

  const [mastery, dueReviews, completedLessons, totalLessons] = await Promise.all([
    prisma.conceptMastery.findMany({
      where: { userId: user.id },
      include: { concept: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.reviewQueueItem.count({
      // Gleicher Filter wie in `getNextStep()` und im Wiederholungscenter,
      // damit die angezeigte Zahl zu dem passt, was dort tatsächlich
      // erscheint (Codex-Review auf PR #29).
      where: {
        userId: user.id,
        completedAt: null,
        dueAt: { lte: new Date() },
        exercise: veroeffentlichteAufgabe,
      },
    }),
    // Zähler und Nenner müssen denselben Bestand meinen: Wird ein Modul
    // zurückgezogen, verschwinden seine Lektionen aus der Gesamtzahl — dann
    // dürfen bereits abgeschlossene Lektionen daraus auch nicht mehr
    // mitgezählt werden, sonst steht dort "5 von 4" (Codex-Review auf PR #29).
    prisma.lessonProgress.count({
      where: { userId: user.id, state: 'COMPLETED', lesson: veroeffentlichteLektion },
    }),
    prisma.lesson.count({ where: veroeffentlichteLektion }),
  ]);

  return (
    <>
      <AppHeader userName={user.name} />
      <main id="hauptinhalt" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Fortschritt"
          description="Orientierungswerte, keine Messung. Jede Veränderung hat eine nachvollziehbare Begründung."
        >
          Wie es steht
        </SectionHeading>

        <Card className="mb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-sm font-semibold">Lektionen abgeschlossen</p>
            <p className="font-mono text-sm text-[var(--fg-muted)]">
              {completedLessons} von {totalLessons}
            </p>
          </div>
          <div className="mt-2">
            <ProgressBar
              value={completedLessons}
              max={Math.max(totalLessons, 1)}
              label={`${completedLessons} von ${totalLessons} Lektionen abgeschlossen`}
            />
          </div>
          {dueReviews > 0 ? (
            <p className="mt-4 text-sm">
              <span className="font-semibold text-signal-600 dark:text-signal-300">
                {dueReviews} fällige Wiederholung{dueReviews === 1 ? '' : 'en'}
              </span>{' '}
              warten — Festigen geht vor Erweitern.
            </p>
          ) : null}
        </Card>

        <h2 className="mb-3 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[var(--fg-muted)]">
          Konzepte
        </h2>

        {mastery.length === 0 ? (
          <EmptyState
            title="Noch keine Übung"
            description="Sobald du die erste Aufgabe bearbeitest, erscheint hier dein Kompetenzstand je Konzept."
          />
        ) : (
          <ul className="space-y-3">
            {mastery.map((entry) => {
              const description = describeMastery(entry.masteryScore);
              return (
                <li
                  key={entry.id}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono font-semibold">{entry.concept.name}</p>
                    <span className="font-mono text-xs font-semibold text-signal-600 dark:text-signal-300">
                      {description.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{description.meaning}</p>
                  <p className="mt-1 text-sm">{description.nextStep}</p>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
