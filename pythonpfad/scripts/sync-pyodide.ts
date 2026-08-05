/**
 * Kopiert die benötigten Pyodide-Dateien aus node_modules nach public/pyodide.
 *
 * Warum selbst hosten statt CDN?
 *  - Datenschutz: Ohne CDN erfährt kein Dritter, wer wann Python lernt.
 *  - Content Security Policy: `script-src 'self'` bleibt streng.
 *  - Reproduzierbarkeit: Die Laufzeit ist über package-lock.json fest gepinnt.
 *
 * Es werden bewusst nur die Dateien kopiert, die zum Start der Laufzeit nötig
 * sind (~13 MB) – nicht das komplette Paket mit Beispielseiten und Sourcemaps.
 */
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'node_modules', 'pyodide');
const targetDir = path.join(projectRoot, 'public', 'pyodide');

const REQUIRED_FILES = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
] as const;

async function main(): Promise<void> {
  if (!existsSync(sourceDir)) {
    console.error(
      '[pyodide:sync] node_modules/pyodide fehlt. Bitte zuerst "npm install" ausführen.',
    );
    process.exitCode = 1;
    return;
  }

  const pkg = JSON.parse(await readFile(path.join(sourceDir, 'package.json'), 'utf8')) as {
    version: string;
  };

  await mkdir(targetDir, { recursive: true });

  let copied = 0;
  for (const file of REQUIRED_FILES) {
    const from = path.join(sourceDir, file);
    const to = path.join(targetDir, file);
    if (!existsSync(from)) {
      console.error(`[pyodide:sync] Erwartete Datei fehlt: ${file}`);
      process.exitCode = 1;
      return;
    }
    await copyFile(from, to);
    copied += 1;
  }

  // Eine kleine Manifestdatei erlaubt es dem Client, die Version anzuzeigen und
  // den Browser-Cache gezielt zu invalidieren.
  const wasm = await readFile(path.join(targetDir, 'pyodide.asm.wasm'));

  /*
   * Die unkomprimierten Größen – Grundlage der Fortschrittsanzeige.
   *
   * Der naheliegende Weg wäre die `Content-Length`-Kopfzeile. Die gibt es hier
   * aber nicht: Sobald der Server gzip einsetzt – und Browser fragen es immer
   * an – liefert er die Antwort in Stücken und lässt die Längenangabe weg.
   * Der Strom, den `fetch` im Worker herausgibt, ist dagegen schon ausgepackt.
   *
   * Also wird gegen die Größe der Datei auf der Platte gezählt. Sie steht
   * beim Abgleich fest und ändert sich nur mit der Pyodide-Fassung – dann
   * wird auch dieses Manifest neu geschrieben.
   */
  const groessen: Record<string, number> = {};
  for (const file of REQUIRED_FILES) {
    groessen[file] = (await stat(path.join(targetDir, file))).size;
  }

  const manifest = {
    pyodideVersion: pkg.version,
    files: REQUIRED_FILES,
    /** Dateiname → unkomprimierte Größe in Byte. */
    sizes: groessen,
    wasmSha256: createHash('sha256').update(wasm).digest('hex'),
    generatedAt: new Date().toISOString(),
  };
  await writeFile(path.join(targetDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.info(
    `[pyodide:sync] ${copied} Dateien nach public/pyodide kopiert (Pyodide ${pkg.version}).`,
  );
}

await main();
