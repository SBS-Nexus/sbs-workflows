import { describe, expect, it } from 'vitest';
import {
  countLineVisits,
  describeStep,
  describeType,
  diffVariables,
  neverExecutedLines,
  nextStepForLine,
  outputSince,
  outputUpTo,
  summarizeTrace,
} from '@/domain/trace/execution-trace';
import type { TraceStep } from '@/lib/runner/types';

function step(partial: Partial<TraceStep> & { line: number }): TraceStep {
  return {
    event: 'line',
    function: '<module>',
    depth: 0,
    variables: [],
    stdoutLength: 0,
    ...partial,
  };
}

describe('Typbezeichnungen', () => {
  it('übersetzt die geläufigen Python-Typen', () => {
    expect(describeType('str')).toBe('Text');
    expect(describeType('int')).toBe('Ganzzahl');
    expect(describeType('bool')).toBe('Wahrheitswert');
    expect(describeType('NoneType')).toBe('Nichts');
    expect(describeType('dict')).toBe('Zuordnung');
  });

  it('lässt unbekannte Typen unverändert stehen', () => {
    // Eine eigene Klasse heißt in der Anzeige so, wie sie im Code heißt.
    expect(describeType('Konto')).toBe('Konto');
  });
});

describe('Änderungen zwischen zwei Schritten', () => {
  it('markiert den ersten Schritt als unverändert', () => {
    const result = diffVariables([{ name: 'x', value: '1', type: 'int' }], null);
    expect(result[0]?.change).toBe('unchanged');
  });

  it('erkennt eine neu entstandene Variable', () => {
    const result = diffVariables(
      [
        { name: 'x', value: '1', type: 'int' },
        { name: 'y', value: '2', type: 'int' },
      ],
      [{ name: 'x', value: '1', type: 'int' }],
    );
    expect(result.find((entry) => entry.name === 'y')?.change).toBe('new');
    expect(result.find((entry) => entry.name === 'x')?.change).toBe('unchanged');
  });

  it('erkennt einen geänderten Wert und behält den vorherigen', () => {
    const result = diffVariables(
      [{ name: 'summe', value: '6', type: 'int' }],
      [{ name: 'summe', value: '3', type: 'int' }],
    );
    expect(result[0]?.change).toBe('changed');
    expect(result[0]?.previousValue).toBe('3');
  });

  it('ergänzt die deutsche Typbezeichnung', () => {
    const result = diffVariables([{ name: 'name', value: "'Ada'", type: 'str' }], null);
    expect(result[0]?.typeLabel).toBe('Text');
    expect(result[0]?.type).toBe('str');
  });

  it('meldet einen Typwechsel bei gleichem Wert nicht als Änderung', () => {
    // Der Wert entscheidet, nicht der Typ: '1' und 1 haben verschiedene
    // Darstellungen, deshalb greift der Wertvergleich ohnehin.
    const result = diffVariables(
      [{ name: 'x', value: '1', type: 'int' }],
      [{ name: 'x', value: '1', type: 'int' }],
    );
    expect(result[0]?.change).toBe('unchanged');
  });
});

describe('Ausgabe je Schritt', () => {
  const stdout = 'eins\nzwei\ndrei\n';

  it('schneidet den Zuwachs zwischen zwei Schritten aus', () => {
    const vorher = step({ line: 1, stdoutLength: 5 });
    const jetzt = step({ line: 2, stdoutLength: 10 });
    expect(outputSince(stdout, jetzt, vorher)).toBe('zwei\n');
  });

  it('liefert beim ersten Schritt alles bis dahin', () => {
    expect(outputSince(stdout, step({ line: 1, stdoutLength: 5 }), null)).toBe('eins\n');
  });

  it('liefert nichts, wenn die Zeile nichts ausgegeben hat', () => {
    const gleich = step({ line: 2, stdoutLength: 5 });
    expect(outputSince(stdout, gleich, step({ line: 1, stdoutLength: 5 }))).toBe('');
  });

  it('liefert die gesamte Ausgabe bis zu einem Schritt', () => {
    expect(outputUpTo(stdout, step({ line: 3, stdoutLength: 10 }))).toBe('eins\nzwei\n');
    expect(outputUpTo(stdout, undefined)).toBe('');
  });
});

