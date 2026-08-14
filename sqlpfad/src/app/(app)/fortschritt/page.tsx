import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { istSqlRunnerVerfuegbar } from '@/server/env';
import { Callout, Card, EmptyState, SectionHeading } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Überblick' };

/**
 * Der Überblick.
 *
 * Solange noch keine Inhalte geseedet sind, sagt diese Seite das – statt
 * Platzhalterzahlen zu zeigen. Eine „0 von 0" mit vollem Fortschrittsbalken
 * ist keine freundliche Geste, sondern eine Falschauskunft.
 */
export default async function FortschrittPage(): Promise<React.ReactElement> {
  const user = await requireUser();

  const [lektionen, versuche, sandbox] = await Promise.all([
    prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
    prisma.attempt.count({ where: { userId: user.id } }),
    prisma.sandbox.findFirst({
      where: { userId: user.id },
      select: { state: true, stateReason: true, lastResetAt: true },
    }),
  ]);

  const runnerBereit = istSqlRunnerVerfuegbar();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">
          Hallo, {user.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-lg text-[var(--text-muted)]">
          {versuche === 0
            ? 'Hier siehst du künftig, wo du stehst und was als Nächstes dran ist.'
            : `Du hast bisher ${versuche} Aufgaben bearbeitet.`}
        </p>
      </div>

      {/* Zustand der Ausführung – ehrlich, auch wenn er unbequem ist. */}
      {!runnerBereit ? (
        <Callout tone="caution" title="Abfragen ausführen ist gerade nicht möglich">
          Die Übungsumgebung ist auf dieser Installation noch nicht eingeschaltet. Lektionen,
          Erklärungen und Aufgaben zur Ergebnisvorhersage funktionieren; eigene Abfragen auszuführen
          geht erst, wenn der Übungsserver bereitsteht. Es gibt bewusst keinen Ersatzweg, der so
          tut, als liefe deine Abfrage.
        </Callout>
      ) : sandbox?.state === 'FAILED' ? (
        <Callout tone="alert" title="Deine Übungsdatenbank konnte nicht bereitgestellt werden">
          {sandbox.stateReason ?? 'Der Grund ist nicht bekannt.'}
        </Callout>
      ) : null}

      <section aria-labelledby="stand">
        <SectionHeading id="stand">Wo du stehst</SectionHeading>
        {lektionen === 0 ? (
          <EmptyState
            title="Noch keine Lektionen eingespielt"
            description="Auf dieser Installation sind noch keine Inhalte vorhanden. Sobald sie eingespielt sind, steht hier dein Lernpfad."
          />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Verfügbare Lektionen</p>
              <p className="mt-1 text-3xl font-black tracking-tight">{lektionen}</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Bearbeitete Aufgaben</p>
              <p className="mt-1 text-3xl font-black tracking-tight">{versuche}</p>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
