export const REVIEW_CONTRACT_VERSION = 1 as const;

export const REVIEW_SOURCES = ['python', 'sql', 'git', 'ai', 'language'] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export const REVIEW_SOURCE_UNITS = ['exercise', 'concept', 'term'] as const;
export type ReviewSourceUnit = (typeof REVIEW_SOURCE_UNITS)[number];

export type ReviewSourceItem = {
  contractVersion: typeof REVIEW_CONTRACT_VERSION;
  source: ReviewSource;
  sourceUnit: ReviewSourceUnit;
  sourceItemId: string;
  pathSlug: string;
  conceptId?: string;
  activityId?: string;
  prompt: string;
  answer?: string;
  dueAt: string;
  repetition: number;
  reason?: string;
  launchPath?: string;
};

const ALLOWED_KEYS = new Set<keyof ReviewSourceItem>([
  'contractVersion',
  'source',
  'sourceUnit',
  'sourceItemId',
  'pathSlug',
  'conceptId',
  'activityId',
  'prompt',
  'answer',
  'dueAt',
  'repetition',
  'reason',
  'launchPath',
]);

function isPlainRecord(value: unknown): value is Record<PropertyKey, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readRequiredString(
  input: Record<PropertyKey, unknown>,
  key: keyof ReviewSourceItem,
  maxLength: number,
): string {
  const value = input[key];

  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value
  ) {
    throw new TypeError(`${String(key)} must be a trimmed non-empty string <= ${maxLength}`);
  }

  return value;
}

function readOptionalString(
  input: Record<PropertyKey, unknown>,
  key: keyof ReviewSourceItem,
  maxLength: number,
): string | undefined {
  const value = input[key];
  if (value === undefined) return undefined;

  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value
  ) {
    throw new TypeError(`${String(key)} must be a trimmed non-empty string <= ${maxLength}`);
  }

  return value;
}

function readCanonicalIsoDate(input: Record<PropertyKey, unknown>, key: 'dueAt'): string {
  const value = readRequiredString(input, key, 40);
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new TypeError('dueAt must be a canonical UTC ISO timestamp');
  }

  return value;
}

function readLaunchPath(input: Record<PropertyKey, unknown>): string | undefined {
  const value = readOptionalString(input, 'launchPath', 500);
  if (value === undefined) return undefined;

  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    throw new TypeError('launchPath must be an application-relative path');
  }

  return value;
}

function assertOnlyAllowedOwnKeys(input: Record<PropertyKey, unknown>): void {
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !ALLOWED_KEYS.has(key as keyof ReviewSourceItem)) {
      throw new TypeError(`unknown review source field: ${String(key)}`);
    }
  }
}

export function parseReviewSourceItem(input: unknown): ReviewSourceItem {
  if (!isPlainRecord(input)) {
    throw new TypeError('review source item must be a plain object');
  }

  assertOnlyAllowedOwnKeys(input);

  if (input.contractVersion !== REVIEW_CONTRACT_VERSION) {
    throw new TypeError(`contractVersion must be ${REVIEW_CONTRACT_VERSION}`);
  }

  if (
    typeof input.source !== 'string' ||
    !REVIEW_SOURCES.includes(input.source as ReviewSource)
  ) {
    throw new TypeError('source is not supported');
  }

  if (
    typeof input.sourceUnit !== 'string' ||
    !REVIEW_SOURCE_UNITS.includes(input.sourceUnit as ReviewSourceUnit)
  ) {
    throw new TypeError('sourceUnit is not supported');
  }

  if (
    typeof input.repetition !== 'number' ||
    !Number.isSafeInteger(input.repetition) ||
    input.repetition < 0 ||
    input.repetition > 10_000
  ) {
    throw new TypeError('repetition must be an integer from 0 to 10000');
  }

  return {
    contractVersion: REVIEW_CONTRACT_VERSION,
    source: input.source as ReviewSource,
    sourceUnit: input.sourceUnit as ReviewSourceUnit,
    sourceItemId: readRequiredString(input, 'sourceItemId', 200),
    pathSlug: readRequiredString(input, 'pathSlug', 100),
    conceptId: readOptionalString(input, 'conceptId', 200),
    activityId: readOptionalString(input, 'activityId', 200),
    prompt: readRequiredString(input, 'prompt', 5_000),
    answer: readOptionalString(input, 'answer', 10_000),
    dueAt: readCanonicalIsoDate(input, 'dueAt'),
    repetition: input.repetition,
    reason: readOptionalString(input, 'reason', 1_000),
    launchPath: readLaunchPath(input),
  };
}

export function reviewSourceKey(item: Pick<ReviewSourceItem, 'source' | 'sourceUnit' | 'sourceItemId'>): string {
  return `${item.source}:${item.sourceUnit}:${item.sourceItemId}`;
}

export type ExerciseReviewAdapterInput = {
  source: Extract<ReviewSource, 'python' | 'git' | 'ai'>;
  sourceItemId: string;
  pathSlug: string;
  conceptId?: string;
  prompt: string;
  answer?: string;
  dueAt: Date;
  repetition: number;
  reason?: string;
  launchPath?: string;
};

export function adaptExerciseReview(input: ExerciseReviewAdapterInput): ReviewSourceItem {
  return parseReviewSourceItem({
    contractVersion: REVIEW_CONTRACT_VERSION,
    source: input.source,
    sourceUnit: 'exercise',
    sourceItemId: input.sourceItemId,
    pathSlug: input.pathSlug,
    conceptId: input.conceptId,
    prompt: input.prompt,
    answer: input.answer,
    dueAt: input.dueAt.toISOString(),
    repetition: input.repetition,
    reason: input.reason,
    launchPath: input.launchPath,
  });
}

export type ConceptReviewAdapterInput = {
  sourceItemId: string;
  activityId: string;
  pathSlug: string;
  prompt: string;
  answer?: string;
  dueAt: Date;
  repetition: number;
  reason?: string;
  launchPath?: string;
};

export function adaptSqlConceptReview(input: ConceptReviewAdapterInput): ReviewSourceItem {
  return parseReviewSourceItem({
    contractVersion: REVIEW_CONTRACT_VERSION,
    source: 'sql',
    sourceUnit: 'concept',
    sourceItemId: input.sourceItemId,
    pathSlug: input.pathSlug,
    conceptId: input.sourceItemId,
    activityId: input.activityId,
    prompt: input.prompt,
    answer: input.answer,
    dueAt: input.dueAt.toISOString(),
    repetition: input.repetition,
    reason: input.reason,
    launchPath: input.launchPath,
  });
}

export type LanguageReviewAdapterInput = {
  sourceItemId: string;
  pathSlug: string;
  prompt: string;
  answer: string;
  dueAt: Date;
  repetition: number;
};

export function adaptLanguageTerm(input: LanguageReviewAdapterInput): ReviewSourceItem {
  return parseReviewSourceItem({
    contractVersion: REVIEW_CONTRACT_VERSION,
    source: 'language',
    sourceUnit: 'term',
    sourceItemId: input.sourceItemId,
    pathSlug: input.pathSlug,
    prompt: input.prompt,
    answer: input.answer,
    dueAt: input.dueAt.toISOString(),
    repetition: input.repetition,
  });
}
