import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';
import {
  FEEDBACK_CLASS,
  calloutTitle,
  feedbackBadge,
  feedbackCallout,
  feedbackLive,
  type CalloutTone,
  type CalloutToneInput,
  type FeedbackToneInput,
} from '@/lib/learning-feedback';
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

/*
 * Knöpfe (LP-03C): Aussehen, Größen und die taktile Unterkante kommen aus dem
 * gemeinsamen Komponentenvertrag (`@/lib/learning-components`, Darstellung in
 * `learning-components.css`) — gleich in allen Lernpfaden, Pfad-Akzent
 * (Bernstein) über `data-lp-app` am Wurzelelement, Beschriftung in der
 * Produktschrift (Sans) wie bei Callouts. Monospace bleibt Fachinhalten
 * vorbehalten (`docs/LEARNING-DESIGN-SYSTEM.md` §6).
 */
export type ButtonVariant = ButtonVariantInput;
export type { ButtonSize };

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: React.Ref<HTMLButtonElement>;
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
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}): ReactNode {
  const ui = buttonAttributes(variant, size);
  return (
    <Link
      {...props}
      href={href}
      className={cx(ui.className, className)}
      data-lp-variant={ui['data-lp-variant']}
      data-lp-size={ui['data-lp-size']}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/*
 * Karten (LP-03C): Eine Karte ist entweder Information (`Card`) oder als
 * Ganzes ein Ziel (`CardLink`) — nie beides. Eine klickbare Karte trägt die
 * taktile Unterkante wie ein Knopf und enthält keine weiteren Bedienelemente.
 */
export function Card({
  as: Component = 'div',
  emphasis = 'none',
  className,
  id,
  children,
  ...aria
}: {
  as?: 'div' | 'section' | 'article' | 'li';
  /** Hervorhebung des Randes; die Bedeutung muss zusätzlich im Text stehen. */
  emphasis?: CardEmphasis;
  className?: string;
  id?: string;
  children: ReactNode;
  'aria-labelledby'?: string;
  'aria-label'?: string;
}): ReactNode {
  const ui = cardAttributes('static', emphasis);
  return (
    <Component
      {...aria}
      id={id}
      className={cx(ui.className, className)}
      data-lp-card={ui['data-lp-card']}
      data-lp-emphasis={ui['data-lp-emphasis']}
    >
      {children}
    </Component>
  );
}

/** Eine Karte, die als Ganzes ein Link ist. Enthält keine weiteren Bedienelemente. */
export function CardLink({
  emphasis = 'none',
  className,
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { emphasis?: CardEmphasis }): ReactNode {
  const ui = cardAttributes('interactive', emphasis);
  return (
    <Link
      {...props}
      href={href}
      className={cx(ui.className, className)}
      data-lp-card={ui['data-lp-card']}
      data-lp-emphasis={ui['data-lp-emphasis']}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Callout
// ---------------------------------------------------------------------------

/** Ältere Tonnamen; Badge und Callout lösen sie über den Statusvertrag auf. */
export type Tone = 'info' | 'success' | 'caution' | 'alert';

/*
 * Rückmeldung und Status (LP-03B): Darstellung und Bedeutung kommen aus dem
 * gemeinsamen Statusvertrag (`@/lib/learning-feedback`, Klassen in
 * `learning-feedback.css`) — gleich in allen Lernpfaden, Titel in der
 * Produktschrift (Sans). Fachinhalte im Text (Befehle, Code) behalten ihre
 * eigene Auszeichnung. App-eigen bleibt nur das Symbol.
 */
const CALLOUT_ICON: Record<CalloutTone, IconName> = {
  neutral: 'info',
  info: 'info',
  success: 'check',
  warning: 'warning',
  danger: 'error',
};

export function Callout({
  tone = 'info',
  title,
  children,
  live = false,
  className,
}: {
  tone?: CalloutToneInput;
  title?: string;
  children: ReactNode;
  live?: boolean;
  className?: string;
}): ReactNode {
  const feedback = feedbackCallout(tone);
  const heading = calloutTitle(tone, title);
  return (
    <div
      className={cx(feedback.className, className)}
      data-lp-tone={feedback['data-lp-tone']}
      {...feedbackLive(live)}
    >
      {heading ? (
        <p className={FEEDBACK_CLASS.title}>
          <Icon
            name={CALLOUT_ICON[feedback['data-lp-tone'] as CalloutTone]}
            size={18}
            className={FEEDBACK_CLASS.icon}
          />
          <span>{heading}</span>
        </p>
      ) : null}
      <div className={FEEDBACK_CLASS.body}>{children}</div>
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
  tone?: FeedbackToneInput;
  children: ReactNode;
}): ReactNode {
  const feedback = feedbackBadge(tone);
  return (
    <span className={cx('inline-flex', feedback.className)} data-lp-tone={feedback['data-lp-tone']}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

/**
 * Fortschrittsanzeige (LP-03C): Wert, Grenzen und sprechbarer Wert („3 von
 * 10") aus dem gemeinsamen Vertrag; ungültige Daten ergeben einen leeren
 * Balken, nie einen vollen. Die sichtbare Zahl steht an der Aufrufstelle.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'accent',
  valueText,
}: {
  value: number;
  max?: number;
  label: string;
  tone?: ProgressToneInput;
  /** Eigener sprechbarer Wert, falls „x von y" nicht passt. */
  valueText?: string;
}): ReactNode {
  const progress = progressValue(value, max);
  return (
    <div {...progressAttributes(progress, tone, valueText)} aria-label={label}>
      <div
        className={COMPONENT_CLASS.progressFill}
        style={{ width: progressFillWidth(progress) }}
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

/**
 * Leerer Zustand (LP-03C): `start` („hier ist noch nichts"), `done` („gerade
 * ist nichts zu tun — alles erledigt") oder `filtered` („die Auswahl trifft
 * nichts"). Je Aussage ein eigenes Symbol.
 */
const EMPTY_ICON: Record<EmptyKind, IconName> = {
  start: 'lightbulb',
  done: 'check',
  filtered: 'search',
};

export function EmptyState({
  kind = 'start',
  size = 'regular',
  title,
  description,
  action,
}: {
  kind?: EmptyKind;
  /** `compact` für einen Hinweis innerhalb eines Panels. */
  size?: EmptySize;
  title: string;
  description: string;
  action?: ReactNode;
}): ReactNode {
  const ui = emptyAttributes(kind, size);
  return (
    <div
      className={ui.className}
      data-lp-empty={ui['data-lp-empty']}
      data-lp-size={ui['data-lp-size']}
    >
      <span aria-hidden="true" className={COMPONENT_CLASS.emptyArt}>
        <Icon name={EMPTY_ICON[kind]} size={size === 'compact' ? 20 : 30} />
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

/**
 * Seitenweiter Fehlerzustand (LP-03C): abgestürzte Seite, unbekannte Adresse,
 * nicht erreichbarer Dienst. Verrät keine technischen Details — eine Kennung
 * für die Fehlersuche erscheint nur, wenn sie wie eine Kennung aussieht.
 */
const ERROR_ICON: Record<ErrorKind, IconName> = {
  unexpected: 'error',
  'not-found': 'search',
  unavailable: 'warning',
};

export function ErrorState({
  kind,
  title,
  children,
  reference,
  actions,
}: {
  kind: ErrorKind;
  /** Fachlicher Titel; ohne Angabe der allgemeine des Vertrags. */
  title?: string;
  children: ReactNode;
  /** Etwa `error.digest` aus Next.js. */
  reference?: unknown;
  actions?: ReactNode;
}): ReactNode {
  const ui = errorAttributes(kind);
  const kennung = errorReference(reference);
  return (
    <div className={ui.className} data-lp-error={ui['data-lp-error']}>
      <span aria-hidden="true" className={COMPONENT_CLASS.errorArt}>
        <Icon name={ERROR_ICON[kind]} size={28} />
      </span>
      <h1 className={COMPONENT_CLASS.errorTitle}>{errorTitle(kind, title)}</h1>
      <div className={COMPONENT_CLASS.errorText}>{children}</div>
      {kennung ? (
        <p className={COMPONENT_CLASS.errorReference}>
          Kennung für die Fehlersuche: <code className="font-mono">{kennung}</code>
        </p>
      ) : null}
      {actions ? <div className={COMPONENT_CLASS.errorActions}>{actions}</div> : null}
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
