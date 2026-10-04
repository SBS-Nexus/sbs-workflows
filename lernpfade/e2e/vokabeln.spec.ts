import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  DEMO_KEY,
  VOCAB_KEY,
  addCard,
  backToOverview,
  createDeck,
  expectNoOutgoingContent,
  expectNoSeriousA11yViolations,
  gotoVocab,
  readVocabStorage,
  recordRequests,
  stat,
  successNotice,
  type CardSpec,
} from './helpers';

const CARDS: CardSpec[] = [
  { term: 'lighthouse', translation: 'Leuchtturm', context: 'The lighthouse guides ships at night.', tags: 'küste, nomen' },
  { term: 'to wander', translation: 'wandern · umherstreifen', tags: 'verb' },
  { term: 'breeze', translation: 'Brise', context: 'A cool breeze came from the sea.' },
];

const SECRETS = ['lighthouse', 'Leuchtturm', 'umherstreifen', 'breeze'];

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync('test-results/screenshots', { recursive: true });
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.screenshot({ path: `test-results/screenshots/desktop-${name}.png`, fullPage: true });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
});

test('vom Hub: eigenes Deck mit drei Karten anlegen und beide Richtungen vollständig lernen', async ({ page }) => {
  const seen = recordRequests(page);

  // Einstieg vom Hub über die Navigation.
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('link', { name: 'Vokabeln' }).click();
  await expect(page).toHaveURL(/\/vokabeln$/);
  await expect(page.getByText('Nur in diesem Browser gespeichert.')).toBeVisible();
  await expect(page.getByText('Noch keine Decks.')).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'leere Übersicht');

  await createDeck(page, 'Mein Englisch');
  for (const card of CARDS) await addCard(page, card);
  await expect(page.locator('.vocab-card-item')).toHaveCount(3);
  await expectNoSeriousA11yViolations(page, 'Deckansicht');
  await shot(page, 'deck');

  await backToOverview(page);
  await expect(stat(page, 'Karten')).toHaveText('3');
  await expect(stat(page, 'Abfragen')).toHaveText('6');
  await expect(stat(page, 'Fällig Englisch → Deutsch')).toHaveText('3');
  await expect(stat(page, 'Fällig Deutsch → Englisch')).toHaveText('3');
  await expect(stat(page, 'Heute bewertet')).toHaveText('0');

  await page.getByLabel('Beide Richtungen').check();
  await page.getByRole('button', { name: 'Session starten' }).click();

  const seenPrompts: string[] = [];
  for (let i = 1; i <= 6; i += 1) {
    await expect(page.getByRole('heading', { level: 1, name: `Abfrage ${i} von 6` })).toBeVisible();
    const prompt = (await page.locator('.review-prompt').textContent())?.trim() ?? '';
    seenPrompts.push(prompt);

    // Vor dem Aufdecken: keine Antwort, kein Satzkontext, keine Bewertung.
    await expect(page.locator('.review-answer')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Wie gut wusstest du die Antwort?' })).toHaveCount(0);
    for (const card of CARDS) {
      if (card.context) await expect(page.getByText(card.context)).toHaveCount(0);
    }

    await page.getByRole('button', { name: 'Antwort zeigen' }).click();
    await expect(page.locator('.review-answer')).toBeVisible();
    if (i === 1) {
      await expectNoSeriousA11yViolations(page, 'Session nach dem Aufdecken');
      await shot(page, 'session');
    }

    const rating = page.getByRole('button', { name: /^Gut/ });
    if (i === 2) {
      // Doppelklick darf weder doppelt planen noch eine Abfrage überspringen.
      await rating.dblclick();
    } else {
      await rating.click();
    }
  }

  await expect(page.getByRole('heading', { level: 1, name: 'Session abgeschlossen' })).toBeVisible();
  await expect(page.getByText('Alle 6 Abfragen dieser Session bewertet und gespeichert.')).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'Session abgeschlossen');
  await expect(page.getByText(/^Nächste Fälligkeit: /)).toBeVisible();

  const expectedPrompts = CARDS.flatMap((card) => [card.term, card.translation]).sort();
  expect([...seenPrompts].sort(), 'jede Abfrage genau einmal').toEqual(expectedPrompts);

  await page.getByRole('button', { name: 'Zur Übersicht' }).click();
  await expect(stat(page, 'Heute bewertet')).toHaveText('6');
  await expect(stat(page, 'Fällig Englisch → Deutsch')).toHaveText('0');
  await expect(page.getByText(/^Nichts fällig\. Nächste Fälligkeit: /)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Session starten' })).toBeDisabled();
  await expectNoSeriousA11yViolations(page, 'Übersicht nichts fällig');
  await shot(page, 'uebersicht');

  // Ausdrücklich geprüfter Persistenzfall: Reload zeigt denselben gespeicherten Stand.
  const stored = await readVocabStorage(page);
  await page.reload();
  await expect(stat(page, 'Karten')).toHaveText('3');
  await expect(stat(page, 'Heute bewertet')).toHaveText('6');
  await expect(stat(page, 'Fällig Deutsch → Englisch')).toHaveText('0');
  await expect(page.getByText(/^Nichts fällig\. Nächste Fälligkeit: /)).toBeVisible();
  expect(await readVocabStorage(page)).toBe(stored);
  const parsed = JSON.parse(stored ?? '{}') as { reviews: unknown[]; activity: { ratings: { count: number }[] } };
  expect(parsed.reviews).toHaveLength(6);
  expect(parsed.activity.ratings.reduce((sum, entry) => sum + entry.count, 0)).toBe(6);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DEMO_KEY)).toBeNull();

  expectNoOutgoingContent(seen, SECRETS);
});

