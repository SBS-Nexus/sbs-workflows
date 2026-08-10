import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';
import { Emoji, type EmojiName } from '@/components/ui/emoji';

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
 * Knöpfe.
 *
 * Die tragenden Knöpfe haben eine sichtbare Unterkante, die beim Drücken
 * einsinkt (`btn-press`). Das ist nicht nur Zierde: Der Zustand „gedrückt" wird
 * dadurch an der Geometrie erkennbar und nicht allein an einem Farbwechsel –
 * ein Vorteil bei Farbsehschwäche und bei hellem Umgebungslicht.
 *
 * Die zurückhaltenden Varianten (ghost) bekommen die Kante bewusst nicht.
 * Wenn jeder Knopf hervortritt, tritt keiner hervor.
 */
const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium ' +
  'transition-[background-color,color,transform,border-bottom-width,box-shadow] ' +
  'disabled:cursor-not-allowed disabled:opacity-55';

const BUTTON_SIZES = {
  sm: 'min-h-9 px-3 py-1.5 text-[0.875rem]',
  md: 'min-h-11 px-4 py-2.5 text-[0.95rem]',
  lg: 'min-h-14 px-7 py-3.5 text-[1.0625rem] rounded-2xl',
} as const;

export type ButtonSize = keyof typeof BUTTON_SIZES;

const BUTTON_VARIANTS = {
  primary:
    'btn-press bg-[var(--accent)] text-[var(--text-inverse)] border-b-[var(--accent-deep)] ' +
    'hover:bg-[var(--accent-hover)] font-bold tracking-tight',
  secondary:
    'btn-press bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border-strong)] ' +
    'border-b-[var(--border-strong)] hover:bg-[var(--surface-sunken)] font-semibold',
  ghost: 'text-[var(--accent)] hover:bg-[var(--accent-soft)] font-semibold',
  danger:
    'btn-press bg-[var(--alert)] text-[var(--text-inverse)] border-b-[var(--alert-deep)] ' +
    'hover:opacity-90 font-bold',
  /** Auf dunklem Verlauf. Weiße Fläche, damit der Kontrast unabhängig vom Verlauf stimmt. */
  onDark:
    'btn-press bg-white text-[var(--color-ink-900)] border-b-[var(--color-ink-300)] ' +
    'hover:bg-[var(--color-ink-100)] font-bold tracking-tight',
  /** Zweitrangig auf dunklem Verlauf. */
  onDarkGhost:
    'border-2 border-white/45 text-white hover:bg-white/12 font-semibold backdrop-blur-sm',
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

export function Card({
  as: Component = 'div',
  className,
  id,
  style,
  children,
  ...aria
}: {
  as?: 'div' | 'section' | 'article' | 'li';
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
  return (
    <Component
      {...aria}
      id={id}
      style={style}
      /*
       * `karte-flaeche` färbt Fläche und Rahmen mit der Bereichsfarbe ein –
       * siehe globals.css. Die größere Rundung gehört dazu: Ein Radius von
       * 16 Pixeln wirkt sachlich, einer von 24 wirkt zugewandt, und das ist
       * bei einer Lernanwendung für Anfänger keine Geschmacksfrage.
       */
      className={cx('karte-flaeche rounded-3xl border p-5 sm:p-6', className)}
    >
      {children}
    </Component>
  );
}

// ---------------------------------------------------------------------------

const TONE_STYLES = {
  info: {
    container: 'border-[var(--border-strong)] bg-[var(--surface-sunken)]',
    icon: 'info' as IconName,
    label: 'Hinweis',
  },
  success: {
    container: 'border-[var(--success)] bg-[var(--success-soft)]',
    icon: 'haken' as IconName,
    label: 'Erfolg',
  },
  caution: {
    container: 'border-[var(--caution)] bg-[var(--caution-soft)]',
    icon: 'achtung' as IconName,
    label: 'Achtung',
  },
  alert: {
    container: 'border-[var(--alert)] bg-[var(--alert-soft)]',
    icon: 'fehler' as IconName,
    label: 'Fehler',
  },
} as const;

export type Tone = keyof typeof TONE_STYLES;

/**
 * Rückmeldung mit Symbol UND Text.
 * Farbe ist nie das einzige Unterscheidungsmerkmal (WCAG 1.4.1).
 */
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
        'rounded-lg border-l-4 border px-4 py-3 text-[0.95rem]',
        style.container,
        className,
      )}
      {...(live ? { role: 'status', 'aria-live': 'polite' } : {})}
    >
      <p className="flex items-start gap-2 font-semibold">
        <Icon name={style.icon} size={18} className="mt-0.5 shrink-0" />
        <span>{title ?? style.label}</span>
      </p>
      <div className="mt-1 pl-[1.625rem]">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function Badge({
  tone = 'info',
  children,
}: {
  tone?: Tone | 'neutral';
  children: ReactNode;
}): ReactNode {
  const styles: Record<string, string> = {
    neutral: 'bg-[var(--surface-sunken)] text-[var(--text-muted)] border-[var(--border)]',
    info: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]',
    success: 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]',
    caution: 'bg-[var(--caution-soft)] text-[var(--caution)] border-[var(--caution)]',
    alert: 'bg-[var(--alert-soft)] text-[var(--alert)] border-[var(--alert)]',
  };

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------

