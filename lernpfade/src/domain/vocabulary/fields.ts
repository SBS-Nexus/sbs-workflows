import { DIRECTIONS, LIMITS, type Direction, type VocabError } from './model.ts';

/**
 * Reine Feldprüfungen für VokabelPfad: Texte, Tags, IDs, Zeitstempel und
 * Review-Schlüssel. Keine Abhängigkeit vom Browser.
 */

// C0-/C1-Steuerzeichen und Zeilentrenner: Vokabelfelder sind einzeilig.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

/** Länge in Unicode-Zeichen (Code Points), nicht in UTF-16-Einheiten. */
export function charLength(value: string): number {
  let count = 0;
  for (const _ of value) count += 1;
  return count;
}

type TextField = NonNullable<VocabError['field']>;

const FIELD_LABELS: Record<TextField, string> = {
  name: 'Deckname',
  description: 'Beschreibung',
  term: 'Begriff',
  translation: 'Übersetzung',
  context: 'Satzkontext',
  tags: 'Tags',
};

export type TextCheck = { ok: true; value: string } | { ok: false; error: VocabError };

/**
 * Prüft ein Textfeld. Führende/abschließende Leerzeichen werden entfernt,
 * Steuerzeichen und Zeilenumbrüche abgelehnt, die Länge in Zeichen begrenzt.
 */
export function checkText(
  raw: unknown,
  field: TextField,
  maxLength: number,
  required: boolean,
): TextCheck {
  const label = FIELD_LABELS[field];
  if (typeof raw !== 'string') {
    return { ok: false, error: { code: 'invalid_text', field, message: `${label} muss Text sein.` } };
  }
  const value = raw.trim();
  if (CONTROL_CHARS.test(value)) {
    return {
      ok: false,
      error: { code: 'invalid_text', field, message: `${label} darf keine Zeilenumbrüche oder Steuerzeichen enthalten.` },
    };
  }
  if (required && value === '') {
    return { ok: false, error: { code: 'required', field, message: `${label} darf nicht leer sein.` } };
  }
  if (charLength(value) > maxLength) {
    return {
      ok: false,
      error: { code: 'too_long', field, message: `${label} darf höchstens ${maxLength} Zeichen lang sein.` },
    };
  }
  return { ok: true, value };
}

export type TagsCheck = { ok: true; value: string[] } | { ok: false; error: VocabError };

/**
 * Normalisiert Tags: trimmen, leere entfernen, Doppelte (ohne Groß-/Klein-
 * schreibung) zusammenfassen. Kommas sind Trennzeichen und daher im Tag
 * selbst nicht erlaubt.
 */
export function checkTags(raw: unknown): TagsCheck {
  if (!Array.isArray(raw)) {
    return { ok: false, error: { code: 'invalid_tag', field: 'tags', message: 'Tags müssen eine Liste sein.' } };
  }
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const checked = checkText(entry, 'tags', LIMITS.tag, false);
    if (!checked.ok) {
      return {
        ok: false,
        error: {
          code: checked.error.code === 'too_long' ? 'too_long' : 'invalid_tag',
          field: 'tags',
          message:
            checked.error.code === 'too_long'
              ? `Ein Tag darf höchstens ${LIMITS.tag} Zeichen lang sein.`
              : 'Tags dürfen keine Zeilenumbrüche oder Steuerzeichen enthalten.',
        },
      };
    }
    const tag = checked.value;
    if (tag === '') continue;
    if (tag.includes(',')) {
      return { ok: false, error: { code: 'invalid_tag', field: 'tags', message: 'Ein Tag darf kein Komma enthalten.' } };
    }
    const folded = tag.toLocaleLowerCase('de-DE');
    if (seen.has(folded)) continue;
    seen.add(folded);
    result.push(tag);
  }
  if (result.length > LIMITS.tagsPerCard) {
    return {
      ok: false,
      error: { code: 'too_many_tags', field: 'tags', message: `Höchstens ${LIMITS.tagsPerCard} Tags je Karte.` },
    };
  }
  return { ok: true, value: result };
}

/** Zerlegt die Eingabe „a, b, c" eines Tag-Felds in Einzeltags. */
export function splitTagInput(input: string): string[] {
  return input.split(',');
}

