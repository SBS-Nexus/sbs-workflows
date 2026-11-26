#!/usr/bin/env node
// Legt Testkonten in einer TESTINSTANZ an (CI-Strecke, docs/E4-2-BAUPLAN.md,
// Schritt 4): eines mit bestätigter, eines mit unbestätigter Adresse und
// (E5.1) eines mit Authenticator-App als zweitem Faktor. Passwörter und der
// TOTP-Schlüssel entstehen hier zufällig und landen nur in --ausgabe (600).
//
// Nie gegen konto.lernpfade.net: Das Skript bricht ab, wenn --basis nicht
// auf localhost zeigt.
//
//   node konto/pruefung/testkonten.mjs --basis http://localhost:8080 \
//     --schluessel <pem> --ausgabe <datei>
import { createHmac, randomBytes } from 'node:crypto';
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
async function konto(name, bestaetigt, nachname = bestaetigt ? 'Testkonto' : 'Unbestätigt') {
  const email = `${name}-${kennung}@aipfad.test`;
  const passwort = `E2e-${randomBytes(18).toString('base64url')}`;
  const r = await api('POST', '/v2/users/human', {
    organization: { orgId },
    username: email,
    profile: { givenName: 'Ada', familyName: nachname },
    email: bestaetigt ? { email, isVerified: true } : { email, returnCode: {} },
    password: { password: passwort, changeRequired: false },
  });
  if (!r.ok)
    throw new Error(`Konto ${name} nicht angelegt (${r.status}) ${r.daten?.message ?? ''}`);
  console.log(`OK     Testkonto ${name} (${bestaetigt ? 'bestätigt' : 'unbestätigt'})`);
  return { email, passwort, userId: r.daten.userId };
}

/** Base32 nach RFC 4648, wie ZITADEL den TOTP-Schlüssel ausgibt. */
function base32(text) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let wert = 0;
  const bytes = [];
  for (const zeichen of text.replace(/=+$/, '').toUpperCase()) {
    const i = alphabet.indexOf(zeichen);
    if (i < 0) continue;
    wert = (wert << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((wert >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** TOTP nach RFC 6238: SHA-1, 30 Sekunden, sechs Stellen. */
function totp(geheimnis, zeit = Date.now()) {
  const zaehler = Buffer.alloc(8);
  zaehler.writeBigUInt64BE(BigInt(Math.floor(zeit / 30000)));
  const h = createHmac('sha1', base32(geheimnis)).update(zaehler).digest();
  const o = h[h.length - 1] & 15;
  const zahl = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(zahl % 1_000_000).padStart(6, '0');
}

/** E5.1: Authenticator-App als zweiter Faktor, damit `amr` `mfa` enthält. */
async function mitZweitemFaktor(eintrag) {
  const start = await api('POST', `/v2/users/${eintrag.userId}/totp`, {});
  const geheimnis = start.daten?.secret;
  if (!start.ok || !geheimnis) throw new Error(`TOTP nicht startbar (${start.status})`);
  const bestaetigt = await api('POST', `/v2/users/${eintrag.userId}/totp/verify`, {
    code: totp(geheimnis),
  });
  if (!bestaetigt.ok) throw new Error(`TOTP nicht bestätigt (${bestaetigt.status})`);
  console.log('OK     Authenticator-App für das Testkonto mit zweitem Faktor');
  return { ...eintrag, totpGeheimnis: geheimnis };
}

const ergebnis = {
  bestaetigt: await konto('e2e', true),
  unbestaetigt: await konto('e2e-offen', false),
  zweiFaktoren: await mitZweitemFaktor(await konto('e2e-2fa', true, 'Zweifaktor')),
};
writeFileSync(arg.ausgabe, JSON.stringify(ergebnis), { mode: 0o600 });
console.log('DATEI  Testkonten geschrieben');
