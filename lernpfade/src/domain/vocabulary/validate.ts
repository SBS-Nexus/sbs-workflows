import type { ReviewRating, ReviewState } from '../review/model.ts';
import {
  checkTags,
  checkText,
  hasOnlyKeys,
  isDayKey,
  isIsoTimestamp,
  isValidId,
  parseReviewKey,
  reviewKey,
} from './fields.ts';
import {
  DIRECTIONS,
  LIMITS,
  VOCAB_STORE_VERSION,
  type DailyActivity,
  type DeckOrigin,
  type Direction,
  type VocabCard,
  type VocabDeck,
  type VocabReviewRecord,
  type VocabStore,
} from './model.ts';

/**
 * Laufzeitprüfung des gespeicherten VokabelPfad-Zustands.
 *
 * Gespeicherte Daten gelten als `unknown`: Sie können von einer älteren oder
 * künftigen Version, aus einem anderen Tab, von Browser-Erweiterungen oder
 * von Hand verändert worden sein. Geprüft werden Version, Struktur, erlaubte
 * Felder, IDs und Referenzen, Zeitstempel, Ratings, endliche Zahlen und
 * fachliche Grenzen. Das Ergebnis besteht ausschließlich aus neu aufgebauten
 * Objekten — nie aus den eingelesenen.
 */

export type StoreValidation =
  | { ok: true; store: VocabStore }
  | { ok: false; reason: 'future_version'; version: number }
  | { ok: false; reason: 'invalid'; detail: string };

const RATINGS: readonly ReviewRating[] = ['again', 'hard', 'good', 'easy'];

class Invalid extends Error {}

function invalid(detail: string): never {
  throw new Invalid(detail);
}

function int(value: unknown, min: number, max: number, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    invalid(`${path}: ganze Zahl zwischen ${min} und ${max} erwartet`);
  }
  return value;
}

function text(value: unknown, field: Parameters<typeof checkText>[1], max: number, required: boolean, path: string): string {
  const checked = checkText(value, field, max, required);
  if (!checked.ok) invalid(`${path}: ${checked.error.message}`);
  // Gespeicherte Werte müssen bereits normalisiert sein.
  if (checked.value !== value) invalid(`${path}: nicht normalisierter Text`);
  return checked.value;
}

export function parseOrigin(value: unknown, path: string): DeckOrigin {
  if (hasOnlyKeys(value, ['kind']) && value.kind === 'self') return { kind: 'self' };
  if (hasOnlyKeys(value, ['kind', 'label']) && (value.kind === 'starter' || value.kind === 'import')) {
    const checked = checkText(value.label, 'description', LIMITS.originLabel, true);
    if (!checked.ok || checked.value !== value.label) invalid(`${path}.label: ungültige Herkunftsangabe`);
    return { kind: value.kind, label: checked.value };
  }
  return invalid(`${path}: ungültige Herkunft`);
}

function parseDeck(value: unknown, path: string): VocabDeck {
  if (!hasOnlyKeys(value, ['id', 'name', 'description', 'sourceLanguage', 'targetLanguage', 'origin', 'createdAt'])) {
    invalid(`${path}: unerwartete oder fehlende Felder`);
  }
  if (!isValidId(value.id)) invalid(`${path}.id: ungültige ID`);
  if (value.sourceLanguage !== 'en' || value.targetLanguage !== 'de') {
    invalid(`${path}: nur Englisch → Deutsch wird unterstützt`);
  }
  if (!isIsoTimestamp(value.createdAt)) invalid(`${path}.createdAt: ungültiger Zeitstempel`);
  return {
    id: value.id,
    name: text(value.name, 'name', LIMITS.deckName, true, `${path}.name`),
    description: text(value.description, 'description', LIMITS.deckDescription, false, `${path}.description`),
    sourceLanguage: 'en',
    targetLanguage: 'de',
    origin: parseOrigin(value.origin, `${path}.origin`),
    createdAt: value.createdAt,
  };
}

