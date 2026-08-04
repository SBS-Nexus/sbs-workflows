import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { isEnabled } from '@/server/feature-flags';
import { listOrganisations } from '@/server/services/organisation-service';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/domain/organisation/permissions';
import { Badge, Card, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { CreateOrganisationForm } from './create-organisation-form';

export const metadata: Metadata = { title: 'Organisationen' };

/**
 * Übersicht der eigenen Organisationen.
 *
 * Der Bereich ist bewusst nicht in der Hauptnavigation verlinkt, solange
 * niemand einer Organisation angehört: Für eine einzelne lernende Person wäre
 * er nur ein leerer Menüpunkt. Erreichbar ist er trotzdem immer – über das
 * Profil und über die Befehlspalette.
 */
export default async function OrganisationsPage(): Promise<React.ReactElement> {
  // Abschaltbar für Installationen, die ausschließlich Einzelkonten führen.
  if (!isEnabled('ORGANISATIONEN')) notFound();
  const user = await requireUser();
  const organisations = await listOrganisations(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Organisationen</h1>
        <p className="mt-2 max-w-prose text-[var(--text-muted)]">
          Eine Organisation bündelt Kohorten – etwa Klassen, Kurse oder Teams. Lehrkräfte sehen
          darin, wo ihre Gruppe steht. Was einzelne Personen genau getan haben, sehen sie nur, wenn
          diese ausdrücklich zustimmen.
        </p>
      </header>

      {organisations.length === 0 ? (
        <EmptyState
          title="Du gehörst noch keiner Organisation an"
          description="Wenn dich jemand eingeladen hat, öffne einfach den Einladungslink. Du kannst hier auch selbst eine Organisation anlegen – zum Beispiel für einen Kurs, den du gibst."
        />
      ) : (
        <section aria-labelledby="meine-organisationen">
          <SectionHeading id="meine-organisationen">Deine Organisationen</SectionHeading>
          <ul className="space-y-3">
            {organisations.map((organisation) => (
              <Card as="li" key={organisation.slug}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/organisation/${organisation.slug}`}
                      className="text-lg font-semibold text-[var(--accent)] underline"
                    >
                      {organisation.name}
                    </Link>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {organisation.cohortCount}{' '}
                      {organisation.cohortCount === 1 ? 'Kohorte' : 'Kohorten'}
                    </p>
                  </div>
                  <Badge tone={organisation.role === 'MEMBER' ? 'neutral' : 'info'}>
                    {ROLE_LABELS[organisation.role]}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {ROLE_DESCRIPTIONS[organisation.role]}
                </p>
              </Card>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="neue-organisation">
        <SectionHeading
          id="neue-organisation"
          description="Du wirst automatisch Inhaberin oder Inhaber und kannst danach Kohorten anlegen und Leute einladen."
        >
          Neue Organisation anlegen
        </SectionHeading>
        <Card>
          <CreateOrganisationForm />
        </Card>
      </section>
    </div>
  );
}
