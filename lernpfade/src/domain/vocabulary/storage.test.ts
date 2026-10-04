import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStore, type VocabStore } from './model.ts';
import { addCard } from './operations.ts';
import { applyRating, buildQueue } from './session.ts';
import { loadVocabStorage, resetVocabStorage, saveVocabStorage, storedRevision } from './storage.ts';
import { MemoryBackend, NOW, card, must, quotaError, sampleStore } from './testing.ts';
import { validateStore } from './validate.ts';

async function saved(backend: MemoryBackend, store: VocabStore, basedOn: number): Promise<VocabStore> {
  const outcome = await saveVocabStorage(backend, store, basedOn);
  assert.equal(outcome.ok, true, outcome.ok ? '' : outcome.reason);
  return (outcome as { ok: true; store: VocabStore }).store;
}

test('nothing stored yet gives an empty, unwritten state', async () => {
  const backend = new MemoryBackend();
  const outcome = await loadVocabStorage(backend);
  assert.equal(outcome.status, 'empty');
  assert.equal(backend.raw, null, 'loading never writes');
});

test('decks, cards and progress survive a reload unchanged', async () => {
  const backend = new MemoryBackend();
  let store = await saved(backend, sampleStore(), 0);
  const task = buildQueue(store, { deckIds: null, directions: ['de-en'], now: NOW })[0];
  store = await saved(backend, must(applyRating(store, task, 'good', NOW, 'Europe/Berlin')).store, store.revision);
  assert.equal(store.revision, 2);

  const reloaded = await loadVocabStorage(backend);
  assert.equal(reloaded.status, 'ok');
  assert.deepEqual(reloaded.status === 'ok' && reloaded.store, store);
});

test('corrupted data is reported, never silently replaced', async () => {
  for (const raw of ['{not json', '[]', '{"version":1}', JSON.stringify({ ...emptyStore(), decks: 'x' })]) {
    const backend = new MemoryBackend();
    backend.raw = raw;
    const outcome = await loadVocabStorage(backend);
    assert.equal(outcome.status, 'corrupt', raw);
    assert.equal(outcome.status === 'corrupt' && outcome.raw, raw, 'raw data offered for backup');
    // Auch ein Schreibversuch auf Basis eines leeren Zustands überschreibt nichts.
    const write = await saveVocabStorage(backend, sampleStore(), 0);
    assert.equal(!write.ok && write.reason, 'conflict');
    assert.equal(backend.raw, raw);
  }
});

test('data from a newer version is kept and reported as such', async () => {
  const backend = new MemoryBackend();
  const raw = JSON.stringify({ version: 2, revision: 4, somethingNew: true });
  backend.raw = raw;
  assert.deepEqual(await loadVocabStorage(backend), { status: 'future', raw, version: 2 });
  assert.equal((await saveVocabStorage(backend, sampleStore(), 0)).ok, false);
  assert.equal(backend.raw, raw);
});

test('a full storage is reported as failure and keeps the previous data', async () => {
  const backend = new MemoryBackend();
  const first = await saved(backend, sampleStore(), 0);
  const before = backend.raw;
  backend.failNextWrite = quotaError();
  const next = must(addCard(first, 'deck-a', card('cat', 'Katze'), 'card-cat', NOW));
  assert.deepEqual(await saveVocabStorage(backend, next, first.revision), { ok: false, reason: 'quota' });
  assert.equal(backend.raw, before);
});

test('a write that does not stick is not reported as success', async () => {
  const backend = new MemoryBackend();
  backend.swallowWrites = true;
  assert.deepEqual(await saveVocabStorage(backend, sampleStore(), 0), { ok: false, reason: 'unavailable' });
});

test('blocked storage is reported as unavailable', async () => {
  const backend = new MemoryBackend();
  backend.failRead = true;
  assert.deepEqual(await loadVocabStorage(backend), { status: 'unavailable' });
  assert.deepEqual(await loadVocabStorage(null), { status: 'unavailable' });
  assert.equal((await saveVocabStorage(null, sampleStore(), 0)).ok, false);
});

test('a change from another tab blocks the write instead of overwriting it', async () => {
  const backend = new MemoryBackend();
  const tabA = await saved(backend, sampleStore(), 0);
  // Tab B lädt denselben Stand, fügt eine Karte hinzu und speichert.
  const tabB = await saved(backend, must(addCard(tabA, 'deck-a', card('cat', 'Katze'), 'card-b', NOW)), tabA.revision);
  // Tab A arbeitet noch auf dem alten Stand.
  const staleWrite = await saveVocabStorage(
    backend,
    must(addCard(tabA, 'deck-a', card('dog', 'Hund'), 'card-a', NOW)),
    tabA.revision,
  );
  assert.deepEqual(staleWrite, { ok: false, reason: 'conflict' });
  const current = await loadVocabStorage(backend);
  assert.deepEqual(current.status === 'ok' && current.store, tabB, "tab B's card is kept");
  assert.equal(storedRevision(backend.raw), tabB.revision);
});

test('two simultaneous saves from the same revision: exactly one wins, nothing is lost silently', async () => {
  const backend = new MemoryBackend();
  const base = await saved(backend, sampleStore(), 0);
  const fromA = must(addCard(base, 'deck-a', card('dog', 'Hund'), 'card-a', NOW));
  const fromB = must(addCard(base, 'deck-a', card('cat', 'Katze'), 'card-b', NOW));
  const outcomes = await Promise.all([
    saveVocabStorage(backend, fromA, base.revision),
    saveVocabStorage(backend, fromB, base.revision),
  ]);
  assert.deepEqual(
    outcomes.map((outcome) => (outcome.ok ? 'ok' : outcome.reason)).sort(),
    ['conflict', 'ok'],
  );
  const winner = outcomes.find((outcome) => outcome.ok) as { ok: true; store: VocabStore };
  assert.equal(backend.raw, JSON.stringify(winner.store), 'the reported winner is what is stored');
});

test('an invalid next state is never written', async () => {
  const backend = new MemoryBackend();
  const broken = { ...sampleStore(), cards: [{ ...sampleStore().cards[0], deckId: 'nope' }] };
  assert.deepEqual(await saveVocabStorage(backend, broken, 0), { ok: false, reason: 'invalid' });
  assert.equal(backend.raw, null);
});

test('reset removes the VokabelPfad record', async () => {
  const backend = new MemoryBackend();
  await saved(backend, sampleStore(), 0);
  assert.equal(await resetVocabStorage(backend), true);
  assert.equal(backend.raw, null);
  assert.equal(await resetVocabStorage(null), false);
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

test('non-finite numbers in stored JSON are rejected', async () => {
  const raw = JSON.stringify(storedWith(() => undefined)).replace(/"ease":\d+(\.\d+)?/, '"ease":1e999');
  assert.match(raw, /1e999/);
  const backend = new MemoryBackend();
  backend.raw = raw;
  assert.equal((await loadVocabStorage(backend)).status, 'corrupt');
});

test('prototype keys in stored data are rejected and cause no pollution', async () => {
  const raw = JSON.stringify(storedWith(() => undefined)).replace('"decks":[{', '"decks":[{"__proto__":{"polluted":true},');
  const backend = new MemoryBackend();
  backend.raw = raw;
  assert.equal((await loadVocabStorage(backend)).status, 'corrupt');
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});
