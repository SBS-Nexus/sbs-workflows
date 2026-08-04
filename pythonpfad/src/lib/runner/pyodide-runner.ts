import {
  DEFAULT_MAX_TRACE_STEPS,
  DEFAULT_TIMEOUT_MS,
  type PythonRunner,
  type RunOptions,
  type RunResult,
  type RunnerStatus,
  type RunnerTestResult,
  type TraceOptions,
  type TraceResult,
  type TraceStep,
} from './types';

/**
 * Browserbasierte Python-Ausführung über Pyodide in einem Web Worker.
 *
 * Umgang mit Endlosschleifen:
 * Es gibt ein hartes Zeitlimit. Läuft es ab – oder drückt die Nutzerin bzw. der
 * Nutzer auf "Stopp" –, wird der Worker mit `terminate()` beendet und danach
 * neu gestartet. Das ist bewusst die grobe Variante: Sie wirkt garantiert, auch
 * bei `while True: pass`, wo eine kooperative Unterbrechung nichts ausrichtet.
 * Die bereits erzeugte Ausgabe bleibt erhalten, weil sie fortlaufend aus dem
 * Worker gemeldet wird.
 *
 * Bekannte Grenzen browserbasierter Ausführung (werden im UI benannt):
 *  - `input()` liest aus einer vorher festgelegten Liste, nicht aus einem
 *    echten Terminal.
 *  - Es gibt keinen Netzwerk- und keinen Dateisystemzugriff auf den Rechner.
 *  - Nur Pakete, die Pyodide mitbringt, sind verfügbar.
 *  - Die Laufzeit muss beim ersten Mal geladen werden (rund 13 MB, danach aus
 *    dem Browser-Cache).
 */