function parseCard(value: unknown, path: string): VocabCard {
  if (!hasOnlyKeys(value, ['id', 'deckId', 'term', 'translation', 'context', 'tags', 'createdAt'])) {
    invalid(`${path}: unerwartete oder fehlende Felder`);
  }
  if (!isValidId(value.id)) invalid(`${path}.id: ungültige ID`);
  if (!isValidId(value.deckId)) invalid(`${path}.deckId: ungültige ID`);
  if (!isIsoTimestamp(value.createdAt)) invalid(`${path}.createdAt: ungültiger Zeitstempel`);
  const tags = checkTags(value.tags);
  if (!tags.ok) invalid(`${path}.tags: ${tags.error.message}`);
  if (
    !Array.isArray(value.tags) ||
    tags.value.length !== value.tags.length ||
    tags.value.some((tag, index) => tag !== (value.tags as unknown[])[index])
  ) {
    invalid(`${path}.tags: nicht normalisierte Tags`);
  }
  return {
    id: value.id,
    deckId: value.deckId,
    term: text(value.term, 'term', LIMITS.term, true, `${path}.term`),
    translation: text(value.translation, 'translation', LIMITS.translation, true, `${path}.translation`),
    context: text(value.context, 'context', LIMITS.context, false, `${path}.context`),
    tags: tags.value,
    createdAt: value.createdAt,
  };
}

function parseState(value: unknown, key: string, path: string): ReviewState {
  if (!hasOnlyKeys(value, ['itemId', 'dueAt', 'intervalDays', 'ease', 'repetitions'], ['lastRating'])) {
    invalid(`${path}: unerwartete oder fehlende Felder`);
  }
  if (value.itemId !== key) invalid(`${path}.itemId: passt nicht zur Abfrage`);
  if (!isIsoTimestamp(value.dueAt)) invalid(`${path}.dueAt: ungültiger Zeitstempel`);
  if (typeof value.ease !== 'number' || !Number.isFinite(value.ease) || value.ease < 1.3 || value.ease > LIMITS.ease) {
    invalid(`${path}.ease: endliche Zahl zwischen 1.3 und ${LIMITS.ease} erwartet`);
  }
  if (value.lastRating !== undefined && !RATINGS.includes(value.lastRating as ReviewRating)) {
    invalid(`${path}.lastRating: unbekannte Bewertung`);
  }
  const state: ReviewState = {
    itemId: key,
    dueAt: value.dueAt,
    intervalDays: int(value.intervalDays, 0, LIMITS.intervalDays, `${path}.intervalDays`),
    ease: value.ease,
    repetitions: int(value.repetitions, 0, LIMITS.repetitions, `${path}.repetitions`),
  };
  if (value.lastRating !== undefined) state.lastRating = value.lastRating as ReviewRating;
  return state;
}

function parseReview(value: unknown, path: string): VocabReviewRecord {
  if (!hasOnlyKeys(value, ['deckId', 'cardId', 'direction', 'state'])) {
    invalid(`${path}: unerwartete oder fehlende Felder`);
  }
  if (!isValidId(value.deckId) || !isValidId(value.cardId)) invalid(`${path}: ungültige ID`);
  if (!DIRECTIONS.includes(value.direction as Direction)) invalid(`${path}.direction: unbekannte Richtung`);
  const direction = value.direction as Direction;
  const key = reviewKey(value.deckId, value.cardId, direction);
  return { deckId: value.deckId, cardId: value.cardId, direction, state: parseState(value.state, key, `${path}.state`) };
}

