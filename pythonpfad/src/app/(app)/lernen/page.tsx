import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { getDashboardData } from '@/server/services/progress-service';
import { prisma } from '@/server/db/prisma';
import {
  Badge,
  ButtonLink,
  Callout,
  Card,
  EmptyState,
  ProgressBar,
  SectionHeading,
  cx,
} from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Mein Lernpfad' };

export default async function LearningPathPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  if (!user.onboardingCompleted) redirect('/onboarding');

  const data = await getDashboardData(user.id);

  if (data.lessons.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <EmptyState
          title="Noch kein Lernpfad vorhanden"
          description="Die Einstufung stellt deinen persönlichen Pfad zusammen. Sie dauert nur wenige Minuten."
          action={<ButtonLink href="/einstufung">Zur Einstufung</ButtonLink>}
        />
      </div>
    );
  }

  // Lektionen nach Modul gruppieren, damit die Struktur sichtbar bleibt.
  const modules = await prisma.courseModule.findMany({
    where: { status: 'PUBLISHED' },
    include: { lessons: { where: { status: 'PUBLISHED' }, orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  });

  const stateBySlug = new Map(data.lessons.map((l) => [l.slug, l.state]));
  const completed = data.totals.lessonsCompleted;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {data.path?.title ?? 'Mein Lernpfad'}
        </h1>
        {data.path?.rationale ? (
          <p className="mt-3 max-w-prose text-[var(--text-muted)]">{data.path.rationale}</p>
        ) : null}
      </header>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Nächster Schritt</p>
            <p className="text-lg font-semibold">{data.nextStep.label}</p>
          </div>
          <ButtonLink href={data.nextStep.href}>
            {data.nextStep.kind === 'review' ? 'Wiederholen' : 'Öffnen'}
          </ButtonLink>
        </div>
        <div className="mt-4 space-y-1.5">
          <p className="text-sm">
            {completed} von {data.lessons.length} Lektionen abgeschlossen
          </p>
          <ProgressBar
            value={completed}
            max={data.lessons.length}
            label={`Lernpfad: ${completed} von ${data.lessons.length} Lektionen abgeschlossen`}
            tone="success"
          />
        </div>
      </Card>

      {data.dueReviews > 0 ? (
        <Callout tone="info" title="Wiederholungen stehen an">
          {data.dueReviews === 1
            ? 'Eine Aufgabe ist heute zur Wiederholung fällig.'
            : `${data.dueReviews} Aufgaben sind heute zur Wiederholung fällig.`}{' '}
          Der Abruf nach einer Pause festigt deutlich besser als erneutes Lesen.{' '}
          <Link href="/wiederholen" className="font-medium underline">
            Zum Wiederholungscenter
          </Link>
        </Callout>
      ) : null}

      <section>
        <SectionHeading description="Die Reihenfolge ergibt sich aus deiner Einstufung. Frühere Lektionen sind Voraussetzung für spätere.">
          Alle Lektionen
        </SectionHeading>

        <div className="space-y-6">
          {modules.map((mod) => {
            const lessonsInModule = mod.lessons.filter((l) => stateBySlug.has(l.slug));
            if (lessonsInModule.length === 0) return null;

            const doneInModule = lessonsInModule.filter(
              (l) => stateBySlug.get(l.slug) === 'COMPLETED',
            ).length;

            return (
              <section key={mod.id} aria-labelledby={`modul-${mod.slug}`}>
                <div className="mb-3">
                  <h3 id={`modul-${mod.slug}`} className="flex items-center gap-2 font-semibold">
                    {mod.title}
                    <Badge tone={doneInModule === lessonsInModule.length ? 'success' : 'neutral'}>
                      {doneInModule}/{lessonsInModule.length}
                    </Badge>
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{mod.summary}</p>
                </div>

                <ol className="space-y-2">
                  {lessonsInModule.map((lesson, index) => {
                    const state = stateBySlug.get(lesson.slug) ?? 'NOT_STARTED';
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/lernen/${lesson.slug}`}
                          className={cx(
                            'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                            state === 'COMPLETED'
                              ? 'border-[var(--success)] bg-[var(--success-soft)]'
                              : state === 'IN_PROGRESS'
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                                : 'border-[var(--border)] hover:bg-[var(--surface-sunken)]',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-current text-sm font-semibold"
                          >
                            {state === 'COMPLETED' ? '✓' : index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{lesson.title}</span>
                            <span className="block text-sm text-[var(--text-muted)]">
                              etwa {lesson.estimatedMinutes} Minuten
                              {state === 'COMPLETED'
                                ? ' · abgeschlossen'
                                : state === 'IN_PROGRESS'
                                  ? ' · begonnen'
                                  : ''}
                            </span>
                          </span>
                          <span aria-hidden="true" className="shrink-0 text-[var(--text-muted)]">
                            →
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
