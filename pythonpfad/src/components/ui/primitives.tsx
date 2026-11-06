import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';
import { Emoji, type EmojiName } from '@/components/ui/emoji';
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
 * Kleine, zugängliche Bausteine.
 *
 * Bewusst ohne zusätzliche Komponentenbibliothek: Die Anwendung braucht ein
 * gutes Dutzend Elemente, und jede Abhängigkeit weniger bedeutet weniger
 * Angriffsfläche und weniger Ballast im Client-Bundle. Die hier verwendeten
 * Muster (semantisches HTML, sichtbarer Fokus, Beschriftungen, aria-live)
 * entsprechen den Empfehlungen des WAI-ARIA Authoring Practices Guide.
 */

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------

/*
 * Knöpfe (LP-03C): Aussehen, Größen und die taktile Unterkante kommen aus dem
 * gemeinsamen Komponentenvertrag (`@/lib/learning-components`, Darstellung in
 * `learning-components.css`) — gleich in allen Lernpfaden, Pfad-Akzent über
 * `data-lp-app` am Wurzelelement. Die Unterkante sinkt beim Drücken ein: Der
 * Zustand „gedrückt" ist an der Geometrie erkennbar, nicht allein an einer
 * Farbe. Ältere Variantennamen (`onDark`, `onDarkGhost`) bleiben gültig.
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

/*
 * Karten (LP-03C): Eine Karte ist entweder Information (`Card`) oder als
 * Ganzes ein Ziel (`CardLink`) — nie beides. Fläche und Rand nehmen die
 * Bereichsfarbe leicht an (`themeStyle` setzt dafür `--lp-ui-area`); eine
 * klickbare Karte trägt die taktile Unterkante wie ein Knopf.
 */
