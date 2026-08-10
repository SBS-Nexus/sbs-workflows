import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { getDashboardData } from '@/server/services/progress-service';
import { getMotivationSummary } from '@/server/services/motivation-service';
import { getKnowledgeMap } from '@/server/services/knowledge-service';
import { isEnabled } from '@/server/feature-flags';
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
import { PageHero } from '@/components/ui/page-hero';
import { ProgressRing } from '@/components/ui/progress-ring';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { SaeulenDiagramm } from '@/components/charts/saeulen-diagramm';
import { KompetenzRing } from '@/components/charts/kompetenz-ring';
import { Icon, type IconName } from '@/components/ui/icon';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';
import { IllustrationNetz } from '@/components/ui/illustration';

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
  // Ist die Landkarte abgeschaltet, wird sie gar nicht erst berechnet. Ein
  // Schalter, der nur die Anzeige unterdrückt, spart nichts.
  const landkarteAn = isEnabled('WISSENSLANDKARTE');
  const [data, motivation, knowledge] = await Promise.all([
    getDashboardData(user.id),
    getMotivationSummary(user.id),
    landkarteAn ? getKnowledgeMap(user.id) : Promise.resolve(null),
  ]);

  /*
   * Die Bereichsfarbe gilt für die ganze Seite, nicht nur für den Kopf. Ohne
   * sie erbt alles darunter die allgemeine Akzentfarbe – der Kopf wäre in der
   * Bereichsfarbe und die Überschrift zwei Zentimeter darunter blau. Von hier
   * aus greifen Abschnittsüberschriften, Symbolkacheln und Hervorhebungen auf
   * `--akzent` zu.
   */
  return (
    <div
      style={themeStyle(moduleTheme(3))}
      className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6"
    >
      <PageHero
        theme={moduleTheme(3)}
        icon="fortschritt"
        title="Dein Lernstand"
        description="Die Zahlen hier sind Orientierungswerte aus deinem bisherigen Verlauf. Sie messen nicht, wie gut du programmieren kannst – sie helfen dabei, die nächste Übung sinnvoll auszuwählen."
      >
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white/12 p-4 backdrop-blur-sm">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20"
          >
            <Icon name="funke" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">
              Empfehlung für jetzt
            </p>
            <p className="truncate text-lg font-bold">{data.nextStep.label}</p>
          </div>
          <ButtonLink href={data.nextStep.href} variant="onDark">
            Öffnen
            <Icon name="vor" size={16} />
          </ButtonLink>
        </div>
      </PageHero>

      {/* --- Kennzahlen ---------------------------------------------------- */}
      <section aria-labelledby="ueberblick">
        <SectionHeading id="ueberblick" emoji="fortschritt">
          Überblick
        </SectionHeading>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: 'Lektionen abgeschlossen',
                value: `${data.totals.lessonsCompleted} von ${data.totals.lessonsTotal}`,
                icon: 'lernen',
              },
              {
                label: 'Aufgaben eigenständig gelöst',
                value: <AnimatedNumber value={data.totals.exercisesPassed} />,
                icon: 'haken',
              },
              {
                label: 'Projekte abgenommen',
                value: <AnimatedNumber value={data.totals.projectsAccepted} />,
                icon: 'projekte',
              },
              {
                label: 'Aktive Lernzeit',
                value: <AnimatedNumber value={data.totals.activeMinutes} suffix=" Minuten" />,
                icon: 'zeit',
              },
            ] satisfies ReadonlyArray<{ label: string; value: React.ReactNode; icon: IconName }>
          ).map((item, index) => (
            <Card
              key={item.label}
              style={{ ...themeStyle(moduleTheme(index)), animationDelay: `${index * 70}ms` }}
              className="card-accent hover-lift hover-glow animate-in group"
            >
              <span aria-hidden="true" className="icon-tile size-11">
                <Icon name={item.icon} size={21} />
              </span>
              <dt className="mt-3 text-sm text-[var(--text-muted)]">{item.label}</dt>
              <dd className="mt-0.5 text-2xl font-black tracking-tight text-[var(--akzent)]">
                {item.value}
              </dd>
            </Card>
          ))}
        </dl>
      </section>

      <LearningRhythm rhythm={motivation.rhythm} />

      {/* --- Wochenübersicht ----------------------------------------------- */}
      <section aria-labelledby="woche">
        <SectionHeading
          id="woche"
          emoji="fortschritt"
          description="Wie viele Aufgaben du an den letzten sieben Tagen bearbeitet hast."
        >
          Diese Woche
        </SectionHeading>
        <Card className="card-accent muster-punkte muster-verlauf-ecke">
          <SaeulenDiagramm
            daten={data.weeklyActivity.map((day) => ({
              label: day.label,
              wert: day.activities,
              beschreibung: `${day.label}, ${day.date}`,
            }))}
            einheit="Aufgaben"
            beschriftung="Bearbeitete Aufgaben der letzten sieben Tage."
          />
        </Card>
      </section>

      {knowledge ? (
        <>
          <ConceptMap data={knowledge} />

          <RetentionForecast
            points={knowledge.forecast}
            message={knowledge.forecastMessage}
            targetPercent={knowledge.targetRetentionPercent}
          />
        </>
      ) : null}

      {/* --- Kompetenzen ---------------------------------------------------- */}
      <section aria-labelledby="konzepte">
        <SectionHeading
          id="konzepte"
          emoji="landkarte"
          description="Je Konzept ein Stand aus deinem Verlauf. Ein niedriger Wert bedeutet nur, dass es noch wenig Gelegenheit zum eigenständigen Anwenden gab."
        >
          Konzepte
        </SectionHeading>

        {/*
         * Erst die Zusammenfassung, dann die Einzelheiten. Die Liste darunter
         * beantwortet „wie steht es um Schleifen?", der Ring beantwortet „wie
         * steht es insgesamt?" – dafür müsste man sonst dreißig Einträge
         * durchzählen.
         */}
        {data.masteryByConcept.length > 0 ? (
          <Card className="card-accent muster-schraffur muster-verlauf-ecke mb-4">
            <KompetenzRing
              stufen={(
                [
                  ['durable', 'sicher abrufbar', 'var(--color-success-500)'],
                  ['solid', 'gefestigt', 'var(--color-success-700)'],
                  ['usable', 'anwendbar', 'var(--color-modul-3)'],
                  ['building', 'im Aufbau', 'var(--color-caution-500)'],
                  ['new', 'noch neu', 'var(--border-strong)'],
                ] as const
              ).map(([band, label, farbe]) => ({
                label,
                farbe,
                anzahl: data.masteryByConcept.filter((concept) => concept.band === band).length,
              }))}
            />
          </Card>
        ) : null}

        {data.masteryByConcept.length === 0 ? (
          <EmptyState
            illustration={<IllustrationNetz />}
            title="Noch keine Konzeptdaten"
            description="Sobald du die ersten Aufgaben bearbeitest, entsteht hier eine Übersicht deiner Konzepte."
            action={<ButtonLink href="/lernen">Zur ersten Lektion</ButtonLink>}
          />
        ) : (
          <ul className="space-y-2">
            {data.masteryByConcept.map((concept, index) => (
              <Card
                as="li"
                key={concept.slug}
                style={{ ...themeStyle(moduleTheme(index)), animationDelay: `${index * 40}ms` }}
                className="hover-glow animate-in p-4"
              >
                <div className="flex items-start gap-4">
                  <ProgressRing value={concept.score} label={concept.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold tracking-tight">{concept.name}</p>
                      <Badge tone={BAND_TONE[concept.band]}>{concept.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{concept.meaning}</p>
                  </div>
                </div>
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
        <SectionHeading id="module" icon="lernen">
          Fortschritt nach Themen
        </SectionHeading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.moduleProgress.map((mod, index) => (
            <Card
              as="li"
              key={mod.slug}
              style={{ ...themeStyle(moduleTheme(index)), animationDelay: `${index * 60}ms` }}
              className="card-accent hover-lift hover-glow animate-in"
            >
              <p className="font-bold tracking-tight text-[var(--akzent)]">{mod.title}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {mod.completed} von {mod.total} Lektionen abgeschlossen
              </p>
              <div className="mt-2">
                <ProgressBar
                  value={mod.completed}
                  max={mod.total}
                  label={`${mod.title}: ${mod.completed} von ${mod.total} Lektionen`}
                  tone={mod.completed === mod.total ? 'success' : 'module'}
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
            icon="gluehbirne"
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
        <SectionHeading id="einschaetzung" icon="profil">
          Selbsteinschätzung und Ergebnis
        </SectionHeading>
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
