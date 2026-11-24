#!/usr/bin/env node
// Übernahme der bestehenden App-Konten ins gemeinsame Konto (E4.3,
// docs/E4-4-BAUPLAN.md Abschnitt 4).
//
// 1. Ausfuhr je App: Adresse, Name, scrypt-Hash, letzte Aktivität. Keine
//    Lerndaten.
// 2. Zusammenfassen nach Adresse; bei mehreren Apps gilt das zuletzt aktive
//    Konto (umwandeln.mjs).
// 3. Einfuhr in ZITADEL: Je Adresse ein Konto mit umgeschriebenem Hash und
//    UNBESTÄTIGTER Adresse. Es geht keine Mail hinaus (`returnCode`); die
//    Bestätigung verlangt die Anmelde-App bei der ersten Anmeldung.
//    Vorhandene Adressen werden übersprungen, ein zweiter Lauf ändert nichts.
//
// Ausgabe: nur Zahlen, nie Adressen oder Namen.
//
//   node konto/uebernahme/uebernahme.mjs --basis https://konto.lernpfade.net \
//     --schluessel <pem> --modus probe|einfuhr \
//     [--quelle aipfad=postgresql://…] [--quelle-json <datei>] [--bericht <datei>]
//
// Quellen kommen alternativ aus UEBERNAHME_DB_<APP> (etwa UEBERNAHME_DB_SQLPFAD),
// damit ein Railway-Job sie über Referenzvariablen bekommt.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { apiMit, systemToken } from '../einrichtung/zugang.mjs';
import { namensteile, zitadelHash, zusammenfassen } from './umwandeln.mjs';

const { values: arg } = parseArgs({
  options: {
    basis: { type: 'string' },
    schluessel: { type: 'string' },
    nutzer: { type: 'string', default: 'einrichtung' },
    modus: { type: 'string', default: 'probe' },
    quelle: { type: 'string', multiple: true, default: [] },
    'quelle-json': { type: 'string' },
    bericht: { type: 'string' },
  },
});
for (const pflicht of ['basis', 'schluessel']) {
  if (!arg[pflicht]) throw new Error(`--${pflicht} fehlt`);
}
if (!['probe', 'einfuhr'].includes(arg.modus)) throw new Error('--modus ist probe oder einfuhr');
const BASIS = arg.basis.replace(/\/$/, '');

// Quellen: --quelle app=url und UEBERNAHME_DB_<APP>
const quellen = new Map();
for (const eintrag of arg.quelle) {
  const i = eintrag.indexOf('=');
  if (i < 1) throw new Error(`--quelle erwartet app=url, bekam ${eintrag.split('=')[0]}`);
  quellen.set(eintrag.slice(0, i), eintrag.slice(i + 1));
}
for (const [name, wert] of Object.entries(process.env)) {
  const m = name.match(/^UEBERNAHME_DB_([A-Z]+)$/);
  if (m && wert) quellen.set(m[1].toLowerCase(), wert);
}

/** Liest die Konten einer App. Funktioniert vor und nach der Migration E4.4. */
async function ausfuhr(app, url) {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT u.email, u.name, u."passwordHash" AS "passwordHash",
             GREATEST(u."updatedAt", COALESCE(MAX(s."lastSeenAt"), u."updatedAt")) AS zuletzt
        FROM users u
        LEFT JOIN auth_sessions s ON s."userId" = u.id
       GROUP BY u.id`);
    return rows.map((zeile) => ({ app, ...zeile }));
  } finally {
    await client.end();
  }
}

const konten = [];
for (const [app, url] of quellen) konten.push(...(await ausfuhr(app, url)));
if (arg['quelle-json']) konten.push(...JSON.parse(readFileSync(arg['quelle-json'], 'utf8')));
if (konten.length === 0 && quellen.size === 0 && !arg['quelle-json']) {
  throw new Error('Keine Quelle angegeben (--quelle, --quelle-json oder UEBERNAHME_DB_<APP>).');
}

const { personen, zahlen } = zusammenfassen(konten);

const api = apiMit(
  BASIS,
  systemToken({ nutzer: arg.nutzer, aussteller: BASIS, schluesselPfad: arg.schluessel }),
);
const org = await api('GET', '/admin/v1/orgs/default');
const orgId = org.daten?.org?.id;
if (!orgId) throw new Error(`Standard-Organisation nicht lesbar (${org.status})`);

const ergebnis = { vorhanden: 0, eingefuehrt: 0, wuerdeEinfuehren: 0, fehler: 0, fehlerStatus: {} };
for (const person of personen) {
  const suche = await api('POST', '/v2/users', {
    queries: [
      {
        emailQuery: {
          emailAddress: person.email,
          method: 'TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE',
        },
      },
    ],
  });
  if (!suche.ok) {
    ergebnis.fehler += 1;
    ergebnis.fehlerStatus[suche.status] = (ergebnis.fehlerStatus[suche.status] ?? 0) + 1;
    continue;
  }
  if ((suche.daten?.result ?? []).length > 0) {
    ergebnis.vorhanden += 1;
    continue;
  }
  if (arg.modus === 'probe') {
    ergebnis.wuerdeEinfuehren += 1;
    continue;
  }

  const name = namensteile(person.name, person.email);
  const neu = await api('POST', '/v2/users/human', {
    organization: { orgId },
    username: person.email,
    profile: { givenName: name.vorname, familyName: name.nachname, displayName: name.anzeige },
    // Unbestätigt und ohne Mail: Die Anmelde-App verlangt den Code beim ersten Mal.
    email: { email: person.email, returnCode: {} },
    hashedPassword: { hash: zitadelHash(person.passwordHash), changeRequired: false },
  });
  if (neu.ok) {
    ergebnis.eingefuehrt += 1;
  } else {
    ergebnis.fehler += 1;
    ergebnis.fehlerStatus[neu.status] = (ergebnis.fehlerStatus[neu.status] ?? 0) + 1;
  }
}

const bericht = {
  modus: arg.modus,
  zeitpunkt: new Date().toISOString(),
  quellen: [...quellen.keys()].sort(),
  konten: zahlen,
  personen: personen.length,
  ...ergebnis,
};
console.log(JSON.stringify(bericht, null, 2));
if (arg.bericht) writeFileSync(arg.bericht, JSON.stringify(bericht, null, 2));
process.exit(ergebnis.fehler === 0 ? 0 : 1);
