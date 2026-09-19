import { test, expect, type Page } from '@playwright/test';
import { einstellungenBeantworten, registriere } from './helfer';

/**
 * Das Onboarding führt jetzt durch die Einstufung. Geprüft wird der Weg,
 * den ein neues Konto tatsächlich nimmt — beide Varianten, plus die Fälle,
 * in denen ein Ablauf sonst still etwas verliert.
 */

async function neuesKonto(page: Page): Promise<string> {
  return registriere(page, 'Einstufungstest');
}

test('neues Konto: Onboarding, Einstufung, Ergebnis', async ({ page }) => {
  await neuesKonto(page);
  await einstellungenBeantworten(page);

  await expect(page.getByRole('heading', { name: /wo du stehst/i })).toBeVisible();
  await page.getByRole('button', { name: 'Einschätzung machen' }).click();

  // Acht Fragen, eine nach der anderen.
  for (let i = 0; i < 8; i += 1) {
    await expect(page.getByText(`Frage ${i + 1} von 8`)).toBeVisible();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Weiter' }).click();
  }

  await page.getByRole('button', { name: /Los geht/ }).click();

  await expect(page.getByRole('heading', { name: 'Deine Einschätzung' })).toBeVisible();
  await expect(page.getByText(/von 100 Punkten/)).toBeVisible();
  // Der Pfad bleibt vollständig — das muss auf der Ergebnisseite dastehen.
  await expect(page.getByText(/nichts übersprungen|alle Lektionen/)).toBeVisible();

  await page.getByRole('link', { name: 'Zum Lernpfad' }).click();
  await page.waitForURL(/\/pfad/);
});

test('neues Konto: Einstufung überspringen', async ({ page }) => {
  await neuesKonto(page);
  await einstellungenBeantworten(page);

  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.getByRole('button', { name: /Los geht/ }).click();

  await expect(page.getByRole('heading', { name: 'Alles eingerichtet' })).toBeVisible();
  await page.getByRole('link', { name: 'Zum Lernpfad' }).click();
  await page.waitForURL(/\/pfad/);
});

test('Zurückgehen behält bereits gegebene Antworten', async ({ page }) => {
  await neuesKonto(page);

  // Erste Einstellung wählen, weiter, dann zurück: Die Wahl steht noch.
  const ersteWahl = page.getByRole('radio').first();
  await ersteWahl.check();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByRole('radio').first()).toBeChecked();
});

test('abgeschlossenes Onboarding fängt nicht von vorne an', async ({ page }) => {
  await neuesKonto(page);
  await einstellungenBeantworten(page);
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.getByRole('button', { name: /Los geht/ }).click();
  await page.getByRole('link', { name: 'Zum Lernpfad' }).click();
  await page.waitForURL(/\/pfad/);

  // Wer danach wieder auf /onboarding geht, landet im Pfad — die Einstufung
  // wird nicht zurückgesetzt.
  await page.goto('/onboarding');
  await page.waitForURL(/\/pfad/);
});

