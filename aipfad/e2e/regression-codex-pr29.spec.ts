import { test, expect } from '@playwright/test';

/**
 * Regressionstests für die vier Codex-Funde auf PR #29. Jeder Test deckt
 * genau das Verhalten ab, das vorher fehlerhaft war — im echten Browser,
 * gegen den Produktionsbuild, nicht nur auf Service-Ebene.
 */

async function registerAndOnboard(page: import('@playwright/test').Page): Promise<void> {
  const email = `e2e-regression-${Date.now()}-${Math.random().toString(36).slice(2)}@aipfad-test.local`;
  await page.goto('/registrieren');
  await page.getByLabel('Name').fill('Regressionstest');
  await page.getByLabel('E-Mail-Adresse').fill(email);
  await page.getByLabel('Passwort').fill('ein-sehr-sicheres-testpasswort-123');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page).toHaveURL(/\/pfad$/);
}

/**
 * Ein Schritt weiter in der Lektion. Wartet explizit auf die neue URL, bevor
 * der nächste Klick erfolgt — sonst kann ein zweiter Klick auf denselben,
 * noch nicht ausgetauschten "Weiter"-Link treffen (Next.js-Client-Navigation
 * hat keinen harten Seitenwechsel, an dem Playwright automatisch synchronisiert).
 */
async function goToNextStep(
  page: import('@playwright/test').Page,
  expectedStep: number,
): Promise<void> {
  await page.getByRole('link', { name: 'Weiter' }).click();
  await expect(page).toHaveURL(new RegExp(`/${expectedStep}$`));
}

test('Hinweisleiter ist über die Oberfläche tatsächlich erreichbar', async ({ page }) => {
  await registerAndOnboard(page);
  await page.getByRole('link', { name: 'Weiterlernen' }).click();
  await expect(page).toHaveURL(/\/lektion\/was-ist-aipfad\/1$/);
  await goToNextStep(page, 2);
  await goToNextStep(page, 3);

  const revealButton = page.getByRole('button', { name: 'Hinweis anzeigen' });
  await expect(revealButton).toBeVisible();
  await revealButton.click();

  // Der erste Hinweis ist ohne vorherigen Versuch frei — echter Text muss erscheinen.
  await expect(page.getByText('Denkimpuls')).toBeVisible();
});

test('Eine abgeschlossene Lektion bleibt beim erneuten Öffnen abgeschlossen', async ({ page }) => {
  await registerAndOnboard(page);
  await page.getByRole('link', { name: 'Weiterlernen' }).click();
  await expect(page).toHaveURL(/\/lektion\/was-ist-aipfad\/1$/);
  await goToNextStep(page, 2);
  await goToNextStep(page, 3);

  await page
    .getByText('Wenig Inhalt gleichzeitig, dafür echtes Verständnis durch Anwenden.')
    .click();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig')).toBeVisible();
  await goToNextStep(page, 4);
  await expect(page.getByText('Lektion abgeschlossen')).toBeVisible();

  await page.getByRole('link', { name: 'Zum Pfad' }).click();
  await expect(page).toHaveURL(/\/pfad$/);
  await expect(page.getByText('1 von 13 Lektionen abgeschlossen')).toBeVisible();

  // Dieselbe Lektion erneut öffnen (z. B. zum Nachschlagen) …
  await page.getByRole('link', { name: 'Was ist AIPfad?' }).click();
  await expect(page).toHaveURL(/\/lektion\/was-ist-aipfad\/1$/);

  // … darf den Abschluss NICHT zurücksetzen.
  await page.goto('/pfad');
  await expect(page.getByText('1 von 13 Lektionen abgeschlossen')).toBeVisible();
  await expect(page.getByText('Abgeschlossen').first()).toBeVisible();
});

test('Prompt-Reparatur-Lab wird nach richtiger Antwort als abgeschlossen markiert', async ({
  page,
}) => {
  await registerAndOnboard(page);
  await page.goto('/labs');
  await expect(page.getByRole('link', { name: 'Prompt-Reparatur-Lab' })).toBeVisible();

  await page.getByRole('link', { name: 'Prompt-Reparatur-Lab' }).click();
  await expect(page).toHaveURL(/\/labs\/prompt-repair-lab$/);

  await page
    .getByText(
      'Beschreibe zunächst nur die Zielgruppe für unsere neue Terminplanungs-App für kleine Praxen',
    )
    .click();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();
  await expect(page.getByText('Lab-Fortschritt gespeichert')).toBeVisible();

  await page.goto('/labs');
  const labCard = page.locator('a', { hasText: 'Prompt-Reparatur-Lab' });
  await expect(labCard.getByText('Abgeschlossen')).toBeVisible();
});
