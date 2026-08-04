import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isEnabled } from '@/server/feature-flags';
import { requireUser } from '@/server/auth/session';
import { getAuditLog, getOrgContext, listCohorts } from '@/server/services/organisation-service';
import { ROLE_LABELS, can } from '@/domain/organisation/permissions';
import { Badge, Card, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { CohortAndInviteForms } from './cohort-and-invite-forms';

export const metadata: Metadata = { title: 'Organisation' };

export default async function OrganisationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  // Abschaltbar für Installationen, die ausschließlich Einzelkonten führen.
  if (!isEnabled('ORGANISATIONEN')) notFound();
  const user = await requireUser();

  const context = await getOrgContext(user.id, slug);
  // Bewusst „nicht gefunden" und nicht „kein Zugriff": Wer nicht dazugehört,
  // soll nicht erfahren, ob es diese Organisation überhaupt gibt.
  if (!context) notFound();

  const [cohorts, auditLog] = await Promise.all([
    listCohorts(context),
    can(context.role, 'protokoll.lesen') ? getAuditLog(context, 20) : Promise.resolve([]),
  ]);

  const darfVerwalten = can(context.role, 'kohorte.verwalten');
  const darfSummenLesen = can(context.role, 'kohorte.summen-lesen');

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm text-[var(--text-muted)]">
          <Link href="/organisation" className="underline">
            Organisationen
          </Link>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {context.organizationName}
          </h1>
          <Badge tone={context.role === 'MEMBER' ? 'neutral' : 'info'}>
            {ROLE_LABELS[context.role]}
          </Badge>
        </div>
      </header>

      <section aria-labelledby="kohorten">
        <SectionHeading
          id="kohorten"
          description={
            darfSummenLesen
              ? 'Der Stand einer Kohorte wird als Summenwert gezeigt. Einzelne Personen erscheinen nur mit ihrer Einwilligung.'
              : 'Als Mitglied siehst du hier, zu welchen Kohorten du gehörst.'
          }
        >
          Kohorten
        </SectionHeading>

        {cohorts.length === 0 ? (
          <EmptyState
            title="Noch keine Kohorte"
            description={
              darfVerwalten
                ? 'Lege unten eine an – zum Beispiel eine Klasse oder einen Kursdurchgang.'
                : 'Sobald du einer Kohorte zugeordnet wirst, erscheint sie hier.'
            }
          />
        ) : (
          <ul className="space-y-3">
            {cohorts.map((cohort) => (
              <Card as="li" key={cohort.slug}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    {darfSummenLesen ? (
                      <Link
                        href={`/organisation/${slug}/${cohort.slug}`}
                        className="text-lg font-semibold text-[var(--accent)] underline"
                      >
                        {cohort.name}
                      </Link>
                    ) : (
                      <p className="text-lg font-semibold">{cohort.name}</p>
                    )}
                    {cohort.description ? (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{cohort.description}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {cohort.archivedAt ? <Badge tone="neutral">archiviert</Badge> : null}
                    <span className="text-sm text-[var(--text-muted)]">
                      {cohort.memberCount} {cohort.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      {darfVerwalten ? (
        <CohortAndInviteForms
          organizationSlug={slug}
          cohorts={cohorts.map((cohort) => ({ slug: cohort.slug, name: cohort.name }))}
          mayInviteOwners={context.role === 'OWNER'}
        />
      ) : null}

      {can(context.role, 'protokoll.lesen') ? (
        <section aria-labelledby="protokoll">
          <SectionHeading
            id="protokoll"
            description="Festgehalten wird, wer wann was verwaltet hat – nicht, was jemand gelernt hat."
          >
            Prüfprotokoll
          </SectionHeading>
          {auditLog.length === 0 ? (
            <Card>
              <p className="text-[var(--text-muted)]">Noch keine Einträge.</p>
            </Card>
          ) : (
            <Card>
              <ol className="space-y-2">
                {auditLog.map((entry, index) => (
                  <li
                    key={`${entry.createdAt.toISOString()}-${index}`}
                    className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)] pb-2 text-sm last:border-0 last:pb-0"
                  >
                    <span>{entry.summary}</span>
                    <span className="text-[var(--text-muted)]">
                      {entry.actorName} ·{' '}
                      {new Intl.DateTimeFormat('de-DE', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </section>
      ) : null}
    </div>
  );
}
