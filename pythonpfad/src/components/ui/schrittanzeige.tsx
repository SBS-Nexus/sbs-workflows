import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/components/ui/primitives';

/**
 * „Schritt 1 von 2" als Bild statt als Satz.
 *
 * Der Einstieg besteht aus zwei Schritten. Vorher stand darüber nur eine
 * kleine Zeile Text. Eine sichtbare Kette sagt dasselbe schneller und
 * beantwortet nebenbei die Frage, die beim ersten Formular am meisten
 * beschäftigt: Wie lange geht das noch?
 *
 * Für Hilfstechnik bleibt es beim Satz – eine Kette aus Punkten vorzulesen
 * wäre nutzlos.
 */
const SCHRITTE = ['Ein paar Fragen zu dir', 'Kurze Einstufung'] as const;

export function Schrittanzeige({ aktuell }: { aktuell: 1 | 2 }): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="sr-only">{`Schritt ${aktuell} von ${SCHRITTE.length}: ${SCHRITTE[aktuell - 1]}`}</p>
      {SCHRITTE.map((name, index) => {
        const nummer = index + 1;
        const erledigt = nummer < aktuell;
        const jetzt = nummer === aktuell;
        return (
          <div key={name} aria-hidden="true" className="flex items-center gap-2">
            <span
              className={cx(
                'flex size-7 items-center justify-center rounded-full text-xs font-black',
                erledigt && 'bg-white text-[var(--color-ink-900)]',
                jetzt && 'bg-white/25 text-white ring-2 ring-white',
                !erledigt && !jetzt && 'bg-white/15 text-white/60',
              )}
            >
              {erledigt ? <Icon name="haken" size={14} /> : nummer}
            </span>
            <span className={cx('text-sm font-semibold', jetzt ? 'text-white' : 'text-white/60')}>
              {name}
            </span>
            {nummer < SCHRITTE.length ? (
              <span className="ml-1 hidden h-px w-8 bg-white/30 sm:block" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
