#!/usr/bin/env node
// Probe der Kontoübernahme gegen einen ECHTEN Test-ZITADEL (E4.3, Tor:
// „Probelauf-Bericht mit Fehlern = 0“). Läuft in der CI und lokal gegen
// konto/pruefung/e2e (localhost), nie gegen konto.lernpfade.net.
//
// Ablauf:
// 1. Erfundene Konten in zwei „Apps“, Hashes genau wie in den Apps. Eine
//    Adresse gibt es in beiden Apps mit verschiedenen Passwörtern.
// 2. Probelauf (nur zählen), dann Einfuhr, dann ein zweiter Lauf (ändert
//    nichts).
// 3. Prüfung über die Session-API von ZITADEL: Das neueste Passwort meldet
//    an, das ältere nicht; die Adresse ist unbestätigt; Konten ohne Hash
//    wurden nicht angelegt.
//
//   node konto/pruefung/uebernahme-pruefung.mjs --basis http://localhost:8080 --schluessel <pem>
import { execFileSync } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { apiMit, systemToken } from '../einrichtung/zugang.mjs';

const { values: arg } = parseArgs({
  options: { basis: { type: 'string' }, schluessel: { type: 'string' } },
});
const BASIS = (arg.basis ?? '').replace(/\/$/, '');
if (!['localhost', '127.0.0.1'].includes(new URL(BASIS).hostname)) {
  throw new Error('Die Probe läuft nur gegen eine Testinstanz auf localhost.');
}

function appHash(passwort) {
  const salz = randomBytes(16);
  const hash = scryptSync(passwort.normalize('NFKC'), salz, 64, {
    N: 65536,
    r: 8,
    p: 1,
    maxmem: 192 * 1024 * 1024,
  });
  return ['scrypt', 65536, 8, 1, salz.toString('base64'), hash.toString('base64')].join('$');
}

const kennung = randomBytes(4).toString('hex');
const adresse = (name) => `uebernahme-${name}-${kennung}@aipfad.test`;
const passwort = (name) => `Probe-${name}-${randomBytes(9).toString('base64url')}`;
const PW = {
  altSql: passwort('alt'),
  neuPython: passwort('neu'),
  nurAi: passwort('ai'),
  mitLigatur: 'ﬁnde-mich-wieder-2026',
};

const konten = [
  // Dieselbe Person in zwei Apps: Python ist neuer, also gilt dessen Passwort.
  {
    app: 'sqlpfad',
    email: adresse('doppelt').toUpperCase(),
    name: 'Doppelt Alt',
    passwordHash: appHash(PW.altSql),
    zuletzt: '2026-10-01T00:00:00Z',
  },
  {
    app: 'pythonpfad',
    email: adresse('doppelt'),
    name: 'Doppelt Neu',
    passwordHash: appHash(PW.neuPython),
    zuletzt: '2026-11-01T00:00:00Z',
  },
  {
    app: 'aipfad',
    email: adresse('einzeln'),
    name: 'Einzeln',
    passwordHash: appHash(PW.nurAi),
    zuletzt: '2026-11-02T00:00:00Z',
  },
  // NFKC: Die Apps haben normalisiert gehasht, die eigene Anmelde-App normalisiert vor dem Absenden.
  {
    app: 'aipfad',
    email: adresse('ligatur'),
    name: 'Ligatur',
    passwordHash: appHash(PW.mitLigatur),
    zuletzt: '2026-11-03T00:00:00Z',
  },
  // Konto aus dem gemeinsamen Konto: kein lokales Passwort, wird nicht übernommen.
  {
    app: 'aipfad',
    email: adresse('zentral'),
    name: 'Zentral',
    passwordHash: null,
    zuletzt: '2026-11-04T00:00:00Z',
  },
];

const ordner = mkdtempSync(path.join(tmpdir(), 'uebernahme-'));
const quelle = path.join(ordner, 'konten.json');
writeFileSync(quelle, JSON.stringify(konten), { mode: 0o600 });
const werkzeug = path.join(import.meta.dirname, '..', 'uebernahme', 'uebernahme.mjs');

