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
    }
  | {
      type: 'trace';
      id: string;
      code: string;
      stdin: string[];
      maxSteps: number;
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

/**
 * Echter Ladefortschritt statt drehendem Rädchen.
 *
 * Pyodide holt seine Laufzeit selbst per `fetch` – rund 13 MB. Von außen ist
 * davon nichts zu sehen; die einzige Rückmeldung wäre ein Rädchen, das sich
 * zwanzig Sekunden dreht. Für jemanden, der zum ersten Mal auf „Ausführen"
 * drückt, ist das kaum von „kaputt" zu unterscheiden – und der häufigste
 * Grund, eine Seite zu schließen.
 *
 * Deshalb wird `fetch` im Worker für die Dauer des Ladens eingepackt. Der
 * Ersatz liest den Antwortstrom mit und zählt die Bytes.
 *
 * Wogegen gezählt wird, ist der heikle Punkt. Die naheliegende
 * `Content-Length`-Kopfzeile fehlt hier: Sobald der Server gzip einsetzt – und
 * Browser fragen es immer an – kommt die Antwort in Stücken und ohne
 * Längenangabe. Der Strom, den `fetch` herausgibt, ist dagegen bereits
 * ausgepackt. Deshalb liefert `manifest.json` die unkomprimierten Größen; sie
 * werden beim Abgleich der Laufzeit festgeschrieben und ändern sich nur mit
 * der Pyodide-Fassung.
 *
 * Der Eingriff ist auf den Worker beschränkt und gilt nur während des Ladens.
 * Danach wird die ursprüngliche Funktion zurückgesetzt – ein dauerhaft
 * verbogenes `fetch` wäre eine Falle für jeden, der später hier etwas ergänzt.
 */
interface PyodideManifest {
  sizes?: Record<string, number>;
}

async function ladeGroessen(): Promise<Record<string, number>> {
  try {
    const antwort = await fetch(`${PYODIDE_INDEX_URL}manifest.json`);
    if (!antwort.ok) return {};
    const manifest = (await antwort.json()) as PyodideManifest;
    return manifest.sizes ?? {};
  } catch {
    // Ohne Manifest bleibt es beim unbestimmten Balken. Das ist unschön, aber
    // kein Grund, das Laden der Laufzeit scheitern zu lassen.
    return {};
  }
}

function beobachteLadefortschritt(
  groessen: Record<string, number>,
  melde: (anteil: number) => void,
): () => void {
  const original = ctx.fetch.bind(ctx);

  // Alles, was laut Manifest kommen wird. Gezählt wird über alle Dateien
  // zusammen – eine Anzeige, die je Datei von vorn beginnt, wäre schlimmer
  // als gar keine.
  const gesamt = Object.values(groessen).reduce((summe, wert) => summe + wert, 0);
  let gelesenGesamt = 0;

  ctx.fetch = (async (eingabe: RequestInfo | URL, init?: RequestInit) => {
    const antwort = await original(eingabe, init);

    const adresse =
      typeof eingabe === 'string' ? eingabe : String((eingabe as Request).url ?? eingabe);
    const name = adresse.split('?')[0]?.split('/').pop() ?? '';
    const erwartet = groessen[name];

    if (!gesamt || !erwartet || !antwort.body) return antwort;

    const leser = antwort.body.getReader();
    const strom = new ReadableStream<Uint8Array>({
      async pull(regler) {
        const { done, value } = await leser.read();
        if (done) {
          regler.close();
          return;
        }
        gelesenGesamt += value.byteLength;
        melde(Math.min(1, gelesenGesamt / gesamt));
        regler.enqueue(value);
      },
      cancel(grund) {
        void leser.cancel(grund);
      },
    });

    return new Response(strom, {
      status: antwort.status,
      statusText: antwort.statusText,
      headers: antwort.headers,
    });
  }) as typeof ctx.fetch;

  return () => {
    ctx.fetch = original;
  };
}

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

    // Nicht bei jedem gelesenen Stück melden: Das wären hunderte Nachrichten
    // je Sekunde für eine Anzeige, die ohnehin nur ganze Prozente zeigt.
    const groessen = await ladeGroessen();
    let zuletztGemeldet = -1;
    const beenden = beobachteLadefortschritt(groessen, (anteil) => {
      const prozent = Math.floor(anteil * 100);
      if (prozent === zuletztGemeldet) return;
      zuletztGemeldet = prozent;
      post({
        type: 'loading',
        message: 'Python-Laufzeit wird geladen …',
        progress: anteil,
      });
    });

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
    beenden();

    // Der letzte Schritt ist kurz, aber nicht sofort vorbei – und ohne eigene
    // Meldung stünde die Anzeige hier scheinbar bei 100 % still.
    post({ type: 'loading', message: 'Lernumgebung wird vorbereitet …', progress: 1 });

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

async function handleTrace(request: Extract<WorkerRequest, { type: 'trace' }>): Promise<void> {
  await init();
  const py = pyodide;
  if (!py) throw new Error('Die Python-Laufzeit ist nicht bereit.');

  const script = `run_traced(__import__("json").loads(${escapeForPython(
    request.code,
  )}), __import__("json").loads(${escapeForPython(request.stdin)}), ${Math.trunc(
    request.maxSteps,
  )})`;

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
    return;
  }

  if (request.type === 'trace') {
    handleTrace(request).catch((error: unknown) => {
      post({
        type: 'failure',
        id: request.id,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }
});
