#!/usr/bin/env node
/**
 * Prüft das Leistungsbudget aus perf-budget.json.
 *
 * Gemessen wird nicht, was ein Manifest behauptet, sondern was der Browser
 * beim Aufruf einer Seite tatsächlich über die Leitung holt. Das ist der
 * Unterschied zwischen einer Schätzung und einer Messung: Nur die Messung
 * bemerkt eine Abhängigkeit, die über einen Umweg mit hereinkommt, oder eine
 * Aufteilung in Teilpakete, die auf dem Papier gut aussieht und in der Praxis
 * dieselben Bytes bedeutet.
 *
 * Gezählt wird die übertragene Größe (also komprimiert), weil das die Zahl
 * ist, die für die Wartezeit zählt. Bilder und Schriften bleiben außen vor:
 * Bilder sind hier durchweg eingebettete SVG, und eigene Schriften gibt es
 * nicht.
 *
 * Aufruf:
 *   node scripts/pruefe-leistungsbudget.mjs            # gegen localhost:3000
 *   node scripts/pruefe-leistungsbudget.mjs --basis https://…
 *   node scripts/pruefe-leistungsbudget.mjs --schreibe # misst und aktualisiert
 *
 * Rückgabewert 1, wenn eine Grenze überschritten ist – damit taugt das Skript
 * für die Prüfkette.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET_DATEI = join(WURZEL, 'perf-budget.json');

const argumente = process.argv.slice(2);
const schreibmodus = argumente.includes('--schreibe');
const basisIndex = argumente.indexOf('--basis');
const BASIS = basisIndex >= 0 ? argumente[basisIndex + 1] : 'http://localhost:3000';

/** Kilobyte mit einer Nachkommastelle – mehr Genauigkeit wäre Scheingenauigkeit. */
function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

/**
 * Misst, was eine Seite an JavaScript und CSS wirklich über die Leitung holt.
 *
 * Gelesen wird die Resource-Timing-Schnittstelle des Browsers und dort
 * `encodedBodySize` – der Umfang *nach* der Komprimierung, also genau die
 * Zahl, die für die Wartezeit zählt. Der naheliegende Weg über die
 * `Content-Length`-Kopfzeile funktioniert hier nicht: Sobald gzip im Spiel
 * ist, liefert der Server die Antwort in Stücken und lässt die Längenangabe
 * weg. Wer dann auf den Antwortrumpf ausweicht, misst den ausgepackten
 * Umfang und damit rund das Dreifache.
 *
 * Alle Dateien kommen vom selben Ursprung; die Größenangaben sind deshalb
 * ohne Zusatzkopfzeilen sichtbar.
 */
async function messeRoute(browser, pfad) {
  const kontext = await browser.newContext();
  const seite = await kontext.newPage();

  await seite.goto(`${BASIS}${pfad}`, { waitUntil: 'networkidle', timeout: 60_000 });

  const summen = await seite.evaluate(() => {
    const ergebnis = { javascript: 0, css: 0, dateien: 0, unbekannt: 0 };
    const gesehen = new Set();

    for (const eintrag of performance.getEntriesByType('resource')) {
      if (gesehen.has(eintrag.name)) continue;
      gesehen.add(eintrag.name);

      const pfadTeil = new URL(eintrag.name, location.href).pathname;
      let art = null;
      if (pfadTeil.endsWith('.js') || pfadTeil.endsWith('.mjs')) art = 'javascript';
      else if (pfadTeil.endsWith('.css')) art = 'css';
      if (!art) continue;

      // Ohne verwertbare Größe: mitzählen, aber getrennt ausweisen. Eine
      // stillschweigend als 0 gezählte Datei würde das Budget aushebeln.
      if (!eintrag.encodedBodySize) {
        ergebnis.unbekannt += 1;
        continue;
      }
      ergebnis[art] += eintrag.encodedBodySize;
      ergebnis.dateien += 1;
    }
    return ergebnis;
  });

  await kontext.close();
  return {
    javascriptKb: kb(summen.javascript),
    cssKb: kb(summen.css),
    dateien: summen.dateien,
    unbekannt: summen.unbekannt,
  };
}

async function main() {
  const budget = JSON.parse(await readFile(BUDGET_DATEI, 'utf8'));

  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
  });

  const zeilen = [];
  let ueberschritten = 0;

  for (const eintrag of budget.routen) {
    const gemessen = await messeRoute(browser, eintrag.pfad);

    const jsOk = gemessen.javascriptKb <= eintrag.javascriptKb;
    const cssOk = gemessen.cssKb <= eintrag.cssKb;
    if (!jsOk || !cssOk) ueberschritten += 1;

    zeilen.push({ eintrag, gemessen, jsOk, cssOk });

    if (schreibmodus) {
      // Zehn Prozent Luft nach oben, aufgerundet auf glatte 5 kB.
      eintrag.javascriptKb = Math.ceil((gemessen.javascriptKb * 1.1) / 5) * 5;
      eintrag.cssKb = Math.ceil((gemessen.cssKb * 1.1) / 5) * 5;
    }
  }

  await browser.close();

  // --- Bericht -------------------------------------------------------------
  const breite = Math.max(...budget.routen.map((r) => r.pfad.length), 6);
  console.info('');
  console.info(
    `${'Route'.padEnd(breite)}  ${'JavaScript'.padStart(20)}  ${'CSS'.padStart(18)}  Dateien`,
  );
  console.info('-'.repeat(breite + 50));

  for (const { eintrag, gemessen, jsOk, cssOk } of zeilen) {
    const js = `${gemessen.javascriptKb} / ${eintrag.javascriptKb} kB ${jsOk ? '  ' : '!!'}`;
    const css = `${gemessen.cssKb} / ${eintrag.cssKb} kB ${cssOk ? '  ' : '!!'}`;
    console.info(
      `${eintrag.pfad.padEnd(breite)}  ${js.padStart(20)}  ${css.padStart(18)}  ${gemessen.dateien}`,
    );
  }
  console.info('');

  if (schreibmodus) {
    await writeFile(BUDGET_DATEI, `${JSON.stringify(budget, null, 2)}\n`, 'utf8');
    console.info('Budget an den gemessenen Stand angepasst (10 % Luft).');
    return;
  }

  const ungemessen = zeilen.reduce((summe, z) => summe + z.gemessen.unbekannt, 0);
  if (ungemessen > 0) {
    console.warn(
      `Achtung: ${ungemessen} Datei(en) ohne verwertbare Größenangabe – ` +
        'die Summen sind dann zu niedrig.',
    );
  }

  if (ueberschritten > 0) {
    console.error(
      `${ueberschritten} Route(n) über dem Budget.\n` +
        'Entweder das Bündel verkleinern oder die Grenze in perf-budget.json\n' +
        'mit einer Begründung im Commit anheben – aber nicht stillschweigend.',
    );
    process.exit(1);
  }

  console.info('Alle Routen liegen im Budget.');
}

await main();
