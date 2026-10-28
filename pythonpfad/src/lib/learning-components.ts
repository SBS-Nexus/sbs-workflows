/**
 * Lernpfade — gemeinsamer Komponentenvertrag für Aktionen, Flächen und
 * Zustände (LP-03C): Button, Card, ProgressBar, EmptyState, ErrorState.
 *
 * KANONISCH ist `docs/learning-components/learning-components.ts`. PythonPfad,
 * SQLPfad, AIPfad und der Hub führen je eine bytegleiche Kopie unter
 * `src/lib/learning-components.ts`; die Apps bleiben dadurch unabhängig
 * baubar, ohne Laufzeit-Import aus einer anderen App. `node
 * scripts/check-learning-components.mjs` scheitert, sobald eine Kopie fehlt
 * oder abweicht. Geändert wird nur hier — danach in alle vier Apps kopieren.
 *
 * Reine Daten und Funktionen: kein React, kein Zugriff auf Umgebung oder DOM.
 * Darstellung (Farben, Unterkante, Form, Bewegung) liegt in
 * `learning-components.css`; die Apps liefern nur das Markup und ihre Symbole.
 */

// ---------------------------------------------------------------------------
// Pfad
// ---------------------------------------------------------------------------

/**
 * Welche App eine Seite ausliefert. Steht als `data-lp-app` am Wurzelelement
 * (`<html>`) und wählt den Pfad-Akzent der Komponenten — dieselben IDs wie im
 * Shell-Vertrag, dazu der Hub selbst.
 */
export const COMPONENT_APPS = ['python', 'sql', 'ai', 'hub'] as const;

export type ComponentApp = (typeof COMPONENT_APPS)[number];

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

/**
 * Absichten aus `docs/LEARNING-DESIGN-SYSTEM.md` §4, ergänzt um die zwei
 * Fälle, die es in den Apps tatsächlich gibt:
 *
 * - `primary` — genau eine Haupthandlung je Entscheidungsbereich
 * - `secondary` — sichere Alternative
 * - `ghost` — Navigation oder niedrige Priorität, ohne Fläche
 * - `danger` — die destruktive Handlung selbst (im Bestätigungsdialog)
 * - `danger-secondary` — Einstieg in eine destruktive Handlung mit geringer
 *   Betonung, etwa „Löschen" je Listeneintrag; führt immer erst zur Bestätigung
 * - `on-dark` / `on-dark-secondary` — dieselben Rollen auf einer dunklen
 *   Kopffläche, deren Farbe nicht vom Farbschema abhängt
 */
export const BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'ghost',
  'danger',
  'danger-secondary',
  'on-dark',
  'on-dark-secondary',
] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/**
 * Ältere Variantennamen der Apps. Sie bleiben gültig und werden genau hier —
 * an der Adaptergrenze — auf die kanonische Variante abgebildet.
 */
export const BUTTON_VARIANT_ALIASES = {
  onDark: 'on-dark',
  onDarkGhost: 'on-dark-secondary',
  'ghost-danger': 'danger-secondary',
} as const satisfies Record<string, ButtonVariant>;

export type ButtonVariantAlias = keyof typeof BUTTON_VARIANT_ALIASES;

export type ButtonVariantInput = ButtonVariant | ButtonVariantAlias;

/**
 * Drei Größen. Mindesthöhe 36 / 44 / 52 px; `md` erfüllt die 44-px-Zielgröße
 * der Shell, `sm` ist nur für dichte Zusammenhänge (Tabellenzeilen, Karten mit
 * mehreren Aktionen) und liegt mit 36 px weit über WCAG 2.5.8 (24 px).
 */
export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];

/** Varianten mit taktiler Unterkante, die beim Drücken einsinkt. */
export const BUTTON_PRESSABLE: ReadonlySet<ButtonVariant> = new Set([
  'primary',
  'secondary',
  'danger',
  'danger-secondary',
  'on-dark',
]);

export function isButtonVariant(value: unknown): value is ButtonVariant {
  return typeof value === 'string' && (BUTTON_VARIANTS as readonly string[]).includes(value);
}

