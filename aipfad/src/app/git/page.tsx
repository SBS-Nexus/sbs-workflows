import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { Badge, ButtonLink, Card, SectionHeading } from '@/components/ui/primitives';
import { prisma } from '@/server/db/prisma';
import { veroeffentlichtesModul } from '@/server/content/publication';

export const metadata: Metadata = {
  title: 'Git & GitHub',
  description:
    'Git und GitHub als eigenes Lerngebiet: Versionsverwaltung, Branches, Remotes, Pull Requests, Reviews und CI.',
  alternates: { canonical: '/git' },
};

export const dynamic = 'force-dynamic';

const GIT_MODULES = ['git-grundlagen', 'git-zusammenarbeit'] as const;

export default async function GitPathPage(): Promise<React.ReactElement> {
  const modules = await prisma.courseModule.findMany({
    where: {
      ...veroeffentlichtesModul,
      slug: { in: [...GIT_MODULES] },
    },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        where: { status: 'PUBLISHED' },
        orderBy: { order: 'asc' },
        select: { slug: true, title: true, estimatedMinutes: true },
      },
    },
  });

  const lessonCount = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const minutes = modules.reduce(
    (sum, module) =>
      sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.estimatedMinutes, 0),
    0,
  );

  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt">
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
            Lernpfad · Softwarearbeit
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-[-0.035em] sm:text-5xl">
            Git &amp; GitHub verstehen, bevor du AI damit arbeiten lässt.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[var(--fg-muted)]">
            Commits, Branches, Remotes und Pull Requests sind das Arbeitsmodell hinter moderner
            Softwareentwicklung. Wer AI-Coding kontrollieren will, muss diesen Verlauf lesen,
            prüfen und rückgängig machen können.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Badge tone="neutral">{lessonCount} Lektionen</Badge>
            <Badge tone="neutral">~{minutes} Min.</Badge>
            <Badge tone="success">Verfügbar</Badge>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/lektion/warum-versionsverwaltung/1" size="lg">
              Mit Git-Grundlagen starten
            </ButtonLink>
            <ButtonLink href="/lernen" variant="secondary" size="lg">
              Gesamte Bibliothek
            </ButtonLink>
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--bg-raised)]">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <SectionHeading
              eyebrow="Curriculum"
              description="Zuerst das lokale Modell von Git, danach Zusammenarbeit über GitHub."
            >
              Zwei Module, ein zusammenhängendes Arbeitsmodell
            </SectionHeading>

            <div className="mt-8 space-y-6">
              {modules.map((module, moduleIndex) => (
                <Card
                  key={module.id}
                  as="section"
                  aria-labelledby={'git-module-' + module.slug}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
                        Modul {moduleIndex + 1}
                      </p>
                      <h2 id={'git-module-' + module.slug} className="mt-1 text-xl font-bold">
                        {module.title}
                      </h2>
                    </div>
                    <Badge tone="neutral">{module.lessons.length} Lektionen</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--fg-muted)]">{module.summary}</p>

                  <ol className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <li
                        key={lesson.slug}
                        className="flex items-center justify-between gap-4 py-3.5"
                      >
                        <Link
                          href={'/lektion/' + lesson.slug + '/1'}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {lessonIndex + 1}. {lesson.title}
                        </Link>
                        <span className="shrink-0 text-xs text-[var(--fg-muted)]">
                          ~{lesson.estimatedMinutes} Min.
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
              Warum das für AI wichtig ist
            </p>
            <h2 className="mt-2 text-xl font-bold">AI erzeugt Änderungen. Git macht sie prüfbar.</h2>
            <p className="mt-2 text-[var(--fg-muted)]">
              Der spätere AI-Coding-Pfad baut genau darauf auf: kleine Diffs, getrennte Branches,
              automatisierte Checks und Reviews statt blindem Übernehmen großer Änderungen.
            </p>
          </Card>
        </section>
      </main>
    </>
  );
}
