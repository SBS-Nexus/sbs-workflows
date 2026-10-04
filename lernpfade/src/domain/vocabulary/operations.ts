import { checkTags, checkText, isValidId } from './fields.ts';
import {
  DEFAULT_PAIR,
  LIMITS,
  fail,
  ok,
  type DeckOrigin,
  type Result,
  type VocabCard,
  type VocabDeck,
  type VocabStore,
} from './model.ts';

/**
 * Reine Änderungsoperationen auf dem VokabelPfad-Zustand. Jede Operation
 * liefert einen NEUEN Zustand oder einen Fehler; der Eingabezustand bleibt
 * unverändert. Geschrieben wird erst im Speicheradapter (`storage.ts`).
 */

export type DeckInput = { name: string; description: string };
export type CardInput = { term: string; translation: string; context: string; tags: readonly string[] };

function checkDeckInput(input: DeckInput): Result<{ name: string; description: string }> {
  const name = checkText(input.name, 'name', LIMITS.deckName, true);
  if (!name.ok) return name;
  const description = checkText(input.description, 'description', LIMITS.deckDescription, false);
  if (!description.ok) return description;
  return ok({ name: name.value, description: description.value });
}

function checkCardInput(input: CardInput): Result<Omit<VocabCard, 'id' | 'deckId' | 'createdAt'>> {
  const term = checkText(input.term, 'term', LIMITS.term, true);
  if (!term.ok) return term;
  const translation = checkText(input.translation, 'translation', LIMITS.translation, true);
  if (!translation.ok) return translation;
  const context = checkText(input.context, 'context', LIMITS.context, false);
  if (!context.ok) return context;
  const tags = checkTags(input.tags);
  if (!tags.ok) return tags;
  return ok({ term: term.value, translation: translation.value, context: context.value, tags: tags.value });
}

function deckLimitError(): Result<never> {
  return fail({ code: 'limit_decks', message: `Höchstens ${LIMITS.decks} Decks sind möglich.` });
}

function cardLimitError(): Result<never> {
  return fail({
    code: 'limit_cards',
    message: `Höchstens ${LIMITS.cards} Karten insgesamt sind möglich. Lösche nicht mehr benötigte Karten, um Platz zu schaffen.`,
  });
}

function notFound(what: string): Result<never> {
  return fail({
    code: 'not_found',
    message: `${what} gibt es nicht mehr – vielleicht wurde es inzwischen gelöscht.`,
  });
}

export function createDeck(
  store: VocabStore,
  input: DeckInput,
  id: string,
  now: Date,
  origin: DeckOrigin = { kind: 'self' },
): Result<VocabStore> {
  if (store.decks.length >= LIMITS.decks) return deckLimitError();
  if (!isValidId(id) || store.decks.some((deck) => deck.id === id)) {
    return fail({ code: 'duplicate', message: 'Für das Deck konnte keine eindeutige ID vergeben werden.' });
  }
  const checked = checkDeckInput(input);
  if (!checked.ok) return checked;
  const deck: VocabDeck = {
    id,
    name: checked.value.name,
    description: checked.value.description,
    ...DEFAULT_PAIR,
    origin,
    createdAt: now.toISOString(),
  };
  return ok({ ...store, decks: [...store.decks, deck] });
}

/** Name und Beschreibung ändern. Review-Identität und Fortschritt bleiben unberührt. */
export function updateDeck(store: VocabStore, deckId: string, input: DeckInput): Result<VocabStore> {
  const index = store.decks.findIndex((deck) => deck.id === deckId);
  if (index < 0) return notFound('Dieses Deck');
  const checked = checkDeckInput(input);
  if (!checked.ok) return checked;
  const decks = store.decks.slice();
  decks[index] = { ...decks[index], name: checked.value.name, description: checked.value.description };
  return ok({ ...store, decks });
}

export type DeletionImpact = {
  /** Anzahl gelöschter Karten. */
  cards: number;
  /** Anzahl der Abfragen mit gespeichertem Lernfortschritt, die verloren gehen. */
  reviewedQueries: number;
};

export function deckDeletionImpact(store: VocabStore, deckId: string): DeletionImpact {
  return {
    cards: store.cards.filter((card) => card.deckId === deckId).length,
    reviewedQueries: store.reviews.filter((review) => review.deckId === deckId).length,
  };
}

export function cardDeletionImpact(store: VocabStore, cardId: string): DeletionImpact {
  return {
    cards: store.cards.some((card) => card.id === cardId) ? 1 : 0,
    reviewedQueries: store.reviews.filter((review) => review.cardId === cardId).length,
  };
}

function withoutActivity(store: VocabStore, keep: (key: string) => boolean): VocabStore['activity'] {
  if (!store.activity) return null;
  return { day: store.activity.day, ratings: store.activity.ratings.filter((entry) => keep(entry.key)) };
}

