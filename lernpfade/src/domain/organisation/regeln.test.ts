import assert from 'node:assert/strict';
import test from 'node:test';
import {
  belegtPlatz,
  brauchtZweitenFaktor,
  darf,
  darfEinladenAls,
  kuerzelAus,
  platzstand,
  pruefeName,
  rollenwechselErlaubt,
  urteileUeberEinloesung,
  type EinladungsLage,
  type Person,
} from './regeln.ts';

const JETZT = new Date('2026-11-25T12:00:00Z');
const LAGE: EinladungsLage = {
  rolle: 'LEARNER',
  email: null,
  maxNutzungen: 5,
  nutzungen: 0,
  gueltigBis: new Date('2026-12-09T12:00:00Z'),
  widerrufen: false,
  organisationGesperrt: false,
  schonMitglied: false,
  plaetze: platzstand(3, 10),
};
const PERSON: Person = {
  sub: '1',
  name: 'Ada',
  email: 'ada@firma.de',
  emailBestaetigt: true,
  zweiFaktoren: false,
};

test('Rechte je Rolle wie in docs/E5-PLAN.md, Abschnitt 6', () => {
  assert.equal(darf('ADMIN', 'protokoll.lesen'), true);
  assert.equal(darf('TEACHER', 'protokoll.lesen'), false);
  assert.equal(darf('TEACHER', 'mitglieder.sehen'), true);
  assert.equal(darf('TEACHER', 'mitglieder.verwalten'), false);
  assert.equal(darf('LEARNER', 'mitglieder.sehen'), false);
  assert.equal(darfEinladenAls('TEACHER', 'LEARNER'), true);
  assert.equal(darfEinladenAls('TEACHER', 'TEACHER'), false);
  assert.equal(darfEinladenAls('TEACHER', 'ADMIN'), false);
  assert.equal(darfEinladenAls('ADMIN', 'ADMIN'), true);
  assert.equal(darfEinladenAls('LEARNER', 'LEARNER'), false);
});

test('zweiter Faktor für Admin und Lehrkraft, Platz nur für Lernende', () => {
  assert.equal(brauchtZweitenFaktor('ADMIN'), true);
  assert.equal(brauchtZweitenFaktor('TEACHER'), true);
  assert.equal(brauchtZweitenFaktor('LEARNER'), false);
  assert.equal(belegtPlatz('LEARNER'), true);
  assert.equal(belegtPlatz('TEACHER'), false);
  assert.deepEqual(platzstand(12, 10), { belegt: 12, gesamt: 10, frei: 0 });
});

test('Name und Kürzel', () => {
  assert.deepEqual(pruefeName('  Müller   & Söhne  GmbH '), { ok: true, name: 'Müller & Söhne GmbH' });
  assert.equal(pruefeName('A').ok, false);
  assert.equal(pruefeName('x'.repeat(81)).ok, false);
  assert.equal(pruefeName(undefined).ok, false);
  assert.equal(kuerzelAus('Müller & Söhne GmbH'), 'muller-sohne-gmbh');
  assert.equal(kuerzelAus('Straße 1'), 'strasse-1');
  assert.equal(kuerzelAus('!!!'), 'organisation');
  assert.equal(kuerzelAus('a'.repeat(39) + ' b').length <= 40, true);
  assert.equal(kuerzelAus('a'.repeat(39) + ' b').endsWith('-'), false);
});

test('Einlösen: offener Link mit freiem Platz geht', () => {
  assert.deepEqual(urteileUeberEinloesung(LAGE, PERSON, JETZT), { ok: true });
});

test('Einlösen: die Einladung selbst zuerst, dann die Person, zuletzt die Plätze', () => {
  const nein = (lage: Partial<EinladungsLage>, person: Partial<Person> = {}) =>
    urteileUeberEinloesung({ ...LAGE, ...lage }, { ...PERSON, ...person }, JETZT);
  assert.deepEqual(nein({ widerrufen: true, gueltigBis: JETZT }), { ok: false, grund: 'widerrufen' });
  assert.deepEqual(nein({ gueltigBis: JETZT }), { ok: false, grund: 'abgelaufen' });
  assert.deepEqual(nein({ nutzungen: 5 }), { ok: false, grund: 'aufgebraucht' });
  assert.deepEqual(nein({ organisationGesperrt: true }), { ok: false, grund: 'gesperrt' });
  assert.deepEqual(nein({ schonMitglied: true, plaetze: platzstand(10, 10) }), {
    ok: false,
    grund: 'schon-mitglied',
  });
  assert.deepEqual(nein({ plaetze: platzstand(10, 10) }), { ok: false, grund: 'voll' });
  // Lehrkräfte belegen keinen Platz: Auch eine volle Organisation nimmt sie auf.
  assert.deepEqual(nein({ rolle: 'TEACHER', plaetze: platzstand(10, 10) }), { ok: true });
});

test('Einlösen: gebundene Einladung nur mit bestätigter, gleicher Adresse', () => {
  const gebunden = { ...LAGE, email: 'ada@firma.de', maxNutzungen: 1 };
  assert.deepEqual(urteileUeberEinloesung(gebunden, PERSON, JETZT), { ok: true });
  assert.deepEqual(urteileUeberEinloesung(gebunden, { ...PERSON, emailBestaetigt: false }, JETZT), {
    ok: false,
    grund: 'adresse-unbestaetigt',
  });
  assert.deepEqual(urteileUeberEinloesung(gebunden, { ...PERSON, email: null }, JETZT), {
    ok: false,
    grund: 'adresse-unbestaetigt',
  });
  assert.deepEqual(urteileUeberEinloesung(gebunden, { ...PERSON, email: 'eve@firma.de' }, JETZT), {
    ok: false,
    grund: 'adresse-falsch',
  });
});

test('die letzte Admin-Person bleibt Admin', () => {
  assert.equal(rollenwechselErlaubt('ADMIN', 'TEACHER', 1), false);
  assert.equal(rollenwechselErlaubt('ADMIN', 'TEACHER', 2), true);
  assert.equal(rollenwechselErlaubt('ADMIN', 'ADMIN', 1), true);
  assert.equal(rollenwechselErlaubt('LEARNER', 'ADMIN', 1), true);
});
