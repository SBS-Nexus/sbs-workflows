import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Erzeugt ein frisches Konto, damit sich Tests nicht gegenseitig beeinflussen. */
export function freshAccount(): { name: string; email: string; password: string } {
  return {
    name: 'Testperson',
    email: `e2e-${randomUUID()}@example.org`,
    password: 'einSicheresTestPasswort2026',
  };
}

export async function register(
  page: Page,
  account: ReturnType<typeof freshAccount>,
): Promise<void> {
  await page.goto('/registrieren');
  await page.getByLabel('Name').fill(account.name);
  await page.getByLabel('E-Mail-Adresse').fill(account.email);
  await page.getByLabel('Passwort').fill(account.password);
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await page.waitForURL('**/onboarding');
}

export async function login(page: Page, account: ReturnType<typeof freshAccount>): Promise<void> {
  await page.goto('/anmelden');
  await page.getByLabel('E-Mail-Adresse').fill(account.email);
  await page.getByLabel('Passwort').fill(account.password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

/** Onboarding und Einstufung in einem Rutsch durchlaufen. */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.getByRole('radio', { name: /noch nie programmiert/i }).check();
  await page.getByRole('radio', { name: /Büroaufgaben automatisieren/i }).check();
  await page.getByRole('radio', { name: '20 Minuten' }).check();
  await page.getByRole('radio', { name: /Gleichmäßig/ }).check();
  await page.getByRole('button', { name: /Weiter zur Einstufung/ }).click();
  await page.waitForURL('**/einstufung');

  // Acht Fragen: jeweils die erste Antwort wählen und weiterklicken.
  for (let i = 0; i < 8; i += 1) {
    await page.getByRole('radio').first().check();
    const weiter = page.getByRole('button', { name: 'Weiter' });
    if (await weiter.isVisible().catch(() => false)) {
      await weiter.click();
    } else {
      await page.getByRole('button', { name: /Einstufung abschließen/ }).click();
      break;
    }
  }

  await expect(page.getByRole('button', { name: /Zu meinem Lernpfad/ })).toBeVisible();
  await page.getByRole('button', { name: /Zu meinem Lernpfad/ }).click();
  await page.waitForURL('**/lernen');
}

/** Wartet, bis die Python-Laufzeit im Browser bereit ist. */
export async function waitForPythonReady(page: Page): Promise<void> {
  // Auf Lektionsseiten gibt es mehrere Arbeitsbereiche; einer genügt als Beleg.
  await expect(page.getByText(/Python .* läuft in deinem Browser/).first()).toBeVisible({
    timeout: 90_000,
  });
}
