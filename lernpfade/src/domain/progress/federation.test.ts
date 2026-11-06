import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStore } from '../vocabulary/model.ts';
import { NOW, sampleStore } from '../vocabulary/testing.ts';
import type { ProgressSource } from './contract.ts';
import {
  PROGRESS_SOURCE_PATH,
  fetchProgressSource,
  parseProgressSources,
  progressSourceUrl,
  type ProgressFetchOutcome,
} from './fetch-progress.ts';
import {
  backlogTotal,
  initialSourceStates,
  resolveSourceOutcome,
  summarizeVocabulary,
  type SourceState,
  type VocabularyState,
} from './federation.ts';
import { progressBody } from './testing.ts';

type Call = { url: string; init: RequestInit };

function fakeFetch(response: Response | Error | 'hang', calls: Call[] = []) {
  return async (url: string, init: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    if (response === 'hang') {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }
    if (response instanceof Error) throw response;
    return response;
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const PYTHON = { source: 'python' as const, baseUrl: 'https://python.lernpfade.example' };

// --- Abruf ------------------------------------------------------------------

test('requests only the parameterless GET endpoint with the source session', async () => {
  const calls: Call[] = [];
  const outcome = await fetchProgressSource(PYTHON, fakeFetch(json(progressBody('python')), calls));
  assert.equal(outcome.status, 'ok');
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.equal(call?.url, `https://python.lernpfade.example${PROGRESS_SOURCE_PATH}`);
  assert.equal(new URL(call?.url ?? '').search, '', 'no query parameter, never a userId');
  assert.equal(call?.init.method, 'GET');
  assert.equal(call?.init.credentials, 'include');
  assert.equal(call?.init.cache, 'no-store');
  assert.equal(call?.init.redirect, 'error');
  assert.equal(call?.init.body, undefined);
  assert.equal(progressSourceUrl('https://sql.example'), 'https://sql.example/api/platform/progress-source');
});

test('401 is "not signed in", never zero progress', async () => {
  assert.deepEqual(await fetchProgressSource(PYTHON, fakeFetch(json({ error: 'unauthenticated' }, 401))), {
    source: 'python',
    status: 'unauthenticated',
  });
});

test('500, other statuses, non-JSON, invalid JSON and network errors are unavailable', async () => {
  for (const response of [
    json({ error: 'unavailable', stack: 'geheim' }, 500),
    json({}, 403),
    json({}, 302),
    new Response('<html>Anmelden</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    new Response('{kaputt', { status: 200, headers: { 'content-type': 'application/json' } }),
    new TypeError('Failed to fetch'),
  ]) {
    assert.deepEqual(await fetchProgressSource(PYTHON, fakeFetch(response)), { source: 'python', status: 'unavailable' });
  }
});

test('a hanging source times out on its own', async () => {
  const started = Date.now();
  assert.deepEqual(await fetchProgressSource(PYTHON, fakeFetch('hang'), 30), { source: 'python', status: 'unavailable' });
  assert.ok(Date.now() - started < 2000);
});

test('missing or unsafe base URLs are "not configured" and nothing is requested', async () => {
  for (const baseUrl of [null, '', 'javascript:alert(1)', 'https://user:pw@python.example', 'https://python.example/pfad']) {
    const calls: Call[] = [];
    assert.deepEqual(await fetchProgressSource({ source: 'python', baseUrl }, fakeFetch(json({}), calls)), {
      source: 'python',
      status: 'not_configured',
    });
    assert.equal(calls.length, 0);
  }
});

test('progress sources are an explicit opt-in, separate from review federation', () => {
  assert.deepEqual(parseProgressSources(undefined), []);
  assert.deepEqual(parseProgressSources(''), []);
  assert.deepEqual(parseProgressSources('ai, PYTHON,unknown,python'), ['python', 'ai']);
});

// --- Zustand je Quelle --------------------------------------------------------

function ok(source: ProgressSource, overrides: Record<string, unknown> = {}): ProgressFetchOutcome {
  return { source, status: 'ok', body: progressBody(source, overrides) };
}

test('invalid schema, wrong source or unknown version make only that source unavailable', () => {
  assert.equal(resolveSourceOutcome(ok('python')).status, 'ok');
  assert.deepEqual(resolveSourceOutcome({ source: 'sql', status: 'ok', body: progressBody('python') }), {
    status: 'unavailable',
  });
  assert.deepEqual(resolveSourceOutcome(ok('ai', { schemaVersion: 2 })), { status: 'unavailable' });
  assert.deepEqual(resolveSourceOutcome(ok('ai', { extra: true })), { status: 'unavailable' });
  assert.deepEqual(resolveSourceOutcome({ source: 'sql', status: 'ok', body: 'kein Objekt' }), { status: 'unavailable' });
  for (const status of ['unauthenticated', 'unavailable', 'not_configured'] as const) {
    assert.deepEqual(resolveSourceOutcome({ source: 'python', status }), { status });
  }
});

test('only enabled sources load; the rest are not configured', () => {
  assert.deepEqual(initialSourceStates(['sql']), {
    python: { status: 'not_configured' },
    sql: { status: 'loading' },
    ai: { status: 'not_configured' },
  });
});

// --- VokabelPfad lokal ----------------------------------------------------------

test('vocabulary: filled and empty stores use the existing statistics; damaged data stays an error', () => {
  const filled = summarizeVocabulary({ status: 'ok', store: sampleStore() }, NOW, 'Europe/Berlin');
  assert.deepEqual(filled, {
    status: 'ok',
    summary: { decks: 1, cards: 3, dueEnDe: 3, dueDeEn: 3, ratedToday: 0 },
  });
  assert.deepEqual(summarizeVocabulary({ status: 'empty', store: emptyStore() }, NOW), {
    status: 'ok',
    summary: { decks: 0, cards: 0, dueEnDe: 0, dueDeEn: 0, ratedToday: 0 },
  });
  assert.deepEqual(summarizeVocabulary({ status: 'corrupt', raw: '{', detail: 'x' }, NOW), {
    status: 'error',
    reason: 'corrupt',
  });
  assert.deepEqual(summarizeVocabulary({ status: 'future', raw: '{}', version: 2 }, NOW), {
    status: 'error',
    reason: 'future',
  });
  assert.deepEqual(summarizeVocabulary({ status: 'unavailable' }, NOW), { status: 'error', reason: 'unavailable' });
});

// --- Fällig insgesamt -----------------------------------------------------------

function states(entries: Partial<Record<ProgressSource, SourceState>>): Record<ProgressSource, SourceState> {
  return { python: { status: 'not_configured' }, sql: { status: 'not_configured' }, ai: { status: 'not_configured' }, ...entries };
}

const VOCAB: VocabularyState = {
  status: 'ok',
  summary: { decks: 1, cards: 3, dueEnDe: 2, dueDeEn: 1, ratedToday: 0 },
};

test('all three sources ok: a complete total with its parts in a fixed order', () => {
  const all = states({
    ai: resolveSourceOutcome(ok('ai', { reviews: { due: 5 } })),
    python: resolveSourceOutcome(ok('python', { reviews: { due: 4 } })),
    sql: resolveSourceOutcome(ok('sql', { reviews: { due: 0 } })),
  });
  assert.deepEqual(backlogTotal(all, VOCAB), {
    status: 'complete',
    due: 12,
    parts: [
      { key: 'python', due: 4 },
      { key: 'sql', due: 0 },
      { key: 'ai', due: 5 },
      { key: 'vocabulary', due: 3 },
    ],
  });
});

test('partial success never shows a seemingly complete total', () => {
  for (const failed of ['unauthenticated', 'unavailable'] as const) {
    const partial = states({
      python: resolveSourceOutcome(ok('python')),
      sql: { status: failed },
      ai: resolveSourceOutcome(ok('ai')),
    });
    assert.deepEqual(backlogTotal(partial, VOCAB), { status: 'incomplete', missing: ['sql'] });
  }
  // Unlesbare lokale Vokabeln fehlen ebenso.
  assert.deepEqual(
    backlogTotal(states({ python: resolveSourceOutcome(ok('python')) }), { status: 'error', reason: 'corrupt' }),
    { status: 'incomplete', missing: ['vocabulary'] },
  );
  // Solange etwas lädt, gibt es noch keine Zahl.
  assert.deepEqual(backlogTotal(states({ python: { status: 'loading' } }), VOCAB), { status: 'pending' });
  assert.deepEqual(backlogTotal(states({}), { status: 'loading' }), { status: 'pending' });
});

test('not configured sources are not part of the total', () => {
  assert.deepEqual(backlogTotal(states({}), VOCAB), {
    status: 'complete',
    due: 3,
    parts: [{ key: 'vocabulary', due: 3 }],
  });
});

test('the result does not depend on the order in which responses arrive', () => {
  const outcomes: ProgressFetchOutcome[] = [ok('python'), { source: 'sql', status: 'unauthenticated' }, ok('ai')];
  const fromOrder = (order: ProgressFetchOutcome[]) => {
    const result = initialSourceStates(['python', 'sql', 'ai']);
    for (const outcome of order) result[outcome.source] = resolveSourceOutcome(outcome);
    return { states: result, total: backlogTotal(result, VOCAB) };
  };
  const forward = fromOrder(outcomes);
  assert.deepEqual(fromOrder([...outcomes].reverse()), forward);
  assert.deepEqual(fromOrder([outcomes[1]!, outcomes[2]!, outcomes[0]!]), forward);
});
