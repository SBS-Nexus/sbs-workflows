import { expect, test, type Page } from '@playwright/test';

/**
 * Die Werkbank.
 *
 * Zwei Dinge werden hier geprüft, die beide nur im echten Browser sichtbar
 * werden: dass der Editor überhaupt Eingaben annimmt (CodeMirror ist kein
 * `<textarea>` – `page.fill` greift dort nicht), und dass die Anwendung im
 * abgeschalteten Zustand die Wahrheit sagt, statt ein Ergebnis vorzutäuschen.
 */

const PASSWORT = 'nordwind-treppe-hafen-41';

async function meldeAn(page: Page): Promise<void> {
  const adresse = `e2e-abfrage-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;

  await page.goto('/registrieren');
  await page.fill('#name', 'Testerin Muster');
  await page.fill('#email', adresse);
  await page.fill('#password', PASSWORT);
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
}

/** CodeMirror nimmt keinen `fill` entgegen – der Text muss getippt werden. */
async function schreibeSql(page: Page, text: string): Promise<void> {
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await editor.pressSequentially(text);
}

test('der Schema-Explorer steht neben dem Editor, nicht in einem Aufklapper', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/abfrage');

  // Wer die Daten nicht kennt, rät beim Abfragen: Tabellen, Spalten und der
  // Hinweis auf NULL müssen ohne einen Klick sichtbar sein.
  await expect(page.getByRole('heading', { name: 'Kunden', exact: true })).toBeVisible();
  await expect(page.getByText('nvarchar(80)').first()).toBeVisible();
  await expect(page.getByText('NULL erlaubt').first()).toBeVisible();

  // Und die Beziehung, die man gleich im JOIN tippen muss.
  await expect(page.getByText(/zeigt über/).first()).toBeVisible();
});

test('der Editor nimmt Eingaben an', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/abfrage');

  await schreibeSql(page, 'SELECT Name FROM Kunden');
  await expect(page.locator('.cm-content')).toContainText('SELECT Name FROM Kunden');
});

test('ohne Runner wird kein Ergebnis erfunden', async ({ page }) => {
  /*
   * Der wichtigste Test dieser Datei. Ein Ersatzweg, der irgendein Ergebnis
   * zeigt, wäre bequem zu bauen und würde jemanden aus einem erfundenen
   * Ergebnis das Falsche lernen lassen.
   */
  await meldeAn(page);
  await page.goto('/abfrage');

  await schreibeSql(page, 'SELECT Name FROM Kunden');
  await page.getByRole('button', { name: 'Ausführen' }).click();

  await expect(page.getByText(/nicht eingeschaltet|nicht möglich/i).first()).toBeVisible();
  // Keine Ergebnistabelle - auch keine leere.
  await expect(page.locator('table')).toHaveCount(0);
});

test('ein UPDATE in einer Leselektion wird erklärt statt getadelt', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/abfrage');

  await schreibeSql(page, 'UPDATE Kunden SET Stadt = NULL');
  await page.getByRole('button', { name: 'Ausführen' }).click();

  const meldung = page.getByText(/Lesen von Daten/);
  await expect(meldung).toBeVisible();

  // Der Ton: erklären, nicht tadeln. Wer hier ein UPDATE schreibt, hat die
  // Aufgabe missverstanden und nichts Böses vor.
  await expect(page.getByText(/verboten|unerlaubt/i)).toHaveCount(0);
});
