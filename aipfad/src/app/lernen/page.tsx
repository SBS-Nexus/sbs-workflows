import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { Badge, Card, SectionHeading } from '@/components/ui/primitives';
import { prisma } from '@/server/db/prisma';

export const metadata: Metadata = {
  title: 'Lernen',
  description: 'Alle Module und Lektionen dieser Ausbaustufe — direkt nach Thema durchsuchbar.',
  alternates: { canonical: '/lernen' },
};

export const dynamic = 'force-dynamic';

export default async function LernenPage(): Promise<React.ReactElement> {
  const modules = await prisma.courseModule.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        where: { status: 'PUBLISHED' },
        orderBy: { order: 'asc' },
        select: { slug: true, title: true, estimatedMinutes: true },
      },
    },
  });

  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
          Bibliothek
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight">Direkt nach Thema</h1>
        <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
          Der geführte{' '}
          <Link
            href="/pfad"
            className="underline underline-offset-4 hover:text-signal-600 dark:hover:text-signal-300"
          >
            Pfad
          </Link>{' '}
          schlägt eine Reihenfolge vor — hier springst du direkt zu einem Thema. Beides greift auf
          dieselben Lektionen, denselben Fortschritt zu.
        </p>

        {modules.length === 0 ? (
          <Card className="mt-8">
            <p className="font-mono font-semibold">Noch keine Inhalte veröffentlicht.</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Die Datenbank wurde noch nicht geseedet (
              <code className="font-mono">npm run db:seed</code>).
            </p>
          </Card>
        ) : (
          <div className="mt-8 space-y-10">
            {modules.map((mod) => (
              <section key={mod.id} aria-labelledby={`modul-${mod.slug}`}>
                <SectionHeading id={`modul-${mod.slug}`} description={mod.summary}>
                  {mod.title}
                </SectionHeading>
                <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  {mod.lessons.map((lesson) => (
                    <li
                      key={lesson.slug}
                      className="flex items-center justify-between gap-4 py-3.5"
                    >
                      <Link
                        href={`/lektion/${lesson.slug}/1`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {lesson.title}
                      </Link>
                      <Badge tone="neutral">~{lesson.estimatedMinutes} Min.</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