/**
 * Fortschrittsanzeige mit Text-Alternative.
 * Der Wert wird zusätzlich als Text ausgegeben, damit er nicht nur visuell
 * erfassbar ist.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'accent',
}: {
  value: number;
  max?: number;
  label: string;
  /** `module` nimmt die Leitfarbe des umgebenden Bereichs, siehe `themeStyle`. */
  tone?: 'accent' | 'success' | 'caution' | 'module';
}): ReactNode {
  const percent = max === 0 ? 0 : Math.round((Math.min(value, max) / max) * 100);
  const colors = {
    accent: 'var(--accent)',
    success: 'var(--success)',
    caution: 'var(--caution)',
    module: 'var(--akzent, var(--accent))',
  };

  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%`, backgroundColor: colors[tone] }}
        />
      </div>
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
 * Leerer Zustand.
 *
 * Mit Zeichnung statt mit einem leeren gestrichelten Kasten. Ein leerer
 * Bereich ist der Moment, in dem eine Anwendung am ehesten wie ein Fehler
 * aussieht – dabei ist er meistens völlig in Ordnung („heute steht keine
 * Wiederholung an"). Die Zeichnung nimmt der Fläche das Kaputte und lässt
 * Raum für den Satz, der erklärt, warum das so ist.
 *
 * Welche Zeichnung, entscheidet die aufrufende Stelle. Ein einziges Motiv für
 * alle leeren Zustände wäre bequem und falsch: „Hier ist noch nichts" und
 * „hier ist gerade nichts zu tun" sind verschiedene Aussagen, und die
 * Zeichnung ist das Erste, was gelesen wird.
 */
export function EmptyState({
  title,
  description,
  action,
  illustration,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  /** Zeichnung aus `@/components/ui/illustration`. Ohne Angabe nur ein Symbol. */
  illustration?: ReactNode;
}): ReactNode {
  return (
    <div className="animate-in muster-punkte muster-verlauf rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--akzent-soft,var(--surface-raised))] px-6 py-10 text-center">
      {illustration ? (
        <div aria-hidden="true" className="mx-auto mb-6 max-w-[13rem]">
          {illustration}
        </div>
      ) : (
        <span
          aria-hidden="true"
          className="animate-float mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-[var(--surface-raised)] text-[var(--akzent,var(--accent))]"
        >
          <Icon name="gluehbirne" size={32} />
        </span>
      )}
      <p className="text-lg font-black tracking-tight">{title}</p>
      <p className="mx-auto mt-2 max-w-prose text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
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
      <div className="flex items-center gap-3">
        {emoji ? (
          <span aria-hidden="true" className="icon-tile size-10 text-[1.25rem]">
            <Emoji name={emoji} size="1.25rem" />
          </span>
        ) : icon ? (
          <span aria-hidden="true" className="icon-tile size-10">
            <Icon name={icon} size={20} />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="h-7 w-1.5 shrink-0 rounded-full bg-[var(--akzent,var(--accent))]"
          />
        )}
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
