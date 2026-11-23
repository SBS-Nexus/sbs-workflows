import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REVIEW_FEDERATION_LIMITS,
  canonicalReviewKey,
  federateReviewSources,
  isoTimestamp,
  parseReviewSourceBatch,
  type FederatedSource,
  type SourceFetchOutcome,
} from './federation.ts';

const GENERATED = '2026-10-01T12:00:00.000Z';

type RawItem = Record<string, unknown>;

function exerciseItem(source: 'python' | 'ai', id: string, dueAt: string, extra: RawItem = {}): RawItem {
  return {
    source,
    sourceKind: 'exercise',
    sourceItemId: id,
    conceptIds: [`concept-${id}`],
    title: `Aufgabe ${id}`,
    prompt: `Frage zu ${id}`,
    answer: `Konzept hinter ${id}`,
    dueAt,
    repetition: 2,
    reason: 'Regulärer Wiederholungsplan',
    practice: { exerciseSlug: `slug-${id}`, exerciseTitle: `Aufgabe ${id}` },
    ...extra,
  };
}

function conceptItem(id: string, dueAt: string, extra: RawItem = {}): RawItem {
  return {
    source: 'sql',
    sourceKind: 'concept',
    sourceItemId: id,
    conceptIds: [id],
    title: `Konzept ${id}`,
    prompt: `Erkläre ${id}`,
    answer: `Beschreibung ${id}`,
    dueAt,
    practice: { exerciseSlug: `uebung-${id}`, exerciseTitle: `Übung ${id}` },
    ...extra,
  };
}

function batch(source: FederatedSource, items: RawItem[], extra: RawItem = {}): RawItem {
  return { schemaVersion: 1, source, generatedAt: GENERATED, items, truncated: false, ...extra };
}

function ok(source: FederatedSource, body: unknown): SourceFetchOutcome {
  return { source, status: 'ok', body };
}

// --- Kanonischer Vertrag ---------------------------------------------------

test('Python/AIPfad exercise identity survives normalization', () => {
  const parsed = parseReviewSourceBatch(
    batch('python', [exerciseItem('python', 'ex_1', '2026-10-01T09:00:00.000Z')]),
    'python',
  );
  const [item] = parsed.items;
  assert.equal(item?.sourceKind, 'exercise');
  assert.equal(item?.sourceItemId, 'ex_1');
  assert.equal(item?.key, 'python:exercise:ex_1');
  assert.equal(item?.repetition, 2);
  assert.equal(item?.reason, 'Regulärer Wiederholungsplan');

  const ai = parseReviewSourceBatch(
    batch('ai', [exerciseItem('ai', 'ex_9', '2026-10-01T09:00:00.000Z')]),
    'ai',
  );
  assert.equal(ai.items[0]?.key, 'ai:exercise:ex_9');
});

test('SQL concept identity survives normalization; the exercise stays presentation only', () => {
  const parsed = parseReviewSourceBatch(
    batch('sql', [conceptItem('concept-left-join', '2026-10-01T09:00:00.000Z')]),
    'sql',
  );
  const [item] = parsed.items;
  assert.equal(item?.sourceKind, 'concept');
  assert.equal(item?.sourceItemId, 'concept-left-join');
  assert.equal(item?.key, 'sql:concept:concept-left-join');
  assert.equal(item?.practice?.exerciseSlug, 'uebung-concept-left-join');
  assert.notEqual(item?.sourceItemId, item?.practice?.exerciseSlug);
});

test('SQL batches with exercise identity are rejected instead of being flattened', () => {
  const flattened = batch('sql', [
    { ...conceptItem('c1', '2026-10-01T09:00:00.000Z'), sourceKind: 'exercise' },
  ]);
  assert.throws(() => parseReviewSourceBatch(flattened, 'sql'), /sourceKind must be concept/);

  const conceptMissing = batch('sql', [
    conceptItem('c1', '2026-10-01T09:00:00.000Z', { conceptIds: ['other'] }),
  ]);
  assert.throws(() => parseReviewSourceBatch(conceptMissing, 'sql'), /concept identity/);
});

test('malformed timestamps are rejected', () => {
  for (const dueAt of [
    '2026-10-01',
    '2026-10-01T09:00:00+02:00',
    'gestern',
    '',
    '2026-13-01T00:00:00.000Z',
    '2026-02-30T00:00:00.000Z',
    1_759_000_000_000,
  ]) {
    assert.throws(
      () =>
        parseReviewSourceBatch(batch('python', [exerciseItem('python', 'x', dueAt as string)]), 'python'),
      /dueAt/,
      `dueAt ${String(dueAt)} must be rejected`,
    );
  }
  assert.throws(
    () => parseReviewSourceBatch(batch('python', [], { generatedAt: 'jetzt' }), 'python'),
    /generatedAt/,
  );
});

