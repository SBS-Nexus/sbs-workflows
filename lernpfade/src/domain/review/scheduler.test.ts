import assert from 'node:assert/strict';
import test from 'node:test';
import { initialReviewState, isDue, scheduleReview } from './scheduler.ts';

const NOW = new Date('2026-10-01T12:00:00.000Z');

test('starts due immediately', () => {
  const state = initialReviewState('x', NOW);
  assert.equal(isDue(state, NOW), true);
});

test('schedules a good first answer for one day', () => {
  const result = scheduleReview(initialReviewState('x', NOW), 'good', NOW);
  assert.equal(result.state.intervalDays, 1);
  assert.equal(result.state.repetitions, 1);
  assert.equal(result.nextDueLabel, 'morgen');
});

test('resets repetitions after again and lowers ease', () => {
  const initial = {
    ...initialReviewState('x', NOW),
    repetitions: 4,
    intervalDays: 20,
    ease: 2.2,
  };
  const result = scheduleReview(initial, 'again', NOW);
  assert.equal(result.state.repetitions, 0);
  assert.equal(result.state.intervalDays, 1);
  assert.equal(result.state.ease, 2);
});

test('never lets hard reviews push ease below 1.3', () => {
  const initial = {
    ...initialReviewState('x', NOW),
    repetitions: 5,
    intervalDays: 10,
    ease: 1.3,
  };
  assert.equal(scheduleReview(initial, 'hard', NOW).state.ease, 1.3);
});

test('rejects invalid persisted state instead of silently scheduling it', () => {
  const invalid = { ...initialReviewState('x', NOW), ease: Number.NaN };
  assert.throws(() => scheduleReview(invalid, 'good', NOW), TypeError);
});
