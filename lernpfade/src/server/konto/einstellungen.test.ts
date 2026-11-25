import assert from 'node:assert/strict';
import test from 'node:test';
import { hubKontoAus, istZulaessigeAdresse, KontoKonfigurationsFehler } from './einstellungen.ts';

/** Testwerte, keine echten Geheimnisse. */
const VOLL = {
  AUTH_ISSUER: 'https://konto.lernpfade.test',
  AUTH_CLIENT_ID: '400000000000000009',
  AUTH_CLIENT_SECRET: 'testgeheimnis-client-hub-0000',
  HUB_SESSION_SECRET: 'testgeheimnis-sitzung-hub-nur-fuer-tests-0000',
  HUB_URL: 'https://www.lernpfade.test/',
};

test('ohne Werte ist die Anmeldung im Hub aus', () => {
  assert.equal(hubKontoAus({}), null);
});

test('vollständige Werte ergeben den Zugang, die Adresse ohne Schrägstrich am Ende', () => {
  const konto = hubKontoAus(VOLL);
  assert.equal(konto?.basis, 'https://www.lernpfade.test');
  assert.equal(konto?.clientId, '400000000000000009');
});

test('eine halbe Konfiguration ist ein Fehler, kein stilles Aus', () => {
  const { HUB_SESSION_SECRET: _weg, ...ohne } = VOLL;
  assert.throws(() => hubKontoAus(ohne), KontoKonfigurationsFehler);
});

test('weist kurze Geheimnisse und unsichere Adressen ab', () => {
  assert.throws(() => hubKontoAus({ ...VOLL, HUB_SESSION_SECRET: 'zu-kurz' }), /32 Zeichen/);
  assert.throws(() => hubKontoAus({ ...VOLL, AUTH_CLIENT_SECRET: 'kurz' }), /16 Zeichen/);
  assert.throws(() => hubKontoAus({ ...VOLL, HUB_URL: 'http://www.lernpfade.test' }), /https/);
  assert.ok(
    hubKontoAus({
      ...VOLL,
      HUB_URL: 'http://127.0.0.1:3210',
      AUTH_ISSUER: 'http://localhost:8080',
    }),
  );
});

test('Adressen: https, http nur für localhost, ohne Abfrage und Zugangsdaten', () => {
  assert.equal(istZulaessigeAdresse('https://konto.lernpfade.net'), true);
  assert.equal(istZulaessigeAdresse('http://localhost:8080'), true);
  assert.equal(istZulaessigeAdresse('http://konto.lernpfade.net'), false);
  assert.equal(istZulaessigeAdresse('https://a@konto.lernpfade.net'), false);
  assert.equal(istZulaessigeAdresse('https://konto.lernpfade.net/?x=1'), false);
  assert.equal(istZulaessigeAdresse('kein-url'), false);
});
