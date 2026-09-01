import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { getOrCreatePath, getNextStep } from '@/server/services/path-service';
import { AppHeader } from '@/components/app/app-header';
import { Badge, ButtonLink, Card, ProgressBar, SectionHeading } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Dein Lernpfad',
  alternates: { canonical: '/pfad' },
};

/**
 * Geführter Pfad: eine Übersicht der vier Module dieser Ausbaustufe mit
 * Fortschritt je Lektion, plus ein hervorgehobener "nächster Schritt"
 * (fällige Wiederholung → begonnene Lektion → nächste offene Lektion).
 */
export default async function PathPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (!user.onboardingCompleted) redirect('/onboarding');

  const path = await getOrCreatePath(user.id);
  const nextStep = await getNextStep(user.id);

  const course = await prisma.course.findUnique({
    where: { id: path.courseId },
    include: {
      modules: {
        where: { status: 'PUBLISHED' },
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { status: 'PUBLISHED' },
            orderBy: { order: 'asc' },
            include: { progress: { where: { userId: user.id } } },
          },
        },
      },
    },
  });

  const totalLessons = course?.modules.flatMap((m) => m.lessons).length ?? 0;
  const completedLessons =
    course?.modules
      .flatMap((m) => m.lessons)
      .filter((lesson) => lesson.progress[0]?.state === 'COMPLETED').length ?? 0;

  return (
    <>
      <AppHeader userName={user.name} />
      <main id="hauptinhalt" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <SectionHeading eyebrow="Dein Pfad" description={path.rationale}>
          {path.title}
        </SectionHeading>

        <div className="mb-8 space-y-2">
          <ProgressBar
            value={completedLessons}
            max={Math.max(totalLessons, 1)}
            label={`${completedLessons} von ${totalLessons} Lektionen abgeschlossen`}
          />
          <p className="text-sm text-[var(--fg-muted)]">
            {completedLessons} von {totalLessons} Lektionen abgeschlossen
          </p>
        </div>

        {nextStep.kind === 'review' ? (
          <Card className="mb-8 border-signal-500">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
              Nächster Schritt
            </p>
            <p className="mt-2 font-semibold">
              {nextStep.reviewCount} fällige Wiederholung{nextStep.reviewCount === 1 ? '' : 'en'}
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Festigen geht vor Erweitern — diese Aufgaben zuerst.
            </p>
            <ButtonLink href="/wiederholen" className="mt-4">
              Jetzt wiederholen
            </ButtonLink>
          </Card>
        ) : nextStep.kind === 'lesson' && nextStep.lessonSlug ? (
          <Card className="mb-8 border-signal-500">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
              Nächster Schritt
            </p>
            <ButtonLink href={`/lektion/${nextStep.lessonSlug}/${nextStep.step}`} className="mt-3">
              Weiterlernen
            </ButtonLink>
          </Card>
        ) : (
          <Card className="mb-8">
            <p className="font-semibold">Alle Lektionen dieser Ausbaustufe abgeschlossen.</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Schau in der Bibliothek vorbei oder wiederhole gezielt einzelne Konzepte.
            </p>
          </Card>
        )}

        <div className="space-y-6">
          {course?.modules.map((mod) => {
            const moduleCompleted = mod.lessons.filter(
              (l) => l.progress[0]?.state === 'COMPLETED',
            ).length;
            return (
              <Card key={mod.id} as="section" aria-labelledby={`modul-${mod.slug}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3
                    id={`modul-${mod.slug}`}
                    className="font-mono text-lg font-bold tracking-tight"
                  >
                    {mod.title}
                  </h3>
                  <Badge tone="neutral">
                    {moduleCompleted}/{mod.lessons.length}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{mod.summary}</p>
                <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  {mod.lessons.map((lesson) => {
                    const state = lesson.progress[0]?.state ?? 'NOT_STARTED';
                    return (
                      <li key={lesson.id} className="flex items-center justify-between gap-3 py-3">
                        <Link
                          href={`/lektion/${lesson.slug}/1`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {lesson.title}
                        </Link>
                        <Badge tone={state === 'COMPLETED' ? 'success' : 'neutral'}>
                          {state === 'COMPLETED'
                            ? 'Abgeschlossen'
                            : state === 'IN_PROGRESS'
                              ? 'Begonnen'
                              : 'Offen'}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
