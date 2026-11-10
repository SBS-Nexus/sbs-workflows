import { CONCEPT_CRITERION_BY_SOURCE, type ProgressSource } from './contract.ts';

/** Nur für Tests: eine gültige Schema-1-Antwort der jeweiligen Quelle. */
export function progressBody(
  source: ProgressSource,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> & {
  lessons: Record<string, unknown>;
  concepts: Record<string, unknown>;
  projects: Record<string, unknown>;
} {
  return {
    schemaVersion: 1,
    source,
    generatedAt: '2026-10-04T10:00:00.000Z',
    participation: { hasActivity: true },
    lessons: { completed: 3, total: 12 },
    reviews: { due: 4 },
    concepts: { observed: 6, ready: 2, criterion: CONCEPT_CRITERION_BY_SOURCE[source] },
    activity: { lastActiveAt: '2026-10-03T18:30:00.000Z' },
    projects:
      source === 'python'
        ? { kind: 'accepted', done: 1, total: 5 }
        : source === 'sql'
          ? { kind: 'submitted', done: 1, total: 5 }
          : { kind: 'unsupported' },
    ...overrides,
  } as ReturnType<typeof progressBody>;
}
