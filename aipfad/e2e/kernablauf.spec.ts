import { test, expect } from '@playwright/test';

/**
 * Kernablauf: Registrierung → Onboarding → Pfad → Lektion → Aufgabe →
 * Kompetenz-Rückmeldung → Abschluss → Fortschritt. Deckt denselben Pfad ab,
 * der während der Entwicklung manuell im Browser verifiziert wurde.
 */
test('Registrierung bis Fortschrittsanzeige', async ({ page }) => {
  const email = `e2e-${Date.now()}@aipfad-test.local`;

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'Kostenlos starten' }).first().click();
  await expect(page).toHaveURL(/\/registrieren$/);

  await page.getByLabel('Name').fill('E2E Testperson');
  await page.getByLabel('E-Mail-Adresse').fill(email);
  await page.getByLabel('Passwort').fill('ein-sehr-sicheres-testpasswort-123');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page).toHaveURL(/\/pfad$/);
  await expect(page.getByRole('heading', { name: 'AIPfad Grundlagen' })).toBeVisible();

  await page.getByRole('link', { name: 'Weiterlernen' }).click();
  await expect(page).toHaveURL(/\/lektion\/.+\/1$/);

  // Schritt 1: Einführung
  await page.getByRole('link', { name: 'Weiter' }).click();
  // Schritt 2: Beispiel
  await page.getByRole('link', { name: 'Weiter' }).click();
  // Schritt 3: Aufgabe
  await expect(page).toHaveURL(/\/3$/);

  const firstOption = page.getByRole('radio').first();
  await firstOption.check();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();

  await expect(page.getByText(/Richtig|Teilweise richtig|Noch nicht/)).toBeVisible();

  await page.getByRole('link', { name: 'Weiter' }).click();
  await expect(page).toHaveURL(/\/4$/);
  await expect(page.getByText(/Lektion abgeschlossen|Noch nicht ganz/)).toBeVisible();

  await page.getByRole('link', { name: 'Fortschritt' }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
  await expect(page.getByText('Lektionen abgeschlossen')).toBeVisible();
});
