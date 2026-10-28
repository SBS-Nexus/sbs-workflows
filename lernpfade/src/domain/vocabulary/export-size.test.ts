import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deckExportBytes,
  deckRoundtripBytes,
  exportDecks,
  prepareExport,
  previewImport,
  serializeExport,
  utf8Bytes,
  type ExchangeFile,
} from './exchange.ts';
import { LIMITS, emptyStore, type DeckOrigin, type VocabStore } from './model.ts';
import { addCard, updateCard, updateDeck } from './operations.ts';
import { NOW, card, must, sampleStore, withDeck } from './testing.ts';
import { validateStore } from './validate.ts';

/**
 * Work-Review W1: Jede Exportdatei muss sich wieder importieren lassen. Die
 * Größe zählt in UTF-8-Bytes der tatsächlich heruntergeladenen Datei.
 */

const EMOJI_TERM = '😀'.repeat(LIMITS.term); // 4 Bytes je Zeichen
const EMOJI_CONTEXT = '𝄞'.repeat(LIMITS.context);
const EMOJI_TAGS = Array.from({ length: LIMITS.tagsPerCard }, (_, i) => `${i}${'€'.repeat(LIMITS.tag - 1)}`);

function contentOf(store: VocabStore): unknown[] {
  return store.cards.map(({ id, deckId, term, translation, context, tags }) => ({ id, deckId, term, translation, context, tags }));
}

/** Füllt ein Deck über die normalen Operationen, bis die Deck-Größengrenze greift. */
function fillToDeckLimit(deckId: string): { store: VocabStore; refused: number } {
  let store = withDeck(emptyStore(), deckId, []);
  let refused = 0;
  let index = 0;
  const steps = [
    card(EMOJI_TERM, EMOJI_TERM, { context: EMOJI_CONTEXT, tags: EMOJI_TAGS }),
    card('x', 'y', { context: 'a'.repeat(LIMITS.context) }),
    card('x', 'y'),
  ];
  for (const input of steps) {
    for (;;) {
      index += 1;
      const next = addCard(store, deckId, input, `${deckId}-c${index}`, NOW);
      if (!next.ok) {
        assert.equal(next.error.code, 'limit_deck_size', next.error.message);
        refused += 1;
        break;
      }
      store = next.value;
    }
  }
  return { store, refused };
}

test('deckExportBytes equals the size of the real serialized single-deck file', () => {
  const lone = `lone ${String.fromCharCode(0xd800)} surrogate`;
  let store = withDeck(sampleStore(), 'deck-u', [
    card('naïve café 🚀', 'naives Café ☕', { context: 'Quote " and backslash \\ — „x“', tags: ['ümläut', 'emoji 🚀'] }),
    card(lone, 'Ersatz'),
  ]);
  store = must(updateDeck(store, 'deck-u', { name: 'Unicode „Deck“', description: 'Beschreibung mit ä' }));
  store = withDeck(store, 'empty', []);
  store = withDeck(store, 'single', [card('one', 'eins')]);
  for (const deck of store.decks) {
    const real = utf8Bytes(serializeExport(exportDecks(store, [deck.id], NOW)));
    assert.equal(deckExportBytes(store, deck.id), real, deck.id);
  }
});

test('export is compact and its byte count is that of the downloaded text', () => {
  const prepared = must(prepareExport(sampleStore(), null, NOW));
  assert.equal(prepared.text, `${JSON.stringify(exportDecks(sampleStore(), null, NOW))}\n`);
  assert.doesNotMatch(prepared.text.trimEnd(), /\n/);
  assert.equal(prepared.bytes, utf8Bytes(prepared.text));
  assert.equal(prepared.deckCount, 1);
  assert.equal(prepared.cardCount, 3);
});

