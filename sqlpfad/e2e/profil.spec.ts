import { expect, test, type Page } from '@playwright/test';

/**
 * Das Profil.
 *
 * Der Kern beider Tests ist derselbe: Eine Einstellung, die sofort wirkt und
 * nirgends ankommt, sieht bis zum nächsten Gerät völlig in Ordnung aus. Hier
 * wird deshalb nicht die Wirkung geprüft, sondern die Beständigkeit.
 */

function neueAdresse(): string {
  return `e2e-profil-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
}

const PASSWORT = 'nordwind-treppe-hafen-41';

async function meldeAn(page: Page): Promise<string> {
  const adresse = neueAdresse();
  await page.goto('/registrieren');
  await page.fill('#name', 'Testerin Profil');
  await page.fill('#email', adresse);
  await page.fill('#password', PASSWORT);
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.check('input[name=experience][value=READS_QUERIES]');
  await page.check('input[name=learningGoal][value=REPORTING]');
  await page.getByText('30 Minuten').click();
  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
  return adresse;
}

test('die Angaben aus dem Einstieg lassen sich ändern', async ({ page }) => {
  /*
   * Sie waren bisher einmalig. Wer sich beim Einstieg unterschätzt hatte,
   * blieb dabei – und die Angabe wurde mit der Zeit immer falscher.
   */
  await meldeAn(page);
  await page.goto('/profil');

  await expect(page.locator('#experience')).toHaveValue('READS_QUERIES');
  await page.selectOption('#experience', 'WRITES_SIMPLE_QUERIES');
  await page.fill('#dailyTimeBudget', '45');
  await page.getByRole('button', { name: /Angaben speichern/i }).click();

  await expect(page.getByText(/Gespeichert/)).toBeVisible();

  await page.reload();
  await expect(page.locator('#experience')).toHaveValue('WRITES_SIMPLE_QUERIES');
  await expect(page.locator('#dailyTimeBudget')).toHaveValue('45');
});

test('die Bewegungsreduktion folgt dem Konto, nicht dem Browser', async ({ page, browser }) => {
  /*
   * Der wichtigste Test dieser Datei. Eine Barrierefreiheitseinstellung, die
   * nur im localStorage steht, ist auf dem nächsten Gerät wieder aus – und
   * genau dort merkt es die Person, für die sie gedacht war.
   *
   * Deshalb ein **eigener Browserkontext** und nicht bloß gelöschte Cookies:
   * Im selben Kontext bliebe der localStorage stehen, und der Test wäre auch
   * dann grün, wenn am Konto nie etwas gespeichert würde. Er prüfte dann
   * genau das Gegenteil dessen, was er behauptet.
   */
  const adresse = await meldeAn(page);
  await page.goto('/profil');

  await page.getByRole('checkbox').check();
  await expect(page.getByText(/Am Konto gespeichert/)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');

  const anderesGeraet = await browser.newContext();
  const zweiteSeite = await anderesGeraet.newPage();

  await zweiteSeite.goto('/anmelden');

  /*
   * Gegenprobe **vor** der Anmeldung: Dieser Kontext weiß von nichts. Danach
   * wäre sie wertlos - der Abgleich im angemeldeten Bereich hat den
   * localStorage dann bereits geschrieben, und zwar genau deshalb, weil das
   * Konto die Einstellung trägt.
   */
  await expect(zweiteSeite.locator('html')).not.toHaveAttribute('data-reduce-motion', 'true');
  expect(
    await zweiteSeite.evaluate(() => window.localStorage.getItem('sqlpfad-reduce-motion')),
  ).toBeNull();

  await zweiteSeite.fill('#email', adresse);
  await zweiteSeite.fill('#password', PASSWORT);
  await zweiteSeite.getByRole('button', { name: /Anmelden/i }).click();
  await expect(zweiteSeite).toHaveURL(/\/fortschritt$/);

  // Jetzt gilt sie – und kommen kann sie nur vom Konto.
  await expect(zweiteSeite.locator('html')).toHaveAttribute('data-reduce-motion', 'true');

  await anderesGeraet.close();
});

test('das Farbschema wird ebenfalls am Konto gehalten', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/profil');

  await page.getByRole('radio', { name: 'Dunkel' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Dunkel' })).toBeChecked();
});
