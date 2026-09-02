import { test, expect } from '@playwright/test';

/**
 * Regressionstests für die vier Codex-Funde auf PR #29. Jeder Test deckt
 * genau das Verhalten ab, das vorher fehlerhaft war — im echten Browser,
 * gegen den Produktionsbuild, nicht nur auf Service-Ebene.
 */

async function registerAndOnboard(page: import('@playwright/test').Page): Promise<void> {
  const email = `e2e-regression-${Date.now()}-${Math.random().toString(36).slice(2)}@aipfad-test.local`;
  await page.goto('/registrieren');
  await page.getByLabel('Name').fill('Regressionstest');
  await page.getByLabel('E-Mail-Adresse').fill(email);
  await page.getByLabel('Passwort').fill('ein-sehr-sicheres-testpasswort-123');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page).toHaveURL(/\/pfad$/);
}

/**
 * Ein Schritt weiter in der Lektion. Wartet explizit auf die neue URL, bevor
 * der nächste Klick erfolgt — sonst kann ein zweiter Klick auf denselben,
 * noch nicht ausgetauschten "Weiter"-Link treffen (Next.js-Client-Navigation
 * hat keinen harten Seitenwechsel, an dem Playwright automatisch synchronisiert).
 */
async function goToNextStep(
  page: import('@playwright/test').Page,
  expectedStep: number,
): Promise<void> {
  await page.getByRole('link', { name: 'Weiter' }).click();
  await expect(page).toHaveURL(new RegExp(`/${expectedStep}$`));
}

test('Hinweisleiter ist über die Oberfläche tatsächlich erreichbar', async ({ page }) => {
  await registerAndOnboard(page);
  await page.getByRole('link', { name: 'Weiterlernen' }).click();
  await expect(page).toHaveURL(/\/lektion\/was-ist-aipfad\/1$/);
  await goToNextStep(page, 2);
  await goToNextStep(page, 3);

  const revealButton = page.getByRole('button', { name: 'Hinweis anzeigen' });
  await expect(revealButton).toBeVisible();
  await revealButton.click();

  // Der erste Hinweis ist ohne vorherigen Versuch frei. Geprüft wird der
  // echte Hinweistext, NICHT das Stufenetikett "Denkimpuls": das steht auch
  // in der Blockademeldung ('Zuerst kommt der Hinweis "Denkimpuls".') und
  // würde dort ebenfalls zutreffen, während die Person gar keinen Hinweis
  // sieht (Testanalyse zu PR #29).
  await expect(
    page.getByText('Denk an den Unterschied zwischen einer Werkstatt und einem Hörsaal.'),
  ).toBeVisible();
});

test('Eine abgeschlossene Lektion bleibt beim erneuten Öffnen abgeschlossen', async ({ page }) => {
  await registerAndOnboard(page);
  await page.getByRole('link', { name: 'Weiterlernen' }).click();
  await expect(page).toHaveURL(/\/lektion\/was-ist-aipfad\/1$/);
  await goToNextStep(page, 2);
  await goToNextStep(page, 3);

  await page
    .getByText('Wenig Inhalt gleichzeitig, dafür echtes Verständnis durch Anwenden.')
    .click();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig')).toBeVisible();
  await goToNextStep(page, 4);
  await expect(page.getByText('Lektion abgeschlossen')).toBeVisible();

  await page.getByRole('link', { name: 'Zum Pfad' }).click();
  await expect(page).toHaveURL(/\/pfad$/);
  await expect(page.getByText(/^1 von \d+ Lektionen abgeschlossen$/)).toBeVisible();

  // Dieselbe Lektion erneut öffnen (z. B. zum Nachschlagen) …
  await page.getByRole('link', { name: 'Was ist AIPfad?' }).click();
  await expect(page).toHaveURL(/\/lektion\/was-ist-aipfad\/1$/);

  // … darf den Abschluss NICHT zurücksetzen.
  await page.goto('/pfad');
  await expect(page.getByText(/^1 von \d+ Lektionen abgeschlossen$/)).toBeVisible();
  await expect(page.getByText('Abgeschlossen').first()).toBeVisible();
});