test('Work W1 repro: a valid 1000-card import near the limit exports and re-imports unchanged', () => {
  const tags = Array.from({ length: 10 }, (_, i) => `${i}${'ä'.repeat(31)}`);
  const store = withDeck(
    emptyStore(),
    'bulk',
    Array.from({ length: 1000 }, () => card('é'.repeat(200), 'ä'.repeat(200), { context: 'a'.repeat(500), tags })),
  );
  assert.equal(validateStore(store).ok, true);
  const compact = JSON.stringify(exportDecks(store, null, NOW));
  const pretty = `${JSON.stringify(exportDecks(store, null, NOW), null, 2)}\n`;
  assert.equal(utf8Bytes(compact), 2_028_295, 'Work: kompakte Eingabedatei');
  assert.ok(utf8Bytes(pretty) > LIMITS.importBytes, 'eingerückt läge dieselbe Datei über der Grenze');

  // Import der kompakten Datei, dann Export über den gemeinsamen Exportweg, dann Import in einen leeren Bestand.
  const imported = must(previewImport(compact, emptyStore(), NOW));
  const inBrowser: VocabStore = { ...emptyStore(), decks: imported.decks, cards: imported.cards };
  const prepared = must(prepareExport(inBrowser, ['bulk'], NOW));
  assert.ok(prepared.bytes <= LIMITS.importBytes, `${prepared.bytes} Bytes`);
  const again = must(previewImport(prepared.text, emptyStore(), NOW));
  assert.deepEqual(contentOf({ ...emptyStore(), decks: again.decks, cards: again.cards }), contentOf(store));
  assert.deepEqual(again.decks.map((deck) => deck.id), ['bulk']);
});

test('a deck can never grow beyond what one export file may hold (add, edit card, edit deck)', () => {
  const { store, refused } = fillToDeckLimit('voll');
  assert.equal(refused, 3, 'each card size is eventually refused');
  const bytes = deckExportBytes(store, 'voll');
  assert.ok(bytes <= LIMITS.importBytes);
  assert.ok(store.cards.length < LIMITS.cards, 'the deck size limit, not the card limit, applies');

  // Eine Karte verlängern: abgelehnt, nichts geändert.
  const target = store.cards[store.cards.length - 1];
  const longer = updateCard(store, target.id, { ...target, context: 'a'.repeat(LIMITS.context) }, false);
  assert.equal(!longer.ok && longer.error.code, 'limit_deck_size');
  // Beschreibung des Decks verlängern: ebenso.
  const described = updateDeck(store, 'voll', { name: 'voll', description: 'ü'.repeat(LIMITS.deckDescription) });
  assert.equal(!described.ok && described.error.code, 'limit_deck_size');
  assert.match(!described.ok ? described.error.message : '', /Importgrenze von 2 MiB/);

  // Der volle Bestand bleibt exportier- und importierbar.
  const prepared = must(prepareExport(store, ['voll'], NOW));
  assert.ok(must(previewImport(prepared.text, emptyStore(), NOW)).cardCount === store.cards.length);
});

test('all decks together too large: refused with a reason, each deck alone still round-trips', () => {
  let store = emptyStore();
  for (const deckId of ['eins', 'zwei', 'drei']) {
    store = withDeck(
      store,
      deckId,
      Array.from({ length: 200 }, () => card(EMOJI_TERM, 'ä'.repeat(LIMITS.translation), { context: EMOJI_CONTEXT, tags: EMOJI_TAGS })),
    );
  }
  assert.ok(store.cards.length <= LIMITS.cards);
  const all = prepareExport(store, null, NOW);
  assert.equal(all.ok, false);
  if (all.ok) return;
  assert.equal(all.error.reason, 'too_large');
  assert.ok(all.error.bytes > LIMITS.importBytes);
  assert.deepEqual(all.error.oversizedDecks, [], 'no single deck is too large');

  for (const deck of store.decks) {
    const single = must(prepareExport(store, [deck.id], NOW));
    const back = must(previewImport(single.text, emptyStore(), NOW));
    assert.deepEqual(back.cards.map((entry) => entry.id), store.cards.filter((entry) => entry.deckId === deck.id).map((entry) => entry.id));
  }
});

test('an oversized legacy deck is reported, never exported truncated', () => {
  // Nur ohne die Operationen herstellbar (z. B. Daten aus einer älteren Version).
  const base = withDeck(emptyStore(), 'alt', [card(EMOJI_TERM, EMOJI_TERM, { context: EMOJI_CONTEXT, tags: EMOJI_TAGS })]);
  const template = base.cards[0];
  const cards = Array.from({ length: 600 }, (_, i) => ({ ...template, id: `alt-c${i + 1}` }));
  const legacy: VocabStore = { ...base, cards };
  assert.equal(validateStore(legacy).ok, true, 'stored data stays readable');
  const result = prepareExport(legacy, ['alt'], NOW);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.oversizedDecks.length, 1);
  assert.equal(result.error.oversizedDecks[0].id, 'alt');
  assert.ok(result.error.oversizedDecks[0].bytes > LIMITS.importBytes);
});

