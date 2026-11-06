import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations, horizontalOverflow } from './helpers';

/**
 * Startseiten-Hero auf einem Touch-Telefon (Projekt „mobil“: 375 px, DPR 2,
 * Touch). WebGL läuft im Playwright-Chromium auf dem Software-Renderer
 * SwiftShader — kein Hardware-GPU-Nachweis. Den vollständigen Rückweg in den
 * Ruhezustand prüft `liquid-hero.spec.ts` (auf SwiftShader dauert er rund 50 s).
 */

const SHOTS = 'test-results/screenshots';
const TALL = '/images/hero/skulptur-mobil.webp';

test('375 px Touch: Hochformatbild, Touch-Hinweis, Tippen bewegt die Skulptur, Aktionen bedienbar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  const hero = page.locator('.sh-root');
  await expect(hero).toHaveAttribute('data-gl', 'on');
  await expect(hero).toHaveAttribute('data-gl-src', TALL);
  await expect(page.locator('.sh-fallback')).toHaveJSProperty('naturalWidth', 1024);
  await expect(page.locator('.sh-hint')).toHaveText('Berühre die Form');
  await expect(page.locator('.sh-hint')).toBeVisible();
  expect(await horizontalOverflow(page), 'kein horizontales Scrollen').toBeLessThanOrEqual(0);
  await expectNoSeriousA11yViolations(page, '375 px Startseite mit Hero');
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/liquid-hero-mobil-375.png` });

  const figure = (await page.locator('.sh-figure').boundingBox())!;
  await page.touchscreen.tap(figure.x + figure.width * 0.45, figure.y + figure.height * 0.45);
  await expect(hero).toHaveAttribute('data-motion', 'active');
  await expect(page.locator('.sh-hint'), 'Hinweis verschwindet nach der ersten Berührung').toBeHidden();

  // Die Aktionen bleiben auch während der Bewegung bedienbar.
  await page.getByRole('link', { name: 'Lernpfad wählen' }).tap();
  await expect(page).toHaveURL(/#pfade$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Deine Kernpfade' })).toBeInViewport();
  expect(errors, 'keine Konsolen- oder Seitenfehler').toEqual([]);
});
