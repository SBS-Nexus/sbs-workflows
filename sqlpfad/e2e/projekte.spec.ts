import { expect, test, type Page } from '@playwright/test';

/**
 * Ein Projekt bearbeiten.
 *
 * Was hier geprüft wird, sieht kein Unit-Test: dass ein gesicherter
 * Zwischenstand das Neuladen der Seite übersteht. Ein Speichern-Knopf, der eine
 * Erfolgsmeldung zeigt und nichts schreibt, sieht bis genau zu diesem Moment
 * völlig in Ordnung aus – und der Moment kommt beim Lernenden, nicht bei uns.
 */

function neueAdresse(): string {
  return `e2e-projekt-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
}

const PASSWORT = 'nordwind-treppe-hafen-41';

async function meldeAn(page: Page): Promise<void> {
  await page.goto('/registrieren');
  await page.fill('#name', 'Testerin Projekt');
  await page.fill('#email', neueAdresse());
  await page.fill('#password', PASSWORT);
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.check('input[name=experience][value=READS_QUERIES]');
  await page.check('input[name=learningGoal][value=REPORTING]');
  await page.getByText('30 Minuten').click();
  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
}

const PROJEKT = '/projekte/projekt-kundenliste';

test('die Projektliste führt zu einem Projekt', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/projekte');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Projekte');
  await page.getByRole('link', { name: /Kundenliste/i }).click();

  await expect(page).toHaveURL(/\/projekte\/projekt-kundenliste$/);
  await expect(page.getByRole('heading', { name: /Der Auftrag/i })).toBeVisible();
});

test('ein gesicherter Zwischenstand übersteht das Neuladen', async ({ page }) => {
  await meldeAn(page);
  await page.goto(PROJEKT);

  await page.locator('.cm-content').fill('SELECT Name, Stadt FROM Kunden ORDER BY Name;');
  await page.fill('#notizen', 'Fehlender Ort wird mit einem eigenen Text kenntlich gemacht.');
  await page.getByRole('button', { name: /Zwischenstand sichern/i }).click();
  await expect(page.getByText('Gesichert')).toBeVisible();

  await page.reload();

  await expect(page.locator('.cm-content')).toContainText('ORDER BY Name');
  await expect(page.locator('#notizen')).toHaveValue(/kenntlich gemacht/);
});

test('als fertig markieren lässt sich zurücknehmen', async ({ page }) => {
  /*
   * Eine Abgabe ist kein Punkt ohne Wiederkehr. Wer zwei Tage später merkt,
   * dass die Summe nicht stimmt, soll weiterarbeiten dürfen.
   */
  await meldeAn(page);
  await page.goto(PROJEKT);

  await page.locator('.cm-content').fill('SELECT Name FROM Kunden;');
  await page.getByRole('button', { name: /Als fertig markieren/i }).click();
  await expect(page.getByText('Als fertig markiert')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Fertig', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Wieder in Bearbeitung nehmen/i }).click();
  await expect(page.getByText('Wieder in Bearbeitung')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /Als fertig markieren/i })).toBeVisible();
});

test('ein serverweiter Befehl wird erklärt, aber die Arbeit nicht verworfen', async ({ page }) => {
  await meldeAn(page);
  await page.goto(PROJEKT);

  await page.locator('.cm-content').fill("EXEC xp_cmdshell 'dir';");
  await page.getByRole('button', { name: /Zwischenstand sichern/i }).click();

  await expect(page.getByText(/Hinweis zu deinem SQL/)).toBeVisible();
  await expect(page.getByText(/Gespeichert wurde trotzdem alles/)).toBeVisible();
});
