import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { HUB_ORIGIN } from './config';
import { errorNotice, gotoVocab, readVocabStorage, successNotice, writeVocabRaw } from './helpers';

/**
 * Work-Review W1: Jede Exportdatei muss sich in einem frischen Browser wieder
 * importieren lassen (Importgrenze 2 MiB, gemessen in UTF-8-Bytes der
 * heruntergeladenen Datei). Was nicht hineinpasst, wird nicht als Erfolg
 * gemeldet und nicht gekürzt.
 */

const LIMIT = 2 * 1024 * 1024;
const NOTICE =
  'Enthält nur Decks und Karten, keinen Lernfortschritt. Wiederholungsstände bleiben in dem Browser, in dem sie entstanden sind.';

type FileCard = { id: string; term: string; translation: string; context?: string; tags: string[] };

function exchangeFile(decks: { id: string; name: string; cards: FileCard[] }[], withMeta = true): Record<string, unknown> {
  return {
    format: 'lernpfade-vokabeln',
    schemaVersion: 1,
    ...(withMeta ? { exportedAt: '2026-10-04T12:00:00.000Z' } : {}),
    progressIncluded: false,
    ...(withMeta ? { hinweis: NOTICE } : {}),
    decks: decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      sourceLanguage: 'en',
      targetLanguage: 'de',
      origin: { kind: 'self', label: 'Selbst erstellt' },
      cards: deck.cards,
    })),
  };
}

/** Viele Mehrbyte-Zeichen: 4-Byte-Emoji, 3-Byte-€, 2-Byte-ä. */
function heavyCard(id: string): FileCard {
  return {
    id,
    term: '😀'.repeat(200),
    translation: 'ä'.repeat(200),
    context: '𝄞'.repeat(500),
    tags: Array.from({ length: 10 }, (_, i) => `${i}${'€'.repeat(31)}`),
  };
}

async function importText(page: Page, name: string, text: string, expected: string): Promise<void> {
  await page.getByLabel('Datei auswählen').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('button', { name: 'Import übernehmen' }).click();
  await expect(successNotice(page)).toHaveText(expected);
}

test('Roundtrip nahe der Grenze: Import → UI-Export → Import in einem frischen Browser, Inhalt und IDs vollständig', async ({
  page,
  browser,
}) => {
  const tags = Array.from({ length: 10 }, (_, i) => `${i}${'ä'.repeat(31)}`);
  const cards: FileCard[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `bulk-c${i + 1}`,
    term: 'é'.repeat(200),
    translation: 'ä'.repeat(200),
    context: 'a'.repeat(500),
    tags,
  }));
  const input = JSON.stringify(exchangeFile([{ id: 'bulk', name: 'Deck bulk', cards }]));
  expect(Buffer.byteLength(input)).toBe(2_028_295);

  await gotoVocab(page);
  await importText(page, 'bulk.json', input, '1 Deck mit 1000 Karten importiert.');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportieren: Deck bulk' }).click();
  const file = await download;
  await expect(successNotice(page)).toHaveText('„Deck bulk" exportiert – ohne Lernfortschritt.');
  const exported = readFileSync(await file.path());
  expect(exported.length, 'heruntergeladene Datei innerhalb der Importgrenze').toBeLessThanOrEqual(LIMIT);

  // Frischer Browserkontext: keine Daten, gleiche Seite.
  const fresh = await browser.newContext({ baseURL: HUB_ORIGIN, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  const other = await fresh.newPage();
  await gotoVocab(other);
  await other.getByLabel('Datei auswählen').setInputFiles({
    name: file.suggestedFilename(),
    mimeType: 'application/json',
    buffer: exported,
  });
  await expect(other.getByRole('region', { name: 'Importvorschau' })).toContainText('1000');
  await other.getByRole('button', { name: 'Import übernehmen' }).click();
  await expect(successNotice(other)).toHaveText('1 Deck mit 1000 Karten importiert.');

  const stored = JSON.parse((await readVocabStorage(other)) ?? '{}') as { cards: (FileCard & { deckId: string })[] };
  expect(stored.cards.map(({ id, term, translation, context, tags: cardTags }) => ({ id, term, translation, context, tags: cardTags }))).toEqual(
    cards,
  );
  await fresh.close();
});

