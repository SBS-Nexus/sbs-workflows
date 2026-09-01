import { describe, expect, it } from 'vitest';
import { gradeSubmission, toPublicPayload } from '@/domain/grading/grade';
import type { ExercisePayload, Submission } from '@/domain/content/exercise-payload';

const BANNED_PHRASES = [/leider falsch/i, /versuche es (noch ?einmal|nochmal)\.?\s*$/i];

function expectNoPlaceholderFeedback(messages: string[]): void {
  for (const message of messages) {
    for (const pattern of BANNED_PHRASES) {
      expect(message).not.toMatch(pattern);
    }
  }
}

describe('gradeSubmission — singleChoice', () => {
  const payload: ExercisePayload = {
    kind: 'singleChoice',
    options: [
      { id: 'a', text: 'Ja', feedback: 'Richtig: Ein Token ist kein einzelnes Zeichen.' },
      { id: 'b', text: 'Nein', feedback: 'Ein Token kann mehrere Zeichen umfassen.' },
    ],
    correctOptionId: 'a',
  };

  it('passes on the correct option and fails otherwise', () => {
    const correct = gradeSubmission({
      payload,
      submission: { kind: 'singleChoice', optionId: 'a' },
    });
    expect(correct.outcome).toBe('PASSED');
    expect(correct.errorType).toBe('NONE');

    const wrong = gradeSubmission({ payload, submission: { kind: 'singleChoice', optionId: 'b' } });
    expect(wrong.outcome).toBe('FAILED');
    expect(wrong.errorType).toBe('MISCONCEPTION');
    expectNoPlaceholderFeedback(wrong.feedback.map((f) => f.message));
  });
});

describe('gradeSubmission — multipleChoice', () => {
  const payload: ExercisePayload = {
    kind: 'multipleChoice',
    options: [
      { id: 'a', text: 'A', feedback: 'A stimmt, weil ...' },
      { id: 'b', text: 'B', feedback: 'B stimmt, weil ...' },
      { id: 'c', text: 'C', feedback: 'C stimmt nicht, weil ...' },
    ],
    correctOptionIds: ['a', 'b'],
  };

  it('passes only when exactly the correct set is chosen', () => {
    const perfect = gradeSubmission({
      payload,
      submission: { kind: 'multipleChoice', optionIds: ['a', 'b'] },
    });
    expect(perfect.outcome).toBe('PASSED');

    const partial = gradeSubmission({
      payload,
      submission: { kind: 'multipleChoice', optionIds: ['a'] },
    });
    expect(partial.outcome).toBe('PARTIAL');
    expectNoPlaceholderFeedback(partial.feedback.map((f) => f.message));
  });
});

describe('gradeSubmission — ordering', () => {
  const payload: ExercisePayload = {
    kind: 'ordering',
    instruction: 'Bringe die Schritte in die richtige Reihenfolge.',
    items: [
      { id: '1', text: 'Ziel definieren' },
      { id: '2', text: 'Kontext geben' },
      { id: '3', text: 'Beispiel anfügen' },
    ],
    correctOrder: ['1', '2', '3'],
  };

  it('passes on exact order, partial on a matching prefix', () => {
    const exact = gradeSubmission({
      payload,
      submission: { kind: 'ordering', orderedItemIds: ['1', '2', '3'] },
    });
    expect(exact.outcome).toBe('PASSED');

    const prefixOnly = gradeSubmission({
      payload,
      submission: { kind: 'ordering', orderedItemIds: ['1', '3', '2'] },
    });
    expect(prefixOnly.outcome).toBe('PARTIAL');
    expectNoPlaceholderFeedback(prefixOnly.feedback.map((f) => f.message));
  });
});

describe('gradeSubmission — fillIn', () => {
  const payload: ExercisePayload = {
    kind: 'fillIn',
    template: 'Ein {{blank:a}} zerlegt Text in {{blank:b}}.',
    blanks: [
      {
        id: 'a',
        accepted: ['Tokenizer'],
        description: 'Werkzeug',
        wrongHint: 'Denk an das Werkzeug, das Text vorverarbeitet.',
      },
      {
        id: 'b',
        accepted: ['Token', 'Tokens'],
        description: 'Einheit',
        wrongHint: 'Die kleinste Texteinheit für das Modell.',
      },
    ],
  };

  it('is case-insensitive and trims whitespace', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'fillIn', values: { a: ' tokenizer ', b: 'TOKENS' } },
    });
    expect(result.outcome).toBe('PASSED');
  });

  it('gives partial credit and non-placeholder feedback for one wrong blank', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'fillIn', values: { a: 'Tokenizer', b: 'Buchstaben' } },
    });
    expect(result.outcome).toBe('PARTIAL');
    expectNoPlaceholderFeedback(result.feedback.map((f) => f.message));
  });
});

