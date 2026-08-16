import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';

export const metadata: Metadata = { title: 'Lernen' };

/**
 * Der Lernpfad.
 *
 * Die Lektionen stehen in der Reihenfolge des Lehrplans und sind alle
 * zugänglich. Es gibt bewusst **keine Schlösser**: Wer aus dem Beruf schon
 * weiß, was ein Primärschlüssel ist, soll Lektion 3 lesen dürfen, ohne vorher
 * zwei Lektionen wegzuklicken. Die Reihenfolge ist eine Empfehlung, keine
 * Schranke – und der Fortschritt zeigt an, was man schon bearbeitet hat, statt
 * den Rest zu verstellen.
 */
export default async function LernenSeite(): Promise<React.ReactElement> {
  const user = await requireUser();

  const modulListe = await prisma.courseModule.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        where: { status: 'PUBLISHED' },
        orderBy: { order: 'asc' },
        include: { _count: { select: { exercises: true } } },
      },
    },
  });

  const fortschritt = new Map(
    (
      await prisma.lessonProgress.findMany({
        where: { userId: user.id },
        select: { lessonId: true, state: true },
      })
    ).map((eintrag) => [eintrag.lessonId, eintrag.state]),
  );

  if (modulListe.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Lernpfad</h1>
        <EmptyState
          title="Noch keine Lektionen eingespielt"
          description="Auf dieser Installation sind noch keine Inhalte vorhanden. Sobald sie eingespielt sind, beginnt hier dein Weg."
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Lernpfad</h1>
        <p className="mt-2 max-w-2xl text-lg text-[var(--text-muted)]">
          Die Reihenfolge ist eine Empfehlung, keine Schranke. Du kannst jede Lektion öffnen, wann
          du willst.
        </p>
      </div>

      {modulListe.map((modul, index) => {
        const theme = moduleTheme(index);
        return (
          <section key={modul.id} style={themeStyle(theme)} aria-labelledby={modul.slug}>
            <div className="flex items-baseline gap-3 border-l-4 border-[var(--akzent)] pl-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-[var(--akzent)]">
                  Modul {index + 1}
                </p>
                <h2 id={modul.slug} className="mt-1 text-xl font-black tracking-tight">
                  {modul.title}
                </h2>
                <p className="mt-1 text-[var(--text-muted)]">{modul.description}</p>
              </div>
            </div>

            <ol className="mt-5 grid gap-4 sm:grid-cols-2">
              {modul.lessons.map((lektion, lektionsIndex) => {
                const stand = fortschritt.get(lektion.id) ?? 'NOT_STARTED';
                return (
                  <li key={lektion.id}>
                    <Link
                      href={`/lernen/${lektion.slug}`}
                      className="karte-flaeche hover-lift group block h-full rounded-2xl border-2 p-5 hover:border-[var(--akzent)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold uppercase tracking-widest text-[var(--akzent)]">
                          Lektion {lektionsIndex + 1}
                        </span>
                        {/*
                         * Der Stand steht als Wort da und nicht nur als Farbe
                         * oder Häkchen (WCAG 1.4.1).
                         */}
                        {stand === 'COMPLETED' ? (
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--success)]">
                            <Icon name="haken" size={16} />
                            Bearbeitet
                          </span>
                        ) : stand === 'IN_PROGRESS' ? (
                          <span className="text-sm font-semibold text-[var(--text-muted)]">
                            Angefangen
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-lg font-bold tracking-tight">{lektion.title}</h3>
                      <p className="mt-1.5 text-[0.95rem] text-[var(--text-muted)]">
                        {lektion.leadingQuestion}
                      </p>

                      <p className="mt-4 flex items-center gap-3 text-sm text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5">
                          <Icon name="zeit" size={15} />
                          {lektion.estimatedMinutes} Min.
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="ueben" size={15} />
                          {lektion._count.exercises} Aufgaben
                        </span>
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
