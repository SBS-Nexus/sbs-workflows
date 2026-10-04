import assert from 'node:assert/strict';
import test from 'node:test';
import { VOCAB_STORAGE_KEY, emptyStore, type VocabStore } from './model.ts';
import { addCard } from './operations.ts';
import { applyRating, buildQueue } from './session.ts';
import { loadVocabStorage, resetVocabStorage, revisionOf, saveVocabStorage } from './storage.ts';
import { MemoryStorage, NOW, card, must, quotaError, sampleStore } from './testing.ts';
import { validateStore } from './validate.ts';

const DEMO_KEY = 'lernpfade-review-state-v1';

function saved(storage: MemoryStorage, store: VocabStore, basedOn: number): VocabStore {
  const outcome = saveVocabStorage(storage, store, basedOn);
  assert.equal(outcome.ok, true, outcome.ok ? '' : outcome.reason);
  return (outcome as { ok: true; store: VocabStore }).store;
}

test('nothing stored yet gives an empty, unwritten state', () => {
  const storage = new MemoryStorage();
  const outcome = loadVocabStorage(storage);
  assert.equal(outcome.status, 'empty');
  assert.equal(storage.data.size, 0, 'loading never writes');
});

test('decks, cards and progress survive a reload unchanged', () => {
  const storage = new MemoryStorage();
  let store = saved(storage, sampleStore(), 0);
  const task = buildQueue(store, { deckIds: null, directions: ['de-en'], now: NOW })[0];
  store = saved(storage, must(applyRating(store, task, 'good', NOW, 'Europe/Berlin')).store, store.revision);
  assert.equal(store.revision, 2);

  const reloaded = loadVocabStorage(storage);
  assert.equal(reloaded.status, 'ok');
  assert.deepEqual(reloaded.status === 'ok' && reloaded.store, store);
});

test('corrupted data is reported, never silently replaced', () => {
  for (const raw of ['{not json', '[]', '{"version":1}', JSON.stringify({ ...emptyStore(), decks: 'x' })]) {
    const storage = new MemoryStorage();
    storage.data.set(VOCAB_STORAGE_KEY, raw);
    const outcome = loadVocabStorage(storage);
    assert.equal(outcome.status, 'corrupt', raw);
    assert.equal(outcome.status === 'corrupt' && outcome.raw, raw, 'raw data offered for backup');
    // Auch ein Schreibversuch auf Basis eines leeren Zustands überschreibt nichts.
    const write = saveVocabStorage(storage, sampleStore(), 0);
    assert.equal(!write.ok && write.reason, 'conflict');
    assert.equal(storage.data.get(VOCAB_STORAGE_KEY), raw);
  }
});

test('data from a newer version is kept and reported as such', () => {
  const storage = new MemoryStorage();
  const raw = JSON.stringify({ version: 2, revision: 4, somethingNew: true });
  storage.data.set(VOCAB_STORAGE_KEY, raw);
  const outcome = loadVocabStorage(storage);
  assert.deepEqual(outcome, { status: 'future', raw, version: 2 });
  assert.equal(saveVocabStorage(storage, sampleStore(), 0).ok, false);
  assert.equal(storage.data.get(VOCAB_STORAGE_KEY), raw);
});

test('a full storage is reported as failure and keeps the previous data', () => {
  const storage = new MemoryStorage();
  const first = saved(storage, sampleStore(), 0);
  const before = storage.data.get(VOCAB_STORAGE_KEY);
  storage.failNextSet = quotaError();
  const next = must(addCard(first, 'deck-a', card('cat', 'Katze'), 'card-cat', NOW));
  const outcome = saveVocabStorage(storage, next, first.revision);
  assert.deepEqual(outcome, { ok: false, reason: 'quota' });
  assert.equal(storage.data.get(VOCAB_STORAGE_KEY), before);
});

test('a write that does not stick is not reported as success', () => {
  const storage = new MemoryStorage();
  storage.setItem = () => undefined; // Browser „schluckt" den Schreibvorgang.
  assert.deepEqual(saveVocabStorage(storage, sampleStore(), 0), { ok: false, reason: 'unavailable' });
});

test('blocked storage is reported as unavailable', () => {
  const storage = new MemoryStorage();
  storage.failGet = true;
  assert.deepEqual(loadVocabStorage(storage), { status: 'unavailable' });
  assert.deepEqual(loadVocabStorage(null), { status: 'unavailable' });
  assert.equal(saveVocabStorage(storage, sampleStore(), 0).ok, false);
});

test('a change from another tab blocks the write instead of overwriting it', () => {
  const storage = new MemoryStorage();
  const tabA = saved(storage, sampleStore(), 0);
  // Tab B lädt denselben Stand, fügt eine Karte hinzu und speichert.
  const tabB = saved(storage, must(addCard(tabA, 'deck-a', card('cat', 'Katze'), 'card-b', NOW)), tabA.revision);
  // Tab A arbeitet noch auf dem alten Stand.
  const staleWrite = saveVocabStorage(storage, must(addCard(tabA, 'deck-a', card('dog', 'Hund'), 'card-a', NOW)), tabA.revision);
  assert.deepEqual(staleWrite, { ok: false, reason: 'conflict' });
  const current = loadVocabStorage(storage);
  assert.deepEqual(current.status === 'ok' && current.store, tabB, "tab B's card is kept");
  assert.equal(revisionOf(storage.data.get(VOCAB_STORAGE_KEY) ?? null), tabB.revision);
});