function lauf(modus) {
  const ausgabe = execFileSync(
    process.execPath,
    [
      werkzeug,
      '--basis',
      BASIS,
      '--schluessel',
      arg.schluessel,
      '--modus',
      modus,
      '--quelle-json',
      quelle,
    ],
    { encoding: 'utf8' },
  );
  return JSON.parse(ausgabe);
}

let fehler = 0;
function pruefe(bedingung, text) {
  console.log(`${bedingung ? 'OK    ' : 'FEHLER'} ${text}`);
  if (!bedingung) fehler += 1;
}

try {
  const probe = lauf('probe');
  pruefe(
    probe.personen === 3 && probe.konten.ueberschneidungen === 1,
    'Probe: 3 Personen, 1 Überschneidung',
  );
  pruefe(
    probe.konten.ohneHash === 1,
    'Probe: Konto ohne lokales Passwort gezählt, nicht übernommen',
  );
  pruefe(probe.wuerdeEinfuehren === 3 && probe.fehler === 0, 'Probe: würde 3 einführen, Fehler 0');

  const einfuhr = lauf('einfuhr');
  pruefe(einfuhr.eingefuehrt === 3 && einfuhr.fehler === 0, 'Einfuhr: 3 eingeführt, Fehler 0');

  const zweiter = lauf('einfuhr');
  pruefe(
    zweiter.eingefuehrt === 0 && zweiter.vorhanden === 3,
    'Zweiter Lauf: nichts neu, 3 vorhanden',
  );

  const api = apiMit(
    BASIS,
    systemToken({ nutzer: 'einrichtung', aussteller: BASIS, schluesselPfad: arg.schluessel }),
  );
  const anmelden = async (email, pw) =>
    (
      await api('POST', '/v2/sessions', {
        checks: { user: { loginName: email }, password: { password: pw } },
      })
    ).ok;

  pruefe(
    await anmelden(adresse('doppelt'), PW.neuPython),
    'Doppelt: das Passwort des zuletzt aktiven Kontos meldet an',
  );
  pruefe(
    !(await anmelden(adresse('doppelt'), PW.altSql)),
    'Doppelt: das ältere Passwort meldet nicht an',
  );
  pruefe(await anmelden(adresse('einzeln'), PW.nurAi), 'Einzeln: das bisherige Passwort meldet an');
  pruefe(
    await anmelden(adresse('ligatur'), PW.mitLigatur.normalize('NFKC')),
    'Ligatur: mit NFKC-Fassung angemeldet',
  );

  const suche = await api('POST', '/v2/users', {
    queries: [
      {
        emailQuery: {
          emailAddress: adresse('doppelt'),
          method: 'TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE',
        },
      },
    ],
  });
  const nutzer = suche.daten?.result?.[0];
  // ZITADEL lässt `false` in der Antwort weg (proto3-JSON): Geprüft wird, dass
  // die Adresse da ist und NICHT als bestätigt gilt.
  pruefe(
    nutzer?.human?.email?.email === adresse('doppelt') && nutzer.human.email.isVerified !== true,
    'Adresse ist unbestätigt (Bestätigung bei der ersten Anmeldung)',
  );
  pruefe(
    nutzer?.human?.profile?.displayName === 'Doppelt Neu',
    'Name des zuletzt aktiven Kontos übernommen',
  );

  const zentral = await api('POST', '/v2/users', {
    queries: [
      {
        emailQuery: {
          emailAddress: adresse('zentral'),
          method: 'TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE',
        },
      },
    ],
  });
  pruefe((zentral.daten?.result ?? []).length === 0, 'Konto ohne lokales Passwort nicht angelegt');
} finally {
  rmSync(ordner, { recursive: true, force: true });
}

console.log(
  fehler === 0 ? 'Probe der Übernahme: ohne Fehler.' : `Probe der Übernahme: ${fehler} Fehler.`,
);
process.exit(fehler === 0 ? 0 : 1);
