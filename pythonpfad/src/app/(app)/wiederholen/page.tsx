import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { getReviewCenterData } from '@/server/services/review-service';
import { getPublicExercise } from '@/server/services/exercise-service';
import { ReviewRunner } from './review-runner';
import { Badge, ButtonLink, Card, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { PageHero, HeroStat } from '@/components/ui/page-hero';
import { Icon } from '@/components/ui/icon';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { REVIEW_THEME, themeStyle } from '@/domain/design/module-theme';

export const metadata: Metadata = { title: 'Wiederholen' };

export default async function ReviewPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const data = await getReviewCenterData(user.id);

  const exercises = [];
  for (const item of data.due) {
    const view = await getPublicExercise(user.id, item.exerciseSlug);
    if (view) exercises.push(view);
  }

  /*
   * Die Bereichsfarbe gilt für die ganze Seite, nicht nur für den Kopf. Ohne
   * sie erbt alles darunter die allgemeine Akzentfarbe – der Kopf wäre in der
   * Bereichsfarbe und die Überschrift zwei Zentimeter darunter blau. Von hier
   * aus greifen Abschnittsüberschriften, Symbolkacheln und Hervorhebungen auf
   * `--akzent` zu.
   */
  return (
    <div style={themeStyle(REVIEW_THEME)} className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <PageHero
        theme={REVIEW_THEME}
        icon="wiederholen"
        title="Wiederholungscenter"
        description="Hier kommt zurück, was du schon einmal konntest – zu dem Zeitpunkt, an dem das Erinnern gerade eben noch gelingt. Genau dieser Moment festigt am stärksten. Dass sich etwas nicht sofort abrufen lässt, ist Teil des Verfahrens und kein Rückschritt."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <HeroStat
            value={<AnimatedNumber value={exercises.length} />}
            label="heute fällig"
            index={0}
          />
          <HeroStat
            value={<AnimatedNumber value={data.upcoming.length} />}
            label="in den nächsten Tagen"
            index={1}
          />
          <HeroStat
            value={<AnimatedNumber value={data.sets.filter((set) => set.available).length} />}
            label="Sets verfügbar"
            index={2}
          />
        </div>
      </PageHero>

      {exercises.length > 0 ? (
        <section aria-labelledby="faellig">
          <SectionHeading
            id="faellig"
            icon="wiederholen"
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
            icon="zeit"
            description="Nur zur Orientierung – nichts davon ist überfällig."
          >
            Demnächst
          </SectionHeading>
          <ul className="space-y-2">
            {data.upcoming.map((item, index) => (
              <li
                key={`${item.exerciseTitle}-${item.dueAt.toISOString()}`}
                style={{ ...themeStyle(REVIEW_THEME), animationDelay: `${index * 40}ms` }}
                className="animate-in flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-sm transition-colors hover:border-[var(--akzent)]"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span aria-hidden="true" className="icon-tile size-7">
                    <Icon name="wiederholen" size={14} />
                  </span>
                  <span className="truncate">{item.exerciseTitle}</span>
                </span>
                <span className="shrink-0 font-semibold text-[var(--akzent)]">
                  in {item.inDays}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="sets">
        <SectionHeading
          id="sets"
          icon="projekte"
          description="Zusammengestellte Runden, die mehrere Lektionen mischen. Sie werden erst nach einem zeitlichen Abstand frei."
        >
          Wiederholungssets
        </SectionHeading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.sets.map((set, index) => (
            <Card
              as="li"
              key={set.slug}
              style={{ ...themeStyle(REVIEW_THEME), animationDelay: `${index * 60}ms` }}
              className={
                set.available
                  ? 'card-accent hover-lift hover-glow animate-in group'
                  : 'animate-in opacity-75'
              }
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold tracking-tight">{set.title}</h3>
                <Badge tone={set.available ? 'success' : 'neutral'}>
                  {set.available ? 'verfügbar' : 'gesperrt'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{set.description}</p>
              <p className="mt-2 text-sm">{set.exerciseCount} Aufgaben</p>
              {set.available ? (
                <Link
                  href={`/wiederholen/${set.slug}`}
                  className="mt-3 inline-flex items-center gap-1.5 font-bold text-[var(--akzent)] underline"
                >
                  Set starten
                  <Icon name="vor" size={16} />
                </Link>
              ) : (
                <p className="mt-3 flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <Icon name="schloss" size={16} className="mt-0.5 shrink-0" />
                  <span>{set.blockedReason}</span>
                </p>
              )}
            </Card>
          ))}
        </ul>
      </section>
    </div>
  );
}
