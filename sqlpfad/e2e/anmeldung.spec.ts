import { expect, test } from '@playwright/test';

/**
 * Der Weg vom ersten Besuch bis in den angemeldeten Bereich.
 *
 * Was hier geprüft wird, lässt sich mit Unit-Tests nicht prüfen: dass die
 * vorgelagerte Zugriffsprüfung, die Sitzungscookies, die Server Actions und
 * die Weiterleitungen im echten Produktionsbuild zusammenspielen. Jede dieser
 * Schichten ist für sich in Ordnung und trotzdem kann der Weg brechen.
 */

/** Jeder Lauf bekommt eine eigene Adresse, damit Läufe sich nicht behindern. */
function neueAdresse(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
}

const PASSWORT = 'nordwind-treppe-hafen-41';

test('geschützte Seiten sind ohne Anmeldung verschlossen', async ({ page }) => {
  await page.goto('/fortschritt');
  await expect(page).toHaveURL(/\/anmelden$/);
});

test('registrieren, Einstieg beantworten, abmelden', async ({ page }) => {
  const adresse = neueAdresse();

  await page.goto('/registrieren');
  await page.fill('#name', 'Testerin Muster');
  await page.fill('#email', adresse);
  await page.fill('#password', PASSWORT);
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();

  // Nach der Registrierung folgt der Einstieg - nicht der Überblick. Wer
  // gleich im Überblick landete, sähe eine Seite ohne jeden Bezug zu sich.
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.check('input[name=experience][value=READS_QUERIES]');
  await page.check('input[name=learningGoal][value=REPORTING]');
  await page.getByText('30 Minuten').click();
  await page.getByRole('button', { name: /Los geht/i }).click();

  await expect(page).toHaveURL(/\/fortschritt$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Testerin');

  // Die Antworten aus dem Einstieg sind wirklich gespeichert und werden nicht
  // nur weitergereicht.
  await page.goto('/profil');
  await expect(page.getByText('Liest fremde Abfragen')).toBeVisible();
  await expect(page.getByText('30 Minuten')).toBeVisible();

  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Nach dem Abmelden ist der Bereich wieder zu. Das ist der eigentliche
  // Punkt: Die Sitzung wird auf dem Server gelöscht, nicht nur im Browser.
  await page.goto('/fortschritt');
  await expect(page).toHaveURL(/\/anmelden$/);
});

test('falsches Passwort nennt keine Einzelheiten', async ({ page }) => {
  /*
   * Eine Meldung wie „Diese Adresse kennen wir nicht" wäre freundlicher und
   * würde verraten, welche Adressen ein Konto haben. Deshalb dieselbe Antwort
   * für beide Fälle.
   */
  await page.goto('/anmelden');
  await page.fill('#email', 'gibt-es-nicht@beispiel.test');
  await page.fill('#password', 'irgendwas-falsches-123');
  await page.getByRole('button', { name: /Anmelden/i }).click();

  await expect(page.getByText('E-Mail-Adresse oder Passwort stimmen nicht.')).toBeVisible();
});