/**
 * Stabile IDs: Kleinbuchstaben, Ziffern und Bindestrich, 1–64 Zeichen, nicht
 * mit Bindestrich beginnend oder endend. Kein Doppelpunkt — er trennt die
 * Teile des Review-Schlüssels. Titel oder Array-Positionen sind nie Identität.
 */
const ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/** Erzeugt eine neue ID, z. B. `deck-1b9d6bcd-…`. */
export function newId(prefix: 'deck' | 'card', random: () => string = defaultRandomId): string {
  return `${prefix}-${random()}`;
}

function defaultRandomId(): string {
  const crypto = globalThis.crypto;
  // `randomUUID` gibt es nur in sicheren Kontexten (HTTPS, localhost); `getRandomValues` überall.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Review-Schlüssel einer Abfrage: `<deckId>:<cardId>:<richtung>`. Weil IDs
 * keinen Doppelpunkt enthalten können, ist der Schlüssel eindeutig zerlegbar
 * und zwei verschiedene Abfragen können nie denselben Schlüssel haben.
 */
export function reviewKey(deckId: string, cardId: string, direction: Direction): string {
  if (!isValidId(deckId) || !isValidId(cardId)) throw new TypeError('invalid id in review key');
  if (!DIRECTIONS.includes(direction)) throw new TypeError('invalid direction in review key');
  return `${deckId}:${cardId}:${direction}`;
}

export function parseReviewKey(
  key: unknown,
): { deckId: string; cardId: string; direction: Direction } | null {
  if (typeof key !== 'string') return null;
  const parts = key.split(':');
  if (parts.length !== 3) return null;
  const [deckId, cardId, direction] = parts;
  if (!isValidId(deckId) || !isValidId(cardId)) return null;
  if (!DIRECTIONS.includes(direction as Direction)) return null;
  return { deckId, cardId, direction: direction as Direction };
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const MIN_TIME = Date.parse('2000-01-01T00:00:00.000Z');
const MAX_TIME = Date.parse('9999-12-31T23:59:59.999Z');

/** Strikter UTC-Zeitstempel im Format von `Date#toISOString`, in plausiblen Grenzen. */
export function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_UTC.test(value)) return false;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time < MIN_TIME || time > MAX_TIME) return false;
  // Rundreise: lehnt z. B. den 31. Februar ab.
  const normalized = new Date(time).toISOString();
  return normalized === value || normalized === value.replace('Z', '.000Z');
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
  return isIsoTimestamp(`${value}T00:00:00.000Z`);
}

/**
 * Lokaler Kalendertag `YYYY-MM-DD` in einer IANA-Zeitzone. Ohne Angabe gilt
 * die Zeitzone des Browsers — „heute" ist damit der Kalendertag, den die
 * lernende Person auf ihrer Uhr sieht.
 */
export function localDayKey(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Beginn des nächsten lokalen Kalendertags (auf eine Sekunde genau, nie
 * davor). Gesucht wird binär im Fenster bis 27 Stunden: Auch ein Tag mit
 * Zeitumstellung (23 oder 25 Stunden) endet darin.
 */
export function nextLocalDayStart(now: Date, timeZone?: string): Date {
  const today = localDayKey(now, timeZone);
  let sameDay = now.getTime();
  let nextDay = sameDay + 27 * 3_600_000;
  while (nextDay - sameDay > 1000) {
    const middle = Math.floor((sameDay + nextDay) / 2);
    if (localDayKey(new Date(middle), timeZone) === today) sameDay = middle;
    else nextDay = middle;
  }
  return new Date(nextDay);
}

/**
 * Prüft, dass ein Objekt nur erlaubte eigene Schlüssel hat. Schützt vor
 * untergeschobenen Feldern wie `__proto__`, `constructor` oder `prototype`;
 * geprüfte Werte werden anschließend immer in neue Objekte übernommen,
 * nie per Spread oder `Object.assign` zusammengeführt.
 */
export function hasOnlyKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  for (const key of keys) if (!allowed.has(key)) return false;
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(value, key)) return false;
  return true;
}
