import type { ReactNode } from 'react';
import { Card, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';
import { describeStreak } from '@/domain/motivation/rhythm';
import type { RhythmSummary } from '@/domain/motivation/rhythm';

/**
 * Anzeige des Lernrhythmus.
 *
 * Bewusste Entscheidungen in der Darstellung:
 *  - Die große Zahl ist die der Lerntage, nicht die Serie. Sie kann nicht
 *    verloren gehen.
 *  - Der Ring füllt sich bis zum Ziel und dann nicht weiter. Es gibt keine
 *    Anzeige für „Ziel übertroffen": Wer sein Ziel erreicht hat, soll nicht
 *    das Gefühl bekommen, es sei zu niedrig gewesen.
 *  - Die Kalenderleiste zeigt Tage ohne Übung schlicht leer. Keine Lücke wird
 *    markiert, kein Tag rot eingefärbt.
 *  - Jede Farbe hat eine Textentsprechung; die Leiste ist als Liste mit
 *    vorlesbaren Beschriftungen aufgebaut.
 *
 * Zur Gestaltung: Die Karte trägt die Leitfarbe des zweiten Moduls. Das ist
 * keine inhaltliche Aussage, sondern Wiedererkennung – der Lernrhythmus taucht
 * auf zwei Seiten auf und soll auf beiden gleich aussehen.
 */

/**
 * Vier Stufen für die Kalenderleiste.
 *
 * Die Abstufung läuft über die Deckkraft derselben Farbe und nicht über vier
 * verschiedene Farbtöne. Der Grund: Eine Reihe aus vier Bunttönen liest sich
 * als vier Kategorien, eine Reihe aus vier Helligkeiten als eine Skala – und
 * genau das ist gemeint. Nebenbei bleibt die Abstufung bei Farbsehschwäche
 * erhalten.
 */
const LEVEL_CLASSES: Record<number, string> = {
  0: 'bg-[var(--surface-sunken)] border-[var(--border)]',
  1: 'bg-[color-mix(in_oklab,var(--akzent)_28%,transparent)] border-transparent',
  2: 'bg-[color-mix(in_oklab,var(--akzent)_60%,transparent)] border-transparent',
  3: 'bg-[var(--akzent)] border-[var(--akzent)]',
};

export function LearningRhythm({
  rhythm,
  /** Kompakt für die Lernpfadseite, ausführlich für das Dashboard. */
  variant = 'full',
}: {
  rhythm: RhythmSummary;
  variant?: 'full' | 'compact';
}): ReactNode {
  const { today, learningDaysLast30, currentStreakDays, longestStreakDays, calendar } = rhythm;
  const theme = moduleTheme(1);

  return (
    <Card
      as="section"
      aria-labelledby="rhythmus-titel"
      style={themeStyle(theme)}
      className="card-accent group"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <span aria-hidden="true" className="icon-tile mt-0.5 size-11">
            <Icon name="schritte" size={22} />
          </span>
          <div className="min-w-0">
            <h2 id="rhythmus-titel" className="text-lg font-bold tracking-tight">
              Dein Lernrhythmus
            </h2>
            <p className="mt-1 text-[0.9375rem] text-[var(--text-muted)]">{rhythm.message}</p>
          </div>
        </div>
        <GoalRing percent={today.percent} minutes={today.minutes} goal={today.goalMinutes} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kennzahl label="Lerntage in 30 Tagen" wert={learningDaysLast30} />
        <Kennzahl
          label="Aktuelle Serie"
          wert={currentStreakDays}
          einheit={currentStreakDays === 1 ? 'Tag' : 'Tage'}
        />
        {variant === 'full' ? (
          <Kennzahl
            label="Längste Serie"
            wert={longestStreakDays}
            einheit={longestStreakDays === 1 ? 'Tag' : 'Tage'}
          />
        ) : null}
      </dl>

      <p className="mt-3 text-sm text-[var(--text-muted)]">
        {describeStreak(currentStreakDays, longestStreakDays)} Eine Pause ändert nichts an dem, was
        du schon gelernt hast.
      </p>

      <div className="mt-6">
        <h3 className="text-sm font-bold">Die letzten 30 Tage</h3>
        <ol className="mt-2.5 flex flex-wrap gap-1.5">
          {calendar.map((day, index) => (
            <li key={day.date}>
              {/*
               * Die Felder erscheinen nacheinander, von links nach rechts, mit
               * 15 Millisekunden Abstand. Das ergibt eine Welle über gut eine
               * halbe Sekunde – gerade genug, dass die Leiste als Verlauf über
               * die Zeit gelesen wird und nicht als Muster.
               */}
              <span
                title={day.label}
                style={{ animationDelay: `${index * 15}ms` }}
                className={cx(
                  'animate-in block size-5 rounded-md border transition-transform duration-150',
                  'hover:scale-125',
                  LEVEL_CLASSES[day.level],
                  day.isToday && 'ring-2 ring-[var(--akzent)] ring-offset-2',
                )}
              />
              <span className="sr-only">{day.label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
          {(
            [
              [0, 'ohne Übung'],
              [1, 'etwas'],
              [2, 'gut die Hälfte'],
              [3, 'Ziel erreicht'],
            ] as const
          ).map(([stufe, text]) => (
            <span key={text} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cx('size-3 rounded-sm border', LEVEL_CLASSES[stufe])}
              />
              {text}
            </span>
          ))}
        </p>
      </div>

      {variant === 'full' ? (
        <p className="mt-5 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-muted)]">
          Dein Tagesziel lässt sich jederzeit im{' '}
          <a href="/profil" className="font-semibold text-[var(--akzent)] underline">
            Profil
          </a>{' '}
          ändern. Ein Ziel, das zu deinem Alltag passt, ist mehr wert als ein ehrgeiziges.
        </p>
      ) : null}
    </Card>
  );
}

/** Eine Kennzahl auf eigener Fläche – die Zahl zählt beim Sichtwerden hoch. */
function Kennzahl({
  label,
  wert,
  einheit,
}: {
  label: string;
  wert: number;
  einheit?: string;
}): ReactNode {
  return (
    <div className="rounded-xl bg-[var(--akzent-soft)] px-4 py-3">
      <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-2xl font-black tabular-nums tracking-tight text-[var(--akzent)]">
        <AnimatedNumber value={wert} />
        {einheit ? (
          <span className="ml-1 text-sm font-semibold text-[var(--text-muted)]">{einheit}</span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * Fortschrittsring für das Tagesziel.
 *
 * Als SVG und nicht als Balken, weil er neben der Überschrift wenig Platz
 * braucht. Der Wert steht zusätzlich in der Mitte und in der Beschriftung –
 * ein Ring allein wäre eine rein grafische Angabe.
 */
function GoalRing({
  percent,
  minutes,
  goal,
}: {
  percent: number;
  minutes: number;
  goal: number;
}): ReactNode {
  const radius = 26;
  const umfang = 2 * Math.PI * radius;
  const gefuellt = (Math.min(100, percent) / 100) * umfang;
  const erreicht = goal > 0 && percent >= 100;

  return (
    <div
      role="img"
      aria-label={
        goal > 0
          ? `Tagesziel: ${minutes} von ${goal} Minuten, ${percent} Prozent`
          : `Heute ${minutes} Minuten geübt. Kein Tagesziel gesetzt.`
      }
      className="shrink-0"
    >
      <svg width="76" height="76" viewBox="0 0 72 72" aria-hidden="true">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth="8"
        />
        {/* Ein weicher Schein hinter dem Ring, sobald das Ziel erreicht ist.
            Kein Konfetti, keine Trophäe – nur ein Hinweis, dass hier etwas
            zusammengekommen ist. */}
        {erreicht ? (
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="var(--akzent)"
            strokeWidth="14"
            opacity="0.18"
          />
        ) : null}
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--akzent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${gefuellt} ${umfang}`}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray var(--duration-slow) var(--ease-decelerate)' }}
        />
        <text
          x="36"
          y="35"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[var(--akzent)] text-[0.9375rem] font-black"
        >
          {minutes}
        </text>
        <text
          x="36"
          y="49"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[var(--text-muted)] text-[0.5rem]"
        >
          Min.
        </text>
      </svg>
    </div>
  );
}