test('Prompt-Reparatur-Lab wird nach richtiger Antwort als abgeschlossen markiert', async ({
  page,
}) => {
  await registerAndOnboard(page);
  await page.goto('/labs');
  await expect(page.getByRole('link', { name: 'Prompt-Reparatur-Lab' })).toBeVisible();

  await page.getByRole('link', { name: 'Prompt-Reparatur-Lab' }).click();
  await expect(page).toHaveURL(/\/labs\/prompt-repair-lab$/);

  await page
    .getByText(
      'Beschreibe zunächst nur die Zielgruppe für unsere neue Terminplanungs-App für kleine Praxen',
    )
    .click();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();
  await expect(page.getByText('Lab-Fortschritt gespeichert')).toBeVisible();

  await page.goto('/labs');
  const labCard = page.locator('a', { hasText: 'Prompt-Reparatur-Lab' });
  await expect(labCard.getByText('Abgeschlossen')).toBeVisible();
});

/**
 * Regressionstest für den Codex-Fund "Restore persisted hints when mounting
 * the ladder" (exakter Head fdfa141): Vor der Behebung begann die Leiter nach
 * einem Seitenneuladen wieder bei null, obwohl die Freigabe serverseitig
 * gespeichert war — der bereits gelesene Hinweis war nicht mehr erreichbar.
 */
test('Ein freigegebener Hinweis bleibt nach dem Neuladen sichtbar', async ({ page }) => {
  await registerAndOnboard(page);
  await page.getByRole('link', { name: 'Weiterlernen' }).click();
  await expect(page).toHaveURL(/\/lektion\/was-ist-aipfad\/1$/);
  await goToNextStep(page, 2);
  await goToNextStep(page, 3);

  await page.getByRole('button', { name: 'Hinweis anzeigen' }).click();
  const hinweisText = 'Denk an den Unterschied zwischen einer Werkstatt und einem Hörsaal.';
  await expect(page.getByText(hinweisText)).toBeVisible();

  await page.reload();

  // Der bereits gelesene Hinweis ist mit seinem echten Text weiterhin da …
  await expect(page.getByText(hinweisText)).toBeVisible();
  // … und die Leiter bietet die NÄCHSTE Stufe an, nicht erneut die erste.
  await expect(page.getByRole('button', { name: 'Weiteren Hinweis anzeigen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hinweis anzeigen', exact: true })).toHaveCount(0);
});

/**
 * Regressionstest für den Codex-Fund "Allow retrying failed lab-completion
 * persistence" (exakter Head fdfa141): Schlug die Server Action fehl, blieb
 * die Anzeige dauerhaft auf "Lab-Fortschritt wird gespeichert …" stehen, die
 * Sperre war schon gesetzt und es gab keinen Weg zurück — das Lab blieb trotz
 * richtiger Antwort unabgeschlossen.
 */
test('Ein fehlgeschlagener Lab-Abschluss lässt sich erneut speichern', async ({ page }) => {
  await registerAndOnboard(page);

  // Die erste Server Action ist das Einreichen der Antwort, die zweite der
  // Lab-Abschluss. Nur letztere wird einmalig zum Scheitern gebracht.
  let serverActionAufrufe = 0;
  await page.route('**/labs/prompt-repair-lab', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    serverActionAufrufe += 1;
    if (serverActionAufrufe === 2) return route.abort('failed');
    return route.continue();
  });

  await page.goto('/labs/prompt-repair-lab');
  await page
    .getByText(
      'Beschreibe zunächst nur die Zielgruppe für unsere neue Terminplanungs-App für kleine Praxen',
    )
    .click();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();

  // Statt stillem Steckenbleiben: sichtbarer Fehler und ein Weg zurück.
  await expect(page.getByText('Lab-Fortschritt nicht gespeichert')).toBeVisible();
  const erneut = page.getByRole('button', { name: 'Erneut speichern' });
  await expect(erneut).toBeVisible();

  await erneut.click();
  await expect(page.getByText('Lab-Fortschritt gespeichert')).toBeVisible();

  await page.goto('/labs');
  const labCard = page.locator('a', { hasText: 'Prompt-Reparatur-Lab' });
  await expect(labCard.getByText('Abgeschlossen')).toBeVisible();
});

