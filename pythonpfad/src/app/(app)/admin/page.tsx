import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { parseContent, contentStats } from '@/content';
import { Badge, Callout, Card, SectionHeading, cx } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Redaktion' };

const STATUS_TONE = {
  DRAFT: 'neutral',
  REVIEW: 'caution',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',
} as const;

/**
 * Redaktionsbereich.
 *
 * Rollenbasiert (nur ADMIN). Er zeigt den Veröffentlichungsstand aller Inhalte
 * und das Ergebnis der Inhaltsvalidierung. Die Validierung ist dieselbe, die
 * auch das Seed-Skript ausführt – ein Inhalt, der hier Fehler zeigt, lässt sich
 * gar nicht erst einspielen.
 */
export default async function AdminPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (user.role !== 'ADMIN') redirect('/lernen');

  const content = parseContent();
  const stats = contentStats();

  const [modules, projects, reviewSets, analytics] = await Promise.all([
    prisma.courseModule.findMany({
      include: {
        lessons: {
          include: { _count: { select: { exercises: true } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    }),
    prisma.project.findMany({ orderBy: { difficulty: 'asc' } }),
    prisma.reviewSet.findMany({ include: { _count: { select: { items: true } } } }),
    prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      _count: { _all: true },
      orderBy: { _count: { eventType: 'desc' } },
      take: 12,
    }),
  ]);

  const errors = content.validation.issues.filter((i) => i.severity === 'error');
  const warnings = content.validation.issues.filter((i) => i.severity === 'warning');

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Redaktion</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Übersicht über Inhalte, Veröffentlichungsstand und Prüfergebnisse. Inhalte werden als
          versionierte Dateien gepflegt und über das Seed-Skript eingespielt – das hält Redaktion
          und Datenbank nachvollziehbar synchron.
        </p>
      </header>

      {/* --- Validierung --------------------------------------------------- */}
      <section aria-labelledby="validierung">
        <SectionHeading
          id="validierung"
          description="Geprüft werden: vorhandene Lernziele, gültige Konzeptverweise, ausführbare Tests, aufsteigende Hinweisstufen, Platzhaltertexte, geschätzte Dauer und Abbau der Hilfen im Lektionsverlauf."
        >
          Inhaltsvalidierung
        </SectionHeading>

        {errors.length === 0 && warnings.length === 0 ? (
          <Callout tone="success" title="Alle Prüfungen bestanden">
            Sämtliche Inhalte erfüllen die Veröffentlichungsregeln.
          </Callout>
        ) : (
          <div className="space-y-3">
            {errors.length > 0 ? (
              <Callout tone="alert" title={`${errors.length} Fehler – Veröffentlichung blockiert`}>
                <ul className="mt-1 space-y-1 text-sm">
                  {errors.map((issue, index) => (
                    <li key={index}>
                      <code className="font-mono">{issue.where}</code>: {issue.message}
                    </li>
                  ))}
                </ul>
              </Callout>
            ) : null}
            {warnings.length > 0 ? (
              <Callout tone="caution" title={`${warnings.length} Hinweise`}>
                <ul className="mt-1 space-y-1 text-sm">
                  {warnings.map((issue, index) => (
                    <li key={index}>
                      <code className="font-mono">{issue.where}</code>: {issue.message}
                    </li>
                  ))}
                </ul>
              </Callout>
            ) : null}
          </div>
        )}
      </section>

      {/* --- Kennzahlen ------------------------------------------------------ */}
      <section aria-labelledby="bestand">
        <SectionHeading id="bestand">Bestand</SectionHeading>
        <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: 'Module', value: stats.modules },
            { label: 'Lektionen', value: stats.lessons },
            { label: 'Aufgaben', value: stats.exercises },
            { label: 'Interaktionsformen', value: stats.exerciseKinds },
            { label: 'Aufgabentypen', value: stats.exerciseTypes },
            { label: 'Konzepte', value: stats.concepts },
            { label: 'Wiederholungssets', value: stats.reviewSets },
            { label: 'Projekte', value: stats.projects },
          ].map((item) => (
            <Card key={item.label}>
              <dt className="text-sm text-[var(--text-muted)]">{item.label}</dt>
              <dd className="mt-1 text-2xl font-bold">{item.value}</dd>
            </Card>
          ))}
        </dl>
      </section>

      {/* --- Inhalte --------------------------------------------------------- */}
      <section aria-labelledby="inhalte">
        <SectionHeading id="inhalte">Module und Lektionen</SectionHeading>
        <div className="space-y-4">
          {modules.map((mod) => (
            <Card as="section" key={mod.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {mod.order + 1}. {mod.title}
                </h3>
                <Badge tone={STATUS_TONE[mod.status]}>{mod.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{mod.rationale}</p>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <caption className="sr-only">Lektionen im Modul {mod.title}</caption>
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      <th scope="col" className="py-1.5 pr-3 font-medium">
                        Lektion
                      </th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">
                        Aufgaben
                      </th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">
                        Dauer
                      </th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">
                        Version
                      </th>
                      <th scope="col" className="py-1.5 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mod.lessons.map((lesson) => (
                      <tr key={lesson.id} className="border-b border-[var(--border)]">
                        <td className="py-1.5 pr-3">{lesson.title}</td>
                        <td
                          className={cx(
                            'py-1.5 pr-3',
                            lesson._count.exercises === 0 && 'text-[var(--alert)]',
                          )}
                        >
                          {lesson._count.exercises}
                        </td>
                        <td className="py-1.5 pr-3">{lesson.estimatedMinutes} min</td>
                        <td className="py-1.5 pr-3 font-mono text-xs">{lesson.contentVersion}</td>
                        <td className="py-1.5">
                          <Badge tone={STATUS_TONE[lesson.status]}>{lesson.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="weitere">
        <SectionHeading id="weitere">Projekte und Wiederholungssets</SectionHeading>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Projekte</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {projects.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-2">
                  <span>{project.title}</span>
                  <Badge tone={STATUS_TONE[project.status]}>{project.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold">Wiederholungssets</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {reviewSets.map((set) => (
                <li key={set.id} className="flex items-center justify-between gap-2">
                  <span>
                    {set.title}{' '}
                    <span className="text-[var(--text-muted)]">({set._count.items} Aufgaben)</span>
                  </span>
                  <Badge tone={STATUS_TONE[set.status]}>{set.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* --- Analyse ---------------------------------------------------------- */}
      <section aria-labelledby="analyse">
        <SectionHeading
          id="analyse"
          description="Ausschließlich anonyme Produktereignisse ohne Nutzerbezug. Eine Zuordnung zu einzelnen Personen ist technisch nicht möglich."
        >
          Produktanalyse
        </SectionHeading>
        <Card>
          {analytics.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Noch keine Ereignisse erfasst.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {analytics.map((row) => (
                <li key={row.eventType} className="flex items-center justify-between gap-2">
                  <code className="font-mono">{row.eventType}</code>
                  <span className="text-[var(--text-muted)]">{row._count._all}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
