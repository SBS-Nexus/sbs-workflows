import { expect, test } from '@playwright/test';

/**
 * Die Startseite nennt ihre kanonische Adresse.
 *
 * Ohne den Verweis sieht eine Suchmaschine jede Schreibweise der Adresse als
 * eigene Seite. Die Lücke fand `sqlpfad/scripts/pruefe-auslieferung.mts`
 * beim ersten Ausrollen auf Railway; dieser Test hält sie geschlossen.
 */
test('Startseite verweist kanonisch auf sich selbst', async ({ page }) => {
  await page.goto('/');

  const verweis = page.locator('link[rel="canonical"]');
  await expect(verweis).toHaveCount(1);

  const adresse = new URL((await verweis.getAttribute('href')) ?? '');
  expect(adresse.protocol).toMatch(/^https?:$/);
  expect(adresse.pathname).toBe('/');
  expect(adresse.search).toBe('');
});
