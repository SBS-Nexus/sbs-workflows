#!/usr/bin/env node
/**
 * LP-03A — Drift-Check für den Lernpfade-Shell-Vertrag.
 *
 * Prüft, nur lesend:
 *  1. Jede App führt bytegleiche Kopien der kanonischen Dateien aus
 *     `docs/learning-shell/` (Tokens, Navigationsvertrag, Dachleiste, Menü).
 *  2. Jede App bindet das Shell-CSS in `src/app/globals.css` ein.
 *  3. Die sechs Dachleistenfarben (`--lp-platform-*`) sind in allen Apps
 *     gleich und entsprechen den kanonischen Werten.
 *  4. Die Navigation jeder App nutzt den Vertrag tatsächlich (keine
 *     ungenutzte Kopie neben einer eigenen Liste).
 *
 * Es wird nichts repariert. Aufruf: `node scripts/check-learning-shell.mjs`.
 * Exit-Code 0 = alles im Vertrag, 1 = Drift (mit Liste der Befunde).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalDir = path.join(root, 'docs', 'learning-shell');

/** Kanonische Datei → Ziel in jeder App (relativ zur App-Wurzel). */
const SHARED = [
  { canonical: 'learning-shell.css', target: { default: 'src/styles/learning-shell.css' } },
  { canonical: 'learning-shell.ts', target: { default: 'src/lib/learning-shell.ts' } },
  {
    canonical: 'learning-platform-bar.tsx',
    target: {
      default: 'src/components/navigation/learning-platform-bar.tsx',
      aipfad: 'src/components/app/learning-platform-bar.tsx',
    },
  },
  { canonical: 'learning-shell.test.ts', target: { default: 'tests/unit/learning-shell.test.ts' } },
  {
    canonical: 'shell-menu.tsx',
    target: {
      default: 'src/components/navigation/shell-menu.tsx',
      aipfad: 'src/components/app/shell-menu.tsx',
    },
  },
];

const APPS = [
  { dir: 'pythonpfad', key: 'python', nav: 'src/components/navigation/app-nav.tsx' },
  { dir: 'sqlpfad', key: 'sql', nav: 'src/components/navigation/app-nav.tsx' },
  { dir: 'aipfad', key: 'ai', nav: 'src/components/app/app-header.tsx' },
];

/** Plattformweit identische Dachleistenfarben (seit LP-04, unverändert). */
const PLATFORM_COLORS = {
  '--lp-platform-bg': '#111827',
  '--lp-platform-fg': '#ffffff',
  '--lp-platform-muted': '#d1d5db',
  '--lp-platform-subtle': '#9ca3af',
  '--lp-platform-hover': '#c7d2fe',
  '--lp-platform-border': '#374151',
};

const CSS_IMPORT = "@import '../styles/learning-shell.css';";

const failures = [];
const fail = (message) => failures.push(message);
const rel = (file) => path.relative(root, file);

function read(file) {
  return existsSync(file) ? readFileSync(file) : null;
}

for (const shared of SHARED) {
  const canonicalFile = path.join(canonicalDir, shared.canonical);
  const canonical = read(canonicalFile);
  if (canonical === null) {
    fail(`kanonische Datei fehlt: ${rel(canonicalFile)}`);
    continue;
  }
  for (const app of APPS) {
    const target = path.join(root, app.dir, shared.target[app.dir] ?? shared.target.default);
    const copy = read(target);
    if (copy === null) fail(`Kopie fehlt: ${rel(target)}`);
    else if (!copy.equals(canonical))
      fail(`Kopie weicht ab: ${rel(target)} ≠ ${rel(canonicalFile)}`);
  }
}

for (const app of APPS) {
  const globalsFile = path.join(root, app.dir, 'src/app/globals.css');
  const globals = read(globalsFile)?.toString('utf8');
  if (globals === undefined) {
    fail(`fehlt: ${rel(globalsFile)}`);
    continue;
  }
  if (!globals.includes(CSS_IMPORT))
    fail(`${rel(globalsFile)} bindet das Shell-CSS nicht ein (${CSS_IMPORT})`);
  for (const [token, expected] of Object.entries(PLATFORM_COLORS)) {
    const values = [...globals.matchAll(new RegExp(`${token}\\s*:\\s*([^;]+);`, 'g'))].map((m) =>
      m[1].trim().toLowerCase(),
    );
    if (values.length === 0) fail(`${rel(globalsFile)}: ${token} fehlt`);
    for (const value of values) {
      if (value !== expected)
        fail(`${rel(globalsFile)}: ${token} ist ${value}, erwartet ${expected}`);
    }
  }

  const navFile = path.join(root, app.dir, app.nav);
  const nav = read(navFile)?.toString('utf8');
  if (nav === undefined) fail(`fehlt: ${rel(navFile)}`);
  else {
    if (!nav.includes("from '@/lib/learning-shell'"))
      fail(`${rel(navFile)} importiert den Navigationsvertrag nicht`);
    if (!nav.includes(`shellNav('${app.key}')`))
      fail(`${rel(navFile)} nutzt nicht shellNav('${app.key}')`);
    if (!nav.includes(`data-lp-app="${app.key}"`))
      fail(`${rel(navFile)} setzt data-lp-app="${app.key}" nicht`);
  }
}

if (failures.length > 0) {
  console.error(`Lernpfade-Shell: ${failures.length} Abweichung(en) vom Vertrag`);
  for (const message of failures) console.error(`  ✗ ${message}`);
  console.error(
    '\nKanonisch ist docs/learning-shell/ — dort ändern und in alle drei Apps kopieren.',
  );
  process.exit(1);
}

console.log(
  `Lernpfade-Shell: ${SHARED.length} Vertragsdateien in ${APPS.length} Apps bytegleich, ` +
    'CSS eingebunden, Dachleistenfarben gleich, Navigation aus dem Vertrag.',
);
