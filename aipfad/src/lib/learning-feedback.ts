/**
 * Lernpfade — gemeinsamer Statusvertrag für Badges und Callouts (LP-03B).
 *
 * KANONISCH ist `docs/learning-feedback/learning-feedback.ts`. PythonPfad,
 * SQLPfad, AIPfad und der Hub führen je eine bytegleiche Kopie unter
 * `src/lib/learning-feedback.ts`; die Apps bleiben dadurch unabhängig baubar,
 * ohne Laufzeit-Import aus einer anderen App. `node
 * scripts/check-learning-feedback.mjs` scheitert, sobald eine Kopie fehlt oder
 * abweicht. Geändert wird nur hier — danach in alle vier Apps kopieren.
 *
 * Reine Daten und Funktionen: kein React, kein Zugriff auf Umgebung oder DOM.
 * Darstellung (Farben, Rand, Schrift) liegt in `learning-feedback.css`.
 */

/**
 * Die acht semantischen Zustände aus `docs/LEARNING-DESIGN-SYSTEM.md` §3.
 * Technische IDs; sichtbare Begriffe bleiben deutsch und kommen vom Aufrufer
 * (bzw. als Standardtitel unten). Die IDs fallen nie zusammen, auch wenn
 * einzelne Farbfamilien ähnlich aussehen: `due` ist kein Fehler, `locked` ist
 * nicht `neutral`.
 */
export const FEEDBACK_TONES = [
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
  'due',
  'in-progress',
  'locked',
] as const;

export type FeedbackTone = (typeof FEEDBACK_TONES)[number];

/**
 * Ältere Tonnamen der Apps. Sie bleiben gültig und werden genau hier — an der
 * Adaptergrenze — auf den kanonischen Zustand abgebildet. Keine Migration der
 * Aufrufstellen nötig.
 */
export const FEEDBACK_TONE_ALIASES = {
  caution: 'warning',
  alert: 'danger',
} as const satisfies Record<string, FeedbackTone>;

export type FeedbackToneAlias = keyof typeof FEEDBACK_TONE_ALIASES;

/** Was ein Badge annimmt: alle Zustände und die Kompatibilitätsnamen. */
export type FeedbackToneInput = FeedbackTone | FeedbackToneAlias;

/**
 * Callouts sind Hinweise, Rückmeldungen, Warnungen und Fehler (plus neutrale
 * Hinweise ohne Wertung). Lernzustände wie „fällig" oder „gesperrt" sind
 * Badges, keine Meldungen.
 */
export const CALLOUT_TONES = ['neutral', 'info', 'success', 'warning', 'danger'] as const;

export type CalloutTone = (typeof CALLOUT_TONES)[number];

export type CalloutToneInput = CalloutTone | FeedbackToneAlias;

/**
 * Allgemeine Standardtitel. Ein ausdrücklicher fachlicher Titel des Aufrufers
 * hat immer Vorrang. `neutral` hat bewusst keinen: Ein neutraler Hinweis
 * braucht einen Titel, der sagt, worum es geht.
 */
export const CALLOUT_DEFAULT_TITLES: Readonly<Record<Exclude<CalloutTone, 'neutral'>, string>> = {
  info: 'Hinweis',
  success: 'Erfolg',
  warning: 'Achtung',
  danger: 'Fehler',
};

/** Klassen der gemeinsamen Darstellung (`learning-feedback.css`). */
export const FEEDBACK_CLASS = {
  badge: 'lp-feedback lp-feedback-badge',
  callout: 'lp-feedback lp-feedback-callout',
  title: 'lp-feedback-title',
  icon: 'lp-feedback-icon',
  body: 'lp-feedback-body',
} as const;

export function isFeedbackTone(value: unknown): value is FeedbackTone {
  return typeof value === 'string' && (FEEDBACK_TONES as readonly string[]).includes(value);
}

/** Löst einen (ggf. älteren) Tonnamen in den kanonischen Zustand auf. */
export function feedbackTone(input: FeedbackToneInput): FeedbackTone {
  if (isFeedbackTone(input)) return input;
  const alias = FEEDBACK_TONE_ALIASES[input];
  if (!alias) throw new Error(`Unbekannter Rückmeldungston: ${String(input)}`);
  return alias;
}

export function calloutTone(input: CalloutToneInput): CalloutTone {
  const tone = feedbackTone(input);
  if (!(CALLOUT_TONES as readonly string[]).includes(tone)) {
    throw new Error(`Kein Callout-Ton: ${tone}`);
  }
  return tone as CalloutTone;
}

export type FeedbackAttributes = {
  className: string;
  'data-lp-tone': FeedbackTone;
};

/** Klassen und Zustandsattribut eines Badges. */
export function feedbackBadge(input: FeedbackToneInput): FeedbackAttributes {
  return { className: FEEDBACK_CLASS.badge, 'data-lp-tone': feedbackTone(input) };
}

/** Klassen und Zustandsattribut eines Callouts. */
export function feedbackCallout(input: CalloutToneInput): FeedbackAttributes {
  return { className: FEEDBACK_CLASS.callout, 'data-lp-tone': calloutTone(input) };
}

/** Sichtbarer Titel: ausdrücklicher Titel, sonst der allgemeine Standardtitel. */
export function calloutTitle(input: CalloutToneInput, title?: string): string | null {
  if (title) return title;
  const tone = calloutTone(input);
  return tone === 'neutral' ? null : CALLOUT_DEFAULT_TITLES[tone];
}

/**
 * Live-Ansage nur auf ausdrücklichen Wunsch (`live`), dann höflich. Ein
 * statischer Hinweis ist keine Live-Region — auch nicht bei `danger`.
 */
export function feedbackLive(
  live: boolean,
): { role: 'status'; 'aria-live': 'polite' } | Record<string, never> {
  return live ? { role: 'status', 'aria-live': 'polite' } : {};
}
