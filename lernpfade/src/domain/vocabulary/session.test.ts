import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStore, LIMITS, type VocabStore } from './model.ts';
import { deleteCard } from './operations.ts';
import {
  applyRating,
  buildQueue,
  currentTask,
  isFinished,
  nextChangeAt,
  nextDueAt,
  recordResult,
  reveal,
  sessionFollowUp,
  startSession,
  vocabStats,
  type ReviewTask,
  type Session,
} from './session.ts';
import { DAY, NOW, card, must, sampleStore, withDeck } from './testing.ts';

const BOTH = ['en-de', 'de-en'] as const;

function rate(store: VocabStore, task: ReviewTask, rating: 'again' | 'hard' | 'good' | 'easy', now = NOW): VocabStore {
  return must(applyRating(store, task, rating, now, 'Europe/Berlin')).store;
}

test('new cards are due in both directions, each with its own review key', () => {
  const queue = buildQueue(sampleStore(), { deckIds: null, directions: BOTH, now: NOW });
  assert.equal(queue.length, 6, '3 cards × 2 directions');
  assert.equal(new Set(queue.map((task) => task.key)).size, 6);
  const house = queue.filter((task) => task.cardId === 'deck-a-c1');
  // Gleiche Fälligkeit (neu angelegt) → der stabile Schlüssel entscheidet: „…:de-en" vor „…:en-de".
  assert.deepEqual(
    house.map((task) => [task.direction, task.prompt, task.answer]),
    [
      ['de-en', 'Haus', 'house'],
      ['en-de', 'house', 'Haus'],
    ],
  );
  assert.ok(queue.every((task) => task.isNew));
});

test('rating one direction never completes the other', () => {
  let store = sampleStore();
  const enDe = buildQueue(store, { deckIds: null, directions: ['en-de'], now: NOW })[0];
  store = rate(store, enDe, 'good');
  const due = buildQueue(store, { deckIds: null, directions: BOTH, now: NOW });
  assert.equal(due.some((task) => task.key === enDe.key), false, 'rated direction is no longer due');
  assert.equal(
    due.some((task) => task.cardId === enDe.cardId && task.direction === 'de-en'),
    true,
    'reverse direction of the same card is still due',
  );
});

test('the queue is ordered by due date, then by stable key, and bounded by the limit', () => {
  const cards = Array.from({ length: 15 }, (_, i) => card(`term${i}`, `Begriff${i}`));
  const store = withDeck(emptyStore(), 'deck-a', cards);
  const queue = buildQueue(store, { deckIds: null, directions: BOTH, now: new Date(NOW.getTime() + DAY) });
  assert.equal(queue.length, LIMITS.sessionSize, 'default session size is 20');
  for (let i = 1; i < queue.length; i += 1) {
    const a = queue[i - 1];
    const b = queue[i];
    const order = Date.parse(a.dueAt) - Date.parse(b.dueAt) || (a.key < b.key ? -1 : 1);
    assert.ok(order < 0, `${a.key} before ${b.key}`);
  }
  const again = buildQueue(store, { deckIds: null, directions: BOTH, now: new Date(NOW.getTime() + DAY) });
  assert.deepEqual(
    again.map((task) => task.key),
    queue.map((task) => task.key),
    'deterministic',
  );
});

test('a session rates every planned query exactly once, without skipping', () => {
  let store = sampleStore();
  let session: Session = startSession(buildQueue(store, { deckIds: null, directions: BOTH, now: NOW }));
  const planned = session.tasks.map((task) => task.key);
  const rated: string[] = [];

  while (!isFinished(session)) {
    const task = currentTask(session);
    assert.ok(task);
    session = reveal(session);
    const outcome = must(applyRating(store, task, 'good', NOW, 'Europe/Berlin'));
    store = outcome.store;
    const before = session;
    session = recordResult(session, outcome.result);
    // Doppelklick: dieselbe Bewertung noch einmal — darf nichts bewirken.
    assert.equal(recordResult(session, outcome.result), session);
    assert.equal(session.position, before.position + 1);
    rated.push(task.key);
  }

  assert.deepEqual(rated, planned, 'each planned query once, in order');
  assert.equal(session.results.length, planned.length);
  assert.equal(store.reviews.length, planned.length, 'one review record per query, no duplicates');
  assert.equal(vocabStats(store, NOW, 'Europe/Berlin').ratedToday, planned.length);
});

