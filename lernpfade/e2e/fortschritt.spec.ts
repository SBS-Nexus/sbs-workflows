import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { HUB_ORIGIN, HUB_ORIGIN_UNCONNECTED, MOCK_SOURCE_ORIGINS } from './config';
import {
  DEMO_KEY,
  addCard,
  backToOverview,
  createDeck,
  expectNoSeriousA11yViolations,
  gotoVocab,
  mockProgressSources,
  readVocabStorage,
  recordRequests,
  writeVocabRaw,
  type ProgressMockMode,
  type SeenRequest,
} from './helpers';

/**
 * LP-07 — `/fortschritt` gegen den echten Produktionsbuild des Hubs.
 *
 * Die drei Remote-Quellen sind hier MOCKS (`page.route`, siehe
 * `mockProgressSources`) — sie belegen das Verhalten des Hubs, nicht das der
 * echten Apps. Der VokabelPfad-Stand kommt aus der echten, lokalen IndexedDB.
 */

const GEHEIM_BEGRIFF = 'GEHEIMBEGRIFF-LP07';
const GEHEIM_UEBERSETZUNG = 'GEHEIMÜBERSETZUNG-LP07';

const VOCAB = JSON.stringify({
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
      id: 'karte-eins',
      deckId: 'eigenes-deck',
      term: GEHEIM_BEGRIFF,
      translation: GEHEIM_UEBERSETZUNG,
      context: '',
      tags: [],
      createdAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 'karte-zwei',
      deckId: 'eigenes-deck',
      term: 'harbour',
      translation: 'Hafen',
      context: '',
      tags: [],
      createdAt: '2026-10-01T08:00:00.000Z',
    },
  ],
  reviews: [],
  activity: null,
});

function card(page: Page, name: string): Locator {
  return page.getByRole('article', { name });
}

function metric(scope: Locator, label: string): Locator {
  return scope
    .locator('dt', { hasText: new RegExp(`^${label}$`) })
    .locator('xpath=following-sibling::dd[1]')
    .locator('.progress-value');
}

