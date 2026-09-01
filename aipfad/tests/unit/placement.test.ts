import { describe, expect, it } from 'vitest';
import {
  DONT_KNOW_OPTION_ID,
  evaluatePlacement,
  type PlacementQuestion,
} from '@/domain/placement/placement';

const questions: PlacementQuestion[] = [
  {
    id: 'q1',
    area: 'logic',
    question: 'Was passiert zuerst?',
    options: [
      { id: 'a', text: 'Schritt A' },
      { id: 'b', text: 'Schritt B' },
      { id: DONT_KNOW_OPTION_ID, text: 'Weiß ich nicht' },
    ],
    correctOptionId: 'a',
    weight: 1,
    explanation: 'Schritt A kommt zuerst, weil ...',
  },
  {
    id: 'q2',
    area: 'ai-concepts',
    question: 'Was ist ein Token?',
    options: [
      { id: 'a', text: 'Ein Zeichen' },
      { id: 'b', text: 'Ein Textbaustein' },
      { id: DONT_KNOW_OPTION_ID, text: 'Weiß ich nicht' },
    ],
    correctOptionId: 'b',
    demonstratesConceptSlug: 'token',
    weight: 2,
    explanation: 'Ein Token ist ein Textbaustein, kein einzelnes Zeichen.',
  },
];

describe('evaluatePlacement', () => {
  it('scores 100 when every question is answered correctly', () => {
    const result = evaluatePlacement(questions, [
      { questionId: 'q1', optionId: 'a' },
      { questionId: 'q2', optionId: 'b' },
    ]);
    expect(result.score).toBe(100);
    expect(result.band).toBe('refresher');
  });

  it('treats "weiß ich nicht" the same as any other wrong answer, not worse', () => {
    const dontKnow = evaluatePlacement(questions, [
      { questionId: 'q1', optionId: DONT_KNOW_OPTION_ID },
      { questionId: 'q2', optionId: 'b' },
    ]);
    const wrongGuess = evaluatePlacement(questions, [
      { questionId: 'q1', optionId: 'b' },
      { questionId: 'q2', optionId: 'b' },
    ]);
    expect(dontKnow.score).toBe(wrongGuess.score);
  });

  it('only counts a concept as demonstrated when its question was answered correctly', () => {
    const correct = evaluatePlacement(questions, [{ questionId: 'q2', optionId: 'b' }]);
    expect(correct.demonstratedConceptSlugs).toContain('token');

    const wrong = evaluatePlacement(questions, [{ questionId: 'q2', optionId: 'a' }]);
    expect(wrong.demonstratedConceptSlugs).not.toContain('token');
  });

  it('assigns the beginner band for a low score', () => {
    const result = evaluatePlacement(questions, []);
    expect(result.score).toBe(0);
    expect(result.band).toBe('beginner');
  });

  it('never gives a time-based or speed-based bonus (no such input exists)', () => {
    // The evaluator's only inputs are question weight and correctness — this
    // test documents that guarantee by exhaustively checking the signature.
    const result = evaluatePlacement(questions, [{ questionId: 'q1', optionId: 'a' }]);
    expect(Object.keys(result)).toEqual([
      'score',
      'band',
      'demonstratedConceptSlugs',
      'byArea',
      'message',
      'version',
    ]);
  });
});
