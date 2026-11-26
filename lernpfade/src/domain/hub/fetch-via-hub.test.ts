import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchReviewViaHub, HUB_REVIEW_PATH } from '../review/fetch-source.ts';
import { fetchSourcesViaHub } from './fetch-via-hub.ts';

function antwort(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('/wiederholen fragt einmal den eigenen Hub, gleiche Herkunft, ohne Weiterleitung', async () => {
  const aufrufe: Array<{ url: string; init: RequestInit }> = [];
  const ergebnis = await fetchReviewViaHub(['python', 'sql', 'ai'], async (url, init) => {
    aufrufe.push({ url, init });
    return antwort(200, {
      quellen: {
        python: { status: 200, body: { schemaVersion: 1, source: 'python', items: [] } },
        sql: { status: 401 },
        ai: { status: 404 },
      },
    });
  });
  assert.equal(aufrufe.length, 1);
  assert.equal(aufrufe[0]?.url, HUB_REVIEW_PATH);
  assert.equal(aufrufe[0]?.init.credentials, 'same-origin');
  assert.equal(aufrufe[0]?.init.mode, 'same-origin');
  assert.equal(aufrufe[0]?.init.redirect, 'error');
  assert.deepEqual(ergebnis, {
    abgemeldet: false,
    outcomes: [
      { source: 'python', status: 'ok', body: { schemaVersion: 1, source: 'python', items: [] } },
      { source: 'sql', status: 'unauthenticated' },
      // Nicht konfiguriert beim Hub (404) ist für die Seite „nicht erreichbar“, nie „nichts fällig“.
      { source: 'ai', status: 'unavailable' },
    ],
  });
});

test('Hub ohne Sitzung: abgemeldet statt „App kennt dich nicht“', async () => {
  const ergebnis = await fetchSourcesViaHub('/api/hub/x', ['a', 'b'], async () => antwort(401), 1000);
  assert.equal(ergebnis.abgemeldet, true);
  assert.deepEqual(
    ergebnis.outcomes.map((o) => o.status),
    ['unauthenticated', 'unauthenticated'],
  );
});

test('Fehler des Hubs, kaputte Antwort und Zeitüberschreitung: nicht erreichbar, nicht abgemeldet', async () => {
  const nichtErreichbar = { abgemeldet: false, outcomes: [{ source: 'a', status: 'unavailable' }] };
  assert.deepEqual(
    await fetchSourcesViaHub('/x', ['a'], async () => antwort(502), 1000),
    nichtErreichbar,
  );
  assert.deepEqual(
    await fetchSourcesViaHub(
      '/x',
      ['a'],
      async () => new Response('kein json', { status: 200 }),
      1000,
    ),
    nichtErreichbar,
  );
  assert.deepEqual(
    await fetchSourcesViaHub(
      '/x',
      ['a'],
      (_url, init) =>
        new Promise((_, ablehnen) =>
          init.signal?.addEventListener('abort', () => ablehnen(new Error('abgebrochen'))),
        ),
      30,
    ),
    nichtErreichbar,
  );
});

test('200 ohne Antwortkörper zählt nicht als Erfolg', async () => {
  const ergebnis = await fetchSourcesViaHub(
    '/x',
    ['a'],
    async () => antwort(200, { quellen: { a: { status: 200 } } }),
    1000,
  );
  assert.deepEqual(ergebnis.outcomes, [{ source: 'a', status: 'unavailable' }]);
});
