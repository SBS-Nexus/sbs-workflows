import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { HUB_ORIGIN_UNCONNECTED } from './config';
import {
  erwarteKeineSchwerenAxeBefunde,
  erwarteVertrag,
  horizontalOverflow,
  verschachtelteLiveRegionen,
} from './feedback-pruefung';
import { mockProgressSources, writeVocabRaw } from './helpers';

/**
 * LP-03B — Quellzustände auf `/fortschritt` im gemeinsamen Statusvertrag.
 *
 * Die drei Remote-Quellen sind MOCKS (`page.route`), wie in
 * `fortschritt.spec.ts`: Sie belegen das Verhalten des Hubs, nicht das der
 * echten Apps. Geprüft wird, dass jeder Zustand seine eigene Bedeutung behält:
 * Ausfall und fehlende Anmeldung erzeugen weder Zahlen noch Erfolgssignale,
 * eine gültige leere Antwort bleibt ein echter Stand.
 */

const SHOTS = 'test-results/screenshots';
const BREITEN = [375, 640, 1280];

function card(page: Page, name: string): Locator {
  return page.getByRole('article', { name });
}

function hinweis(scope: Locator): Locator {
  return scope.locator('.lp-feedback-callout');
}

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function erwarteZustand(
  scope: Locator,
  tone: string,
  titel: string,
  text: string,
): Promise<Locator> {
  const element = hinweis(scope);
  await expect(element).toHaveCount(1);
  await expect(element).toHaveAttribute('data-lp-tone', tone);
  await expect(element.locator('.lp-feedback-title')).toHaveText(titel);
  await expect(element.locator('.lp-feedback-body')).toContainText(text);
  await expect(element.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  return element;
}

test('Teilausfall: Info bei fehlender Anmeldung, Warnung bei Ausfall — keine Zahlen, kein Erfolg', async ({
  page,
}) => {
  await mockProgressSources(page, { python: 'ok', sql: 'unauthenticated', ai: 'down' });
  await page.goto('/fortschritt');

  const python = card(page, 'PythonPfad');
  const sql = card(page, 'SQLPfad');
  const ai = card(page, 'AIPfad');
  const vokabeln = card(page, 'VokabelPfad');

  // Gültige Daten: unveränderte Kennzahlen und Herkunft, keine Meldung.
  await expect(python.getByText('LIVE · Python')).toBeVisible();
  await expect(python.locator('dd', { hasText: '3 von 12' })).toBeVisible();
  await expect(hinweis(python)).toHaveCount(0);

  await erwarteZustand(
    sql,
    'info',
    'Nicht angemeldet',
    'In SQLPfad bist du nicht angemeldet.',
  );
  await expect(sql.locator('.progress-metrics')).toHaveCount(0);
  await expect(sql.getByRole('link', { name: 'In SQLPfad anmelden' })).toBeVisible();

  await erwarteZustand(ai, 'warning', 'Nicht erreichbar', 'AIPfad ist derzeit nicht erreichbar.');
  await expect(ai.locator('.progress-metrics')).toHaveCount(0);
  await expect(ai.getByRole('link', { name: 'In AIPfad öffnen' })).toBeVisible();

  await erwarteZustand(vokabeln, 'neutral', 'Noch keine Vokabeln', 'Noch keine eigenen Vokabeln.');
  await expect(vokabeln.getByText('LOKAL · nur in diesem Browser')).toBeVisible();

  // Kein Erfolgston und keine Live-Region für statische Zustände.
  await expect(page.locator('.lp-feedback[data-lp-tone="success"]')).toHaveCount(0);
  await expect(page.locator('.lp-feedback [role], .lp-feedback [aria-live], .lp-feedback[role]')).toHaveCount(0);
  expect(await verschachtelteLiveRegionen(page)).toBe(0);

  for (const breite of BREITEN) {
    await page.setViewportSize({ width: breite, height: 900 });
    expect(await horizontalOverflow(page), `${breite} px: kein waagerechtes Scrollen`).toBeLessThanOrEqual(0);
    for (const scope of [sql, ai, vokabeln])
      await erwarteVertrag(hinweis(scope), 'light', `${breite} px`);
    await bild(page, `status-hub-teilausfall-${breite}`);
  }
  await erwarteKeineSchwerenAxeBefunde(page, 'Teilausfall');

  // Der Hub hat nur ein helles Schema: System-Dunkel ändert die Statusfarben nicht.
  await page.emulateMedia({ colorScheme: 'dark' });
  await erwarteVertrag(hinweis(ai), 'light', 'System dunkel');
});

test('ungültige Antwort, gültig leer, begonnen ohne Zeitpunkt und unlesbare Vokabeln', async ({ page }) => {
  await mockProgressSources(page, { python: 'invalid', sql: 'started', ai: 'empty' });
  await page.goto('/vokabeln');
  await writeVocabRaw(page, '{"version":1,"decks":"kaputt"');
  await page.goto('/fortschritt');

  const python = card(page, 'PythonPfad');
  const sql = card(page, 'SQLPfad');
  const ai = card(page, 'AIPfad');
  const vokabeln = card(page, 'VokabelPfad');

  // Ungültiges Schema: Warnung wie ein Ausfall, keine Zahlen.
  await erwarteZustand(python, 'warning', 'Nicht erreichbar', 'PythonPfad ist derzeit nicht erreichbar.');
  await expect(python.locator('.progress-metrics')).toHaveCount(0);

  // Begonnen, ohne Zeitpunkt: echte Nullen, „Kein Zeitpunkt erfasst", keine Meldung.
  await expect(hinweis(sql)).toHaveCount(0);
  await expect(sql.locator('dd', { hasText: '0 von 20' })).toBeVisible();
  await expect(sql.getByText('Kein Zeitpunkt erfasst')).toBeVisible();

  // Gültig leer: neutraler Hinweis, echte Nullen und „noch nie".
  await erwarteZustand(ai, 'neutral', 'Noch nichts erfasst', 'Noch keine Lernaktivität in AIPfad erfasst.');
  await expect(ai.locator('.progress-metrics')).toHaveCount(1);
  await expect(ai.getByText('noch nie')).toBeVisible();

  // Unlesbarer lokaler Stand: Fehler mit der bestehenden Meldung und dem Weg zur Prüfung, keine 0.
  await erwarteZustand(
    vokabeln,
    'danger',
    'Vokabeldaten nicht lesbar',
    'Deine Vokabeldaten in diesem Browser lassen sich nicht lesen. Sie wurden nicht verändert.',
  );
  await expect(vokabeln.getByText('Ein Fortschritt von 0 wäre deshalb falsch')).toBeVisible();
  await expect(vokabeln.locator('.progress-metrics')).toHaveCount(0);
  await expect(vokabeln.getByRole('link', { name: 'Im VokabelPfad prüfen' })).toBeVisible();

  for (const breite of BREITEN) {
    await page.setViewportSize({ width: breite, height: 900 });
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    for (const scope of [python, ai, vokabeln])
      await erwarteVertrag(hinweis(scope), 'light', `${breite} px`);
    await bild(page, `status-hub-ungueltig-leer-korrupt-${breite}`);
  }
  await erwarteKeineSchwerenAxeBefunde(page, 'ungültig/leer/korrupt');
});

test('Laden wird höflich angesagt; Vokabeln aus neuerer Version sind eine Warnung', async ({ page }) => {
  await mockProgressSources(page, { python: 'hang', sql: 'hang', ai: 'hang' });
  await page.goto('/vokabeln');
  await writeVocabRaw(page, JSON.stringify({ version: 7, revision: 1 }));
  await page.goto('/fortschritt');

  for (const name of ['PythonPfad', 'SQLPfad', 'AIPfad']) {
    const laden = await erwarteZustand(
      card(page, name),
      'neutral',
      'Wird geladen',
      `Fortschritt aus ${name} wird geladen …`,
    );
    // Angesagt wird wie bisher genau der Satz, nicht der Titel davor.
    const ansage = laden.locator('.lp-feedback-body');
    await expect(ansage).toHaveAttribute('role', 'status');
    await expect(ansage).toHaveAttribute('aria-live', 'polite');
    await expect(ansage).toHaveText(`Fortschritt aus ${name} wird geladen …`);
    await expect(laden).not.toHaveAttribute('role', /.+/);
    await expect(card(page, name).locator('.progress-metrics')).toHaveCount(0);
  }
  expect(await verschachtelteLiveRegionen(page)).toBe(0);
  await erwarteZustand(
    card(page, 'VokabelPfad'),
    'warning',
    'Neuere Version',
    'stammen aus einer neueren Version von VokabelPfad',
  );
  await bild(page, 'status-hub-laden-1280');
  await erwarteKeineSchwerenAxeBefunde(page, 'Laden');
});

test('nicht verbunden: neutraler Hinweis mit vorhandenem Weg in die App', async ({ page }) => {
  await page.goto(`${HUB_ORIGIN_UNCONNECTED}/fortschritt`);
  for (const name of ['PythonPfad', 'SQLPfad', 'AIPfad']) {
    const scope = card(page, name);
    await erwarteZustand(
      scope,
      'neutral',
      'Nicht verbunden',
      `Dein Fortschritt in ${name} ist dort weiterhin vollständig sichtbar.`,
    );
    await expect(scope.locator('.progress-metrics')).toHaveCount(0);
    await expect(scope.getByRole('link', { name: `In ${name} öffnen` })).toBeVisible();
    await erwarteVertrag(hinweis(scope), 'light', name);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await bild(page, 'status-hub-nicht-verbunden-375');
  await erwarteKeineSchwerenAxeBefunde(page, 'nicht verbunden');
});
