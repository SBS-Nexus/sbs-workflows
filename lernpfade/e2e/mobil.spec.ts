import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  EXAMPLE_FILE,
  addCard,
  backToOverview,
  clearBrowserData,
  createDeck,
  expectNoSeriousA11yViolations,
  gotoVocab,
  horizontalOverflow,
  mockProgressSources,
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
  await clearBrowserData(page);
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

async function progressViews(page: Page, prefix: string): Promise<void> {
  await mockProgressSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
  await page.goto('/fortschritt');
  await expect(page.getByRole('article', { name: 'AIPfad' }).getByText('LIVE · AI')).toBeVisible();
  await expect(page.getByRole('article', { name: 'VokabelPfad' }).getByText('LOKAL · nur in diesem Browser')).toBeVisible();
  await checkView(page, `${prefix} /fortschritt`);
  await shot(page, `${prefix}-fortschritt`);

  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await mockProgressSources(page, { python: 'unauthenticated', sql: 'down', ai: 'ok' });
  await page.reload();
  await expect(page.getByRole('article', { name: 'SQLPfad' }).getByText('SQLPfad ist derzeit nicht erreichbar.')).toBeVisible();
  await checkView(page, `${prefix} /fortschritt Teilausfall`);
  // Navigation bleibt auch hier erreichbar.
  await expect(page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('link', { name: 'Fortschritt' })).toBeVisible();
}

test('375 px: /fortschritt ohne horizontales Scrollen und ohne schwere axe-Befunde (Quellen: MOCK)', async ({ page }) => {
  await progressViews(page, 'mobil');
});

test('200 % Zoom (640 CSS-Pixel): /fortschritt bedienbar ohne horizontales Scrollen (Quellen: MOCK)', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  await progressViews(page, 'zoom200');
});

/**
 * Work-Review W1 (LP-07): Die Startseite bietet bei 375, 640 und 700 CSS-Pixeln
 * einen sichtbaren, per Tastatur erreichbaren Einstieg zu `/fortschritt`. Die
 * Links brechen unter die Marke um, statt über den Rand zu laufen; nichts in
 * Kopfzeile oder Hero ragt über die Seite oder wird abgeschnitten.
 */
for (const width of [375, 640, 700]) {
  test(`${width} px: Startseite – sichtbarer Einstieg zu /fortschritt per Tastatur, Umbruch statt Überlauf`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await mockProgressSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Seitennavigation' });
    const link = nav.getByRole('link', { name: 'Fortschritt' });
    await expect(link).toBeVisible();
    await checkView(page, `${width} px Startseite`);

    // Jeder Link und die Marke liegen vollständig innerhalb der Seite.
    const viewport = await page.evaluate(() => document.documentElement.clientWidth);
    for (const item of [page.getByRole('link', { name: 'Lernpfade Startseite' }), ...(await nav.getByRole('link').all())]) {
      const box = await item.boundingBox();
      expect(box, 'sichtbar').not.toBeNull();
      expect(box!.x, 'links im Bild').toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `rechts im Bild (${await item.textContent()})`).toBeLessThanOrEqual(viewport);
    }

    // Umbruch: Die Navigation steht unter der Marke, nicht daneben über den Rand hinaus.
    const brand = (await page.getByRole('link', { name: 'Lernpfade Startseite' }).boundingBox())!;
    const navBox = (await nav.boundingBox())!;
    expect(navBox.y, 'Navigation unter der Marke').toBeGreaterThanOrEqual(brand.y + brand.height - 1);

    // Überschriften passen in ihre Spalte, statt abgeschnitten zu werden.
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll('h1, h2')]
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => element.textContent),
    );
    expect(clipped, 'keine abgeschnittenen Überschriften').toEqual([]);
    await page.screenshot({ path: `${SHOTS}/startseite-${width}.png` });

    // Tastatur: vom Seitenanfang per Tab zum Link, Fokus sichtbar, Enter öffnet /fortschritt.
    await page.keyboard.press('Tab');
    for (let step = 0; step < 15; step += 1) {
      if (await link.evaluate((element) => element === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(link).toBeFocused();
    const outline = await link.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style, 'sichtbarer Fokus').not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
    const focused = (await link.boundingBox())!;
    expect(focused.x + focused.width, 'fokussierter Link im Bild').toBeLessThanOrEqual(viewport);
    await page.screenshot({ path: `${SHOTS}/startseite-${width}-fokus.png` });

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/fortschritt$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Dein Fortschritt' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Fortschritt' })).toHaveAttribute('aria-current', 'page');
    await checkView(page, `${width} px /fortschritt nach Navigation`);
  });
}
