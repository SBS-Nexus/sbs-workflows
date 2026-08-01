import { expect, test } from '@playwright/test';
import { completeOnboarding, freshAccount, login, register, waitForPythonReady } from './helpers';

/**
 * Der geforderte Ende-zu-Ende-Ablauf in einem zusammenhängenden Test:
 *
 *  1. Registrierung
 *  2. Onboarding
 *  3. Einstufung und Lernpfad
 *  4. Erste Lektion öffnen
 *  5. Python-Code im Browser ausführen
 *  6. Lösung einreichen
 *  7. Automatische Bewertung
 *  8. Fortschritt wird gespeichert
 *  9. Wiederholung wird eingeplant
 * 10. Dashboard und Fortsetzen auf einem anderen Gerät
 *
 * Bewusst ein durchgehender Test statt zehn getrennter: Der eigentliche Wert
 * liegt darin, dass der Zustand von Schritt zu Schritt trägt.
 */
test('vollständiger Lernablauf von der Registrierung bis zum Dashboard', async ({
  page,
  context,
}) => {
  const account = freshAccount();

  await test.step('1. Nutzerin registriert sich', async () => {
    await register(page, account);
    await expect(page.getByRole('heading', { name: /Willkommen/ })).toBeVisible();
  });

  await test.step('2./3. Onboarding und Einstufung', async () => {
    await completeOnboarding(page);
    // Der Pfad bekommt beim Anlegen einen eigenen Titel.
    await expect(page.getByRole('heading', { name: /Mein Weg zu Python/ })).toBeVisible();
    // Der Pfad enthält alle Lektionen des Kernpfads.
    await expect(page.getByRole('link', { name: /Was ist ein Programm/ })).toBeVisible();
  });

  await test.step('4. Erste Lektion öffnen', async () => {
    await page.getByRole('link', { name: /Was ist ein Programm/ }).click();
    await page.waitForURL('**/lernen/was-ist-ein-programm');

    await expect(page.getByRole('heading', { name: 'Was ist ein Programm?' })).toBeVisible();
    await expect(page.getByText('Das Problem')).toBeVisible();
    await expect(page.getByText('Beispiel, Zeile für Zeile')).toBeVisible();
  });

  await test.step('6./7. Lösung einreichen und automatisch bewerten lassen', async () => {
    const aufgabe = page.getByRole('heading', { name: 'Was macht ein Programm aus?' });
    await aufgabe.scrollIntoViewIfNeeded();

    const karte = page.locator('section', { has: aufgabe });
    // Die richtige Antwort gezielt wählen – die Reihenfolge der Optionen wird
    // bewusst gemischt, der Text bleibt stabil.
    await karte
      .getByRole('radio', { name: /Sammlung von Anweisungen, die der Reihe nach/ })
      .check();
    await karte.getByRole('button', { name: 'Lösung einreichen' }).click();

    // Die Bewertung kommt vom Server samt konkreter Rückmeldung.
    await expect(karte.getByRole('heading', { name: 'Bestanden' })).toBeVisible();
    await expect(karte.getByText(/Entscheidend ist die feste Reihenfolge/)).toBeVisible();
  });

  await test.step('8./9. Fortschritt und Wiederholungsplan werden gespeichert', async () => {
    const karte = page.locator('section', {
      has: page.getByRole('heading', { name: 'Was macht ein Programm aus?' }),
    });

    // Der Kompetenzverlauf wird nachvollziehbar ausgewiesen …
    await expect(karte.getByText(/Wie sich das auf deinen Lernstand auswirkt/)).toBeVisible();
    // … und die nächste Wiederholung ist eingeplant.
    await expect(karte.getByText(/Nächste Wiederholung in/)).toBeVisible();
  });

  await test.step('5. Python-Code im Browser ausführen', async () => {
    await page.goto('/labor');
    await expect(page.getByRole('heading', { name: 'Code-Labor' })).toBeVisible();

    await page.getByRole('button', { name: /Ausführen/ }).click();
    await waitForPythonReady(page);

    const ausgabe = page.getByRole('log', { name: 'Programmausgabe' });
    await expect(ausgabe).toContainText('Summe: 108', { timeout: 60_000 });
    await expect(ausgabe).toContainText('Durchschnitt: 18.00');
  });

  await test.step('Fehlermeldungen werden auf Deutsch erklärt', async () => {
    await page.getByRole('button', { name: /Fehler absichtlich erzeugen/ }).click();
    await page.getByRole('button', { name: /^Ausführen|Läuft/ }).click();

    // Der Text wird verdoppelt, danach bricht das Programm ab.
    await expect(page.getByRole('log', { name: 'Programmausgabe' })).toContainText('3030', {
      timeout: 60_000,
    });
    await expect(page.getByText('TypeError', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Eine Operation passt nicht zum Datentyp/)).toBeVisible();
    await expect(page.getByText(/Frage an dich selbst/)).toBeVisible();
  });

  await test.step('9. Wiederholungscenter zeigt die geplante Aufgabe', async () => {
    await page.goto('/wiederholen');
    await expect(page.getByRole('heading', { name: 'Wiederholungscenter' })).toBeVisible();
    await expect(page.getByText(/Wiederholungssets/)).toBeVisible();
  });

  await test.step('10. Dashboard zeigt den Lernstand', async () => {
    await page.goto('/fortschritt');

    await expect(page.getByRole('heading', { name: 'Dein Lernstand' })).toBeVisible();
    await expect(page.getByText('Aufgaben eigenständig gelöst')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Konzepte' })).toBeVisible();
    await expect(page.getByText(/Orientierungswerte/)).toBeVisible();
  });

  await test.step('10. Fortsetzen auf einem anderen Gerät', async () => {
    // Ein zweiter Browserkontext hat keine Cookies – wie ein anderes Gerät.
    const zweitesGeraet = await context.browser()!.newContext({ locale: 'de-DE' });
    const zweiteSeite = await zweitesGeraet.newPage();

    await zweiteSeite.goto('/lernen');
    await expect(zweiteSeite).toHaveURL(/\/anmelden/);

    await login(zweiteSeite, account);
    await zweiteSeite.waitForURL(/\/(fortschritt|lernen)/);

    await zweiteSeite.goto('/lernen/was-ist-ein-programm');
    // Der Fortschritt aus dem ersten Gerät ist vorhanden.
    await expect(zweiteSeite.getByText(/1 von 4 Aufgaben gelöst/)).toBeVisible();

    await zweitesGeraet.close();
  });
});

test('führt eine Code-Aufgabe aus und bewertet sie automatisch', async ({ page }) => {
  const account = freshAccount();
  await register(page, account);
  await completeOnboarding(page);

  await page.goto('/lernen/variablen-und-zuweisung');

  const aufgabe = page.getByRole('heading', { name: 'Rechnung mit Variablen' });
  await aufgabe.scrollIntoViewIfNeeded();
  const karte = page.locator('section', { has: aufgabe });

  // Der Editor lädt verzögert.
  const editor = karte.getByRole('textbox', { name: /Python-Editor/ });
  await expect(editor).toBeVisible({ timeout: 30_000 });

  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(
    'grundgebuehr = 40\nstundenpreis = 12\nstunden = 5\ngesamt = grundgebuehr + stundenpreis * stunden\nprint(gesamt)',
  );

  await karte.getByRole('button', { name: 'Lösung einreichen' }).click();
  await waitForPythonReady(page);

  await expect(karte.getByRole('heading', { name: 'Bestanden' })).toBeVisible({ timeout: 90_000 });
  await expect(karte.getByText(/Alle 2 Tests sind bestanden/)).toBeVisible();
  await expect(karte.getByText(/Wie sich das auf deinen Lernstand auswirkt/)).toBeVisible();
});

test('gibt Hinweise nur stufenweise frei', async ({ page }) => {
  const account = freshAccount();
  await register(page, account);
  await completeOnboarding(page);

  await page.goto('/lernen/variablen-und-zuweisung');

  const aufgabe = page.getByRole('heading', { name: 'Rechnung mit Variablen' });
  await aufgabe.scrollIntoViewIfNeeded();
  const karte = page.locator('section', { has: aufgabe });

  // Stufe 1 ist sofort verfügbar.
  await karte.getByRole('button', { name: /Hinweis 1: Denkimpuls/ }).click();
  await expect(karte.getByText(/Welcher Teil der Kosten hängt/)).toBeVisible();

  // Stufe 2 ist ohne eigenen Versuch gesperrt.
  const stufe2 = karte.getByRole('button', { name: /Hinweis 2: Konzept/ });
  await expect(stufe2).toBeDisabled();

  // Die Musterlösung ist nicht anwählbar.
  await expect(karte.getByRole('button', { name: /Musterlösung ansehen/ })).toHaveCount(0);
});

test('stoppt eine Endlosschleife über den Stopp-Knopf', async ({ page }) => {
  const account = freshAccount();
  await register(page, account);
  await completeOnboarding(page);

  await page.goto('/labor');

  const editor = page.getByRole('textbox', { name: /Python-Editor/ });
  await expect(editor).toBeVisible({ timeout: 30_000 });

  // Erst einen harmlosen Lauf, damit die Laufzeit geladen ist. Sonst ließe sich
  // nicht unterscheiden, ob der Stopp wirkt oder nur der Ladevorgang läuft.
  await page.getByRole('button', { name: /Ausführen/ }).click();
  await waitForPythonReady(page);

  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('print("los")\nwhile True:\n    pass\n');

  await page.getByRole('button', { name: /Ausführen/ }).click();

  const stopp = page.getByRole('button', { name: /Stopp/ });
  await expect(stopp).toBeEnabled({ timeout: 20_000 });
  await stopp.click();

  // Die bereits erzeugte Ausgabe bleibt erhalten, die Oberfläche bleibt bedienbar.
  await expect(page.getByRole('log', { name: 'Programmausgabe' })).toContainText('los');
  await expect(page.getByRole('button', { name: /Ausführen/ })).toBeEnabled({ timeout: 60_000 });
});

test('schützt angemeldete Bereiche und meldet ab', async ({ page }) => {
  await page.goto('/fortschritt');
  await expect(page).toHaveURL(/\/anmelden/);

  const account = freshAccount();
  await register(page, account);
  await completeOnboarding(page);

  await page.getByRole('button', { name: new RegExp(account.name.split(' ')[0]!) }).click();
  await page.getByRole('menuitem', { name: 'Abmelden' }).click();
  await page.waitForURL('/');

  await page.goto('/fortschritt');
  await expect(page).toHaveURL(/\/anmelden/);
});

test('erlaubt Datenexport und Kontolöschung', async ({ page }) => {
  const account = freshAccount();
  await register(page, account);
  await completeOnboarding(page);

  await page.goto('/profil');
  await expect(page.getByRole('heading', { name: 'Profil und Einstellungen' })).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Daten als JSON herunterladen/ }).click();
  const datei = await download;
  expect(datei.suggestedFilename()).toMatch(/^pythonpfad-daten-\d{4}-\d{2}-\d{2}\.json$/);

  await page.getByRole('button', { name: /Löschung vorbereiten/ }).click();
  await page.getByLabel('Bestätigung').fill('LÖSCHEN');
  await page.getByRole('button', { name: /Konto endgültig löschen/ }).click();

  await page.waitForURL(/geloescht=1/);
  await expect(
    page.getByText(/Konto und alle zugehörigen Lerndaten wurden vollständig entfernt/),
  ).toBeVisible();

  // Die Anmeldung mit den gelöschten Zugangsdaten schlägt fehl.
  await login(page, account);
  await expect(page.getByText(/E-Mail-Adresse oder Passwort stimmen nicht/)).toBeVisible();
});