/** Löst einen (ggf. älteren) Variantennamen in die kanonische Variante auf. */
export function buttonVariant(input: ButtonVariantInput): ButtonVariant {
  if (isButtonVariant(input)) return input;
  const alias = (BUTTON_VARIANT_ALIASES as Record<string, ButtonVariant>)[input];
  if (!alias) throw new Error(`Unbekannte Knopfvariante: ${String(input)}`);
  return alias;
}

export function buttonSize(input: ButtonSize): ButtonSize {
  if (!(BUTTON_SIZES as readonly string[]).includes(input)) {
    throw new Error(`Unbekannte Knopfgröße: ${String(input)}`);
  }
  return input;
}

export type ButtonAttributes = {
  className: string;
  'data-lp-variant': ButtonVariant;
  'data-lp-size': ButtonSize;
};

/** Klassen und Zustandsattribute eines Knopfes oder Knopf-Links. */
export function buttonAttributes(
  variant: ButtonVariantInput = 'primary',
  size: ButtonSize = 'md',
): ButtonAttributes {
  return {
    className: COMPONENT_CLASS.button,
    'data-lp-variant': buttonVariant(variant),
    'data-lp-size': buttonSize(size),
  };
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/**
 * Eine Card ist entweder Information (`static`) oder vollständig klickbares
 * Ziel (`interactive`) — nie beides. Eine interaktive Card ist selbst der
 * Link oder Knopf; sie enthält keine weiteren Bedienelemente.
 */
export const CARD_KINDS = ['static', 'interactive'] as const;

export type CardKind = (typeof CARD_KINDS)[number];

/**
 * Betonung des Randes. `accent` hebt den nächsten Schritt hervor, `danger`
 * einen Bereich mit Fehler oder destruktivem Inhalt. Die Bedeutung muss
 * zusätzlich im Text stehen — der Rand unterstützt nur.
 */
export const CARD_EMPHASES = ['none', 'accent', 'danger'] as const;

export type CardEmphasis = (typeof CARD_EMPHASES)[number];

export type CardAttributes = {
  className: string;
  'data-lp-card': CardKind;
  'data-lp-emphasis'?: Exclude<CardEmphasis, 'none'>;
};

export function cardAttributes(
  kind: CardKind = 'static',
  emphasis: CardEmphasis = 'none',
): CardAttributes {
  if (!(CARD_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`Unbekannte Kartenart: ${String(kind)}`);
  }
  if (!(CARD_EMPHASES as readonly string[]).includes(emphasis)) {
    throw new Error(`Unbekannte Kartenbetonung: ${String(emphasis)}`);
  }
  return {
    className: COMPONENT_CLASS.card,
    'data-lp-card': kind,
    ...(emphasis === 'none' ? {} : { 'data-lp-emphasis': emphasis }),
  };
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

/**
 * Füllfarben. `accent` ist der Pfad-Akzent, `success` ein abgeschlossener,
 * `warning` ein Stand, der Aufmerksamkeit braucht, `neutral` ein Wert ohne
 * Wertung (etwa Anteile in Berichten).
 */
export const PROGRESS_TONES = ['accent', 'success', 'warning', 'neutral'] as const;

export type ProgressTone = (typeof PROGRESS_TONES)[number];

/**
 * Ältere Tonnamen. `module` (PythonPfad) ist der Pfad-Akzent; die Farbe des
 * Bereichs kommt über `--lp-ui-tint` hinzu, nicht über eine eigene Füllung.
 */
export const PROGRESS_TONE_ALIASES = {
  caution: 'warning',
  signal: 'accent',
  module: 'accent',
} as const satisfies Record<string, ProgressTone>;

export type ProgressToneInput = ProgressTone | keyof typeof PROGRESS_TONE_ALIASES;

export function progressTone(input: ProgressToneInput): ProgressTone {
  if ((PROGRESS_TONES as readonly string[]).includes(input)) return input as ProgressTone;
  const alias = (PROGRESS_TONE_ALIASES as Record<string, ProgressTone>)[input];
  if (!alias) throw new Error(`Unbekannter Fortschrittston: ${String(input)}`);
  return alias;
}

export type ProgressValue = {
  /** Auf `0 … max` begrenzter Wert. */
  value: number;
  max: number;
  /** Ganzzahliger Anteil, 0 bis 100. */
  percent: number;
  complete: boolean;
};

/**
 * Normiert einen Fortschritt. Ungültige Eingaben (negativ, `NaN`,
 * unendlich, `max` ≤ 0) ergeben einen leeren, nicht abgeschlossenen Balken —
 * nie einen vollen. Ein Fehler in den Daten darf nicht wie ein Erfolg aussehen.
 */
export function progressValue(value: number, max = 100): ProgressValue {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
  if (safeMax === 0) return { value: 0, max: 0, percent: 0, complete: false };
  // Abrunden: 99,6 % sind nicht fertig und dürfen nicht „100 %" heißen.
  const percent = Math.floor((safeValue / safeMax) * 100);
  return {
    value: safeValue,
    max: safeMax,
    percent,
    complete: safeValue >= safeMax,
  };
}

/** Deutsche Ganzzahl mit Tausenderpunkt. */
function formatCount(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value);
}

/**
 * Sprechbarer Wert für `aria-valuetext`: „3 von 10" — bei einer Skala bis 100
 * „62 %". Damit liest Hilfstechnik nicht bloß „3" vor, wenn der Balken
 * drei von zehn Lektionen meint.
 */
export function progressValueText(progress: ProgressValue): string {
  if (progress.max === 100) return `${formatCount(progress.value)}\u00a0%`;
  return `${formatCount(progress.value)} von ${formatCount(progress.max)}`;
}

export type ProgressAttributes = {
  className: string;
  role: 'progressbar';
  'aria-valuemin': 0;
  'aria-valuemax': number;
  'aria-valuenow': number;
  'aria-valuetext': string;
  'data-lp-tone': ProgressTone;
  'data-lp-complete'?: 'true';
};

/**
 * Attribute der Fortschrittsspur. Die Beschriftung (`aria-label` oder
 * `aria-labelledby`) setzt der Adapter; ohne sie ist ein Balken für
 * Hilfstechnik bedeutungslos.
 */
export function progressAttributes(
  progress: ProgressValue,
  tone: ProgressToneInput = 'accent',
  valueText?: string,
): ProgressAttributes {
  return {
    className: COMPONENT_CLASS.progress,
    role: 'progressbar',
    'aria-valuemin': 0,
    'aria-valuemax': progress.max,
    'aria-valuenow': progress.value,
    'aria-valuetext': valueText ?? progressValueText(progress),
    'data-lp-tone': progressTone(tone),
    ...(progress.complete ? { 'data-lp-complete': 'true' as const } : {}),
  };
}

/** Breite der Füllung als CSS-Wert — begrenzt, nie über 100 %. */
export function progressFillWidth(progress: ProgressValue): string {
  if (progress.max === 0) return '0%';
  const exact = (progress.value / progress.max) * 100;
  return `${Math.min(100, Math.max(0, Math.round(exact * 10) / 10))}%`;
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

/**
 * Ein leerer Bereich sagt eines von drei Dingen, und die Gestaltung muss es
 * unterscheiden:
 *
 * - `start` — hier ist noch nichts; die Aktion führt zum ersten Schritt
 * - `done` — gerade ist nichts zu tun, weil alles erledigt ist (ein Erfolg,
 *   kein Fehler und kein Mangel)
 * - `filtered` — es gibt Daten, aber die Auswahl trifft keine
 */
export const EMPTY_KINDS = ['start', 'done', 'filtered'] as const;

export type EmptyKind = (typeof EMPTY_KINDS)[number];

/**
 * `regular` steht für sich (eigener Bereich, zentriert, mit Symbol oder
 * Zeichnung), `compact` sitzt als Hinweis in einem Panel (eine Zeile,
 * linksbündig) — dieselben drei Aussagen, nur weniger Raum.
 */
export const EMPTY_SIZES = ['regular', 'compact'] as const;

export type EmptySize = (typeof EMPTY_SIZES)[number];

export type EmptyAttributes = {
  className: string;
  'data-lp-empty': EmptyKind;
  'data-lp-size': EmptySize;
};

export function emptyAttributes(
  kind: EmptyKind = 'start',
  size: EmptySize = 'regular',
): EmptyAttributes {
  if (!(EMPTY_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`Unbekannter Leerzustand: ${String(kind)}`);
  }
  if (!(EMPTY_SIZES as readonly string[]).includes(size)) {
    throw new Error(`Unbekannte Leerzustandsgröße: ${String(size)}`);
  }
  return { className: COMPONENT_CLASS.empty, 'data-lp-empty': kind, 'data-lp-size': size };
}

// ---------------------------------------------------------------------------
// ErrorState
// ---------------------------------------------------------------------------

/**
 * Seitenweite Fehlerzustände — keine Feldfehler, keine Hinweise im Fluss
 * (dafür gibt es den Callout aus LP-03B).
 *
 * - `unexpected` — eine Seite ist abgestürzt (Next.js `error.tsx`)
 * - `not-found` — die Adresse führt ins Leere (`not-found.tsx`)
 * - `unavailable` — ein benötigter Dienst ist nicht erreichbar
 */
export const ERROR_KINDS = ['unexpected', 'not-found', 'unavailable'] as const;

export type ErrorKind = (typeof ERROR_KINDS)[number];

/** Allgemeine Titel. Ein fachlicher Titel des Aufrufers hat Vorrang. */
export const ERROR_DEFAULT_TITLES: Readonly<Record<ErrorKind, string>> = {
  unexpected: 'Da ist etwas schiefgegangen',
  'not-found': 'Diese Seite gibt es nicht',
  unavailable: 'Gerade nicht erreichbar',
};

export type ErrorAttributes = {
  className: string;
  'data-lp-error': ErrorKind;
};

export function errorAttributes(kind: ErrorKind): ErrorAttributes {
  if (!(ERROR_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`Unbekannter Fehlerzustand: ${String(kind)}`);
  }
  return { className: COMPONENT_CLASS.error, 'data-lp-error': kind };
}

export function errorTitle(kind: ErrorKind, title?: string): string {
  return title || ERROR_DEFAULT_TITLES[kind];
}

/**
 * Kennung für die Fehlersuche, wie Next.js sie als `digest` liefert. Gezeigt
 * wird sie nur, wenn sie wie eine Kennung aussieht (Buchstaben, Ziffern,
 * Binde- und Unterstrich, höchstens 64 Zeichen). Alles andere — etwa eine
 * Fehlermeldung, die versehentlich dort landet — erscheint nie auf der Seite.
 */
export function errorReference(digest: unknown): string | null {
  if (typeof digest !== 'string') return null;
  return /^[A-Za-z0-9_-]{1,64}$/.test(digest) ? digest : null;
}

// ---------------------------------------------------------------------------
// Klassen
// ---------------------------------------------------------------------------

/** Klassen der gemeinsamen Darstellung (`learning-components.css`). */
export const COMPONENT_CLASS = {
  button: 'lp-ui lp-ui-button',
  card: 'lp-ui lp-ui-card',
  progress: 'lp-ui lp-ui-progress',
  progressFill: 'lp-ui-progress-fill',
  empty: 'lp-ui lp-ui-empty',
  emptyArt: 'lp-ui-empty-art',
  emptyBody: 'lp-ui-empty-body',
  emptyTitle: 'lp-ui-empty-title',
  emptyText: 'lp-ui-empty-text',
  emptyActions: 'lp-ui-empty-actions',
  error: 'lp-ui lp-ui-error',
  errorArt: 'lp-ui-error-art',
  errorTitle: 'lp-ui-error-title',
  errorText: 'lp-ui-error-text',
  errorReference: 'lp-ui-error-reference',
  errorActions: 'lp-ui-error-actions',
} as const;
