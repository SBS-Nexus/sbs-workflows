import { describe, expect, it } from 'vitest';
import { gradeSubmission, normalizeOutput } from '@/domain/grading/grade';
import type { ExercisePayload, TestCase } from '@/domain/content/exercise-payload';

describe('normalizeOutput', () => {
  it('vereinheitlicht Zeilenenden und schneidet Leerraum am Zeilenende ab', () => {
    expect(normalizeOutput('a  \r\nb\t\n\n')).toBe('a\nb');
  });

  it('lässt Einrückung innerhalb der Zeile unangetastet', () => {
    expect(normalizeOutput('  eingerückt')).toBe('  eingerückt');
  });
});

describe('Einfachauswahl', () => {
  const payload: ExercisePayload = {
    kind: 'singleChoice',
    options: [
      { id: 'a', text: 'A', feedback: 'Richtig, weil A gilt.' },
      { id: 'b', text: 'B', feedback: 'B trifft nicht zu, weil …' },
    ],
    correctOptionId: 'a',
  };

  it('bewertet die richtige Option als bestanden und gibt deren Begründung aus', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'singleChoice', optionId: 'a' },
    });

    expect(result.outcome).toBe('PASSED');
    expect(result.score).toBe(1);
    expect(result.feedback[0]?.message).toContain('Richtig, weil A gilt.');
    expect(result.marks.a).toBe(true);
  });

  it('gibt bei falscher Wahl die optionsspezifische Rückmeldung statt einer Floskel', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'singleChoice', optionId: 'b' },
    });

    expect(result.outcome).toBe('FAILED');
    expect(result.feedback[0]?.message).toBe('B trifft nicht zu, weil …');
    expect(result.feedback[0]?.message).not.toMatch(/leider falsch|versuche es noch einmal/i);
  });
});

describe('Mehrfachauswahl', () => {
  const payload: ExercisePayload = {
    kind: 'multipleChoice',
    options: [
      { id: 'a', text: 'A', feedback: 'A trifft zu.' },
      { id: 'b', text: 'B', feedback: 'B trifft zu.' },
      { id: 'c', text: 'C', feedback: 'C trifft nicht zu, weil …' },
    ],
    correctOptionIds: ['a', 'b'],
  };

  it('erkennt eine vollständig richtige Auswahl', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'multipleChoice', optionIds: ['a', 'b'] },
    });
    expect(result.outcome).toBe('PASSED');
    expect(result.score).toBe(1);
  });

  it('nennt bei fehlenden Optionen die Anzahl, ohne sie zu verraten', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'multipleChoice', optionIds: ['a'] },
    });

    const text = result.feedback.map((f) => f.message).join(' ');
    expect(result.outcome).not.toBe('PASSED');
    expect(text).toContain('fehlt noch');
    expect(text).not.toContain('B trifft zu.');
  });

  it('gibt bei falsch gewählter Option deren Begründung', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'multipleChoice', optionIds: ['a', 'b', 'c'] },
    });

    expect(result.feedback.some((f) => f.message.includes('C trifft nicht zu'))).toBe(true);
  });
});

describe('Freie Erklärung', () => {
  const payload: ExercisePayload = {
    kind: 'freeText',
    requiredKeywordGroups: [
      {
        id: 'g1',
        anyOf: ['reihenfolge', 'nacheinander'],
        missingHint: 'Nenne die Abarbeitungsrichtung.',
      },
      { id: 'g2', anyOf: ['vorher', 'zuerst'], missingHint: 'Nenne die Abhängigkeit.' },
    ],
    minLength: 20,
    sampleAnswer: 'Musterantwort.',
  };

  it('akzeptiert eine inhaltlich vollständige Antwort unabhängig vom Wortlaut', () => {
    const result = gradeSubmission({
      payload,
      submission: {
        kind: 'freeText',
        text: 'Python arbeitet die Zeilen nacheinander ab. Ein Wert muss zuerst existieren.',
      },
    });
    expect(result.outcome).toBe('PASSED');
  });

  it('meldet gezielt, welcher Aspekt fehlt', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'freeText', text: 'Die Reihenfolge der Zeilen ist wichtig hier.' },
    });

    expect(result.outcome).toBe('PARTIAL');
    expect(result.feedback.some((f) => f.message === 'Nenne die Abhängigkeit.')).toBe(true);
    expect(result.marks.g1).toBe(true);
    expect(result.marks.g2).toBe(false);
  });

  it('behandelt eine leere Abgabe als eigene Fehlerart', () => {
    const result = gradeSubmission({ payload, submission: { kind: 'freeText', text: '   ' } });
    expect(result.errorType).toBe('EMPTY_SUBMISSION');
    expect(result.outcome).toBe('FAILED');
  });

  it('bemängelt eine zu knappe Antwort ausdrücklich', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'freeText', text: 'reihenfolge vorher' },
    });
    expect(result.feedback.some((f) => f.message.includes('sehr knapp'))).toBe(true);
  });
});