test('an import whose deck could not be exported again is refused as a whole', () => {
  const { store } = fillToDeckLimit('rand');
  // Die Datei lässt Hinweis und Exportdatum weg und bleibt so unter 2 MiB —
  // mit einer zusätzlichen Karte wäre das Deck als Export aber zu groß.
  const file = exportDecks(store, ['rand'], NOW) as Partial<ExchangeFile> & { decks: ExchangeFile['decks'] };
  delete file.hinweis;
  delete file.exportedAt;
  file.decks[0].cards.push({ id: 'rand-extra', term: 'extra', translation: 'zusätzlich', context: 'a'.repeat(60), tags: [] });
  const text = JSON.stringify(file);
  assert.ok(utf8Bytes(text) <= LIMITS.importBytes, 'the file itself is within the limit');

  const before = JSON.stringify(sampleStore());
  const preview = previewImport(text, sampleStore(), NOW);
  assert.equal(preview.ok, false);
  assert.equal(!preview.ok && preview.error.code, 'too_large');
  assert.match(!preview.ok ? preview.error.message : '', /ließe sich nicht wieder sichern/);
  assert.equal(JSON.stringify(sampleStore()), before);
});

// ---------------------------------------------------------------------------
// Work-Review W1-Rest: Der Import speichert die Herkunft als „import". Ein
// selbst erstelltes Deck wird dadurch als Export 2 Bytes größer. Kein Export
// darf gelingen, dessen Import anschließend scheitert.
// ---------------------------------------------------------------------------

const LIMIT = LIMITS.importBytes;

/** Gelingt der Export, muss auch der Import in einen leeren Bestand gelingen — und danach erneut Export und Import. */
function assertRoundtripOrRefusal(store: VocabStore, deckIds: string[] | null, label: string): 'exported' | 'refused' {
  const exported = prepareExport(store, deckIds, NOW);
  if (!exported.ok) {
    assert.ok(!('text' in exported.error), `${label}: keine Datei bei Ablehnung`);
    return 'refused';
  }
  const imported = previewImport(exported.value.text, emptyStore(), NOW);
  assert.equal(imported.ok, true, `${label}: Export gelang (${exported.value.bytes} Bytes), Import scheiterte: ${imported.ok ? '' : imported.error.message}`);
  if (!imported.ok) return 'exported';
  const inFresh: VocabStore = { ...emptyStore(), decks: imported.value.decks, cards: imported.value.cards };
  const again = must(prepareExport(inFresh, null, NOW));
  assert.equal(previewImport(again.text, emptyStore(), NOW).ok, true, `${label}: zweiter Roundtrip`);
  assert.deepEqual(imported.value.cards.map((entry) => entry.id), store.cards.filter((entry) => !deckIds || deckIds.includes(entry.deckId)).map((entry) => entry.id));
  return 'exported';
}

/** Gespeicherter Grenzbestand (ohne Operationen, z. B. aus einem älteren Stand): Deckname so gewählt, dass der Export genau `bytes` groß ist. */
function storedAtExportBytes(base: VocabStore, deckId: string, bytes: number, origin: DeckOrigin): VocabStore {
  const withOrigin: VocabStore = { ...base, decks: base.decks.map((deck) => (deck.id === deckId ? { ...deck, name: 'R', origin } : deck)) };
  const missing = bytes - deckExportBytes(withOrigin, deckId);
  assert.ok(missing >= 0 && missing < LIMITS.deckName, `Name um ${missing} Zeichen verlängerbar`);
  const store: VocabStore = {
    ...withOrigin,
    decks: withOrigin.decks.map((deck) => (deck.id === deckId ? { ...deck, name: `R${'a'.repeat(missing)}` } : deck)),
  };
  assert.equal(deckExportBytes(store, deckId), bytes);
  assert.equal(validateStore(store).ok, true);
  return store;
}

