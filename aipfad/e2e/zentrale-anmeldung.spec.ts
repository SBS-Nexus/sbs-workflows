import { expect, test } from '@playwright/test';

/**
 * Anmeldung über das gemeinsame Konto (E4.2), Teil ohne Identitätsdienst:
 * Ohne AUTH_*-Werte bleibt alles beim Alten. Die Strecke gegen einen echten
 * ZITADEL folgt als eigener Lauf (docs/E4-2-BAUPLAN.md, Abschnitt 5).
 */

test('ohne Zugangsdaten gibt es den Weg über das gemeinsame Konto nicht', async ({ request }) => {
  for (const pfad of ['/auth/anmelden', '/auth/rueckkehr?code=x&state=y']) {
    const antwort = await request.get(pfad, { maxRedirects: 0 });
    expect(antwort.status(), pfad).toBe(404);
  }
  const rueckkanal = await request.post('/auth/abmelden-rueckkanal', {
    form: { logout_token: 'x' },
    maxRedirects: 0,
  });
  expect(rueckkanal.status()).toBe(404);
});

test('die eigene Anmeldung bleibt, und geschützte Seiten merken sich das Ziel', async ({
  page,
}) => {
  await page.goto('/fortschritt');
  await expect(page).toHaveURL(/\/anmelden\?ziel=%2Ffortschritt$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anmelden');
});

test('ein unbekannter Grund zeigt den allgemeinen Hinweis', async ({ page }) => {
  await page.goto('/auth/fehler?grund=%3Cscript%3E');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Die Anmeldung hat gerade nicht geklappt',
  );
  await expect(page.getByRole('link', { name: 'Erneut versuchen' })).toHaveAttribute(
    'href',
    '/auth/anmelden',
  );
});
