import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REVIEW_SOURCE_PATH,
  fetchReviewSource,
  normalizeSourceBaseUrl,
  parseEnabledSources,
  reviewSourceUrl,
} from './fetch-source.ts';

type Call = { url: string; init: RequestInit };

function fakeFetch(response: Response | Error, calls: Call[] = []) {
  return async (url: string, init: RequestInit): Promise<Response> => {
    calls.push({ url, init });
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

test('requests only the narrow GET endpoint with the source session and a bounded limit', async () => {
  const calls: Call[] = [];
  const outcome = await fetchReviewSource(PYTHON, 10, fakeFetch(json({ ok: true }), calls));

  assert.equal(outcome.status, 'ok');
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.equal(call?.url, `https://python.lernpfade.example${REVIEW_SOURCE_PATH}?limit=10`);
  assert.equal(call?.init.method, 'GET');
  assert.equal(call?.init.credentials, 'include');
  assert.equal(call?.init.cache, 'no-store');
  assert.equal(call?.init.redirect, 'error');
  // Der Hub schickt nie eine Nutzerkennung mit.
  assert.equal(call?.url.includes('userId'), false);
  assert.equal(call?.init.body, undefined);
});

test('maps 401 to unauthenticated instead of an empty list', async () => {
  const outcome = await fetchReviewSource(PYTHON, 10, fakeFetch(json({ error: 'unauthenticated' }, 401)));
  assert.deepEqual(outcome, { source: 'python', status: 'unauthenticated' });
});

test('maps errors, timeouts, non-JSON and network failures to unavailable without details', async () => {
  for (const response of [
    json({ error: 'unavailable', stack: 'secret' }, 500),
    json({}, 403),
    new Response('<html>Anmelden</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    new TypeError('Failed to fetch'),
  ]) {
    const outcome = await fetchReviewSource(PYTHON, 10, fakeFetch(response));
    assert.deepEqual(outcome, { source: 'python', status: 'unavailable' });
  }

  const hanging = (_url: string, init: RequestInit): Promise<Response> =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });
  const timedOut = await fetchReviewSource(PYTHON, 10, hanging, 10);
  assert.deepEqual(timedOut, { source: 'python', status: 'unavailable' });
});

test('an unconfigured or unsafe base URL is not contacted at all', async () => {
  const calls: Call[] = [];
  for (const baseUrl of [
    null,
    '',
    'javascript:alert(1)',
    'https://user:pass@python.example',
    'https://python.example/pfad',
    'https://python.example/?userId=fremd',
    'ftp://python.example',
  ]) {
    const outcome = await fetchReviewSource({ source: 'sql', baseUrl }, 10, fakeFetch(json({}), calls));
    assert.deepEqual(outcome, { source: 'sql', status: 'not_configured' });
  }
  assert.equal(calls.length, 0);
});

test('base URLs are normalized to an origin and limits must be positive integers', () => {
  assert.equal(normalizeSourceBaseUrl('https://sql.example/'), 'https://sql.example');
  assert.equal(normalizeSourceBaseUrl('http://localhost:3001'), 'http://localhost:3001');
  assert.throws(() => reviewSourceUrl('https://sql.example', 0), RangeError);
  assert.throws(() => reviewSourceUrl('https://sql.example', 2.5), RangeError);
});

test('live sources are opt-in and limited to the known sources', () => {
  assert.deepEqual(parseEnabledSources(undefined), []);
  assert.deepEqual(parseEnabledSources(''), []);
  assert.deepEqual(parseEnabledSources(' AI , python,unbekannt,python '), ['python', 'ai']);
  assert.deepEqual(parseEnabledSources('git,language'), []);
});
