import assert from 'node:assert/strict';
import test from 'node:test';
import { frageQuellenAb, quellenProtokoll } from './quellen.ts';

function antwort(status: number, body?: unknown, typ = 'application/json'): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': typ },
  });
}

test('fragt jede konfigurierte Quelle mit dem Token des Hubs, ohne Weiterleitung', async () => {
  const aufrufe: Array<{ url: string; init: RequestInit }> = [];
  const ergebnis = await frageQuellenAb(
    [
      { quelle: 'python', adresse: 'https://www.pythonpfad.de/api/platform/review-source?limit=10' },
      { quelle: 'ai', adresse: 'https://www.aipfad.de/api/platform/review-source?limit=10' },
    ],
    'token-123',
    async (url, init) => {
      aufrufe.push({ url, init });
      return antwort(200, { schemaVersion: 1 });
    },
    1000,
  );
  assert.equal(aufrufe.length, 2);
  for (const { init } of aufrufe) {
    assert.deepEqual(init.headers, { authorization: 'Bearer token-123', accept: 'application/json' });
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    // Kein Cookie, keine Zugangsdaten des Browsers: nur das Token.
    assert.equal(init.credentials, undefined);
  }
  assert.deepEqual(ergebnis, {
    python: { status: 200, body: { schemaVersion: 1 } },
    ai: { status: 200, body: { schemaVersion: 1 } },
  });
});

test('ohne Adresse wird nicht gefragt; 401 bleibt 401, alles andere ist 503', async () => {
  const gefragt: string[] = [];
  const ergebnis = await frageQuellenAb(
    [
      { quelle: 'python', adresse: null },
      { quelle: 'sql', adresse: 'https://sql.example/q' },
      { quelle: 'ai', adresse: 'https://ai.example/q' },
      { quelle: 'html', adresse: 'https://html.example/q' },
      { quelle: 'netz', adresse: 'https://netz.example/q' },
    ],
    't',
    async (url) => {
      gefragt.push(url);
      if (url.startsWith('https://sql.')) return antwort(401, { error: 'unauthenticated' });
      if (url.startsWith('https://ai.')) return antwort(500, { error: 'intern' });
      if (url.startsWith('https://html.')) return antwort(200, '<html>', 'text/html');
      throw new TypeError('fetch failed');
    },
    1000,
  );
  assert.equal(gefragt.length, 4);
  assert.deepEqual(ergebnis, {
    python: { status: 404 },
    sql: { status: 401 },
    ai: { status: 503 },
    html: { status: 503 },
    netz: { status: 503 },
  });
});

test('eine hängende Quelle endet nach der Frist, die anderen antworten', async () => {
  const ergebnis = await frageQuellenAb(
    [
      { quelle: 'langsam', adresse: 'https://langsam.example/q' },
      { quelle: 'schnell', adresse: 'https://schnell.example/q' },
    ],
    't',
    (url, init) =>
      url.startsWith('https://langsam.')
        ? new Promise((_, ablehnen) =>
            init.signal?.addEventListener('abort', () => ablehnen(new Error('abgebrochen'))),
          )
        : Promise.resolve(antwort(200, { ok: true })),
    50,
  );
  assert.deepEqual(ergebnis, {
    langsam: { status: 503 },
    schnell: { status: 200, body: { ok: true } },
  });
});

test('das Protokoll enthält nur Status je Quelle, keine Inhalte', () => {
  const felder = quellenProtokoll({
    python: { status: 200, body: { geheim: 'Ada' } },
    sql: { status: 401 },
  });
  assert.deepEqual(felder, { python: 200, sql: 401 });
  assert.equal(JSON.stringify(felder).includes('Ada'), false);
});
