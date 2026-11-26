import { expect, type Page } from '@playwright/test';

/**
 * App-eigener Teil der Strecke gegen den echten ZITADEL. Der Ablauf selbst
 * steht im Vertrag (docs/learning-auth/e2e-zentrale-anmeldung.spec.ts).
 */
export const STARTSEITE = '/fortschritt';
export const ANMELDE_COOKIE = 'sqlpfad_anmeldung';

export async function onboardingAbschliessen(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
}

/** Wie in e2e/anmeldung.spec.ts: über den Abschnitt „Sitzung“ im Profil. */
export async function abmelden(page: Page): Promise<void> {
  await page.goto('/profil');
  await page
    .getByRole('region', { name: 'Sitzung' })
    .getByRole('button', { name: 'Abmelden', exact: true })
    .click();
}