test('alle Decks zusammen zu groß: kein Download, keine Erfolgsmeldung; jedes Deck einzeln bleibt exportierbar', async ({
  page,
}) => {
  await gotoVocab(page);
  for (const deck of ['eins', 'zwei', 'drei']) {
    const cards = Array.from({ length: 200 }, (_, i) => heavyCard(`${deck}-c${i + 1}`));
    const text = JSON.stringify(exchangeFile([{ id: deck, name: `Deck ${deck}`, cards }]));
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(LIMIT);
    await importText(page, `${deck}.json`, text, '1 Deck mit 200 Karten importiert.');
  }

  let downloads = 0;
  page.on('download', () => {
    downloads += 1;
  });
  await page.getByRole('button', { name: 'Alle Decks exportieren' }).click();
  await expect(errorNotice(page)).toContainText('Nicht exportiert: Alle Decks zusammen ergäben eine Datei von');
  await expect(errorNotice(page)).toContainText('Exportiere die Decks einzeln');
  await expect(errorNotice(page)).toContainText('Deine Daten in diesem Browser bleiben unverändert.');
  await expect(successNotice(page)).toHaveCount(0);
  expect(downloads, 'keine Datei erzeugt').toBe(0);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportieren: Deck zwei' }).click();
  const single = readFileSync(await (await download).path());
  expect(single.length).toBeLessThanOrEqual(LIMIT);
  await expect(successNotice(page)).toHaveText('„Deck zwei" exportiert – ohne Lernfortschritt.');
});

