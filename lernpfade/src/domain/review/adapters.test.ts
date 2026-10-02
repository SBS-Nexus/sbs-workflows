import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptExerciseReview, adaptSqlConceptReview } from './adapters.ts';

const DUE = new Date('2026-10-03T09:00:00.000Z');

test('maps Python/AIPfad exercise queues without losing scheduling context', () => {
  const item = adaptExerciseReview('python', {
    exerciseId: 'ex_1',
    exerciseSlug: 'listen-verstehen',
    exerciseTitle: 'Listen verstehen',
    conceptIds: ['concept-list'],
    prompt: 'Was erzeugt eine List Comprehension?',
    answer: 'Eine neue Liste.',
    dueAt: DUE,
    repetition: 3,
    reason: 'Regulärer Wiederholungsplan',
  });

  assert.equal(item.source, 'python');
  assert.equal(item.sourceKind, 'exercise');
  assert.equal(item.sourceItemId, 'ex_1');
  assert.equal(item.repetition, 3);
  assert.equal(item.reason, 'Regulärer Wiederholungsplan');
  assert.deepEqual(item.conceptIds, ['concept-list']);
  assert.equal(item.dueAt, DUE.toISOString());
});

test('preserves SQL concept identity instead of pretending the selected exercise is the review identity', () => {
  const item = adaptSqlConceptReview({
    conceptId: 'concept-left-join',
    conceptSlug: 'left-join',
    conceptTitle: 'LEFT JOIN',
    exerciseSlug: 'kunden-ohne-bestellung',
    prompt: 'Welche Zeilen bleiben bei LEFT JOIN erhalten?',
    answer: 'Alle Zeilen der linken Tabelle.',
    dueAt: DUE,
  });

  assert.equal(item.source, 'sql');
  assert.equal(item.sourceKind, 'concept');
  assert.equal(item.sourceItemId, 'concept-left-join');
  assert.deepEqual(item.conceptIds, ['concept-left-join']);
});

test('fails closed for invalid dates and empty prompts', () => {
  assert.throws(
    () =>
      adaptExerciseReview('ai', {
        exerciseId: 'ex',
        exerciseSlug: 'embedding',
        exerciseTitle: 'Embedding',
        conceptIds: [],
        prompt: '',
        answer: 'Antwort',
        dueAt: DUE,
        repetition: 0,
        reason: 'Plan',
      }),
    TypeError,
  );

  assert.throws(
    () =>
      adaptSqlConceptReview({
        conceptId: 'c',
        conceptSlug: 'c',
        conceptTitle: 'C',
        exerciseSlug: 'e',
        prompt: 'P',
        answer: 'A',
        dueAt: new Date(Number.NaN),
      }),
    TypeError,
  );
});
