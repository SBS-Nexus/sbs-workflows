import type {
  PythonLikeReviewInput,
  ReviewSource,
  ReviewSourceItem,
  SqlConceptReviewInput,
} from './source';

function iso(value: Date): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new TypeError('review dueAt must be a valid Date');
  }
  return value.toISOString();
}

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${field} must not be empty`);
  return normalized;
}

export function adaptExerciseReview(
  source: Extract<ReviewSource, 'python' | 'git' | 'ai'>,
  input: PythonLikeReviewInput,
): ReviewSourceItem {
  return {
    source,
    sourceKind: 'exercise',
    sourceItemId: requiredText(input.exerciseId, 'exerciseId'),
    pathSlug: source,
    conceptIds: [...input.conceptIds],
    prompt: requiredText(input.prompt, 'prompt'),
    answer: requiredText(input.answer, 'answer'),
    dueAt: iso(input.dueAt),
    repetition: Math.max(0, Math.trunc(input.repetition)),
    reason: requiredText(input.reason, 'reason'),
  };
}

export function adaptSqlConceptReview(input: SqlConceptReviewInput): ReviewSourceItem {
  return {
    source: 'sql',
    sourceKind: 'concept',
    sourceItemId: requiredText(input.conceptId, 'conceptId'),
    pathSlug: 'sql',
    conceptIds: [requiredText(input.conceptId, 'conceptId')],
    prompt: requiredText(input.prompt, 'prompt'),
    answer: requiredText(input.answer, 'answer'),
    dueAt: iso(input.dueAt),
  };
}
