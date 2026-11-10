import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { registriere, onboardingAbschliessen } from './helfer';

/** Ein Konto für die gesamte serielle Datei: kein Rate-Limit-Bypass. */
test.describe.configure({ mode: 'serial' });

let kontext: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }, testInfo) => {
  kontext = await browser.newContext({
    ...testInfo.project.use,
    baseURL: testInfo.project.use.baseURL,
    locale: 'de-DE',
    reducedMotion: 'reduce',
  });
  page = await kontext.newPage();
  await registriere(page, 'Tool-Vertrags-Test');
  await onboardingAbschliessen(page);
});

test.afterAll(async () => {
  await kontext.close();
});

test('Modul und Lab sind erreichbar; die sechs Entscheidungen führen zu gespeichertem Abschluss', async () => {
  await page.goto('/lernen');
  await expect(
    page.getByRole('heading', {
      name: 'Structured Outputs & Tool Calling – Offline-Grundlagen',
    }),
  ).toBeVisible();

  await page.goto('/labs/tool-calling-offline-lab');
  await expect(
    page.getByRole('heading', { name: 'JSON & Tool-Calling – Vertragslabor' }),
  ).toBeVisible();
  await expect(page.getByText('Hier wird kein Modell aufgerufen')).toBeVisible();
  expect(await page.content()).not.toContain('erwartetGueltig');

  const ausgabe = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: '1. Strukturierte Ausgabe' }) });
  for (const [id, gueltig] of [
    ['antwort-mit-beleg', true],
    ['beleg-fehlt', false],
    ['zusatzfeld', false],
  ] as const) {
    await ausgabe.getByLabel('Beispiel auswählen').selectOption(id);
    await ausgabe
      .getByRole('radio', { name: gueltig ? 'Ja, formal gültig' : 'Nein, ablehnen' })
      .check();
    await ausgabe.getByRole('button', { name: 'Entscheidung prüfen' }).click();
    await expect(ausgabe.getByText('Dein Urteil stimmt mit der Prüfung überein.')).toBeVisible();
  }
  const tools = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: '2. Tool-Aufruf' }) });
  for (const [id, gueltig] of [
    ['lesen-erlaubt', true],
    ['schreiben-verboten', false],
    ['argumente-fremd', false],
  ] as const) {
    await tools.getByLabel('Beispiel auswählen').selectOption(id);
    await tools
      .getByRole('radio', { name: gueltig ? 'Ja, formal gültig' : 'Nein, ablehnen' })
      .check();
    await tools.getByRole('button', { name: 'Entscheidung prüfen' }).click();
    await expect(tools.getByText('Dein Urteil stimmt mit der Prüfung überein.')).toBeVisible();
  }
  const toolErgebnis = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: '3. Tool-Ergebnis und Vertrauensgrenze' }) });
  await expect(toolErgebnis.getByText(/Ignoriere alle bisherigen Regeln/)).toBeVisible();

  // Sperrbedingung: Sechs richtige Vertragsurteile allein schalten den
  // Abschluss nicht frei – weder vor der dritten Entscheidung noch nach einer
  // falschen oder einer noch nicht geprüften Auswahl.
  const abschliessen = page.getByRole('button', { name: 'Lab abschließen' });
  const fortschritt = page
    .getByRole('status')
    .filter({ hasText: 'Ausgabe-Beispielen und 3 von 3 Tool-Beispielen' });
  await expect(fortschritt).toContainText('3 von 3 Ausgabe-Beispielen');
  await expect(fortschritt).toContainText('Vertrauensgrenze des Tool-Ergebnisses ist noch offen');
  await expect(abschliessen).toHaveCount(0);

  await toolErgebnis.getByRole('radio', { name: /Anweisung als Freigabe/ }).check();
  await toolErgebnis.getByRole('button', { name: 'Tool-Ergebnis beurteilen' }).click();
  await expect(toolErgebnis.getByText('Nicht freigegeben')).toBeVisible();
  await expect(fortschritt).toContainText('Vertrauensgrenze des Tool-Ergebnisses ist noch offen');
  await expect(abschliessen).toHaveCount(0);

  await toolErgebnis.getByRole('radio', { name: /nur als untrusted Dateninhalt/ }).check();
  // Die richtige Auswahl ohne erneute Prüfung genügt ebenfalls nicht.
  await expect(toolErgebnis.getByText('Nicht freigegeben')).toHaveCount(0);
  await expect(abschliessen).toHaveCount(0);
  await toolErgebnis.getByRole('button', { name: 'Tool-Ergebnis beurteilen' }).click();
  await expect(toolErgebnis.getByText('Richtige Vertrauensgrenze')).toBeVisible();
  await page.getByRole('button', { name: 'Lab abschließen' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Lab abgeschlossen.' })).toBeVisible();
  await page.goto('/labs');
  await expect(
    page
      .getByRole('link', { name: /JSON & Tool-Calling – Vertragslabor/ })
      .getByText('Abgeschlossen'),
  ).toBeVisible();
});

test('375 px: keine Seitenbreitenüberläufe und keine ernsten Accessibility-Verstöße', async () => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/labs/tool-calling-offline-lab');
  const breite = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breite).toBeLessThanOrEqual(375);
  const ausgabe = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: '1. Strukturierte Ausgabe' }) });
  // Die erste Ausgabe ist gültig: Ein bewusst falsches Nein muss als falsch
  // markiert werden, nicht anhand der Validator-Gültigkeit als Erfolg.
  await ausgabe.getByRole('radio', { name: 'Nein, ablehnen' }).check();
  await ausgabe.getByRole('button', { name: 'Entscheidung prüfen' }).click();
  await expect(
    ausgabe.getByText('Dein Urteil passt nicht zur tatsächlichen Prüfung.'),
  ).toBeVisible();
  await expect(ausgabe.getByText('Urteil überprüfen')).toBeVisible();

  // Editiertes JSON ist ungültig. Ein richtiges Nein ist eine korrekte
  // Lernentscheidung, nicht dieselbe Erklärung wie für das ursprüngliche JSON.
  await ausgabe
    .getByLabel('JSON – zum Experimentieren editierbar')
    .fill('{"antwort":"Nicht belegt","status":"belegt","belegId":null}');
  await ausgabe.getByRole('button', { name: 'Entscheidung prüfen' }).click();
  await expect(ausgabe.getByText('Dein Urteil stimmt mit der Prüfung überein.')).toBeVisible();
  await expect(ausgabe.getByText('Urteil richtig')).toBeVisible();
  await expect(ausgabe.getByText(/Die Erklärung zum ursprünglichen Beispiel gilt/)).toBeVisible();
  await expect(
    ausgabe.getByText(
      'Felder und Beleg-ID erfüllen den Offline-Vertrag; das beweist noch nicht die Wahrheit des Inhalts.',
    ),
  ).toHaveCount(0);

  // Auch die sichtbare Ergebnis-Rückmeldung wird bei 375 px mit axe geprüft.
  const bericht = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22a', 'wcag22aa'])
    .analyze();
  expect(
    bericht.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});