export function Card({
  as: Component = 'div',
  emphasis = 'none',
  className,
  id,
  style,
  children,
  ...aria
}: {
  as?: 'div' | 'section' | 'article' | 'li';
  /** Hervorhebung des Randes; die Bedeutung muss zusätzlich im Text stehen. */
  emphasis?: CardEmphasis;
  className?: string;
  id?: string;
  /** Für die Leitfarbe des Bereichs, siehe `themeStyle`. */
  style?: React.CSSProperties;
  children: ReactNode;
  /**
   * Beschriftung des Bereichs.
   *
   * Ohne Beschriftung ist ein `<section>` für Hilfstechnik kein benannter
   * Bereich, sondern ein anonymer Kasten – er taucht dann in keiner
   * Bereichsübersicht auf und lässt sich nicht ansteuern. Diese beiden
   * Attribute werden deshalb ausdrücklich durchgereicht.
   */
  'aria-labelledby'?: string;
  'aria-label'?: string;
}): ReactNode {
  const ui = cardAttributes('static', emphasis);
  return (
    <Component
      {...aria}
      id={id}
      style={style}
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

/**
 * Ältere Tonnamen. Bleiben für Toasts und bestehende Aufrufe gültig; Badge
 * und Callout lösen sie über den Statusvertrag auf (`caution` → `warning`,
 * `alert` → `danger`).
 */
export type Tone = 'info' | 'success' | 'caution' | 'alert';

/*
 * Rückmeldung und Status (LP-03B): Darstellung und Bedeutung kommen aus dem
 * gemeinsamen Statusvertrag (`@/lib/learning-feedback`, Klassen in
 * `learning-feedback.css`) — gleich in allen Lernpfaden. App-eigen bleibt
 * nur das Symbol.
 */
const CALLOUT_ICON: Record<CalloutTone, IconName> = {
  neutral: 'info',
  info: 'info',
  success: 'haken',
  warning: 'achtung',
  danger: 'fehler',
};

/**
 * Rückmeldung mit Symbol UND Text.
 * Farbe ist nie das einzige Unterscheidungsmerkmal (WCAG 1.4.1).
 * Statisch ohne Live-Region; `live` meldet höflich (`role="status"`).
 */
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

/**
 * Kurzer Status. Neben den Meldungstönen auch die Lernzustände `due`
 * (fällig), `in-progress` (begonnen) und `locked` (gesperrt) — die
 * Bedeutung trägt immer der Text, die Farbe unterstützt nur.
 */
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

/**
 * Fortschrittsanzeige (LP-03C).
 *
 * Wert, Grenzen und sprechbarer Wert („3 von 10") kommen aus dem
 * gemeinsamen Vertrag; ungültige Daten ergeben einen leeren Balken, nie einen
 * vollen. Die sichtbare Zahl steht an der Aufrufstelle — Farbe allein trägt
 * keine Bedeutung. `module` nimmt die Leitfarbe des umgebenden Bereichs
 * (`themeStyle`), ältere Tonnamen (`caution`) bleiben gültig.
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
        <p id={hintId} className="text-sm text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-[var(--alert)]"
        >
          <Icon name="fehler" size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'w-full min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] ' +
  'px-3 py-2.5 text-[0.95rem] text-[var(--text)] placeholder:text-[var(--text-muted)]';

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
    <figure className="overflow-hidden rounded-lg border border-[var(--border)]">
      {label ? (
        <figcaption className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
          {label}
        </figcaption>
      ) : null}
      <div className="overflow-x-auto bg-[var(--surface-raised)]">
        <pre className="min-w-full py-2 text-[0.875rem] leading-relaxed">
          <code className="font-mono">
            {lines.map((line, index) => (
              <span
                key={index}
                className={cx('flex', highlighted.has(index + 1) && 'bg-[var(--accent-soft)]')}
              >
                <span
                  aria-hidden="true"
                  className="w-10 shrink-0 select-none pr-3 text-right text-[var(--text-muted)]"
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

/**
 * Leerer Zustand (LP-03C).
 *
 * Ein leerer Bereich ist der Moment, in dem eine Anwendung am ehesten wie ein
 * Fehler aussieht – dabei ist er meistens völlig in Ordnung. Der Vertrag
 * unterscheidet deshalb drei Aussagen: `start` („hier ist noch nichts"),
 * `done` („gerade ist nichts zu tun – alles erledigt") und `filtered` („die
 * Auswahl trifft nichts"). Welche Zeichnung, entscheidet die aufrufende
 * Stelle; ohne Zeichnung steht das Symbol der jeweiligen Aussage.
 */
const EMPTY_ICON: Record<EmptyKind, IconName> = {
  start: 'gluehbirne',
  done: 'haken',
  filtered: 'suchen',
};

export function EmptyState({
  kind = 'start',
  size = 'regular',
  title,
  description,
  action,
  illustration,
}: {
  kind?: EmptyKind;
  /** `compact` für einen Hinweis innerhalb eines Panels. */
  size?: EmptySize;
  title: string;
  description: string;
  action?: ReactNode;
  /** Zeichnung aus `@/components/ui/illustration`. Ohne Angabe nur ein Symbol. */
  illustration?: ReactNode;
}): ReactNode {
  const ui = emptyAttributes(kind, size);
  return (
    <div
      className={ui.className}
      data-lp-empty={ui['data-lp-empty']}
      data-lp-size={ui['data-lp-size']}
    >
      {illustration ? (
        <div aria-hidden="true" className={COMPONENT_CLASS.emptyArt} data-lp-art="illustration">
          {illustration}
        </div>
      ) : (
        <span aria-hidden="true" className={COMPONENT_CLASS.emptyArt}>
          <Icon name={EMPTY_ICON[kind]} size={size === 'compact' ? 20 : 30} />
        </span>
      )}
      <div className={COMPONENT_CLASS.emptyBody}>
        <p className={COMPONENT_CLASS.emptyTitle}>{title}</p>
        <p className={COMPONENT_CLASS.emptyText}>{description}</p>
        {action ? <div className={COMPONENT_CLASS.emptyActions}>{action}</div> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * Seitenweiter Fehlerzustand (LP-03C): abgestürzte Seite, unbekannte Adresse,
 * nicht erreichbarer Dienst. Verrät keine technischen Details — eine Kennung
 * für die Fehlersuche erscheint nur, wenn sie wie eine Kennung aussieht.
 */
const ERROR_ICON: Record<ErrorKind, IconName> = {
  unexpected: 'fehler',
  'not-found': 'suchen',
  unavailable: 'achtung',
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

/**
 * Ladeplatzhalter.
 *
 * Der umgebende Bereich muss `aria-busy="true"` tragen; die Kästchen selbst
 * sind für Hilfstechnik unsichtbar. Ein vorgelesenes „Bild, Bild, Bild" wäre
 * keine Information, sondern Lärm.
 */
export function Skeleton({
  className,
  /** Anzahl Zeilen. Die letzte wird verkürzt, damit es wie Text aussieht. */
  lines = 1,
}: {
  className?: string;
  lines?: number;
}): ReactNode {
  if (lines <= 1) {
    return <div aria-hidden="true" className={cx('skeleton h-4 w-full', className)} />;
  }

  return (
    <div aria-hidden="true" className={cx('space-y-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className={cx('skeleton h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/**
 * Taste in einer Bedienhilfe, etwa „Strg + K".
 *
 * `<kbd>` ist das dafür vorgesehene Element; die Gestaltung macht es nur
 * erkennbar, ändert aber nichts an der Bedeutung.
 */
export function Kbd({ children }: { children: ReactNode }): ReactNode {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-[0.75rem] font-medium text-[var(--text-muted)]">
      {children}
    </kbd>
  );
}

/**
 * Überschrift eines Abschnitts.
 *
 * Mit optionalem Symbol in der Leitfarbe. Ohne Symbol bleibt es bei der reinen
 * Überschrift – nicht jeder Abschnitt braucht eines, und ein Symbol, das nur
 * da ist, weil ein Platz dafür vorgesehen war, ist Lärm.
 *
 * Der kurze farbige Strich links vom Text ist dagegen immer da. Er kostet vier
 * Pixel und macht aus einer Zeile Fettschrift eine sichtbare Zäsur.
 */
export function SectionHeading({
  children,
  description,
  id,
  icon,
  emoji,
}: {
  children: ReactNode;
  description?: string;
  id?: string;
  icon?: IconName;
  /**
   * Emoji statt gezeichnetem Symbol.
   *
   * Für Abschnitte im Inhalt, wo ein bisschen Lockerheit hilft. In der
   * Navigation ist das ausdrücklich nicht vorgesehen – dort sitzen gezeichnete
   * Vollsymbole, weil eine Leiste auf jedem Gerät gleich aussehen muss.
   * Ausführlich in `emoji.tsx`.
   */
  emoji?: EmojiName;
}): ReactNode {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        {/*
         * Abschnittsmarke.
         *
         * Vorher saß das Zeichen in einer abgerundeten Quadratkachel mit
         * Farbfläche. Diese Kachel ist ein Klischee: Sie taucht in praktisch
         * jeder automatisch zusammengestellten Oberfläche auf, weil sie ein
         * Symbol ohne jede Entscheidung „gestaltet" aussehen lässt.
         *
         * Stattdessen ein senkrechter Strich in der Bereichsfarbe und das
         * Zeichen frei danebengestellt. Der Strich ist die ältere und ruhigere
         * Lösung – er ordnet die Überschrift einer Spalte zu, statt einen
         * zweiten Kasten neben den Text zu setzen. Auf einer Seite mit sechs
         * Abschnitten macht das den Unterschied zwischen gegliedert und
         * gekachelt.
         */}
        <span
          aria-hidden="true"
          className="h-7 w-1 shrink-0 rounded-full bg-[var(--akzent,var(--accent))]"
        />
        {emoji ? (
          <span aria-hidden="true" className="shrink-0 leading-none">
            <Emoji name={emoji} size="1.375rem" />
          </span>
        ) : icon ? (
          <span aria-hidden="true" className="shrink-0 text-[var(--akzent,var(--accent))]">
            <Icon name={icon} size={22} />
          </span>
        ) : null}
        <h2 id={id} className="text-xl font-black tracking-tight sm:text-2xl">
          {children}
        </h2>
      </div>
      {description ? (
        <p className="mt-2 pl-[calc(0.375rem+0.75rem)] text-[var(--text-muted)]">{description}</p>
      ) : null}
    </div>
  );
}
