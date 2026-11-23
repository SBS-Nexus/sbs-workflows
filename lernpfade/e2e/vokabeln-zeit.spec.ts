import { expect, test, type Page } from '@playwright/test';
import { addCard, backToOverview, createDeck, gotoVocab, readVocabStorage, stat } from './helpers';

/**
 * Work-Review W2: Fälligkeiten, „Heute bewertet" und der Startknopf folgen der
 * Uhr, ohne Reload und ohne dass die lernende Person etwas umstellt. Die Uhr
 * steuert Playwright Clock; Zeitzone Europe/Berlin (siehe Konfiguration).
 */

const START = '2026-10-04T21:59:00.000Z'; // 23:59 in Berlin
/** Nach der Fälligkeit (Bewertung „Gut" + 1 Tag) und schon am übernächsten Kalendertag (00:00:30 Berlin). */
const AFTER = Date.parse('2026-10-05T22:00:30.000Z');

async function learnOneCardBothDirections(page: Page): Promise<void> {
  await page.clock.install({ time: START });
  await gotoVocab(page);
  await createDeck(page, 'Tageswechsel');
  await addCard(page, { term: 'tomorrow', translation: 'morgen' });
  await backToOverview(page);
  await page.getByLabel('Beide Richtungen').check();
  await page.getByRole('button', { name: 'Session starten' }).click();
  for (let i = 1; i <= 2; i += 1) {
    await expect(page.getByRole('heading', { level: 1, name: `Abfrage ${i} von 2` })).toBeVisible();
    await page.getByRole('button', { name: 'Antwort zeigen' }).click();
    await page.getByRole('button', { name: /^Gut/ }).click();
  }
  await page.getByRole('button', { name: 'Zur Übersicht' }).click();

  await expect(stat(page, 'Heute bewertet')).toHaveText('2');
  await expect(stat(page, 'Fällig Englisch → Deutsch')).toHaveText('0');
  await expect(stat(page, 'Fällig Deutsch → Englisch')).toHaveText('0');
  await expect(page.getByText(/^Nichts fällig\. Nächste Fälligkeit: /)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Session starten' })).toBeDisabled();
}

async function expectDueAgain(page: Page): Promise<void> {
  await expect(stat(page, 'Heute bewertet')).toHaveText('0');
  await expect(stat(page, 'Fällig Englisch → Deutsch')).toHaveText('1');
  await expect(stat(page, 'Fällig Deutsch → Englisch')).toHaveText('1');
  await expect(page.getByText(/^Nichts fällig/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Session starten' })).toBeEnabled();
}

async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

test('offene Übersicht: Tageswechsel und Fälligkeit aktualisieren Statistik und Startknopf ohne Reload', async ({ page }) => {
  await learnOneCardBothDirections(page);
  const stored = await readVocabStorage(page);

  // Die Uhr läuft weiter; keine Eingabe, kein Reload, kein Filterwechsel.
  await page.clock.fastForward(AFTER - (await page.evaluate(() => Date.now())));
  await expectDueAgain(page);
  expect(await readVocabStorage(page), 'die Zeitaktualisierung schreibt nichts').toBe(stored);

  // Direkt startbar, und eine laufende Session behält ihre Warteschlange, auch wenn die Zeit weiterläuft.
  await page.getByRole('button', { name: 'Session starten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Abfrage 1 von 2' })).toBeVisible();
  await page.clock.fastForward('48:00:00');
  await expect(page.getByRole('heading', { level: 1, name: 'Abfrage 1 von 2' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Antwort zeigen' })).toBeVisible();
  expect(await readVocabStorage(page)).toBe(stored);
});

test('Rückkehr in einen inaktiven Tab aktualisiert sofort, auch ohne ausgelösten Timer', async ({ page }) => {
  await learnOneCardBothDirections(page);
  const stored = await readVocabStorage(page);

  // Tab im Hintergrund; die Systemzeit springt, ohne dass ein Timer läuft (wie bei Ruhezustand/Drosselung).
  await setVisibility(page, 'hidden');
  await page.clock.setSystemTime(AFTER);
  await expect(stat(page, 'Heute bewertet'), 'ohne Timer noch der alte Stand').toHaveText('2');

  await setVisibility(page, 'visible');
  await expectDueAgain(page);
  expect(await readVocabStorage(page)).toBe(stored);

  await page.getByRole('button', { name: 'Session starten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Abfrage 1 von 2' })).toBeVisible();
});
