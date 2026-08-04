import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { completeOnboarding, freshAccount, register } from './helpers';

/**
 * Hilfen im Editor: Fehlermarkierung und deutsche Vorschläge.
 *
 * Beides sind Brücken zwischen Meldung und Code. Ohne sie müssen Lernende die
 * Zeilennummer aus einem englischen Traceback von Hand im Editor suchen und
 * sich die Bedeutung von `int()` anderswo zusammensuchen.
 */
test.describe('Editor-Hilfen', () => {
  test.beforeEach(async ({ page }) => {
    await register(page, freshAccount());
    await completeOnboarding(page);
    await page.goto('/labor');
  });

  async function setzeCode(page: Page, code: string): Promise<void> {
    const editor = page.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(code);
  }

  test('markiert die Fehlerzeile im Editor', async ({ page }) => {
    await setzeCode(page, 'a = 1\nb = 0\nprint(a / b)\n');
    await page.getByRole('button', { name: 'Ausführen' }).click();

    // Die ausführliche Erklärung erscheint unter der Ausgabe …
    await expect(page.getByText(/ZeroDivisionError/).first()).toBeVisible({ timeout: 120_000 });

    // … und die betroffene Zeile wird im Editor selbst gekennzeichnet.
    await expect(page.locator('.cm-lintRange-error').first()).toBeVisible();
    await expect(page.locator('.cm-gutter-lint .cm-lint-marker-error').first()).toBeVisible();
  });

  test('nimmt die Markierung zurück, sobald der Fehler weg ist', async ({ page }) => {
    await setzeCode(page, 'print(1 / 0)\n');
    await page.getByRole('button', { name: 'Ausführen' }).click();
    await expect(page.locator('.cm-lintRange-error').first()).toBeVisible({ timeout: 120_000 });

    await setzeCode(page, 'print(1 / 1)\n');
    await page.getByRole('button', { name: 'Ausführen' }).click();
    await expect(page.getByText(/^1$/).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.cm-lintRange-error')).toHaveCount(0);
  });

  test('schlägt Python-Bausteine mit deutscher Erklärung vor', async ({ page }) => {
    const editor = page.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type('pri');
    await page.keyboard.press('Control+ ');

    const liste = page.locator('.cm-tooltip-autocomplete');
    await expect(liste).toBeVisible();
    await expect(liste.locator('.cm-completionLabel')).toHaveText('print');
    await expect(liste.locator('.cm-completionDetail')).toHaveText('Funktion');

    // Der eigentliche Wert steckt in der Erklärung daneben: Sie sagt auf
    // Deutsch, wozu der Baustein gut ist, und zeigt ein Beispiel.
    const erklaerung = page.locator('.cm-completionInfo');
    await expect(erklaerung).toContainText('Schreibt etwas in die Ausgabe');
    await expect(erklaerung).toContainText('Beispiel: print("Hallo")');
  });

  test('öffnet die Vorschlagsliste nicht von selbst beim Tippen', async ({ page }) => {
    const editor = page.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type('print');

    // Eine aufspringende Liste würde beim Nachdenken über den nächsten Schritt
    // stören. Sie kommt nur auf Anforderung.
    await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
  });

  test('schlägt nichts vor, was im Kurs nicht vorkommt', async ({ page }) => {
    const editor = page.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type('lamb');
    await page.keyboard.press('Control+ ');

    await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
  });
});

/**
 * Das durchgerechnete Beispiel einer Lektion lässt sich wirklich ausführen.
 *
 * Die von Hand geschriebene Schrittliste bleibt bestehen – sie ist geprüft und
 * liest sich wie eine Erklärung. Neu ist, dass daneben derselbe Code
 * tatsächlich läuft und sich verändern lässt.
 */
test.describe('Beispiel in der Lektion', () => {
  test.beforeEach(async ({ page }) => {
    await register(page, freshAccount());
    await completeOnboarding(page);
    await page.goto('/lernen/was-ist-ein-programm');
  });

  test('führt das Beispiel wirklich aus', async ({ page }) => {
    const abschnitt = page.locator('section#abschnitt-beispiel');
    await abschnitt.getByRole('button', { name: /Beispiel wirklich ausführen/ }).click();

    const leiste = abschnitt.getByRole('region', { name: 'Schritt für Schritt' });
    await expect(leiste).toBeVisible({ timeout: 120_000 });
    // Zeile 1 des Beispiels ist ein Kommentar; ausgeführt wird sie nie. Genau
    // das steht auch in der Erklärung darüber.
    await expect(leiste.getByText(/Als Nächstes läuft Zeile \d+\./)).toBeVisible();

    // Am Ende steht dieselbe Ausgabe, die im Lektionstext angekündigt ist –
    // und die Variable, aus der sie entstanden ist.
    await leiste.getByRole('button', { name: 'Zum letzten Schritt' }).click();
    await expect(leiste.getByText('Guten Morgen, Yusuf', { exact: true })).toBeVisible();
    await expect(leiste.getByText("'Guten Morgen, Yusuf'")).toBeVisible();
  });

  test('übernimmt das Beispiel ins Code-Labor', async ({ page }) => {
    await page
      .locator('section#abschnitt-beispiel')
      .getByRole('button', { name: /Im Code-Labor öffnen/ })
      .click();

    await page.waitForURL('**/labor');
    await expect(page.locator('.cm-content').first()).toContainText('Guten Morgen, ');

    // Beim erneuten Besuch darf der übernommene Code nicht wieder auftauchen –
    // sonst überschriebe er, woran gerade gearbeitet wird.
    await page.goto('/lernen/was-ist-ein-programm');
    await page.goto('/labor');
    await expect(page.locator('.cm-content').first()).not.toContainText('Guten Morgen, ');
  });
});
