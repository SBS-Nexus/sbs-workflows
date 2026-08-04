import type { ReactNode } from 'react';
import { Card, ProgressBar, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
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
    <Card as="section" aria-labelledby="meilensteine-titel">
      <h2 id="meilensteine-titel" className="text-lg font-semibold">
        Meilensteine
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {erreicht.length} von {milestones.length} erreicht. Jeder steht für eine Fähigkeit, nicht
        für aufgewendete Zeit – deshalb gibt es keinen für Regelmäßigkeit.
      </p>

      {next ? (
        <div className="mt-4 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
            Als Nächstes erreichbar
          </p>
          <p className="mt-1 font-semibold">{next.label}</p>
          <p className="mt-1 text-sm">{next.description}</p>
          <div className="mt-3">
            <ProgressBar
              value={next.current}
              max={next.target}
              label={`${next.label}: ${next.current} von ${next.target}`}
            />
            <p className="mt-1 text-sm text-[var(--text-muted)]">
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
        {[...erreicht, ...offen].map((state) => (
          <li
            key={state.key}
            className={cx(
              'flex items-start gap-3 rounded-lg border px-3 py-2.5',
              state.reached
                ? 'border-[var(--success)] bg-[var(--success-soft)]'
                : 'border-[var(--border)]',
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                state.reached
                  ? 'bg-[var(--success)] text-[var(--surface-raised)]'
                  : 'border border-[var(--border-strong)] text-[var(--text-muted)]',
              )}
            >
              <Icon name={state.reached ? 'haken' : 'kreis'} size={14} />
            </span>
            <div className="min-w-0">
              <p className="font-medium">
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
