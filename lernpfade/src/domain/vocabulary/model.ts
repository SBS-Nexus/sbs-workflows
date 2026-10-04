import type { ReviewState } from '../review/model.ts';

/**
 * LP-06 — VokabelPfad: Datenmodell.
 *
 * Alles hier lebt ausschließlich im Browser der lernenden Person (siehe
 * `storage.ts` und `idb-backend.ts`). Es gibt kein Konto, keinen Server und
 * keine Synchronisation.
 *
 * Begriffe:
 * - **Karte**: ein Vokabeleintrag (Begriff + Übersetzung, optional Satzkontext
 *   und Tags).
 * - **Abfrage**: eine Lernrichtung einer Karte. Jede Karte hat genau zwei
 *   Abfragen (z. B. Englisch → Deutsch und Deutsch → Englisch), jede mit
 *   eigenem Wiederholungszustand.
 */

export const VOCAB_STORE_VERSION = 1;

/**
 * Sprachen, die in diesem Slice tatsächlich unterstützt werden. Das Modell
 * trägt Sprachcodes, damit weitere Sprachpaare später ohne Formatbruch
 * hinzukommen können — angeboten wird heute nur Englisch ↔ Deutsch.
 */
export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Readonly<Record<LanguageCode, string>> = {
  en: 'Englisch',
  de: 'Deutsch',
};

/** Das einzige heute angebotene Sprachpaar: Begriff auf Englisch, Übersetzung auf Deutsch. */
export const DEFAULT_PAIR = { sourceLanguage: 'en', targetLanguage: 'de' } as const;

/** Lernrichtung als `<Abfragesprache>-<Antwortsprache>`. */
export type Direction = 'en-de' | 'de-en';
export const DIRECTIONS: readonly Direction[] = ['en-de', 'de-en'];

export const DIRECTION_LABELS: Readonly<Record<Direction, string>> = {
  'en-de': 'Englisch → Deutsch',
  'de-en': 'Deutsch → Englisch',
};

/** Feste, getestete Grenzen. Textlängen zählen Unicode-Zeichen (Code Points). */
export const LIMITS = {
  /** Importdatei, geprüft vor dem vollständigen Lesen. */
  importBytes: 2 * 1024 * 1024,
  decks: 50,
  /** Karten insgesamt über alle Decks. */
  cards: 1000,
  deckName: 80,
  deckDescription: 300,
  originLabel: 120,
  term: 200,
  translation: 200,
  context: 500,
  tagsPerCard: 10,
  tag: 32,
  /** Höchstens so viele Abfragen je Session (Vorgabe). */
  sessionSize: 20,
  /** Plausibilitätsgrenzen für gespeicherte Wiederholungszustände. */
  repetitions: 10_000,
  intervalDays: 100_000,
  ease: 100,
  /** Bewertungen je Abfrage und Tag (Statistik). */
  ratingsPerDay: 10_000,
} as const;

export type DeckOrigin =
  | { kind: 'self' }
  | { kind: 'starter'; label: string }
  | { kind: 'import'; label: string };

export type VocabDeck = {
  id: string;
  name: string;
  /** Leerer Text = keine Beschreibung. */
  description: string;
  sourceLanguage: 'en';
  targetLanguage: 'de';
  origin: DeckOrigin;
  createdAt: string;
};

export type VocabCard = {
  id: string;
  deckId: string;
  /** Begriff in der Quellsprache des Decks (heute: Englisch). */
  term: string;
  /** Übersetzung in der Zielsprache des Decks (heute: Deutsch). */
  translation: string;
  /** Optionaler Satzkontext; leerer Text = keiner. */
  context: string;
  tags: string[];
  createdAt: string;
};

/** Wiederholungszustand genau einer Abfrage. `state.itemId` ist ihr Review-Schlüssel. */
export type VocabReviewRecord = {
  deckId: string;
  cardId: string;
  direction: Direction;
  state: ReviewState;
};

/**
 * Bewertungen des laufenden lokalen Kalendertags je Abfrage. Ältere Tage
 * werden beim nächsten Schreiben verworfen; gespeichert wird nur, was die
 * Statistik „heute bewertet" braucht.
 */
export type DailyActivity = {
  day: string;
  ratings: { key: string; count: number }[];
};

export type VocabStore = {
  version: typeof VOCAB_STORE_VERSION;
  /** Steigt bei jedem erfolgreichen Schreiben; Grundlage der Konfliktsperre. */
  revision: number;
  decks: VocabDeck[];
  cards: VocabCard[];
  reviews: VocabReviewRecord[];
  activity: DailyActivity | null;
};

export type VocabErrorCode =
  | 'invalid_text'
  | 'too_long'
  | 'required'
  | 'invalid_tag'
  | 'too_many_tags'
  | 'limit_decks'
  | 'limit_cards'
  | 'not_found'
  | 'duplicate'
  | 'invalid_store'
  | 'stale';

export type VocabError = {
  code: VocabErrorCode;
  message: string;
  /** Betroffenes Formularfeld, damit die Meldung am richtigen Feld erscheint. */
  field?: 'name' | 'description' | 'term' | 'translation' | 'context' | 'tags';
};

export type Result<T, E = VocabError> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function fail<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

export function emptyStore(): VocabStore {
  return { version: VOCAB_STORE_VERSION, revision: 0, decks: [], cards: [], reviews: [], activity: null };
}
