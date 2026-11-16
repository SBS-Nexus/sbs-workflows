import { expect, test } from '@playwright/test';

/** Das Editorial-Lab ist eine unpersistierte Vorschau, kein zweiter Scheduler. */
test('Learning Studio: Antworten bleiben vor dem Aufdecken verborgen und ein Themenwechsel setzt zurück', async ({ page }) => {
  await page.goto('/');
  const studio = page.locator('.lp-studio');
  await expect(studio.getByRole('heading', { name: /Verstehen beginnt mit/ })).toBeVisible();
  await expect(studio.getByText('DEMO · NICHT GESPEICHERT')).toBeVisible();

  const sprache = studio.getByRole('button', { name: /Sprache/ });
  const git = studio.getByRole('button', { name: /Git & GitHub/ });
  const ai = studio.getByRole('button', { name: /AI/ });
  await expect(sprache).toHaveAttribute('aria-pressed', 'true');
  await expect(studio.getByText('Abruf · Wiederauffinden')).toHaveCount(0);
  await expect(studio.locator('[data-answer-revealed]')).toHaveCount(0);

  await studio.getByRole('button', { name: 'Antwort aufdecken' }).click();
  await expect(studio.getByText('Abruf · Wiederauffinden')).toBeVisible();
  await expect(studio.getByRole('button', { name: 'Antwort verbergen' })).toHaveAttribute('aria-expanded', 'true');

  await git.click();
  await expect(git).toHaveAttribute('aria-pressed', 'true');
  await expect(sprache).toHaveAttribute('aria-pressed', 'false');
  await expect(studio.getByRole('heading', { name: /git commit/ })).toBeVisible();
  await expect(studio.locator('[data-answer-revealed]')).toHaveCount(0);

  await studio.getByRole('button', { name: 'Antwort aufdecken' }).click();
  await expect(studio.getByText('Einen versionierten Schnappschuss speichern.')).toBeVisible();
  await ai.click();
  await expect(studio.getByRole('heading', { name: /embedding/ })).toBeVisible();
  await expect(studio.locator('[data-answer-revealed]')).toHaveCount(0);
  await expect(studio.getByRole('link', { name: /Eigene Karten anlegen/ })).toHaveAttribute('href', '/vokabeln');
});

test('Mobile-first Hero bei 375 px: Lerntext und CTA vor Grafik, ohne horizontales Scrollen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const content = page.locator('.sh-content');
  const figure = page.locator('.sh-figure-wrap');
  await expect(content).toBeVisible();
  await expect(figure).toBeVisible();
  const c = await content.boundingBox();
  const f = await figure.boundingBox();
  expect(c).not.toBeNull();
  expect(f).not.toBeNull();
  expect(c!.y + c!.height, 'CTA-/Textbereich steht oberhalb der Grafik').toBeLessThanOrEqual(f!.y + 2);
  await expect(page.getByRole('link', { name: 'Lernpfad wählen' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  const studio = page.locator('.lp-studio');
  await studio.scrollIntoViewIfNeeded();
  await expect(studio.getByRole('button', { name: /Sprache/ })).toBeVisible();
  await studio.getByRole('button', { name: /Git & GitHub/ }).click();
  await expect(studio.getByRole('heading', { name: /git commit/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
