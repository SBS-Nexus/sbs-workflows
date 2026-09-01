import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automatisierter Accessibility-Smoke-Test (WCAG 2.2 A/AA, automatisiert
 * erkennbare Regeln). Ersetzt die manuelle Prüfung NICHT — deckt aber
 * "serious"/"critical" Verstöße im Kernpfad ab, bei jedem Lauf, nicht nur
 * stichprobenartig während der Entwicklung.
 *
 * `reducedMotion: 'reduce'` (aktiviert dieselbe `prefers-reduced-motion`-Regel
 * aus globals.css, die die App bereits für echte Nutzer:innen unterstützt):
 * ohne das kann axe mitten in der Token-Einflug-Animation scannen und dabei
 * eine teiltransparente Zwischenfarbe als echten Kontrastfehler melden — ein
 * Messartefakt der Animation, kein tatsächlicher Verstoß.
 */
test.use({ contextOptions: { reducedMotion: 'reduce' } });

async function expectNoSeriousViolations(page: import('@playwright/test').Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22a', 'wcag22aa'])
    .analyze();

  const seriousOrWorse = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );

  if (seriousOrWorse.length > 0) {
    const summary = seriousOrWorse
      .map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} Stelle(n))`)
      .join('\n');
    expect(seriousOrWorse, `Serious/critical Accessibility-Verstöße:\n${summary}`).toEqual([]);
  }
}

test('Startseite: keine serious/critical Verstöße', async ({ page }) => {
  await page.goto('/');
  await expectNoSeriousViolations(page);
});

test('Registrierung: keine serious/critical Verstöße', async ({ page }) => {
  await page.goto('/registrieren');
  await expectNoSeriousViolations(page);
});

test('Anmeldung: keine serious/critical Verstöße', async ({ page }) => {
  await page.goto('/anmelden');
  await expectNoSeriousViolations(page);
});

test('Pfad (angemeldet): keine serious/critical Verstöße', async ({ page }) => {
  const email = `e2e-a11y-${Date.now()}@aipfad-test.local`;
  await page.goto('/registrieren');
  await page.getByLabel('Name').fill('A11y Test');
  await page.getByLabel('E-Mail-Adresse').fill(email);
  await page.getByLabel('Passwort').fill('ein-sehr-sicheres-testpasswort-123');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page).toHaveURL(/\/pfad$/);

  await expectNoSeriousViolations(page);
});

test('Lektionsschritt: keine serious/critical Verstöße', async ({ page }) => {
  const email = `e2e-a11y-lesson-${Date.now()}@aipfad-test.local`;
  await page.goto('/registrieren');
  await page.getByLabel('Name').fill('A11y Test');
  await page.getByLabel('E-Mail-Adresse').fill(email);
  await page.getByLabel('Passwort').fill('ein-sehr-sicheres-testpasswort-123');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('link', { name: 'Weiterlernen' }).click();
  await expect(page).toHaveURL(/\/lektion\/.+\/1$/);

  await expectNoSeriousViolations(page);
});

test('Labs-Übersicht: keine serious/critical Verstöße', async ({ page }) => {
  const email = `e2e-a11y-labs-${Date.now()}@aipfad-test.local`;
  await page.goto('/registrieren');
  await page.getByLabel('Name').fill('A11y Test');
  await page.getByLabel('E-Mail-Adresse').fill(email);
  await page.getByLabel('Passwort').fill('ein-sehr-sicheres-testpasswort-123');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.goto('/labs');

  await expectNoSeriousViolations(page);
});
