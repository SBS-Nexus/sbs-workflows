import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { onboardingAbschliessen, registriere } from './helfer';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('mobile App-Shell: Navigation sichtbar, Inhalt frei und axe sauber', async ({ page }) => {
  await registriere(page, 'Mobile Navigation');
  await onboardingAbschliessen(page);

  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await expect(navigation).toBeVisible();

  for (const label of ['Überblick', 'Lernen', 'Labs', 'Wiederholen', 'Fortschritt']) {
    await expect(navigation.getByRole('link', { name: label })).toBeVisible();
  }

  const main = page.locator('main#hauptinhalt');
  const paddingBottom = await main.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).paddingBottom),
  );
  expect(paddingBottom).toBeGreaterThanOrEqual(80);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22a', 'wcag22aa'])
    .analyze();

  const seriousOrWorse = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(seriousOrWorse).toEqual([]);
});
