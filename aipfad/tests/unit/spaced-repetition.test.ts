import { describe, expect, it } from 'vitest';
import {
  BASE_INTERVALS_DAYS,
  MAX_INTERVAL_DAYS,
  buildReviewBatch,
  scheduleNextReview,
  type InterleaveCandidate,
  type ScheduleInput,
} from '@/domain/scheduling/spaced-repetition';
import { INITIAL_MASTERY_STATE } from '@/domain/mastery/mastery';

const now = new Date('2026-01-01T00:00:00Z');

const baseInput: ScheduleInput = {
  mastery: { ...INITIAL_MASTERY_STATE, stability: 4, difficulty: 2.5, masteryScore: 50 },
  repetition: 0,
  passed: true,
  hintsUsed: 0,
  errorType: 'NONE',
  now,
};

describe('scheduleNextReview', () => {
  it('resets to the same session on a MISCONCEPTION failure', () => {
    const result = scheduleNextReview({ ...baseInput, passed: false, errorType: 'MISCONCEPTION' });
    expect(result.repetition).toBe(0);
    expect(result.intervalDays).toBe(0);
  });

  it('only steps back one level on a SURFACE failure, reviewed the next day', () => {
    const result = scheduleNextReview({
      ...baseInput,
      passed: false,
      errorType: 'SURFACE',
      repetition: 3,
    });
    expect(result.repetition).toBe(2);
    expect(result.intervalDays).toBe(1);
  });

  it('advances along the base interval ladder on success', () => {
    const result = scheduleNextReview({ ...baseInput, repetition: 0 });
    expect(result.repetition).toBe(1);
    // BASE_INTERVALS_DAYS[1] = 1, modulated by hint/stability/difficulty factors.
    expect(result.intervalDays).toBeGreaterThan(0);
  });

  it('gives a longer interval for hint-free solutions than heavily-hinted ones', () => {
    const noHints = scheduleNextReview({ ...baseInput, hintsUsed: 0, repetition: 2 });
    const heavyHints = scheduleNextReview({ ...baseInput, hintsUsed: 3, repetition: 2 });
    expect(noHints.intervalDays).toBeGreaterThan(heavyHints.intervalDays);
  });

  it('extends the interval for high mastery and shortens it for low mastery', () => {
    const highMastery = scheduleNextReview({
      ...baseInput,
      repetition: 2,
      mastery: { ...baseInput.mastery, masteryScore: 95 },
    });
    const lowMastery = scheduleNextReview({
      ...baseInput,
      repetition: 2,
      mastery: { ...baseInput.mastery, masteryScore: 50 },
    });
    expect(highMastery.intervalDays).toBeGreaterThan(lowMastery.intervalDays);
  });

  it('never exceeds the maximum interval cap', () => {
    const result = scheduleNextReview({
      ...baseInput,
      repetition: 5,
      hintsUsed: 0,
      mastery: {
        ...baseInput.mastery,
        masteryScore: 99,
        stability: 400,
        difficulty: 1,
        transferSuccesses: 5,
      },
    });
    expect(result.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it('shortens the interval when the learner was unsure despite being correct', () => {
    const sure = scheduleNextReview({ ...baseInput, repetition: 2, confidenceBefore: 'VERY_SURE' });
    const unsure = scheduleNextReview({ ...baseInput, repetition: 2, confidenceBefore: 'UNSURE' });
    expect(unsure.intervalDays).toBeLessThan(sure.intervalDays);
  });

  it('exposes the base ladder as [0,1,3,7,14,30]', () => {
    expect(BASE_INTERVALS_DAYS).toEqual([0, 1, 3, 7, 14, 30]);
  });
});

describe('buildReviewBatch', () => {
  function candidate(overrides: Partial<InterleaveCandidate>): InterleaveCandidate {
    return {
      exerciseId: 'ex-1',
      conceptIds: ['concept-a'],
      dueAt: new Date('2025-01-01'),
      masteryScore: 50,
      introducedIndex: 0,
      ...overrides,
    };
  }

  it('only includes items that are actually due', () => {
    const due = candidate({ exerciseId: 'due', dueAt: new Date('2025-12-01') });
    const future = candidate({ exerciseId: 'future', dueAt: new Date('2027-01-01') });
    const batch = buildReviewBatch([due, future], { now, maxItems: 10 });
    expect(batch.map((c) => c.exerciseId)).toEqual(['due']);
  });

  it('does not interleave below the beginner-protection threshold', () => {
    const items = [
      candidate({ exerciseId: 'a', conceptIds: ['x'], masteryScore: 10 }),
      candidate({ exerciseId: 'b', conceptIds: ['x'], masteryScore: 20 }),
    ];
    const batch = buildReviewBatch(items, { now, maxItems: 10, minConceptsForInterleaving: 3 });
    expect(batch).toHaveLength(2);
  });

  it('spreads same-concept items apart once enough concepts are introduced', () => {
    const items: InterleaveCandidate[] = [
      candidate({ exerciseId: 'a1', conceptIds: ['a'], masteryScore: 10 }),
      candidate({ exerciseId: 'a2', conceptIds: ['a'], masteryScore: 20 }),
      candidate({ exerciseId: 'b1', conceptIds: ['b'], masteryScore: 30 }),
      candidate({ exerciseId: 'c1', conceptIds: ['c'], masteryScore: 40 }),
    ];
    const batch = buildReviewBatch(items, { now, maxItems: 10, minConceptsForInterleaving: 3 });
    const conceptSequence = batch.map((c) => c.conceptIds[0]);
    for (let i = 1; i < conceptSequence.length; i++) {
      expect(conceptSequence[i]).not.toBe(conceptSequence[i - 1]);
    }
  });

  it('caps the batch at maxItems', () => {
    const items = Array.from({ length: 20 }, (_, i) => candidate({ exerciseId: `ex-${i}` }));
    const batch = buildReviewBatch(items, { now, maxItems: 12 });
    expect(batch).toHaveLength(12);
  });
});