test('ratings are only recorded after reveal and only for the current query', () => {
  const store = sampleStore();
  const session = startSession(buildQueue(store, { deckIds: null, directions: BOTH, now: NOW }));
  const first = currentTask(session);
  assert.ok(first);
  const outcome = must(applyRating(store, first, 'good', NOW));
  assert.equal(recordResult(session, outcome.result), session, 'not revealed yet');
  const revealed = reveal(session);
  const second = session.tasks[1];
  const wrong = must(applyRating(store, second, 'good', NOW)).result;
  assert.equal(recordResult(revealed, wrong), revealed, 'not the current query');
});

test('nothing due gives an empty queue and the next due date — no endless loop', () => {
  let store = sampleStore();
  for (const task of buildQueue(store, { deckIds: null, directions: BOTH, now: NOW })) {
    store = rate(store, task, 'easy');
  }
  assert.deepEqual(buildQueue(store, { deckIds: null, directions: BOTH, now: NOW }), []);
  const next = nextDueAt(store, { deckIds: null, directions: BOTH, now: NOW });
  assert.equal(next, new Date(NOW.getTime() + 3 * DAY).toISOString(), 'easy on a new card = 3 days');
  // Erst wenn die Fälligkeit erreicht ist, kommen die Abfragen zurück.
  assert.equal(buildQueue(store, { deckIds: null, directions: BOTH, now: new Date(NOW.getTime() + 3 * DAY) }).length, 6);
});

test('scheduling uses the shared review core unchanged: again means tomorrow', () => {
  let store = sampleStore();
  const task = buildQueue(store, { deckIds: null, directions: ['en-de'], now: NOW })[0];
  const outcome = must(applyRating(store, task, 'again', NOW));
  assert.equal(outcome.result.nextDueLabel, 'morgen');
  assert.equal(outcome.result.nextDueAt, new Date(NOW.getTime() + DAY).toISOString());
  store = outcome.store;
  assert.equal(
    buildQueue(store, { deckIds: null, directions: ['en-de'], now: NOW }).some((entry) => entry.key === task.key),
    false,
    'again does not bring the query back within the same day',
  );
});

test('future-due queries are excluded and deck/direction filters apply', () => {
  let store = withDeck(sampleStore(), 'deck-b', [card('cat', 'Katze')]);
  const onlyB = buildQueue(store, { deckIds: new Set(['deck-b']), directions: ['de-en'], now: NOW });
  assert.deepEqual(
    onlyB.map((task) => task.key),
    ['deck-b:deck-b-c1:de-en'],
  );
  store = rate(store, onlyB[0], 'good');
  assert.deepEqual(buildQueue(store, { deckIds: new Set(['deck-b']), directions: ['de-en'], now: NOW }), []);
});

test('"rated today" follows the local calendar day', () => {
  let store = sampleStore();
  const tasks = buildQueue(store, { deckIds: null, directions: BOTH, now: NOW });
  // 21:30 UTC = 23:30 in Berlin am 4. Oktober.
  const evening = new Date('2026-10-04T21:30:00.000Z');
  store = must(applyRating(store, tasks[0], 'good', evening, 'Europe/Berlin')).store;
  assert.equal(vocabStats(store, evening, 'Europe/Berlin').ratedToday, 1);
  // 22:30 UTC = 00:30 in Berlin am 5. Oktober: neuer Tag, Zähler beginnt bei 0.
  const afterMidnight = new Date('2026-10-04T22:30:00.000Z');
  assert.equal(vocabStats(store, afterMidnight, 'Europe/Berlin').ratedToday, 0);
  store = must(applyRating(store, tasks[1], 'good', afterMidnight, 'Europe/Berlin')).store;
  assert.equal(store.activity?.day, '2026-10-05');
  assert.equal(vocabStats(store, afterMidnight, 'Europe/Berlin').ratedToday, 1, 'yesterday is not counted');
});

test('statistics distinguish cards from queries and count due per direction', () => {
  let store = sampleStore();
  const first = buildQueue(store, { deckIds: null, directions: ['en-de'], now: NOW })[0];
  store = rate(store, first, 'good');
  const stats = vocabStats(store, NOW, 'Europe/Berlin');
  assert.equal(stats.cards, 3);
  assert.equal(stats.queries, 6);
  assert.deepEqual(stats.dueByDirection, { 'en-de': 2, 'de-en': 3 });
  assert.equal(stats.ratedToday, 1);
  assert.equal(stats.nextDueAt, new Date(NOW.getTime() + DAY).toISOString());
});