test('ein Deck wächst nicht über eine Exportdatei hinaus: Karte wird mit Erklärung abgelehnt', async ({ page }) => {
  // Datei ohne Hinweis und Exportdatum knapp unter der Grenze; als Export bleibt das Deck darunter.
  const target = LIMIT - 400;
  const cards: FileCard[] = [];
  // Kompaktes JSON wächst je Karte um ihre eigene Länge plus ein Komma.
  let size = Buffer.byteLength(JSON.stringify(exchangeFile([{ id: 'fast-voll', name: 'Fast voll', cards: [] }], false)));
  const add = (next: FileCard): boolean => {
    const bytes = Buffer.byteLength(JSON.stringify(next)) + (cards.length > 0 ? 1 : 0);
    if (size + bytes > target) return false;
    cards.push(next);
    size += bytes;
    return true;
  };
  while (add(heavyCard(`fast-voll-c${cards.length + 1}`)));
  while (add({ id: `fast-voll-c${cards.length + 1}`, term: 'x', translation: 'y', tags: [] }));
  const text = JSON.stringify(exchangeFile([{ id: 'fast-voll', name: 'Fast voll', cards }], false));
  expect(Buffer.byteLength(text)).toBe(size);
  expect(size).toBeGreaterThan(target - 60);

  await gotoVocab(page);
  await importText(page, 'fast-voll.json', text, `1 Deck mit ${cards.length} Karten importiert.`);
  const before = await readVocabStorage(page);

  await page.getByRole('button', { name: 'Öffnen: Fast voll' }).click();
  const form = page.getByRole('form', { name: 'Neue Karte' });
  await form.getByLabel('Begriff (Englisch)').fill('one more');
  await form.getByLabel('Übersetzung (Deutsch)').fill('noch eine');
  await form.getByLabel('Satzkontext (optional, Englisch)').fill('a'.repeat(500));
  await form.getByRole('button', { name: 'Karte hinzufügen' }).click();
  await expect(form).toContainText('mehr als die Importgrenze von 2 MiB');
  await expect(form).toContainText('Lege für weitere Karten ein neues Deck an');
  expect(await readVocabStorage(page), 'nichts gespeichert').toBe(before);

  // Der volle Bestand lässt sich weiterhin sichern.
  await page.getByRole('button', { name: '← Alle Decks' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportieren: Fast voll' }).click();
  expect(readFileSync(await (await download).path()).length).toBeLessThanOrEqual(LIMIT);
});

// ---------------------------------------------------------------------------
// Work-Review W1-Rest: Herkunftswechsel beim Import („self" → „import", +2 Bytes).
// Ein selbst erstelltes Deck liegt als gespeicherter Bestand in IndexedDB; der
// Test rechnet die Exportgröße unabhängig nach und prüft sie am Download.
// ---------------------------------------------------------------------------

type StoredCard = FileCard & { deckId: string; context: string; createdAt: string };

/** Gespeicherter VokabelPfad-Zustand mit einem selbst erstellten Deck, dessen Export genau `exportBytes` groß ist. */
function selfDeckStore(exportBytes: number): { raw: string; name: string; cards: StoredCard[] } {
  const createdAt = '2026-10-04T08:00:00.000Z';
  const cards: StoredCard[] = [];
  const toExport = (entry: StoredCard): FileCard => ({
    id: entry.id,
    term: entry.term,
    translation: entry.translation,
    ...(entry.context ? { context: entry.context } : {}),
    tags: entry.tags,
  });
  const fileBytes = (name: string): number =>
    Buffer.byteLength(
      `${JSON.stringify({
        format: 'lernpfade-vokabeln',
        schemaVersion: 1,
        exportedAt: '2026-10-04T12:00:00.000Z',
        progressIncluded: false,
        hinweis: NOTICE,
        decks: [
          {
            id: 'grenze',
            name,
            sourceLanguage: 'en',
            targetLanguage: 'de',
            origin: { kind: 'self', label: 'Selbst erstellt' },
            cards: cards.map(toExport),
          },
        ],
      })}\n`,
    );
  // Kompaktes JSON wächst je Karte um ihre Länge plus ein Komma.
  let size = fileBytes('R');
  const add = (entry: StoredCard, room: number): boolean => {
    const bytes = Buffer.byteLength(JSON.stringify(toExport(entry))) + (cards.length > 0 ? 1 : 0);
    if (size + bytes > exportBytes - room) return false;
    cards.push(entry);
    size += bytes;
    return true;
  };
  const next = (): string => `grenze-c${cards.length + 1}`;
  while (add({ ...heavyCard(next()), deckId: 'grenze', context: '𝄞'.repeat(500), createdAt }, 60));
  while (add({ id: next(), deckId: 'grenze', term: 'x', translation: 'y', context: '', tags: [], createdAt }, 0));
  const name = `R${'a'.repeat(exportBytes - size)}`;
  expect(name.length).toBeLessThanOrEqual(80);
  expect(fileBytes(name)).toBe(exportBytes);
  const raw = JSON.stringify({
    version: 1,
    revision: 1,
    decks: [
      { id: 'grenze', name, description: '', sourceLanguage: 'en', targetLanguage: 'de', origin: { kind: 'self' }, createdAt },
    ],
    cards,
    reviews: [],
    activity: null,
  });
  return { raw, name, cards };
}

async function seed(page: Page, raw: string): Promise<void> {
  await page.goto('/');
  await writeVocabRaw(page, raw);
  await gotoVocab(page);
  await expect(page.locator('.vocab-deck')).toContainText('Selbst erstellt');
}

async function importInFreshBrowser(
  browser: import('@playwright/test').Browser,
  file: Buffer,
  cardCount: number,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ baseURL: HUB_ORIGIN, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  const fresh = await context.newPage();
  await gotoVocab(fresh);
  await importText(fresh, 'export.json', file.toString('utf8'), `1 Deck mit ${cardCount} Karten importiert.`);
  return { page: fresh, close: () => context.close() };
}

test('selbst erstelltes Deck bei 2 MiB − 2: UI-Export → Import im frischen Browser → erneuter Export genau 2 MiB → Import', async ({
  page,
  browser,
}) => {
  const LIMIT_MINUS_2 = LIMIT - 2;
  const { raw, name, cards } = selfDeckStore(LIMIT_MINUS_2);
  await seed(page, raw);

  // Jede weitere Vergrößerung lehnt schon die Änderung ab (auch +1 Byte).
  await page.getByRole('button', { name: /^Öffnen: / }).click();
  const rename = page.getByRole('form', { name: 'Deck umbenennen' });
  await rename.getByLabel('Name des Decks').fill(`${name}a`);
  await rename.getByRole('button', { name: 'Deck speichern' }).click();
  await expect(rename.getByRole('alert')).toContainText('1 Byte über der Größengrenze');
  expect(await readVocabStorage(page), 'abgelehnte Änderung speichert nichts').toBe(raw);
  await page.getByRole('button', { name: '← Alle Decks' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: `Exportieren: ${name}` }).click();
  const first = readFileSync(await (await download).path());
  await expect(successNotice(page)).toHaveText(`„${name}" exportiert – ohne Lernfortschritt.`);
  expect(first.length).toBe(LIMIT_MINUS_2);
  expect(JSON.parse(first.toString('utf8')).decks[0].origin).toEqual({ kind: 'self', label: 'Selbst erstellt' });

  // Frischer Browser: Import gelingt; die Herkunft wird „import", der erneute Export ist genau 2 MiB groß.
  const second = await importInFreshBrowser(browser, first, cards.length);
  const again = second.page.waitForEvent('download');
  await second.page.getByRole('button', { name: `Exportieren: ${name}` }).click();
  const secondFile = readFileSync(await (await again).path());
  await expect(successNotice(second.page)).toHaveText(`„${name}" exportiert – ohne Lernfortschritt.`);
  expect(secondFile.length).toBe(LIMIT);
  expect(JSON.parse(secondFile.toString('utf8')).decks[0].origin).toEqual({ kind: 'import', label: 'Selbst erstellt' });

  const third = await importInFreshBrowser(browser, secondFile, cards.length);
  const stored = JSON.parse((await readVocabStorage(third.page)) ?? '{}') as { cards: StoredCard[] };
  expect(stored.cards.map((entry) => entry.id)).toEqual(cards.map((entry) => entry.id));
  await second.close();
  await third.close();
});

test('gespeicherter Grenzbestand genau 2 MiB (Herkunft self): kein Download, klare Meldung, nach Kürzen Roundtrip', async ({
  page,
  browser,
}) => {
  const { raw, name, cards } = selfDeckStore(LIMIT);
  await seed(page, raw);

  let downloads = 0;
  page.on('download', () => {
    downloads += 1;
  });
  await page.getByRole('button', { name: `Exportieren: ${name}` }).click();
  await expect(errorNotice(page)).toContainText(`Nicht exportiert: „${name}" liegt genau an der Größengrenze.`);
  await expect(errorNotice(page)).toContainText('Der Import speichert die Herkunft als „importiert"');
  await expect(errorNotice(page)).toContainText('um mindestens 2 Byte');
  await expect(errorNotice(page)).toContainText('Deine Daten in diesem Browser bleiben unverändert.');
  await expect(successNotice(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Alle Decks exportieren' }).click();
  await expect(errorNotice(page)).toContainText('liegt genau an der Größengrenze');
  expect(downloads, 'keine Datei erzeugt').toBe(0);
  expect(await readVocabStorage(page)).toBe(raw);

  // Name um 2 Zeichen kürzen (normale Bearbeitung), dann gelingt der Roundtrip.
  const shorter = name.slice(0, -2);
  await page.getByRole('button', { name: `Öffnen: ${name}` }).click();
  const rename = page.getByRole('form', { name: 'Deck umbenennen' });
  await rename.getByLabel('Name des Decks').fill(shorter);
  await rename.getByRole('button', { name: 'Deck speichern' }).click();
  await expect(successNotice(page)).toHaveText('Deck gespeichert. Lernfortschritt bleibt unverändert.');
  await page.getByRole('button', { name: '← Alle Decks' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: `Exportieren: ${shorter}` }).click();
  const file = readFileSync(await (await download).path());
  expect(file.length).toBe(LIMIT - 2);
  const fresh = await importInFreshBrowser(browser, file, cards.length);
  await fresh.close();
});
