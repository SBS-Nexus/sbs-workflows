import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { getPublicExercise } from '@/server/services/exercise-service';
import { PracticeRunner } from './practice-runner';
import { EmptyState, ButtonLink, SectionHeading } from '@/components/ui/primitives';
import { describeMastery } from '@/domain/mastery/mastery';

export const metadata: Metadata = { title: 'Üben' };

/**
 * Übungsmodus.
 *
 * Anders als der Lernpfad geht es hier nicht um neuen Stoff, sondern um gezielte
 * Arbeit an den Konzepten mit dem niedrigsten Stand. Ausgewählt werden Aufgaben
 * aus Lektionen, die bereits begonnen wurden – niemand soll hier auf Stoff
 * stoßen, der noch nicht eingeführt wurde.
 */
export default async function PracticePage(): Promise<React.ReactElement> {
  const user = await requireUser();

  const weakest = await prisma.conceptMastery.findMany({
    where: { userId: user.id, masteryScore: { lt: 80 } },
    include: { concept: { select: { id: true, slug: true, name: true } } },
    orderBy: { masteryScore: 'asc' },
    take: 3,
  });

  if (weakest.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Üben</h1>
        <EmptyState
          title="Noch keine Übungsvorschläge"
          description="Der Übungsmodus stellt Aufgaben zu den Konzepten zusammen, die bei dir noch wackeln. Dafür braucht er ein paar bearbeitete Aufgaben aus dem Lernpfad."
          action={<ButtonLink href="/lernen">Zum Lernpfad</ButtonLink>}
        />
      </div>
    );
  }

  const startedLessonIds = (
    await prisma.lessonProgress.findMany({
      where: { userId: user.id },
      select: { lessonId: true },
    })
  ).map((p) => p.lessonId);

  const candidates = await prisma.exercise.findMany({
    where: {
      status: 'PUBLISHED',
      lessonId: { in: startedLessonIds },
      concepts: { some: { conceptId: { in: weakest.map((m) => m.conceptId) } } },
    },
    select: { slug: true },
    take: 8,
  });

  const exercises = [];
  for (const candidate of candidates) {
    const view = await getPublicExercise(user.id, candidate.slug);
    if (view) exercises.push(view);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Üben</h1>
        <p className="mt-3 max-w-prose text-[var(--text-muted)]">
          Gezielte Arbeit an den Konzepten, die bei dir gerade am wenigsten gefestigt sind. Es kommt
          nichts vor, das du noch nicht in einer Lektion gesehen hast.
        </p>
      </header>

      <section aria-labelledby="schwerpunkte">
        <SectionHeading id="schwerpunkte">Aktuelle Schwerpunkte</SectionHeading>
        <ul className="grid gap-3 sm:grid-cols-3">
          {weakest.map((entry) => {
            const description = describeMastery(entry.masteryScore);
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4"
              >
                <p className="font-semibold">{entry.concept.name}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{description.label}</p>
                <p className="mt-2 text-sm">{description.nextStep}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {exercises.length > 0 ? (
        <PracticeRunner exercises={exercises} />
      ) : (
        <EmptyState
          title="Keine passenden Übungsaufgaben gefunden"
          description="Arbeite zunächst eine weitere Lektion durch. Danach stehen hier Aufgaben zu deinen Schwerpunkten bereit."
          action={<ButtonLink href="/lernen">Zum Lernpfad</ButtonLink>}
        />
      )}
    </div>
  );
}
