/**
 * Abstraktion der Python-Ausführung.
 *
 * Die Anwendung spricht ausschließlich gegen dieses Interface. Der MVP nutzt
 * `PyodideRunner` (WebAssembly im Web Worker, alles im Browser). Ein späterer
 * `ContainerRunner`, der gegen einen isolierten Sandbox-Dienst spricht, kann
 * ohne Änderung an UI oder Domainlogik ergänzt werden – siehe
 * docs/ARCHITEKTUR.md, Abschnitt "Runner-Abstraktion".
 */

export interface RunnerTestCase {
  id: string;
  name: string;
  setup?: string;
  stdin?: string[];
  expectedStdout?: string;
  assertion?: string;
}

export interface RunnerTestResult {
  id: string;
  name: string;
  passed: boolean;
  /** Kurze, konkrete Meldung – ohne die Lösung zu verraten. */
  message?: string;
  actualStdout?: string;
  expectedStdout?: string;
}

export interface RunnerError {
  type: string;
  message: string;
  line: number | null;
  /** Vollständiger Traceback für den Ausgabebereich. */
  traceback: string;
}

export interface RunResult {
  /** Standardausgabe des Programms. */
  stdout: string;
  /** Fehlerausgabe, meist der Traceback. */
  stderr: string;
  error: RunnerError | null;
  testResults: RunnerTestResult[];
  /** Laufzeit in Millisekunden. */
  durationMs: number;
  /** Wurde die Ausführung wegen Zeitüberschreitung abgebrochen? */
  timedOut: boolean;
  /** Wurde die Ausführung von der Nutzerin bzw. dem Nutzer gestoppt? */
  cancelled: boolean;
}

export interface RunOptions {
  code: string;
  /** Zeilen, die nacheinander von input() geliefert werden. */
  stdin?: string[];
  /** Wenn gesetzt, werden Tests statt eines freien Laufs ausgeführt. */
  tests?: RunnerTestCase[];
  /** Zeitlimit in Millisekunden. */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Schrittweise Ausführung
// ---------------------------------------------------------------------------

export interface TraceVariable {
  name: string;
  /** Bereits als Python-Text dargestellt und auf Länge gekürzt. */
  value: string;
  /** Python-Typname, etwa `int`. Die deutsche Bezeichnung entsteht in der Domainschicht. */
  type: string;
}

export interface TraceStep {
  /** Zeile, die als Nächstes ausgeführt wird (1-basiert). */
  line: number;
  event: 'line' | 'return';
  /** `<module>` auf oberster Ebene, sonst der Funktionsname. */
  function: string;
  /** Verschachtelungstiefe eigener Funktionsaufrufe. 0 = oberste Ebene. */
  depth: number;
  /** Zustand *vor* dieser Zeile, nach Namen sortiert. */
  variables: TraceVariable[];
  /** Länge der bis hierhin erzeugten Ausgabe – erlaubt das Ausschneiden des Zuwachses. */
  stdoutLength: number;
  /** Nur bei `return` gesetzt. */
  returnValue?: string;
}

export interface TraceResult {
  stdout: string;
  error: RunnerError | null;
  steps: TraceStep[];
  /** Wurde die Aufzeichnung wegen der Höchstzahl abgeschnitten? */
  truncated: boolean;
  durationMs: number;
  timedOut: boolean;
  cancelled: boolean;
}

export interface TraceOptions {
  code: string;
  stdin?: string[];
  timeoutMs?: number;
  /** Höchstzahl aufgezeichneter Schritte. */
  maxSteps?: number;
}

/**
 * Obergrenze der Aufzeichnung.
 *
 * 1500 Schritte decken jede Aufgabe des Kurses mit großem Abstand ab. Eine
 * Endlosschleife läuft dagegen sofort dagegen – und wird sauber als
 * abgeschnitten gemeldet, statt den Browser vollzuschreiben.
 */
export const DEFAULT_MAX_TRACE_STEPS = 1_500;

export type RunnerStatus =
  | { phase: 'idle' }
  | { phase: 'loading'; message: string; progress: number | null }
  | { phase: 'ready'; pythonVersion: string }
  | { phase: 'running' }
  | { phase: 'error'; message: string };

export interface PythonRunner {
  /** Lädt die Laufzeit. Mehrfachaufrufe sind unschädlich. */
  init(): Promise<void>;
  run(options: RunOptions): Promise<RunResult>;
  /**
   * Führt aus und zeichnet jeden Schritt auf.
   *
   * Bewusst eine eigene Methode und kein Schalter an `run`: Ein späterer
   * Container-Runner kann die Aufzeichnung anders oder gar nicht anbieten,
   * ohne dass sich die Signatur des normalen Laufs ändert.
   */
  trace(options: TraceOptions): Promise<TraceResult>;
  /** Bricht die laufende Ausführung ab. */
  stop(): Promise<void>;
  /** Verwirft den Zustand vollständig und startet die Laufzeit neu. */
  reset(): Promise<void>;
  /** Gibt alle Ressourcen frei. */
  dispose(): void;
  subscribe(listener: (status: RunnerStatus) => void): () => void;
  /** Ausgabe, während das Programm noch läuft. */
  onOutput(listener: (chunk: { stream: 'stdout' | 'stderr'; text: string }) => void): () => void;
}

/** Standard-Zeitlimit. Reicht für alle Kursaufgaben deutlich aus. */
export const DEFAULT_TIMEOUT_MS = 8_000;

/** Zeitlimit für Testläufe – etwas großzügiger, da mehrere Fälle laufen. */
export const TEST_TIMEOUT_MS = 15_000;
