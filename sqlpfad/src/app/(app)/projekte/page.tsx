import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';

export const metadata: Metadata = { title: 'Projekte' };

/**
 * Die Projekte.
 *
 * Ein Projekt steht am Ende eines Moduls und ist der Punkt, an dem das Gelernte
 * zum ersten Mal einem Zweck dient: Nicht „schreibe eine Abfrage mit GROUP BY",
 * sondern „der Steuerberater fragt nach einer Aufstellung". Deshalb steht der
 * Auftrag hier in Prosa und nicht als Anforderungsliste.
 *
 * Es gibt keine Schlösser. Wer Modul 3 noch nicht gelesen hat und das Projekt
 * trotzdem aufmacht, sieht, worauf es hinausläuft – das ist eine Einladung und
 * kein Schummeln.
 */
export default async function ProjekteSeite(): Promise<React.ReactElement> {
  const user = await requireUser();

  const projekte = await prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
    include: {
      module: { select: { title: true, order: true } },
      submissions: {
        where: { userId: user.id },
        select: { status: true, submittedAt: true, updatedAt: true },
      },
    },
  });

  if (projekte.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Projekte</h1>
        <EmptyState
          title="Noch keine Projekte eingespielt"
          description="Projekte gehören zu den Modulen. Sobald Inhalte eingespielt sind, steht hier etwas zu tun."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Projekte</h1>
        <p className="mt-2 max-w-2xl text-lg text-[var(--text-muted)]">
          Kein Übungssatz, sondern eine Frage, die jemand wirklich stellen würde. Am Ende steht
          etwas, das man herzeigen kann.
        </p>
      </div>

      <ol className="grid gap-4 md:grid-cols-2">
        {projekte.map((projekt) => {
          const theme = moduleTheme(projekt.module?.order ?? 0);
          const stand = projekt.submissions[0];

          return (
            <Card as="li" key={projekt.id} className="border-2" style={themeStyle(theme)}>
              <Link href={`/projekte/${projekt.slug}`} className="block">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--akzent)]">
                    {projekt.module?.title ?? 'Ohne Modul'}
                  </span>
                  {stand?.status === 'SUBMITTED' ? (
                    <Badge tone="success">Fertig</Badge>
                  ) : stand ? (
                    <Badge tone="info">In Arbeit</Badge>
                  ) : (
                    <Badge tone="neutral">Offen</Badge>
                  )}
                </div>

                <h2 className="mt-2 text-lg font-bold tracking-tight">{projekt.title}</h2>
                {/*
                 * Nur der erste Absatz. Der ganze Auftrag steht auf der Seite
                 * des Projekts - eine Kachel, die alles zeigt, ist keine Kachel
                 * mehr.
                 */}
                <p className="mt-1.5 line-clamp-3 text-[0.95rem] text-[var(--text-muted)]">
                  {projekt.brief}
                </p>

                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--akzent)]">
                  {stand ? 'Weiterarbeiten' : 'Ansehen'}
                  <Icon name="vor" size={16} />
                </span>
              </Link>
            </Card>
          );
        })}
      </ol>
    </div>
  );
}