test('an invalid next state is never written', () => {
  const storage = new MemoryStorage();
  const broken = { ...sampleStore(), cards: [{ ...sampleStore().cards[0], deckId: 'nope' }] };
  assert.deepEqual(saveVocabStorage(storage, broken, 0), { ok: false, reason: 'invalid' });
  assert.equal(storage.data.size, 0);
});

test('reset removes only the VokabelPfad key', () => {
  const storage = new MemoryStorage();
  saved(storage, sampleStore(), 0);
  storage.data.set(DEMO_KEY, '{"language-en-retrieval":{}}');
  storage.data.set('something-else', 'x');
  assert.equal(resetVocabStorage(storage), true);
  assert.equal(storage.data.has(VOCAB_STORAGE_KEY), false);
  assert.equal(storage.data.get(DEMO_KEY), '{"language-en-retrieval":{}}', 'demo state untouched');
  assert.equal(storage.data.get('something-else'), 'x');
});

function storedWith(mutate: (value: Record<string, unknown>) => void): unknown {
  const store = sampleStore();
  const task = buildQueue(store, { deckIds: null, directions: ['en-de'], now: NOW })[0];
  const value = JSON.parse(JSON.stringify(must(applyRating(store, task, 'good', NOW, 'Europe/Berlin')).store));
  mutate(value);
  return value;
}

test('stored values are validated: references, ids, dates, ratings and finite numbers', () => {
  const cases: [string, (value: Record<string, unknown>) => void][] = [
    ['review for unknown card', (v) => ((v.reviews as Record<string, unknown>[])[0].cardId = 'ghost')],
    ['card in unknown deck', (v) => ((v.cards as Record<string, unknown>[])[0].deckId = 'ghost')],
    ['duplicate card id', (v) => ((v.cards as Record<string, unknown>[])[1].id = 'deck-a-c1')],
    ['bad id', (v) => ((v.decks as Record<string, unknown>[])[0].id = 'Deck A')],
    ['bad date', (v) => ((v.cards as Record<string, unknown>[])[0].createdAt = 'gestern')],
    ['unknown rating', (v) => (((v.reviews as Record<string, unknown>[])[0].state as Record<string, unknown>).lastRating = 'perfect')],
    ['NaN-like ease', (v) => (((v.reviews as Record<string, unknown>[])[0].state as Record<string, unknown>).ease = 'NaN')],
    ['negative interval', (v) => (((v.reviews as Record<string, unknown>[])[0].state as Record<string, unknown>).intervalDays = -1)],
    ['fractional repetitions', (v) => (((v.reviews as Record<string, unknown>[])[0].state as Record<string, unknown>).repetitions = 1.5)],
    ['itemId mismatch', (v) => (((v.reviews as Record<string, unknown>[])[0].state as Record<string, unknown>).itemId = 'x')],
    ['unknown direction', (v) => ((v.reviews as Record<string, unknown>[])[0].direction = 'en-fr')],
    ['counter for unknown card', (v) => ((v.activity as { ratings: { key: string }[] }).ratings[0].key = 'deck-a:ghost:en-de')],
    ['zero counter', (v) => ((v.activity as { ratings: { count: number }[] }).ratings[0].count = 0)],
    ['extra field', (v) => (v.extra = 1)],
    ['wrong language', (v) => ((v.decks as Record<string, unknown>[])[0].targetLanguage = 'fr')],
    ['untrimmed text', (v) => ((v.cards as Record<string, unknown>[])[0].term = ' house')],
  ];
  for (const [name, mutate] of cases) {
    const result = validateStore(storedWith(mutate));
    assert.equal(result.ok, false, name);
  }
  assert.equal(validateStore(storedWith(() => undefined)).ok, true, 'unmodified state is valid');
});

test('non-finite numbers in stored JSON are rejected', () => {
  const raw = JSON.stringify(storedWith(() => undefined)).replace(/"ease":\d+(\.\d+)?/, '"ease":1e999');
  assert.match(raw, /1e999/);
  const storage = new MemoryStorage();
  storage.data.set(VOCAB_STORAGE_KEY, raw);
  assert.equal(loadVocabStorage(storage).status, 'corrupt');
});

test('prototype keys in stored data are rejected and cause no pollution', () => {
  const raw = JSON.stringify(storedWith(() => undefined)).replace('"decks":[{', '"decks":[{"__proto__":{"polluted":true},');
  const storage = new MemoryStorage();
  storage.data.set(VOCAB_STORAGE_KEY, raw);
  assert.equal(loadVocabStorage(storage).status, 'corrupt');
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});
