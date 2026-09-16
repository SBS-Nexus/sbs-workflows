import { test, expect, type Page } from '@playwright/test';
import { einstellungenBeantworten, registriere } from './helfer';

/**
 * Das Onboarding führt jetzt durch die Einstufung. Geprüft wird der Weg,
 * den ein neues Konto tatsächlich nimmt — beide Varianten, plus die Fälle,
 * in denen ein Ablauf sonst still etwas verliert.
 */

async function neuesKonto(page: Page): Promise<string> {
  return registriere(page, 'Einstufungstest');
}

test('neues Konto: Onboarding, Einstufung, Ergebnis', async ({ page }) => {
  await neuesKonto(page);
  await einstellungenBeantworten(page);

  await expect(page.getByRole('heading', { name: /wo du stehst/i })).toBeVisible();
  await page.getByRole('button', { name: 'Einschätzung machen' }).click();

  // Acht Fragen, eine nach der anderen.
  for (let i = 0; i < 8; i += 1) {
    await expect(page.getByText(`Frage ${i + 1} von 8`)).toBeVisible();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Weiter' }).click();
  }

  await page.getByRole('button', { name: /Los geht/ }).click();

  await expect(page.getByRole('heading', { name: 'Deine Einschätzung' })).toBeVisible();
  await expect(page.getByText(/von 100 Punkten/)).toBeVisible();
  // Der Pfad bleibt vollständig — das muss auf der Ergebnisseite dastehen.
  await expect(page.getByText(/nichts übersprungen|alle Lektionen/)).toBeVisible();

  await page.getByRole('link', { name: 'Zum Lernpfad' }).click();
  await page.waitForURL(/\/pfad/);
});

test('neues Konto: Einstufung überspringen', async ({ page }) => {
  await neuesKonto(page);
  await einstellungenBeantworten(page);

  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.getByRole('button', { name: /Los geht/ }).click();

  await expect(page.getByRole('heading', { name: 'Alles eingerichtet' })).toBeVisible();
  await page.getByRole('link', { name: 'Zum Lernpfad' }).click();
  await page.waitForURL(/\/pfad/);
});

test('Zurückgehen behält bereits gegebene Antworten', async ({ page }) => {
  await neuesKonto(page);

  // Erste Einstellung wählen, weiter, dann zurück: Die Wahl steht noch.
  const ersteWahl = page.getByRole('radio').first();
  await ersteWahl.check();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByRole('radio').first()).toBeChecked();
});

test('abgeschlossenes Onboarding fängt nicht von vorne an', async ({ page }) => {
  await neuesKonto(page);
  await einstellungenBeantworten(page);
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.getByRole('button', { name: /Los geht/ }).click();
  await page.getByRole('link', { name: 'Zum Lernpfad' }).click();
  await page.waitForURL(/\/pfad/);

  // Wer danach wieder auf /onboarding geht, landet im Pfad — die Einstufung
  // wird nicht zurückgesetzt.
  await page.goto('/onboarding');
  await page.waitForURL(/\/pfad/);
});

test('Mobilbreite: kein waagerechtes Scrollen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await neuesKonto(page);

  const ueberlauf = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(ueberlauf).toBe(false);

  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Weiter' }).click();
  const ueberlaufSpaeter = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(ueberlaufSpaeter).toBe(false);
});

test('mit der Tastatur allein zu bedienen', async ({ page }) => {
  await neuesKonto(page);

  // Bis zur ersten Antwortmöglichkeit tabben und mit Leertaste wählen.
  await page.keyboard.press('Tab');
  for (let i = 0; i < 12; i += 1) {
    const istRadio = await page.evaluate(
      () => document.activeElement?.getAttribute('type') === 'radio',
    );
    if (istRadio) break;
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio').first()).toBeChecked();
});
