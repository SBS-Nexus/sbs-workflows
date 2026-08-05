import type { ReactNode } from 'react';
import { Card, ProgressBar, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';
import type { MilestoneState } from '@/domain/motivation/milestones';

/**
 * Meilensteine.
 *
 * Gestaltung nach denselben Grundsätzen wie der Rhythmus:
 *  - Erreichte oben, offene darunter. Kein Schloss-Symbol und keine
 *    Verdunkelung: Ein offener Meilenstein ist kein gesperrter Inhalt,
 *    sondern eine Beschreibung dessen, was als Nächstes kommt.
 *  - Bei offenen Meilensteinen wird der Fortschritt genannt („3 von 10"),
 *    nicht der Rückstand („noch 7").
 *  - Der Text sagt, was die Person kann, nicht wie gut das ist.
 */
export function MilestoneList({
  milestones,
  next,
}: {
  milestones: readonly MilestoneState[];
  next: MilestoneState | null;
}): ReactNode {
  const erreicht = milestones.filter((state) => state.reached);
  const offen = milestones.filter((state) => !state.reached);

  return (
    <Card
      as="section"
      aria-labelledby="meilensteine-titel"
      style={themeStyle(moduleTheme(0))}
      className="card-accent muster-stufen muster-verlauf-ecke group"
    >
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="icon-tile mt-0.5 size-11">
          <Icon name="karte" size={22} />
        </span>
        <div className="min-w-0">
          <h2 id="meilensteine-titel" className="text-lg font-bold tracking-tight">
            Meilensteine
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            <span className="font-bold text-[var(--akzent)]">
              <AnimatedNumber value={erreicht.length} /> von {milestones.length}
            </span>{' '}
            erreicht. Jeder steht für eine Fähigkeit, nicht für aufgewendete Zeit – deshalb gibt es
            keinen für Regelmäßigkeit.
          </p>
        </div>
      </div>

      {next ? (
        <div className="mt-5 rounded-2xl border-2 border-[var(--akzent)] bg-[var(--akzent-soft)] p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--akzent)]">
            <Icon name="funke" size={15} />
            Als Nächstes erreichbar
          </p>
          <p className="mt-1.5 font-bold tracking-tight">{next.label}</p>
          <p className="mt-1 text-sm">{next.description}</p>
          <div className="mt-3">
            <ProgressBar
              value={next.current}
              max={next.target}
              label={`${next.label}: ${next.current} von ${next.target}`}
              tone="module"
            />
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-[var(--akzent)]">
              {next.current} von {next.target}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-[var(--success)] bg-[var(--success-soft)] p-4 text-[0.9375rem]">
          Alle Meilensteine dieses Kurses sind erreicht. Was jetzt kommt, entscheidest du selbst –
          etwa ein eigenes kleines Programm im Code-Labor.
        </p>
      )}

      <ul className="mt-5 space-y-2">
        {[...erreicht, ...offen].map((state, index) => (
          <li
            key={state.key}
            style={{ animationDelay: `${index * 45}ms` }}
            className={cx(
              'animate-in flex items-start gap-3 rounded-xl border-2 px-3.5 py-3',
              'transition-colors duration-200',
              state.reached
                ? 'border-[var(--success)] bg-[var(--success-soft)]'
                : 'border-[var(--border)] hover:border-[var(--akzent)]',
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                state.reached
                  ? 'bg-[var(--success)] text-[var(--text-inverse)]'
                  : 'border-2 border-[var(--border-strong)] text-[var(--text-muted)]',
              )}
            >
              <Icon name={state.reached ? 'haken' : 'kreis'} size={14} />
            </span>
            <div className="min-w-0">
              <p className="font-bold tracking-tight">
                <span className="sr-only">{state.reached ? 'Erreicht: ' : 'Noch offen: '}</span>
                {state.label}
              </p>
              <p className="text-sm text-[var(--text-muted)]">{state.description}</p>
              {!state.reached && state.target > 1 ? (
                <p className="mt-1 text-sm tabular-nums text-[var(--text-muted)]">
                  {state.current} von {state.target}
                </p>
              ) : null}
              {state.reached && state.awardedAt ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Erreicht am{' '}
                  {state.awardedAt.toLocaleDateString('de-DE', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
