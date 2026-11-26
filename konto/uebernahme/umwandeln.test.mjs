import { strict as assert } from 'node:assert';
import { randomBytes, scryptSync } from 'node:crypto';
import { describe, it } from 'node:test';
import { namensteile, normaleAdresse, zitadelHash, zusammenfassen } from './umwandeln.mjs';

/** Ein Hash genau wie in den Apps (src/server/auth/password.ts). */
export function appHash(passwort) {
  const salz = randomBytes(16);
  const hash = scryptSync(passwort.normalize('NFKC'), salz, 64, {
    N: 65536,
    r: 8,
    p: 1,
    maxmem: 192 * 1024 * 1024,
  });
  return ['scrypt', 65536, 8, 1, salz.toString('base64'), hash.toString('base64')].join('$');
}

describe('Hash der Apps → ZITADEL', () => {
  it('rechnet in das scrypt-Format von ZITADEL um, ohne Auffüllung', () => {
    const roh = appHash('nordwind-treppe-hafen-41');
    const teile = roh.split('$');
    const ziel = zitadelHash(roh);
    assert.match(ziel, /^\$scrypt\$ln=16,r=8,p=1\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/);
    const zielTeile = ziel.split('$');
    assert.deepEqual(Buffer.from(zielTeile[3], 'base64'), Buffer.from(teile[4], 'base64'));
    assert.deepEqual(Buffer.from(zielTeile[4], 'base64'), Buffer.from(teile[5], 'base64'));
  });

  it('lehnt Fremdes ab', () => {
    const nullen = 'A'.repeat(22) + '==';
    for (const hash of [
      null,
      '',
      'bcrypt$12$abc',
      'scrypt$65536$8$1$salz',
      ['scrypt', 65535, 8, 1, nullen, nullen].join('$'),
      ['scrypt', 65536, 8, 1, '', 'AAAA'].join('$'),
    ]) {
      assert.equal(zitadelHash(hash), null, String(hash));
    }
  });
});

describe('Zusammenfassen nach Adresse', () => {
  const alt = appHash('altes-passwort-0001');
  const neu = appHash('neues-passwort-0002');

  it('nimmt bei mehreren Apps Hash und Name des zuletzt aktiven Kontos', () => {
    const { personen, zahlen } = zusammenfassen([
      {
        app: 'sqlpfad',
        email: ' Ada@Example.org ',
        name: 'Ada alt',
        passwordHash: alt,
        zuletzt: new Date('2026-10-01'),
      },
      {
        app: 'pythonpfad',
        email: 'ada@example.org',
        name: 'Ada Lovelace',
        passwordHash: neu,
        zuletzt: new Date('2026-11-01'),
      },
      {
        app: 'aipfad',
        email: 'grace@example.org',
        name: 'Grace Hopper',
        passwordHash: alt,
        zuletzt: '2026-09-01T00:00:00Z',
      },
    ]);
    assert.equal(personen.length, 2);
    const ada = personen.find((p) => p.email === 'ada@example.org');
    assert.equal(ada.passwordHash, neu);
    assert.equal(ada.name, 'Ada Lovelace');
    assert.deepEqual(ada.apps, ['pythonpfad', 'sqlpfad']);
    assert.equal(zahlen.ueberschneidungen, 1);
    assert.deepEqual(zahlen.jeApp, { sqlpfad: 1, pythonpfad: 1, aipfad: 1 });
  });

  it('zählt Konten ohne Adresse, ohne Hash und mit unbrauchbarem Hash, statt sie zu übernehmen', () => {
    const { personen, zahlen } = zusammenfassen([
      { app: 'aipfad', email: 'kein-at', name: 'X', passwordHash: alt, zuletzt: null },
      { app: 'aipfad', email: 'zentral@example.org', name: 'Z', passwordHash: null, zuletzt: null },
      {
        app: 'aipfad',
        email: 'kaputt@example.org',
        name: 'K',
        passwordHash: 'bcrypt$x',
        zuletzt: null,
      },
    ]);
    assert.equal(personen.length, 0);
    assert.equal(zahlen.ohneAdresse, 1);
    assert.equal(zahlen.ohneHash, 1);
    assert.equal(zahlen.unbrauchbarerHash, 1);
  });
});

describe('Adressen und Namen', () => {
  it('normalisiert Adressen', () => {
    assert.equal(normaleAdresse('  Grace@Example.ORG '), 'grace@example.org');
    assert.equal(normaleAdresse('ohne-at'), null);
    assert.equal(normaleAdresse(42), null);
  });

  it('teilt Namen für ZITADEL auf und behält den Anzeigenamen', () => {
    assert.deepEqual(namensteile('Ada Augusta Lovelace', 'a@b.de'), {
      anzeige: 'Ada Augusta Lovelace',
      vorname: 'Ada',
      nachname: 'Augusta Lovelace',
    });
    assert.deepEqual(namensteile('Cher', 'c@b.de'), {
      anzeige: 'Cher',
      vorname: 'Cher',
      nachname: 'Cher',
    });
    assert.deepEqual(namensteile(' ', 'lin@b.de'), {
      anzeige: 'lin',
      vorname: 'lin',
      nachname: 'lin',
    });
  });
});