test('empty or missing required text is rejected', () => {
  for (const field of ['prompt', 'answer', 'title', 'sourceItemId']) {
    assert.throws(
      () =>
        parseReviewSourceBatch(
          batch('ai', [exerciseItem('ai', 'x', '2026-10-01T09:00:00.000Z', { [field]: '   ' })]),
          'ai',
        ),
      new RegExp(field),
    );
  }
  const missing = exerciseItem('ai', 'x', '2026-10-01T09:00:00.000Z');
  delete missing.prompt;
  assert.throws(() => parseReviewSourceBatch(batch('ai', [missing]), 'ai'), /prompt/);
});

test('ISO timestamps are serialized canonically (UTC, milliseconds)', () => {
  assert.equal(isoTimestamp('2026-10-01T09:00:00Z', 'x'), '2026-10-01T09:00:00.000Z');
  const parsed = parseReviewSourceBatch(
    batch('python', [exerciseItem('python', 'x', '2026-10-01T09:00:00Z')], {
      nextDueAt: '2026-10-02T09:00:00Z',
    }),
    'python',
  );
  assert.equal(parsed.items[0]?.dueAt, '2026-10-01T09:00:00.000Z');
  assert.equal(parsed.nextDueAt, '2026-10-02T09:00:00.000Z');
  assert.equal(parsed.generatedAt, GENERATED);
});

test('canonical namespace keys are stable and never collide across sources', () => {
  assert.equal(canonicalReviewKey('python', 'exercise', 'abc'), 'python:exercise:abc');
  assert.equal(canonicalReviewKey('sql', 'concept', 'abc'), 'sql:concept:abc');
  assert.equal(canonicalReviewKey('ai', 'exercise', 'abc'), 'ai:exercise:abc');

  const due = '2026-10-01T09:00:00.000Z';
  const result = federateReviewSources([
    ok('python', batch('python', [exerciseItem('python', 'abc', due)])),
    ok('sql', batch('sql', [conceptItem('abc', due)])),
    ok('ai', batch('ai', [exerciseItem('ai', 'abc', due)])),
  ]);
  const keys = result.items.map((item) => item.key);
  assert.deepEqual(keys, ['ai:exercise:abc', 'python:exercise:abc', 'sql:concept:abc']);
  assert.equal(new Set(keys).size, 3);
});

test('a source may not contradict its own batch or repeat an item', () => {
  assert.throws(
    () =>
      parseReviewSourceBatch(
        batch('python', [exerciseItem('ai', 'x', '2026-10-01T09:00:00.000Z')]),
        'python',
      ),
    /does not match/,
  );
  assert.throws(() => parseReviewSourceBatch(batch('sql', []), 'python'), /requested source/);
  assert.throws(
    () =>
      parseReviewSourceBatch(
        batch('python', [
          exerciseItem('python', 'dup', '2026-10-01T09:00:00.000Z'),
          exerciseItem('python', 'dup', '2026-10-01T10:00:00.000Z'),
        ]),
        'python',
      ),
    /duplicate/,
  );
  assert.throws(
    () => parseReviewSourceBatch(batch('python', [], { schemaVersion: 2 }), 'python'),
    /schemaVersion/,
  );
});

test('bounded limits: a source returning more than requested is rejected', () => {
  const tooMany = Array.from({ length: REVIEW_FEDERATION_LIMITS.perSource + 1 }, (_, i) =>
    exerciseItem('python', `ex_${i}`, '2026-10-01T09:00:00.000Z'),
  );
  assert.throws(() => parseReviewSourceBatch(batch('python', tooMany), 'python'), /more items/);
  assert.throws(
    () => federateReviewSources([], { perSource: 0, global: 10 }),
    RangeError,
  );
  assert.throws(
    () => federateReviewSources([], { perSource: 5, global: Number.POSITIVE_INFINITY }),
    RangeError,
  );
});

// --- Föderation ------------------------------------------------------------

test('oldest due first, with a stable tie-break on the canonical key', () => {
  const result = federateReviewSources([
    ok(
      'python',
      batch('python', [
        exerciseItem('python', 'b', '2026-10-01T09:00:00.000Z'),
        exerciseItem('python', 'late', '2026-10-01T11:00:00.000Z'),
      ]),
    ),
    ok('sql', batch('sql', [conceptItem('a', '2026-10-01T09:00:00.000Z')])),
    ok('ai', batch('ai', [exerciseItem('ai', 'early', '2026-09-30T09:00:00.000Z')])),
  ]);

  assert.deepEqual(
    result.items.map((item) => item.key),
    ['ai:exercise:early', 'python:exercise:b', 'sql:concept:a', 'python:exercise:late'],
  );

  // Dieselbe Eingabe in anderer Reihenfolge ergibt dieselbe Ausgabe.
  const reversed = federateReviewSources([
    ok('ai', batch('ai', [exerciseItem('ai', 'early', '2026-09-30T09:00:00.000Z')])),
    ok('sql', batch('sql', [conceptItem('a', '2026-10-01T09:00:00.000Z')])),
    ok(
      'python',
      batch('python', [
        exerciseItem('python', 'late', '2026-10-01T11:00:00.000Z'),
        exerciseItem('python', 'b', '2026-10-01T09:00:00.000Z'),
      ]),
    ),
  ]);
  assert.deepEqual(reversed.items, result.items);
});

