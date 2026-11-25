import assert from 'node:assert/strict';
import test from 'node:test';
import type { TeamQuelle } from './contract.ts';
import { teamCsv, zelle } from './csv.ts';

const AI: TeamQuelle = {
  source: 'ai',
  generatedAt: '2026-11-26T12:00:00.000Z',
  angefragt: 4,
  bekannt: 3,
  summen: { personen: 3, aktiv: 2, lektionen: { abgeschlossen: 8, jePerson: 10 }, wiederholungenFaellig: 7 },
  benannt: [
    { sub: 'a', lektionen: { completed: 4, total: 10 }, wiederholungenFaellig: 2, letzteAktivitaet: '2026-11-25' },
    { sub: 'x', lektionen: { completed: 1, total: 10 }, wiederholungenFaellig: 0, letzteAktivitaet: null },
  ],
};

test('Summen und benannte Personen; Excel-freundlich mit BOM, Semikolon und CRLF', () => {
  const csv = teamCsv(
    [
      { sub: 'a', name: 'Ada Lovelace', freigabe: true },
      { sub: 'b', name: 'Bea', freigabe: false },
    ],
    [AI],
  );
  assert.ok(csv.startsWith('﻿Art;Person;Pfad;'));
  const zeilen = csv.slice(1).trimEnd().split('\r\n');
  assert.equal(zeilen.length, 3);
  assert.equal(zeilen[1], 'Summe;;AIPfad;8;30;7;;3;2');
  assert.equal(zeilen[2], 'Person;Ada Lovelace;AIPfad;4;10;2;2026-11-25;;');
});

test('ohne Einwilligung im Hub erscheint niemand namentlich, auch wenn eine App Werte schickte', () => {
  const csv = teamCsv([{ sub: 'x', name: 'Xaver', freigabe: false }], [AI]);
  assert.doesNotMatch(csv, /Xaver/);
});

test('Zellen sind gegen Formeln und Trennzeichen geschützt', () => {
  assert.equal(zelle('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(zelle('+49'), "'+49");
  assert.equal(zelle('Müller; Söhne'), '"Müller; Söhne"');
  assert.equal(zelle(null), '');
  assert.equal(zelle(7), '7');
});
