import type { TraceStep, TraceVariable } from '@/lib/runner/types';

/**
 * Aufbereitung der schrittweisen Ausführung.
 *
 * Der Worker liefert Rohdaten: Zeile, Ereignis, Variablen, Ausgabelänge. Was
 * eine lernende Person davon sieht, entsteht hier – und zwar ohne Browser,
 * damit es prüfbar bleibt.
 *
 * Didaktischer Grundgedanke: Jeder Schritt zeigt den Zustand *vor* der Zeile,
 * die als Nächstes läuft. Die Wirkung einer Zeile ist damit der Unterschied
 * zwischen zwei Schritten – genau das, was beim Programmieren begriffen werden
 * muss. Deshalb wird nicht nur der Zustand angezeigt, sondern ausdrücklich,
 * was sich geändert hat.
 */

/**
 * Deutsche Bezeichnungen der Python-Typen.
 *
 * Die englischen Namen bleiben zusätzlich sichtbar: Wer später eine
 * Fehlermeldung liest, findet dort `str` und nicht „Text". Die Übersetzung
 * hilft beim Einstieg, ersetzt den Fachbegriff aber nicht.
 */
const TYPE_NAMES: Readonly<Record<string, string>> = {
  int: 'Ganzzahl',
  float: 'Kommazahl',
  str: 'Text',
  bool: 'Wahrheitswert',
  list: 'Liste',
  dict: 'Zuordnung',
  tuple: 'Tupel',
  set: 'Menge',
  frozenset: 'feste Menge',
  NoneType: 'Nichts',
  range: 'Zahlenbereich',
  bytes: 'Bytefolge',
  complex: 'komplexe Zahl',
};

export function describeType(pythonType: string): string {
  return TYPE_NAMES[pythonType] ?? pythonType;
}

export type VariableChange = 'new' | 'changed' | 'unchanged';

export interface VariableView extends TraceVariable {
  change: VariableChange;
  /** Deutsche Typbezeichnung, für die Anzeige neben dem Wert. */
  typeLabel: string;
  /** Vorheriger Wert, falls sich etwas geändert hat. */
  previousValue?: string;
}

/**
 * Vergleicht die Variablen zweier aufeinanderfolgender Schritte.
 *
 * Verschwundene Variablen werden nicht gemeldet: Auf oberster Ebene kommt das
 * praktisch nur bei `del` vor, und innerhalb einer Funktion wäre die Meldung
 * beim Verlassen des Namensraums eher verwirrend als hilfreich.
 */
export function diffVariables(
  current: readonly TraceVariable[],
  previous: readonly TraceVariable[] | null,
): VariableView[] {
  const before = new Map((previous ?? []).map((entry) => [entry.name, entry.value]));

  return current.map((entry) => {
    const typeLabel = describeType(entry.type);
    if (previous === null) {
      return { ...entry, typeLabel, change: 'unchanged' as const };
    }
    if (!before.has(entry.name)) {
      return { ...entry, typeLabel, change: 'new' as const };
    }
    const previousValue = before.get(entry.name);
    if (previousValue !== entry.value) {
      return { ...entry, typeLabel, change: 'changed' as const, previousValue };
    }
    return { ...entry, typeLabel, change: 'unchanged' as const };
  });
}

/**
 * Der Teil der Ausgabe, der zwischen zwei Schritten hinzugekommen ist.
 *
 * Der Worker meldet je Schritt nur die Länge der bis dahin erzeugten Ausgabe.
 * Das genügt, um den Zuwachs auszuschneiden, und ist deutlich sparsamer, als
 * bei jedem Schritt den gesamten Text mitzuschicken.
 */
export function outputSince(stdout: string, step: TraceStep, previous: TraceStep | null): string {
  const from = previous?.stdoutLength ?? 0;
  if (step.stdoutLength <= from) return '';
  return stdout.slice(from, step.stdoutLength);
}

