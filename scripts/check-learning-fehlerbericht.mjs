#!/usr/bin/env node
/**
 * E6.3 — Drift-Check für den Fehlerbericht (docs/learning-fehlerbericht/).
 *
 * Prüft, nur lesend:
 *  1. Die Kopien im Hub und in den drei Apps sind bytegleich.
 *  2. Jede `src/instrumentation.ts` reicht `onRequestError` weiter.
 *  3. Jede Fehlergrenze (`src/app/error.tsx`) meldet an den Fehlerbericht.
 *  4. Keine App bindet ein Sentry-SDK ein: Der Browser spricht nie mit
 *     Sentry, und im Server geht nur hinaus, was der Kern erlaubt.
 *
 * Die Tests des Kerns laufen im selben CI-Job
 * (`node --experimental-strip-types --test docs/learning-fehlerbericht/*.test.ts`).
 *
 * Es wird nichts repariert. Aufruf: `node scripts/check-learning-fehlerbericht.mjs`.
 * Exit-Code 0 = alles im Vertrag, 1 = Drift (mit Liste der Befunde).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalDir = path.join(root, 'docs', 'learning-fehlerbericht');

/** Kanonische Datei → Ziel in jeder App (relativ zur App-Wurzel). */
const SHARED = [
  ['fehlerbericht.ts', 'src/server/fehlerbericht/fehlerbericht.ts'],
  ['fehlerbericht-server.ts', 'src/server/fehlerbericht/fehlerbericht-server.ts'],
  ['anfragefehler.ts', 'src/server/fehlerbericht/anfragefehler.ts'],
  ['route-fehlerbericht.ts', 'src/app/api/fehlerbericht/route.ts'],
  ['fehlerbericht-browser.ts', 'src/lib/fehlerbericht-browser.ts'],
  ['instrumentation-client.ts', 'src/instrumentation-client.ts'],
];

const APPS = ['lernpfade', 'pythonpfad', 'sqlpfad', 'aipfad'];
const WEITERGABE = "export { onRequestError } from '@/server/fehlerbericht/anfragefehler';";

const failures = [];
const fail = (message) => failures.push(message);
const rel = (file) => path.relative(root, file);
const read = (file) => (existsSync(file) ? readFileSync(file) : null);
const text = (file) => read(file)?.toString('utf8') ?? null;

for (const [canonical, target] of SHARED) {
  const canonicalFile = path.join(canonicalDir, canonical);
  const soll = read(canonicalFile);
  if (soll === null) {
    fail(`kanonische Datei fehlt: ${rel(canonicalFile)}`);
    continue;
  }
  for (const app of APPS) {
    const file = path.join(root, app, target);
    const ist = read(file);
    if (ist === null) fail(`${app}: Kopie fehlt: ${rel(file)}`);
    else if (!ist.equals(soll))
      fail(`${app}: weicht vom Vertrag ab: ${rel(file)} (Quelle ${canonical})`);
  }
}

for (const app of APPS) {
  const instrumentierung = text(path.join(root, app, 'src/instrumentation.ts'));
  if (instrumentierung === null) fail(`${app}: src/instrumentation.ts fehlt`);
  else if (!instrumentierung.includes(WEITERGABE))
    fail(`${app}: src/instrumentation.ts reicht onRequestError nicht weiter`);

  const grenze = text(path.join(root, app, 'src/app/error.tsx'));
  if (grenze === null) fail(`${app}: src/app/error.tsx fehlt`);
  else if (
    !grenze.includes("import { meldeBrowserfehler } from '@/lib/fehlerbericht-browser';") ||
    !/meldeBrowserfehler\(error\)/.test(grenze)
  )
    fail(`${app}: src/app/error.tsx meldet nicht an den Fehlerbericht`);

  const paket = text(path.join(root, app, 'package.json'));
  if (paket !== null) {
    const json = JSON.parse(paket);
    const namen = Object.keys({ ...json.dependencies, ...json.devDependencies });
    for (const name of namen.filter((n) => n.startsWith('@sentry/'))) {
      fail(`${app}: ${name} ist eingebunden; Fehlerberichte laufen nur über den eigenen Kern`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Fehlerbericht: ${failures.length} Befund(e)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `Fehlerbericht: ${SHARED.length} Dateien in ${APPS.length} Projekten bytegleich, Instrumentierung und Fehlergrenzen angebunden, kein Sentry-SDK.`,
);
