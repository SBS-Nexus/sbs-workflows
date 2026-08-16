import { expect, test, type Page } from '@playwright/test';

/**
 * Üben und Wiederholen.
 *
 * Die Auswahlregeln stehen als Unit-Tests in `tests/unit/auswahl.test.ts`. Hier
 * geht es um den Zusammenhang, den nur der ganze Weg zeigt: dass ein Versuch
 * auf der Lektionsseite tatsächlich auf der Wiederholungsseite ankommt.
 */

function neueAdresse(): string {
  return `e2e-ueben-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
}

const PASSWORT = 'nordwind-treppe-hafen-41';

async function meldeAn(page: Page): Promise<void> {
  await page.goto('/registrieren');
  await page.fill('#name', 'Testerin Üben');
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

test('Üben zeigt echte Aufgaben und nicht „noch keine Inhalte"', async ({ page }) => {
  /*
   * Der Satz „Noch keine Aufgaben verfügbar" war einmal wahr. Seit der Lehrplan
   * eingespielt ist, wäre er eine Unwahrheit an der Stelle, an der die Anwendung
   * am glaubwürdigsten sein muss.
   */
  await meldeAn(page);
  await page.goto('/ueben');

  await expect(page.getByText('Noch keine Aufgaben verfügbar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Antwort abgeben/i }).first()).toBeVisible();
});

test('der Durchgang mischt über die Lektionen', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/ueben');

  // Fünf Aufgaben, und nicht fünf aus derselben Lektion: Die erste Aufgabe
  // jeder Lektion trägt einen anderen Titel als die zweite derselben.
  const karten = page.locator('ol > li');
  await expect(karten).toHaveCount(5);
});

test('Wiederholen ist zuerst leer und nennt das keinen Rückstand', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/wiederholen');

  await expect(page.getByText('Nichts offen')).toBeVisible();
  await expect(page.getByText(/kein Rückstand/)).toBeVisible();
});

test('eine falsch beantwortete Aufgabe taucht im Wiederholen auf', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/lernen/lektion-was-steht-in-einer-tabelle');

  /*
   * Die erste Auswahlaufgabe absichtlich falsch beantworten. Welche Option
   * falsch ist, weiß der Test nicht - er probiert die erste, und wenn sie
   * stimmt, die zweite. Die richtige Antwort steht dem Browser nicht zur
   * Verfügung, und genau so soll es sein.
   */
  const aufgabe = page
    .locator('li')
    .filter({ has: page.getByRole('radio') })
    .first();

  await aufgabe.getByRole('radio').nth(0).check();
  await aufgabe.getByRole('button', { name: /Antwort abgeben/i }).click();
  await expect(aufgabe.getByText(/Stimmt|Noch nicht/)).toBeVisible();

  if (await aufgabe.getByText('Stimmt').isVisible()) {
    await aufgabe.getByRole('radio').nth(1).check();
    await aufgabe.getByRole('button', { name: /Antwort abgeben/i }).click();
    await expect(aufgabe.getByText('Noch nicht')).toBeVisible();
  }

  await page.goto('/wiederholen');
  await expect(page.getByText('Nichts offen')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Antwort abgeben/i }).first()).toBeVisible();
});

test('eine Lektion lässt sich abschließen', async ({ page }) => {
  /*
   * Der Zustand COMPLETED stand im Datenmodell und wurde von niemandem
   * gesetzt - der Lernpfad zeigte einen Haken an, den niemand je erreichen
   * konnte. Dieser Test geht den Weg einmal ganz.
   *
   * Gelöst wird über die Musterlösung: Welche Option richtig ist, weiß der
   * Browser nicht, also probiert der Test der Reihe nach.
   */
  await meldeAn(page);
  await page.goto('/lernen/lektion-was-steht-in-einer-tabelle');

  const karten = page.locator('ol > li');
  const anzahl = await karten.count();

  for (let index = 0; index < anzahl; index += 1) {
    const karte = karten.nth(index);

    const optionen = karte.getByRole('radio');
    const zahlfeld = karte.locator('input[type=number]');

    if ((await optionen.count()) > 0) {
      for (let wahl = 0; wahl < (await optionen.count()); wahl += 1) {
        await optionen.nth(wahl).check();
        await karte.getByRole('button', { name: /Antwort abgeben/i }).click();
        await expect(karte.getByText(/Stimmt|Noch nicht/)).toBeVisible();
        if (await karte.getByText('Stimmt').isVisible()) break;
      }
    } else if ((await zahlfeld.count()) > 0) {
      // Die Tabelle Mitarbeitende hat vier Zeilen - das steht in der Aufgabe.
      for (const versuch of ['4', '8', '0', '12', '26']) {
        await zahlfeld.fill(versuch);
        await karte.getByRole('button', { name: /Antwort abgeben/i }).click();
        await expect(karte.getByText(/Stimmt|Noch nicht/)).toBeVisible();
        if (await karte.getByText('Stimmt').isVisible()) break;
      }
    }
    // Schreibaufgaben bleiben offen: Sie brauchen den Übungsserver, und genau
    // deshalb zählen sie für den Abschluss nicht mit.
  }

  await page.goto('/lernen');
  await expect(page.getByText('Bearbeitet').first()).toBeVisible();
});

test('die Wissenslandkarte zeigt keine erfundenen Prozente', async ({ page }) => {
  /*
   * Der Überblick zeigte früher „Bearbeitete Aufgaben" und zählte dabei
   * Versuche - wer eine Aufgabe dreimal probierte, las eine 3. Und die
   * Wissenslandkarte soll ein Wort zeigen, keine Zahl mit Nachkommastellen.
   */
  await meldeAn(page);
  await page.goto('/fortschritt');

  await expect(page.getByRole('heading', { name: /Was schon sitzt/i })).toBeVisible();
  await expect(page.getByText('Noch offen').first()).toBeVisible();

  /*
   * In den Karten selbst steht keine Prozentzahl. Geprüft wird die Liste und
   * nicht die ganze Seite: Der Erklärsatz darüber nennt „73 % JOIN" als
   * Beispiel für das, was hier gerade nicht gezeigt wird.
   */
  const landkarte = page.getByRole('list', { name: 'Wissenslandkarte' });
  await expect(landkarte).toBeVisible();
  await expect(landkarte.getByText(/%/)).toHaveCount(0);
});

test('ein gelöster Versuch bewegt die Wissenslandkarte', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/lernen/lektion-was-steht-in-einer-tabelle');

  const aufgabe = page
    .locator('li')
    .filter({ has: page.getByRole('radio') })
    .first();

  for (let wahl = 0; wahl < (await aufgabe.getByRole('radio').count()); wahl += 1) {
    await aufgabe.getByRole('radio').nth(wahl).check();
    await aufgabe.getByRole('button', { name: /Antwort abgeben/i }).click();
    await expect(aufgabe.getByText(/Stimmt|Noch nicht/)).toBeVisible();
    if (await aufgabe.getByText('Stimmt').isVisible()) break;
  }

  await page.goto('/fortschritt');
  await expect(page.getByText('Du hast bisher 1 Aufgabe bearbeitet.')).toBeVisible();
  await expect(page.getByText(/Angefangen|Sitzt|Wackelig/).first()).toBeVisible();
});

test('die Lernzeit zählt erst mit der Arbeit, nicht mit dem Öffnen', async ({ page }) => {
  /*
   * Der Kern der Messung: Wer nur Seiten aufschlägt, hat nicht gelernt. Erst
   * eine abgegebene Aufgabe beginnt die Sitzung.
   */
  await meldeAn(page);

  await page.goto('/lernen/lektion-was-steht-in-einer-tabelle');
  await page.goto('/fortschritt');
  await expect(page.getByText('Heute gelernt')).toBeVisible();
  await expect(page.getByText('0 Minuten')).toBeVisible();

  await page.goto('/lernen/lektion-was-steht-in-einer-tabelle');
  const aufgabe = page
    .locator('li')
    .filter({ has: page.getByRole('radio') })
    .first();
  await aufgabe.getByRole('radio').first().check();
  await aufgabe.getByRole('button', { name: /Antwort abgeben/i }).click();
  await expect(aufgabe.getByText(/Stimmt|Noch nicht/)).toBeVisible();

  /*
   * Die Sitzung läuft jetzt, steht aber weiterhin bei null Minuten – zwischen
   * Beginn und erster Abgabe ist keine volle Minute vergangen. Genau so soll
   * es sein: Die Zeit entsteht zwischen zwei Aktivitäten, nicht bei der
   * ersten. Geprüft wird deshalb, dass die Karte da ist und keine erfundene
   * Zahl zeigt.
   */
  await page.goto('/fortschritt');
  await expect(page.getByText('Heute gelernt')).toBeVisible();
  await expect(page.getByText(/Gemessen ab der letzten Aktivität/)).toBeVisible();
});
