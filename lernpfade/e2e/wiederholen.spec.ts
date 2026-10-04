import { expect, test } from '@playwright/test';
import { MOCK_SOURCE_ORIGINS } from './config';
import {
  DEMO_KEY,
  expectNoSeriousA11yViolations,
  mockLiveSources,
  readVocabStorage,
  recordRequests,
  writeVocabRaw,
} from './helpers';

/**
 * LP-05B-Regression im Hub. Die Live-Quellen sind hier MOCKS (`page.route`);
 * geprüft wird nur das Verhalten des Hubs: LIVE-, „nicht angemeldet"- und
 * Ausfallzustand bleiben ehrlich, das Demo-Deck bleibt markiert, und
 * VokabelPfad-Daten gelangen nie zu einer Quelle.
 */

const OWN_VOCAB = JSON.stringify({
  version: 1,
  revision: 1,
  decks: [
    {
      id: 'eigenes-deck',
      name: 'Eigenes Deck',
      description: '',
      sourceLanguage: 'en',
      targetLanguage: 'de',
      origin: { kind: 'self' },
      createdAt: '2026-10-01T08:00:00.000Z',
    },
  ],
  cards: [
    {
      id: 'eigene-karte',
      deckId: 'eigenes-deck',
      term: 'GEHEIMBEGRIFF',
      translation: 'GEHEIMÜBERSETZUNG',
      context: '',
      tags: [],
      createdAt: '2026-10-01T08:00:00.000Z',
    },
  ],
  reviews: [],
  activity: null,
});

test('LIVE (Mock), nicht angemeldet (Mock) und Demo bleiben getrennt; keine Vokabeldaten an Quellen', async ({ page }) => {
  await page.goto('/');
  await writeVocabRaw(page, OWN_VOCAB);
  const seen = recordRequests(page);
  await mockLiveSources(page, { python: 'unauthenticated', sql: 'ok', ai: 'ok' });

  await page.goto('/wiederholen');
  await expect(page.getByText('LIVE · SQL')).toBeVisible();
  await expect(page.getByText('LIVE · AI')).toBeVisible();
  await expect(page.getByText('MOCK: Erkläre LEFT JOIN.')).toBeVisible();
  await expect(page.getByText('In PythonPfad bist du nicht angemeldet.')).toBeVisible();
  await expect(page.getByText('DEMO · Beispiel', { exact: true })).toBeVisible();
  await expect(page.locator('.live-review').getByRole('button', { name: /Nochmal|Schwer|Gut|Leicht/ })).toHaveCount(0);

  // Weg zum VokabelPfad, klar von LIVE und DEMO getrennt.
  const pointer = page.getByRole('region', { name: 'VokabelPfad: deine eigenen Decks' });
  await expect(pointer).toContainText('getrennt von den Live-Quellen und vom Demo-Deck');
  await expect(page.getByText('GEHEIMBEGRIFF')).toHaveCount(0);
  await expectNoSeriousA11yViolations(page, '/wiederholen');

  // Demo bewerten: ändert nur den Demo-Schlüssel, nie VokabelPfad-Daten.
  await page.getByRole('button', { name: 'Antwort zeigen' }).click();
  await page.getByRole('button', { name: 'Gut' }).click();
  expect(await readVocabStorage(page)).toBe(OWN_VOCAB);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DEMO_KEY)).not.toBeNull();

  const toSources = seen.filter((request) => Object.values(MOCK_SOURCE_ORIGINS).some((origin) => request.url.startsWith(origin)));
  expect(toSources.length).toBe(3);
  for (const request of toSources) {
    expect(request.method).toBe('GET');
    expect(request.url).toMatch(/\/api\/platform\/review-source\?limit=10$/);
    expect(request.body).toBeNull();
  }
  for (const request of seen) {
    expect(request.url).not.toContain('GEHEIM');
    expect(request.body ?? '').not.toContain('GEHEIM');
  }

  await pointer.getByRole('link', { name: 'Zum VokabelPfad' }).click();
  await expect(page).toHaveURL(/\/vokabeln$/);
  await expect(page.locator('.vocab-deck').filter({ hasText: 'Eigenes Deck' })).toBeVisible();
});

test('Ausfall aller Quellen (Mock) bleibt sichtbar und nicht fatal', async ({ page }) => {
  await mockLiveSources(page, { python: 'down', sql: 'down', ai: 'down' });
  await page.goto('/wiederholen');
  await expect(page.getByText('Python derzeit nicht verfügbar.')).toBeVisible();
  await expect(page.getByText('SQL derzeit nicht verfügbar.')).toBeVisible();
  await expect(page.getByText('AI derzeit nicht verfügbar.')).toBeVisible();
  await expect(page.locator('.live-card')).toHaveCount(0);
  await expect(page.getByText('DEMO · Beispiel', { exact: true })).toBeVisible();
});

test('Hub: VokabelPfad ist als lokaler MVP verlinkt, ohne Audio-Versprechen', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.path-card').filter({ hasText: 'VokabelPfad' });
  await expect(card).toContainText('Lokaler MVP');
  await expect(card).toHaveAttribute('href', '/vokabeln');
  await expect(card).not.toContainText(/Aussprache|Audio/);
  await expect(page.getByRole('link', { name: /VokabelPfad öffnen/ })).toHaveAttribute('href', '/vokabeln');
  await expectNoSeriousA11yViolations(page, 'Hub-Startseite');
});