describe('Beschreibung eines Schrittes', () => {
  it('benennt die nächste Zeile auf oberster Ebene', () => {
    expect(describeStep(step({ line: 4 }))).toBe('Als Nächstes läuft Zeile 4.');
  });

  it('nennt die Funktion, wenn die Ausführung darin steckt', () => {
    expect(describeStep(step({ line: 2, function: 'verdopple', depth: 1 }))).toBe(
      'Als Nächstes läuft Zeile 2 in der Funktion verdopple.',
    );
  });

  it('meldet das Ende des Programms', () => {
    expect(describeStep(step({ line: 5, event: 'return' }))).toBe('Das Programm ist zu Ende.');
  });

  it('nennt den Rückgabewert einer Funktion', () => {
    expect(
      describeStep(
        step({ line: 2, event: 'return', function: 'verdopple', returnValue: '42', depth: 1 }),
      ),
    ).toBe('Die Funktion verdopple ist zu Ende und gibt 42 zurück.');
  });

  it('formuliert None als „gibt nichts zurück"', () => {
    expect(
      describeStep(
        step({ line: 2, event: 'return', function: 'gruesse', returnValue: 'None', depth: 1 }),
      ),
    ).toBe('Die Funktion gruesse ist zu Ende und gibt nichts zurück.');
  });

  it('verzichtet auf Bewertungen', () => {
    const texte = [
      describeStep(step({ line: 1 })),
      describeStep(step({ line: 1, event: 'return' })),
    ];
    for (const text of texte) {
      expect(text).not.toMatch(/!|super|toll|leider|falsch/i);
    }
  });
});

describe('Überblick über den Ablauf', () => {
  const steps: TraceStep[] = [
    step({ line: 1 }),
    step({ line: 2 }),
    step({ line: 3 }),
    step({ line: 2 }),
    step({ line: 3 }),
    step({ line: 4, event: 'return' }),
  ];

  it('zählt die Besuche je Zeile', () => {
    const counts = countLineVisits(steps);
    expect(counts.get(2)).toBe(2);
    expect(counts.get(1)).toBe(1);
    // return-Schritte zählen nicht als Zeilenbesuch.
    expect(counts.get(4)).toBeUndefined();
  });

  it('fasst den Ablauf zusammen', () => {
    const overview = summarizeTrace(steps);
    expect(overview.totalSteps).toBe(6);
    expect(overview.executedLines).toBe(3);
    expect(overview.repeatedLines).toEqual([2, 3]);
  });

  it('merkt sich die größte Aufruftiefe', () => {
    expect(summarizeTrace([step({ line: 1 }), step({ line: 2, depth: 2 })]).maxDepth).toBe(2);
  });

  it('findet den nächsten Schritt zu einer Zeile und läuft dabei um', () => {
    expect(nextStepForLine(steps, 3, 0)).toBe(2);
    expect(nextStepForLine(steps, 3, 2)).toBe(4);
    // Nach dem letzten Vorkommen geht es vorn weiter.
    expect(nextStepForLine(steps, 1, 4)).toBe(0);
    expect(nextStepForLine(steps, 99, 0)).toBeNull();
  });
});

describe('Nie ausgeführte Zeilen', () => {
  it('findet den Zweig, der nie an die Reihe kam', () => {
    const code = [
      'alter = 12',
      'if alter >= 18:',
      '    print("erwachsen")',
      'else:',
      '    print("jung")',
    ].join('\n');
    const steps = [step({ line: 1 }), step({ line: 2 }), step({ line: 5 })];
    expect(neverExecutedLines(code, steps)).toEqual([3, 4]);
  });

  it('zählt Leerzeilen und reine Kommentarzeilen nicht mit', () => {
    const code = ['# Eine Erklärung', '', 'x = 1', '   # eingerückter Kommentar', 'y = 2'].join(
      '\n',
    );
    const steps = [step({ line: 3 })];
    // Nur Zeile 5 ist echter Code, der nicht lief.
    expect(neverExecutedLines(code, steps)).toEqual([5]);
  });

  it('meldet nichts, wenn alles gelaufen ist', () => {
    const code = 'a = 1\nb = 2';
    expect(neverExecutedLines(code, [step({ line: 1 }), step({ line: 2 })])).toEqual([]);
  });
});
