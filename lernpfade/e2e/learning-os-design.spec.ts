import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { horizontalOverflow, expectNoSeriousA11yViolations } from './helpers';

const SHOTS = 'test-results/screenshots';

async function noClippedHeadlines(page: Page) {
  const clipped = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    return [...document.querySelectorAll('.los-root h1, .los-root h2')]
      .flatMap((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.left < -1 || r.right > viewport + 1 || el.scrollWidth > el.clientWidth + 2)
          ? [el.textContent] : [];
      });
  });
  expect(clipped, 'keine Überschriften außerhalb des Viewports oder ihrer Box').toEqual([]);
}

for (const width of [375, 640, 920, 1440]) {
  test('Learning OS Designstudie: ' + width + 'px – Hero, Pfade, Quiz ohne horizontalen Überlauf', async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    const response = await page.goto('/design-preview');
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveTitle(/Learning OS/);
    await expect(page.getByRole('heading', { level: 1, name: /Wissen.*Verstehen.*Können/s })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Learning OS Navigation' })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2, name: /Dein nächster.*Sprung/s })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /Aha statt.*Aha, okay/s })).toBeVisible();

    expect(await horizontalOverflow(page), 'kein horizontales Scrollen').toBeLessThanOrEqual(0);
    await noClippedHeadlines(page);
    await expectNoSeriousA11yViolations(page, 'Learning OS ' + width + 'px');

    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: SHOTS + '/learning-os-' + width + '.png', fullPage: true, animations: 'disabled' });
  });
}

test('Learning OS: Quiz beantwortbar, Feedback sichtbar, erneut lösbar, keine Fake-Persistenz', async ({ page }) => {
  await page.goto('/design-preview');
  const quiz = page.getByRole('group', { name: 'Antwortmöglichkeiten' });
  const good = quiz.getByRole('button', { name: /Zusammengehörige Datensätze/ });
  await good.click();
  await expect(good).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Genau. Du hast es verstanden.')).toBeVisible();
  await page.getByRole('button', { name: /Noch einmal versuchen/ }).click();
  await expect(good).toHaveAttribute('aria-pressed', 'false');
  await quiz.getByRole('button', { name: /Alle Zeilen/ }).click();
  await expect(page.getByText('Fast. Hier steckt der Unterschied.')).toBeVisible();
  await page.reload();
  await expect(good).toHaveAttribute('aria-pressed', 'false');
});

test('Learning OS: Verbindungen nur bei konfigurierten Fach-App-URLs, echte Vokabel-Ziele', async ({ page }) => {
  await page.goto('/design-preview');
  await expect(page.getByRole('link', { name: 'VokabelPfad ausprobieren' })).toHaveAttribute('href', '/vokabeln');
  const tracks = page.locator('.los-track');
  await expect(tracks).toHaveCount(4);
  const disabled = page.locator('.los-track-inactive');
  for (const item of await disabled.all()) {
    await expect(item).not.toHaveAttribute('href', /./);
  }
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
});

test('Learning OS: reduzierte Bewegung schaltet den Orbit ab', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/design-preview');
  const duration = await page.locator('.los-orbit-rotate').evaluate((el) => getComputedStyle(el).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThan(0.001);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('Learning OS: SSR enthält die inhaltliche Aussage auch ohne JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/design-preview');
    await expect(page.getByRole('heading', { name: /Wissen.*Verstehen.*Können/s })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entdecke deinen Pfad' })).toHaveAttribute('href', '#lernpfade');
  } finally {
    await context.close();
  }
});
