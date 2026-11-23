import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  EXPORT_NOTICE,
  applyImport,
  exportDecks,
  previewImport,
  type ImportErrorCode,
} from './exchange.ts';
import { LIMITS, emptyStore, type VocabStore } from './model.ts';
import { createDeck, deleteDeck } from './operations.ts';
import { applyRating, buildQueue } from './session.ts';
import { STARTER_DECKS, adoptStarterDeck } from './starter-decks.ts';
import { NOW, card, fixture, must, sampleStore, withDeck } from './testing.ts';
import { validateStore } from './validate.ts';

function snapshot(store: VocabStore): string {
  return JSON.stringify(store);
}

test('the public example file is a valid import', () => {
  const text = readFileSync(new URL('../../../public/vokabeln/beispiel-import.json', import.meta.url), 'utf8');
  const preview = must(previewImport(text, emptyStore(), NOW));
  assert.equal(preview.deckCount, 1);
  assert.equal(preview.cardCount, 4);
  assert.equal(preview.languages, 'Englisch → Deutsch');
  assert.deepEqual(preview.origins, ['Lernpfade-Beispieldatei']);
});

test('export → import round-trips content, Unicode, context and tags — but no progress', () => {
  let store = withDeck(emptyStore(), 'deck-u', [
    card('naïve café 🚀', 'naives Café ☕', { context: 'A naïve plan — „ein naiver Plan“.', tags: ['ümläut', 'emoji 🚀'] }),
    card('house', 'Haus'),
  ]);
  for (const task of buildQueue(store, { deckIds: null, directions: ['en-de'], now: NOW })) {
    store = must(applyRating(store, task, 'good', NOW)).store;
  }
  const file = exportDecks(store, ['deck-u'], NOW);
  assert.equal(file.progressIncluded, false);
  assert.equal(file.hinweis, EXPORT_NOTICE);
  const text = JSON.stringify(file);
  assert.equal(/dueAt|intervalDays|ease|repetitions|reviews|activity/.test(text), false, 'no progress in export');
  assert.deepEqual(file.decks[0].origin, { kind: 'self', label: 'Selbst erstellt' });

  // Auf einem anderen Gerät (leerer Bestand) importieren.
  const preview = must(previewImport(text, emptyStore(), NOW));
  const imported = must(applyImport(emptyStore(), preview));
  assert.equal(imported.cards[0].term, 'naïve café 🚀');
  assert.equal(imported.cards[0].context, 'A naïve plan — „ein naiver Plan“.');
  assert.deepEqual(imported.cards[0].tags, ['ümläut', 'emoji 🚀']);
  assert.equal(imported.cards[1].context, '');
  assert.deepEqual(imported.decks[0].origin, { kind: 'import', label: 'Selbst erstellt' });
  assert.equal(imported.reviews.length, 0, 'imported cards start fresh');
  assert.equal(validateStore(imported).ok, true);
  assert.equal(must(previewImport(fixture('valid-unicode.json'), emptyStore(), NOW)).cards[0].tags[1], 'emoji 🚀');
});

test('re-importing the same export is rejected and leaves data and progress untouched', () => {
  let store = sampleStore();
  const task = buildQueue(store, { deckIds: null, directions: ['en-de'], now: NOW })[0];
  store = must(applyRating(store, task, 'good', NOW)).store;
  const before = snapshot(store);
  const text = JSON.stringify(exportDecks(store, null, NOW));

  const preview = previewImport(text, store, NOW);
  assert.equal(preview.ok, false);
  assert.equal(!preview.ok && preview.error.code, 'collision');
  assert.match(!preview.ok ? preview.error.message : '', /Deck deck-a/);
  assert.equal(snapshot(store), before);

  // Nach dem Löschen des Decks ist derselbe Import wieder möglich — als neue Karten ohne Fortschritt.
  const cleared = must(deleteDeck(store, 'deck-a'));
  const again = must(applyImport(cleared, must(previewImport(text, cleared, NOW))));
  assert.equal(again.cards.length, 3);
  assert.equal(again.reviews.length, 0);
});

test('applyImport re-checks collisions against the current store (stale preview)', () => {
  const text = fixture('valid-unicode.json');
  const preview = must(previewImport(text, emptyStore(), NOW));
  const changed = must(applyImport(emptyStore(), preview));
  const stale = applyImport(changed, preview);
  assert.equal(!stale.ok && stale.error.code, 'collision');
});