function parseActivity(value: unknown, path: string): DailyActivity | null {
  if (value === null) return null;
  if (!hasOnlyKeys(value, ['day', 'ratings'])) invalid(`${path}: unerwartete oder fehlende Felder`);
  if (!isDayKey(value.day)) invalid(`${path}.day: ungültiger Tag`);
  if (!Array.isArray(value.ratings)) invalid(`${path}.ratings: Liste erwartet`);
  const ratings = value.ratings.map((entry, index) => {
    const at = `${path}.ratings[${index}]`;
    if (!hasOnlyKeys(entry, ['key', 'count'])) invalid(`${at}: unerwartete oder fehlende Felder`);
    if (!parseReviewKey(entry.key)) invalid(`${at}.key: ungültiger Schlüssel`);
    return { key: entry.key as string, count: int(entry.count, 1, LIMITS.ratingsPerDay, `${at}.count`) };
  });
  return { day: value.day, ratings };
}

function list(value: unknown, max: number, path: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${path}: Liste erwartet`);
  if (value.length > max) invalid(`${path}: höchstens ${max} Einträge`);
  return value;
}

/** Prüft Querbezüge: eindeutige IDs, existierende Decks/Karten, keine verwaisten Einträge. */
function checkReferences(store: VocabStore): void {
  const deckIds = new Set<string>();
  for (const deck of store.decks) {
    if (deckIds.has(deck.id)) invalid(`decks: doppelte ID ${deck.id}`);
    deckIds.add(deck.id);
  }
  const cardDeck = new Map<string, string>();
  for (const card of store.cards) {
    if (cardDeck.has(card.id)) invalid(`cards: doppelte ID ${card.id}`);
    if (!deckIds.has(card.deckId)) invalid(`cards: Karte ${card.id} verweist auf unbekanntes Deck`);
    cardDeck.set(card.id, card.deckId);
  }
  const reviewKeys = new Set<string>();
  for (const review of store.reviews) {
    if (cardDeck.get(review.cardId) !== review.deckId) {
      invalid(`reviews: ${review.state.itemId} verweist auf keine vorhandene Karte`);
    }
    if (reviewKeys.has(review.state.itemId)) invalid(`reviews: doppelter Eintrag ${review.state.itemId}`);
    reviewKeys.add(review.state.itemId);
  }
  if (store.activity) {
    const seen = new Set<string>();
    for (const entry of store.activity.ratings) {
      const parsed = parseReviewKey(entry.key);
      if (!parsed || cardDeck.get(parsed.cardId) !== parsed.deckId) {
        invalid(`activity: ${entry.key} verweist auf keine vorhandene Karte`);
      }
      if (seen.has(entry.key)) invalid(`activity: doppelter Eintrag ${entry.key}`);
      seen.add(entry.key);
    }
  }
}

/** Prüft einen beliebigen Wert als gespeicherten Zustand. */
export function validateStore(value: unknown): StoreValidation {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: 'invalid', detail: 'Wurzel ist kein Objekt' };
  }
  const version = (value as { version?: unknown }).version;
  if (typeof version === 'number' && Number.isInteger(version) && version > VOCAB_STORE_VERSION) {
    return { ok: false, reason: 'future_version', version };
  }
  try {
    if (!hasOnlyKeys(value, ['version', 'revision', 'decks', 'cards', 'reviews', 'activity'])) {
      invalid('Wurzel: unerwartete oder fehlende Felder');
    }
    if (value.version !== VOCAB_STORE_VERSION) invalid('version: unbekannte Version');
    const store: VocabStore = {
      version: VOCAB_STORE_VERSION,
      revision: int(value.revision, 0, Number.MAX_SAFE_INTEGER, 'revision'),
      decks: list(value.decks, LIMITS.decks, 'decks').map((deck, i) => parseDeck(deck, `decks[${i}]`)),
      cards: list(value.cards, LIMITS.cards, 'cards').map((card, i) => parseCard(card, `cards[${i}]`)),
      reviews: list(value.reviews, LIMITS.cards * DIRECTIONS.length, 'reviews').map((review, i) =>
        parseReview(review, `reviews[${i}]`),
      ),
      activity: parseActivity(value.activity, 'activity'),
    };
    checkReferences(store);
    return { ok: true, store };
  } catch (error) {
    if (error instanceof Invalid) return { ok: false, reason: 'invalid', detail: error.message };
    throw error;
  }
}
