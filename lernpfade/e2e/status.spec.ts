import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations, horizontalOverflow } from './helpers';

/**
 * E6.2 — Statusseite. In dieser Suite sind die Apps (Mock-Adressen) vom
 * Server aus nicht erreichbar, ein Konto ist nicht eingerichtet: Die Seite
 * zeigt die drei Pfade als gestört, den Betrieb als eingeschränkt (kein
 * kritischer Dienst betroffen) und verrät dabei keine Interna.
 */
test('Statusseite: Ausfall einzelner Pfade ist eingeschränkter Betrieb, ohne Interna', async ({ page }) => {
  await page.goto('/status');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Eingeschränkter Betrieb');
  const dienste = page.getByRole('list', { name: 'Dienste' });
  for (const name of ['PythonPfad', 'SQLPfad', 'AIPfad']) {
    await expect(dienste.getByRole('listitem').filter({ hasText: name })).toContainText('Gestört');
  }
  const text = (await page.locator('main').textContent()) ?? '';
  expect(text).not.toMatch(/127\.0\.0\.1|ECONNREFUSED|Error/);
  await expectNoSeriousA11yViolations(page, 'Statusseite');
  await page.setViewportSize({ width: 375, height: 800 });
  expect(await horizontalOverflow(page)).toBe(0);
});

test('Status für externe Überwachung: 200 bei eingeschränktem Betrieb, Zustand je Dienst', async ({ request }) => {
  const antwort = await request.get('/api/status');
  expect(antwort.status()).toBe(200);
  const bericht = await antwort.json();
  expect(bericht.gesamt).toBe('eingeschraenkt');
  expect(bericht.dienste.map((d: { id: string }) => d.id).sort()).toEqual(['ai', 'python', 'sql']);
  expect(JSON.stringify(bericht)).not.toMatch(/127\.0\.0\.1|ECONNREFUSED/);
});

test('der Fuß der Startseite führt zur Statusseite', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Fußnavigation' }).getByRole('link', { name: 'Status' }).click();
  await expect(page).toHaveURL('/status');
});