/** LP-07 liest nur: keine schreibende Anfrage, keine Vokabelinhalte, Quellen nur über den einen GET-Pfad ohne Parameter. */
function expectReadOnly(seen: readonly SeenRequest[]): void {
  const writes = seen.filter((request) => request.method !== 'GET' && request.method !== 'HEAD');
  expect(writes, 'keine POST/PUT/PATCH/DELETE').toEqual([]);
  for (const request of seen) {
    for (const secret of [GEHEIM_BEGRIFF, GEHEIM_UEBERSETZUNG, 'Hafen', 'harbour']) {
      expect(decodeURIComponent(request.url), `kein Vokabelinhalt in ${request.url}`).not.toContain(secret);
      expect(request.body ?? '').not.toContain(secret);
    }
    const url = new URL(request.url);
    const isSource = Object.values(MOCK_SOURCE_ORIGINS).includes(url.origin as never);
    if (isSource && url.pathname.startsWith('/api/')) {
      expect(url.pathname).toBe('/api/platform/progress-source');
      expect(url.search, 'keine Abfrageparameter, keine userId').toBe('');
    }
  }
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync('test-results/screenshots', { recursive: true });
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

test('vom Hub zu /fortschritt: drei Quellen (MOCK) und Vokabeln lokal, ehrlich je Pfad', async ({ page }) => {
  await page.goto('/');
  await writeVocabRaw(page, VOCAB);
  // DEMO-Bewertungen aus /wiederholen zählen nicht zum Fortschritt.
  await page.evaluate((key) => window.localStorage.setItem(key, '{"language-en-retrieval":{"marker":"demo"}}'), DEMO_KEY);
  await mockProgressSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
  const seen = recordRequests(page);

  await page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('link', { name: 'Fortschritt' }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Dein Fortschritt' })).toBeVisible();
  await expect(page.getByText('kein gemeinsames Konto, keinen synchronisierten Lernstand')).toBeVisible();

  const python = card(page, 'PythonPfad');
  await expect(python.getByText('LIVE · Python')).toBeVisible();
  await expect(metric(python, 'Lektionen abgeschlossen')).toContainText('3 von 12');
  await expect(python.getByRole('progressbar', { name: 'Lektionsfortschritt in PythonPfad: 3 von 12' })).toBeVisible();
  await expect(metric(python, 'Wiederholungen fällig')).toHaveText('4');
  await expect(metric(python, 'Konzepte geübt')).toHaveText('6, davon 2 gefestigt');
  await expect(metric(python, 'Projekte abgenommen')).toHaveText('1 von 5');
  await expect(metric(python, 'Zuletzt aktiv')).toContainText('2026');

  const sql = card(page, 'SQLPfad');
  await expect(sql.getByText('LIVE · SQL')).toBeVisible();
  await expect(metric(sql, 'Konzepte bearbeitet')).toHaveText('9, davon 5 „sitzt"');
  await expect(sql.getByText('alle beurteilbaren Aufgaben zuletzt gelöst')).toBeVisible();
  await expect(metric(sql, 'Projekte abgegeben')).toHaveText('2 von 4');
  await expect(sql.getByText('SQLPfad nimmt Projekte nicht fachlich ab.')).toBeVisible();
  await expect(sql.getByText(/abgenommen|gemeistert/)).toHaveCount(0);

  const ai = card(page, 'AIPfad');
  await expect(ai.getByText('LIVE · AI')).toBeVisible();
  await expect(metric(ai, 'Projekte')).toHaveText('—');
  await expect(ai.getByText('AIPfad hat keine Projekte.')).toBeVisible();
  await expect(ai.getByText('0 von 0')).toHaveCount(0);

  const vokabeln = card(page, 'VokabelPfad');
  await expect(vokabeln.getByText('LOKAL · nur in diesem Browser')).toBeVisible();
  await expect(metric(vokabeln, 'Karten')).toHaveText('2 in 1 Deck');
  await expect(metric(vokabeln, 'Fällig Englisch → Deutsch')).toHaveText('2');
  await expect(metric(vokabeln, 'Fällig Deutsch → Englisch')).toHaveText('2');
  await expect(metric(vokabeln, 'Heute bewertet')).toHaveText('0');

  // Fällig insgesamt: vollständig, je Quelle ausgewiesen, ohne Gesamtprozent.
  const summary = page.getByRole('region', { name: 'Fällig insgesamt' });
  await expect(summary.locator('.progress-total')).toHaveText('10 fällig');
  await expect(summary).toContainText('Python 4 · SQL 2 · AI 0 · Vokabeln 4');
  await expect(page.getByText(/%/)).toHaveCount(0);

  await expectNoSeriousA11yViolations(page, '/fortschritt alle Quellen');
  await shot(page, 'lp07-desktop-fortschritt');

  // Lesen ändert nichts am Vokabelspeicher.
  expect(await readVocabStorage(page)).toBe(VOCAB);

  // Weg in die Quell-App (MOCK-Seite).
  await python.getByRole('link', { name: 'In PythonPfad öffnen' }).click();
  await expect(page).toHaveURL(`${MOCK_SOURCE_ORIGINS.python}/fortschritt`);
  await expect(page.getByRole('heading', { name: 'MOCK python Fortschritt' })).toBeVisible();

  expectReadOnly(seen);
  expect(
    seen.filter((request) => request.url.endsWith('/api/platform/progress-source')).map((r) => new URL(r.url).origin).sort(),
    'genau eine Anfrage je verbundener Quelle',
  ).toEqual(Object.values(MOCK_SOURCE_ORIGINS).sort());
});

test('Teilausfall: 401, 500 und ungültiges Schema bleiben je Quelle sichtbar; keine Gesamtzahl', async ({ page }) => {
  await mockProgressSources(page, { python: 'unauthenticated', sql: 'down', ai: 'invalid' });
  const seen = recordRequests(page);
  await page.goto('/fortschritt');

  const python = card(page, 'PythonPfad');
  await expect(python.getByText('In PythonPfad bist du nicht angemeldet.')).toBeVisible();
  await expect(python.getByText('das heißt nicht, dass du dort keinen Fortschritt hast')).toBeVisible();
  await expect(python.getByRole('link', { name: 'In PythonPfad anmelden' })).toHaveAttribute(
    'href',
    `${MOCK_SOURCE_ORIGINS.python}/anmelden`,
  );
  await expect(python.locator('dl')).toHaveCount(0);

  await expect(card(page, 'SQLPfad').getByText('SQLPfad ist derzeit nicht erreichbar.')).toBeVisible();
  await expect(card(page, 'AIPfad').getByText('AIPfad ist derzeit nicht erreichbar.')).toBeVisible();
  for (const name of ['PythonPfad', 'SQLPfad', 'AIPfad']) {
    await expect(card(page, name).getByText(/LIVE ·/)).toHaveCount(0);
  }

  // Lokale Vokabeln bleiben nutzbar; leerer, gültiger Stand ist eine echte 0.
  const vokabeln = card(page, 'VokabelPfad');
  await expect(vokabeln.getByText('Noch keine eigenen Vokabeln.')).toBeVisible();
  await expect(metric(vokabeln, 'Karten')).toHaveText('0 in 0 Decks');

  const summary = page.getByRole('region', { name: 'Fällig insgesamt' });
  await expect(summary).toContainText('Keine Gesamtzahl, solange Python, SQL, AI nicht lesbar sind');
  await expect(summary.locator('.progress-total')).toHaveCount(0);

  await expectNoSeriousA11yViolations(page, '/fortschritt Teilausfall');
  expectReadOnly(seen);
});

test('eine hängende Quelle blockiert weder die anderen noch die Vokabeln und läuft für sich ab', async ({ page }) => {
  await mockProgressSources(page, { python: 'ok', sql: 'empty', ai: 'hang' });
  await page.goto('/fortschritt');

  // Python und SQL erscheinen, während AIPfad noch lädt.
  await expect(card(page, 'PythonPfad').getByText('LIVE · Python')).toBeVisible();
  const sql = card(page, 'SQLPfad');
  await expect(sql.getByText('Noch keine Lernaktivität in SQLPfad erfasst.')).toBeVisible();
  await expect(metric(sql, 'Lektionen abgeschlossen')).toContainText('0 von 20');
  await expect(metric(sql, 'Zuletzt aktiv')).toHaveText('noch nie');
  await expect(card(page, 'VokabelPfad').getByText('Noch keine eigenen Vokabeln.')).toBeVisible();
  await expect(card(page, 'AIPfad').getByRole('status')).toHaveText('Fortschritt aus AIPfad wird geladen …');
  await expect(page.getByRole('region', { name: 'Fällig insgesamt' })).toContainText('Wird zusammengezählt');

  // Nach der Zeitgrenze (5 s) ist AIPfad „nicht erreichbar" — nur AIPfad.
  await expect(card(page, 'AIPfad').getByText('AIPfad ist derzeit nicht erreichbar.')).toBeVisible();
  await expect(card(page, 'PythonPfad').getByText('LIVE · Python')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Fällig insgesamt' })).toContainText('solange AI nicht lesbar ist');
});

test('„Zuletzt aktiv": Zeitpunkt, Aktivität ohne Zeitpunkt und wirklich leer bleiben unterscheidbar', async ({ page }) => {
  await mockProgressSources(page, { python: 'started', sql: 'empty', ai: 'ok' });
  await page.goto('/fortschritt');

  // Begonnene Lektion ohne Versuch/Abschluss: gültig, LIVE, Aktivität ja — aber kein Zeitpunkt.
  const python = card(page, 'PythonPfad');
  await expect(python.getByText('LIVE · Python')).toBeVisible();
  await expect(metric(python, 'Zuletzt aktiv')).toHaveText('Kein Zeitpunkt erfasst');
  await expect(metric(python, 'Lektionen abgeschlossen')).toContainText('0 von 12');
  await expect(python.getByText('Noch keine Lernaktivität in PythonPfad erfasst.')).toHaveCount(0);
  await expect(python.getByText('PythonPfad ist derzeit nicht erreichbar.')).toHaveCount(0);

  // Wirklich leer: „noch nie" bleibt richtig.
  const sql = card(page, 'SQLPfad');
  await expect(sql.getByText('Noch keine Lernaktivität in SQLPfad erfasst.')).toBeVisible();
  await expect(metric(sql, 'Zuletzt aktiv')).toHaveText('noch nie');

  // Mit Zeitstempel: formatierter Zeitpunkt.
  await expect(metric(card(page, 'AIPfad'), 'Zuletzt aktiv')).toHaveText(/^\d{2}\.\d{2}\.2026, \d{2}:\d{2}$/);

  // Gültiger Stand: die Gesamtzahl bleibt vollständig.
  await expect(page.getByRole('region', { name: 'Fällig insgesamt' }).locator('.progress-total')).toHaveText('0 fällig');
  await expectNoSeriousA11yViolations(page, '/fortschritt Aktivität ohne Zeitpunkt');
  mkdirSync('test-results/screenshots', { recursive: true });
  // Ausschnitt der Ganzseitenaufnahme: Dort verdeckt die mitlaufende Kopfzeile keine Karte.
  const grid = (await page.locator('.progress-grid').boundingBox())!;
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.screenshot({
    path: 'test-results/screenshots/lp07-zuletzt-aktiv.png',
    fullPage: true,
    clip: { x: grid.x, y: grid.y + scrollY, width: grid.width, height: grid.height },
  });
});

test('nicht verbunden (zweiter Hub ohne Freischaltung): ehrlich statt 0, keine Anfrage an Quellen', async ({ page }) => {
  const seen = recordRequests(page);
  await page.goto(`${HUB_ORIGIN_UNCONNECTED}/`);
  await writeVocabRaw(page, '{"version":1,"decks":"kaputt"');
  await page.goto(`${HUB_ORIGIN_UNCONNECTED}/fortschritt`);

  for (const name of ['PythonPfad', 'SQLPfad', 'AIPfad']) {
    const remote = card(page, name);
    await expect(remote.getByText('Nicht mit dem Hub verbunden.')).toBeVisible();
    await expect(remote.locator('dl')).toHaveCount(0);
  }
  await expect(card(page, 'SQLPfad').getByRole('link', { name: 'In SQLPfad öffnen' })).toHaveAttribute(
    'href',
    `${MOCK_SOURCE_ORIGINS.sql}/fortschritt`,
  );

  // Beschädigter lokaler Speicher bleibt ein Fehler — nie 0 Fortschritt.
  const vokabeln = card(page, 'VokabelPfad');
  await expect(vokabeln.getByText('Deine Vokabeldaten in diesem Browser lassen sich nicht lesen.')).toBeVisible();
  await expect(vokabeln.getByText('Ein Fortschritt von 0 wäre deshalb falsch')).toBeVisible();
  await expect(vokabeln.locator('dl')).toHaveCount(0);
  await expect(vokabeln.getByRole('link', { name: 'Im VokabelPfad prüfen' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Fällig insgesamt' })).toContainText(
    'solange Vokabeln nicht lesbar ist',
  );
  expect(await readVocabStorage(page), 'beschädigte Daten bleiben unverändert').toBe('{"version":1,"decks":"kaputt"');

  await expectNoSeriousA11yViolations(page, '/fortschritt nicht verbunden');
  expect(
    seen.filter((request) => Object.values(MOCK_SOURCE_ORIGINS).some((origin) => request.url.startsWith(origin))),
    'keine Anfrage an nicht verbundene Quellen',
  ).toEqual([]);
});

test('Vokabeln aus einer künftigen Version und nach Reload: Fehler bleibt Fehler, Stand bleibt Stand', async ({ page }) => {
  await mockProgressSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
  await page.goto('/');
  await writeVocabRaw(page, JSON.stringify({ version: 7, revision: 1 }));
  await page.goto('/fortschritt');
  await expect(card(page, 'VokabelPfad').getByText('aus einer neueren Version von VokabelPfad')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Fällig insgesamt' })).toContainText('solange Vokabeln nicht lesbar ist');

  await writeVocabRaw(page, VOCAB);
  await page.reload();
  await expect(metric(card(page, 'VokabelPfad'), 'Karten')).toHaveText('2 in 1 Deck');
  await page.reload();
  await expect(metric(card(page, 'VokabelPfad'), 'Karten')).toHaveText('2 in 1 Deck');
  await expect(page.getByRole('region', { name: 'Fällig insgesamt' }).locator('.progress-total')).toHaveText('10 fällig');
});

test('offene Seite bleibt aktuell: Fälligkeit und Tageswechsel, Speichern in einem anderen Tab, Rückkehr in den Tab', async ({
  page,
  context,
}) => {
  // Uhr: 23:59 in Berlin; eine Karte wird in beide Richtungen mit „Gut" gelernt (nächste Fälligkeit: +1 Tag).
  await page.clock.install({ time: '2026-10-04T21:59:00.000Z' });
  await gotoVocab(page);
  await createDeck(page, 'Tageswechsel');
  await addCard(page, { term: 'tomorrow', translation: 'morgen' });
  await backToOverview(page);
  await page.getByLabel('Beide Richtungen').check();
  await page.getByRole('button', { name: 'Session starten' }).click();
  for (let i = 1; i <= 2; i += 1) {
    await page.getByRole('button', { name: 'Antwort zeigen' }).click();
    await page.getByRole('button', { name: /^Gut/ }).click();
  }
  await page.getByRole('button', { name: 'Zur Übersicht' }).click();

  const modes: Record<'python' | 'sql' | 'ai', ProgressMockMode> = { python: 'ok', sql: 'ok', ai: 'ok' };
  await mockProgressSources(page, modes);
  const seen = recordRequests(page);
  await page.goto('/fortschritt');
  const vokabeln = card(page, 'VokabelPfad');
  const summary = page.getByRole('region', { name: 'Fällig insgesamt' });
  await expect(metric(vokabeln, 'Heute bewertet')).toHaveText('2');
  await expect(metric(vokabeln, 'Fällig Englisch → Deutsch')).toHaveText('0');
  await expect(summary.locator('.progress-total')).toHaveText('6 fällig');
  const stored = await readVocabStorage(page);
  const sourceRequests = () => seen.filter((request) => request.url.endsWith('/api/platform/progress-source')).length;
  expect(sourceRequests()).toBe(3);

  // Die Uhr läuft über Fälligkeit und Tageswechsel — ohne Eingabe, ohne Reload.
  await page.clock.fastForward(Date.parse('2026-10-05T22:00:30.000Z') - (await page.evaluate(() => Date.now())));
  await expect(metric(vokabeln, 'Heute bewertet')).toHaveText('0');
  await expect(metric(vokabeln, 'Fällig Englisch → Deutsch')).toHaveText('1');
  await expect(metric(vokabeln, 'Fällig Deutsch → Englisch')).toHaveText('1');
  await expect(summary.locator('.progress-total')).toHaveText('8 fällig');
  await expect(summary).toContainText('Python 4 · SQL 2 · AI 0 · Vokabeln 2');
  expect(await readVocabStorage(page), 'die Zeitaktualisierung schreibt nichts').toBe(stored);
  expect(sourceRequests(), 'die Uhr allein fragt keine Quelle ab').toBe(3);

  // Inzwischen ist die Anmeldung in PythonPfad abgelaufen.
  modes.python = 'unauthenticated';

  // Ein anderer Tab speichert Vokabeln: der lokale Stand wird neu gelesen.
  const other = await context.newPage();
  await gotoVocab(other);
  await createDeck(other, 'Zweiter Tab');
  await expect(metric(vokabeln, 'Karten')).toHaveText('1 in 2 Decks');
  await other.close();
  const fromOther = await readVocabStorage(page);

  // Rückkehr in den Tab: Quellen werden neu abgefragt; die abgelaufene Anmeldung zeigt sich ehrlich.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(card(page, 'PythonPfad').getByText('In PythonPfad bist du nicht angemeldet.')).toBeVisible();
  await expect(summary).toContainText('Keine Gesamtzahl, solange Python nicht lesbar ist');
  await expect(card(page, 'SQLPfad').getByText('LIVE · SQL')).toBeVisible();

  // Gedrosselt: eine weitere Rückkehr innerhalb einer Minute fragt die Quellen nicht erneut ab.
  const afterReturn = sourceRequests();
  expect(afterReturn).toBe(6);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(metric(vokabeln, 'Karten')).toHaveText('1 in 2 Decks');
  expect(sourceRequests()).toBe(afterReturn);

  expectReadOnly(seen);
  expect(await readVocabStorage(page), 'Lesen und Aktualisieren schreiben nichts').toBe(fromOther);
});

test('vollständig per Tastatur: Navigation zu /fortschritt und weiter in eine Quell-App', async ({ page }) => {
  await mockProgressSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
  await page.goto('/wiederholen');
  const nav = page.getByRole('navigation', { name: 'Seitennavigation' });
  await nav.getByRole('link', { name: 'Fortschritt' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${HUB_ORIGIN}/fortschritt`);
  await expect(nav.getByRole('link', { name: 'Fortschritt' })).toHaveAttribute('aria-current', 'page');
  await expect(card(page, 'SQLPfad').getByText('LIVE · SQL')).toBeVisible();

  // Tab für Tab bis zum Link in SQLPfad — jeder Halt ist sichtbar fokussiert.
  const target = card(page, 'SQLPfad').getByRole('link', { name: 'In SQLPfad öffnen' });
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      return element ? getComputedStyle(element).outlineStyle : 'none';
    });
    expect(outline, 'sichtbarer Fokus').not.toBe('none');
    if (await target.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${MOCK_SOURCE_ORIGINS.sql}/fortschritt`);
});