test('Work W1-Rest repro: only successful operations; 2 MiB −2/−1/0 never yields an export the import rejects', () => {
  const { store } = fillToDeckLimit('rand');
  const gap = LIMIT - deckExportBytes(store, 'rand');
  const baseName = store.decks[0].name;
  const outcomes: Record<number, string> = {};
  for (const offset of [-2, -1, 0]) {
    const renamed = updateDeck(store, 'rand', { name: baseName + 'a'.repeat(gap + offset), description: '' });
    if (!renamed.ok) {
      assert.equal(renamed.error.code, 'limit_deck_size');
      assert.match(renamed.error.message, /Byte über der Größengrenze/);
      outcomes[offset] = 'operation refused';
      continue;
    }
    assert.equal(deckExportBytes(renamed.value, 'rand'), LIMIT + offset);
    outcomes[offset] = assertRoundtripOrRefusal(renamed.value, ['rand'], `offset ${offset}`);
  }
  // „self" → „import" kostet 2 Bytes: Bis 2 MiB − 2 ist alles erlaubt und rundläuft, darüber lehnt schon die Änderung ab.
  assert.deepEqual(outcomes, { '-2': 'exported', '-1': 'operation refused', '0': 'operation refused' });
});

test('stored boundary states: the shared export path decides by the post-import size, for every origin', () => {
  const { store: filled } = fillToDeckLimit('grenze');
  const origins: [string, DeckOrigin, number][] = [
    // [Name, Herkunft, Änderung der Exportgröße durch den Import]
    ['self', { kind: 'self' }, +2],
    ['import', { kind: 'import', label: 'Selbst erstellt' }, 0],
    ['starter', { kind: 'starter', label: 'Selbst erstellt' }, -1],
  ];
  for (const [name, origin, growth] of origins) {
    for (const offset of [-2, -1, 0]) {
      const store = storedAtExportBytes(filled, 'grenze', LIMIT + offset, origin);
      assert.equal(deckRoundtripBytes(store, 'grenze'), LIMIT + offset + Math.max(growth, 0), `${name} ${offset}`);
      const before = JSON.stringify(store);
      const outcome = assertRoundtripOrRefusal(store, ['grenze'], `${name} ${offset}`);
      const expected = offset + growth <= 0 ? 'exported' : 'refused';
      assert.equal(outcome, expected, `${name} ${offset}`);
      if (outcome === 'refused') {
        const refusal = prepareExport(store, ['grenze'], NOW);
        assert.equal(!refusal.ok && refusal.error.reason, 'roundtrip', `${name} ${offset}: Datei passt, Roundtrip nicht`);
        assert.deepEqual(!refusal.ok && refusal.error.oversizedDecks.map((deck) => [deck.id, deck.bytes - LIMIT]), [['grenze', offset + growth]]);
        // Auch „Alle Decks exportieren" entscheidet so.
        assert.equal(prepareExport(store, null, NOW).ok, false);
      }
      assert.equal(JSON.stringify(store), before, 'eine Ablehnung verändert nichts');
    }
  }
});

test('an imported boundary deck stays exportable and importable again', () => {
  const { store: filled } = fillToDeckLimit('wieder');
  // Selbst erstellt, 2 MiB − 2: Nach dem Import ist es genau 2 MiB groß — und rundläuft weiter.
  const store = storedAtExportBytes(filled, 'wieder', LIMIT - 2, { kind: 'self' });
  const first = must(previewImport(must(prepareExport(store, ['wieder'], NOW)).text, emptyStore(), NOW));
  const imported: VocabStore = { ...emptyStore(), decks: first.decks, cards: first.cards };
  assert.equal(imported.decks[0].origin.kind, 'import');
  assert.equal(deckExportBytes(imported, 'wieder'), LIMIT);
  assert.equal(assertRoundtripOrRefusal(imported, ['wieder'], 'importiert an der Grenze'), 'exported');
  // Jede weitere Vergrößerung wird schon bei der Änderung abgelehnt.
  const bigger = updateDeck(imported, 'wieder', { name: `${imported.decks[0].name}a`, description: '' });
  assert.equal(!bigger.ok && bigger.error.code, 'limit_deck_size');
});
