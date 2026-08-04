import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { completeOnboarding, freshAccount, register } from './helpers';

/**
 * Der Ausführungs-Visualisierer im echten Browser mit echtem Pyodide.
 *
 * Die Domainschicht ist gesondert geprüft, die Python-Seite über
 * scripts/verify_tracer.py. Hier geht es um das Zusammenspiel: Kommt die
 * Aufzeichnung an, stimmt die Anzeige, und lässt sich alles ohne Maus bedienen?
 */
test.describe('Schritt für Schritt', () => {
  test.beforeEach(async ({ page }) => {
    await register(page, freshAccount());
    await completeOnboarding(page);
    await page.goto('/labor');
    // Auf die Laufzeit wird hier bewusst nicht gewartet: Sie wird erst beim
    // ersten Ausführen geladen. Stattdessen wartet jeder Test großzügig auf
    // die Zeitleiste – das schließt das Laden mit ein.
  });

  /** Ersetzt den Inhalt des CodeMirror-Editors. */
  async function setzeCode(page: Page, code: string): Promise<void> {
    const editor = page.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    // insertText statt Tastendrücken: Der Editor rückt nach einem Doppelpunkt
    // von selbst ein, was getippten Code verfälschen würde.
    await page.keyboard.insertText(code);
  }

  /** Startet die Aufzeichnung und wartet, bis die Zeitleiste steht. */
  async function zeichneAuf(page: Page) {
    await page.getByRole('button', { name: /Schritt für Schritt/ }).click();
    const leiste = page.getByRole('region', { name: 'Schritt für Schritt' });
    // Beim ersten Mal wird die rund 13 MB große Laufzeit geladen.
    await expect(leiste).toBeVisible({ timeout: 120_000 });
    return leiste;
  }

  test('zeichnet einen einfachen Ablauf auf und läuft ihn durch', async ({ page }) => {
    await setzeCode(page, 'name = "Yusuf"\ngruss = "Hallo, " + name\nprint(gruss)\n');

    const leiste = await zeichneAuf(page);

    // Vier Schritte: drei Zeilen plus die Rückkehr am Ende.
    await expect(leiste.getByText(/Schritt 1 von 4/)).toBeVisible();
    await expect(leiste.getByText('Als Nächstes läuft Zeile 1.')).toBeVisible();

    // Vor der ersten Zeile gibt es noch keine Variable.
    await expect(leiste.getByText(/noch keine Variable/)).toBeVisible();

    await leiste.getByRole('button', { name: /^Weiter/ }).click();
    await expect(leiste.getByText(/Schritt 2 von 4/)).toBeVisible();
    // Jetzt existiert name und ist als neu entstanden gekennzeichnet.
    await expect(leiste.getByText('name', { exact: true })).toBeVisible();
    await expect(leiste.getByText("'Yusuf'")).toBeVisible();
    await expect(leiste.getByText(/neu entstanden/)).toBeVisible();
    await expect(leiste.getByText('Text')).toBeVisible();

    await leiste.getByRole('button', { name: /^Weiter/ }).click();
    await expect(leiste.getByText("'Hallo, Yusuf'")).toBeVisible();

    // Die Ausgabe erscheint erst, nachdem print gelaufen ist – vorher nicht.
    await expect(leiste.getByText('Noch nichts ausgegeben.')).toBeVisible();
    await leiste.getByRole('button', { name: /^Weiter/ }).click();
    await expect(leiste.getByText(/Schritt 4 von 4/)).toBeVisible();
    await expect(leiste.getByText('Das Programm ist zu Ende.')).toBeVisible();
  });

  test('macht Wiederholungen einer Schleife sichtbar', async ({ page }) => {
    await setzeCode(
      page,
      'summe = 0\nfor zahl in [1, 2, 3]:\n    summe = summe + zahl\nprint(summe)\n',
    );

    const leiste = await zeichneAuf(page);

    // Der Zähler an der Zeile ist der schnellste Hinweis auf eine Wiederholung.
    await expect(leiste.getByText('3×')).toBeVisible();
    await expect(leiste.getByText(/Zeilen werden wiederholt/)).toBeVisible();

    // Zum letzten Schritt springen: dort steht das Ergebnis.
    await leiste.getByRole('button', { name: 'Zum letzten Schritt' }).click();
    await expect(leiste.getByText('6', { exact: true }).first()).toBeVisible();
  });

  test('kennzeichnet Zeilen, die nie ausgeführt wurden', async ({ page }) => {
    await setzeCode(
      page,
      'alter = 12\nif alter >= 18:\n    print("erwachsen")\nelse:\n    print("jung")\n',
    );

    const leiste = await zeichneAuf(page);

    await expect(
      leiste.getByText(/Blasse Zeilen wurden bei diesem Durchlauf nie ausgeführt/),
    ).toBeVisible();
  });

  test('lässt sich vollständig mit der Tastatur bedienen', async ({ page }) => {
    await setzeCode(page, 'a = 1\nb = 2\nc = a + b\nprint(c)\n');

    const leiste = await zeichneAuf(page);

    // Fokus in die Zeitleiste bringen, dann mit den Pfeiltasten laufen.
    await leiste.getByRole('button', { name: /^Weiter/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(leiste.getByText(/Schritt 2 von/)).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(leiste.getByText(/Schritt 3 von/)).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(leiste.getByText(/Schritt 2 von/)).toBeVisible();
    await page.keyboard.press('End');
    await expect(leiste.getByText(/Schritt 5 von 5/)).toBeVisible();
    await page.keyboard.press('Home');
    await expect(leiste.getByText(/Schritt 1 von 5/)).toBeVisible();
  });

  test('meldet einen Fehler mit Bezug auf die Schritte davor', async ({ page }) => {
    await setzeCode(page, 'a = 1\nb = 0\nprint(a / b)\n');

    const leiste = await zeichneAuf(page);

    await expect(leiste.getByText(/Das Programm endet mit einem Fehler/)).toBeVisible();
    await expect(leiste.getByText(/ZeroDivisionError in Zeile 3/)).toBeVisible();
    // Kein fertiges Rezept, sondern eine Untersuchungsanleitung.
    await expect(leiste.getByText(/Geh die letzten Schritte davor durch/)).toBeVisible();
  });

  test('lässt sich schließen und gibt den Editor wieder frei', async ({ page }) => {
    await setzeCode(page, 'x = 1\n');
    const leiste = await zeichneAuf(page);
    await leiste.getByRole('button', { name: 'Schließen' }).click();
    await expect(leiste).toBeHidden();
  });
});
