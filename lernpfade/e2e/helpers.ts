import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, type Request } from '@playwright/test';
import { HUB_ORIGIN, MOCK_SOURCE_ORIGINS } from './config';

export const VOCAB_KEY = 'lernpfade-vokabeln-v1';
export const DEMO_KEY = 'lernpfade-review-state-v1';
export const EXAMPLE_FILE = 'public/vokabeln/beispiel-import.json';

export type SeenRequest = { method: string; url: string; body: string | null };

/** Zeichnet alle Anfragen der Seite auf (inkl. Inhalte), um ausgehende Daten zu prüfen. */
export function recordRequests(page: Page): SeenRequest[] {
  const seen: SeenRequest[] = [];
  page.on('request', (request: Request) => {
    seen.push({ method: request.method(), url: request.url(), body: request.postData() });
  });
  return seen;
}

/** Keine Anfrage verlässt den Hub, und keine trägt die genannten Inhalte. */
export function expectNoOutgoingContent(seen: readonly SeenRequest[], secrets: readonly string[]): void {
  const foreign = seen.filter((request) => !request.url.startsWith(HUB_ORIGIN) && !request.url.startsWith('blob:') && !request.url.startsWith('data:'));
  expect(foreign, 'keine Anfragen außerhalb des Hubs').toEqual([]);
  for (const request of seen) {
    for (const secret of secrets) {
      expect(decodeURIComponent(request.url), `Inhalt „${secret}" nicht in URL`).not.toContain(secret);
      expect(request.body ?? '', `Inhalt „${secret}" nicht im Body`).not.toContain(secret);
    }
  }
  const writes = seen.filter((request) => request.method !== 'GET' && request.method !== 'HEAD');
  expect(writes, 'keine schreibenden Anfragen').toEqual([]);
}

export async function expectNoSeriousA11yViolations(page: Page, label: string): Promise<void> {
  const result = await new AxeBuilder({ page }).analyze();
  const serious = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(
    serious.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`),
    `axe (${label})`,
  ).toEqual([]);
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

export async function readVocabStorage(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), VOCAB_KEY);
}

export async function gotoVocab(page: Page): Promise<void> {
  await page.goto('/vokabeln');
  await expect(page.getByRole('heading', { level: 1, name: /Vokabeln lernen/ })).toBeVisible();
}

export async function createDeck(page: Page, name: string): Promise<void> {
  const form = page.getByRole('form', { name: 'Neues Deck anlegen' });
  await form.getByLabel('Name des Decks').fill(name);
  await form.getByRole('button', { name: 'Deck anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

export type CardSpec = { term: string; translation: string; context?: string; tags?: string };

export async function addCard(page: Page, card: CardSpec): Promise<void> {
  const form = page.getByRole('form', { name: 'Neue Karte' });
  await form.getByLabel('Begriff (Englisch)').fill(card.term);
  await form.getByLabel('Übersetzung (Deutsch)').fill(card.translation);
  await form.getByLabel('Satzkontext (optional, Englisch)').fill(card.context ?? '');
  await form.getByLabel('Tags (optional)').fill(card.tags ?? '');
  await form.getByRole('button', { name: 'Karte hinzufügen' }).click();
  await expect(successNotice(page)).toContainText(`Karte „${card.term}" angelegt.`);
}

export function successNotice(page: Page): Locator {
  return page.locator('.vocab-notice-success');
}

export function errorNotice(page: Page): Locator {
  return page.locator('.vocab-notice-error');
}

export function stat(page: Page, label: string): Locator {
  return page.locator('.vocab-stats div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd');
}

export async function backToOverview(page: Page): Promise<void> {
  await page.getByRole('button', { name: '← Alle Decks' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Vokabeln lernen/ })).toBeVisible();
}

/** Beantwortet die LP-05B-Quellen als MOCK. Es läuft keine echte App. */
export async function mockLiveSources(
  page: Page,
  behaviour: Record<keyof typeof MOCK_SOURCE_ORIGINS, 'ok' | 'unauthenticated' | 'down'>,
): Promise<void> {
  const now = new Date();
  const due = new Date(now.getTime() - 2 * 86_400_000).toISOString();
  const bodies = {
    python: { kind: 'exercise', id: 'mock-python-exercise', title: 'MOCK Python', prompt: 'MOCK: Was macht len()?', answer: 'MOCK: Länge' },
    sql: { kind: 'concept', id: 'mock-sql-concept', title: 'MOCK LEFT JOIN', prompt: 'MOCK: Erkläre LEFT JOIN.', answer: 'MOCK: linke Zeilen bleiben' },
    ai: { kind: 'exercise', id: 'mock-ai-exercise', title: 'MOCK Tokens', prompt: 'MOCK: Was ist ein Token?', answer: 'MOCK: Texteinheit' },
  } as const;

  for (const source of ['python', 'sql', 'ai'] as const) {
    await page.route(`${MOCK_SOURCE_ORIGINS[source]}/**`, async (route) => {
      const headers = {
        'access-control-allow-origin': HUB_ORIGIN,
        'access-control-allow-credentials': 'true',
        'cache-control': 'private, no-store, max-age=0',
        'content-type': 'application/json; charset=utf-8',
      };
      const mode = behaviour[source];
      if (mode === 'down') {
        await route.fulfill({ status: 503, headers, body: JSON.stringify({ error: 'unavailable' }) });
        return;
      }
      if (mode === 'unauthenticated') {
        await route.fulfill({ status: 401, headers, body: JSON.stringify({ error: 'unauthenticated' }) });
        return;
      }
      const item = bodies[source];
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          schemaVersion: 1,
          source,
          generatedAt: now.toISOString(),
          truncated: false,
          nextDueAt: null,
          items: [
            {
              source,
              sourceKind: item.kind,
              sourceItemId: item.id,
              conceptIds: [item.kind === 'concept' ? item.id : 'mock-concept'],
              title: item.title,
              prompt: item.prompt,
              answer: item.answer,
              dueAt: due,
              repetition: 1,
              ...(item.kind === 'concept'
                ? { practice: { exerciseSlug: 'mock-exercise', exerciseTitle: 'MOCK Übung' } }
                : {}),
            },
          ],
        }),
      });
    });
  }
}