test('a card deleted mid-session cannot be rated and leaves no orphaned record', () => {
  let store = sampleStore();
  const task = buildQueue(store, { deckIds: null, directions: BOTH, now: NOW })[0];
  store = must(deleteCard(store, task.cardId));
  const outcome = applyRating(store, task, 'good', NOW);
  assert.equal(outcome.ok, false);
  assert.equal(store.reviews.length, 0);
});

test('after a capped session, remaining due work is reported instead of only the next date', () => {
  const cards = Array.from({ length: 15 }, (_, i) => card(`term${i}`, `Begriff${i}`));
  let store = withDeck(emptyStore(), 'deck-a', cards);
  const later = new Date(NOW.getTime() + DAY);
  const tasks = buildQueue(store, { deckIds: null, directions: BOTH, now: later });
  assert.equal(tasks.length, 20, '30 queries due, session capped at 20');
  for (const task of tasks) store = must(applyRating(store, task, 'good', later)).store;

  const followUp = sessionFollowUp(store, { deckIds: null, directions: BOTH }, later);
  assert.equal(followUp.remainingDue, 10, 'the 10 queries outside the session are still due');
  assert.equal(followUp.nextDueAt, new Date(later.getTime() + DAY).toISOString());

  // Nach einer zweiten Session ist für diese Auswahl nichts mehr fällig.
  const second = buildQueue(store, { deckIds: null, directions: BOTH, now: later });
  for (const task of second) store = must(applyRating(store, task, 'good', later)).store;
  assert.equal(sessionFollowUp(store, { deckIds: null, directions: BOTH }, later).remainingDue, 0);
});

test('follow-up counts due work in decks the capped session never reached', () => {
  const many = Array.from({ length: 10 }, (_, i) => card(`alpha${i}`, `Alpha${i}`));
  let store = withDeck(emptyStore(), 'deck-a', many, NOW);
  store = withDeck(store, 'deck-b', [card('beta', 'Beta')], new Date(NOW.getTime() + 1000));
  const selection = { deckIds: null, directions: BOTH };
  const tasks = buildQueue(store, { ...selection, now: NOW });
  assert.equal(tasks.length, 20);
  assert.ok(tasks.every((task) => task.deckId === 'deck-a'), 'deck-b is outside the first 20');
  for (const task of tasks) store = must(applyRating(store, task, 'good', NOW)).store;

  assert.equal(sessionFollowUp(store, selection, NOW).remainingDue, 2, "deck-b's two queries are still due");
});

test('next change: local midnight first, then the next due time; stats change exactly there', () => {
  const zone = 'Europe/Berlin';
  const lateEvening = new Date('2026-10-04T21:59:50.000Z'); // 23:59:50 in Berlin
  let store = sampleStore();
  // Neue Karten sind sofort fällig; bis Mitternacht ändert sich nichts.
  assert.ok(Math.abs(nextChangeAt(store, lateEvening, zone).getTime() - Date.parse('2026-10-04T22:00:00.000Z')) <= 1000);

  for (const task of buildQueue(store, { deckIds: null, directions: ['en-de', 'de-en'], now: lateEvening })) {
    store = must(applyRating(store, task, 'good', lateEvening, zone)).store;
  }
  const before = vocabStats(store, lateEvening, zone);
  assert.equal(before.ratedToday, 6);
  assert.deepEqual(before.dueByDirection, { 'en-de': 0, 'de-en': 0 });

  const midnight = nextChangeAt(store, lateEvening, zone);
  assert.equal(vocabStats(store, midnight, zone).ratedToday, 0, 'neuer Tag');

  // Nach Mitternacht ist die nächste Änderung die Fälligkeit, nicht die nächste Mitternacht.
  const dueAt = nextChangeAt(store, midnight, zone);
  assert.equal(dueAt.toISOString(), nextDueAt(store, { deckIds: null, directions: ['en-de', 'de-en'], now: midnight }));
  assert.deepEqual(vocabStats(store, new Date(dueAt.getTime() - 1), zone).dueByDirection, { 'en-de': 0, 'de-en': 0 });
  assert.deepEqual(vocabStats(store, dueAt, zone).dueByDirection, { 'en-de': 3, 'de-en': 3 });
});
