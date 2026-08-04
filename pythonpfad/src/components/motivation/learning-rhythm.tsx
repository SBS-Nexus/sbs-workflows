import type { ReactNode } from 'react';
import { Card, cx } from '@/components/ui/primitives';
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
 */

const LEVEL_CLASSES: Record<number, string> = {
  0: 'bg-[var(--surface-sunken)] border-[var(--border)]',
  1: 'bg-[var(--accent-soft)] border-[var(--accent-soft)]',
  2: 'bg-[color-mix(in_srgb,var(--accent)_45%,transparent)] border-transparent',
  3: 'bg-[var(--accent)] border-[var(--accent)]',
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

  return (
    <Card as="section" aria-labelledby="rhythmus-titel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="rhythmus-titel" className="text-lg font-semibold">
            Dein Lernrhythmus
          </h2>
          <p className="mt-1 text-[0.9375rem] text-[var(--text-muted)]">{rhythm.message}</p>
        </div>
        <GoalRing percent={today.percent} minutes={today.minutes} goal={today.goalMinutes} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-[var(--text-muted)]">Lerntage in 30 Tagen</dt>
          <dd className="text-2xl font-semibold tabular-nums">{learningDaysLast30}</dd>
        </div>
        <div>
          <dt className="text-sm text-[var(--text-muted)]">Aktuelle Serie</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {currentStreakDays}
            <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">
              {currentStreakDays === 1 ? 'Tag' : 'Tage'}
            </span>
          </dd>
        </div>
        {variant === 'full' ? (
          <div>
            <dt className="text-sm text-[var(--text-muted)]">Längste Serie</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {longestStreakDays}
              <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">
                {longestStreakDays === 1 ? 'Tag' : 'Tage'}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {describeStreak(currentStreakDays, longestStreakDays)} Eine Pause ändert nichts an dem, was
        du schon gelernt hast.
      </p>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Die letzten 30 Tage</h3>
        <ol className="mt-2 flex flex-wrap gap-1">
          {calendar.map((day) => (
            <li key={day.date}>
              <span
                title={day.label}
                className={cx(
                  'block size-4 rounded-sm border',
                  LEVEL_CLASSES[day.level],
                  day.isToday && 'ring-2 ring-[var(--focus-ring)] ring-offset-1',
                )}
              />
              <span className="sr-only">{day.label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-3 rounded-sm border', LEVEL_CLASSES[0])} />
            ohne Übung
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-3 rounded-sm border', LEVEL_CLASSES[1])} />
            etwas
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-3 rounded-sm border', LEVEL_CLASSES[2])} />
            gut die Hälfte
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-3 rounded-sm border', LEVEL_CLASSES[3])} />
            Ziel erreicht
          </span>
        </p>
      </div>

      {variant === 'full' ? (
        <p className="mt-4 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-muted)]">
          Dein Tagesziel lässt sich jederzeit im{' '}
          <a href="/profil" className="text-[var(--accent)] underline">
            Profil
          </a>{' '}
          ändern. Ein Ziel, das zu deinem Alltag passt, ist mehr wert als ein ehrgeiziges.
        </p>
      ) : null}
    </Card>
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
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth="8"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${gefuellt} ${umfang}`}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray var(--duration-slow) var(--ease-decelerate)' }}
        />
        <text
          x="36"
          y="36"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[var(--text)] text-[0.875rem] font-semibold"
        >
          {minutes}
        </text>
        <text
          x="36"
          y="50"
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
