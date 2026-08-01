import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { getReviewCenterData } from '@/server/services/review-service';
import { getPublicExercise } from '@/server/services/exercise-service';
import { ReviewRunner } from './review-runner';
import { Badge, ButtonLink, Card, EmptyState, SectionHeading } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Wiederholen' };

export default async function ReviewPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const data = await getReviewCenterData(user.id);

  const exercises = [];
  for (const item of data.due) {
    const view = await getPublicExercise(user.id, item.exerciseSlug);
    if (view) exercises.push(view);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Wiederholungscenter</h1>
        <p className="mt-3 max-w-prose text-[var(--text-muted)]">
          Hier kommt zurück, was du schon einmal konntest – zu dem Zeitpunkt, an dem das Erinnern
          gerade eben noch gelingt. Genau dieser Moment festigt am stärksten. Dass sich etwas nicht
          sofort abrufen lässt, ist Teil des Verfahrens und kein Rückschritt.
        </p>
      </header>

      {exercises.length > 0 ? (
        <section aria-labelledby="faellig">
          <SectionHeading
            id="faellig"
            description="Die Reihenfolge ist bewusst gemischt: Wechselnde Konzepte trainieren das Unterscheiden mit."
          >
            Heute fällig ({exercises.length})
          </SectionHeading>
          <ReviewRunner exercises={exercises} meta={data.due} />
        </section>
      ) : (
        <EmptyState
          title="Heute steht keine Wiederholung an"
          description="Das ist kein Versäumnis – der Plan richtet sich nach deinem Verlauf. Nutze die Zeit für eine neue Lektion oder ein Projekt."
          action={<ButtonLink href="/lernen">Zum Lernpfad</ButtonLink>}
        />
      )}

      {data.upcoming.length > 0 ? (
        <section aria-labelledby="demnaechst">
          <SectionHeading
            id="demnaechst"
            description="Nur zur Orientierung – nichts davon ist überfällig."
          >
            Demnächst
          </SectionHeading>
          <ul className="space-y-2">
            {data.upcoming.map((item) => (
              <li
                key={`${item.exerciseTitle}-${item.dueAt.toISOString()}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <span>{item.exerciseTitle}</span>
                <span className="shrink-0 text-[var(--text-muted)]">in {item.inDays}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="sets">
        <SectionHeading
          id="sets"
          description="Zusammengestellte Runden, die mehrere Lektionen mischen. Sie werden erst nach einem zeitlichen Abstand frei."
        >
          Wiederholungssets
        </SectionHeading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.sets.map((set) => (
            <Card as="li" key={set.slug}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{set.title}</h3>
                <Badge tone={set.available ? 'success' : 'neutral'}>
                  {set.available ? 'verfügbar' : 'gesperrt'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{set.description}</p>
              <p className="mt-2 text-sm">{set.exerciseCount} Aufgaben</p>
              {set.available ? (
                <Link
                  href={`/wiederholen/${set.slug}`}
                  className="mt-3 inline-block font-medium text-[var(--accent)] underline"
                >
                  Set starten
                </Link>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  <span aria-hidden="true">🔒 </span>
                  {set.blockedReason}
                </p>
              )}
            </Card>
          ))}
        </ul>
      </section>
    </div>
  );
}