test('global cap trims after sorting and reports truncation', () => {
  const python = Array.from({ length: 4 }, (_, i) =>
    exerciseItem('python', `p${i}`, `2026-10-0${i + 1}T09:00:00.000Z`),
  );
  const ai = Array.from({ length: 4 }, (_, i) =>
    exerciseItem('ai', `a${i}`, `2026-10-0${i + 1}T10:00:00.000Z`),
  );
  const result = federateReviewSources(
    [ok('python', batch('python', python)), ok('ai', batch('ai', ai))],
    { perSource: 4, global: 5 },
  );
  assert.equal(result.items.length, 5);
  assert.equal(result.truncated, true);
  assert.deepEqual(
    result.items.map((item) => item.key),
    ['python:exercise:p0', 'ai:exercise:a0', 'python:exercise:p1', 'ai:exercise:a1', 'python:exercise:p2'],
  );
  assert.equal(result.sources.python.itemCount, 4);
});

test('per-source cap: an oversized batch is isolated, the others stay usable', () => {
  const oversized = Array.from({ length: 3 }, (_, i) =>
    exerciseItem('python', `p${i}`, '2026-10-01T09:00:00.000Z'),
  );
  const result = federateReviewSources(
    [
      ok('python', batch('python', oversized)),
      ok('ai', batch('ai', [exerciseItem('ai', 'a', '2026-10-01T09:00:00.000Z')])),
    ],
    { perSource: 2, global: 10 },
  );
  assert.equal(result.sources.python.status, 'unavailable');
  assert.equal(result.sources.ai.status, 'ok');
  assert.deepEqual(result.items.map((item) => item.key), ['ai:exercise:a']);
});

test('one failing source preserves the others', () => {
  const result = federateReviewSources([
    ok('python', batch('python', [exerciseItem('python', 'p', '2026-10-01T09:00:00.000Z')])),
    { source: 'sql', status: 'unavailable' },
    ok('ai', batch('ai', [exerciseItem('ai', 'a', '2026-10-01T10:00:00.000Z')])),
  ]);
  assert.equal(result.sources.sql.status, 'unavailable');
  assert.equal(result.sources.python.status, 'ok');
  assert.equal(result.sources.ai.status, 'ok');
  assert.deepEqual(result.items.map((item) => item.key), ['python:exercise:p', 'ai:exercise:a']);
});

test('a malformed batch is rejected and isolated without leaking internals', () => {
  const result = federateReviewSources([
    ok('sql', { schemaVersion: 1, source: 'sql', items: 'kaputt', stack: 'Error: secret at db.ts:1' }),
    ok('python', batch('python', [exerciseItem('python', 'p', '2026-10-01T09:00:00.000Z')])),
  ]);
  assert.deepEqual(result.sources.sql, { status: 'unavailable', itemCount: 0, truncated: false });
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(result.items.length, 1);
});

test('authentication failure is reported as such, never downgraded to an empty ok', () => {
  const result = federateReviewSources([
    { source: 'python', status: 'unauthenticated' },
    ok('ai', batch('ai', [])),
  ]);
  assert.equal(result.sources.python.status, 'unauthenticated');
  assert.equal(result.sources.ai.status, 'ok');
  assert.equal(result.sources.sql.status, 'not_configured');
});

test('source status exposes counts, truncation and next due date only', () => {
  const result = federateReviewSources([
    ok(
      'sql',
      batch('sql', [conceptItem('c', '2026-10-01T09:00:00.000Z')], {
        truncated: true,
        nextDueAt: '2026-10-05T08:00:00.000Z',
      }),
    ),
  ]);
  assert.deepEqual(result.sources.sql, {
    status: 'ok',
    itemCount: 1,
    truncated: true,
    nextDueAt: '2026-10-05T08:00:00.000Z',
  });
});

test('a programming error is not hidden as a source outage', () => {
  assert.throws(
    () =>
      federateReviewSources([
        { source: 'python', status: 'unavailable' },
        { source: 'python', status: 'unavailable' },
      ]),
    /duplicate outcome/,
  );
});
