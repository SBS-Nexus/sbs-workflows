#!/usr/bin/env node
/**
 * Roadmap E3 — Drift-Check für den gemeinsamen Token-Vertrag (Learning OS).
 *
 * Prüft, nur lesend:
 *  1. Hub, PythonPfad, SQLPfad und AIPfad führen eine bytegleiche Kopie von
 *     `docs/learning-tokens/learning-tokens.css` unter
 *     `src/styles/learning-tokens.css` und binden sie in `src/app/globals.css`
 *     ein.
 *  2. Niemand notiert die Werte daneben noch einmal selbst: Kein Name, den die
 *     Token-Datei festlegt (`--los-*`, `--lp-platform-*`), wird in den
 *     `globals.css` der Apps oder im `learning-os.css` des Hubs neu belegt.
 *  3. Die Grundskala der Fach-Apps (`--color-ink-50 … -950`) und die Modul-
 *     und Bereichsfarben von PythonPfad und SQLPfad verweisen auf die Tokens,
 *     statt eigene Hexwerte zu tragen.
 *  4. Die gemeinsamen Verträge beziehen ihre neutralen Töne (Flächen, Text,
 *     Ränder) aus den Tokens und nicht mehr aus einem eigenen Kaltgrau.
 *  5. Schrift: Die IBM-Plex-Dateien aus `docs/learning-tokens/schriften/`
 *     liegen bytegleich unter `src/app/schriften/`, jede App lädt sie in
 *     `src/app/layout.tsx` als `--font-plex-sans`/`--font-plex-mono` am
 *     <html>, und `--font-sans`/`--font-mono` verweisen auf die Stapel des
 *     Vertrags statt eigene zu tragen.
 *
 * Es wird nichts repariert. Aufruf: `node scripts/check-learning-tokens.mjs`.
 * Exit-Code 0 = alles im Vertrag, 1 = Drift (mit Liste der Befunde).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalFile = path.join(root, 'docs', 'learning-tokens', 'learning-tokens.css');

const APPS = ['lernpfade', 'pythonpfad', 'sqlpfad', 'aipfad'];
const FACH_APPS = ['pythonpfad', 'sqlpfad', 'aipfad'];
const MIT_MODULFARBEN = ['pythonpfad', 'sqlpfad'];
const TARGET = 'src/styles/learning-tokens.css';
const CSS_IMPORT = "@import '../styles/learning-tokens.css';";
const STUFEN = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const ROLLEN = ['modul-0', 'modul-1', 'modul-2', 'modul-3', 'projekt', 'wiederholen'];
const SCHRIFTEN = ['plex-sans.woff2', 'plex-mono-400.woff2', 'plex-mono-600.woff2'];
const SCHRIFT_ORDNER = path.join(root, 'docs', 'learning-tokens', 'schriften');
/** Woran im Layout erkennbar ist, dass die Schrift geladen und gesetzt wird. */
const LAYOUT_NEEDS = [
  "from 'next/font/local'",
  "'./schriften/plex-sans.woff2'",
  "'./schriften/plex-mono-400.woff2'",
  "'./schriften/plex-mono-600.woff2'",
  "variable: '--font-plex-sans'",
  "variable: '--font-plex-mono'",
  '${plexSans.variable} ${plexMono.variable}',
];
/** Eigene Schriftstapel neben dem Vertrag. */
const EIGENE_SCHRIFT = /Iowan Old Style|['"]Inter['"]|Helvetica Neue/;

/** Vertragsdatei → Eigenschaften, die auf `var(--los-…)` verweisen müssen. */
const NEUTRAL = {
  'docs/learning-components/learning-components.css': [
    '--lp-ui-surface',
    '--lp-ui-surface-sunken',
    '--lp-ui-track',
    '--lp-ui-text',
    '--lp-ui-text-muted',
    '--lp-ui-border',
    '--lp-ui-border-strong',
    '--lp-ui-disabled-bg',
    '--lp-ui-disabled-fg',
    '--lp-ui-secondary-bg',
    '--lp-ui-secondary-hover',
    '--lp-ui-secondary-border',
    '--lp-ui-secondary-edge',
    '--lp-ui-neutral',
  ],
  'docs/learning-shell/learning-shell.css': [
    '--lp-shell-surface',
    '--lp-shell-surface-hover',
    '--lp-shell-text',
    '--lp-shell-text-muted',
    '--lp-shell-border',
  ],
  'docs/learning-feedback/learning-feedback.css': [
    '--lp-feedback-body-text',
    '--lp-feedback-neutral-surface',
    '--lp-feedback-neutral-edge',
    '--lp-feedback-neutral-text',
    '--lp-feedback-locked-surface',
    '--lp-feedback-locked-edge',
    '--lp-feedback-locked-text',
  ],
};

const failures = [];
const fail = (message) => failures.push(message);
const rel = (file) => path.relative(root, file);
const read = (file) => (existsSync(file) ? readFileSync(file) : null);
const ohneKommentare = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Alle Werte einer Eigenschaft in einem Stylesheet, ohne Kommentare. */
function werte(css, name) {
  return [...ohneKommentare(css).matchAll(new RegExp(`(?<![\\w-])${name}\\s*:\\s*([^;]+);`, 'g'))].map(
    (m) => m[1].trim(),
  );
}

const canonical = read(canonicalFile);
if (canonical === null) {
  fail(`kanonische Datei fehlt: ${rel(canonicalFile)}`);
} else {
  const tokenNamen = [
    ...new Set(
      [...ohneKommentare(canonical.toString('utf8')).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
    ),
  ];

  // 1. Bytegleiche Kopien, eingebunden
  for (const dir of APPS) {
    const target = path.join(root, dir, TARGET);
    const copy = read(target);
    if (copy === null) fail(`Kopie fehlt: ${rel(target)}`);
    else if (!copy.equals(canonical)) fail(`Kopie weicht ab: ${rel(target)} ≠ ${rel(canonicalFile)}`);

    const globalsFile = path.join(root, dir, 'src/app/globals.css');
    const globals = read(globalsFile)?.toString('utf8');
    if (globals === undefined) {
      fail(`fehlt: ${rel(globalsFile)}`);
      continue;
    }
    if (!globals.includes(CSS_IMPORT))
      fail(`${rel(globalsFile)} bindet den Token-Vertrag nicht ein (${CSS_IMPORT})`);

    // 2. Keine zweite Quelle für dieselben Namen
    const eigene = [globalsFile];
    if (dir === 'lernpfade') eigene.push(path.join(root, dir, 'src/styles/learning-os.css'));
    for (const file of eigene) {
      const css = read(file)?.toString('utf8');
      if (css === undefined) continue;
      for (const name of tokenNamen) {
        if (werte(css, name).length > 0)
          fail(`${rel(file)}: ${name} steht im Token-Vertrag und wird hier neu belegt`);
      }
    }
  }

  // 3. Grundskala und Modulfarben verweisen auf die Tokens
  for (const dir of FACH_APPS) {
    const globalsFile = path.join(root, dir, 'src/app/globals.css');
    const globals = read(globalsFile)?.toString('utf8');
    if (globals === undefined) continue;
    for (const stufe of STUFEN) {
      const gefunden = werte(globals, `--color-ink-${stufe}`);
      if (gefunden.length === 0) fail(`${rel(globalsFile)}: --color-ink-${stufe} fehlt`);
      for (const wert of gefunden) {
        if (wert !== `var(--los-ton-${stufe})`)
          fail(`${rel(globalsFile)}: --color-ink-${stufe} ist ${wert}, erwartet var(--los-ton-${stufe})`);
      }
    }
    if (!MIT_MODULFARBEN.includes(dir)) continue;
    for (const rolle of ROLLEN) {
      for (const [name, hell, dunkel] of [
        [rolle, rolle, `${rolle}-dunkel`],
        [`${rolle}-soft`, `${rolle}-weich`, `${rolle}-dunkel-weich`],
      ]) {
        const gefunden = werte(globals, `--color-${name}`);
        const erwartet = [`var(--los-${hell})`, `var(--los-${dunkel})`, `var(--los-${dunkel})`];
        if (JSON.stringify(gefunden) !== JSON.stringify(erwartet))
          fail(
            `${rel(globalsFile)}: --color-${name} ist [${gefunden.join(', ')}], ` +
              `erwartet hell ${erwartet[0]} und zweimal dunkel ${erwartet[1]}`,
          );
      }
    }
  }

  // 4. Neutrale Töne der Verträge aus den Tokens
  for (const [datei, namen] of Object.entries(NEUTRAL)) {
    const file = path.join(root, datei);
    const css = read(file)?.toString('utf8');
    if (css === undefined) {
      fail(`fehlt: ${datei}`);
      continue;
    }
    for (const name of namen) {
      const gefunden = werte(css, name);
      if (gefunden.length === 0) fail(`${datei}: ${name} fehlt`);
      for (const wert of gefunden) {
        if (!/^var\(--los-[\w-]+\)$/.test(wert))
          fail(`${datei}: ${name} ist ${wert}, erwartet ein Verweis auf var(--los-…)`);
        else if (!tokenNamen.includes(wert.slice(4, -1)))
          fail(`${datei}: ${name} verweist auf ${wert}, das der Token-Vertrag nicht kennt`);
      }
    }
  }
}

// 5. Schrift
for (const datei of SCHRIFTEN) {
  const kanonisch = read(path.join(SCHRIFT_ORDNER, datei));
  if (kanonisch === null) {
    fail(`kanonische Schrift fehlt: ${rel(path.join(SCHRIFT_ORDNER, datei))}`);
    continue;
  }
  for (const dir of APPS) {
    const ziel = path.join(root, dir, 'src/app/schriften', datei);
    const kopie = read(ziel);
    if (kopie === null) fail(`Schrift fehlt: ${rel(ziel)}`);
    else if (!kopie.equals(kanonisch)) fail(`Schrift weicht ab: ${rel(ziel)}`);
  }
}
for (const dir of APPS) {
  const layoutFile = path.join(root, dir, 'src/app/layout.tsx');
  const layout = read(layoutFile)?.toString('utf8');
  if (layout === undefined) fail(`fehlt: ${rel(layoutFile)}`);
  else {
    for (const needle of LAYOUT_NEEDS) {
      if (!layout.includes(needle)) fail(`${rel(layoutFile)} lädt die Schrift nicht wie vereinbart (${needle} fehlt)`);
    }
    const html = /<html[\s\S]*?>/.exec(layout)?.[0] ?? '';
    if (!html.includes('plexSans.variable')) fail(`${rel(layoutFile)}: <html> trägt die Schriftvariablen nicht`);
  }
  const globalsFile = path.join(root, dir, 'src/app/globals.css');
  const globals = read(globalsFile)?.toString('utf8');
  if (globals === undefined) continue;
  const erwartet = dir === 'lernpfade' ? [['--font-sans', 'var(--los-sans)']] : [['--font-sans', 'var(--los-sans)'], ['--font-mono', 'var(--los-mono)']];
  for (const [name, soll] of erwartet) {
    const gefunden = werte(globals, name);
    if (gefunden.length === 0) fail(`${rel(globalsFile)}: ${name} fehlt`);
    for (const wert of gefunden) {
      if (wert !== soll) fail(`${rel(globalsFile)}: ${name} ist ${wert}, erwartet ${soll}`);
    }
  }
  const eigene = [globalsFile];
  if (dir === 'lernpfade') eigene.push(path.join(root, dir, 'src/styles/learning-os.css'));
  for (const file of eigene) {
    const css = read(file)?.toString('utf8');
    if (css !== undefined && EIGENE_SCHRIFT.test(ohneKommentare(css)))
      fail(`${rel(file)} notiert einen eigenen Schriftstapel; er gehört in den Token-Vertrag`);
  }
}

if (failures.length > 0) {
  console.error(`Lernpfade-Tokens: ${failures.length} Abweichung(en) vom Vertrag`);
  for (const message of failures) console.error(`  ✗ ${message}`);
  console.error(
    '\nKanonisch ist docs/learning-tokens/ — dort ändern und in den Hub und alle drei Apps kopieren.',
  );
  process.exit(1);
}

console.log(
  `Lernpfade-Tokens: Token-Vertrag bytegleich in ${APPS.length} Apps und eingebunden, ` +
    'keine zweite Quelle, Grundskala und Modulfarben verweisen darauf, ' +
    'Verträge beziehen ihre neutralen Töne daraus, Schrift bytegleich geladen und verwiesen.',
);
