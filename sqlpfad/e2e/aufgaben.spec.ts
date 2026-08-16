import { expect, test, type Page } from '@playwright/test';

/**
 * Eine Aufgabe wirklich bearbeiten.
 *
 * Die Bewertung selbst ist in `tests/unit/bewertung.test.ts` vollständig
 * geprüft – hier geht es um das, was Unit-Tests nicht sehen: dass die richtige
 * Antwort **nicht** im Browser liegt, dass die Server Action im
 * Produktionsbuild antwortet und dass die Rückmeldung tatsächlich erscheint.
 */

function neueAdresse(): string {
  return `e2e-aufgabe-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
}

const PASSWORT = 'nordwind-treppe-hafen-41';

async function meldeAn(page: Page): Promise<void> {
  await page.goto('/registrieren');
  await page.fill('#name', 'Testerin Aufgabe');
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

/** Die erste Lektion – sie beginnt mit einer Auswahlaufgabe. */
const LEKTION = '/lernen/lektion-was-steht-in-einer-tabelle';

test('die richtige Antwort steht nicht im Quelltext der Seite', async ({ page }) => {
  /*
   * Der wichtigste Test dieser Datei. Läge `richtig` in der Nutzlast im
   * Browser, wäre jede Auswahlaufgabe in zwei Klicks zu lösen - und die
   * Rückmeldung eine Auskunft über nichts.
   */
  await meldeAn(page);
  await page.goto(LEKTION);

  const inhalt = await page.content();
  expect(inhalt).not.toContain('"richtig"');
  expect(inhalt).not.toContain('aufloesung');
  expect(inhalt).not.toContain('musterantwort');
});

test('eine Auswahlaufgabe lässt sich beantworten und antwortet zurück', async ({ page }) => {
  await meldeAn(page);
  await page.goto(LEKTION);

  const aufgabe = page
    .locator('li')
    .filter({ has: page.getByRole('radio') })
    .first();
  await expect(aufgabe).toBeVisible();

  await aufgabe.getByRole('radio').first().check();
  await aufgabe.getByRole('button', { name: /Antwort abgeben/i }).click();

  // Was genau, steht nicht fest - die erste Option kann richtig oder falsch
  // sein. Dass überhaupt geurteilt wird, ist der Punkt.
  await expect(aufgabe.getByText(/Stimmt|Noch nicht|Fast/)).toBeVisible();
});

test('ohne Auswahl kommt keine Bewertung, sondern eine Bitte', async ({ page }) => {
  /*
   * Ein leeres Formular als „falsch" zu zählen, wäre ein Fehlversuch, den es
   * nie gab - und der landete im Verlauf.
   */
  await meldeAn(page);
  await page.goto(LEKTION);

  const aufgabe = page
    .locator('li')
    .filter({ has: page.getByRole('radio') })
    .first();
  await aufgabe.getByRole('button', { name: /Antwort abgeben/i }).click();

  await expect(aufgabe.getByText('Wähle zuerst eine Antwort aus.')).toBeVisible();
});

test('die Lösung kommt erst nach den Hinweisen', async ({ page }) => {
  /*
   * Geprüft an einer Schreibaufgabe: Nur sie hat überhaupt eine Musterlösung.
   * Bei einer Auswahlaufgabe kommt die Auflösung mit der Bewertung, und ein
   * zweiter Knopf daneben hätte nichts zu zeigen.
   */
  await meldeAn(page);
  await page.goto(LEKTION);

  const aufgabe = page
    .locator('li')
    .filter({ has: page.locator('.cm-editor') })
    .first();
  await aufgabe.getByRole('button', { name: /Lösung ansehen/i }).click();

  await expect(aufgabe.getByText(/noch Hinweise übrig/)).toBeVisible();
});

test('eine Schreibaufgabe wird geprüft, aber nicht erfunden', async ({ page }) => {
  await meldeAn(page);
  await page.goto(LEKTION);

  const aufgabe = page
    .locator('li')
    .filter({ has: page.locator('.cm-editor') })
    .first();
  await expect(aufgabe).toBeVisible();

  await aufgabe.locator('.cm-content').fill('SELECT Name FROM Kunden;');
  await aufgabe.getByRole('button', { name: /Antwort abgeben/i }).click();

  // Ohne Übungsserver gibt es kein Urteil über das Ergebnis - und ausdrücklich
  // auch keine erfundene Ergebnistabelle.
  await expect(aufgabe.getByText('Geprüft, aber nicht ausgeführt')).toBeVisible();
  await expect(aufgabe.locator('table')).toHaveCount(0);
});
