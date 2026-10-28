import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

/**
 * Der ganze Weg: Anwendung → Runner-Dienst → SQL Server.
 *
 * Die Hauptsuite prüft SQLPfad mit ausgeschaltetem Übungsserver. Hier ist er
 * eingeschaltet, und jede Prüfung führt echtes SQL in der eigenen Sandbox aus.
 * Bis Oktober 2026 gab es diesen Lauf nicht; der erste fand, dass kein
 * SELECT-Ergebnis ankam und dass Schreibaufgaben nie bewertet wurden.
 */

const PASSWORT = 'nordwind-treppe-hafen-41';

async function meldeAn(page: Page): Promise<void> {
  const adresse = `e2e-server-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
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
async function schreibeSql(page: Page, bereich: Locator | Page, text: string): Promise<void> {
  const editor = bereich.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await editor.pressSequentially(text);
  // Die Vervollständigung schließen, damit sie keinen Klick abfängt.
  await page.keyboard.press('Escape');
}

async function fuehreAus(page: Page, sql: string): Promise<void> {
  await schreibeSql(page, page, sql);
  await page.getByRole('button', { name: 'Ausführen' }).click();
}

function aufgabe(page: Page, titel: string): Locator {
  return page
    .locator('li')
    .filter({ hasText: titel })
    .filter({ has: page.locator('.cm-editor') });
}

async function gibAb(page: Page, karte: Locator, sql: string): Promise<void> {
  await schreibeSql(page, karte, sql);
  await karte.getByRole('button', { name: /Antwort abgeben/ }).click();
}

test('die Werkbank führt aus: Zeilen, Datum als Datum, NULL benannt', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/abfrage');
  await fuehreAus(
    page,
    'SELECT TOP 2 Bezeichnung, Eingegangen, Abgeschlossen FROM Auftraege ORDER BY AuftragId DESC',
  );

  const tabelle = page.locator('table');
  await expect(tabelle).toBeVisible();
  await expect(page.getByText('2 Zeilen', { exact: true })).toBeVisible();
  const erste = tabelle.locator('tbody tr').first();
  await expect(erste).toContainText('Angebot für Elektroprüfung');
  // Vorher kam das Datum als `2026-03-10T00:00:00.000Z` an – JSON macht aus
  // einem Datum einen Text, und niemand machte wieder ein Datum daraus.
  await expect(erste).toContainText('2026-03-10');
  await expect(tabelle).not.toContainText('T00:00:00');
  await expect(erste).toContainText('NULL');
});

test('ein Fehler des Servers wird übersetzt, das Original bleibt sichtbar', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/abfrage');
  await fuehreAus(page, 'SELECT Stadtt FROM Kunden');

  const fehler = page.locator('section', { hasText: 'Die Datenbank kommt hier nicht weiter' });
  await expect(fehler).toBeVisible();
  await expect(fehler).toContainText("Invalid column name 'Stadtt'");
  await expect(fehler.getByText('Was das bedeutet')).toBeVisible();
});

test('eine Schreibaufgabe wird am Ergebnis bewertet: noch nicht, Fehler, stimmt', async ({
  page,
}) => {
  await meldeAn(page);
  await page.goto('/lernen/lektion-zeilen-auswaehlen');
  const karte = aufgabe(page, 'Alle aus Mannheim');
  await expect(karte).toBeVisible();

  // Läuft, liefert aber das Falsche – der häufigste Fehler, ohne Fehlermeldung.
  await gibAb(page, karte, "SELECT Name, Telefon FROM Kunden WHERE Stadt = 'Heidelberg'");
  await expect(karte.getByText('Noch nicht', { exact: true })).toBeVisible();
  await expect(karte.getByText('Was noch nicht passt:')).toBeVisible();
  await expect(karte.getByText('Dein Ergebnis:')).toBeVisible();
  await expect(karte.locator('table')).toContainText('Bäckerei Lindner');

  // Ein Text ohne Anführungszeichen ist für SQL Server ein Spaltenname.
  await gibAb(page, karte, 'SELECT Name, Telefon FROM Kunden WHERE Stadt = Mannheim');
  await expect(karte.getByText('Die Datenbank kommt hier nicht weiter')).toBeVisible();
  await expect(karte).toContainText("Invalid column name 'Mannheim'");

  // Richtig – mit N-Präfix und anderer Schreibweise als die Musterlösung:
  // Bewertet wird das Ergebnis, nicht der Text.
  await gibAb(page, karte, "select Name, Telefon from dbo.Kunden as k where k.Stadt = N'Mannheim'");
  await expect(karte.getByText('Stimmt', { exact: true })).toBeVisible();
  await expect(karte).toContainText('3 Zeilen mit 2 Spalten');
  await expect(karte.getByText('Was noch nicht passt:')).toHaveCount(0);
});

test('eine Aufgabe mit Datumswerten wird richtig bewertet', async ({ page }) => {
  // Erwartetes Ergebnis aus der Datenbank und eigenes Ergebnis vom Runner gehen
  // beide durch JSON. Ohne Rückwandlung zu Datumswerten wäre das hier Glück.
  await meldeAn(page);
  await page.goto('/lernen/lektion-zeilen-auswaehlen');
  const karte = aufgabe(page, 'Aufträge seit Februar');
  await gibAb(
    page,
    karte,
    "SELECT Bezeichnung, Eingegangen FROM Auftraege WHERE Eingegangen >= '2026-02-01'",
  );
  await expect(karte.getByText('Stimmt', { exact: true })).toBeVisible();
  await expect(karte.locator('table')).not.toContainText('T00:00:00');
});

test('eine Gruppierungsaufgabe: die korrigierte Erwartung trägt', async ({ page }) => {
  // Hier standen drei Zeilen im Lehrplan; die Daten geben eine her.
  await meldeAn(page);
  await page.goto('/lernen/lektion-auf-gruppen-filtern');
  const karte = aufgabe(page, 'Kundinnen mit mehr als zwei Aufträgen');
  await gibAb(
    page,
    karte,
    'SELECT KundeId, COUNT(*) AS Anzahl FROM Auftraege GROUP BY KundeId HAVING COUNT(*) > 2',
  );
  await expect(karte.getByText('Stimmt', { exact: true })).toBeVisible();
  await expect(karte).toContainText('eine Zeile mit 2 Spalten');
});

test('eine Änderungsaufgabe bekommt eine ehrliche Auskunft statt eines Urteils', async ({
  page,
}) => {
  await meldeAn(page);
  await page.goto('/lernen/lektion-zeilen-aendern');
  const karte = aufgabe(page, 'Die neue Kundin eintragen');
  await gibAb(
    page,
    karte,
    "INSERT INTO Kunden (KundeId, Name, Stadt, Telefon, KundeSeit) VALUES (9, 'Reiter GmbH', 'Speyer', NULL, '2024-03-01')",
  );
  await expect(karte.getByText('Geprüft, aber nicht ausgeführt')).toBeVisible();
  await expect(karte).toContainText('noch nicht automatisch');
  // Nicht die Auskunft für ausgeschaltete Server – hier ist einer da.
  await expect(karte).not.toContainText('noch nicht eingeschaltet');
});

test('zwei Konten, zwei Sandboxes: keine sieht die andere', async ({ browser }) => {
  async function eigeneDatenbank(b: Browser): Promise<{ name: string; liste: string }> {
    const kontext = await b.newContext();
    const page = await kontext.newPage();
    await meldeAn(page);
    await page.goto('/abfrage');
    await fuehreAus(page, 'SELECT DB_NAME() AS Datenbank');
    const name = (await page.locator('table tbody tr').first().innerText()).trim();
    await fuehreAus(page, 'SELECT name FROM sys.databases ORDER BY name');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    const liste = await page.locator('table').innerText();
    await kontext.close();
    return { name, liste };
  }

  const erste = await eigeneDatenbank(browser);
  const zweite = await eigeneDatenbank(browser);
  expect(erste.name).toMatch(/^sbx_/);
  expect(zweite.name).toMatch(/^sbx_/);
  expect(zweite.name).not.toBe(erste.name);
  // Die eigene Sandbox steht in der Liste, die fremde nicht einmal dort.
  expect(zweite.liste).toContain(zweite.name);
  expect(zweite.liste).not.toContain(erste.name);
});
