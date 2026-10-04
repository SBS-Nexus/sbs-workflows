import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, type Request } from '@playwright/test';
import { HUB_ORIGIN, MOCK_SOURCE_ORIGINS } from './config';

/** IndexedDB-Ort der VokabelPfad-Daten (siehe `src/domain/vocabulary/idb-backend.ts`). */
export const VOCAB_DB = { name: 'lernpfade-vokabeln', store: 'daten', key: 'zustand' } as const;
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

/**
 * Liest den gespeicherten VokabelPfad-Rohtext direkt aus IndexedDB; `null`,
 * wenn nichts gespeichert ist. Legt dabei nie eine Datenbank an.
 */
export async function readVocabStorage(page: Page): Promise<string | null> {
  return page.evaluate(
    (db) =>
      new Promise<string | null>((resolve, reject) => {
        const request = indexedDB.open(db.name);
        request.onupgradeneeded = () => request.transaction?.abort();
        request.onerror = () => {
          if (request.error?.name === 'AbortError') resolve(null);
          else reject(request.error);
        };
        request.onsuccess = () => {
          const connection = request.result;
          if (!connection.objectStoreNames.contains(db.store)) {
            connection.close();
            resolve(null);
            return;
          }
          const get = connection.transaction(db.store, 'readonly').objectStore(db.store).get(db.key);
          get.onsuccess = () => {
            connection.close();
            resolve(get.result === undefined ? null : (get.result as string));
          };
          get.onerror = () => {
            connection.close();
            reject(get.error);
          };
        };
      }),
    VOCAB_DB,
  );
}

/** Schreibt einen Rohtext (auch absichtlich kaputten) an den VokabelPfad-Speicherort. */
export async function writeVocabRaw(page: Page, raw: string): Promise<void> {
  await page.evaluate(
    ([db, value]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(db.name, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(db.store)) request.result.createObjectStore(db.store);
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const connection = request.result;
          const tx = connection.transaction(db.store, 'readwrite');
          tx.objectStore(db.store).put(value, db.key);
          tx.oncomplete = () => {
            connection.close();
            resolve();
          };
          tx.onabort = () => {
            connection.close();
            reject(tx.error);
          };
        };
      }),
    [VOCAB_DB, raw] as const,
  );
}

/** Löscht alle Browserdaten des Hubs, die diese Tests anfassen (Demo-Deck und VokabelPfad). */
export async function clearBrowserData(page: Page): Promise<void> {
  await page.evaluate(
    (name) =>
      new Promise<void>((resolve, reject) => {
        window.localStorage.clear();
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('deleteDatabase blocked'));
      }),
    VOCAB_DB.name,
  );
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

export type ProgressMockMode = 'ok' | 'empty' | 'unauthenticated' | 'down' | 'invalid' | 'hang';

/** Gültige Schema-1-Antworten je Quelle — ausdrücklich MOCKS, keine echte App. */
export const MOCK_PROGRESS = {
  python: {
    schemaVersion: 1,
    source: 'python',
    generatedAt: '2026-10-04T10:00:00.000Z',
    participation: { hasActivity: true },
    lessons: { completed: 3, total: 12 },
    reviews: { due: 4 },
    concepts: { observed: 6, ready: 2, criterion: 'prerequisite-ready' },
    activity: { lastActiveAt: '2026-10-03T18:30:00.000Z' },
    projects: { kind: 'accepted', done: 1, total: 5 },
  },
  sql: {
    schemaVersion: 1,
    source: 'sql',
    generatedAt: '2026-10-04T10:00:00.000Z',
    participation: { hasActivity: true },
    lessons: { completed: 7, total: 20 },
    reviews: { due: 2 },
    concepts: { observed: 9, ready: 5, criterion: 'all-assessable-tasks-last-passed' },
    activity: { lastActiveAt: '2026-10-02T07:05:00.000Z' },
    projects: { kind: 'submitted', done: 2, total: 4 },
  },
  ai: {
    schemaVersion: 1,
    source: 'ai',
    generatedAt: '2026-10-04T10:00:00.000Z',
    participation: { hasActivity: true },
    lessons: { completed: 1, total: 30 },
    reviews: { due: 0 },
    concepts: { observed: 2, ready: 0, criterion: 'prerequisite-ready' },
    activity: { lastActiveAt: '2026-09-28T12:00:00.000Z' },
    projects: { kind: 'unsupported' },
  },
} as const;

/**
 * Beantwortet die LP-07-Fortschrittsquellen als MOCK (`page.route`). Es läuft
 * keine echte App; geprüft wird nur das Verhalten des Hubs. Auch die Seite
 * `/fortschritt` der Quell-App wird als MOCK-Seite beantwortet, damit der
 * Link in die App navigierbar ist.
 */
export async function mockProgressSources(
  page: Page,
  behaviour: Record<keyof typeof MOCK_SOURCE_ORIGINS, ProgressMockMode>,
): Promise<void> {
  for (const source of ['python', 'sql', 'ai'] as const) {
    const origin = MOCK_SOURCE_ORIGINS[source];
    await page.route(`${origin}/**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/fortschritt') {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<!doctype html><html lang="de"><title>MOCK ${source}</title><h1>MOCK ${source} Fortschritt</h1></html>`,
        });
        return;
      }
      if (url.pathname !== '/api/platform/progress-source') {
        await route.fulfill({ status: 404, body: '' });
        return;
      }
      const headers = {
        'access-control-allow-origin': HUB_ORIGIN,
        'access-control-allow-credentials': 'true',
        'cache-control': 'private, no-store, max-age=0',
        'content-type': 'application/json; charset=utf-8',
      };
      const mode = behaviour[source];
      if (mode === 'hang') return; // nie beantwortet: der Hub muss selbst abbrechen
      if (mode === 'down') {
        await route.fulfill({ status: 500, headers, body: JSON.stringify({ error: 'unavailable' }) });
        return;
      }
      if (mode === 'unauthenticated') {
        await route.fulfill({ status: 401, headers, body: JSON.stringify({ error: 'unauthenticated' }) });
        return;
      }
      const body =
        mode === 'invalid'
          ? { ...MOCK_PROGRESS[source], schemaVersion: 2 }
          : mode === 'empty'
            ? {
                ...MOCK_PROGRESS[source],
                participation: { hasActivity: false },
                lessons: { completed: 0, total: MOCK_PROGRESS[source].lessons.total },
                reviews: { due: 0 },
                concepts: { ...MOCK_PROGRESS[source].concepts, observed: 0, ready: 0 },
                activity: { lastActiveAt: null },
                projects:
                  MOCK_PROGRESS[source].projects.kind === 'unsupported'
                    ? MOCK_PROGRESS[source].projects
                    : { ...MOCK_PROGRESS[source].projects, done: 0 },
              }
            : MOCK_PROGRESS[source];
      await route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
    });
  }
}
