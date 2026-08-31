import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MASTERY_CONFIG,
  INITIAL_MASTERY_STATE,
  masteryBand,
  meetsPrerequisite,
  scaffoldFactor,
  summarizeCalibration,
  updateMastery,
  type MasteryEvidence,
} from '@/domain/mastery/mastery';

const baseEvidence: MasteryEvidence = {
  outcome: 'PASSED',
  score: 1,
  hintsUsed: 0,
  exerciseDifficulty: 2,
  exerciseType: 'SINGLE_CHOICE',
  scaffoldLevel: 3,
  weight: 1,
  daysSinceLastPractice: 0,
  errorType: 'NONE',
  repeatedErrorType: false,
};

describe('updateMastery', () => {
  it('increases the score on a fully independent PASSED result', () => {
    const result = updateMastery(INITIAL_MASTERY_STATE, baseEvidence);
    expect(result.delta).toBeGreaterThan(0);
    expect(result.state.masteryScore).toBeGreaterThan(0);
    expect(result.state.successfulRetrievals).toBe(1);
  });

  it('gives less gain the more hints were used', () => {
    const noHints = updateMastery(INITIAL_MASTERY_STATE, { ...baseEvidence, hintsUsed: 0 });
    const withHints = updateMastery(INITIAL_MASTERY_STATE, { ...baseEvidence, hintsUsed: 3 });
    expect(withHints.delta).toBeLessThan(noHints.delta);
  });

  it('never lets independence drop below the configured floor', () => {
    const manyHints = updateMastery(INITIAL_MASTERY_STATE, { ...baseEvidence, hintsUsed: 50 });
    expect(manyHints.delta).toBeGreaterThan(0);
  });

  it('applies diminishing returns as the score rises', () => {
    const low = updateMastery({ ...INITIAL_MASTERY_STATE, masteryScore: 10 }, baseEvidence);
    const high = updateMastery({ ...INITIAL_MASTERY_STATE, masteryScore: 85 }, baseEvidence);
    expect(high.delta).toBeLessThan(low.delta);
  });

  it('weights scaffold levels according to the fixed table', () => {
    expect(scaffoldFactor(1)).toBe(0.3);
    expect(scaffoldFactor(6)).toBe(1.15);
    expect(scaffoldFactor(3)).toBe(0.75);
  });

  it('gives a bonus for TRANSFER exercises passed independently', () => {
    const normal = updateMastery(INITIAL_MASTERY_STATE, baseEvidence);
    const transfer = updateMastery(INITIAL_MASTERY_STATE, {
      ...baseEvidence,
      exerciseType: 'TRANSFER',
    });
    expect(transfer.delta).toBeGreaterThan(normal.delta);
    expect(transfer.state.transferSuccesses).toBe(1);
  });

  it('never grants any gain when the solution was revealed, and caps the score at 59', () => {
    const highState = { ...INITIAL_MASTERY_STATE, masteryScore: 90 };
    const result = updateMastery(highState, { ...baseEvidence, outcome: 'SOLUTION_REVEALED' });
    expect(result.state.masteryScore).toBe(59);
    expect(result.delta).toBeLessThan(0);

    const lowState = { ...INITIAL_MASTERY_STATE, masteryScore: 20 };
    const untouched = updateMastery(lowState, { ...baseEvidence, outcome: 'SOLUTION_REVEALED' });
    expect(untouched.state.masteryScore).toBe(20);
  });

  // Diese beiden Tests starten bei einem mittleren Kompetenzwert statt bei 0:
  // Bei 0 kann `clamp(score - penalty, 0, 100)` nicht weiter fallen, und der
  // Unterschied zwischen den Fehlerarten wäre unsichtbar.
  const midState = { ...INITIAL_MASTERY_STATE, masteryScore: 50 };

  it('penalizes a SURFACE error less than a MISCONCEPTION error', () => {
    const surface = updateMastery(midState, {
      ...baseEvidence,
      outcome: 'FAILED',
      errorType: 'SURFACE',
    });
    const misconception = updateMastery(midState, {
      ...baseEvidence,
      outcome: 'FAILED',
      errorType: 'MISCONCEPTION',
    });
    expect(surface.delta).toBeGreaterThan(misconception.delta);
  });

  it('adds an extra penalty when the same error type repeats', () => {
    const once = updateMastery(midState, {
      ...baseEvidence,
      outcome: 'FAILED',
      errorType: 'MISCONCEPTION',
      repeatedErrorType: false,
    });
    const repeated = updateMastery(midState, {
      ...baseEvidence,
      outcome: 'FAILED',
      errorType: 'MISCONCEPTION',
      repeatedErrorType: true,
    });
    expect(repeated.delta).toBeLessThan(once.delta);
  });

  it('only gives partial credit for PARTIAL results', () => {
    const passed = updateMastery(INITIAL_MASTERY_STATE, { ...baseEvidence, outcome: 'PASSED' });
    const partial = updateMastery(INITIAL_MASTERY_STATE, { ...baseEvidence, outcome: 'PARTIAL' });
    expect(partial.delta).toBeGreaterThan(0);
    expect(partial.delta).toBeLessThan(passed.delta);
  });
});

