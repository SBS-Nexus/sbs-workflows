import { expect, test } from '@playwright/test';
import { anmeldenBeimKonto, testkonten } from './konto';
import { anmeldenMitZweitemFaktor, kontoMitZweitemFaktor } from './zweiter-faktor';

/**
 * E5.1 (docs/E5-PLAN.md) gegen echten ZITADEL und echte Hub-Datenbank:
 * Organisation anlegen (nur mit zweitem Faktor), per Link einladen,
 * beitreten, Plätze und Prüfprotokoll. Ohne zweiten Faktor bietet der Hub
 * die Einrichtung an, statt Verwaltung zu zeigen.
 */
if (!process.env.HUB_DATABASE_URL) {
  throw new Error('HUB_DATABASE_URL fehlt: Die Strecke der Organisationen braucht die Datenbank des Hubs.');
}

test.describe.configure({ mode: 'serial' });

const NAME = `E2E Firma ${Date.now().toString(36)}`;

test('Organisation anlegen, per Link einladen, beitreten, Plätze und Protokoll', async ({ browser }) => {
  const admin = kontoMitZweitemFaktor();
  const { bestaetigt: lernend } = testkonten();

  // Admin: anmelden mit zweitem Faktor, anlegen.
  const adminSeite = await (await browser.newContext()).newPage();
  await adminSeite.goto('/organisation');
  await adminSeite.getByRole('link', { name: 'Mit Lernpfade-Konto anmelden' }).click();
  await anmeldenMitZweitemFaktor(adminSeite, admin);
  await expect(adminSeite).toHaveURL('/organisation');
  await adminSeite.getByLabel('Name der Organisation').fill(NAME);
  await adminSeite.getByRole('button', { name: 'Organisation anlegen' }).click();
  await expect(adminSeite).toHaveURL(/\/organisation\/e2e-firma-[a-z0-9-]+$/);
  await expect(adminSeite.getByRole('heading', { level: 1 })).toHaveText(NAME);
  await expect(adminSeite.getByRole('progressbar', { name: '0 von 10 Plätzen für Lernende belegt' })).toBeVisible();

  // Einladungslink für eine lernende Person; der Link erscheint genau jetzt.
  await adminSeite.getByLabel('Für wie viele Personen?').fill('1');
  await adminSeite.getByRole('button', { name: 'Einladungslink erstellen' }).click();
  const linkFeld = adminSeite.getByLabel('Einladungslink');
  await expect(linkFeld).toHaveValue(/\/einladung\/[A-Za-z0-9_-]{40,}$/);
  const link = await linkFeld.inputValue();
  await expect(adminSeite.getByRole('list', { name: 'Offene Einladungen' })).toContainText('0 von 1 genutzt');

  // Lernende Person: Link öffnen, anmelden, beitreten.
  const lernSeite = await (await browser.newContext()).newPage();
  await lernSeite.goto(new URL(link).pathname);
  await expect(lernSeite.getByRole('heading', { level: 1 })).toHaveText(NAME);
  await lernSeite.getByRole('link', { name: 'Mit Lernpfade-Konto anmelden' }).click();
  await anmeldenBeimKonto(lernSeite, lernend);
  await expect(lernSeite).toHaveURL(new URL(link).pathname);
  await lernSeite.getByRole('button', { name: `${NAME} beitreten` }).click();
  await expect(lernSeite).toHaveURL(/\/organisation\/e2e-firma-/);
  await expect(lernSeite.getByRole('heading', { name: 'Du lernst hier mit' })).toBeVisible();
  // Lernende sehen keine Mitgliederliste und kein Protokoll.
  await expect(lernSeite.getByRole('list', { name: 'Mitglieder' })).toHaveCount(0);

  // Der Link ist aufgebraucht.
  const nochmal = await (await browser.newContext()).newPage();
  await nochmal.goto(new URL(link).pathname);
  await nochmal.getByRole('link', { name: 'Mit Lernpfade-Konto anmelden' }).click();
  await anmeldenMitZweitemFaktor(nochmal, admin);
  await nochmal.getByRole('button', { name: `${NAME} beitreten` }).click();
  // Im Hauptbereich: Auch Nexts Ansage für Seitenwechsel trägt role="alert".
  await expect(nochmal.getByRole('main').getByRole('alert')).toHaveText(/schon so oft genutzt|bereits Mitglied/);

  // Admin: Platz belegt, Mitglied sichtbar, Protokoll vollständig.
  await adminSeite.reload();
  await expect(adminSeite.getByRole('progressbar', { name: '1 von 10 Plätzen für Lernende belegt' })).toBeVisible();
  await expect(adminSeite.getByRole('list', { name: 'Mitglieder' })).toContainText('Ada Testkonto');
  const protokoll = adminSeite.getByRole('region', { name: 'Prüfprotokoll' });
  await expect(protokoll).toContainText(`hat die Organisation „${NAME}“ angelegt`);
  await expect(protokoll).toContainText('Einladungslink für bis zu 1 Person als Lernend erstellt');
  await expect(protokoll).toContainText('Ada Testkonto ist als Lernend beigetreten');

  // Ohne zweiten Faktor: keine Verwaltung, sondern der Weg zur Einrichtung.
  await lernSeite.goto('/organisation');
  await expect(lernSeite.getByRole('link', { name: 'Zweiten Faktor einrichten' })).toBeVisible();
  await expect(lernSeite.getByRole('button', { name: 'Organisation anlegen' })).toHaveCount(0);
});

test('eine unbekannte Einladung sagt das, ohne etwas zu verraten', async ({ page }) => {
  await page.goto('/einladung/gibt-es-nicht');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Diese Einladung gibt es nicht');
});

test('fremde Organisationen gibt es für Nichtmitglieder nicht', async ({ page }) => {
  const { bestaetigt } = testkonten();
  await page.goto('/organisation/gibt-es-nicht');
  await page.getByRole('link', { name: 'Mit Lernpfade-Konto anmelden' }).click();
  await anmeldenBeimKonto(page, bestaetigt);
  await expect(page).toHaveURL('/organisation/gibt-es-nicht');
  await expect(page.getByRole('heading', { name: 'Diese Seite gibt es nicht' })).toBeVisible();
});
