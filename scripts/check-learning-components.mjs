#!/usr/bin/env node
/**
 * LP-03C — Drift-Check für den gemeinsamen Komponentenvertrag (Button, Card,
 * ProgressBar, EmptyState, ErrorState).
 *
 * Prüft, nur lesend:
 *  1. PythonPfad, SQLPfad, AIPfad und der Hub führen bytegleiche Kopien der
 *     kanonischen Dateien aus `docs/learning-components/` (Darstellung,
 *     Vertrag; die drei Fach-Apps zusätzlich den Vertragstest).
 *  2. Jede App bindet das Komponenten-CSS in `src/app/globals.css` ein und
 *     setzt ihren Pfad-Akzent als `data-lp-app` am Wurzelelement.
 *  3. Die Adapter nutzen den Vertrag tatsächlich: Knöpfe, Karten,
 *     Fortschritt, Leer- und Fehlerzustand entstehen über die
 *     Vertragsfunktionen. Eine ungenutzte Kopie neben eigenen Klassen genügt
 *     nicht.
 *  4. Die Adapter tragen keine eigenen Farben, Ränder oder Kanten mehr.
 *  5. Fehler- und 404-Seiten jeder App zeigen den gemeinsamen `ErrorState`;
 *     im Hub gibt es keine alten Knopfklassen und kein natives `<progress>`.
 *
 * Es wird nichts repariert. Aufruf: `node scripts/check-learning-components.mjs`.
 * Exit-Code 0 = alles im Vertrag, 1 = Drift (mit Liste der Befunde).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalDir = path.join(root, 'docs', 'learning-components');

const FACH_APPS = ['pythonpfad', 'sqlpfad', 'aipfad'];
const APPS = [...FACH_APPS, 'lernpfade'];
const APP_IDS = { pythonpfad: 'python', sqlpfad: 'sql', aipfad: 'ai', lernpfade: 'hub' };

const SHARED = [
  {
    canonical: 'learning-components.css',
    target: 'src/styles/learning-components.css',
    apps: APPS,
  },
  { canonical: 'learning-components.ts', target: 'src/lib/learning-components.ts', apps: APPS },
  {
    canonical: 'learning-components.test.ts',
    target: 'tests/unit/learning-components.test.ts',
    apps: FACH_APPS,
  },
];

const CSS_IMPORT = "@import '../styles/learning-components.css';";

/** Woran erkennbar ist, dass ein Adapter den Vertrag benutzt. */
const ADAPTER_NEEDS = [
  "from '@/lib/learning-components'",
  'buttonAttributes(variant, size)',
  "cardAttributes('interactive', emphasis)",
  'progressAttributes(progress, tone, valueText)',
  'progressFillWidth(progress)',
  'emptyAttributes(kind, size)',
  'errorAttributes(kind)',
  'errorReference(reference)',
];