test('nur eine Richtung: die andere bleibt fällig', async ({ page }) => {
  await gotoVocab(page);
  await createDeck(page, 'Richtungen');
  await addCard(page, { term: 'harbour', translation: 'Hafen' });
  await backToOverview(page);

  await page.getByLabel('Englisch → Deutsch', { exact: true }).check();
  await page.getByRole('button', { name: 'Session starten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Abfrage 1 von 1' })).toBeVisible();
  await expect(page.locator('.review-prompt')).toHaveText('harbour');
  await page.getByRole('button', { name: 'Antwort zeigen' }).click();
  await page.getByRole('button', { name: /^Nochmal/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Session abgeschlossen' })).toBeVisible();
  await page.getByRole('button', { name: 'Zur Übersicht' }).click();

  await expect(stat(page, 'Fällig Englisch → Deutsch')).toHaveText('0');
  await expect(stat(page, 'Fällig Deutsch → Englisch')).toHaveText('1');
});

test('Karte bearbeiten und löschen – andere Decks und das Demo-Deck bleiben unverändert', async ({ page }) => {
  await gotoVocab(page);
  await page.evaluate((key) => window.localStorage.setItem(key, '{"language-en-retrieval":{"marker":"demo"}}'), DEMO_KEY);

  await page.getByRole('button', { name: 'Als eigenes Deck übernehmen: Englisch: Alltag & Arbeit' }).click();
  await expect(successNotice(page)).toContainText('Starterdeck „Englisch: Alltag & Arbeit" übernommen.');
  await expect(page.getByRole('button', { name: 'Bereits übernommen: Englisch: Alltag & Arbeit' })).toBeDisabled();

  await createDeck(page, 'Bearbeiten');
  await addCard(page, { term: 'kettle', translation: 'Wasserkocher', tags: 'küche' });
  await addCard(page, { term: 'spoon', translation: 'Löffel' });
  await backToOverview(page);

  // Fortschritt für das Deck „Bearbeiten" in Richtung EN → DE erzeugen.
  await page.getByRole('checkbox', { name: 'Englisch: Alltag & Arbeit' }).uncheck();
  await page.getByLabel('Englisch → Deutsch', { exact: true }).check();
  await page.getByRole('button', { name: 'Session starten' }).click();
  for (let i = 0; i < 2; i += 1) {
    await page.getByRole('button', { name: 'Antwort zeigen' }).click();
    await page.getByRole('button', { name: /^Gut/ }).click();
  }
  await page.getByRole('button', { name: 'Zur Übersicht' }).click();
  const starterBefore = JSON.parse((await readVocabStorage(page)) ?? '{}').cards.filter(
    (card: { deckId: string }) => card.deckId === 'starter-en-alltag',
  );

  await page.getByRole('button', { name: 'Öffnen: Bearbeiten' }).click();

  // Nur Tags ändern: kein Rückfragedialog, Fortschritt bleibt.
  await page.getByRole('button', { name: 'Bearbeiten: kettle' }).click();
  await page.getByRole('form', { name: 'Karte „kettle" bearbeiten' }).getByLabel('Tags (optional)').fill('küche, gerät');
  await page.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(successNotice(page)).toHaveText('Karte gespeichert.');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Übersetzung ändern: transparente Bestätigung, danach beide Richtungen neu.
  await page.getByRole('button', { name: 'Bearbeiten: kettle' }).click();
  await page.getByRole('form', { name: 'Karte „kettle" bearbeiten' }).getByLabel('Übersetzung (Deutsch)').fill('Teekessel');
  await page.getByRole('button', { name: 'Änderungen speichern' }).click();
  const dialog = page.getByRole('dialog', { name: 'Lernfortschritt dieser Karte neu starten?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Beide Richtungen dieser Karte werden wieder als neu und fällig geführt.');
  await expectNoSeriousA11yViolations(page, 'Bestätigungsdialog');
  await dialog.getByRole('button', { name: 'Speichern und neu starten' }).click();
  await expect(successNotice(page)).toHaveText('Karte gespeichert. Der Lernfortschritt beider Richtungen beginnt neu.');
  await expect(page.getByText('3 Abfragen fällig', { exact: false })).toBeVisible();

  // Karte löschen: Dialog nennt Karte und Fortschritt.
  await page.getByRole('button', { name: 'Löschen: spoon' }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Karte löschen?' });
  await expect(deleteDialog).toContainText('„spoon" → „Löffel"');
  await expect(deleteDialog).toContainText('Lernfortschritt von 1 Abfrage');
  await deleteDialog.getByRole('button', { name: 'Karte löschen' }).click();
  await expect(page.locator('.vocab-card-item')).toHaveCount(1);

  // Deck löschen: Dialog nennt Umfang; danach bleibt nur das Starterdeck.
  await page.getByRole('button', { name: 'Deck „Bearbeiten" löschen …' }).click();
  const deckDialog = page.getByRole('dialog', { name: 'Deck „Bearbeiten" löschen?' });
  await expect(deckDialog).toContainText('1 Karte');
  await deckDialog.getByRole('button', { name: 'Deck endgültig löschen' }).click();
  await expect(successNotice(page)).toHaveText('Deck „Bearbeiten" wurde gelöscht.');

  const after = JSON.parse((await readVocabStorage(page)) ?? '{}');
  expect(after.decks.map((deck: { id: string }) => deck.id)).toEqual(['starter-en-alltag']);
  expect(after.cards).toEqual(starterBefore);
  expect(after.reviews).toEqual([]);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DEMO_KEY)).toBe(
    '{"language-en-retrieval":{"marker":"demo"}}',
  );
});

test('Fehler erscheinen am richtigen Feld', async ({ page }) => {
  await gotoVocab(page);
  await page.getByRole('form', { name: 'Neues Deck anlegen' }).getByRole('button', { name: 'Deck anlegen' }).click();
  const name = page.getByRole('form', { name: 'Neues Deck anlegen' }).getByLabel('Name des Decks');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toBeFocused();
  await expect(page.getByText('Deckname darf nicht leer sein.')).toBeVisible();

  await createDeck(page, 'Felder');
  const form = page.getByRole('form', { name: 'Neue Karte' });
  await form.getByLabel('Begriff (Englisch)').fill('x'.repeat(201));
  await form.getByLabel('Übersetzung (Deutsch)').fill('zu lang');
  await form.getByRole('button', { name: 'Karte hinzufügen' }).click();
  await expect(form.getByLabel('Begriff (Englisch)')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByText('Begriff darf höchstens 200 Zeichen lang sein.')).toBeVisible();
  await expect(page.locator('.vocab-card-item')).toHaveCount(0);
});

test('vollständig per Tastatur: Deck, Karte und Session', async ({ page }) => {
  await gotoVocab(page);
  const deckName = page.getByRole('form', { name: 'Neues Deck anlegen' }).getByLabel('Name des Decks');
  await deckName.focus();
  await page.keyboard.type('Tastatur');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Tastatur' })).toBeFocused();

  const term = page.getByRole('form', { name: 'Neue Karte' }).getByLabel('Begriff (Englisch)');
  await term.focus();
  await page.keyboard.type('island');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Insel');
  await page.keyboard.press('Enter');
  await expect(successNotice(page)).toContainText('Karte „island" angelegt.');

  await page.getByRole('button', { name: '← Alle Decks' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Session starten' }).focus();
  await page.keyboard.press('Enter');

  for (let i = 0; i < 2; i += 1) {
    await expect(page.getByRole('button', { name: 'Antwort zeigen' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.review-answer')).toBeFocused();
    // Tab führt zur ersten Bewertung; weiter zu „Gut".
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /^Gut/ })).toBeFocused();
    await page.keyboard.press('Space');
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Session abgeschlossen' })).toBeFocused();
});

test('Speicher voll: Änderung wird nicht als gespeichert gemeldet, Daten bleiben', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if ((window as unknown as { __quotaFull?: boolean }).__quotaFull) {
        throw new DOMException('quota', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
  await gotoVocab(page);
  await createDeck(page, 'Vorhanden');
  await backToOverview(page);
  const before = await readVocabStorage(page);

  await page.evaluate(() => {
    (window as unknown as { __quotaFull?: boolean }).__quotaFull = true;
  });
  const form = page.getByRole('form', { name: 'Neues Deck anlegen' });
  await form.getByLabel('Name des Decks').fill('Passt nicht mehr');
  await form.getByRole('button', { name: 'Deck anlegen' }).click();
  await expect(page.locator('.vocab-notice-error')).toContainText('Der Browserspeicher ist voll');
  await expect(page.getByRole('heading', { level: 3, name: 'Passt nicht mehr' })).toHaveCount(0);
  expect(await readVocabStorage(page)).toBe(before);
});

test('Konfliktsperre: ein zweiter Tab überschreibt nichts still', async ({ page, context }) => {
  await gotoVocab(page);
  await createDeck(page, 'Tab A');
  await backToOverview(page);

  const other = await context.newPage();
  await gotoVocab(other);
  await createDeck(other, 'Tab B');
  const fromB = await readVocabStorage(other);

  await expect(page.getByRole('alert').filter({ hasText: 'In einem anderen Tab wurde VokabelPfad geändert.' })).toBeVisible();
  const form = page.getByRole('form', { name: 'Neues Deck anlegen' });
  await expect(form.getByRole('button', { name: 'Deck anlegen' })).toBeDisabled();
  expect(await readVocabStorage(page)).toBe(fromB);

  await page.getByRole('button', { name: 'Aktuellen Stand laden' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Tab B' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Tab A' })).toBeVisible();
  await other.close();
});

test('beschädigte und künftige Daten werden nicht überschrieben', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => window.localStorage.setItem(key, '{"version":1,"decks":"kaputt"'), VOCAB_KEY);
  await page.goto('/vokabeln');
  await expect(page.getByRole('heading', { name: 'Gespeicherte Daten sind beschädigt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rohdaten sichern' })).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'Fehlerzustand');
  expect(await readVocabStorage(page)).toBe('{"version":1,"decks":"kaputt"');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Rohdaten sichern' }).click();
  expect((await download).suggestedFilename()).toBe('vokabelpfad-rohdaten-sicherung.json');

  // Zurücksetzen nur nach ausdrücklicher Bestätigung und nur für VokabelPfad.
  await page.evaluate((key) => window.localStorage.setItem(key, 'demo-bleibt'), 'lernpfade-review-state-v1');
  await page.getByRole('button', { name: 'VokabelPfad zurücksetzen …' }).click();
  const dialog = page.getByRole('dialog', { name: 'VokabelPfad zurücksetzen?' });
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  expect(await readVocabStorage(page)).toBe('{"version":1,"decks":"kaputt"');
  await page.getByRole('button', { name: 'VokabelPfad zurücksetzen …' }).click();
  await dialog.getByRole('button', { name: 'Endgültig zurücksetzen' }).click();
  await expect(page.getByText('Noch keine Decks.')).toBeVisible();
  expect(await readVocabStorage(page)).toBeNull();
  expect(await page.evaluate(() => window.localStorage.getItem('lernpfade-review-state-v1'))).toBe('demo-bleibt');

  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({ version: 7, revision: 1 })), VOCAB_KEY);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Daten einer neueren Version' })).toBeVisible();
  expect(await readVocabStorage(page)).toBe(JSON.stringify({ version: 7, revision: 1 }));
});
