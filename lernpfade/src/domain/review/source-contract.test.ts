import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptExerciseReview,
  adaptLanguageTerm,
  adaptSqlConceptReview,
  parseReviewSourceItem,
  reviewSourceKey,
} from './source-contract.ts';

const DUE = new Date('2026-10-02T08:00:00.000Z');

test('maps Python/AIPfad exercise scheduling without losing source identity', () => {
  const item = adaptExerciseReview({
    source: 'python',
    sourceItemId: 'exercise:list-comprehension-1',
    pathSlug: 'python',
    conceptId: 'list-comprehension',
    prompt: 'Welche Liste entsteht?',
    answer: '[2, 4, 6]',
    dueAt: DUE,
    repetition: 3,
    reason: 'Regulärer Wiederholungsplan',
    launchPath: '/wiederholen/list-comprehension-1',
  });

  assert.equal(item.source, 'python');
  assert.equal(item.sourceUnit, 'exercise');
  assert.equal(item.sourceItemId, 'exercise:list-comprehension-1');
  assert.equal(item.conceptId, 'list-comprehension');
  assert.equal(item.dueAt, DUE.toISOString());
  assert.equal(item.repetition, 3);
});

test('preserves SQL concept identity separately from the selected activity', () => {
  const item = adaptSqlConceptReview({
    sourceItemId: 'left-join',
    activityId: 'exercise:left-join-orders',
    pathSlug: 'sql',
    prompt: 'Welche Zeilen bleiben bei einem LEFT JOIN erhalten?',
    answer: 'Alle Zeilen der linken Tabelle.',
    dueAt: DUE,
    repetition: 4,
    reason: 'Konzept ist fällig; Aufgabe wurde aus dem Konzept gewählt.',
    launchPath: '/ueben?konzept=left-join',
  });

  assert.equal(item.source, 'sql');
  assert.equal(item.sourceUnit, 'concept');
  assert.equal(item.sourceItemId, 'left-join');
  assert.equal(item.conceptId, 'left-join');
  assert.equal(item.activityId, 'exercise:left-join-orders');
});

test('maps language terms through the same contract', () => {
  const item = adaptLanguageTerm({
    sourceItemId: 'en:retrieval',
    pathSlug: 'vokabeln',
    prompt: 'retrieval',
    answer: 'Abruf · Wiederauffinden',
    dueAt: DUE,
    repetition: 2,
  });

  assert.equal(item.source, 'language');
  assert.equal(item.sourceUnit, 'term');
  assert.equal(item.answer, 'Abruf · Wiederauffinden');
});

test('namespaces duplicate source IDs by source and source unit', () => {
  const pythonKey = reviewSourceKey({
    source: 'python',
    sourceUnit: 'exercise',
    sourceItemId: '42',
  });
  const sqlKey = reviewSourceKey({
    source: 'sql',
    sourceUnit: 'concept',
    sourceItemId: '42',
  });

  assert.notEqual(pythonKey, sqlKey);
});

test('rejects unknown fields including userId', () => {
  assert.throws(
    () =>
      parseReviewSourceItem({
        contractVersion: 1,
        source: 'python',
        sourceUnit: 'exercise',
        sourceItemId: 'x',
        pathSlug: 'python',
        prompt: 'Prompt',
        dueAt: DUE.toISOString(),
        repetition: 0,
        userId: 'must-not-cross-the-contract',
      }),
    /unknown review source field: userId/,
  );
});

test('rejects external launch URLs', () => {
  assert.throws(
    () =>
      parseReviewSourceItem({
        contractVersion: 1,
        source: 'ai',
        sourceUnit: 'exercise',
        sourceItemId: 'x',
        pathSlug: 'ai',
        prompt: 'Prompt',
        dueAt: DUE.toISOString(),
        repetition: 0,
        launchPath: 'https://example.com',
      }),
    /application-relative path/,
  );
});

test('rejects ambiguous non-UTC due dates', () => {
  assert.throws(
    () =>
      parseReviewSourceItem({
        contractVersion: 1,
        source: 'sql',
        sourceUnit: 'concept',
        sourceItemId: 'x',
        pathSlug: 'sql',
        prompt: 'Prompt',
        dueAt: '2026-10-02',
        repetition: 0,
      }),
    /canonical UTC ISO timestamp/,
  );
});

test('rejects objects with a custom prototype', () => {
  const value = Object.create({ inherited: true }) as Record<string, unknown>;
  Object.assign(value, {
    contractVersion: 1,
    source: 'python',
    sourceUnit: 'exercise',
    sourceItemId: 'x',
    pathSlug: 'python',
    prompt: 'Prompt',
    dueAt: DUE.toISOString(),
    repetition: 0,
  });

  assert.throws(() => parseReviewSourceItem(value), /plain object/);
});
