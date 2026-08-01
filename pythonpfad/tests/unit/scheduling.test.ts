import { describe, expect, it } from 'vitest';
import {
  BASE_INTERVALS_DAYS,
  MAX_INTERVAL_DAYS,
  addDays,
  buildReviewBatch,
  daysBetween,
  formatInterval,
  isDue,
  scheduleNextReview,
  type InterleaveCandidate,
} from '@/domain/scheduling/spaced-repetition';
import { INITIAL_MASTERY_STATE, type MasteryState } from '@/domain/mastery/mastery';

const NOW = new Date('2026-03-01T10:00:00Z');

function mastery(overrides: Partial<MasteryState> = {}): MasteryState {
  return { ...INITIAL_MASTERY_STATE, ...overrides };
}

describe('scheduleNextReview', () => {
  it('plant nach einem Misserfolg mit Konzeptfehler sofort in derselben Einheit', () => {
    const result = scheduleNextReview({
      mastery: mastery(),
      repetition: 3,
      passed: false,
      hintsUsed: 0,
      errorType: 'LOGIC',
      now: NOW,
    });

    expect(result.intervalDays).toBe(0);
    expect(result.repetition).toBe(0);
    expect(result.reason).toContain('direkt in dieser Lerneinheit');
  });

  it('setzt nach einem reinen Syntaxfehler nicht vollständig zurück', () => {
    const result = scheduleNextReview({
      mastery: mastery(),
      repetition: 3,
      passed: false,
      hintsUsed: 0,
      errorType: 'SYNTAX',
      now: NOW,
    });

    expect(result.intervalDays).toBe(1);
    expect(result.repetition).toBe(2);
    expect(result.reason).toContain('Schreibweise');
  });

  it('verlängert das Intervall mit jeder erfolgreichen Wiederholung', () => {
    let repetition = 0;
    let state = mastery();
    const intervalle: number[] = [];

    for (let i = 0; i < 5; i += 1) {
      const result = scheduleNextReview({
        mastery: state,
        repetition,
        passed: true,
        hintsUsed: 0,
        errorType: 'NONE',
        now: NOW,
      });
      intervalle.push(result.intervalDays);
      repetition = result.repetition;
      state = mastery({ stability: state.stability * 1.5, masteryScore: 60 + i * 8 });
    }

    for (let i = 1; i < intervalle.length; i += 1) {
      expect(intervalle[i]!).toBeGreaterThan(intervalle[i - 1]!);
    }
  });

  it('orientiert sich an der Basisleiter des Lernmodells', () => {
    // Erste erfolgreiche Wiederholung -> Basiswert 1 Tag, moduliert.
    const result = scheduleNextReview({
      mastery: mastery({ masteryScore: 65 }),
      repetition: 0,
      passed: true,
      hintsUsed: 0,
      errorType: 'NONE',
      now: NOW,
    });

    expect(BASE_INTERVALS_DAYS[1]).toBe(1);
    expect(result.intervalDays).toBeGreaterThan(0);
    expect(result.intervalDays).toBeLessThan(3);
  });

  it('kürzt das Intervall, wenn viele Hinweise nötig waren', () => {
    const ohneHilfe = scheduleNextReview({
      mastery: mastery({ masteryScore: 70 }),
      repetition: 2,
      passed: true,
      hintsUsed: 0,
      errorType: 'NONE',
      now: NOW,
    });
    const mitHilfe = scheduleNextReview({
      mastery: mastery({ masteryScore: 70 }),
      repetition: 2,
      passed: true,
      hintsUsed: 4,
      errorType: 'NONE',
      now: NOW,
    });

    expect(mitHilfe.intervalDays).toBeLessThan(ohneHilfe.intervalDays);
    expect(mitHilfe.reason).toContain('deutlicher Hilfe');
  });

  it('kürzt das Intervall bei Unsicherheit trotz richtiger Lösung', () => {
    const sicher = scheduleNextReview({
      mastery: mastery({ masteryScore: 70 }),
      repetition: 2,
      passed: true,
      hintsUsed: 0,
      errorType: 'NONE',
      confidenceBefore: 'VERY_SURE',
      now: NOW,
    });
    const unsicher = scheduleNextReview({
      mastery: mastery({ masteryScore: 70 }),
      repetition: 2,
      passed: true,
      hintsUsed: 0,
      errorType: 'NONE',
      confidenceBefore: 'UNSURE',
      now: NOW,
    });

    expect(unsicher.intervalDays).toBeLessThan(sicher.intervalDays);
    expect(unsicher.reason).toContain('Unsicherheit');
  });

  it('überschreitet die Obergrenze nie', () => {
    const result = scheduleNextReview({
      mastery: mastery({ masteryScore: 100, stability: 400, difficulty: 1, transferSuccesses: 9 }),
      repetition: 20,
      passed: true,
      hintsUsed: 0,
      errorType: 'NONE',
      now: NOW,
    });

    expect(result.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it('setzt dueAt passend zum Intervall', () => {
    const result = scheduleNextReview({
      mastery: mastery({ masteryScore: 70 }),
      repetition: 1,
      passed: true,
      hintsUsed: 0,
      errorType: 'NONE',
      now: NOW,
    });

    const erwartet = addDays(NOW, result.intervalDays);
    expect(Math.abs(result.dueAt.getTime() - erwartet.getTime())).toBeLessThan(1000);
  });
});

describe('Hilfsfunktionen', () => {
  it('isDue erkennt fällige Termine einschließlich des exakten Zeitpunkts', () => {
    expect(isDue(NOW, NOW)).toBe(true);
    expect(isDue(addDays(NOW, -1), NOW)).toBe(true);
    expect(isDue(addDays(NOW, 1), NOW)).toBe(false);
  });

  it('daysBetween rechnet in Tagen und wird nie negativ', () => {
    expect(daysBetween(NOW, addDays(NOW, 3))).toBeCloseTo(3, 5);
    expect(daysBetween(addDays(NOW, 3), NOW)).toBe(0);
  });

  it('formatInterval formuliert verständlich auf Deutsch', () => {
    expect(formatInterval(0)).toBe('dieser Lerneinheit');
    expect(formatInterval(1)).toBe('einem Tag');
    expect(formatInterval(7)).toBe('7 Tagen');
    expect(formatInterval(30)).toBe('etwa einem Monat');
    expect(formatInterval(60)).toBe('etwa 2 Monaten');
  });
});

describe('buildReviewBatch', () => {
  function candidate(
    id: string,
    conceptIds: string[],
    dueOffsetDays: number,
    masteryScore = 50,
  ): InterleaveCandidate {
    return {
      exerciseId: id,
      conceptIds,
      dueAt: addDays(NOW, dueOffsetDays),
      masteryScore,
      introducedIndex: 0,
    };
  }

  it('liefert nur fällige Aufgaben', () => {
    const batch = buildReviewBatch([candidate('a', ['k1'], -1), candidate('b', ['k2'], 2)], {
      now: NOW,
      maxItems: 10,
    });

    expect(batch.map((c) => c.exerciseId)).toEqual(['a']);
  });

  it('stellt überfällige Aufgaben nach vorn', () => {
    const batch = buildReviewBatch([candidate('neu', ['k1'], 0), candidate('alt', ['k2'], -5)], {
      now: NOW,
      maxItems: 10,
      minConceptsForInterleaving: 99,
    });

    expect(batch[0]?.exerciseId).toBe('alt');
  });

  it('begrenzt auf die gewünschte Anzahl', () => {
    const candidates = Array.from({ length: 20 }, (_, i) => candidate(`e${i}`, [`k${i}`], -1));
    const batch = buildReviewBatch(candidates, { now: NOW, maxItems: 5 });
    expect(batch).toHaveLength(5);
  });

  it('mischt Konzepte, sobald genügend verschiedene vorliegen', () => {
    const candidates = [
      candidate('a1', ['k1'], -1),
      candidate('a2', ['k1'], -1),
      candidate('b1', ['k2'], -1),
      candidate('c1', ['k3'], -1),
    ];

    const batch = buildReviewBatch(candidates, { now: NOW, maxItems: 10 });

    let aufeinanderfolgendGleich = 0;
    for (let i = 1; i < batch.length; i += 1) {
      const vorher = batch[i - 1]!.conceptIds;
      const jetzt = batch[i]!.conceptIds;
      if (jetzt.some((id) => vorher.includes(id))) aufeinanderfolgendGleich += 1;
    }

    expect(aufeinanderfolgendGleich).toBe(0);
    expect(batch).toHaveLength(4);
  });

  it('mischt bei Anfängern noch nicht (Überforderungsschutz)', () => {
    const candidates = [candidate('a1', ['k1'], -1), candidate('a2', ['k1'], -1)];
    const batch = buildReviewBatch(candidates, { now: NOW, maxItems: 10 });

    // Nur ein Konzept vorhanden – die Reihenfolge bleibt unverändert.
    expect(batch.map((c) => c.exerciseId)).toEqual(['a1', 'a2']);
  });
});
