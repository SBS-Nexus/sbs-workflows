import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchProgressViaHub, HUB_PROGRESS_PATH } from './fetch-progress.ts';

function antwort(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('fragt einmal den eigenen Hub, gleiche Herkunft, und verteilt je Quelle', async () => {
  const aufrufe: Array<{ url: string; init: RequestInit }> = [];
  const ergebnisse = await fetchProgressViaHub(['python', 'sql', 'ai'], async (url, init) => {
    aufrufe.push({ url, init });
    return antwort(200, {
      quellen: {
        python: { status: 200, body: { schemaVersion: 1, source: 'python' } },
        sql: { status: 401 },
        ai: { status: 503 },
      },
    });
  });
  assert.equal(aufrufe.length, 1);
  assert.equal(aufrufe[0]?.url, HUB_PROGRESS_PATH);
  assert.equal(aufrufe[0]?.init.credentials, 'same-origin');
  assert.equal(aufrufe[0]?.init.mode, 'same-origin');
  assert.deepEqual(ergebnisse, {
    abgemeldet: false,
    outcomes: [
      { source: 'python', status: 'ok', body: { schemaVersion: 1, source: 'python' } },
      { source: 'sql', status: 'unauthenticated' },
      { source: 'ai', status: 'unavailable' },
    ],
  });
});

test('Hub ohne Sitzung: abgemeldet, alle Quellen „nicht angemeldet“, nie „0 Fortschritt“', async () => {
  const ergebnisse = await fetchProgressViaHub(['python', 'ai'], async () =>
    antwort(401, { error: 'x' }),
  );
  assert.deepEqual(ergebnisse, {
    abgemeldet: true,
    outcomes: [
      { source: 'python', status: 'unauthenticated' },
      { source: 'ai', status: 'unauthenticated' },
    ],
  });
});

test('Fehler, fehlende Einträge und Netzprobleme gelten als nicht verfügbar', async () => {
  const nichtErreichbar = { abgemeldet: false, outcomes: [{ source: 'sql', status: 'unavailable' }] };
  assert.deepEqual(await fetchProgressViaHub(['sql'], async () => antwort(500)), nichtErreichbar);
  assert.deepEqual(
    await fetchProgressViaHub(['sql'], async () => antwort(200, { quellen: {} })),
    nichtErreichbar,
  );
  assert.deepEqual(
    await fetchProgressViaHub(['sql'], async () => {
      throw new Error('Netz');
    }),
    nichtErreichbar,
  );
});
