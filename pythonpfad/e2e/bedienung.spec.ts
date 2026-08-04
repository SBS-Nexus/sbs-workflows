import { expect, test } from '@playwright/test';
import { completeOnboarding, freshAccount, register } from './helpers';

/**
 * Bedienung über Tastatur und Befehlspalette.
 *
 * Diese Tests prüfen bewusst das Verhalten und nicht das Aussehen: Lässt sich
 * die Anwendung ohne Maus benutzen, kommt der Fokus dorthin, wo er hingehört,
 * und findet die Suche, was sie finden soll.
 */
test.describe('Befehlspalette und Tastaturbedienung', () => {
  test.beforeEach(async ({ page }) => {
    await register(page, freshAccount());
    await completeOnboarding(page);
  });

  test('öffnet sich mit dem Kürzel und springt in eine Lektion', async ({ page }) => {
    await page.keyboard.press('Control+k');

    const palette = page.getByRole('dialog');
    await expect(palette).toBeVisible();

    const eingabe = palette.getByRole('combobox', { name: 'Suchen und springen' });
    // Der Fokus muss beim Öffnen im Suchfeld liegen, ohne dass jemand klickt.
    await expect(eingabe).toBeFocused();

    await eingabe.fill('programm');
    const treffer = palette.getByRole('option', { name: /Was ist ein Programm/ });
    await expect(treffer).toBeVisible();

    await page.keyboard.press('Enter');
    await page.waitForURL('**/lernen/was-ist-ein-programm');
    await expect(page.getByRole('heading', { name: 'Was ist ein Programm?' })).toBeVisible();
  });

  test('findet auch mit anderer Umlautschreibweise', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog');
    // „ueben" statt „Üben" – die Faltung muss beide Seiten gleich behandeln.
    await palette.getByRole('combobox', { name: 'Suchen und springen' }).fill('uben');
    await expect(palette.getByRole('option', { name: /^Üben/ })).toBeVisible();
  });

  test('läuft mit den Pfeiltasten durch die Treffer', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog');
    const eingabe = palette.getByRole('combobox', { name: 'Suchen und springen' });
    await eingabe.fill('e');

    const optionen = palette.getByRole('option');
    await expect(optionen.first()).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowDown');
    await expect(optionen.first()).toHaveAttribute('aria-selected', 'false');
    await expect(optionen.nth(1)).toHaveAttribute('aria-selected', 'true');

    // Die Auswahl muss auch für Hilfstechnik nachvollziehbar sein.
    const zweiteId = await optionen.nth(1).getAttribute('id');
    await expect(eingabe).toHaveAttribute('aria-activedescendant', zweiteId ?? '');
  });

  test('schließt mit Escape und gibt den Fokus zurück', async ({ page }) => {
    const oeffner = page.getByRole('button', { name: /Suchen/ });
    await oeffner.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    // Ohne Fokusrückgabe begänne die Tastaturbedienung wieder am Seitenanfang.
    await expect(oeffner).toBeFocused();
  });

  test('meldet, wenn nichts passt – ohne Schuldzuweisung', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog');
    await palette.getByRole('combobox', { name: 'Suchen und springen' }).fill('xyzxyzxyz');
    await expect(palette.getByText(/Dazu findet sich nichts/)).toBeVisible();
  });

  test('springt mit der Tastenfolge g dann f zum Fortschritt', async ({ page }) => {
    await page.keyboard.press('g');
    await page.keyboard.press('f');
    await page.waitForURL('**/fortschritt');
  });

  test('zeigt die Kürzelübersicht mit dem Fragezeichen', async ({ page }) => {
    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Tastaturkürzel' })).toBeVisible();
    await expect(dialog.getByText('Befehlspalette öffnen (auf dem Mac: Cmd + K)')).toBeVisible();
  });

  test('hält den Tabulator im Dialog fest', async ({ page }) => {
    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Zwanzig Tabulatorschritte müssen im Dialog enden, nicht in der Seite
    // dahinter. Zwanzig ist großzügig gewählt: Der Dialog hat weniger
    // bedienbare Elemente, der Umlauf greift also mehrfach.
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press('Tab');
    }
    const fokussiertImDialog = await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    );
    expect(fokussiertImDialog).toBe(true);
  });
});