/** Löscht ein Deck samt Karten, Lernfortschritt und Tageszählern dieses Decks. */
export function deleteDeck(store: VocabStore, deckId: string): Result<VocabStore> {
  if (!store.decks.some((deck) => deck.id === deckId)) return notFound('Dieses Deck');
  const prefix = `${deckId}:`;
  return ok({
    ...store,
    decks: store.decks.filter((deck) => deck.id !== deckId),
    cards: store.cards.filter((card) => card.deckId !== deckId),
    reviews: store.reviews.filter((review) => review.deckId !== deckId),
    activity: withoutActivity(store, (key) => !key.startsWith(prefix)),
  });
}

export function addCard(
  store: VocabStore,
  deckId: string,
  input: CardInput,
  id: string,
  now: Date,
): Result<VocabStore> {
  if (!store.decks.some((deck) => deck.id === deckId)) return notFound('Dieses Deck');
  if (store.cards.length >= LIMITS.cards) return cardLimitError();
  if (!isValidId(id) || store.cards.some((card) => card.id === id)) {
    return fail({ code: 'duplicate', message: 'Für die Karte konnte keine eindeutige ID vergeben werden.' });
  }
  const checked = checkCardInput(input);
  if (!checked.ok) return checked;
  const card: VocabCard = { id, deckId, ...checked.value, createdAt: now.toISOString() };
  return ok({ ...store, cards: [...store.cards, card] });
}

/**
 * Ändert sich der eigentliche Lerninhalt (Begriff oder Übersetzung), ist der
 * bisherige Fortschritt beider Richtungen fachlich nicht mehr belastbar.
 * Satzkontext und Tags sind Begleitinformation und lassen ihn bestehen.
 */
export function changesLearningContent(card: VocabCard, input: CardInput): boolean {
  return card.term !== input.term.trim() || card.translation !== input.translation.trim();
}

export type CardUpdate = { store: VocabStore; progressReset: boolean };

/**
 * Bearbeitet eine Karte. Ändert sich der Lerninhalt und gibt es Fortschritt,
 * muss `confirmProgressReset` gesetzt sein — dann starten beide Richtungen
 * neu. Ohne Bestätigung wird nichts geändert.
 */
export function updateCard(
  store: VocabStore,
  cardId: string,
  input: CardInput,
  confirmProgressReset: boolean,
): Result<CardUpdate> {
  const index = store.cards.findIndex((card) => card.id === cardId);
  if (index < 0) return notFound('Diese Karte');
  const checked = checkCardInput(input);
  if (!checked.ok) return checked;
  const previous = store.cards[index];
  const hasProgress = store.reviews.some((review) => review.cardId === cardId);
  const reset = hasProgress && changesLearningContent(previous, input);
  if (reset && !confirmProgressReset) {
    return fail({
      code: 'stale',
      message: 'Begriff oder Übersetzung ändern setzt den Lernfortschritt beider Richtungen zurück. Bitte bestätigen.',
    });
  }
  const cards = store.cards.slice();
  cards[index] = { ...previous, ...checked.value };
  return ok({
    store: {
      ...store,
      cards,
      reviews: reset ? store.reviews.filter((review) => review.cardId !== cardId) : store.reviews,
    },
    progressReset: reset,
  });
}

/** Löscht eine Karte samt Fortschritt beider Richtungen und ihren Tageszählern. */
export function deleteCard(store: VocabStore, cardId: string): Result<VocabStore> {
  const card = store.cards.find((entry) => entry.id === cardId);
  if (!card) return notFound('Diese Karte');
  const prefix = `${card.deckId}:${card.id}:`;
  return ok({
    ...store,
    cards: store.cards.filter((entry) => entry.id !== cardId),
    reviews: store.reviews.filter((review) => review.cardId !== cardId),
    activity: withoutActivity(store, (key) => !key.startsWith(prefix)),
  });
}

/** Alle Tags eines Decks, sortiert, für den Filter. */
export function deckTags(store: VocabStore, deckId: string): string[] {
  const tags = new Map<string, string>();
  for (const card of store.cards) {
    if (card.deckId !== deckId) continue;
    for (const tag of card.tags) {
      const folded = tag.toLocaleLowerCase('de-DE');
      if (!tags.has(folded)) tags.set(folded, tag);
    }
  }
  return [...tags.values()].sort((a, b) => a.localeCompare(b, 'de-DE'));
}

export function cardsWithTag(cards: readonly VocabCard[], tag: string | null): VocabCard[] {
  if (!tag) return cards.slice();
  const folded = tag.toLocaleLowerCase('de-DE');
  return cards.filter((card) => card.tags.some((entry) => entry.toLocaleLowerCase('de-DE') === folded));
}
