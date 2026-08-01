import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MASTERY_CONFIG,
  INITIAL_MASTERY_STATE,
  MASTERY_ALGORITHM_VERSION,
  describeMastery,
  independenceFactor,
  masteryBand,
  meetsPrerequisite,
  scaffoldFactor,
  summarizeCalibration,
  updateMastery,
  type MasteryEvidence,
  type MasteryState,
} from '@/domain/mastery/mastery';

/**
 * Der Kompetenzalgorithmus ist die empfindlichste Stelle des Lernmodells:
 * Er entscheidet, was als beherrscht gilt und wann wiederholt wird. Deshalb
 * wird hier jede Regel aus der Modellbeschreibung einzeln geprüft.
 */

function evidence(overrides: Partial<MasteryEvidence> = {}): MasteryEvidence {
  return {
    outcome: 'PASSED',
    score: 1,
    hintsUsed: 0,
    exerciseDifficulty: 3,
    exerciseType: 'WRITE_CODE',
    scaffoldLevel: 5,
    weight: 1,
    daysSinceLastPractice: 0,
    errorType: 'NONE',
    repeatedErrorType: false,
    confidenceBefore: null,
    ...overrides,
  };
}

const fresh = (): MasteryState => ({ ...INITIAL_MASTERY_STATE });

describe('updateMastery', () => {
  it('erhöht den Wert bei einer vollständig eigenständigen Lösung deutlich', () => {
    const result = updateMastery(fresh(), evidence());

    expect(result.delta).toBeGreaterThan(10);
    expect(result.state.successfulRetrievals).toBe(1);
    expect(result.algorithmVersion).toBe(MASTERY_ALGORITHM_VERSION);
    expect(result.reasons.join(' ')).toContain('eigenständig');
  });

  it('erhöht bei Lösung mit Hinweisen weniger als ohne', () => {
    const ohneHilfe = updateMastery(fresh(), evidence({ hintsUsed: 0 }));
    const mitHinweis = updateMastery(fresh(), evidence({ hintsUsed: 1 }));
    const mitTeilcode = updateMastery(fresh(), evidence({ hintsUsed: 4 }));

    expect(mitHinweis.delta).toBeLessThan(ohneHilfe.delta);
    expect(mitTeilcode.delta).toBeLessThan(mitHinweis.delta);
    expect(mitTeilcode.delta).toBeGreaterThan(0);
  });

  it('bewertet eine bestandene Transferaufgabe stärker als dieselbe Standardaufgabe', () => {
    const standard = updateMastery(fresh(), evidence({ exerciseType: 'WRITE_CODE' }));
    const transfer = updateMastery(fresh(), evidence({ exerciseType: 'TRANSFER' }));

    expect(transfer.delta).toBeGreaterThan(standard.delta);
    expect(transfer.state.transferSuccesses).toBe(1);
  });

  it('erhöht die Stabilität bei verzögerter Wiederholung stärker', () => {
    const sofort = updateMastery(fresh(), evidence({ daysSinceLastPractice: 0 }));
    const verzoegert = updateMastery(fresh(), evidence({ daysSinceLastPractice: 7 }));

    expect(verzoegert.state.stability).toBeGreaterThan(sofort.state.stability);
    expect(verzoegert.delta).toBeGreaterThan(sofort.delta);
  });

  it('gibt bei einer angesehenen Musterlösung keine Beherrschung', () => {
    const hoch: MasteryState = { ...fresh(), masteryScore: 85 };
    const result = updateMastery(hoch, evidence({ outcome: 'SOLUTION_REVEALED' }));

    expect(result.state.masteryScore).toBeLessThanOrEqual(
      DEFAULT_MASTERY_CONFIG.solutionRevealedCap,
    );
    expect(result.delta).toBeLessThan(0);
    expect(result.reasons.join(' ')).toContain('gesehene Lösung');
  });

  it('erhöht den Wert bei angesehener Musterlösung niemals', () => {
    const niedrig: MasteryState = { ...fresh(), masteryScore: 12 };
    const result = updateMastery(niedrig, evidence({ outcome: 'SOLUTION_REVEALED' }));

    expect(result.state.masteryScore).toBe(12);
    expect(result.delta).toBe(0);
  });

  it('gewichtet einen reinen Syntaxfehler schwächer als einen Konzeptfehler', () => {
    const start: MasteryState = { ...fresh(), masteryScore: 60 };

    const syntax = updateMastery(
      start,
      evidence({ outcome: 'FAILED', score: 0, errorType: 'SYNTAX' }),
    );
    const konzept = updateMastery(
      start,
      evidence({ outcome: 'FAILED', score: 0, errorType: 'CONCEPT' }),
    );

    expect(syntax.delta).toBeGreaterThan(konzept.delta);
    expect(syntax.delta).toBeGreaterThan(-DEFAULT_MASTERY_CONFIG.conceptErrorPenalty);
    expect(syntax.reasons.join(' ')).toContain('Schreibweise');
  });

  it('stuft bei wiederholtem Konzeptfehler stärker zurück', () => {
    const start: MasteryState = { ...fresh(), masteryScore: 60 };

    const einmal = updateMastery(
      start,
      evidence({ outcome: 'FAILED', score: 0, errorType: 'LOGIC', repeatedErrorType: false }),
    );
    const wiederholt = updateMastery(
      start,
      evidence({ outcome: 'FAILED', score: 0, errorType: 'LOGIC', repeatedErrorType: true }),
    );

    expect(wiederholt.delta).toBeLessThan(einmal.delta);
    expect(wiederholt.reasons.join(' ')).toContain('erneut');
  });

  it('stuft bei hoher Sicherheit und falscher Antwort zusätzlich zurück', () => {
    const start: MasteryState = { ...fresh(), masteryScore: 60 };

    const unsicher = updateMastery(
      start,
      evidence({ outcome: 'FAILED', score: 0, errorType: 'LOGIC', confidenceBefore: 'UNSURE' }),
    );
    const sicher = updateMastery(
      start,
      evidence({ outcome: 'FAILED', score: 0, errorType: 'LOGIC', confidenceBefore: 'VERY_SURE' }),
    );

    expect(sicher.delta).toBeLessThan(unsicher.delta);
  });

  it('verringert die Stabilität bei richtiger Lösung trotz Unsicherheit', () => {
    const sicher = updateMastery(fresh(), evidence({ confidenceBefore: 'VERY_SURE' }));
    const unsicher = updateMastery(fresh(), evidence({ confidenceBefore: 'UNSURE' }));

    expect(unsicher.state.stability).toBeLessThan(sicher.state.stability);
    expect(unsicher.reasons.join(' ')).toContain('Selbsteinschätzung');
  });

  it('bleibt immer im Bereich 0 bis 100', () => {
    let state = fresh();
    for (let i = 0; i < 40; i += 1) {
      state = updateMastery(state, evidence()).state;
    }
    expect(state.masteryScore).toBeLessThanOrEqual(100);

    for (let i = 0; i < 40; i += 1) {
      state = updateMastery(
        state,
        evidence({ outcome: 'FAILED', score: 0, errorType: 'LOGIC' }),
      ).state;
    }
    expect(state.masteryScore).toBeGreaterThanOrEqual(0);
  });

  it('liefert bei gleicher Eingabe immer dasselbe Ergebnis', () => {
    const a = updateMastery(fresh(), evidence());
    const b = updateMastery(fresh(), evidence());
    expect(a.state).toEqual(b.state);
    expect(a.delta).toBe(b.delta);
  });

  it('gewichtet den Zugewinn mit dem Konzeptgewicht der Aufgabe', () => {
    const voll = updateMastery(fresh(), evidence({ weight: 1 }));
    const halb = updateMastery(fresh(), evidence({ weight: 0.5 }));

    expect(halb.delta).toBeLessThan(voll.delta);
    expect(halb.delta).toBeGreaterThan(0);
  });

  it('bewertet Aufgaben ohne Vorlage höher als Lückenaufgaben', () => {
    const luecke = updateMastery(fresh(), evidence({ scaffoldLevel: 3 }));
    const frei = updateMastery(fresh(), evidence({ scaffoldLevel: 6 }));

    expect(frei.delta).toBeGreaterThan(luecke.delta);
  });
});

