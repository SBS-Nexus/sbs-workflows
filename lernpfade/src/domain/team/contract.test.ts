import assert from 'node:assert/strict';
import test from 'node:test';
import { pruefeTeamQuelle, TeamQuellenFehler } from './contract.ts';

const GUELTIG = {
  schemaVersion: 1,
  source: 'ai',
  generatedAt: '2026-11-26T12:00:00.000Z',
  angefragt: 4,
  bekannt: 3,
  summen: { personen: 3, aktiv: 2, lektionen: { abgeschlossen: 8, jePerson: 10 }, wiederholungenFaellig: 7 },
  benannt: [{ sub: 'a', lektionen: { completed: 4, total: 10 }, wiederholungenFaellig: 2, letzteAktivitaet: '2026-11-25' }],
};
const ERWARTET = { source: 'ai' as const, angefragt: 4, benanntErlaubt: new Set(['a']) };

test('nimmt eine vertragsgemäße Antwort an', () => {
  const q = pruefeTeamQuelle(GUELTIG, ERWARTET);
  assert.equal(q.summen?.personen, 3);
  assert.equal(q.benannt[0]?.letzteAktivitaet, '2026-11-25');
});

test('nimmt eine Antwort ohne Summen an (weniger als drei bekannt)', () => {
  const q = pruefeTeamQuelle({ ...GUELTIG, bekannt: 2, summen: null }, ERWARTET);
  assert.equal(q.summen, null);
});

const ungueltig: Array<[string, unknown]> = [
  ['Summen unter drei Personen', { ...GUELTIG, bekannt: 2, summen: { ...GUELTIG.summen, personen: 2 } }],
  ['Einzelwerte ohne Einwilligung', { ...GUELTIG, benannt: [{ ...GUELTIG.benannt[0], sub: 'b' }] }],
  ['Uhrzeit statt Tag', { ...GUELTIG, benannt: [{ ...GUELTIG.benannt[0], letzteAktivitaet: '2026-11-25T08:00:00Z' }] }],
  ['zusätzliches Feld', { ...GUELTIG, versuche: [] }],
  ['Feld je Person zu viel', { ...GUELTIG, benannt: [{ ...GUELTIG.benannt[0], code: 'x' }] }],
  ['fremde Quelle', { ...GUELTIG, source: 'sql' }],
  ['fremde Version', { ...GUELTIG, schemaVersion: 2 }],
  ['Anzahl passt nicht zur Anfrage', { ...GUELTIG, angefragt: 5 }],
  ['mehr Lektionen als vorhanden', { ...GUELTIG, benannt: [{ ...GUELTIG.benannt[0], lektionen: { completed: 11, total: 10 } }] }],
  ['doppelte Person', { ...GUELTIG, benannt: [GUELTIG.benannt[0], GUELTIG.benannt[0]] }],
  ['kein Objekt', 'text'],
];

for (const [fall, koerper] of ungueltig) {
  test(`lehnt ab: ${fall}`, () => {
    assert.throws(() => pruefeTeamQuelle(koerper, ERWARTET), TeamQuellenFehler);
  });
}
