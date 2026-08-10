import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { getDashboardData } from '@/server/services/progress-service';
import { getMotivationSummary } from '@/server/services/motivation-service';
import { LearningRhythm } from '@/components/motivation/learning-rhythm';
import { LessonTrail, type TrailModule } from '@/components/path/lesson-trail';
import { Icon } from '@/components/ui/icon';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';
import { prisma } from '@/server/db/prisma';
import { ButtonLink, Callout, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { EckBoegen, PunktStreuung } from '@/components/ui/zierformen';
import { IllustrationSequence } from '@/components/ui/illustration';

export const metadata: Metadata = { title: 'Mein Lernpfad' };

export default async function LearningPathPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  if (!user.onboardingCompleted) redirect('/onboarding');

  const [data, motivation] = await Promise.all([
    getDashboardData(user.id),
    getMotivationSummary(user.id),
  ]);

  if (data.lessons.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <EmptyState
          illustration={<IllustrationSequence />}
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
  const anteil = Math.round((completed / data.lessons.length) * 100);

  const trailModules: TrailModule[] = modules
    .map((mod) => ({
      slug: mod.slug,
      title: mod.title,
      summary: mod.summary,
      order: mod.order,
      lessons: mod.lessons
        .filter((lesson) => stateBySlug.has(lesson.slug))
        .map((lesson) => ({
          slug: lesson.slug,
          title: lesson.title,
          estimatedMinutes: lesson.estimatedMinutes,
          state: stateBySlug.get(lesson.slug) ?? 'NOT_STARTED',
        })),
    }))
    .filter((mod) => mod.lessons.length > 0);

  /*
   * Die Bereichsfarbe gilt für die ganze Seite, nicht nur für den Kopf. Ohne
   * sie erbt alles darunter die allgemeine Akzentfarbe – der Kopf wäre in der
   * Bereichsfarbe und die Überschrift zwei Zentimeter darunter blau. Von hier
   * aus greifen Abschnittsüberschriften, Symbolkacheln und Hervorhebungen auf
   * `--akzent` zu.
   */
  return (
    <div
      style={themeStyle(moduleTheme(0))}
      className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Kopf: der nächste Schritt, groß und farbig                          */}
      {/* ------------------------------------------------------------------ */}
      <header className="gradient-hero relative isolate overflow-hidden rounded-3xl p-6 text-white sm:p-8 muster-raster-hell muster-verlauf">
        <EckBoegen
          farbe="#ffffff"
          className="pointer-events-none absolute -right-8 -top-12 -z-10 size-72 opacity-60"
        />
        <PunktStreuung
          farbe="#ffffff"
          className="pointer-events-none absolute -bottom-8 -left-8 -z-10 size-44 opacity-70"
        />
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">
          {data.path?.title ?? 'Mein Lernpfad'}
        </h1>
        {data.path?.rationale ? (
          <p className="mt-3 max-w-prose text-white/80">{data.path.rationale}</p>
        ) : null}

        {/* Fortschritt. Der Wert steht als Text daneben – der Balken allein
            wäre eine rein visuelle Angabe. */}
        <div className="mt-6">
          <p className="flex items-baseline justify-between gap-3 text-sm font-semibold">
            <span>
              {completed} von {data.lessons.length} Lektionen abgeschlossen
            </span>
            <span className="text-2xl font-black tabular-nums">{anteil}&nbsp;%</span>
          </p>
          <div
            role="progressbar"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={data.lessons.length}
            aria-label={`Lernpfad: ${completed} von ${data.lessons.length} Lektionen abgeschlossen`}
            className="mt-2 h-3 overflow-hidden rounded-full bg-white/20"
          >
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500"
              style={{ width: `${anteil}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20"
          >
            <Icon name={data.nextStep.kind === 'review' ? 'wiederholen' : 'abspielen'} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">
              Nächster Schritt
            </p>
            <p className="truncate text-lg font-bold">{data.nextStep.label}</p>
          </div>
          <ButtonLink href={data.nextStep.href} variant="onDark">
            {data.nextStep.kind === 'review' ? 'Wiederholen' : 'Öffnen'}
            <Icon name="vor" size={16} />
          </ButtonLink>
        </div>
      </header>

      <LearningRhythm rhythm={motivation.rhythm} variant="compact" />

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
        <SectionHeading
          emoji="lektion"
          description="Die Reihenfolge ergibt sich aus deiner Einstufung. Frühere Lektionen sind Voraussetzung für spätere."
        >
          Alle Lektionen
        </SectionHeading>

        <LessonTrail modules={trailModules} />
      </section>
    </div>
  );
}
