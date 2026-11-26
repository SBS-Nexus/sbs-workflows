import type { Page } from '@playwright/test';
import { onboardingAbschliessen as einstieg } from '../e2e/helfer';

/**
 * App-eigener Teil der Strecke gegen den echten ZITADEL. Der Ablauf selbst
 * steht im Vertrag (docs/learning-auth/e2e-zentrale-anmeldung.spec.ts).
 */
export const STARTSEITE = '/pfad';
export const ANMELDE_COOKIE = 'aipfad_anmeldung';

export async function onboardingAbschliessen(page: Page): Promise<void> {
  await einstieg(page);
}

export async function abmelden(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Abmelden' }).first().click();
}
