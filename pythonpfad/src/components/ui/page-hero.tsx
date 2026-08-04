import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/components/ui/primitives';
import { type ModuleTheme, themeStyle } from '@/domain/design/module-theme';

/**
 * Kopfbereich eines Hauptbereichs.
 *
 * Jeder Bereich der Anwendung – Üben, Wiederholen, Projekte, Fortschritt –
 * bekommt eine eigene Leitfarbe und ein eigenes Zeichen. Das ist keine Zierde:
 * Wer über die Navigation springt, weiß dadurch am Farbwechsel sofort, dass er
 * woanders gelandet ist. Die Überschrift bestätigt es nur noch.
 *
 * Die große Zeichnung im Hintergrund ist bewusst stark beschnitten und blass.
 * Sie soll die Fläche beleben, nicht mit der Überschrift um Aufmerksamkeit
 * konkurrieren – deshalb liegt sie hinter dem Text und ist für Hilfstechnik
 * unsichtbar.
 */
export function PageHero({
  theme,
  icon,
  title,
  description,
  children,
  className,
}: {
  theme: ModuleTheme;
  icon: IconName;
  title: string;
  description?: ReactNode;
  /** Zusätzliche Angaben, etwa Kennzahlen oder ein Knopf. */
  children?: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <header
      style={themeStyle(theme)}
      className={cx(
        'relative isolate overflow-hidden rounded-3xl border border-[var(--border)]',
        'bg-[var(--akzent-soft)] p-6 sm:p-8',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="animate-float pointer-events-none absolute -right-6 -top-8 -z-10 text-[var(--akzent)] opacity-15"
      >
        <Icon name={icon} size={190} />
      </span>

      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--akzent)] text-[var(--text-inverse)]"
        >
          <Icon name={icon} size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-prose text-[var(--text-muted)]">{description}</p>
          ) : null}
        </div>
      </div>

      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  );
}

/**
 * Kennzahl im Kopfbereich.
 *
 * Die Zahl steht groß über der Beschriftung, nicht daneben – so lassen sich
 * mehrere Kennzahlen nebeneinander in einer Zeile lesen, ohne dass die Augen
 * springen müssen.
 */
export function HeroStat({ value, label }: { value: ReactNode; label: string }): ReactNode {
  return (
    <div className="rounded-2xl bg-[var(--surface-raised)] px-4 py-3">
      <p className="text-2xl font-black tabular-nums tracking-tight text-[var(--akzent)]">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
