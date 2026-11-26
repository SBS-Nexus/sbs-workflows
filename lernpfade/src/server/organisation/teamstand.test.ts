import assert from 'node:assert/strict';
import test from 'node:test';
import { frageTeamQuelleAb } from './teamstand.ts';

const MITGLIEDER = [
  { sub: 'a', benannt: true },
  { sub: 'b', benannt: false },
];

const antwort = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const GUELTIG = {
  schemaVersion: 1,
  source: 'sql',
  generatedAt: '2026-11-26T12:00:00.000Z',
  angefragt: 2,
  bekannt: 1,
  summen: null,
  benannt: [{ sub: 'a', lektionen: { completed: 1, total: 5 }, wiederholungenFaellig: 0, letzteAktivitaet: null }],
};

test('ohne Adresse wird nicht gefragt', async () => {
  let gefragt = false;
  const stand = await frageTeamQuelleAb('sql', null, 't', MITGLIEDER, async () => {
    gefragt = true;
    return antwort(200, GUELTIG);
  });
  assert.deepEqual(stand, { status: 'nicht-eingerichtet' });
  assert.equal(gefragt, false);
});

test('POST mit Diensttoken und genau den Mitgliedern; gültige Antwort wird übernommen', async () => {
  let gesendet: { url: string; init: RequestInit } | null = null;
  const stand = await frageTeamQuelleAb('sql', 'https://www.sqlpfad.de', 'dienst-token', MITGLIEDER, async (url, init) => {
    gesendet = { url, init };
    return antwort(200, GUELTIG);
  });
  assert.equal(stand.status, 'ok');
  assert.equal(gesendet!.url, 'https://www.sqlpfad.de/api/platform/team-source');
  assert.equal(gesendet!.init.method, 'POST');
  assert.equal(gesendet!.init.redirect, 'error');
  assert.equal((gesendet!.init.headers as Record<string, string>).authorization, 'Bearer dienst-token');
  assert.deepEqual(JSON.parse(String(gesendet!.init.body)), { schemaVersion: 1, mitglieder: MITGLIEDER });
});

test('Fehler der App, Vertragsbruch und Netzprobleme zeigen nichts an', async () => {
  const frage = (impl: () => Promise<Response>) =>
    frageTeamQuelleAb('sql', 'https://www.sqlpfad.de', 't', MITGLIEDER, impl);
  assert.deepEqual(await frage(async () => antwort(401, { error: 'unauthenticated' })), { status: 'nicht-erreichbar' });
  // Einzelwerte für eine Person ohne Einwilligung: die ganze Antwort fällt weg.
  assert.deepEqual(
    await frage(async () => antwort(200, { ...GUELTIG, benannt: [{ ...GUELTIG.benannt[0], sub: 'b' }] })),
    { status: 'ungueltig' },
  );
  assert.deepEqual(
    await frage(async () => {
      throw new TypeError('fetch failed');
    }),
    { status: 'nicht-erreichbar' },
  );
});