export class PyodideRunner implements PythonRunner {
  #worker: Worker | null = null;
  #status: RunnerStatus = { phase: 'idle' };
  #statusListeners = new Set<(status: RunnerStatus) => void>();
  #outputListeners = new Set<(chunk: { stream: 'stdout' | 'stderr'; text: string }) => void>();
  #pending: {
    id: string;
    resolve: (payload: string) => void;
    reject: (error: Error) => void;
  } | null = null;
  #readyPromise: Promise<void> | null = null;
  #resolveReady: (() => void) | null = null;
  #rejectReady: ((error: Error) => void) | null = null;
  #buffer: { stdout: string; stderr: string } = { stdout: '', stderr: '' };
  #disposed = false;
  #pythonVersion = '';

  get status(): RunnerStatus {
    return this.#status;
  }

  get pythonVersion(): string {
    return this.#pythonVersion;
  }

  subscribe(listener: (status: RunnerStatus) => void): () => void {
    this.#statusListeners.add(listener);
    listener(this.#status);
    return () => this.#statusListeners.delete(listener);
  }

  onOutput(listener: (chunk: { stream: 'stdout' | 'stderr'; text: string }) => void): () => void {
    this.#outputListeners.add(listener);
    return () => this.#outputListeners.delete(listener);
  }

  #setStatus(status: RunnerStatus): void {
    this.#status = status;
    for (const listener of this.#statusListeners) listener(status);
  }

  #spawnWorker(): Worker {
    const worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), {
      type: 'module',
      name: 'pythonpfad-python',
    });

    worker.addEventListener('message', (event: MessageEvent) => this.#onMessage(event));
    worker.addEventListener('error', (event: ErrorEvent) => {
      const message = event.message || 'Die Python-Laufzeit konnte nicht gestartet werden.';
      this.#setStatus({ phase: 'error', message });
      this.#rejectReady?.(new Error(message));
      this.#pending?.reject(new Error(message));
      this.#pending = null;
    });

    return worker;
  }

  #onMessage(event: MessageEvent): void {
    const message = event.data as
      | { type: 'loading'; message: string; progress: number | null }
      | { type: 'ready'; pythonVersion: string }
      | { type: 'output'; stream: 'stdout' | 'stderr'; text: string }
      | { type: 'result'; id: string; payload: string }
      | { type: 'failure'; id: string | null; message: string };

    switch (message.type) {
      case 'loading':
        this.#setStatus({
          phase: 'loading',
          message: message.message,
          progress: message.progress,
        });
        break;

      case 'ready':
        this.#pythonVersion = message.pythonVersion;
        this.#setStatus({ phase: 'ready', pythonVersion: message.pythonVersion });
        this.#resolveReady?.();
        break;

      case 'output':
        this.#buffer[message.stream] += message.text;
        for (const listener of this.#outputListeners) {
          listener({ stream: message.stream, text: message.text });
        }
        break;

      case 'result':
        if (this.#pending?.id === message.id) {
          this.#pending.resolve(message.payload);
          this.#pending = null;
        }
        break;

      case 'failure':
        if (message.id && this.#pending?.id === message.id) {
          this.#pending.reject(new Error(message.message));
          this.#pending = null;
        } else {
          this.#setStatus({ phase: 'error', message: message.message });
          this.#rejectReady?.(new Error(message.message));
        }
        break;
    }
  }

  async init(): Promise<void> {
    if (this.#disposed) throw new Error('Der Runner wurde bereits freigegeben.');
    if (this.#readyPromise) return this.#readyPromise;

    this.#readyPromise = new Promise<void>((resolve, reject) => {
      this.#resolveReady = resolve;
      this.#rejectReady = reject;
    });

    this.#worker = this.#spawnWorker();
    this.#worker.postMessage({ type: 'init' });

    return this.#readyPromise;
  }

  async run(options: RunOptions): Promise<RunResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const startedAt = performance.now();

    this.#buffer = { stdout: '', stderr: '' };

    try {
      await this.init();
    } catch (error) {
      return this.#failureResult(error, performance.now() - startedAt);
    }

    const worker = this.#worker;
    if (!worker) {
      return this.#failureResult(new Error('Kein Worker verfügbar.'), 0);
    }

    this.#setStatus({ phase: 'running' });

    const id = crypto.randomUUID();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const payloadPromise = new Promise<string>((resolve, reject) => {
      this.#pending = { id, resolve, reject };
      timeoutHandle = setTimeout(() => {
        reject(new TimeoutError());
      }, timeoutMs);
    });

    worker.postMessage({
      type: 'run',
      id,
      code: options.code,
      stdin: options.stdin ?? [],
      cases: options.tests ?? [],
    });

    try {
      const payload = await payloadPromise;
      clearTimeout(timeoutHandle);
      this.#setStatus({ phase: 'ready', pythonVersion: this.#pythonVersion });

      const parsed = JSON.parse(payload) as {
        stdout: string;
        error: { type: string; message: string; line: number | null; traceback: string } | null;
        testResults: RunnerTestResult[];
      };

      return {
        stdout: parsed.stdout,
        stderr: parsed.error?.traceback ?? '',
        error: parsed.error,
        testResults: parsed.testResults,
        durationMs: Math.round(performance.now() - startedAt),
        timedOut: false,
        cancelled: false,
      };
    } catch (error) {
      clearTimeout(timeoutHandle);
      this.#pending = null;

      const timedOut = error instanceof TimeoutError;
      const cancelled = error instanceof CancelledError;

      if (timedOut || cancelled) {
        // Harter Abbruch: Nur so lässt sich eine Endlosschleife sicher beenden.
        await this.reset();
      }

      return {
        stdout: this.#buffer.stdout,
        stderr: timedOut
          ? `Zeitüberschreitung: Das Programm lief länger als ${Math.round(timeoutMs / 1000)} Sekunden und wurde angehalten.`
          : cancelled
            ? 'Die Ausführung wurde gestoppt.'
            : this.#buffer.stderr,
        error: timedOut
          ? {
              type: 'Zeitüberschreitung',
              message: `Das Programm lief länger als ${Math.round(timeoutMs / 1000)} Sekunden.`,
              line: null,
              traceback: 'Zeitüberschreitung',
            }
          : cancelled
            ? null
            : {
                type: 'Laufzeitfehler',
                message: error instanceof Error ? error.message : String(error),
                line: null,
                traceback: error instanceof Error ? error.message : String(error),
              },
        testResults: [],
        durationMs: Math.round(performance.now() - startedAt),
        timedOut,
        cancelled,
      };
    }
  }

  /**
   * Führt aus und zeichnet jeden Schritt auf.
   *
   * Bewusst ohne Zwischenmeldungen: Die Zeitleiste wird erst angezeigt, wenn
   * die Aufzeichnung vollständig vorliegt. Ein halb gefüllter Schieberegler,
   * dessen Ende sich noch verschiebt, wäre schwerer zu bedienen als eine
   * kurze Wartezeit.
   */
  async trace(options: TraceOptions): Promise<TraceResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxSteps = options.maxSteps ?? DEFAULT_MAX_TRACE_STEPS;
    const startedAt = performance.now();

    this.#buffer = { stdout: '', stderr: '' };

    try {
      await this.init();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        stdout: '',
        error: { type: 'Startfehler', message, line: null, traceback: message },
        steps: [],
        truncated: false,
        durationMs: Math.round(performance.now() - startedAt),
        timedOut: false,
        cancelled: false,
      };
    }

    const worker = this.#worker;
    if (!worker) {
      return {
        stdout: '',
        error: {
          type: 'Startfehler',
          message: 'Kein Worker verfügbar.',
          line: null,
          traceback: 'Kein Worker verfügbar.',
        },
        steps: [],
        truncated: false,
        durationMs: 0,
        timedOut: false,
        cancelled: false,
      };
    }

    this.#setStatus({ phase: 'running' });

    const id = crypto.randomUUID();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const payloadPromise = new Promise<string>((resolve, reject) => {
      this.#pending = { id, resolve, reject };
      timeoutHandle = setTimeout(() => {
        reject(new TimeoutError());
      }, timeoutMs);
    });

    worker.postMessage({
      type: 'trace',
      id,
      code: options.code,
      stdin: options.stdin ?? [],
      maxSteps,
    });

    try {
      const payload = await payloadPromise;
      clearTimeout(timeoutHandle);
      this.#setStatus({ phase: 'ready', pythonVersion: this.#pythonVersion });

      const parsed = JSON.parse(payload) as {
        stdout: string;
        error: { type: string; message: string; line: number | null; traceback: string } | null;
        steps: TraceStep[];
        truncated: boolean;
      };

      return {
        stdout: parsed.stdout,
        error: parsed.error,
        steps: parsed.steps,
        truncated: parsed.truncated,
        durationMs: Math.round(performance.now() - startedAt),
        timedOut: false,
        cancelled: false,
      };
    } catch (error) {
      clearTimeout(timeoutHandle);
      this.#pending = null;

      const timedOut = error instanceof TimeoutError;
      const cancelled = error instanceof CancelledError;
      if (timedOut || cancelled) await this.reset();

      // Beim Abbruch geht die Aufzeichnung verloren: Sie liegt im Worker, der
      // gerade hart beendet wurde. Das ist der bewusst in Kauf genommene Preis
      // dafür, dass eine Endlosschleife garantiert stoppt. Die Meldung sagt
      // deshalb klar, was passiert ist, statt eine leere Leiste zu zeigen.
      const message = timedOut
        ? `Die Aufzeichnung wurde nach ${Math.round(timeoutMs / 1000)} Sekunden abgebrochen. Das Programm läuft vermutlich endlos.`
        : cancelled
          ? 'Die Aufzeichnung wurde gestoppt.'
          : error instanceof Error
            ? error.message
            : String(error);

      return {
        stdout: this.#buffer.stdout,
        error: cancelled
          ? null
          : {
              type: timedOut ? 'Zeitüberschreitung' : 'Laufzeitfehler',
              message,
              line: null,
              traceback: message,
            },
        steps: [],
        truncated: false,
        durationMs: Math.round(performance.now() - startedAt),
        timedOut,
        cancelled,
      };
    }
  }

  #failureResult(error: unknown, durationMs: number): RunResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      stdout: '',
      stderr: message,
      error: { type: 'Startfehler', message, line: null, traceback: message },
      testResults: [],
      durationMs: Math.round(durationMs),
      timedOut: false,
      cancelled: false,
    };
  }

  async stop(): Promise<void> {
    if (this.#pending) {
      this.#pending.reject(new CancelledError());
      this.#pending = null;
    } else {
      await this.reset();
    }
  }

  async reset(): Promise<void> {
    // Wird während des Ladens zurückgesetzt, wartet ein `init()` noch auf sein
    // Versprechen. Ohne diese Ablehnung bliebe ein laufendes `run()` für immer
    // hängen.
    this.#rejectReady?.(new CancelledError());
    this.#worker?.terminate();
    this.#worker = null;
    this.#readyPromise = null;
    this.#resolveReady = null;
    this.#rejectReady = null;
    this.#pending = null;
    this.#setStatus({ phase: 'idle' });
    if (!this.#disposed) {
      await this.init();
    }
  }

  dispose(): void {
    this.#disposed = true;
    this.#worker?.terminate();
    this.#worker = null;
    this.#statusListeners.clear();
    this.#outputListeners.clear();
  }
}

class TimeoutError extends Error {
  constructor() {
    super('Zeitüberschreitung');
    this.name = 'TimeoutError';
  }
}

class CancelledError extends Error {
  constructor() {
    super('Abgebrochen');
    this.name = 'CancelledError';
  }
}

let sharedRunner: PyodideRunner | null = null;

/**
 * Ein Runner pro Browser-Tab. Verschiedene Nutzerinnen und Nutzer arbeiten
 * ohnehin in getrennten Browsern; innerhalb eines Tabs sorgt der Reset zwischen
 * Aufgaben für einen sauberen Zustand.
 */
export function getSharedRunner(): PyodideRunner {
  sharedRunner ??= new PyodideRunner();
  return sharedRunner;
}
