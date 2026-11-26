#!/usr/bin/env node
/**
 * LP-03A — Drift-Check für den Lernpfade-Shell-Vertrag.
 *
 * Prüft, nur lesend:
 *  1. Jede App führt bytegleiche Kopien der kanonischen Dateien aus
 *     `docs/learning-shell/` (Tokens, Navigationsvertrag, Dachleiste, Menü).
 *  2. Jede App bindet das Shell-CSS in `src/app/globals.css` ein.
 *  3. Die sechs Dachleistenfarben (`--lp-platform-*`) stehen mit den
 *     kanonischen Werten im gemeinsamen Token-Vertrag
 *     (`docs/learning-tokens/learning-tokens.css`, seit Roadmap E3) und
 *     keine App notiert sie in `src/app/globals.css` noch einmal selbst.
 *     Dass jede App die Token-Datei bytegleich einbindet, prüft
 *     `check-learning-tokens.mjs`.
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
  {
    // E6.1: Impressum, Datenschutz und Status unter jedem Inhalt.
    canonical: 'learning-legal-footer.tsx',
    target: {
      default: 'src/components/navigation/learning-legal-footer.tsx',
      aipfad: 'src/components/app/learning-legal-footer.tsx',
    },
  },
];

const APPS = [
  { dir: 'pythonpfad', key: 'python', nav: 'src/components/navigation/app-nav.tsx' },
  { dir: 'sqlpfad', key: 'sql', nav: 'src/components/navigation/app-nav.tsx' },
  { dir: 'aipfad', key: 'ai', nav: 'src/components/app/app-header.tsx' },
];

/** Plattformweit identische Dachleistenfarben (seit LP-04, unverändert). */
const TOKENS_FILE = path.join(root, 'docs', 'learning-tokens', 'learning-tokens.css');
const PLATFORM_COLORS = {
  '--lp-platform-bg': '#0b0e0e',
  '--lp-platform-fg': '#f1f1e9',
  '--lp-platform-muted': '#d4dbd3',
  '--lp-platform-subtle': '#a2aba5',
  '--lp-platform-hover': '#d0fa83',
  '--lp-platform-border': '#26302b',
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

const tokens = read(TOKENS_FILE)?.toString('utf8');
if (tokens === undefined) fail(`fehlt: ${rel(TOKENS_FILE)}`);
else {
  for (const [token, expected] of Object.entries(PLATFORM_COLORS)) {
    const values = [...tokens.matchAll(new RegExp(`${token}\\s*:\\s*([^;]+);`, 'g'))].map((m) =>
      m[1].trim().toLowerCase(),
    );
    if (values.length !== 1) fail(`${rel(TOKENS_FILE)}: ${token} steht ${values.length}× statt 1×`);
    else if (values[0] !== expected)
      fail(`${rel(TOKENS_FILE)}: ${token} ist ${values[0]}, erwartet ${expected}`);
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
  for (const token of Object.keys(PLATFORM_COLORS)) {
    if (new RegExp(`${token}\\s*:`).test(globals))
      fail(`${rel(globalsFile)}: ${token} gehört in den Token-Vertrag, nicht in die App`);
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
    'CSS eingebunden, Dachleistenfarben aus dem Token-Vertrag, Navigation aus dem Vertrag.',
);