test('ein Absenden mitten im Ablauf wird abgewiesen, am Ende nicht', async ({ page }) => {
  await neuesKonto(page);
  await einstellungenBeantworten(page);
  await page.getByRole('button', { name: 'Einschätzung machen' }).click();

  // Absendeversuche mitschreiben: Eine Serveraktion schickt sich an dieselbe
  // Adresse, ohne zu navigieren — die Adresse allein verriete also nichts.
  const absendeversuche: string[] = [];
  page.on('request', (anfrage) => {
    if (anfrage.method() === 'POST') absendeversuche.push(anfrage.url());
  });

  // Drei von acht Fragen beantworten, dann absenden versuchen.
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('radio').first().check();
    if (i < 2) await page.getByRole('button', { name: 'Weiter' }).click();
  }

  // Warum nicht die Eingabetaste? Weil sie hier gar nichts auslöst: Chromium
  // schickt eine Form nur dann von selbst ab, wenn ein Textfeld beteiligt ist
  // (`CanTriggerImplicitSubmission()` ist `IsTextField()`). Auf dieser Seite
  // gibt es nur Auswahlfelder, versteckte Felder und `type="button"` —
  // nachgemessen: Eingabetaste auf einem Radio löst null submit-Ereignisse
  // aus, auf einem Textfeld eines. Ein Test über die Eingabetaste wäre also
  // grün, auch wenn die Sperre fehlte, und bewiese nichts.
  //
  // `requestSubmit()` feuert dasselbe abbrechbare submit-Ereignis, das ein
  // Absenden auslösen würde, und trifft damit die Sperre wirklich.
  const absenden = () => page.evaluate(() => document.querySelector('form')!.requestSubmit());

  await absenden();
  await expect(page.getByText('Frage 3 von 8')).toBeVisible();

  // Warten, bis eine Anfrage draußen wäre: Ohne die Sperre steht der Aufruf
  // noch aus, die Seite sieht unverändert aus, und sofort zu prüfen hieße
  // wieder nur, schneller als das Netz zu sein. Die Gegenprobe unten braucht
  // das nicht — sie wartet auf ein sichtbares Ergebnis.
  await page.waitForTimeout(1000);
  expect(absendeversuche).toEqual([]);

  // Und das Onboarding ist nicht abgeschlossen: Wäre es das, leitete ein
  // erneuter Aufruf auf den Pfad weiter.
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('am Ende des Ablaufs kommt das Absenden durch', async ({ page }) => {
  // Gegenprobe zum Test davor. Ohne sie hieße "nichts abgeschickt" nur, dass
  // dieser Aufbau überhaupt nichts mitbekommt — die leere Liste wäre wertlos.
  await neuesKonto(page);
  await einstellungenBeantworten(page);
  await page.getByRole('button', { name: 'Einschätzung machen' }).click();

  const absendeversuche: string[] = [];
  page.on('request', (anfrage) => {
    if (anfrage.method() === 'POST') absendeversuche.push(anfrage.url());
  });

  // Achtmal "Weiter" — auch nach der letzten Frage, denn erst das führt auf
  // den Absende-Schritt. Genau dort lässt die Sperre ein Absenden durch.
  for (let i = 0; i < 8; i += 1) {
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Weiter' }).click();
  }
  await expect(page.getByRole('button', { name: "Los geht's" })).toBeVisible();

  await page.evaluate(() => document.querySelector('form')!.requestSubmit());
  await expect(page.getByRole('heading', { name: 'Deine Einschätzung' })).toBeVisible();
  expect(absendeversuche.length).toBeGreaterThan(0);
});

test('Zurückgehen behält eine gegebene Einstufungsantwort', async ({ page }) => {
  await neuesKonto(page);
  await einstellungenBeantworten(page);
  await page.getByRole('button', { name: 'Einschätzung machen' }).click();

  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByText('Frage 2 von 8')).toBeVisible();

  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByText('Frage 1 von 8')).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeChecked();
});

test('Zurück vom letzten Schritt führt zurück in den Ablauf', async ({ page }) => {
  await neuesKonto(page);
  await einstellungenBeantworten(page);
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await expect(page.getByRole('heading', { name: 'Alles beisammen' })).toBeVisible();

  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByRole('heading', { name: /wo du stehst/i })).toBeVisible();
});

test('Mobilbreite: kein waagerechtes Scrollen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await neuesKonto(page);

  const ueberlauf = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(ueberlauf).toBe(false);

  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Weiter' }).click();
  const ueberlaufSpaeter = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(ueberlaufSpaeter).toBe(false);
});

test('mit der Tastatur allein zu bedienen', async ({ page }) => {
  await neuesKonto(page);

  // Bis zur ersten Antwortmöglichkeit tabben und mit Leertaste wählen.
  await page.keyboard.press('Tab');
  for (let i = 0; i < 12; i += 1) {
    const istRadio = await page.evaluate(
      () => document.activeElement?.getAttribute('type') === 'radio',
    );
    if (istRadio) break;
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio').first()).toBeChecked();
});
