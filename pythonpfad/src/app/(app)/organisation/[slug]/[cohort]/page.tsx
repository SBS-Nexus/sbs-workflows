import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { notFound } from 'next/navigation';
import { isEnabled } from '@/server/feature-flags';
import { requireUser } from '@/server/auth/session';
import { getCohortOverview, getOrgContext } from '@/server/services/organisation-service';
import { can } from '@/domain/organisation/permissions';
import { Badge, Card, EmptyState, ProgressBar, SectionHeading } from '@/components/ui/primitives';
import { IllustrationEmpty } from '@/components/ui/illustration';

export const metadata: Metadata = { title: 'Kohorte' };

/**
 * Stand einer Kohorte.
 *
 * Die Seite ist so aufgebaut, dass zuerst kommt, was der Lehrkraft für den
 * nächsten Unterricht hilft: woran die Gruppe hängt. Die Einzelansicht steht
 * darunter und ist meist kurz – sie enthält nur Personen, die ausdrücklich
 * zugestimmt haben.
 */
export default async function CohortPage({
  params,
}: {
  params: Promise<{ slug: string; cohort: string }>;
}): Promise<React.ReactElement> {
  const { slug, cohort: cohortSlug } = await params;
  // Abschaltbar für Installationen, die ausschließlich Einzelkonten führen.
  if (!isEnabled('ORGANISATIONEN')) notFound();
  const user = await requireUser();

  const context = await getOrgContext(user.id, slug);
  if (!context || !can(context.role, 'kohorte.summen-lesen')) notFound();

  const overview = await getCohortOverview(context, cohortSlug);
  if (!overview) notFound();

  const { insights } = overview;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <Link href="/organisation" className="underline">
            Organisationen
          </Link>
          <Icon name="vor" size={13} />
          <Link href={`/organisation/${slug}`} className="underline">
            {context.organizationName}
          </Link>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{overview.cohort.name}</h1>
          {overview.cohort.archivedAt ? <Badge tone="neutral">archiviert</Badge> : null}
        </div>
        {overview.cohort.description ? (
          <p className="mt-2 text-[var(--text-muted)]">{overview.cohort.description}</p>
        ) : null}
      </header>

      <Card>
        <p className="text-[0.9375rem]">{insights.guidance}</p>
      </Card>

      {insights.aggregates === null ? (
        <EmptyState
          illustration={<IllustrationEmpty />}
          title="Noch keine Auswertung"
          description={`Diese Kohorte hat ${insights.memberCount} ${insights.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}. Summenwerte werden erst ab drei angezeigt – bei weniger wären es keine Summen mehr, sondern Aussagen über einzelne Menschen.`}
        />
      ) : (
        <>
          <section aria-labelledby="summen">
            <SectionHeading
              id="summen"
              description="Median statt Durchschnitt: Eine einzelne sehr aktive Person würde den Durchschnitt so weit anheben, dass er die Gruppe nicht mehr beschreibt."
            >
              Wo die Gruppe steht
            </SectionHeading>
            <dl className="grid gap-3 sm:grid-cols-3">
              <Card>
                <dt className="text-sm text-[var(--text-muted)]">Mitglieder</dt>
                <dd className="mt-1 text-2xl font-bold">{insights.memberCount}</dd>
              </Card>
              <Card>
                <dt className="text-sm text-[var(--text-muted)]">Lektionen (Median)</dt>
                <dd className="mt-1 text-2xl font-bold">
                  {insights.aggregates.lessonsCompletedMedian}
                </dd>
              </Card>
              <Card>
                <dt className="text-sm text-[var(--text-muted)]">Aufgaben (Median)</dt>
                <dd className="mt-1 text-2xl font-bold">
                  {insights.aggregates.exercisesPassedMedian}
                </dd>
              </Card>
            </dl>
            <Card className="mt-3">
              <p className="text-sm text-[var(--text-muted)]">In den letzten sieben Tagen aktiv</p>
              <div className="mt-2">
                <ProgressBar
                  value={Math.round(insights.aggregates.activeShareLast7Days * 100)}
                  label={`${Math.round(insights.aggregates.activeShareLast7Days * 100)} Prozent der Kohorte waren in den letzten sieben Tagen aktiv`}
                />
              </div>
              <p className="mt-1 text-sm tabular-nums">
                {Math.round(insights.aggregates.activeShareLast7Days * 100)} Prozent
              </p>
            </Card>
          </section>

          <section aria-labelledby="haengt">
            <SectionHeading
              id="haengt"
              description="Anteil derer, die das Konzept begonnen haben und noch unter der tragfähigen Schwelle liegen. Wer es nie begonnen hat, hängt nicht daran."
            >
              Woran die Gruppe hängt
            </SectionHeading>
            {insights.hardestConcepts.length === 0 ? (
              <Card>
                <p className="text-[var(--text-muted)]">
                  Zurzeit gibt es kein Konzept, an dem ein nennenswerter Teil der Kohorte hängt.
                </p>
              </Card>
            ) : (
              <ul className="space-y-2">
                {insights.hardestConcepts.map((concept) => (
                  <Card as="li" key={concept.slug}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{concept.name}</p>
                      <span className="text-sm tabular-nums text-[var(--text-muted)]">
                        {Math.round(concept.strugglingShare * 100)} Prozent noch darunter
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar
                        value={Math.round(concept.strugglingShare * 100)}
                        label={`${concept.name}: ${Math.round(concept.strugglingShare * 100)} Prozent liegen noch unter der Schwelle`}
                        tone="caution"
                      />
                    </div>
                  </Card>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="einzeln">
        <SectionHeading
          id="einzeln"
          description="Hier erscheint nur, wer der namentlichen Anzeige ausdrücklich zugestimmt hat. Die Zustimmung ist jederzeit widerrufbar."
        >
          Einzelansicht
        </SectionHeading>

        {overview.namedLearners.length === 0 ? (
          <Card>
            <p className="text-[var(--text-muted)]">
              {insights.consentedCount === 0
                ? 'Niemand aus dieser Kohorte hat der namentlichen Anzeige zugestimmt. Alle fließen ausschließlich in die Summenwerte oben ein.'
                : 'Für diese Ansicht fehlt die Berechtigung.'}
            </p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Stand der Personen, die der namentlichen Anzeige zugestimmt haben
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-left">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Name
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Lektionen
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Aufgaben
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Zuletzt aktiv
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overview.namedLearners.map((learner) => (
                    <tr
                      key={learner.name}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <th scope="row" className="py-2 pr-4 text-left font-normal">
                        {learner.name}
                      </th>
                      <td className="py-2 pr-4 tabular-nums">{learner.lessonsCompleted}</td>
                      <td className="py-2 pr-4 tabular-nums">{learner.exercisesPassed}</td>
                      <td className="py-2 text-[var(--text-muted)]">
                        {learner.lastActiveAt
                          ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(
                              learner.lastActiveAt,
                            )
                          : 'noch nicht'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
