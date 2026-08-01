import { describe, expect, it } from 'vitest';
import {
  MIN_ATTEMPTS_FOR_LEVEL,
  canRevealSolution,
  evaluateHintAvailability,
  followUpAfterSolution,
  hintLevelLabel,
  visibleHints,
} from '@/domain/hints/hint-ladder';
import {
  TIMEOUT_ERROR,
  errorSignature,
  explainPythonError,
  extractLineNumber,
} from '@/domain/errors/python-errors';
import type { Hint } from '@/domain/content/exercise-payload';

const HINTS: Hint[] = [
  { level: 1, kind: 'impulse', text: 'Denkimpuls' },
  { level: 2, kind: 'concept', text: 'Konzept' },
  { level: 3, kind: 'structure', text: 'Struktur' },
  { level: 4, kind: 'partial', text: 'Teilcode', code: 'x = 1' },
  { level: 5, kind: 'explanation', text: 'Erklärung' },
];

describe('Hinweisleiter', () => {
  it('gibt Stufe 1 sofort frei', () => {
    const availability = evaluateHintAvailability(HINTS, { attempts: 0, revealedLevel: 0 });
    expect(availability[0]?.available).toBe(true);
  });

  it('sperrt höhere Stufen, solange die vorherige nicht aufgedeckt ist', () => {
    const availability = evaluateHintAvailability(HINTS, { attempts: 5, revealedLevel: 0 });

    expect(availability[1]?.available).toBe(false);
    expect(availability[1]?.blockedReason).toContain('Denkimpuls');
  });

  it('verlangt eigene Versuche, bevor Teilcode und Erklärung frei werden', () => {
    const nachEinemVersuch = evaluateHintAvailability(HINTS, { attempts: 1, revealedLevel: 3 });
    expect(nachEinemVersuch[3]?.available).toBe(false);
    expect(nachEinemVersuch[3]?.attemptsMissing).toBe(MIN_ATTEMPTS_FOR_LEVEL[4]! - 1);

    const nachZweiVersuchen = evaluateHintAvailability(HINTS, { attempts: 2, revealedLevel: 3 });
    expect(nachZweiVersuchen[3]?.available).toBe(true);

    const erklaerungZuFrueh = evaluateHintAvailability(HINTS, { attempts: 2, revealedLevel: 4 });
    expect(erklaerungZuFrueh[4]?.available).toBe(false);

    const erklaerungFrei = evaluateHintAvailability(HINTS, { attempts: 3, revealedLevel: 4 });
    expect(erklaerungFrei[4]?.available).toBe(true);
  });

  it('formuliert die Sperrbegründung ermutigend statt abweisend', () => {
    const availability = evaluateHintAvailability(HINTS, { attempts: 1, revealedLevel: 3 });
    expect(availability[3]?.blockedReason).toMatch(/Versuche|eigene Versuche/);
  });

  it('gibt die Musterlösung erst nach vollständiger Leiter und drei Versuchen frei', () => {
    expect(canRevealSolution({ attempts: 2, revealedLevel: 5 }, HINTS)).toBe(false);
    expect(canRevealSolution({ attempts: 3, revealedLevel: 4 }, HINTS)).toBe(false);
    expect(canRevealSolution({ attempts: 3, revealedLevel: 5 }, HINTS)).toBe(true);
  });

  it('liefert nur bereits aufgedeckte Hinweise aus', () => {
    expect(visibleHints(HINTS, { attempts: 9, revealedLevel: 2 })).toHaveLength(2);
    expect(visibleHints(HINTS, { attempts: 9, revealedLevel: 0 })).toHaveLength(0);
  });

  it('benennt jede Stufe verständlich', () => {
    expect(hintLevelLabel(1)).toBe('Denkimpuls');
    expect(hintLevelLabel(4)).toBe('Teilcode');
    expect(hintLevelLabel(5)).toBe('Vollständige Erklärung');
  });

  it('verlangt nach einer gesehenen Lösung eine Nacharbeit', () => {
    const followUp = followUpAfterSolution();
    expect(followUp.required).toBe(true);
    expect(followUp.reason).toContain('ohne Vorlage');
  });

  // Regression: Die Oberfläche berechnet die Verfügbarkeit nach jedem Versuch
  // und jedem Aufdecken neu, statt die serverseitig gerenderte Fassung zu
  // behalten. Dafür muss die Prüfung allein mit Stufennummern auskommen –
  // die Hinweistexte liegen im Browser gar nicht vor.
  it('kommt ohne die Hinweistexte aus', () => {
    const nurStufen = [{ level: 1 }, { level: 2 }, { level: 3 }, { level: 4 }, { level: 5 }];

    expect(evaluateHintAvailability(nurStufen, { attempts: 1, revealedLevel: 1 })).toEqual(
      evaluateHintAvailability(HINTS, { attempts: 1, revealedLevel: 1 }),
    );
    expect(canRevealSolution({ attempts: 3, revealedLevel: 5 }, nurStufen)).toBe(true);
  });

  it('gibt die nächste Stufe frei, sobald die vorherige aufgedeckt ist', () => {
    // Ausgangslage im Browser direkt nach dem Aufdecken von Stufe 1.
    const vorher = evaluateHintAvailability(HINTS, { attempts: 1, revealedLevel: 0 });
    expect(vorher[1]?.available).toBe(false);

    const nachher = evaluateHintAvailability(HINTS, { attempts: 1, revealedLevel: 1 });
    expect(nachher[1]?.available).toBe(true);
  });

  it('gibt die nächste Stufe frei, sobald ein weiterer Versuch vorliegt', () => {
    const vorVersuch = evaluateHintAvailability(HINTS, { attempts: 1, revealedLevel: 3 });
    expect(vorVersuch[3]?.available).toBe(false);

    const nachVersuch = evaluateHintAvailability(HINTS, { attempts: 2, revealedLevel: 3 });
    expect(nachVersuch[3]?.available).toBe(true);
  });
});

