import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bereinige,
  bereinigeDatei,
  bereinigePfad,
  erzeugeDrossel,
  erzeugeFehlerbericht,
  ereignisAus,
  pruefeBrowserbericht,
  rahmenAus,
  umschlagAus,
  zielAus,
  type Abhaengigkeiten,
} from './fehlerbericht.ts';

/**
 * E6.3 — Tests des Fehlerberichts. Läuft im Drift-Check
 * (`node --experimental-strip-types --test docs/learning-fehlerbericht/*.test.ts`);
 * die Kopien in Hub und Apps sind bytegleich.
 */

const DSN =
  'https://0123456789abcdef0123456789abcdef@o4500000000000001.ingest.de.sentry.io/4500000000000002';

test('Bereinigung: E-Mail, Token, Kennungen, IP, Abfragen und zitierte Eingaben fallen weg', () => {
  const roh =
    'Kein Konto für ada@beispiel.de (sub 312345678901234567, Sitzung a1b2c3d4e5f6a7b8c9d0e1f2) ' +
    'von 192.168.1.20 und 2001:db8::1, Token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc_DEF-ghi, ' +
    'Adresse https://www.lernpfade.net/einladung/x?token=geheim&a=1, ' +
    'Name "Ada Lovelace", Feld \'map\', ID 0f8fad5b-d9cb-469f-a165-70867728950e, ' +
    'Datenbank postgres://nutzer:passwort@db:5432/lernpfade';
  const sauber = bereinige(roh);
  for (const verboten of [
    'ada@beispiel.de',
    '312345678901234567',
    'a1b2c3d4e5f6a7b8c9d0e1f2',
    '192.168.1.20',
    '2001:db8::1',
    'eyJ',
    'token=geheim',
    'Ada Lovelace',
    '0f8fad5b',
    'nutzer:passwort',
  ]) {
    assert.equal(sauber.includes(verboten), false, `${verboten} steht noch drin: ${sauber}`);
  }
  assert.match(sauber, /\[E-Mail\]/);
  assert.match(sauber, /'map'/, 'kurze Bezeichner bleiben lesbar');
  assert.match(
    sauber,
    /https:\/\/www\.lernpfade\.net\/einladung\/x Name/,
    'Abfrage bis zum Leerzeichen entfernt',
  );
  assert.equal(
    bereinige('um 12:30:45 Uhr'),
    'um 12:30:45 Uhr',
    'Uhrzeiten sind keine IPv6-Adressen',
  );
});

test('Bereinigung kürzt lange Meldungen', () => {
  const sauber = bereinige('x'.repeat(2000));
  assert.equal(sauber.length, 500);
  assert.ok(sauber.endsWith('…'));
});

test('Pfade aus dem Browser: ohne Abfrage, Kennungen werden :id', () => {
  assert.equal(bereinigePfad('/einladung/Q2hhbmdlTWVQbGVhc2VUb2tlbjEyMw?x=1'), '/einladung/:id');
  assert.equal(
    bereinigePfad('/organisation/sbs/teams/cm9x2k3l40000'),
    '/organisation/sbs/teams/:id',
  );
  assert.equal(bereinigePfad('/lernen/python-grundlagen'), '/lernen/python-grundlagen');
  assert.equal(bereinigePfad('https://boese.example/x'), '/');
  assert.equal(bereinigePfad('/a/b%20c'), '/a/:id');
});

test('Dateien im Stapel: ohne Herkunft, Abfrage und lokale Verzeichnisse', () => {
  assert.equal(
    bereinigeDatei('https://www.aipfad.de/_next/static/chunks/0a1b.js?dpl=abc'),
    '/_next/static/chunks/0a1b.js',
  );
  assert.equal(
    bereinigeDatei('file:///app/lernpfade/.next/server/chunks/ssr/[root]_seite.js'),
    '.next/server/chunks/ssr/[root]_seite.js',
  );
  assert.equal(bereinigeDatei('/Users/ada/projekt/datei.js'), 'projekt/datei.js');
  assert.equal(bereinigeDatei('webpack-internal:///(rsc)/./src/app/page.tsx'), 'src/app/page.tsx');
});

