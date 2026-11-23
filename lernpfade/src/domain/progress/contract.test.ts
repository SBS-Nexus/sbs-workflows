import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_PROGRESS_COUNT,
  ProgressContractError,
  parseSourceProgress,
  type ProgressSource,
} from './contract.ts';
import { progressBody } from './testing.ts';

function rejects(body: unknown, source: ProgressSource = 'python', label = ''): void {
  assert.throws(() => parseSourceProgress(body, source), ProgressContractError, label);
}

test('schema v1 is accepted for every source with its own semantics', () => {
  assert.deepEqual(parseSourceProgress(progressBody('python'), 'python'), {
    source: 'python',
    generatedAt: '2026-10-04T10:00:00.000Z',
    hasActivity: true,
    lessons: { completed: 3, total: 12 },
    reviewsDue: 4,
    concepts: { observed: 6, ready: 2, criterion: 'prerequisite-ready' },
    lastActiveAt: '2026-10-03T18:30:00.000Z',
    projects: { kind: 'accepted', done: 1, total: 5 },
  });
  const sql = parseSourceProgress(progressBody('sql'), 'sql');
  assert.equal(sql.concepts.criterion, 'all-assessable-tasks-last-passed');
  assert.deepEqual(sql.projects, { kind: 'submitted', done: 1, total: 5 });
  assert.deepEqual(parseSourceProgress(progressBody('ai'), 'ai').projects, { kind: 'unsupported' });
});

test('an empty, authenticated source is a valid zero — with null activity', () => {
  const empty = progressBody('python', {
    participation: { hasActivity: false },
    lessons: { completed: 0, total: 12 },
    reviews: { due: 0 },
    concepts: { observed: 0, ready: 0, criterion: 'prerequisite-ready' },
    activity: { lastActiveAt: null },
    projects: { kind: 'accepted', done: 0, total: 5 },
  });
  const parsed = parseSourceProgress(empty, 'python');
  assert.equal(parsed.hasActivity, false);
  assert.equal(parsed.lastActiveAt, null);
});

test('unknown version is rejected, not interpreted', () => {
  for (const schemaVersion of [0, 2, '1', null, undefined]) {
    rejects({ ...progressBody('python'), schemaVersion }, 'python', String(schemaVersion));
  }
});

test('unknown or missing fields are rejected at every level — no room for personal data', () => {
  const body = progressBody('python');
  rejects({ ...body, userId: 'u1' });
  rejects({ ...body, email: 'a@b.example' });
  rejects({ ...body, name: 'Anna' });
  rejects({ ...body, lessons: { ...body.lessons, titles: ['Variablen'] } });
  rejects({ ...body, concepts: { ...body.concepts, score: 87 } });
  rejects({ ...body, activity: { lastActiveAt: null, sessionId: 's1' } });
  rejects({ ...body, projects: { ...body.projects, names: ['Taschenrechner'] } });
  const { reviews: _omitted, ...withoutReviews } = body;
  rejects(withoutReviews);
  rejects(JSON.parse('{"__proto__":{"x":1},"schemaVersion":1}'));
  rejects([body]);
  rejects(null);
  rejects('ok');
});

test('negative, fractional, NaN-like, infinite, oversized and non-number values are rejected', () => {
  const body = progressBody('python');
  for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_PROGRESS_COUNT + 1, '3', null, true]) {
    rejects({ ...body, reviews: { due: bad } }, 'python', `reviews.due=${String(bad)}`);
    rejects({ ...body, lessons: { completed: 0, total: bad } }, 'python', `lessons.total=${String(bad)}`);
    rejects({ ...body, concepts: { observed: bad, ready: 0, criterion: 'prerequisite-ready' } });
  }
});

test('completed > total, ready > observed and done > total are rejected', () => {
  const body = progressBody('python');
  rejects({ ...body, lessons: { completed: 13, total: 12 } });
  rejects({ ...body, concepts: { observed: 2, ready: 3, criterion: 'prerequisite-ready' } });
  rejects({ ...body, projects: { kind: 'accepted', done: 6, total: 5 } });
});

test('timestamps must be real ISO-8601 UTC instants', () => {
  const body = progressBody('python');
  for (const bad of ['2026-02-30T10:00:00.000Z', '2026-10-04 10:00', '2026-10-04T10:00:00+02:00', 'gestern', 0, '']) {
    rejects({ ...body, generatedAt: bad }, 'python', String(bad));
    rejects({ ...body, activity: { lastActiveAt: bad } }, 'python', String(bad));
  }
});

test('the source must match the configured source', () => {
  rejects(progressBody('sql'), 'python');
  rejects({ ...progressBody('python'), source: 'git' }, 'python');
});

test('source-specific semantics cannot be swapped', () => {
  // SQL darf keine Voraussetzungsschwelle behaupten, Python/AIPfad nicht SQLs Kriterium.
  rejects({ ...progressBody('sql'), concepts: { observed: 6, ready: 2, criterion: 'prerequisite-ready' } }, 'sql');
  rejects(
    { ...progressBody('python'), concepts: { observed: 6, ready: 2, criterion: 'all-assessable-tasks-last-passed' } },
    'python',
  );
  // SQL nimmt nicht ab; PythonPfad meldet nicht bloß „abgegeben"; AIPfad hat keine Projekte.
  rejects({ ...progressBody('sql'), projects: { kind: 'accepted', done: 1, total: 5 } }, 'sql');
  rejects({ ...progressBody('python'), projects: { kind: 'submitted', done: 1, total: 5 } }, 'python');
  rejects({ ...progressBody('ai'), projects: { kind: 'accepted', done: 0, total: 0 } }, 'ai');
  rejects({ ...progressBody('python'), projects: { kind: 'unsupported' } }, 'python');
});

test('"no activity" next to existing evidence is contradictory', () => {
  const body = progressBody('python');
  rejects({ ...body, participation: { hasActivity: false } });
});
