import { describe, expect, it } from 'vitest';
import { cutoffFromDays, runRetention } from '@/server/retention/runner';
import type { RetentionRule, RetentionRuleResult } from '@/server/retention/types';

/**
 * Der Aufbewahrungslauf ohne Datenbank.
 *
 * Geprüft wird hier die Orchestrierung: Reihenfolge, Unabhängigkeit der
 * Regeln, Verhalten bei abgeschalteter Frist, Verhalten bei Teilfehlern und
 * die Grenzrechnung. Was nur gegen echte Tabellen nachweisbar ist —
 * Trockenlauf gegen Ernstfall, Idempotenz — steht in
 * `tests/integration/retention.test.ts`.
 *
 * Die Regeln werden eingeschleust. Das ist nicht bloß bequem: Ein Teilfehler
 * ließe sich mit echten Tabellen kaum verlässlich herbeiführen, und eine
 * zweite produktive Datenart nur für einen Test zu erfinden wäre teurer als
 * die Eigenschaft, die sie belegen soll.
 */

interface RegelProtokoll {
  gezaehlt: Date[];
  geloescht: Date[];
}

function testregel(
  id: string,
  optionen: {
    days?: number;
    candidates?: number;
    deleted?: number;
    wirftBeim?: 'zaehlen' | 'loeschen' | 'frist';
    protokoll?: RegelProtokoll;
  } = {},
): RetentionRule {
  const { days = 30, candidates = 0, deleted = 0, wirftBeim, protokoll } = optionen;

  return {
    id,
    dataCategory: `Kategorie-${id}`,
    retentionDaysEnvVar: `${id}_DAYS`,
    retentionDays: () => {
      if (wirftBeim === 'frist') throw new TypeError('Frist nicht lesbar');
      return days;
    },
    cutoffAt: cutoffFromDays,
    countCandidates: (cutoff) => {
      if (wirftBeim === 'zaehlen') throw new RangeError('Zählen fehlgeschlagen');
      protokoll?.gezaehlt.push(cutoff);
      return Promise.resolve(candidates);
    },
    deleteCandidates: (cutoff) => {
      if (wirftBeim === 'loeschen') throw new RangeError('Löschen fehlgeschlagen');
      protokoll?.geloescht.push(cutoff);
      return Promise.resolve(deleted);
    },
  };
}

const JETZT = new Date('2026-06-15T12:00:00.000Z');

