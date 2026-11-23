import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStore, LIMITS, type VocabStore } from './model.ts';
import {
  addCard,
  cardsWithTag,
  createDeck,
  deckDeletionImpact,
  deckTags,
  deleteCard,
  deleteDeck,
  updateCard,
  updateDeck,
} from './operations.ts';
import { applyRating, buildQueue, vocabStats } from './session.ts';
import { NOW, card, must, sampleStore, withDeck } from './testing.ts';
import { validateStore } from './validate.ts';

function rateAll(store: VocabStore, deckId: string): VocabStore {
  let next = store;
  for (const task of buildQueue(next, { deckIds: new Set([deckId]), directions: ['en-de', 'de-en'], now: NOW })) {
    next = must(applyRating(next, task, 'good', NOW, 'Europe/Berlin')).store;
  }
  return next;
}

test('creating decks and cards validates input and reports the failing field', () => {
  const failed = createDeck(emptyStore(), { name: '   ', description: '' }, 'deck-x', NOW);
  assert.equal(failed.ok, false);
  assert.equal(!failed.ok && failed.error.field, 'name');

  const store = sampleStore();
  const badCard = addCard(store, 'deck-a', card('x'.repeat(LIMITS.term + 1), 'y'), 'card-new', NOW);
  assert.equal(!badCard.ok && badCard.error.field, 'term');
  assert.equal(addCard(store, 'deck-missing', card('a', 'b'), 'card-new', NOW).ok, false);
  assert.equal(addCard(store, 'deck-a', card('a', 'b'), 'deck-a-c1', NOW).ok, false, 'duplicate card id');
  assert.equal(createDeck(store, { name: 'B', description: '' }, 'deck-a', NOW).ok, false, 'duplicate deck id');
});

test('deck count is capped at 50', () => {
  let store = emptyStore();
  for (let i = 0; i < LIMITS.decks; i += 1) {
    store = must(createDeck(store, { name: `Deck ${i}`, description: '' }, `deck-${i}`, NOW));
  }
  const over = createDeck(store, { name: 'zu viel', description: '' }, 'deck-over', NOW);
  assert.equal(!over.ok && over.error.code, 'limit_decks');
});

test('card count is capped at 1000 in total, across decks', () => {
  let store = withDeck(emptyStore(), 'deck-a', []);
  store = must(createDeck(store, { name: 'B', description: '' }, 'deck-b', NOW));
  for (let i = 0; i < LIMITS.cards; i += 1) {
    store = must(addCard(store, i % 2 ? 'deck-a' : 'deck-b', card(`t${i}`, `ü${i}`), `card-${i}`, NOW));
  }
  const over = addCard(store, 'deck-a', card('one', 'eins'), 'card-over', NOW);
  assert.equal(!over.ok && over.error.code, 'limit_cards');
  assert.equal(validateStore(store).ok, true, 'a full store is still valid');
});

test('renaming a deck or editing tags/context keeps all progress', () => {
  let store = rateAll(sampleStore(), 'deck-a');
  const reviews = store.reviews;
  store = must(updateDeck(store, 'deck-a', { name: 'Neuer Name', description: 'mit Beschreibung' }));
  const edited = must(
    updateCard(store, 'deck-a-c1', card('house', 'Haus', { context: 'The house is red.', tags: ['wohnen'] }), false),
  );
  assert.equal(edited.progressReset, false);
  assert.deepEqual(edited.store.reviews, reviews);
  assert.equal(edited.store.decks[0].name, 'Neuer Name');
});

test('changing term or translation needs confirmation and then restarts both directions', () => {
  const store = rateAll(sampleStore(), 'deck-a');
  const unconfirmed = updateCard(store, 'deck-a-c1', card('home', 'Zuhause'), false);
  assert.equal(unconfirmed.ok, false, 'no silent reset');

  const confirmed = must(updateCard(store, 'deck-a-c1', card('home', 'Zuhause'), true));
  assert.equal(confirmed.progressReset, true);
  assert.equal(confirmed.store.reviews.some((review) => review.cardId === 'deck-a-c1'), false);
  assert.equal(confirmed.store.reviews.length, store.reviews.length - 2, 'only this card, both directions');
  const due = buildQueue(confirmed.store, { deckIds: null, directions: ['en-de', 'de-en'], now: NOW });
  assert.deepEqual(
    due.map((task) => task.key).sort(),
    ['deck-a:deck-a-c1:de-en', 'deck-a:deck-a-c1:en-de'],
  );
  assert.equal(validateStore(confirmed.store).ok, true);
});

test('changing content of a never-reviewed card needs no confirmation', () => {
  const result = must(updateCard(sampleStore(), 'deck-a-c1', card('home', 'Zuhause'), false));
  assert.equal(result.progressReset, false);
  assert.equal(result.store.cards[0].term, 'home');
});

test('deleting a deck removes its cards, progress and counters — and nothing else', () => {
  let store = withDeck(sampleStore(), 'deck-b', [card('cat', 'Katze'), card('dog', 'Hund')]);
  store = rateAll(rateAll(store, 'deck-a'), 'deck-b');
  assert.deepEqual(deckDeletionImpact(store, 'deck-b'), { cards: 2, reviewedQueries: 4 });

  const after = must(deleteDeck(store, 'deck-b'));
  assert.deepEqual(
    after.decks.map((deck) => deck.id),
    ['deck-a'],
  );
  assert.equal(after.cards.every((entry) => entry.deckId === 'deck-a'), true);
  assert.equal(after.reviews.every((review) => review.deckId === 'deck-a'), true);
  assert.equal(after.reviews.length, 6, 'deck-a progress untouched');
  assert.equal(after.activity?.ratings.every((entry) => entry.key.startsWith('deck-a:')), true);
  assert.equal(vocabStats(after, NOW, 'Europe/Berlin').ratedToday, 6, 'counters of the deleted deck are gone');
  assert.equal(validateStore(after).ok, true, 'no orphaned review entries');
});

test('deleting a card removes both directions of that card only', () => {
  const store = rateAll(sampleStore(), 'deck-a');
  const after = must(deleteCard(store, 'deck-a-c2'));
  assert.equal(after.cards.length, 2);
  assert.equal(after.reviews.length, 4);
  assert.equal(after.reviews.some((review) => review.cardId === 'deck-a-c2'), false);
  assert.equal(validateStore(after).ok, true);
  assert.equal(deleteCard(after, 'deck-a-c2').ok, false, 'second delete reports not found');
});

test('tag filter is case-insensitive and lists each tag once', () => {
  const store = withDeck(emptyStore(), 'deck-a', [
    card('a', 'A', { tags: ['Reisen', 'bahn'] }),
    card('b', 'B', { tags: ['reisen'] }),
    card('c', 'C'),
  ]);
  assert.deepEqual(deckTags(store, 'deck-a'), ['bahn', 'Reisen']);
  assert.deepEqual(
    cardsWithTag(store.cards, 'REISEN').map((entry) => entry.term),
    ['a', 'b'],
  );
  assert.equal(cardsWithTag(store.cards, null).length, 3);
});
