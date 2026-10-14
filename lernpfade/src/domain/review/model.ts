export type ReviewDomain = 'language' | 'python' | 'sql' | 'git' | 'ai';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type ReviewItem = {
  id: string;
  domain: ReviewDomain;
  pathSlug?: string;
  conceptSlug?: string;
  prompt: string;
  answer: string;
  example?: string;
};

export type ReviewState = {
  itemId: string;
  dueAt: string;
  intervalDays: number;
  ease: number;
  repetitions: number;
  lastRating?: ReviewRating;
};

export type ReviewResult = {
  state: ReviewState;
  nextDueLabel: string;
};