test('Stapel: V8 und Firefox, ältester Rahmen zuerst, node_modules nicht in_app', () => {
  const v8 = [
    'TypeError: x is undefined',
    '    at zeige (/app/.next/server/chunks/ssr/seite.js:10:5)',
    '    at async Promise.all (index 0)',
    '    at async lade (/app/node_modules/next/dist/server/x.js:20:7)',
    '    at /app/.next/server/app.js:1:2',
  ].join('\n');
  const rahmen = rahmenAus(v8);
  assert.deepEqual(
    rahmen.map((r) => [r.filename, r.function, r.lineno, r.in_app]),
    [
      ['.next/server/app.js', undefined, 1, true],
      ['node_modules/next/dist/server/x.js', 'lade', 20, false],
      ['.next/server/chunks/ssr/seite.js', 'zeige', 10, true],
    ],
  );
  const gecko = rahmenAus(
    'zeige@https://www.sqlpfad.de/_next/static/chunks/a.js:3:9\n@https://www.sqlpfad.de/b.js:1:1',
  );
  assert.deepEqual(
    gecko.map((r) => [r.filename, r.function, r.colno]),
    [
      ['/b.js', undefined, 1],
      ['/_next/static/chunks/a.js', 'zeige', 9],
    ],
  );
  assert.equal(rahmenAus('x\n'.repeat(500)).length, 0);
});

test('Ziel nur in der EU und nur mit gültigem Schlüssel', () => {
  assert.deepEqual(zielAus(DSN), {
    adresse: 'https://o4500000000000001.ingest.de.sentry.io/api/4500000000000002/envelope/',
    schluessel: '0123456789abcdef0123456789abcdef',
  });
  assert.equal(zielAus(DSN.replace('.de.', '.us.')), null);
  assert.equal(zielAus(DSN.replace('ingest.de.sentry.io', 'ingest.sentry.io')), null);
  assert.equal(zielAus(DSN.replace('https:', 'http:')), null);
  assert.equal(zielAus(DSN.replace('@', ':geheim@')), null);
  assert.equal(zielAus('https://0123456789abcdef0123456789abcdef@evil.example/1'), null);
  assert.equal(zielAus(''), null);
  assert.equal(zielAus(undefined), null);
});

test('Ereignis enthält nur die erlaubten Felder', () => {
  const e = ereignisAus(
    {
      quelle: 'server',
      typ: 'TypeError',
      meldung: 'kaputt für ada@beispiel.de',
      stapel: 'TypeError: x\n    at f (/app/src/a.ts:1:2)',
      route: '/organisation/[kuerzel]',
      methode: 'post',
      art: 'render',
      digest: '1234567890',
    },
    {
      kennung: 'a'.repeat(32),
      zeit: 1_700_000_000_000,
      umgebung: 'production',
      version: 'c97a25204f0e9d',
    },
  );
  assert.deepEqual(Object.keys(e).sort(), [
    'environment',
    'event_id',
    'exception',
    'level',
    'logger',
    'platform',
    'release',
    'tags',
    'timestamp',
  ]);
  assert.equal(e.exception.values[0].value, 'kaputt für [E-Mail]');
  assert.equal(e.release, 'c97a25204f0e9d');
  assert.equal(e.timestamp, 1_700_000_000);
  assert.deepEqual(e.tags, {
    quelle: 'server',
    route: '/organisation/[kuerzel]',
    methode: 'POST',
    art: 'render',
    digest: '1234567890',
  });
  const json = JSON.stringify(e);
  for (const verboten of ['user', 'request', 'ip_address', 'contexts', 'breadcrumbs', 'extra']) {
    assert.equal(json.includes(`"${verboten}"`), false, verboten);
  }
});

test('Umschlag: Kopf, Elementkopf, Ereignis', () => {
  const e = ereignisAus(
    { quelle: 'browser', typ: 'Error', meldung: 'x' },
    { kennung: 'b'.repeat(32), zeit: 0, umgebung: 'production' },
  );
  const zeilen = umschlagAus(e, 0).split('\n');
  assert.deepEqual(JSON.parse(zeilen[0] ?? ''), {
    event_id: 'b'.repeat(32),
    sent_at: '1970-01-01T00:00:00.000Z',
  });
  assert.deepEqual(JSON.parse(zeilen[1] ?? ''), { type: 'event' });
  assert.equal(JSON.parse(zeilen[2] ?? '').platform, 'javascript');
  assert.equal(zeilen[3], '');
});

