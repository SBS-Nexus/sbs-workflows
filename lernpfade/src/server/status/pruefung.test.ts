import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { gesamt, type Dienst } from '../../domain/status/status.ts';
import { httpPruefung, leereZwischenspeicher, pruefeAlle, statusbericht, type Pruefung } from './pruefung.ts';

const p = (id: string, kritisch: boolean, pruefe: Pruefung['pruefe']): Pruefung => ({ id, name: id, kritisch, pruefe });

beforeEach(() => leereZwischenspeicher());

test('Gesamtstatus: kritischer Ausfall ist Störung, eine App allein schränkt nur ein', () => {
  const d = (id: string, kritisch: boolean, status: Dienst['status']): Dienst => ({ id, name: id, kritisch, status, ms: 1 });
  assert.equal(gesamt([d('konto', true, 'betrieb'), d('ai', false, 'betrieb')]), 'betrieb');
  assert.equal(gesamt([d('konto', true, 'betrieb'), d('ai', false, 'stoerung')]), 'eingeschraenkt');
  assert.equal(gesamt([d('konto', true, 'langsam'), d('ai', false, 'betrieb')]), 'eingeschraenkt');
  assert.equal(gesamt([d('konto', true, 'stoerung'), d('ai', false, 'betrieb')]), 'stoerung');
});

test('jede Prüfung für sich: Fehler, falsch und Frist werden Störung, die übrigen bleiben', async () => {
  const bericht = await pruefeAlle(
    [
      p('gut', true, async () => true),
      p('falsch', false, async () => false),
      p('wirft', false, async () => {
        throw new Error('intern: postgres://geheim');
      }),
      p('haengt', false, (signal) => new Promise((_, ab) => signal.addEventListener('abort', () => ab(new Error('frist'))))),
    ],
    Date.now,
    50,
  );
  assert.deepEqual(
    bericht.dienste.map((d) => [d.id, d.status]),
    [
      ['gut', 'betrieb'],
      ['falsch', 'stoerung'],
      ['wirft', 'stoerung'],
      ['haengt', 'stoerung'],
    ],
  );
  assert.equal(bericht.gesamt, 'eingeschraenkt');
  assert.equal(JSON.stringify(bericht).includes('geheim'), false);
  assert.equal(bericht.dienste[1]?.ms, null);
});

test('langsam ab zwei Sekunden', async () => {
  let t = 0;
  const bericht = await pruefeAlle(
    [
      p('langsam', false, async () => {
        t += 2500;
        return true;
      }),
    ],
    () => t,
  );
  assert.equal(bericht.dienste[0]?.status, 'langsam');
  assert.equal(bericht.dienste[0]?.ms, 2500);
});

test('HTTP-Prüfung: nur 2xx, ohne Weiterleitung', async () => {
  let init: RequestInit | undefined;
  const ok = httpPruefung('x', 'X', false, 'https://x.example/api/ready', async (_a, i) => {
    init = i;
    return new Response('{}', { status: 200 });
  });
  assert.equal(await ok.pruefe(new AbortController().signal), true);
  assert.equal(init?.redirect, 'error');
  const kaputt = httpPruefung('x', 'X', false, 'https://x.example', async () => new Response('', { status: 503 }));
  assert.equal(await kaputt.pruefe(new AbortController().signal), false);
});

test('Zwischenspeicher: höchstens alle 30 Sekunden eine echte Prüfung', async () => {
  let aufrufe = 0;
  let t = 1_000_000;
  const liste = () => [
    p('a', true, async () => {
      aufrufe += 1;
      return true;
    }),
  ];
  await statusbericht(liste, () => t);
  t += 10_000;
  await statusbericht(liste, () => t);
  assert.equal(aufrufe, 1);
  t += 25_000;
  await statusbericht(liste, () => t);
  assert.equal(aufrufe, 2);
});