describe('gradeSubmission — scenarioDecision and promptRepair (quality tiers)', () => {
  const scenarioPayload: ExercisePayload = {
    kind: 'scenarioDecision',
    scenario: 'Der Kontext wird knapp. Was tust du?',
    options: [
      {
        id: 'best',
        text: 'Zusammenfassen und fortsetzen',
        quality: 'optimal',
        feedback: 'Genau richtig: eine Zusammenfassung erhält die relevanten Fakten.',
      },
      {
        id: 'ok',
        text: 'Neuen Chat starten',
        quality: 'acceptable',
        feedback: 'Funktioniert, verliert aber unnötig Kontext.',
      },
      {
        id: 'bad',
        text: 'Einfach weiterschreiben',
        quality: 'problematic',
        feedback: 'Führt zu abgeschnittenem Kontext ohne Vorwarnung.',
      },
    ],
  };

  it('maps optimal/acceptable/problematic to PASSED/PARTIAL/FAILED', () => {
    const optimal = gradeSubmission({
      payload: scenarioPayload,
      submission: { kind: 'scenarioDecision', optionId: 'best' },
    });
    expect(optimal.outcome).toBe('PASSED');
    expect(optimal.errorType).toBe('NONE');

    const acceptable = gradeSubmission({
      payload: scenarioPayload,
      submission: { kind: 'scenarioDecision', optionId: 'ok' },
    });
    expect(acceptable.outcome).toBe('PARTIAL');
    expect(acceptable.errorType).toBe('INCOMPLETE');

    const problematic = gradeSubmission({
      payload: scenarioPayload,
      submission: { kind: 'scenarioDecision', optionId: 'bad' },
    });
    expect(problematic.outcome).toBe('FAILED');
    expect(problematic.errorType).toBe('MISCONCEPTION');
    expectNoPlaceholderFeedback(problematic.feedback.map((f) => f.message));
  });
});

describe('gradeSubmission — terminalSimulation', () => {
  const payload: ExercisePayload = {
    kind: 'terminalSimulation',
    goalDescription: 'Lege einen Ordner "notizen" mit einer leeren Datei "todo.txt" an.',
    startingDirectory: '/home/lernende',
    fileSystem: { '/home/lernende': null },
    allowedCommands: ['pwd', 'ls', 'cd', 'mkdir', 'touch'],
    dangerousCommands: ['rm'],
    expectedCommands: ['mkdir notizen', 'cd notizen', 'touch todo.txt'],
  };

  it('passes only on the exact expected command sequence', () => {
    const correct = gradeSubmission({
      payload,
      submission: {
        kind: 'terminalSimulation',
        commands: ['mkdir notizen', 'cd notizen', 'touch todo.txt'],
      },
    });
    expect(correct.outcome).toBe('PASSED');

    const wrongOrder = gradeSubmission({
      payload,
      submission: { kind: 'terminalSimulation', commands: ['touch todo.txt', 'mkdir notizen'] },
    });
    expect(wrongOrder.outcome).not.toBe('PASSED');
    expectNoPlaceholderFeedback(wrongOrder.feedback.map((f) => f.message));
  });

  it('gives partial credit for a correct prefix', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'terminalSimulation', commands: ['mkdir notizen', 'ls'] },
    });
    expect(result.outcome).toBe('PARTIAL');
  });
});