describe('masteryBand', () => {
  it('maps scores to the five German bands correctly at the boundaries', () => {
    expect(masteryBand(0)).toBe('new');
    expect(masteryBand(39)).toBe('new');
    expect(masteryBand(40)).toBe('building');
    expect(masteryBand(59)).toBe('building');
    expect(masteryBand(60)).toBe('usable');
    expect(masteryBand(79)).toBe('usable');
    expect(masteryBand(80)).toBe('solid');
    expect(masteryBand(89)).toBe('solid');
    expect(masteryBand(90)).toBe('durable');
    expect(masteryBand(100)).toBe('durable');
  });
});

describe('meetsPrerequisite', () => {
  it('uses the configured unlock threshold of 70', () => {
    expect(meetsPrerequisite(69)).toBe(false);
    expect(meetsPrerequisite(70)).toBe(true);
    expect(DEFAULT_MASTERY_CONFIG.unlockThreshold).toBe(70);
  });
});

describe('summarizeCalibration', () => {
  it('reports no message pressure with fewer than 5 samples', () => {
    const summary = summarizeCalibration([
      { confidence: 'VERY_SURE', passed: true },
      { confidence: 'VERY_SURE', passed: true },
    ]);
    expect(summary.samples).toBe(2);
    expect(summary.message).toContain('Noch zu wenige');
  });

  it('detects overconfidence when confidence exceeds actual success', () => {
    const entries = Array.from({ length: 6 }, () => ({
      confidence: 'VERY_SURE' as const,
      passed: false,
    }));
    const summary = summarizeCalibration(entries);
    expect(summary.gap).toBeGreaterThan(0.2);
    expect(summary.message).toContain('über dem Ergebnis');
  });
});

/**
 * Regressionstest zum Code-Review-Fund "Erstkontakt bekommt den Bonus für
 * verzögerten Abruf" (PR #29): Für ein noch nie geübtes Konzept setzte der
 * Dienst den Platzhalter 999 ein, den `isDelayedReview` als echte
 * Gedächtnisleistung nach langer Pause las — und mit Bonus belohnte, obwohl
 * die Person das Konzept zum ersten Mal sah. `null` heißt jetzt "noch nie
 * geübt" und ist ausdrücklich KEIN verzögerter Abruf.
 */
describe('Erstkontakt mit einem Konzept', () => {
  it('bekommt keinen Bonus für verzögerten Abruf', () => {
    const erstkontakt = updateMastery(
      INITIAL_MASTERY_STATE,
      { ...baseEvidence, outcome: 'PASSED', daysSinceLastPractice: null },
      DEFAULT_MASTERY_CONFIG,
    );
    const echterVerzoegerterAbruf = updateMastery(
      INITIAL_MASTERY_STATE,
      { ...baseEvidence, outcome: 'PASSED', daysSinceLastPractice: 7 },
      DEFAULT_MASTERY_CONFIG,
    );

    expect(erstkontakt.delta).toBeLessThan(echterVerzoegerterAbruf.delta);
    expect(erstkontakt.reasons.some((r) => r.includes('Pause'))).toBe(false);
  });

  it('nennt in der Begründung keine erfundene Pausendauer', () => {
    const erstkontakt = updateMastery(
      INITIAL_MASTERY_STATE,
      { ...baseEvidence, outcome: 'PASSED', daysSinceLastPractice: null },
      DEFAULT_MASTERY_CONFIG,
    );
    expect(erstkontakt.reasons.join(' ')).not.toContain('999');
  });
});
