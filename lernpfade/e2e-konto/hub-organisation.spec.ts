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

  // E5.2: Team anlegen; die Seite des Teams öffnet sich.
  await adminSeite.getByLabel('Name des Teams').fill('Vertrieb');
  await adminSeite.getByRole('button', { name: 'Team anlegen' }).click();
  await expect(adminSeite).toHaveURL(/\/teams\/vertrieb$/);
  await expect(adminSeite.getByRole('heading', { level: 1 })).toHaveText('Vertrieb');
  const orgAdresse = new URL(adminSeite.url()).pathname.replace(/\/teams\/vertrieb$/, '');
  await adminSeite.goto(orgAdresse);

  // Einladungslink für eine lernende Person, direkt ins Team; der Link erscheint genau jetzt.
  await adminSeite.getByLabel('Direkt ins Team (optional)').selectOption({ label: 'Vertrieb' });
  await adminSeite.getByLabel('Für wie viele Personen?').fill('1');
  await adminSeite.getByRole('button', { name: 'Einladungslink erstellen' }).click();
  const linkFeld = adminSeite.getByLabel('Einladungslink');
  await expect(linkFeld).toHaveValue(/\/einladung\/[A-Za-z0-9_-]{40,}$/);
  const link = await linkFeld.inputValue();
  await expect(adminSeite.getByRole('list', { name: 'Offene Einladungen' })).toContainText('0 von 1 genutzt');
  await expect(adminSeite.getByRole('list', { name: 'Offene Einladungen' })).toContainText('Team Vertrieb');

  // Lernende Person: Link öffnen, anmelden, beitreten.
  const lernSeite = await (await browser.newContext()).newPage();
  await lernSeite.goto(new URL(link).pathname);
  await expect(lernSeite.getByRole('heading', { level: 1 })).toHaveText(NAME);
  await expect(lernSeite.getByRole('main')).toContainText('direkt ins Team Vertrieb');
  await lernSeite.getByRole('link', { name: 'Mit Lernpfade-Konto anmelden' }).click();
  await anmeldenBeimKonto(lernSeite, lernend);
  await expect(lernSeite).toHaveURL(new URL(link).pathname);
  await lernSeite.getByRole('button', { name: `${NAME} beitreten` }).click();
  await expect(lernSeite).toHaveURL(/\/organisation\/e2e-firma-/);
  await expect(lernSeite.getByRole('heading', { name: 'Du lernst hier mit' })).toBeVisible();
  // Lernende sehen keine Mitgliederliste und kein Protokoll.
  await expect(lernSeite.getByRole('list', { name: 'Mitglieder' })).toHaveCount(0);

  // E5.2: im Team, standardmäßig nur in Summen; die Person erlaubt es selbst.
  const eigeneTeams = lernSeite.getByRole('list', { name: 'Deine Teams' });
  await expect(eigeneTeams).toContainText('Vertrieb');
  await expect(eigeneTeams).toContainText('nur in Summen');
  await eigeneTeams.getByRole('button', { name: 'In „Vertrieb“ namentlich zeigen' }).click();
  await expect(lernSeite.getByRole('main').getByRole('status')).toHaveText(/jetzt namentlich sichtbar/);
  await expect(eigeneTeams).toContainText('namentlich sichtbar seit');

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
  await expect(protokoll).toContainText('Einladungslink für bis zu 1 Person als Lernend erstellt (Team „Vertrieb“)');
  await expect(protokoll).toContainText('hat das Team „Vertrieb“ angelegt');
  await expect(protokoll).toContainText('Ada Testkonto ist als Lernend beigetreten');
  await expect(adminSeite.getByRole('list', { name: 'Teams' })).toContainText('1 Person · 1 namentlich sichtbar');

  // Das Team zeigt die Person mit ihrer Einwilligung.
  await adminSeite.getByRole('list', { name: 'Teams' }).getByRole('link', { name: 'Vertrieb' }).click();
  const personen = adminSeite.getByRole('list', { name: 'Personen im Team' });
  await expect(personen).toContainText('Ada Testkonto');
  await expect(personen).toContainText('namentlich sichtbar');

  // E5.2b: Stand des Teams aus AIPfad über die Team-Quelle (Diensttoken der Plattform).
  // AIPfad kennt die Person aus der Fortschritts-Strecke; eine Person allein ergibt keine Summen.
  const stand = adminSeite.getByRole('region', { name: 'Stand des Teams' });
  const ai = stand.getByRole('article', { name: 'AIPfad' });
  await expect(ai).toContainText('1 von 1 Personen lernen in AIPfad');
  await expect(ai).toContainText('Summen erscheinen ab drei Personen');
  await expect(stand.getByRole('article', { name: 'PythonPfad' })).toContainText('Noch nicht mit der Plattform verbunden');
  await expect(stand.getByRole('list', { name: 'Stand namentlich' })).toContainText(/AIPfad: \d+ von \d+ Lektionen/);

  // CSV: dieselben Werte, Excel-freundlich; der Export steht im Protokoll.
  const csvLink = await stand.getByRole('link', { name: 'Als CSV herunterladen' }).getAttribute('href');
  const csv = await adminSeite.request.get(new URL(csvLink!, adminSeite.url()).toString());
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toMatch(/^\uFEFFArt;Person;Pfad;/);
  expect(await csv.text()).toContain('Person;Ada Testkonto;AIPfad;');
  await adminSeite.goto(orgAdresse);
  await expect(adminSeite.getByRole('region', { name: 'Prüfprotokoll' })).toContainText(
    'hat den Stand des Teams „Vertrieb“ als CSV heruntergeladen',
  );

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
