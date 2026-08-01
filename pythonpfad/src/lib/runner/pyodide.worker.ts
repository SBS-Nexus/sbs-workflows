/// <reference lib="webworker" />

/**
 * Web Worker für die Python-Ausführung.
 *
 * Warum ein Worker?
 *  - Die Oberfläche bleibt bedienbar, auch wenn ein Programm rechnet oder in
 *    einer Endlosschleife hängt.
 *  - Der Worker lässt sich jederzeit hart beenden (`terminate()`). Das ist die
 *    zuverlässigste Art, eine Endlosschleife zu stoppen: Sie funktioniert auch
 *    dann, wenn Python selbst keine Unterbrechung mehr prüft.
 *  - Der Worker hat keinen Zugriff auf DOM, Cookies oder `localStorage`.
 *
 * Auf dem Server wird KEIN vom Nutzer eingegebener Python-Code ausgeführt.
 */

import { HARNESS_SOURCE } from './harness-source';

type WorkerRequest =
  | { type: 'init' }
  | {
      type: 'run';
      id: string;
      code: string;
      stdin: string[];
      cases: Array<{
        id: string;
        name: string;
        setup?: string;
        stdin?: string[];
        expectedStdout?: string;
        assertion?: string;
      }>;
    };

type WorkerResponse =
  | { type: 'loading'; message: string; progress: number | null }
  | { type: 'ready'; pythonVersion: string }
  | { type: 'output'; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'result'; id: string; payload: string }
  | { type: 'failure'; id: string | null; message: string };

interface PyodideNamespace {
  set(key: string, value: unknown): void;
  destroy?(): void;
}

interface PyodideApi {
  runPython(code: string, options?: { globals?: PyodideNamespace }): unknown;
  globals: { get(name: string): unknown };
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
  version: string;
  toPy(value: unknown): unknown;
  runPythonAsync(code: string): Promise<unknown>;
}

/** Selbst gehostete Pyodide-Laufzeit unter /public/pyodide. */
const PYODIDE_MODULE_URL = '/pyodide/pyodide.mjs';
const PYODIDE_INDEX_URL = '/pyodide/';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(message: WorkerResponse): void {
  ctx.postMessage(message);
}

let pyodide: PyodideApi | null = null;
let initPromise: Promise<void> | null = null;

async function init(): Promise<void> {
  if (pyodide) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    post({ type: 'loading', message: 'Python-Laufzeit wird geladen …', progress: null });

    // Der Pfad zeigt auf die selbst gehostete Kopie unter /public/pyodide.
    // Der Ignore-Kommentar verhindert, dass der Bundler die Datei einbindet –
    // sie soll zur Laufzeit geladen und vom Browser zwischengespeichert werden.
    // Der Pfad steht in einer Variablen, damit TypeScript ihn nicht als Modul
    // aufzulösen versucht; die Ignore-Kommentare halten den Bundler davon ab.
    const moduleUrl: string = PYODIDE_MODULE_URL;
    const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ moduleUrl)) as {
      loadPyodide: (options: { indexURL: string }) => Promise<PyodideApi>;
    };

    const instance = await mod.loadPyodide({ indexURL: PYODIDE_INDEX_URL });

    instance.setStdout({ batched: (text) => post({ type: 'output', stream: 'stdout', text }) });
    instance.setStderr({ batched: (text) => post({ type: 'output', stream: 'stderr', text }) });

    instance.runPython(HARNESS_SOURCE);

    pyodide = instance;
    const version = String(instance.runPython('__import__("sys").version.split()[0]'));
    post({ type: 'ready', pythonVersion: version });
  })();

  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

function escapeForPython(value: unknown): string {
  // JSON ist eine gültige Python-Literalform für Strings, Zahlen, Listen und
  // Objekte – bis auf true/false/null. Deshalb wird auf Python-Seite json.loads
  // verwendet statt eval.
  return JSON.stringify(JSON.stringify(value));
}

async function handleRun(request: Extract<WorkerRequest, { type: 'run' }>): Promise<void> {
  await init();
  const py = pyodide;
  if (!py) throw new Error('Die Python-Laufzeit ist nicht bereit.');

  const codeLiteral = escapeForPython(request.code);
  const script =
    request.cases.length > 0
      ? `run_tests(__import__("json").loads(${codeLiteral}), __import__("json").loads(${escapeForPython(
          request.cases,
        )}))`
      : `run_plain(__import__("json").loads(${codeLiteral}), __import__("json").loads(${escapeForPython(
          request.stdin,
        )}))`;

  const payload = String(py.runPython(script));
  post({ type: 'result', id: request.id, payload });
}

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === 'init') {
    init().catch((error: unknown) => {
      post({
        type: 'failure',
        id: null,
        message: error instanceof Error ? error.message : String(error),
      });
    });
    return;
  }

  if (request.type === 'run') {
    handleRun(request).catch((error: unknown) => {
      post({
        type: 'failure',
        id: request.id,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }
});
