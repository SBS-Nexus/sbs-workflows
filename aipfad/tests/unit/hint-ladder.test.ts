import { describe, expect, it } from 'vitest';
import {
  canRevealSolution,
  evaluateHintAvailability,
  followUpAfterSolution,
  visibleHints,
  type HintLadderState,
} from '@/domain/hints/hint-ladder';
import type { Hint } from '@/domain/content/exercise-payload';

const hints: Hint[] = [
  { level: 1, kind: 'impulse', text: 'Denk an den ersten Schritt.' },
  { level: 2, kind: 'concept', text: 'Erinnerung an das Prinzip.' },
  { level: 3, kind: 'structure', text: 'So könnte der Ablauf aussehen.' },
  { level: 4, kind: 'partial', text: 'Ein konkretes Beispiel.' },
  { level: 5, kind: 'explanation', text: 'Die vollständige Erklärung.' },
];

describe('evaluateHintAvailability', () => {
  it('makes level 1 available immediately with zero attempts', () => {
    const state: HintLadderState = { revealedLevel: 0, attempts: 0 };
    const availability = evaluateHintAvailability(hints, state);
    expect(availability[0]?.available).toBe(true);
  });

  it('blocks level 2 until level 1 has been revealed, even with enough attempts', () => {
    const state: HintLadderState = { revealedLevel: 0, attempts: 5 };
    const availability = evaluateHintAvailability(hints, state);
    expect(availability[1]?.available).toBe(false);
    expect(availability[1]?.blockedReason).toContain('Denkimpuls');
  });

  it('requires the configured number of attempts even after the previous level is revealed', () => {
    const state: HintLadderState = { revealedLevel: 1, attempts: 0 };
    const availability = evaluateHintAvailability(hints, state);
    expect(availability[1]?.available).toBe(false);
    expect(availability[1]?.attemptsMissing).toBe(1);
  });

  it('unlocks level 5 only after 3 attempts and level 4 revealed', () => {
    const notYet = evaluateHintAvailability(hints, { revealedLevel: 4, attempts: 2 });
    expect(notYet[4]?.available).toBe(false);

    const ready = evaluateHintAvailability(hints, { revealedLevel: 4, attempts: 3 });
    expect(ready[4]?.available).toBe(true);
  });
});

describe('visibleHints', () => {
  it('never leaks hints beyond the revealed level', () => {
    const state: HintLadderState = { revealedLevel: 2, attempts: 3 };
    const visible = visibleHints(hints, state);
    expect(visible).toHaveLength(2);
    expect(visible.every((h) => h.level <= 2)).toBe(true);
  });

  it('returns nothing when no hint has been revealed', () => {
    expect(visibleHints(hints, { revealedLevel: 0, attempts: 10 })).toHaveLength(0);
  });
});

describe('canRevealSolution', () => {
  it('requires the full ladder revealed plus 3 attempts', () => {
    expect(canRevealSolution({ revealedLevel: 5, attempts: 3 }, hints)).toBe(true);
    expect(canRevealSolution({ revealedLevel: 4, attempts: 3 }, hints)).toBe(false);
    expect(canRevealSolution({ revealedLevel: 5, attempts: 2 }, hints)).toBe(false);
  });

  it('allows solution reveal for exercises with no hints once attempts are met', () => {
    expect(canRevealSolution({ revealedLevel: 0, attempts: 3 }, [])).toBe(true);
  });
});

describe('followUpAfterSolution', () => {
  it('always requires a follow-up exercise without a template', () => {
    const followUp = followUpAfterSolution();
    expect(followUp.required).toBe(true);
    expect(followUp.reason.length).toBeGreaterThan(10);
  });
});