describe('Ausgabe vorhersagen', () => {
  const payload: ExercisePayload = {
    kind: 'predictOutput',
    code: 'print(1)\nprint(2)',
    expectedOutput: '1\n2',
    explanation: 'Zwei print-Aufrufe erzeugen zwei Zeilen.',
  };

  it('akzeptiert die exakte Vorhersage und erklärt sie danach', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'predictOutput', output: '1\n2\n' },
    });
    expect(result.outcome).toBe('PASSED');
    expect(result.feedback.some((f) => f.message.includes('Zwei print-Aufrufe'))).toBe(true);
  });

  it('nennt bei falscher Zeilenzahl konkret die Abweichung', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'predictOutput', output: '1' },
    });

    expect(result.outcome).toBe('FAILED');
    expect(result.feedback[0]?.message).toContain('Anzahl der Ausgabezeilen');
  });

  it('nennt bei gleicher Zeilenzahl die erste abweichende Zeile', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'predictOutput', output: '1\n3' },
    });
    expect(result.feedback[0]?.message).toContain('Bis Zeile 1 stimmt');
    expect(result.feedback[0]?.message).toContain('Ab Zeile 2');
  });
});

describe('Parsons-Aufgaben', () => {
  const payload: ExercisePayload = {
    kind: 'parsons',
    lines: [
      { id: 'l1', code: 'a = 1', indent: 0, distractor: false },
      { id: 'l2', code: 'if a > 0:', indent: 0, distractor: false },
      { id: 'l3', code: 'print(a)', indent: 1, distractor: false },
      { id: 'l4', code: 'print(b)', indent: 0, distractor: true },
    ],
    correctOrder: ['l1', 'l2', 'l3'],
    checkIndentation: true,
  };

  it('akzeptiert richtige Reihenfolge samt Einrückung', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'parsons', orderedLineIds: ['l1', 'l2', 'l3'], indents: [0, 0, 1] },
    });
    expect(result.outcome).toBe('PASSED');
  });

  it('bemängelt eine falsche Einrückung getrennt von der Reihenfolge', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'parsons', orderedLineIds: ['l1', 'l2', 'l3'], indents: [0, 0, 0] },
    });

    expect(result.outcome).toBe('PARTIAL');
    expect(result.feedback.some((f) => f.message.includes('Einrückung noch nicht'))).toBe(true);
  });

  it('erkennt verwendete Ablenker', () => {
    const result = gradeSubmission({
      payload,
      submission: {
        kind: 'parsons',
        orderedLineIds: ['l1', 'l2', 'l3', 'l4'],
        indents: [0, 0, 1, 0],
      },
    });
    expect(result.feedback.some((f) => f.message.includes('gehört'))).toBe(true);
  });

  it('nennt die erste falsche Position', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'parsons', orderedLineIds: ['l1', 'l3', 'l2'], indents: [0, 1, 0] },
    });
    expect(result.feedback.some((f) => f.message.includes('ersten 1 Zeilen'))).toBe(true);
  });
});

describe('Code vervollständigen', () => {
  const payload: ExercisePayload = {
    kind: 'codeCompletion',
    template: 'x = {{blank:wert}}\nprint({{blank:name}})',
    blanks: [
      {
        id: 'wert',
        accepted: ['5'],
        caseSensitive: true,
        description: 'Startwert',
        wrongHint: 'Der Startwert ist eine Zahl.',
      },
      {
        id: 'name',
        accepted: ['x'],
        caseSensitive: true,
        description: 'Variablenname',
        wrongHint: 'Hier soll der Wert erscheinen, nicht der Text.',
      },
    ],
  };

  it('akzeptiert korrekte Lücken auch mit Leerraum', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'codeCompletion', values: { wert: ' 5 ', name: 'x' } },
    });
    expect(result.outcome).toBe('PASSED');
  });

  it('markiert einzelne falsche Lücken und nennt deren Hinweis', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'codeCompletion', values: { wert: '5', name: '"x"' } },
    });

    expect(result.outcome).toBe('PARTIAL');
    expect(result.marks.wert).toBe(true);
    expect(result.marks.name).toBe(false);
    expect(result.feedback.some((f) => f.message.includes('nicht der Text'))).toBe(true);
  });

  it('meldet leere Lücken eigens', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'codeCompletion', values: { wert: '', name: 'x' } },
    });
    expect(result.feedback.some((f) => f.message.includes('noch leer'))).toBe(true);
  });
});

describe('Fehler finden', () => {
  const payload: ExercisePayload = {
    kind: 'findError',
    codeLines: ['a = 1', 'print(b)', 'print(a)'],
    faultyLineNumbers: [2],
    explanation: 'b existiert nicht.',
  };

  it('akzeptiert die richtige Zeile und erklärt danach', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'findError', lineNumbers: [2] },
    });
    expect(result.outcome).toBe('PASSED');
    expect(result.feedback.some((f) => f.message.includes('b existiert nicht'))).toBe(true);
  });

  it('verrät bei falscher Markierung die Lösung nicht', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'findError', lineNumbers: [1] },
    });

    const text = result.feedback.map((f) => f.message).join(' ');
    expect(result.outcome).toBe('FAILED');
    expect(text).not.toContain('b existiert nicht');
    expect(text).toContain('Zeile für Zeile');
  });
});