/** Die gesamte Ausgabe bis einschließlich dieses Schrittes. */
export function outputUpTo(stdout: string, step: TraceStep | undefined): string {
  if (!step) return '';
  return stdout.slice(0, step.stdoutLength);
}

/**
 * Ein Satz, der den Schritt beschreibt.
 *
 * Bewusst schlicht und ohne Bewertung: keine Ausrufezeichen, kein „super",
 * kein „jetzt kommt der spannende Teil". Der Satz sagt, was gleich passiert –
 * mehr braucht es nicht, und mehr wäre bei jedem einzelnen Schritt aufdringlich.
 */
export function describeStep(step: TraceStep): string {
  if (step.event === 'return') {
    if (step.function === '<module>') {
      return 'Das Programm ist zu Ende.';
    }
    const value = step.returnValue ?? 'None';
    return value === 'None'
      ? `Die Funktion ${step.function} ist zu Ende und gibt nichts zurück.`
      : `Die Funktion ${step.function} ist zu Ende und gibt ${value} zurück.`;
  }

  if (step.function === '<module>') {
    return `Als Nächstes läuft Zeile ${step.line}.`;
  }
  return `Als Nächstes läuft Zeile ${step.line} in der Funktion ${step.function}.`;
}

/**
 * Wie oft eine Zeile im gesamten Ablauf besucht wird.
 *
 * Die Zahl macht Schleifen sichtbar, noch bevor jemand durch die Zeitleiste
 * geht: Eine Zeile mit „12×" ist offensichtlich Teil einer Wiederholung.
 */
export function countLineVisits(steps: readonly TraceStep[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const step of steps) {
    if (step.event !== 'line') continue;
    counts.set(step.line, (counts.get(step.line) ?? 0) + 1);
  }
  return counts;
}

/**
 * Der nächste Schritt, der zu einer bestimmten Zeile gehört.
 *
 * Wird gebraucht, wenn jemand im Editor auf eine Zeile klickt: Die Zeitleiste
 * springt dann zum nächsten Besuch dieser Zeile und läuft bei Bedarf um.
 */
export function nextStepForLine(
  steps: readonly TraceStep[],
  line: number,
  fromIndex: number,
): number | null {
  for (let offset = 1; offset <= steps.length; offset += 1) {
    const index = (fromIndex + offset) % steps.length;
    if (steps[index]?.line === line) return index;
  }
  return null;
}

export interface TraceOverview {
  totalSteps: number;
  /** Wie viele verschiedene Zeilen überhaupt ausgeführt wurden. */
  executedLines: number;
  /** Höchste erreichte Verschachtelung eigener Funktionen. */
  maxDepth: number;
  /** Zeilen, die mehr als einmal laufen – ein Hinweis auf Wiederholung. */
  repeatedLines: number[];
}

export function summarizeTrace(steps: readonly TraceStep[]): TraceOverview {
  const counts = countLineVisits(steps);
  const repeated = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([line]) => line)
    .sort((a, b) => a - b);

  return {
    totalSteps: steps.length,
    executedLines: counts.size,
    maxDepth: steps.reduce((max, step) => Math.max(max, step.depth), 0),
    repeatedLines: repeated,
  };
}

/**
 * Zeilen des Programms, die nie ausgeführt wurden.
 *
 * Das ist einer der lehrreichsten Hinweise überhaupt: Wer eine Bedingung
 * falsch formuliert, sieht hier sofort, dass ein ganzer Zweig nie an die Reihe
 * kam. Leerzeilen und reine Kommentarzeilen zählen nicht mit, sonst wäre die
 * Liste voller Fehlalarme.
 */
export function neverExecutedLines(code: string, steps: readonly TraceStep[]): number[] {
  const executed = new Set(steps.map((step) => step.line));
  const result: number[] = [];

  code.split('\n').forEach((text, index) => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) return;
    const line = index + 1;
    if (!executed.has(line)) result.push(line);
  });

  return result;
}
