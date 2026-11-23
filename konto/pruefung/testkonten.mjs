#!/usr/bin/env node
// Legt Testkonten in einer TESTINSTANZ an (CI-Strecke, docs/E4-2-BAUPLAN.md,
// Schritt 4): eines mit bestätigter, eines mit unbestätigter Adresse. Die
// Passwörter entstehen hier zufällig und landen nur in --ausgabe (600).
//
// Nie gegen konto.lernpfade.net: Das Skript bricht ab, wenn --basis nicht
// auf localhost zeigt.
//
//   node konto/pruefung/testkonten.mjs --basis http://localhost:8080 \
//     --schluessel <pem> --ausgabe <datei>
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { apiMit, systemToken } from '../einrichtung/zugang.mjs';

const { values: arg } = parseArgs({
  options: {
    basis: { type: 'string' },
    schluessel: { type: 'string' },
    nutzer: { type: 'string', default: 'einrichtung' },
    ausgabe: { type: 'string' },
  },
});
for (const pflicht of ['basis', 'schluessel', 'ausgabe']) {
  if (!arg[pflicht]) throw new Error(`--${pflicht} fehlt`);
}
const BASIS = arg.basis.replace(/\/$/, '');
if (!['localhost', '127.0.0.1'].includes(new URL(BASIS).hostname)) {
  throw new Error('testkonten.mjs läuft nur gegen eine Testinstanz auf localhost.');
}

const api = apiMit(
  BASIS,
  systemToken({ nutzer: arg.nutzer, aussteller: BASIS, schluesselPfad: arg.schluessel }),
);
const org = await api('GET', '/admin/v1/orgs/default');
const orgId = org.daten?.org?.id;
if (!orgId) throw new Error(`Standard-Organisation nicht lesbar (${org.status})`);

const kennung = randomBytes(4).toString('hex');
async function konto(name, bestaetigt) {
  const email = `${name}-${kennung}@aipfad.test`;
  const passwort = `E2e-${randomBytes(18).toString('base64url')}`;
  const r = await api('POST', '/v2/users/human', {
    organization: { orgId },
    username: email,
    profile: { givenName: 'Ada', familyName: bestaetigt ? 'Testkonto' : 'Unbestätigt' },
    email: bestaetigt ? { email, isVerified: true } : { email, returnCode: {} },
    password: { password: passwort, changeRequired: false },
  });
  if (!r.ok)
    throw new Error(`Konto ${name} nicht angelegt (${r.status}) ${r.daten?.message ?? ''}`);
  console.log(`OK     Testkonto ${name} (${bestaetigt ? 'bestätigt' : 'unbestätigt'})`);
  return { email, passwort, userId: r.daten.userId };
}

const ergebnis = {
  bestaetigt: await konto('e2e', true),
  unbestaetigt: await konto('e2e-offen', false),
};
writeFileSync(arg.ausgabe, JSON.stringify(ergebnis), { mode: 0o600 });
console.log('DATEI  Testkonten geschrieben');