describe('Aufbewahrungslauf', () => {
  it('rechnet die Grenze als jetzt minus Frist in Tagen', () => {
    expect(cutoffFromDays(JETZT, 30).toISOString()).toBe('2026-05-16T12:00:00.000Z');
    expect(cutoffFromDays(JETZT, 1).toISOString()).toBe('2026-06-14T12:00:00.000Z');
  });

  it('gibt Zählen und Löschen dieselbe Grenze', async () => {
    // Driften die beiden auseinander, misst der Trockenlauf etwas anderes,
    // als der Ernstfall tut — und verliert damit seinen Zweck.
    const protokoll: RegelProtokoll = { gezaehlt: [], geloescht: [] };
    await runRetention({
      rules: [testregel('A', { days: 7, protokoll })],
      mode: 'execute',
      now: JETZT,
      runId: 'lauf-1',
    });

    expect(protokoll.gezaehlt).toHaveLength(1);
    expect(protokoll.geloescht).toHaveLength(1);
    expect(protokoll.geloescht[0]?.toISOString()).toBe(protokoll.gezaehlt[0]?.toISOString());
  });

  it('schützt die Löschgrenze vor Mutation durch eine Regel', async () => {
    const gesehen: string[] = [];
    const regel = testregel('MUTATION');
    regel.countCandidates = async (cutoff) => {
      gesehen.push(cutoff.toISOString());
      cutoff.setTime(0);
      return 1;
    };
    regel.deleteCandidates = async (cutoff) => {
      gesehen.push(cutoff.toISOString());
      return 1;
    };

    await runRetention({
      rules: [regel],
      mode: 'execute',
      now: JETZT,
      runId: 'lauf-mutation',
    });

    expect(gesehen).toEqual(['2026-05-16T12:00:00.000Z', '2026-05-16T12:00:00.000Z']);
  });

  it('zählt im Trockenlauf und löscht dabei nicht', async () => {
    const protokoll: RegelProtokoll = { gezaehlt: [], geloescht: [] };
    const bericht = await runRetention({
      rules: [testregel('A', { candidates: 5, deleted: 5, protokoll })],
      mode: 'dry-run',
      now: JETZT,
      runId: 'lauf-2',
    });

    expect(protokoll.gezaehlt).toHaveLength(1);
    expect(protokoll.geloescht).toHaveLength(0);
    expect(bericht.rules[0]?.candidateCount).toBe(5);
    expect(bericht.rules[0]?.deletedCount).toBe(0);
    expect(bericht.totalDeletedCount).toBe(0);
    expect(bericht.status).toBe('success');
  });

  it('behandelt Frist 0 als abgeschaltet, nicht als "alles löschen"', async () => {
    // Der Unterschied ist folgenreich: "0 Tage aufbewahren" wörtlich genommen
    // hieße, alles zu löschen, was älter als der aktuelle Augenblick ist.
    const protokoll: RegelProtokoll = { gezaehlt: [], geloescht: [] };
    const bericht = await runRetention({
      rules: [testregel('A', { days: 0, candidates: 99, deleted: 99, protokoll })],
      mode: 'execute',
      now: JETZT,
      runId: 'lauf-3',
    });

    expect(bericht.rules[0]?.status).toBe('skipped-disabled');
    expect(protokoll.gezaehlt).toHaveLength(0);
    expect(protokoll.geloescht).toHaveLength(0);
    expect(bericht.rules[0]?.cutoff).toBeUndefined();
  });

  it('unterscheidet abgeschaltet von "gelaufen, nichts gefunden"', async () => {
    const bericht = await runRetention({
      rules: [testregel('AUS', { days: 0 }), testregel('LEER', { days: 30, candidates: 0 })],
      mode: 'execute',
      now: JETZT,
      runId: 'lauf-4',
    });

    expect(bericht.rules.map((r) => r.status)).toEqual(['skipped-disabled', 'success']);
    expect(bericht.status).toBe('success');
  });

  it('führt eine zweite angemeldete Regel aus, ohne die erste zu berühren', async () => {
    const ersteProtokoll: RegelProtokoll = { gezaehlt: [], geloescht: [] };
    const zweiteProtokoll: RegelProtokoll = { gezaehlt: [], geloescht: [] };

    const bericht = await runRetention({
      rules: [
        testregel('ERSTE', { days: 30, candidates: 3, deleted: 3, protokoll: ersteProtokoll }),
        testregel('ZWEITE', { days: 90, candidates: 7, deleted: 7, protokoll: zweiteProtokoll }),
      ],
      mode: 'execute',
      now: JETZT,
      runId: 'lauf-5',
    });

    // Eigene Ergebnisse, eigene Fristen, eigene Grenzen.
    expect(bericht.rules.map((r) => r.ruleId)).toEqual(['ERSTE', 'ZWEITE']);
    expect(bericht.rules[0]?.deletedCount).toBe(3);
    expect(bericht.rules[1]?.deletedCount).toBe(7);
    expect(bericht.rules[0]?.retentionDays).toBe(30);
    expect(bericht.rules[1]?.retentionDays).toBe(90);
    expect(ersteProtokoll.gezaehlt[0]?.toISOString()).toBe('2026-05-16T12:00:00.000Z');
    expect(zweiteProtokoll.gezaehlt[0]?.toISOString()).toBe('2026-03-17T12:00:00.000Z');
    expect(bericht.totalDeletedCount).toBe(10);
  });

  it('führt nach einem Regelfehler die übrigen Regeln weiter aus', async () => {
    // Eine kaputte Datenart darf nicht dafür sorgen, dass auf Dauer gar
    // nichts mehr aufgeräumt wird.
    const nachProtokoll: RegelProtokoll = { gezaehlt: [], geloescht: [] };
    const bericht = await runRetention({
      rules: [
        testregel('A', { candidates: 1, deleted: 1 }),
        testregel('B', { wirftBeim: 'loeschen' }),
        testregel('C', { candidates: 2, deleted: 2, protokoll: nachProtokoll }),
      ],
      mode: 'execute',
      now: JETZT,
      runId: 'lauf-6',
    });

    expect(bericht.rules.map((r) => r.status)).toEqual(['success', 'failed', 'success']);
    expect(nachProtokoll.geloescht).toHaveLength(1);
    expect(bericht.status).toBe('partial-failure');
    // Was vor dem Fehler gelöscht wurde, bleibt gelöscht: kein Rückrollen
    // über Regelgrenzen hinweg.
    expect(bericht.totalDeletedCount).toBe(3);
  });

  it('behält bekannte Kennzahlen, wenn erst das Löschen scheitert', async () => {
    const bericht = await runRetention({
      rules: [testregel('A', { days: 30, candidates: 4, wirftBeim: 'loeschen' })],
      mode: 'execute',
      now: JETZT,
      runId: 'lauf-spaeter-fehler',
    });

    expect(bericht.rules[0]).toMatchObject({
      status: 'failed',
      retentionDays: 30,
      cutoff: '2026-05-16T12:00:00.000Z',
      candidateCount: 4,
      deletedCount: 0,
      errorType: 'RangeError',
    });
  });

  it('meldet nur die Fehlerart, nie die Fehlermeldung', async () => {
    const bericht = await runRetention({
      rules: [testregel('A', { wirftBeim: 'zaehlen' })],
      mode: 'execute',
      now: JETZT,
      runId: 'lauf-7',
    });

    expect(bericht.rules[0]?.errorType).toBe('RangeError');
    expect(JSON.stringify(bericht)).not.toContain('fehlgeschlagen');
  });

  it('fängt auch einen Fehler beim Lesen der Frist ab', async () => {
    const bericht = await runRetention({
      rules: [testregel('A', { wirftBeim: 'frist' }), testregel('B', { candidates: 1 })],
      mode: 'dry-run',
      now: JETZT,
      runId: 'lauf-8',
    });

    expect(bericht.rules[0]?.status).toBe('failed');
    expect(bericht.rules[0]?.errorType).toBe('TypeError');
    expect(bericht.rules[1]?.status).toBe('success');
    expect(bericht.status).toBe('partial-failure');
  });

  it('meldet den Lauf als gescheitert, wenn jede Regel scheitert', async () => {
    const bericht = await runRetention({
      rules: [testregel('A', { wirftBeim: 'zaehlen' }), testregel('B', { wirftBeim: 'zaehlen' })],
      mode: 'execute',
      now: JETZT,
      runId: 'lauf-9',
    });

    expect(bericht.status).toBe('failed');
  });

  it('meldet jedes Regelergebnis genau einmal an den Aufrufer', async () => {
    const gemeldet: RetentionRuleResult[] = [];
    await runRetention({
      rules: [testregel('A'), testregel('B', { wirftBeim: 'zaehlen' })],
      mode: 'dry-run',
      now: JETZT,
      runId: 'lauf-10',
      onRuleFinished: (ergebnis) => gemeldet.push(ergebnis),
    });

    expect(gemeldet.map((e) => e.ruleId)).toEqual(['A', 'B']);
  });

  it('trägt Kennung, Modus und Dauer in den Bericht', async () => {
    const bericht = await runRetention({
      rules: [testregel('A')],
      mode: 'dry-run',
      now: JETZT,
      runId: 'lauf-11',
    });

    expect(bericht.runId).toBe('lauf-11');
    expect(bericht.mode).toBe('dry-run');
    expect(bericht.durationMs).toBeGreaterThanOrEqual(0);
    expect(Date.parse(bericht.startedAt)).not.toBeNaN();
    expect(Date.parse(bericht.finishedAt)).not.toBeNaN();
  });
});
