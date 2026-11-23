import type { ReviewDomain } from './model';

export type ReviewSource = 'python' | 'sql' | 'git' | 'ai' | 'language';
export type ReviewSourceKind = 'exercise' | 'concept' | 'vocabulary';

export type ReviewSourceItem = {
  source: ReviewSource;
  sourceKind: ReviewSourceKind;
  sourceItemId: string;
  pathSlug: string;
  conceptIds: readonly string[];
  prompt: string;
  answer: string;
  dueAt: string;
  repetition?: number;
  reason?: string;
};

export type PythonLikeReviewInput = {
  exerciseId: string;
  exerciseSlug: string;
  exerciseTitle: string;
  conceptIds: readonly string[];
  prompt: string;
  answer: string;
  dueAt: Date;
  repetition: number;
  reason: string;
};

export type SqlConceptReviewInput = {
  conceptId: string;
  conceptSlug: string;
  conceptTitle: string;
  exerciseSlug: string;
  prompt: string;
  answer: string;
  dueAt: Date;
};

export function sourceToDomain(source: ReviewSource): ReviewDomain {
  return source === 'language' ? 'language' : source;
}
