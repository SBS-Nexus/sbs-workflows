import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  EXAMPLE_FILE,
  addCard,
  backToOverview,
  createDeck,
  expectNoSeriousA11yViolations,
  gotoVocab,
  horizontalOverflow,
} from './helpers';

/**
 * Mobil (375 px) und 200 % Zoom (entspricht 640 CSS-Pixeln bei einem
 * 1280-px-Fenster): kein horizontales Scrollen, bedienbar, axe ohne
 * schwere Befunde. Nebenbei entstehen die Screenshots für die Doku.
 */

const SHOTS = 'test-results/screenshots';

async function checkView(page: Page, label: string): Promise<void> {
  expect(await horizontalOverflow(page), `kein horizontales Scrollen (${label})`).toBeLessThanOrEqual(0);
  await expectNoSeriousA11yViolations(page, label);
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function fullFlow(page: Page, prefix: string): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await gotoVocab(page);
  await checkView(page, `${prefix} leer`);

  await page.getByLabel('Datei auswählen').setInputFiles(EXAMPLE_FILE);
  await expect(page.getByRole('region', { name: 'Importvorschau' })).toBeVisible();
  await checkView(page, `${prefix} Importvorschau`);
  await page.getByRole('button', { name: 'Import übernehmen' }).click();

  await createDeck(page, 'Ein sehr langer Deckname mit Überlänge-Prüfung für schmale Bildschirme');
  await addCard(page, {
    term: 'incomprehensibilities',
    translation: 'Unverständlichkeiten · Donaudampfschifffahrtsgesellschaftskapitän',
    context: 'A sentence with a deliberately long word: pneumonoultramicroscopicsilicovolcanoconiosis.',
    tags: 'lang, test',
  });
  await checkView(page, `${prefix} Deckansicht`);
  await shot(page, `${prefix}-deck`);

  await backToOverview(page);
  await checkView(page, `${prefix} Übersicht`);
  await shot(page, `${prefix}-uebersicht`);

  await page.getByRole('button', { name: 'Session starten' }).click();
  await checkView(page, `${prefix} Session Prompt`);
  await page.getByRole('button', { name: 'Antwort zeigen' }).click();
  await checkView(page, `${prefix} Session Antwort`);
  await shot(page, `${prefix}-session`);
  await page.getByRole('button', { name: /^Leicht/ }).click();

  await page.getByRole('button', { name: 'Session beenden' }).click();
  await page.getByRole('button', { name: /^Löschen: Ein sehr langer Deckname/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await checkView(page, `${prefix} Löschdialog`);
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
}

test('375 px: alle Ansichten ohne horizontales Scrollen und ohne schwere axe-Befunde', async ({ page }) => {
  await fullFlow(page, 'mobil');
  await page.goto('/wiederholen');
  await checkView(page, 'mobil /wiederholen');
  // Rückweg zum Hub bleibt auch mobil sichtbar.
  await expect(page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('link', { name: 'Pfade' })).toBeVisible();
});

test('200 % Zoom (640 CSS-Pixel): bedienbar ohne horizontales Scrollen', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  await fullFlow(page, 'zoom200');
});