describe('Hilfsfunktionen', () => {
  it('independenceFactor sinkt mit jedem Hinweis, bleibt aber positiv', () => {
    expect(independenceFactor(0, DEFAULT_MASTERY_CONFIG)).toBe(1);
    expect(independenceFactor(5, DEFAULT_MASTERY_CONFIG)).toBeGreaterThanOrEqual(
      DEFAULT_MASTERY_CONFIG.minIndependence,
    );
    expect(independenceFactor(3, DEFAULT_MASTERY_CONFIG)).toBeLessThan(
      independenceFactor(1, DEFAULT_MASTERY_CONFIG),
    );
  });

  it('scaffoldFactor steigt monoton mit der Gerüst-Stufe', () => {
    const werte = [1, 2, 3, 4, 5, 6].map(scaffoldFactor);
    for (let i = 1; i < werte.length; i += 1) {
      expect(werte[i]!).toBeGreaterThan(werte[i - 1]!);
    }
  });

  it('masteryBand trennt die Bereiche wie im Lernmodell beschrieben', () => {
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

  it('meetsPrerequisite verlangt den konfigurierten Grenzwert', () => {
    expect(meetsPrerequisite(69)).toBe(false);
    expect(meetsPrerequisite(70)).toBe(true);
  });

  it('describeMastery liefert zu jedem Band Text ohne Fachjargon', () => {
    for (const score of [10, 50, 70, 85, 95]) {
      const description = describeMastery(score);
      expect(description.label.length).toBeGreaterThan(3);
      expect(description.meaning.length).toBeGreaterThan(20);
      expect(description.nextStep.length).toBeGreaterThan(20);
    }
  });
});

describe('summarizeCalibration', () => {
  it('meldet zu wenige Daten deutlich', () => {
    const result = summarizeCalibration([{ confidence: 'RATHER_SURE', passed: true }]);
    expect(result.samples).toBe(1);
    expect(result.message).toContain('wenige');
  });

  it('erkennt Selbstüberschätzung', () => {
    const result = summarizeCalibration(
      Array.from({ length: 10 }, () => ({ confidence: 'VERY_SURE' as const, passed: false })),
    );
    expect(result.gap).toBeGreaterThan(0.2);
    expect(result.message).toContain('über dem Ergebnis');
  });

  it('erkennt Unterschätzung', () => {
    const result = summarizeCalibration(
      Array.from({ length: 10 }, () => ({ confidence: 'UNSURE' as const, passed: true })),
    );
    expect(result.gap).toBeLessThan(-0.2);
    expect(result.message).toContain('mehr richtig');
  });

  it('bestätigt eine gute Übereinstimmung', () => {
    const entries = [
      ...Array.from({ length: 7 }, () => ({ confidence: 'RATHER_SURE' as const, passed: true })),
      ...Array.from({ length: 3 }, () => ({ confidence: 'RATHER_SURE' as const, passed: false })),
    ];
    const result = summarizeCalibration(entries);
    expect(Math.abs(result.gap)).toBeLessThanOrEqual(0.2);
    expect(result.message).toContain('passen gut zusammen');
  });
});