const INVALID: readonly [string, ImportErrorCode][] = [
  ['invalid-json.json', 'invalid_json'],
  ['invalid-wrong-format.json', 'wrong_format'],
  ['invalid-future-version.json', 'unsupported_version'],
  ['invalid-progress.json', 'progress_not_supported'],
  ['invalid-duplicate-card-ids.json', 'duplicate_id'],
  ['invalid-unknown-field.json', 'invalid_content'],
  ['invalid-overlong-term.json', 'invalid_content'],
  ['invalid-bad-id.json', 'invalid_content'],
  ['invalid-language.json', 'invalid_content'],
  ['invalid-proto-key.json', 'invalid_content'],
  ['invalid-constructor-key.json', 'invalid_content'],
];

for (const [name, code] of INVALID) {
  test(`invalid import ${name} is rejected atomically (${code})`, () => {
    const store = sampleStore();
    const before = snapshot(store);
    const result = previewImport(fixture(name), store, NOW);
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.code, code);
    assert.ok(!result.ok && result.error.message.length > 0, 'explains why');
    assert.equal(snapshot(store), before, 'existing data identical');
  });
}

test('prototype keys never reach Object.prototype', () => {
  previewImport(fixture('invalid-proto-key.json'), emptyStore(), NOW);
  previewImport(fixture('invalid-constructor-key.json'), emptyStore(), NOW);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('files over 2 MiB are rejected before parsing', () => {
  const padding = ' '.repeat(LIMITS.importBytes);
  const result = previewImport(`${padding}{}`, emptyStore(), NOW);
  assert.equal(!result.ok && result.error.code, 'too_large');
});

function fileWith(cardCount: number, deckId = 'big'): string {
  return JSON.stringify({
    format: 'lernpfade-vokabeln',
    schemaVersion: 1,
    decks: [
      {
        id: deckId,
        name: `Deck ${deckId}`,
        sourceLanguage: 'en',
        targetLanguage: 'de',
        origin: { kind: 'import', label: 'Test' },
        cards: Array.from({ length: cardCount }, (_, i) => ({
          id: `${deckId}-${i}`,
          term: `t${i}`,
          translation: `ü${i}`,
          tags: [],
        })),
      },
    ],
  });
}

test('total card limit holds across several consecutive imports and manual cards', () => {
  let store = withDeck(emptyStore(), 'manual', [card('a', 'b')]);
  store = must(applyImport(store, must(previewImport(fileWith(600, 'first'), store, NOW))));
  assert.equal(store.cards.length, 601);
  const before = snapshot(store);
  const second = previewImport(fileWith(400, 'second'), store, NOW);
  assert.equal(!second.ok && second.error.code, 'limit_exceeded', '601 + 400 > 1000');
  assert.equal(snapshot(store), before);
  store = must(applyImport(store, must(previewImport(fileWith(399, 'third'), store, NOW))));
  assert.equal(store.cards.length, LIMITS.cards);
});

test('a single file may not exceed the card or deck limit', () => {
  const tooMany = previewImport(fileWith(LIMITS.cards + 1), emptyStore(), NOW);
  assert.equal(!tooMany.ok && tooMany.error.code, 'limit_exceeded');
  let store = emptyStore();
  for (let i = 0; i < LIMITS.decks; i += 1) {
    store = must(createDeck(store, { name: `D${i}`, description: '' }, `d-${i}`, NOW));
  }
  const deckLimit = previewImport(fileWith(1), store, NOW);
  assert.equal(!deckLimit.ok && deckLimit.error.code, 'limit_exceeded');
});

test('starter decks are adopted only on request and only once', () => {
  let store = emptyStore();
  const starter = STARTER_DECKS[0];
  store = must(adoptStarterDeck(store, starter.id, NOW));
  assert.equal(store.decks[0].origin.kind, 'starter');
  assert.equal(store.cards.length, starter.cards.length);
  const before = snapshot(store);
  const twice = adoptStarterDeck(store, starter.id, NOW);
  assert.equal(!twice.ok && twice.error.code, 'collision');
  assert.equal(snapshot(store), before);
  for (const deck of STARTER_DECKS) {
    assert.ok(deck.cards.length >= 10, `${deck.id} has enough cards`);
  }
});