describe('Code-Aufgaben', () => {
  const tests: TestCase[] = [
    { id: 't1', name: 'Erster Fall', expectedStdout: '1', failureHint: 'Prüfe die erste Ausgabe.' },
    { id: 't2', name: 'Zweiter Fall', expectedStdout: '2' },
  ];

  const payload: ExercisePayload = {
    kind: 'code',
    sourceChecks: [
      {
        id: 'schleife',
        description: 'Es wird eine Schleife verwendet.',
        mustMatch: '\\bfor\\b',
        message: 'Es fehlt noch die Schleife.',
      },
    ],
  };

  it('bewertet alle bestandenen Tests bei erfüllten Quelltextregeln als bestanden', () => {
    const result = gradeSubmission({
      payload,
      submission: {
        kind: 'code',
        code: 'for i in range(2):\n    print(i + 1)',
        testResults: [
          { id: 't1', name: 'Erster Fall', passed: true },
          { id: 't2', name: 'Zweiter Fall', passed: true },
        ],
        runtimeError: null,
      },
      allTests: tests,
    });

    expect(result.outcome).toBe('PASSED');
    expect(result.passedTests).toBe(2);
  });

  it('erkennt einen Verstoß gegen die Quelltextregel trotz grüner Tests', () => {
    const result = gradeSubmission({
      payload,
      submission: {
        kind: 'code',
        code: 'print(1)\nprint(2)',
        testResults: [
          { id: 't1', name: 'Erster Fall', passed: true },
          { id: 't2', name: 'Zweiter Fall', passed: true },
        ],
        runtimeError: null,
      },
      allTests: tests,
    });

    expect(result.outcome).toBe('PARTIAL');
    expect(result.feedback.some((f) => f.message === 'Es fehlt noch die Schleife.')).toBe(true);
  });

  it('nutzt den hinterlegten Hinweis eines fehlgeschlagenen Tests', () => {
    const result = gradeSubmission({
      payload,
      submission: {
        kind: 'code',
        code: 'for i in range(2):\n    print(i)',
        testResults: [
          { id: 't1', name: 'Erster Fall', passed: false },
          { id: 't2', name: 'Zweiter Fall', passed: true },
        ],
        runtimeError: null,
      },
      allTests: tests,
    });

    expect(result.outcome).toBe('PARTIAL');
    expect(result.feedback.some((f) => f.message.includes('Prüfe die erste Ausgabe.'))).toBe(true);
  });

  it('ordnet einen Laufzeitfehler der passenden Fehlerklasse zu', () => {
    const result = gradeSubmission({
      payload,
      submission: {
        kind: 'code',
        code: 'for i in range(2):\n    print(x)',
        testResults: [],
        runtimeError: { type: 'NameError', message: "name 'x' is not defined", line: 2 },
      },
      allTests: tests,
    });

    expect(result.errorType).toBe('NAME');
    expect(result.feedback.some((f) => f.message.includes('NameError'))).toBe(true);
  });

  it('behandelt einen leeren Editor als eigene Fehlerart', () => {
    const result = gradeSubmission({
      payload,
      submission: { kind: 'code', code: '   ', testResults: [], runtimeError: null },
      allTests: tests,
    });

    expect(result.errorType).toBe('EMPTY_SUBMISSION');
    expect(result.feedback[0]?.message).toContain('Editor ist leer');
  });

  it('akzeptiert keine Abgabe mit weniger Testergebnissen als Tests', () => {
    const result = gradeSubmission({
      payload,
      submission: {
        kind: 'code',
        code: 'for i in range(1):\n    print(1)',
        testResults: [{ id: 't1', name: 'Erster Fall', passed: true }],
        runtimeError: null,
      },
      allTests: tests,
    });

    expect(result.outcome).not.toBe('PASSED');
  });

  it('ignoriert gemeldete Ergebnisse zu unbekannten Test-IDs', () => {
    const result = gradeSubmission({
      payload,
      submission: {
        kind: 'code',
        code: 'for i in range(1):\n    print(1)',
        testResults: [
          { id: 't1', name: 'Erster Fall', passed: true },
          { id: 't2', name: 'Zweiter Fall', passed: true },
          { id: 'gefaelscht', name: 'Erfunden', passed: true },
        ],
        runtimeError: null,
      },
      allTests: tests,
    });

    expect(result.totalTests).toBe(2);
    expect(result.passedTests).toBe(2);
  });
});

describe('Formatabgleich', () => {
  it('lehnt eine Abgabe ab, die nicht zur Aufgabenform passt', () => {
    const result = gradeSubmission({
      payload: {
        kind: 'singleChoice',
        options: [
          { id: 'a', text: 'A', feedback: 'A' },
          { id: 'b', text: 'B', feedback: 'B' },
        ],
        correctOptionId: 'a',
      },
      submission: { kind: 'freeText', text: 'irgendwas' },
    });

    expect(result.outcome).toBe('FAILED');
    expect(result.feedback[0]?.message).toContain('passt nicht zur Aufgabenform');
  });
});
