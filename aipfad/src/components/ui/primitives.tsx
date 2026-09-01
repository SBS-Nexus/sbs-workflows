import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';

/**
 * Kleine, zugängliche Bausteine – kein separates Komponentenpaket, siehe
 * DESIGN.md. Semantisches HTML, sichtbarer Fokus, Text-Alternativen. Farbe
 * ist nie das einzige Unterscheidungsmerkmal (WCAG 1.4.1).
 */

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-mono font-semibold ' +
  'tracking-tight transition-colors duration-[var(--duration-fast)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const BUTTON_SIZES = {
  sm: 'min-h-8 px-3 text-xs',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-13 px-6 text-base',
} as const;

export type ButtonSize = keyof typeof BUTTON_SIZES;

const BUTTON_VARIANTS = {
  primary: 'bg-signal-500 text-ink-50 hover:bg-signal-600',
  secondary:
    'border border-[var(--border-strong)] bg-[var(--bg-raised)] text-[var(--fg)] hover:bg-ink-100 dark:hover:bg-ink-800',
  ghost: 'text-signal-500 hover:bg-signal-100 dark:hover:bg-signal-900/40',
  danger: 'bg-alert-500 text-ink-50 hover:bg-alert-700',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}): ReactNode {
  return (
    <button
      {...props}
      className={cx(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], className)}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}): ReactNode {
  return (
    <Link
      {...props}
      href={href}
      className={cx(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], className)}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({
  as: Component = 'div',
  className,
  id,
  children,
  ...aria
}: {
  as?: 'div' | 'section' | 'article' | 'li';
  className?: string;
  id?: string;
  children: ReactNode;
  'aria-labelledby'?: string;
  'aria-label'?: string;
}): ReactNode {
  return (
    <Component
      {...aria}
      id={id}
      className={cx(
        'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-raised)] p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </Component>
  );
}

// ---------------------------------------------------------------------------
// Callout
// ---------------------------------------------------------------------------

const TONE_STYLES = {
  info: {
    container: 'border-wire-500 bg-wire-100 dark:bg-wire-900/40',
    icon: 'info' as IconName,
    label: 'Hinweis',
    iconColor: 'text-wire-600 dark:text-wire-300',
  },
  success: {
    container: 'border-success-500 bg-success-100 dark:bg-success-900/40',
    icon: 'check' as IconName,
    label: 'Erfolg',
    iconColor: 'text-success-700 dark:text-success-100',
  },
  caution: {
    container: 'border-caution-500 bg-caution-100 dark:bg-caution-900/40',
    icon: 'warning' as IconName,
    label: 'Achtung',
    iconColor: 'text-caution-700 dark:text-caution-100',
  },
  alert: {
    container: 'border-alert-500 bg-alert-100 dark:bg-alert-900/40',
    icon: 'error' as IconName,
    label: 'Gefährlich',
    iconColor: 'text-alert-700 dark:text-alert-100',
  },
} as const;

export type Tone = keyof typeof TONE_STYLES;

export function Callout({
  tone = 'info',
  title,
  children,
  live = false,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  live?: boolean;
  className?: string;
}): ReactNode {
  const style = TONE_STYLES[tone];
  return (
    <div
      className={cx(
        'rounded-[var(--radius-md)] border-l-4 border px-4 py-3 text-sm',
        style.container,
        className,
      )}
      {...(live ? { role: 'status', 'aria-live': 'polite' } : {})}
    >
      <p className={cx('flex items-start gap-2 font-mono font-semibold', style.iconColor)}>
        <Icon name={style.icon} size={18} className="mt-0.5 shrink-0" />
        <span>{title ?? style.label}</span>
      </p>
      <div className="mt-1 pl-[1.625rem] text-[var(--fg)]">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export function Badge({
  tone = 'info',
  children,
}: {
  tone?: Tone | 'neutral';
  children: ReactNode;
}): ReactNode {
  const styles: Record<string, string> = {
    neutral:
      'bg-ink-100 text-ink-600 border-ink-300 dark:bg-ink-800 dark:text-ink-300 dark:border-ink-600',
    info: 'bg-wire-100 text-wire-600 border-wire-500 dark:bg-wire-900/40 dark:text-wire-300',
    success: 'bg-success-100 text-success-700 border-success-500',
    caution: 'bg-caution-100 text-caution-700 border-caution-500',
    alert: 'bg-alert-100 text-alert-700 border-alert-500',
  };

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium',
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'signal',
}: {
  value: number;
  max?: number;
  label: string;
  tone?: 'signal' | 'success' | 'caution';
}): ReactNode {
  const percent = max === 0 ? 0 : Math.round((Math.min(value, max) / max) * 100);
  const colors = {
    signal: 'var(--color-signal-500)',
    success: 'var(--color-success-500)',
    caution: 'var(--color-caution-500)',
  } as const;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${percent}%`, backgroundColor: colors[tone] }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}): ReactNode {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-[var(--fg-muted)]">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-alert-500">
          <Icon name="error" size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-raised)] ' +
  'px-3 py-2.5 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)]';

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------

export function CodeBlock({
  code,
  label,
  highlightLines = [],
}: {
  code: string;
  label?: string;
  highlightLines?: number[];
}): ReactNode {
  const lines = code.replace(/\n$/, '').split('\n');
  const highlighted = new Set(highlightLines);

  return (
    <figure className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
      {label ? (
        <figcaption className="border-b border-[var(--border)] bg-ink-100 px-3 py-1.5 font-mono text-xs font-medium text-[var(--fg-muted)] dark:bg-ink-800">
          {label}
        </figcaption>
      ) : null}
      <div className="overflow-x-auto bg-[var(--bg-raised)]">
        <pre className="min-w-full py-2 text-sm leading-relaxed">
          <code className="font-mono">
            {lines.map((line, index) => (
              <span
                key={index}
                className={cx(
                  'flex',
                  highlighted.has(index + 1) && 'bg-signal-100 dark:bg-signal-900/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className="w-10 shrink-0 select-none pr-3 text-right text-[var(--fg-muted)]"
                >
                  {index + 1}
                </span>
                <span className="whitespace-pre pr-4">{line || ' '}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border-strong)] px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="mx-auto mb-5 flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-signal-100 text-signal-600 dark:bg-signal-900/40 dark:text-signal-300"
      >
        <Icon name="lightbulb" size={28} />
      </span>
      <p className="font-mono text-lg font-bold tracking-tight">{title}</p>
      <p className="mx-auto mt-2 max-w-prose text-[var(--fg-muted)]">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kbd
// ---------------------------------------------------------------------------

export function Kbd({ children }: { children: ReactNode }): ReactNode {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-[var(--border-strong)] bg-ink-100 px-1.5 py-0.5 font-mono text-xs font-medium text-[var(--fg-muted)] dark:bg-ink-800">
      {children}
    </kbd>
  );
}

// ---------------------------------------------------------------------------
// SectionHeading
// ---------------------------------------------------------------------------

export function SectionHeading({
  children,
  description,
  id,
  eyebrow,
}: {
  children: ReactNode;
  description?: string;
  id?: string;
  /** Kurzes Etikett in Großbuchstaben über der Überschrift, z. B. "STUFE 0". */
  eyebrow?: string;
}): ReactNode {
  return (
    <div className="mb-5">
      {eyebrow ? (
        <p className="mb-1.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-6 w-1 shrink-0 rounded-full bg-signal-500" />
        <h2 id={id} className="font-mono text-xl font-bold tracking-tight sm:text-2xl">
          {children}
        </h2>
      </div>
      {description ? <p className="mt-2 pl-[1rem] text-[var(--fg-muted)]">{description}</p> : null}
    </div>
  );
}
