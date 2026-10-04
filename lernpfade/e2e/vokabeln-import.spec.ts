import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  EXAMPLE_FILE,
  clearBrowserData,
  expectNoOutgoingContent,
  expectNoSeriousA11yViolations,
  gotoVocab,
  readVocabStorage,
  recordRequests,
  successNotice,
} from './helpers';

const FIXTURES = 'src/domain/vocabulary/fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearBrowserData(page);
  await gotoVocab(page);
});

function fileInput(page: Page) {
  return page.getByLabel('Datei auswählen');
}

async function importExample(page: Page): Promise<void> {
  await fileInput(page).setInputFiles(EXAMPLE_FILE);
  await expect(page.getByRole('region', { name: 'Importvorschau' })).toBeVisible();
  await page.getByRole('button', { name: 'Import übernehmen' }).click();
  await expect(successNotice(page)).toHaveText('1 Deck mit 4 Karten importiert.');
}

test('gültiger Import: erst Vorschau, erst nach Bestätigung übernommen', async ({ page }) => {
  const seen = recordRequests(page);
  await fileInput(page).setInputFiles(EXAMPLE_FILE);

  const preview = page.getByRole('region', { name: 'Importvorschau' });
  await expect(preview).toBeVisible();
  await expect(preview.locator('dt', { hasText: 'Decks' }).locator('+ dd')).toHaveText('1');
  await expect(preview.locator('dt', { hasText: 'Karten' }).locator('+ dd')).toHaveText('4');
  await expect(preview).toContainText('Englisch → Deutsch');
  await expect(preview).toContainText('Lernpfade-Beispieldatei');
  await expectNoSeriousA11yViolations(page, 'Importvorschau');

  // Vor der Bestätigung ist nichts gespeichert.
  expect(await readVocabStorage(page)).toBeNull();
  await expect(page.getByText('Noch keine Decks.')).toBeVisible();

  await page.getByRole('button', { name: 'Import übernehmen' }).click();
  await expect(successNotice(page)).toHaveText('1 Deck mit 4 Karten importiert.');
  const deck = page.locator('.vocab-deck').filter({ hasText: 'Beispiel: Reisen' });
  await expect(deck).toContainText('Importiert · Herkunft laut Datei: Lernpfade-Beispieldatei');
  await expect(deck).toContainText('4 Karten');

  // Die Datei wurde nur lokal gelesen.
  expectNoOutgoingContent(seen, ['luggage', 'Gepäck', 'Verspätung']);
});

test('wiederholter Import desselben Exports wird abgelehnt und verändert nichts', async ({ page }) => {
  await importExample(page);
  const before = await readVocabStorage(page);

  await fileInput(page).setInputFiles(EXAMPLE_FILE);
  await expect(page.getByRole('alert').filter({ hasText: 'Import abgelehnt' })).toContainText('Bereits vorhanden: „Beispiel: Reisen"');
  await expect(page.getByRole('region', { name: 'Importvorschau' })).toHaveCount(0);
  expect(await readVocabStorage(page)).toBe(before);
  await expect(page.locator('.vocab-deck')).toHaveCount(1);
});

const INVALID = [
  ['invalid-json.json', 'kein gültiges JSON'],
  ['invalid-future-version.json', 'Schema-Version 2'],
  ['invalid-progress.json', 'Lernfortschritt kann nicht importiert werden'],
  ['invalid-duplicate-card-ids.json', 'kommt doppelt vor'],
  ['invalid-unknown-field.json', 'unerwartete Felder'],
  ['invalid-proto-key.json', 'unerwartete Felder'],
  ['invalid-overlong-term.json', 'höchstens 200 Zeichen'],
] as const;

test('ungültige Dateien werden atomar abgelehnt', async ({ page }) => {
  await importExample(page);
  const before = await readVocabStorage(page);

  for (const [name, message] of INVALID) {
    await fileInput(page).setInputFiles(`${FIXTURES}/${name}`);
    const alert = page.getByRole('alert').filter({ hasText: 'Import abgelehnt' });
    await expect(alert, name).toContainText(message);
    await expect(alert).toContainText('Deine vorhandenen Daten sind unverändert.');
    expect(await readVocabStorage(page), name).toBe(before);
  }
  await expectNoSeriousA11yViolations(page, 'Importfehler');
  expect(await page.evaluate(() => ({} as Record<string, unknown>).polluted)).toBeUndefined();
});

test('Dateien über 2 MiB werden vor dem Lesen abgelehnt', async ({ page }) => {
  await fileInput(page).setInputFiles({
    name: 'gross.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 32),
  });
  await expect(page.getByRole('alert').filter({ hasText: 'Import abgelehnt' })).toContainText(
    '„gross.json" ist größer als 2 MiB und wird nicht gelesen.',
  );
  expect(await readVocabStorage(page)).toBeNull();
});

test('importierter Inhalt wird nur als Text dargestellt', async ({ page }) => {
  const example = JSON.parse(readFileSync(EXAMPLE_FILE, 'utf8'));
  example.decks[0].id = 'html-test';
  example.decks[0].name = '<b>Fett?</b>';
  example.decks[0].cards = [
    {
      id: 'html-test-card',
      term: '<img src=x onerror="window.__xss=1">',
      translation: '**kein Markdown**',
      context: '<script>window.__xss=2</script>',
      tags: ['<i>tag</i>'],
    },
  ];
  await fileInput(page).setInputFiles({
    name: 'html.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(example)),
  });
  await page.getByRole('button', { name: 'Import übernehmen' }).click();
  await page.getByRole('button', { name: 'Öffnen: <b>Fett?</b>' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '<b>Fett?</b>' })).toBeVisible();
  await expect(page.getByText('<img src=x onerror="window.__xss=1">')).toBeVisible();
  await expect(page.getByText('**kein Markdown**')).toBeVisible();
  await expect(page.locator('main img, main script, main b, main i')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('Export enthält Inhalte und Herkunft, aber keinen Lernfortschritt', async ({ page }) => {
  await importExample(page);
  await page.getByRole('button', { name: 'Session starten' }).click();
  await page.getByRole('button', { name: 'Antwort zeigen' }).click();
  await page.getByRole('button', { name: /^Gut/ }).click();
  await page.getByRole('button', { name: 'Session beenden' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportieren: Beispiel: Reisen' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^vokabeln-beispiel-reisen-\d{4}-\d{2}-\d{2}\.json$/);
  const text = readFileSync(await file.path(), 'utf8');
  const exported = JSON.parse(text);
  expect(exported.format).toBe('lernpfade-vokabeln');
  expect(exported.schemaVersion).toBe(1);
  expect(exported.progressIncluded).toBe(false);
  expect(exported.hinweis).toContain('keinen Lernfortschritt');
  expect(exported.decks[0].origin).toEqual({ kind: 'import', label: 'Lernpfade-Beispieldatei' });
  expect(exported.decks[0].cards[0]).toEqual({
    id: 'beispiel-reisen-luggage',
    term: 'luggage',
    translation: 'Gepäck',
    context: 'Our luggage arrived one day late.',
    tags: ['reisen'],
  });
  expect(text).not.toMatch(/dueAt|intervalDays|repetitions|"ease"|reviews|activity/);
  await expect(successNotice(page)).toHaveText('„Beispiel: Reisen" exportiert – ohne Lernfortschritt.');
});
