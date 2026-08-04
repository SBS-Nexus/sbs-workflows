import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { getDashboardData } from '@/server/services/progress-service';
import { getMotivationSummary } from '@/server/services/motivation-service';
import { getKnowledgeMap } from '@/server/services/knowledge-service';
import { ConceptMap } from '@/components/knowledge/concept-map';
import { RetentionForecast } from '@/components/knowledge/retention-forecast';
import { LearningRhythm } from '@/components/motivation/learning-rhythm';
import { MilestoneList } from '@/components/motivation/milestone-list';
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  ProgressBar,
  SectionHeading,
} from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Fortschritt' };

const BAND_TONE = {
  new: 'neutral',
  building: 'caution',
  usable: 'info',
  solid: 'success',
  durable: 'success',
} as const;

export default async function ProgressPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const [data, motivation, knowledge] = await Promise.all([
    getDashboardData(user.id),
    getMotivationSummary(user.id),
    getKnowledgeMap(user.id),
  ]);

  const maxActivity = Math.max(1, ...data.weeklyActivity.map((d) => d.activities));

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dein Lernstand</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Die Zahlen hier sind Orientierungswerte aus deinem bisherigen Verlauf. Sie messen nicht,
          wie gut du programmieren kannst – sie helfen dabei, die nächste Übung sinnvoll
          auszuwählen.
        </p>
      </header>

      {/* --- Nächster Schritt --------------------------------------------- */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Empfehlung für jetzt</p>
            <p className="text-lg font-semibold">{data.nextStep.label}</p>
          </div>
          <ButtonLink href={data.nextStep.href}>Öffnen</ButtonLink>
        </div>
      </Card>

      {/* --- Kennzahlen ---------------------------------------------------- */}
      <section aria-labelledby="ueberblick">
        <SectionHeading id="ueberblick">Überblick</SectionHeading>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Lektionen abgeschlossen',
              value: `${data.totals.lessonsCompleted} von ${data.totals.lessonsTotal}`,
            },
            { label: 'Aufgaben eigenständig gelöst', value: data.totals.exercisesPassed },
            { label: 'Projekte abgenommen', value: data.totals.projectsAccepted },
            { label: 'Aktive Lernzeit', value: `${data.totals.activeMinutes} Minuten` },
          ].map((item) => (
            <Card key={item.label}>
              <dt className="text-sm text-[var(--text-muted)]">{item.label}</dt>
              <dd className="mt-1 text-2xl font-bold">{item.value}</dd>
            </Card>
          ))}
        </dl>
      </section>

      <LearningRhythm rhythm={motivation.rhythm} />

      {/* --- Wochenübersicht ----------------------------------------------- */}
      <section aria-labelledby="woche">
        <SectionHeading
          id="woche"
          description="Wie viele Aufgaben du an den letzten sieben Tagen bearbeitet hast."
        >
          Diese Woche
        </SectionHeading>
        <Card>
          <ul className="flex items-end justify-between gap-2">
            {data.weeklyActivity.map((day) => (
              <li key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-medium">{day.activities}</span>
                <div
                  className="w-full rounded-t bg-[var(--accent)]"
                  style={{
                    height: `${Math.max(4, (day.activities / maxActivity) * 80)}px`,
                    opacity: day.activities === 0 ? 0.18 : 1,
                  }}
                  aria-hidden="true"
                />
                <span className="text-xs text-[var(--text-muted)]">{day.label}</span>
                <span className="sr-only">
                  {day.label}, {day.date}: {day.activities} Aufgaben
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <ConceptMap data={knowledge} />

      <RetentionForecast
        points={knowledge.forecast}
        message={knowledge.forecastMessage}
        targetPercent={knowledge.targetRetentionPercent}
      />

      {/* --- Kompetenzen ---------------------------------------------------- */}
      <section aria-labelledby="konzepte">
        <SectionHeading
          id="konzepte"
          description="Je Konzept ein Stand aus deinem Verlauf. Ein niedriger Wert bedeutet nur, dass es noch wenig Gelegenheit zum eigenständigen Anwenden gab."
        >
          Konzepte
        </SectionHeading>

        {data.masteryByConcept.length === 0 ? (
          <EmptyState
            title="Noch keine Konzeptdaten"
            description="Sobald du die ersten Aufgaben bearbeitest, entsteht hier eine Übersicht deiner Konzepte."
            action={<ButtonLink href="/lernen">Zur ersten Lektion</ButtonLink>}
          />
        ) : (
          <ul className="space-y-2">
            {data.masteryByConcept.map((concept) => (
              <Card as="li" key={concept.slug} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{concept.name}</p>
                  <Badge tone={BAND_TONE[concept.band]}>{concept.label}</Badge>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    value={concept.score}
                    label={`${concept.name}: ${concept.label}`}
                    tone={
                      concept.band === 'solid' || concept.band === 'durable'
                        ? 'success'
                        : concept.band === 'new'
                          ? 'caution'
                          : 'accent'
                    }
                  />
                </div>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{concept.meaning}</p>
                <p className="mt-1 text-sm">
                  <span className="font-medium">Nächster Schritt:</span> {concept.nextStep}
                </p>
                {concept.nextReviewAt ? (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Nächste Wiederholung eingeplant für{' '}
                    {new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(
                      concept.nextReviewAt,
                    )}
                  </p>
                ) : null}
              </Card>
            ))}
          </ul>
        )}
      </section>

      {/* --- Module ---------------------------------------------------------- */}
      <section aria-labelledby="module">
        <SectionHeading id="module">Fortschritt nach Themen</SectionHeading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.moduleProgress.map((mod) => (
            <Card as="li" key={mod.slug}>
              <p className="font-medium">{mod.title}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {mod.completed} von {mod.total} Lektionen abgeschlossen
              </p>
              <div className="mt-2">
                <ProgressBar
                  value={mod.completed}
                  max={mod.total}
                  label={`${mod.title}: ${mod.completed} von ${mod.total} Lektionen`}
                  tone={mod.completed === mod.total ? 'success' : 'accent'}
                />
              </div>
            </Card>
          ))}
        </ul>
      </section>

      {/* --- Fehlermuster ----------------------------------------------------- */}
      {data.errorPatterns.length > 0 ? (
        <section aria-labelledby="fehler">
          <SectionHeading
            id="fehler"
            description="Fehler sind Lernmaterial. Diese Übersicht zeigt, woran du am häufigsten hängen bleibst – und was dabei hilft."
          >
            Häufige Fehlerarten
          </SectionHeading>
          <ul className="space-y-2">
            {data.errorPatterns.map((pattern) => (
              <Card as="li" key={pattern.type}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{pattern.label}</p>
                  <Badge tone="neutral">{pattern.count}× aufgetreten</Badge>
                </div>
                <p className="mt-2 text-[0.95rem]">{pattern.advice}</p>
              </Card>
            ))}
          </ul>
        </section>
      ) : null}

      {/* --- Selbsteinschätzung ------------------------------------------------ */}
      <section aria-labelledby="einschaetzung">
        <SectionHeading id="einschaetzung">Selbsteinschätzung und Ergebnis</SectionHeading>
        <Card>
          <p className="text-[0.95rem]">{data.calibration.message}</p>
          {data.calibration.samples >= 5 ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-[var(--text-muted)]">Ausgewertete Einschätzungen</dt>
                <dd className="text-xl font-semibold">{data.calibration.samples}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--text-muted)]">Durchschnittliche Sicherheit</dt>
                <dd className="text-xl font-semibold">
                  {Math.round(data.calibration.averageConfidence * 100)} %
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--text-muted)]">Tatsächliche Trefferquote</dt>
                <dd className="text-xl font-semibold">
                  {Math.round(data.calibration.actualSuccessRate * 100)} %
                </dd>
              </div>
            </dl>
          ) : null}
        </Card>
      </section>

      <MilestoneList milestones={motivation.milestones} next={motivation.next} />

      <p className="text-sm text-[var(--text-muted)]">
        Alle hier gezeigten Daten kannst du unter{' '}
        <Link href="/profil" className="underline">
          Profil
        </Link>{' '}
        vollständig herunterladen oder löschen.
      </p>
    </div>
  );
}