test('Drossel: Grenze je Minute und gleiche Fehler nur einmal', () => {
  let t = 0;
  const d = erzeugeDrossel(2, () => t);
  assert.equal(d.erlaubt('a'), true);
  assert.equal(d.erlaubt('a'), false);
  assert.equal(d.erlaubt('b'), true);
  assert.equal(d.erlaubt('c'), false);
  t = 60_000;
  assert.equal(d.erlaubt('a'), true);
  assert.equal(d.erlaubt('c'), true);
});

test('Browserbericht: streng geprüft, Unbekanntes fällt weg', () => {
  assert.deepEqual(
    pruefeBrowserbericht({ typ: 'Error', meldung: 'x', pfad: '/a', cookie: 'geheim' }),
    {
      typ: 'Error',
      meldung: 'x',
      pfad: '/a',
    },
  );
  assert.equal(pruefeBrowserbericht({ typ: 'Error' }), null);
  assert.equal(pruefeBrowserbericht({ typ: 1, meldung: 'x' }), null);
  assert.equal(pruefeBrowserbericht([]), null);
  assert.equal(pruefeBrowserbericht('x'), null);
  assert.equal(pruefeBrowserbericht({ typ: 'Error', meldung: 'x'.repeat(2001) }), null);
});

type Aufruf = { adresse: string; init: RequestInit };

function dienst(env: Record<string, string | undefined>, antwort = 200) {
  const aufrufe: Aufruf[] = [];
  const warnungen: string[] = [];
  let t = 1_000_000;
  const abh: Abhaengigkeiten = {
    umgebung: () => env,
    fetchImpl: async (adresse, init) => {
      aufrufe.push({ adresse, init });
      return new Response('{}', { status: antwort });
    },
    jetzt: () => (t += 1),
    kennung: () => 'c'.repeat(32),
    warne: (w) => warnungen.push(w),
  };
  return { bericht: erzeugeFehlerbericht(abh), aufrufe, warnungen };
}

const ereignisIn = (aufruf: Aufruf | undefined) =>
  JSON.parse(String(aufruf?.init.body).split('\n')[2] ?? '');

test('Ohne DSN geht nichts hinaus; ungültige DSN wird einmal gemeldet', async () => {
  const ohne = dienst({});
  await ohne.bericht.meldeAnfragefehler(
    new Error('x'),
    { method: 'GET' },
    { routePath: '/', routeType: 'render' },
  );
  assert.equal(ohne.aufrufe.length, 0);
  assert.deepEqual(ohne.warnungen, []);

  const falsch = dienst({ SENTRY_DSN: 'https://schluessel@o1.ingest.us.sentry.io/1' });
  await falsch.bericht.sende({ quelle: 'server', typ: 'Error', meldung: 'x' });
  await falsch.bericht.sende({ quelle: 'server', typ: 'Error', meldung: 'y' });
  assert.equal(falsch.aufrufe.length, 0);
  assert.deepEqual(falsch.warnungen, ['fehlerbericht_dsn_ungueltig']);
});

test('Serverfehler: Umschlag an die EU-Adresse, Routenmuster statt Pfad, Steuerfehler nicht', async () => {
  const { bericht, aufrufe } = dienst({
    SENTRY_DSN: DSN,
    RAILWAY_GIT_COMMIT_SHA: 'c97a25204f0e9d1234',
  });
  const fehler = Object.assign(new Error('Datenbank weg'), { digest: '42' });
  await bericht.meldeAnfragefehler(
    fehler,
    { method: 'GET' },
    { routePath: '/einladung/[token]', routeType: 'render' },
  );
  await bericht.meldeAnfragefehler(
    Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/anmelden;307;' }),
    { method: 'GET' },
    { routePath: '/', routeType: 'render' },
  );
  assert.equal(aufrufe.length, 1);
  const [aufruf] = aufrufe;
  assert.equal(
    aufruf?.adresse,
    'https://o4500000000000001.ingest.de.sentry.io/api/4500000000000002/envelope/',
  );
  const kopf = new Headers(aufruf?.init.headers);
  assert.match(kopf.get('x-sentry-auth') ?? '', /sentry_key=0123456789abcdef0123456789abcdef/);
  assert.equal(kopf.get('content-type'), 'application/x-sentry-envelope');
  assert.equal(aufruf?.init.redirect, 'error');
  const e = ereignisIn(aufruf);
  assert.equal(e.release, 'c97a25204f0e');
  assert.equal(e.tags.route, '/einladung/[token]');
  assert.equal(e.tags.digest, '42');
});