describe('toPublicPayload — never leaks solution-revealing fields', () => {
  it('strips correctOptionId from singleChoice', () => {
    const payload: ExercisePayload = {
      kind: 'singleChoice',
      options: [
        { id: 'a', text: 'A', feedback: 'fb-a' },
        { id: 'b', text: 'B', feedback: 'fb-b' },
      ],
      correctOptionId: 'a',
    };
    const publicPayload = JSON.stringify(toPublicPayload(payload));
    expect(publicPayload).not.toContain('correctOptionId');
    expect(publicPayload).not.toContain('fb-a');
    expect(publicPayload).not.toContain('fb-b');
  });

  it('strips correctOptionIds from multipleChoice', () => {
    const payload: ExercisePayload = {
      kind: 'multipleChoice',
      options: [
        { id: 'a', text: 'A', feedback: 'fb-a' },
        { id: 'b', text: 'B', feedback: 'fb-b' },
        { id: 'c', text: 'C', feedback: 'fb-c' },
      ],
      correctOptionIds: ['a', 'b'],
    };
    const publicPayload = JSON.stringify(toPublicPayload(payload));
    expect(publicPayload).not.toContain('correctOptionIds');
    expect(publicPayload).not.toContain('fb-a');
  });

  it('strips correctOrder from ordering', () => {
    const payload: ExercisePayload = {
      kind: 'ordering',
      instruction: 'Sortiere.',
      items: [
        { id: '1', text: 'eins' },
        { id: '2', text: 'zwei' },
      ],
      correctOrder: ['1', '2'],
    };
    const publicPayload = JSON.stringify(toPublicPayload(payload));
    expect(publicPayload).not.toContain('correctOrder');
  });

  it('strips accepted values and wrongHint from fillIn', () => {
    const payload: ExercisePayload = {
      kind: 'fillIn',
      template: '{{blank:a}}',
      blanks: [
        { id: 'a', accepted: ['geheim'], description: 'Beschreibung', wrongHint: 'nicht verraten' },
      ],
    };
    const publicPayload = JSON.stringify(toPublicPayload(payload));
    expect(publicPayload).not.toContain('geheim');
    expect(publicPayload).not.toContain('accepted');
    expect(publicPayload).not.toContain('wrongHint');
  });

  it('strips quality and feedback from scenarioDecision and promptRepair', () => {
    const scenario: ExercisePayload = {
      kind: 'scenarioDecision',
      scenario: 'Szenario',
      options: [
        { id: 'a', text: 'A', quality: 'optimal', feedback: 'geheime-begruendung' },
        { id: 'b', text: 'B', quality: 'problematic', feedback: 'geheime-begruendung-2' },
        { id: 'c', text: 'C', quality: 'acceptable', feedback: 'geheime-begruendung-3' },
      ],
    };
    const publicPayload = JSON.stringify(toPublicPayload(scenario));
    expect(publicPayload).not.toContain('quality');
    expect(publicPayload).not.toContain('geheime-begruendung');

    const promptRepair: ExercisePayload = {
      kind: 'promptRepair',
      flawedPrompt: 'Schreib was.',
      flaws: ['zu vage'],
      options: [
        { id: 'a', text: 'Besser', quality: 'optimal', feedback: 'geheime-begruendung' },
        { id: 'b', text: 'Schlechter', quality: 'problematic', feedback: 'geheime-begruendung-2' },
        { id: 'c', text: 'Mittel', quality: 'acceptable', feedback: 'geheime-begruendung-3' },
      ],
    };
    const publicPromptRepair = JSON.stringify(toPublicPayload(promptRepair));
    expect(publicPromptRepair).not.toContain('quality');
    expect(publicPromptRepair).not.toContain('geheime-begruendung');
  });

  it('strips expectedCommands from terminalSimulation', () => {
    const payload: ExercisePayload = {
      kind: 'terminalSimulation',
      goalDescription: 'Ziel',
      startingDirectory: '/home',
      fileSystem: {},
      allowedCommands: ['ls'],
      dangerousCommands: [],
      expectedCommands: ['ls -la'],
    };
    const publicPayload = JSON.stringify(toPublicPayload(payload));
    expect(publicPayload).not.toContain('expectedCommands');
    expect(publicPayload).not.toContain('ls -la');
  });
});

describe('gradeSubmission — mismatched payload/submission kind', () => {
  it('fails safely instead of throwing', () => {
    const payload: ExercisePayload = {
      kind: 'singleChoice',
      options: [{ id: 'a', text: 'A', feedback: 'fb' }],
      correctOptionId: 'a',
    };
    const submission: Submission = { kind: 'ordering', orderedItemIds: [] };
    const result = gradeSubmission({ payload, submission });
    expect(result.outcome).toBe('FAILED');
  });
});
