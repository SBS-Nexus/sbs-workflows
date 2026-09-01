import { test, expect } from '@playwright/test';

/**
 * Mobiler Rauchtest: Startseite und Navigation bleiben auf einem schmalen
 * Bildschirm bedienbar (siehe DESIGN.md — Navigationslinks bleiben sichtbar
 * statt hinter einem versteckten Menü zu verschwinden).
 */
test('Startseite ist auf Mobilgeräten bedienbar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Lernen' })).toBeVisible();

  await page.getByRole('link', { name: 'Lernen' }).click();
  await expect(page).toHaveURL(/\/lernen$/);
  await expect(page.getByRole('heading', { name: 'Direkt nach Thema' })).toBeVisible();
});
