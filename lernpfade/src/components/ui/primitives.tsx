import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { CircleAlert, Check, Lightbulb, Search, TriangleAlert, type LucideIcon } from 'lucide-react';
import {
  COMPONENT_CLASS,
  buttonAttributes,
  cardAttributes,
  emptyAttributes,
  errorAttributes,
  errorReference,
  errorTitle,
  progressAttributes,
  progressFillWidth,
  progressValue,
  type ButtonSize,
  type ButtonVariantInput,
  type CardEmphasis,
  type EmptyKind,
  type EmptySize,
  type ErrorKind,
  type ProgressToneInput,
} from '@/lib/learning-components';

/**
 * Bausteine des Hubs im gemeinsamen Komponentenvertrag (LP-03C) — dieselbe
 * Darstellung wie in PythonPfad, SQLPfad und AIPfad (`learning-components.css`,
 * Pfad-Akzent des Hubs über `data-lp-app="hub"`). Der Hub hat kein
 * Client-Routing über `next/link`; Ziele sind gewöhnliche Links.
 */

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariantInput;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}): ReactNode {
  const ui = buttonAttributes(variant, size);
  return (
    <button
      {...props}
      className={cx(ui.className, className)}
      data-lp-variant={ui['data-lp-variant']}
      data-lp-size={ui['data-lp-size']}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariantInput;
  size?: ButtonSize;
}): ReactNode {
  const ui = buttonAttributes(variant, size);
  return (
    <a
      {...props}
      className={cx(ui.className, className)}
      data-lp-variant={ui['data-lp-variant']}
      data-lp-size={ui['data-lp-size']}
    >
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/** Eine Karte, die als Ganzes ein Link ist. Enthält keine weiteren Bedienelemente. */
export function CardLink({
  emphasis = 'none',
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  emphasis?: CardEmphasis;
}): ReactNode {
  const ui = cardAttributes('interactive', emphasis);
  return (
    <a
      {...props}
      className={cx(ui.className, className)}
      data-lp-card={ui['data-lp-card']}
      data-lp-emphasis={ui['data-lp-emphasis']}
    >
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

/**
 * Fortschritt mit sprechbarem Wert („3 von 10") aus dem Vertrag. Die
 * sichtbare Zahl steht an der Aufrufstelle; Farbe allein trägt nichts.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'accent',
  valueText,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  tone?: ProgressToneInput;
  valueText?: string;
  className?: string;
}): ReactNode {
  const progress = progressValue(value, max);
  const ui = progressAttributes(progress, tone, valueText);
  return (
    <div {...ui} className={cx(ui.className, className)} aria-label={label}>
      <div className={COMPONENT_CLASS.progressFill} style={{ width: progressFillWidth(progress) }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

const EMPTY_ICON: Record<EmptyKind, LucideIcon> = {
  start: Lightbulb,
  done: Check,
  filtered: Search,
};

/** Leerer Zustand: `start`, `done` oder `filtered` — siehe Komponentenvertrag. */
export function EmptyState({
  kind = 'start',
  size = 'regular',
  title,
  description,
  action,
}: {
  kind?: EmptyKind;
  size?: EmptySize;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}): ReactNode {
  const ui = emptyAttributes(kind, size);
  const Symbol = EMPTY_ICON[kind];
  return (
    <div
      className={ui.className}
      data-lp-empty={ui['data-lp-empty']}
      data-lp-size={ui['data-lp-size']}
    >
      <span aria-hidden="true" className={COMPONENT_CLASS.emptyArt}>
        <Symbol size={size === 'compact' ? 20 : 30} strokeWidth={2} />
      </span>
      <div className={COMPONENT_CLASS.emptyBody}>
        <p className={COMPONENT_CLASS.emptyTitle}>{title}</p>
        <p className={COMPONENT_CLASS.emptyText}>{description}</p>
        {action ? <div className={COMPONENT_CLASS.emptyActions}>{action}</div> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorState
// ---------------------------------------------------------------------------

const ERROR_ICON: Record<ErrorKind, LucideIcon> = {
  unexpected: CircleAlert,
  'not-found': Search,
  unavailable: TriangleAlert,
};

/**
 * Seitenweiter Fehlerzustand. Verrät keine technischen Details — eine
 * Kennung erscheint nur, wenn sie wie eine Kennung aussieht.
 */
export function ErrorState({
  kind,
  title,
  children,
  reference,
  actions,
}: {
  kind: ErrorKind;
  title?: string;
  children: ReactNode;
  reference?: unknown;
  actions?: ReactNode;
}): ReactNode {
  const ui = errorAttributes(kind);
  const kennung = errorReference(reference);
  const Symbol = ERROR_ICON[kind];
  return (
    <div className={ui.className} data-lp-error={ui['data-lp-error']}>
      <span aria-hidden="true" className={COMPONENT_CLASS.errorArt}>
        <Symbol size={28} strokeWidth={2} />
      </span>
      <h1 className={COMPONENT_CLASS.errorTitle}>{errorTitle(kind, title)}</h1>
      <div className={COMPONENT_CLASS.errorText}>{children}</div>
      {kennung ? (
        <p className={COMPONENT_CLASS.errorReference}>
          Kennung für die Fehlersuche: <code>{kennung}</code>
        </p>
      ) : null}
      {actions ? <div className={COMPONENT_CLASS.errorActions}>{actions}</div> : null}
    </div>
  );
}
