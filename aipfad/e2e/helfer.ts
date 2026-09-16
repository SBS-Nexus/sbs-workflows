import { expect, type Page } from '@playwright/test';

/**
 * Gemeinsame Schritte für die End-to-End-Prüfungen.
 *
 * Das Onboarding führt seit der Einbindung der Einstufung durch mehrere
 * Bildschirme. Ohne eine gemeinsame Stelle müsste jede Prüfung diesen Weg
 * eigenständig nachbauen — und bei der nächsten Änderung am Onboarding
 * würden wieder alle zugleich brechen.
 */

const TESTPASSWORT = 'ein-sehr-sicheres-testpasswort-123';

/** Legt ein frisches Konto an und bleibt im Onboarding stehen. */
export async function registriere(page: Page, name = 'E2E Testperson'): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto('/registrieren');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('E-Mail-Adresse').fill(email);
  await page.getByLabel('Passwort').fill(TESTPASSWORT);
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  return email;
}

/** Beantwortet die vier Einstellungen mit der jeweils ersten Möglichkeit. */
export async function einstellungenBeantworten(page: Page): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Weiter' }).click();
  }
}

/**
 * Führt das Onboarding zu Ende und landet im Lernpfad.
 *
 * Immer ohne Einstufung: Die Prüfungen, die den Pfad dahinter betreffen,
 * sollen nicht acht Fragen mitschleppen. Den Weg MIT Einstufung geht
 * `onboarding-placement.spec.ts` — dort ist er der Gegenstand der Prüfung
 * und keine Vorbereitung.
 */
export async function onboardingAbschliessen(page: Page): Promise<void> {
  await einstellungenBeantworten(page);
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.getByRole('button', { name: /Los geht/ }).click();
  await page.getByRole('link', { name: 'Zum Lernpfad' }).click();
  await expect(page).toHaveURL(/\/pfad$/);
}
