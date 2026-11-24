import type { Page } from '@playwright/test';
import { completeOnboarding } from '../e2e/helpers';

/**
 * App-eigener Teil der Strecke gegen den echten ZITADEL. Der Ablauf selbst
 * steht im Vertrag (docs/learning-auth/e2e-zentrale-anmeldung.spec.ts).
 */
export const STARTSEITE = '/fortschritt';
export const ANMELDE_COOKIE = 'pythonpfad_anmeldung';

export async function onboardingAbschliessen(page: Page): Promise<void> {
  await completeOnboarding(page);
}

/** Abmelden steht im Kontomenü; dessen Knopf trägt den Vornamen (Testkonto: Ada). */
export async function abmelden(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Ada/ }).click();
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
}