/**
 * Regressionstest für den Codex-Fund "Implement or stop advertising no-op
 * terminal commands" (PR #29): Die beworbenen Befehle hatten keine Wirkung.
 * Geprüft wird hier die Verdrahtung in der Oberfläche — die Befehlslogik
 * selbst deckt tests/unit/terminal.test.ts ab.
 */
test('Terminal-Lab führt die beworbenen Befehle wirklich aus', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/labs/terminal-lab');

  const eingabe = page.getByLabel('Befehl eingeben');

  // Nach dem Ausführen leert die Komponente das Eingabefeld. Darauf wird
  // gewartet, bevor der nächste Befehl getippt wird — sonst kann ein `fill`
  // noch vor dem Zurücksetzen landen und wird davon überschrieben.
  async function befehl(text: string): Promise<void> {
    await eingabe.fill(text);
    await eingabe.press('Enter');
    await expect(eingabe).toHaveValue('');
  }

  // mkdir legt ein Verzeichnis an, in das man wechseln kann.
  await befehl('mkdir test');
  await befehl('cd test');
  await befehl('pwd');
  // Exakt: derselbe Pfad steht auch in der Eingabeaufforderung darunter.
  await expect(page.getByText('/home/lernperson/test', { exact: true })).toBeVisible();

  // touch legt eine Datei an, die ls anschliessend zeigt.
  await befehl('touch datei.txt');
  await befehl('ls');
  await expect(page.getByText('datei.txt', { exact: true })).toBeVisible();

  // which nennt einen plausiblen Pfad.
  await befehl('which ls');
  await expect(page.getByText('/usr/bin/ls')).toBeVisible();

  // Ein nicht angebotener Befehl wird klar abgelehnt, statt still zu verpuffen.
  await befehl('sudo rm -rf /');
  await expect(page.getByText('Befehl nicht verfügbar in diesem Lab: sudo')).toBeVisible();

  // clear leert den sichtbaren Verlauf, ohne den Simulator zurückzusetzen.
  await befehl('clear');
  await expect(page.getByText('/usr/bin/ls')).toHaveCount(0);
  await befehl('pwd');
  // Exakt: derselbe Pfad steht auch in der Eingabeaufforderung darunter.
  await expect(page.getByText('/home/lernperson/test', { exact: true })).toBeVisible();
});

/**
 * Regressionstest für den Codex-Fund "Execute commands in the lesson
 * terminal" (PR #29): Die Terminal-AUFGABE schrieb die Eingabe nur in eine
 * Liste. `cd` änderte die Eingabeaufforderung nicht, `ls` und `cat` gaben
 * nichts aus — obwohl der Aufgabe ein Dateibaum mitgegeben wird. Die
 * lernende Person konnte die Befehlsfolge nur raten oder abschreiben.
 */
test('Terminal-Aufgabe in der Lektion führt die Befehle wirklich aus', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/lektion/terminal-grundlagen/3');

  const eingabe = page.getByLabel('Befehl eingeben');
  async function befehl(text: string): Promise<void> {
    await eingabe.fill(text);
    await eingabe.press('Enter');
    await expect(eingabe).toHaveValue('');
  }

  await befehl('cd post');
  // Die Eingabeaufforderung folgt dem Wechsel wirklich.
  await expect(page.getByText('/home/lernperson/post $')).toBeVisible();

  await befehl('ls');
  await expect(page.getByText('brief.txt', { exact: true })).toBeVisible();

  await befehl('cat brief.txt');
  await expect(page.getByText('Liebe Grüße aus dem Terminal!')).toBeVisible();

  // Und die eingegebene Folge wird weiterhin bewertet.
  await page.getByRole('button', { name: 'Fertig — Befehle einreichen' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();
});