test('Gleicher Serverfehler in einer Minute nur einmal', async () => {
  const { bericht, aufrufe } = dienst({ SENTRY_DSN: DSN });
  for (let i = 0; i < 5; i += 1) {
    await bericht.meldeAnfragefehler(
      new Error('x'),
      { method: 'GET' },
      { routePath: '/', routeType: 'render' },
    );
  }
  assert.equal(aufrufe.length, 1);
});

test('Sentry nicht erreichbar: kein Absturz, nur eine Warnung', async () => {
  const warnungen: string[] = [];
  const bericht = erzeugeFehlerbericht({
    umgebung: () => ({ SENTRY_DSN: DSN }),
    fetchImpl: async () => {
      throw new Error('ECONNREFUSED');
    },
    jetzt: Date.now,
    kennung: () => 'd'.repeat(32),
    warne: (w) => warnungen.push(w),
  });
  assert.equal(await bericht.sende({ quelle: 'server', typ: 'Error', meldung: 'x' }), false);
  assert.deepEqual(warnungen, ['fehlerbericht_nicht_gesendet']);
});

const browserAnfrage = (koerper: string, kopf: Record<string, string> = {}) =>
  new Request('https://www.lernpfade.net/api/fehlerbericht', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://www.lernpfade.net',
      host: 'www.lernpfade.net',
      ...kopf,
    },
    body: koerper,
  });

test('Browserbericht: bereinigt weitergegeben, Pfad ohne Kennungen', async () => {
  const { bericht, aufrufe } = dienst({ SENTRY_DSN: DSN });
  const antwort = await bericht.empfangeBrowserbericht(
    browserAnfrage(
      JSON.stringify({
        typ: 'TypeError',
        meldung: 'Fehler bei "Ada Lovelace"',
        stapel: 'f@https://www.lernpfade.net/_next/static/chunks/a.js?v=1:1:2',
        pfad: '/einladung/Q2hhbmdlTWVQbGVhc2VUb2tlbjEyMw?x=1',
        cookie: 'geheim',
      }),
    ),
  );
  assert.equal(antwort.status, 204);
  const e = ereignisIn(aufrufe[0]);
  assert.equal(e.platform, 'javascript');
  assert.equal(e.exception.values[0].value, 'Fehler bei "[Wert]"');
  assert.equal(e.tags.route, '/einladung/:id');
  assert.equal(e.tags.art, 'browser');
  assert.equal(e.exception.values[0].stacktrace.frames[0].filename, '/_next/static/chunks/a.js');
  assert.equal(String(aufrufe[0]?.init.body).includes('geheim'), false);
});

test('Browserbericht: fremde Herkunft, falscher Typ, zu groß, ungültig, Rauschen', async () => {
  const { bericht, aufrufe } = dienst({ SENTRY_DSN: DSN });
  const gut = JSON.stringify({ typ: 'Error', meldung: 'x' });
  assert.equal(
    (await bericht.empfangeBrowserbericht(browserAnfrage(gut, { origin: 'https://boese.example' })))
      .status,
    403,
  );
  assert.equal(
    (await bericht.empfangeBrowserbericht(browserAnfrage(gut, { 'content-type': 'text/plain' })))
      .status,
    415,
  );
  assert.equal(
    (await bericht.empfangeBrowserbericht(browserAnfrage('x'.repeat(20_000)))).status,
    413,
  );
  assert.equal((await bericht.empfangeBrowserbericht(browserAnfrage('{kein json'))).status, 400);
  assert.equal(
    (await bericht.empfangeBrowserbericht(browserAnfrage('{"typ":"Error"}'))).status,
    400,
  );
  const erweiterung = JSON.stringify({
    typ: 'Error',
    meldung: 'y',
    stapel: 'f@chrome-extension://abc/x.js:1:1',
  });
  assert.equal((await bericht.empfangeBrowserbericht(browserAnfrage(erweiterung))).status, 204);
  assert.equal(aufrufe.length, 0);
});

test('Browserberichte ohne DSN: angenommen, aber nicht weitergegeben', async () => {
  const { bericht, aufrufe } = dienst({});
  const antwort = await bericht.empfangeBrowserbericht(
    browserAnfrage(JSON.stringify({ typ: 'Error', meldung: 'x' })),
  );
  assert.equal(antwort.status, 204);
  assert.equal(aufrufe.length, 0);
});
