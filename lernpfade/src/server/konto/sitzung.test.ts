import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cookieNamen,
  oeffneIdToken,
  oeffneSitzung,
  versiegleIdToken,
  versiegleSitzung,
  type HubSitzung,
} from './sitzung.ts';

const GEHEIMNIS = 'testgeheimnis-sitzung-hub-nur-fuer-tests-0000';
const SITZUNG: HubSitzung = {
  sub: '312345678901234567',
  name: 'Ada Lovelace',
  zugriffstoken: 'eyJ.zugriff.token',
  aktualisierung: 'aktualisierung-123',
  gueltigBis: Date.UTC(2026, 10, 24, 12, 15),
  email: 'ada@example.org',
  emailBestaetigt: true,
  zweiFaktoren: true,
};

test('versiegelt und öffnet die Sitzung; der Inhalt ist im Cookie nicht lesbar', async () => {
  const wert = await versiegleSitzung(SITZUNG, GEHEIMNIS);
  assert.deepEqual(await oeffneSitzung(wert, GEHEIMNIS), SITZUNG);
  assert.equal(wert.includes('Ada'), false);
  assert.equal(wert.includes('zugriff'), false);
  assert.equal(
    Buffer.from(wert.split('.')[3] ?? '', 'base64url')
      .toString('utf8')
      .includes('Ada'),
    false,
  );
});

test('ein anderes Geheimnis, Veränderung oder Unsinn öffnen nichts', async () => {
  const wert = await versiegleSitzung(SITZUNG, GEHEIMNIS);
  assert.equal(await oeffneSitzung(wert, `${GEHEIMNIS}-anders`), null);
  const teile = wert.split('.');
  teile[3] = `${(teile[3] ?? '').slice(0, -2)}AA`;
  assert.equal(await oeffneSitzung(teile.join('.'), GEHEIMNIS), null);
  assert.equal(await oeffneSitzung(undefined, GEHEIMNIS), null);
  assert.equal(await oeffneSitzung('kein.jwe', GEHEIMNIS), null);
});

test('Sitzung und ID-Token sind getrennt verschlüsselt (anderer Zweck, anderer Schlüssel)', async () => {
  const idWert = await versiegleIdToken('eyJ.id.token', GEHEIMNIS);
  assert.equal(await oeffneIdToken(idWert, GEHEIMNIS), 'eyJ.id.token');
  assert.equal(await oeffneSitzung(idWert, GEHEIMNIS), null);
  const sitzungWert = await versiegleSitzung(SITZUNG, GEHEIMNIS);
  assert.equal(await oeffneIdToken(sitzungWert, GEHEIMNIS), null);
});

test('Cookie-Namen tragen unter https das __Host-Präfix', () => {
  assert.equal(cookieNamen(true).sitzung, '__Host-lernpfade_sitzung');
  assert.equal(cookieNamen(false).anmeldung, 'lernpfade_anmeldung');
});

test('eine Sitzung von vor E5.1 öffnet sich ohne Adresse und ohne zweiten Faktor', async () => {
  const { email: _e, emailBestaetigt: _b, zweiFaktoren: _z, ...alt } = SITZUNG;
  const wert = await versiegleSitzung(alt as HubSitzung, GEHEIMNIS);
  assert.deepEqual(await oeffneSitzung(wert, GEHEIMNIS), {
    ...alt,
    email: null,
    emailBestaetigt: false,
    zweiFaktoren: false,
  });
});