/** Eigene Farben, Ränder oder Kanten im Adapter — gehören in den Vertrag. */
const OWN_LOOK =
  /(?:\b(?:bg|text|border|border-b)-(?:\[var\(--|\[#|signal-|alert-|success-|caution-|ink-|white|black)|btn-press|karte-flaeche|rounded-(?:xl|2xl|3xl|\[var))/;

const failures = [];
const fail = (message) => failures.push(message);
const rel = (file) => path.relative(root, file);
const read = (file) => (existsSync(file) ? readFileSync(file) : null);
const text = (file) => read(file)?.toString('utf8');

// 1. Bytegleiche Kopien
for (const shared of SHARED) {
  const canonicalFile = path.join(canonicalDir, shared.canonical);
  const canonical = read(canonicalFile);
  if (canonical === null) {
    fail(`kanonische Datei fehlt: ${rel(canonicalFile)}`);
    continue;
  }
  for (const dir of shared.apps) {
    const target = path.join(root, dir, shared.target);
    const copy = read(target);
    if (copy === null) fail(`Kopie fehlt: ${rel(target)}`);
    else if (!copy.equals(canonical))
      fail(`Kopie weicht ab: ${rel(target)} ≠ ${rel(canonicalFile)}`);
  }
}

// 2. CSS eingebunden, Pfad-Akzent gesetzt
for (const dir of APPS) {
  const globalsFile = path.join(root, dir, 'src/app/globals.css');
  const globals = text(globalsFile);
  if (globals === undefined) fail(`fehlt: ${rel(globalsFile)}`);
  else if (!globals.includes(CSS_IMPORT))
    fail(`${rel(globalsFile)} bindet das Komponenten-CSS nicht ein (${CSS_IMPORT})`);

  const layoutFile = path.join(root, dir, 'src/app/layout.tsx');
  const layout = text(layoutFile);
  const attribute = `data-lp-app="${APP_IDS[dir]}"`;
  if (layout === undefined) fail(`fehlt: ${rel(layoutFile)}`);
  else if (!/<html[\s\S]*?>/.exec(layout)?.[0].includes(attribute))
    fail(`${rel(layoutFile)}: <html> trägt nicht ${attribute}`);
}

// 3./4. Adapter benutzen den Vertrag und tragen kein eigenes Aussehen
for (const dir of APPS) {
  const file = path.join(root, dir, 'src/components/ui/primitives.tsx');
  const source = text(file);
  if (source === undefined) {
    fail(`fehlt: ${rel(file)}`);
    continue;
  }
  for (const needle of ADAPTER_NEEDS) {
    if (!source.includes(needle))
      fail(`${rel(file)} nutzt den Komponentenvertrag nicht (${needle} fehlt)`);
  }
  const components = [
    'Button',
    'ButtonLink',
    'CardLink',
    'ProgressBar',
    'EmptyState',
    'ErrorState',
  ];
  if (FACH_APPS.includes(dir)) components.push('Card');
  for (const name of components) {
    const start = `export function ${name}(`;
    const from = source.indexOf(start);
    if (from < 0) {
      fail(`${rel(file)}: ${name} fehlt`);
      continue;
    }
    const end = source.indexOf('\n}\n', from);
    const body = source.slice(from, end < 0 ? undefined : end);
    const own = body.match(OWN_LOOK);
    if (own) fail(`${rel(file)}: eigenes Aussehen in ${name} (${own[0]}…)`);
  }
}

// 5. Fehler- und 404-Seiten; Altlasten im Hub
for (const dir of APPS) {
  for (const page of ['error.tsx', 'not-found.tsx']) {
    const file = path.join(root, dir, 'src/app', page);
    const source = text(file);
    if (source === undefined) fail(`fehlt: ${rel(file)}`);
    else if (!source.includes('<ErrorState')) fail(`${rel(file)} zeigt keinen ErrorState`);
  }
}

function* tsxFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* tsxFiles(full);
    else if (full.endsWith('.tsx')) yield full;
  }
}

for (const file of tsxFiles(path.join(root, 'lernpfade/src'))) {
  const source = text(file);
  if (/className=["'{`][^"'`]*\bbutton (?:button-)/.test(source))
    fail(`${rel(file)}: alte Knopfklasse statt Button/ButtonLink`);
  if (/<progress[\s>]/.test(source)) fail(`${rel(file)}: natives <progress> statt ProgressBar`);
}

if (failures.length > 0) {
  console.error(`Lernpfade-Komponentenvertrag: ${failures.length} Abweichung(en)`);
  for (const message of failures) console.error(`  ✗ ${message}`);
  console.error(
    '\nKanonisch ist docs/learning-components/ — dort ändern und in alle vier Apps kopieren.',
  );
  process.exit(1);
}

console.log(
  `Lernpfade-Komponentenvertrag: ${SHARED.length} Vertragsdateien bytegleich in ${APPS.length} Apps, ` +
    'CSS eingebunden, Pfad-Akzent gesetzt, Adapter, Fehler- und 404-Seiten aus dem Vertrag.',
);