describe('Fehlererklärungen', () => {
  const FAELLE: Array<[string, string, string]> = [
    [
      'Traceback (most recent call last):\n  File "<exec>", line 3, in <module>\nNameError: name \'x\' is not defined',
      'NameError',
      'NAME',
    ],
    [
      'Traceback (most recent call last):\n  File "<exec>", line 2, in <module>\nTypeError: can only concatenate str',
      'TypeError',
      'TYPE',
    ],
    ['  File "<exec>", line 4\nSyntaxError: expected \':\'', 'SyntaxError', 'SYNTAX'],
    [
      'Traceback (most recent call last):\n  File "<exec>", line 1, in <module>\nValueError: invalid literal for int()',
      'ValueError',
      'VALUE',
    ],
    [
      'Traceback (most recent call last):\n  File "<exec>", line 5, in <module>\nZeroDivisionError: division by zero',
      'ZeroDivisionError',
      'ZERO_DIVISION',
    ],
    [
      'Traceback (most recent call last):\n  File "<exec>", line 2, in <module>\nIndexError: list index out of range',
      'IndexError',
      'INDEX',
    ],
    [
      'Traceback (most recent call last):\n  File "<exec>", line 2, in <module>\nKeyError: \'name\'',
      'KeyError',
      'KEY',
    ],
    [
      '  File "<exec>", line 3\nIndentationError: unexpected indent',
      'IndentationError',
      'INDENTATION',
    ],
  ];

  it.each(FAELLE)('erklärt %s vollständig auf Deutsch', (traceback, typ, kategorie) => {
    const info = explainPythonError(traceback);

    expect(info.pythonType).toBe(typ);
    expect(info.category).toBe(kategorie);
    expect(info.meaning.length).toBeGreaterThan(30);
    expect(info.likelyCauses.length).toBeGreaterThan(0);
    expect(info.searchStrategy.length).toBeGreaterThan(0);
    expect(info.selfCheck).toMatch(/\?$/);
    // Es darf keine fertige Lösung ausgegeben werden.
    expect(info.meaning).not.toContain('Die Lösung lautet');
  });

  it('findet die Zeilennummer im Traceback', () => {
    expect(
      extractLineNumber(
        'Traceback (most recent call last):\n  File "<exec>", line 7, in <module>\nNameError: x',
      ),
    ).toBe(7);
  });

  it('nimmt die letzte Zeile aus dem Nutzercode, nicht aus Bibliotheken', () => {
    const traceback =
      'Traceback (most recent call last):\n' +
      '  File "<exec>", line 3, in <module>\n' +
      '  File "/lib/python/module.py", line 99, in helfer\n' +
      '  File "<exec>", line 8, in innen\n' +
      'ValueError: kaputt';
    expect(extractLineNumber(traceback)).toBe(8);
  });

  it('liefert für unbekannte Fehlertypen eine brauchbare Rückfallerklärung', () => {
    const info = explainPythonError('SomethingWeirdError: was auch immer');
    expect(info.category).toBe('RUNTIME_OTHER');
    expect(info.searchStrategy.join(' ')).toContain('von unten nach oben');
  });

  it('kommt mit leerem Traceback zurecht', () => {
    const info = explainPythonError('   ');
    expect(info.pythonType).toBe('Unbekannt');
    expect(info.line).toBeNull();
  });

  it('erklärt die Zeitüberschreitung mit Bezug auf Endlosschleifen', () => {
    expect(TIMEOUT_ERROR.category).toBe('TIMEOUT');
    expect(TIMEOUT_ERROR.likelyCauses.join(' ')).toContain('while');
    expect(TIMEOUT_ERROR.line).toBeNull();
  });

  it('erzeugt eine stabile Signatur für Statistiken', () => {
    expect(errorSignature("NameError: name 'x' is not defined")).toBe('NameError');
  });
});
