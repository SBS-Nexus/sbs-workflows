import assert from 'node:assert/strict';
import test from 'node:test';
import { eintragsStatus, heuteTag, pruefeEintrag, zielText } from './regeln.ts';

const JETZT = new Date('2026-11-26T12:00:00Z');

test('Eintrag: Pfad, Ziel oder „alle“, Fälligkeit als Tag', () => {
  assert.deepEqual(pruefeEintrag({ pfad: 'ai', ziel: '10', alle: null, faellig: '2027-01-15' }, JETZT), {
    ok: true,
    eintrag: { pfad: 'ai', ziel: 10, faellig: '2027-01-15' },
  });
  assert.deepEqual(pruefeEintrag({ pfad: 'sql', ziel: '', alle: 'on', faellig: '' }, JETZT), {
    ok: true,
    eintrag: { pfad: 'sql', ziel: null, faellig: null },
  });
});

test('Eintrag: unzulässige Eingaben werden mit Grund abgelehnt', () => {
  const nein = (e: Record<string, unknown>) =>
    pruefeEintrag({ pfad: 'ai', ziel: '5', alle: null, faellig: '', ...e }, JETZT).ok;
  assert.equal(nein({ pfad: 'rust' }), false);
  assert.equal(nein({ ziel: '0' }), false);
  assert.equal(nein({ ziel: '1001' }), false);
  assert.equal(nein({ ziel: '2.5' }), false);
  assert.equal(nein({ faellig: '2026-02-30' }), false);
  assert.equal(nein({ faellig: '2026-11-25' }), false);
  assert.equal(nein({ faellig: '2032-01-01' }), false);
  assert.equal(nein({ faellig: '2026-11-26' }), true);
});

test('heute ist der Kalendertag in Deutschland', () => {
  assert.equal(heuteTag(new Date('2026-11-26T23:30:00Z')), '2026-11-27');
  assert.equal(heuteTag(new Date('2026-07-01T21:59:00Z')), '2026-07-01');
});

test('Status: erreicht, offen, überfällig (erst am Tag danach), noch nicht begonnen', () => {
  const eintrag = { ziel: 5, faellig: '2026-12-31' };
  assert.equal(eintragsStatus(eintrag, { abgeschlossen: 5, gesamt: 20 }, '2026-12-01'), 'erreicht');
  assert.equal(eintragsStatus(eintrag, { abgeschlossen: 4, gesamt: 20 }, '2026-12-31'), 'offen');
  assert.equal(eintragsStatus(eintrag, { abgeschlossen: 4, gesamt: 20 }, '2027-01-01'), 'ueberfaellig');
  assert.equal(eintragsStatus(eintrag, null, '2026-12-01'), 'nicht-begonnen');
  assert.equal(eintragsStatus(eintrag, null, '2027-01-01'), 'ueberfaellig');
  // Erreicht bleibt erreicht, auch nach der Fälligkeit.
  assert.equal(eintragsStatus(eintrag, { abgeschlossen: 6, gesamt: 20 }, '2027-02-01'), 'erreicht');
});

test('Status: „alle Lektionen“ heißt alle des Pfads; ohne Fälligkeit nie überfällig', () => {
  const alle = { ziel: null, faellig: null };
  assert.equal(eintragsStatus(alle, { abgeschlossen: 20, gesamt: 20 }, '2030-01-01'), 'erreicht');
  assert.equal(eintragsStatus(alle, { abgeschlossen: 19, gesamt: 20 }, '2030-01-01'), 'offen');
  assert.equal(eintragsStatus(alle, { abgeschlossen: 0, gesamt: 0 }, '2030-01-01'), 'offen');
  assert.equal(zielText(null), 'alle Lektionen');
  assert.equal(zielText(1), '1 Lektion');
  assert.equal(zielText(12), '12 Lektionen');
});
