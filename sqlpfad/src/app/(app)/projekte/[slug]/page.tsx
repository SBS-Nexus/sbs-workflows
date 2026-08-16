import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { Lektionstext } from '@/components/inhalt/lektionstext';
import { SchemaExplorer } from '@/components/sql/schema-explorer';
import { ProjektWerkbank } from '@/components/projekt/projekt-werkbank';
import { UEBUNGSDATEN } from '@/content';
import { Badge } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const projekt = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  return { title: projekt?.title ?? 'Projekt' };
}

/**
 * Ein Projekt.
 *
 * Links der Auftrag und die Arbeitsfläche, rechts die Tabellen – dieselbe
 * Aufteilung wie in der Lektion und auf der Werkbank. Der Auftrag steht **über**
 * den Abnahmekriterien: Erst die Frage, dann die Bedingungen, unter denen sie
 * beantwortet ist.
 */
export default async function ProjektSeite({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { slug } = await params;

  const projekt = await prisma.project.findUnique({
    where: { slug },
    include: {
      module: { select: { title: true, lessons: { select: { practiceSchemaId: true }, take: 1 } } },
      submissions: { where: { userId: user.id }, take: 1 },
    },
  });

  if (!projekt || projekt.status !== 'PUBLISHED') notFound();

  /*
   * Der Übungsdatensatz kommt über die erste Lektion des Moduls.
   *
   * Ein Projekt hat keinen eigenen; es arbeitet mit denselben Tabellen wie das
   * Modul, zu dem es gehört. Ohne den Schema-Explorer daneben müsste man die
   * Spaltennamen aus dem Kopf holen - und das ist nicht die Fähigkeit, um die
   * es hier geht.
   */
  const schemaId = projekt.module?.lessons[0]?.practiceSchemaId ?? null;
  const schemaSlug = schemaId
    ? ((await prisma.practiceSchema.findUnique({ where: { id: schemaId }, select: { slug: true } }))
        ?.slug ?? null)
    : null;
  const datensatz = UEBUNGSDATEN.find((eintrag) => eintrag.slug === schemaSlug);

  const abnahme = Array.isArray(projekt.acceptance)
    ? projekt.acceptance.filter((eintrag): eintrag is string => typeof eintrag === 'string')
    : [];
  const stand = projekt.submissions[0];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/projekte"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <Icon name="zurueck" size={16} />
          Projekte
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">
            {projekt.title}
          </h1>
          {stand?.status === 'SUBMITTED' ? <Badge tone="success">Fertig</Badge> : null}
        </div>

        {projekt.module ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Gehört zu {projekt.module.title}</p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="auftrag">
            <h2
              id="auftrag"
              className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]"
            >
              Der Auftrag
            </h2>
            <div className="mt-3">
              <Lektionstext text={projekt.brief} />
            </div>
          </section>

          <ProjektWerkbank
            projektSlug={projekt.slug}
            abnahme={abnahme}
            startSql={projekt.starterSql ?? ''}
            gespeichertesSql={stand?.sql ?? null}
            gespeicherteNotizen={stand?.notes ?? null}
            abgegebenAm={stand?.submittedAt?.toISOString() ?? null}
            datensatz={datensatz}
          />
        </div>

        <div className="min-w-0">
          {datensatz ? (
            <SchemaExplorer datensatz={datensatz} />
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Zu diesem Projekt gehört kein Übungsdatensatz.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
