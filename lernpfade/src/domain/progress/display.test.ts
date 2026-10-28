import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSourceProgress } from './contract.ts';
import { lastActiveOf } from './display.ts';
import { progressBody } from './testing.ts';

test('a reported timestamp is shown as that timestamp', () => {
  const progress = parseSourceProgress(progressBody('python'), 'python');
  assert.deepEqual(lastActiveOf(progress), { kind: 'timestamp', at: '2026-10-03T18:30:00.000Z' });
});

test('activity without a known timestamp is valid and never reads as "never"', () => {
  // Begonnene Lektion, aber weder Versuch noch Abschluss: Aktivität ja, Zeitpunkt unbekannt.
  const progress = parseSourceProgress(
    progressBody('ai', {
      participation: { hasActivity: true },
      lessons: { completed: 0, total: 12 },
      reviews: { due: 0 },
      concepts: { observed: 0, ready: 0, criterion: 'prerequisite-ready' },
      activity: { lastActiveAt: null },
    }),
    'ai',
  );
  assert.equal(progress.hasActivity, true);
  assert.equal(progress.lastActiveAt, null);
  assert.deepEqual(lastActiveOf(progress), { kind: 'unrecorded' });
});

test('no activity and no timestamp is "never"', () => {
  const progress = parseSourceProgress(
    progressBody('sql', {
      participation: { hasActivity: false },
      lessons: { completed: 0, total: 20 },
      reviews: { due: 0 },
      concepts: { observed: 0, ready: 0, criterion: 'all-assessable-tasks-last-passed' },
      activity: { lastActiveAt: null },
      projects: { kind: 'submitted', done: 0, total: 4 },
    }),
    'sql',
  );
  assert.deepEqual(lastActiveOf(progress), { kind: 'never' });
});
