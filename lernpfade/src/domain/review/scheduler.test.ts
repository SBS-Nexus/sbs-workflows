import { describe, expect, it } from 'vitest';
import { initialReviewState, isDue, scheduleReview } from './scheduler';

const NOW = new Date('2026-10-01T12:00:00.000Z');

describe('review scheduler', () => {
  it('starts due immediately', () => {
    const state = initialReviewState('x', NOW);
    expect(isDue(state, NOW)).toBe(true);
  });

  it('schedules a good first answer for one day', () => {
    const result = scheduleReview(initialReviewState('x', NOW), 'good', NOW);
    expect(result.state.intervalDays).toBe(1);
    expect(result.state.repetitions).toBe(1);
    expect(result.nextDueLabel).toBe('morgen');
  });

  it('resets repetitions after again and lowers ease', () => {
    const initial = {
      ...initialReviewState('x', NOW),
      repetitions: 4,
      intervalDays: 20,
      ease: 2.2,
    };
    const result = scheduleReview(initial, 'again', NOW);
    expect(result.state.repetitions).toBe(0);
    expect(result.state.intervalDays).toBe(1);
    expect(result.state.ease).toBe(2);
  });

  it('never lets hard reviews push ease below 1.3', () => {
    const initial = {
      ...initialReviewState('x', NOW),
      repetitions: 5,
      intervalDays: 10,
      ease: 1.3,
    };
    expect(scheduleReview(initial, 'hard', NOW).state.ease).toBe(1.3);
  });

  it('rejects invalid persisted state instead of silently scheduling it', () => {
    const invalid = { ...initialReviewState('x', NOW), ease: Number.NaN };
    expect(() => scheduleReview(invalid, 'good', NOW)).toThrow(TypeError);
  });
});
