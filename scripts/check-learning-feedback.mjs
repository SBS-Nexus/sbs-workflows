#!/usr/bin/env node
/**
 * LP-03B — Drift-Check für den gemeinsamen Statusvertrag (Badges, Callouts).
 *
 * Prüft, nur lesend:
 *  1. PythonPfad, SQLPfad, AIPfad und der Hub führen bytegleiche Kopien der
 *     kanonischen Dateien aus `docs/learning-feedback/` (Tokens/CSS, Vertrag;
 *     die drei Fach-Apps zusätzlich den Vertragstest).
 *  2. Jede App bindet das Feedback-CSS in `src/app/globals.css` ein.
 *  3. Die Adapter nutzen den Vertrag tatsächlich: Die Fach-Apps erzeugen
 *     Badge und Callout über `feedbackBadge(…)`/`feedbackCallout(…)`, der Hub
 *     seine Quellzustände über den eigenen Feedback-Baustein. Eine ungenutzte
 *     Kopie neben eigenen Farben genügt nicht.
 *  4. Die Adapter tragen keine eigenen Statusfarben mehr.
 *
 * Es wird nichts repariert. Aufruf: `node scripts/check-learning-feedback.mjs`.
 * Exit-Code 0 = alles im Vertrag, 1 = Drift (mit Liste der Befunde).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalDir = path.join(root, 'docs', 'learning-feedback');

const FACH_APPS = ['pythonpfad', 'sqlpfad', 'aipfad'];
const APPS = [...FACH_APPS, 'lernpfade'];

/** Kanonische Datei → Ziel (relativ zur App-Wurzel) und betroffene Apps. */
const SHARED = [
  { canonical: 'learning-feedback.css', target: 'src/styles/learning-feedback.css', apps: APPS },
  { canonical: 'learning-feedback.ts', target: 'src/lib/learning-feedback.ts', apps: APPS },
  {
    canonical: 'learning-feedback.test.ts',
    target: 'tests/unit/learning-feedback.test.ts',
    apps: FACH_APPS,
  },
];

const CSS_IMPORT = "@import '../styles/learning-feedback.css';";

/** Wo der Vertrag benutzt werden muss — und woran das erkennbar ist. */
const ADAPTERS = [
  ...FACH_APPS.map((dir) => ({
    file: path.join(dir, 'src/components/ui/primitives.tsx'),
    needs: [
      "from '@/lib/learning-feedback'",
      'feedbackBadge(tone)',
      'feedbackCallout(tone)',
      'feedbackLive(live)',
    ],
    // Badge-/Callout-Abschnitt ohne app-eigene Statusfarben.
    section: [/export function Callout\(/, /export function Badge\(/],
  })),
  {
    file: 'lernpfade/src/components/feedback/callout.tsx',
    needs: [
      "from '@/lib/learning-feedback'",
      'feedbackCallout(message.tone)',
      'feedbackLive(message.live)',
    ],
  },
  {
    file: 'lernpfade/src/components/progress/progress-overview.tsx',
    needs: ["from '@/components/feedback/callout'", 'sourceFeedback(', 'vocabularyFeedback('],
  },
];

/** Hinweis auf eigene Statusfarben im Adapter (Tailwind-Klassen oder App-Tokens). */
const OWN_STATUS_COLOR =
  /(?:bg|text|border)-(?:\[var\(--(?:success|caution|alert|accent)|success-|caution-|alert-|wire-|ink-)/;

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
  for (const dir of shared.apps) {
    const target = path.join(root, dir, shared.target);
    const copy = read(target);
    if (copy === null) fail(`Kopie fehlt: ${rel(target)}`);
    else if (!copy.equals(canonical))
      fail(`Kopie weicht ab: ${rel(target)} ≠ ${rel(canonicalFile)}`);
  }
}

for (const dir of APPS) {
  const globalsFile = path.join(root, dir, 'src/app/globals.css');
  const globals = read(globalsFile)?.toString('utf8');
  if (globals === undefined) fail(`fehlt: ${rel(globalsFile)}`);
  else if (!globals.includes(CSS_IMPORT))
    fail(`${rel(globalsFile)} bindet das Feedback-CSS nicht ein (${CSS_IMPORT})`);
}

for (const adapter of ADAPTERS) {
  const file = path.join(root, adapter.file);
  const source = read(file)?.toString('utf8');
  if (source === undefined) {
    fail(`fehlt: ${rel(file)}`);
    continue;
  }
  for (const needle of adapter.needs) {
    if (!source.includes(needle))
      fail(`${rel(file)} nutzt den Statusvertrag nicht (${needle} fehlt)`);
  }
  if (adapter.section) {
    const start = source.search(adapter.section[0]);
    const badge = source.search(adapter.section[1]);
    if (start < 0 || badge < 0) {
      fail(`${rel(file)}: Callout oder Badge nicht gefunden`);
      continue;
    }
    const end = source.indexOf('\n}\n', badge);
    const section = source.slice(start, end < 0 ? undefined : end);
    const own = section.match(OWN_STATUS_COLOR);
    if (own) fail(`${rel(file)}: eigene Statusfarbe im Badge/Callout (${own[0]}…)`);
  }
}

if (failures.length > 0) {
  console.error(`Lernpfade-Statusvertrag: ${failures.length} Abweichung(en)`);
  for (const message of failures) console.error(`  ✗ ${message}`);
  console.error(
    '\nKanonisch ist docs/learning-feedback/ — dort ändern und in alle vier Apps kopieren.',
  );
  process.exit(1);
}

console.log(
  `Lernpfade-Statusvertrag: ${SHARED.length} Vertragsdateien bytegleich in ${APPS.length} Apps, ` +
    'CSS eingebunden, Badge/Callout und Hub-Quellzustände aus dem Vertrag.',
);
