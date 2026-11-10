import {
  test,
  expect,
  type BrowserContext,
  type Locator,
  type Page,
  type Request,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { onboardingAbschliessen, registriere } from './helfer';

/**
 * End-to-End-Abdeckung von LP-10B (Stufe 10, RAG).
 *
 * Alle Prüfungen teilen sich EIN Konto und einen Browserkontext: Die Suite
 * legt bereits viele Konten an, und die Registrierungsgrenze je Herkunft
 * (60 pro Stunde) wird in der Datenbank gezählt. Diese Datei kostet deshalb
 * genau eine Registrierung. Die Tests laufen seriell und bauen aufeinander
 * auf; die Grenze selbst wird nicht umgangen.
 */

test.describe.configure({ mode: 'serial' });

const LAB_URL = '/labs/rag-pipeline-lab';

let kontext: BrowserContext;
let page: Page;
const fehler: string[] = [];

test.beforeAll(async ({ browser }, testInfo) => {
  kontext = await browser.newContext({
    ...testInfo.project.use,
    baseURL: testInfo.project.use.baseURL,
    locale: 'de-DE',
    reducedMotion: 'reduce',
  });
  page = await kontext.newPage();
  page.on('console', (nachricht) => {
    if (nachricht.type() === 'error') fehler.push(nachricht.text());
  });
  page.on('pageerror', (ausnahme) => fehler.push(ausnahme.message));
  await registriere(page, 'RAG-Test');
  await onboardingAbschliessen(page);
});

test.afterAll(async () => {
  await kontext.close();
});

async function keineErnstenVerstoesse(): Promise<void> {
  const ergebnis = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22a', 'wcag22aa'])
    .analyze();
  const ernst = ergebnis.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    ernst.map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length})`),
    'Serious/critical Accessibility-Verstöße',
  ).toEqual([]);
}

function antwort(): Locator {
  return page.getByRole('region', { name: /Simulierte Antwort/ });
}

function evaluation(): Locator {
  return page.getByRole('region', { name: /Evaluation/ });
}

async function setzeRegler(
  name: string,
  min: number,
  schritt: number,
  wert: number,
): Promise<void> {
  const regler = page.getByLabel(name);
  await regler.focus();
  await regler.press('Home');
  for (let v = min; v < wert; v += schritt) await regler.press('ArrowRight');
  await expect(regler).toHaveValue(String(wert));
}

const setzeK = (k: number): Promise<void> => setzeRegler('Anzahl der Treffer k', 1, 1, k);
const setzeBudget = (b: number): Promise<void> =>
  setzeRegler('Kontextbudget in Einheiten', 10, 5, b);

async function waehle(name: string): Promise<void> {
  await page.getByRole('radio', { name }).check();
}

test('Modul und Lektionen sind erreichbar, Aufgaben werden bewertet', async () => {
  await page.goto('/lernen');
  await expect(
    page.getByRole('heading', { name: 'RAG – Wissen mit Quellen nutzen' }),
  ).toBeVisible();
  for (const titel of [
    'Von Dokumenten zu Chunks',
    'Retrieval für RAG',
    'Kontext und belegte Antworten',
    'RAG-Fehler erkennen',
  ]) {
    await expect(page.getByRole('link', { name: titel })).toBeVisible();
  }

  await page.goto('/lektion/kontext-und-belegte-antworten/2');
  await expect(page.getByText('38 + 15 = 53 > 40, nicht übernommen.')).toBeVisible();

  await page.goto('/lektion/kontext-und-belegte-antworten/3');
  await page.getByLabel('Einheiten von Platz 1 und 2').fill('38');
  await page.getByLabel('Einheiten mit Platz 3').fill('53');
  await page.getByLabel('freie Einheiten').fill('12');
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Teilweise richtig')).toBeVisible();
  await expect(page.getByText('Budget minus belegte Einheiten: 40 − 38.')).toBeVisible();

  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
  await page.getByLabel('Einheiten von Platz 1 und 2').fill('38');
  await page.getByLabel('Einheiten mit Platz 3').fill('53');
  await page.getByLabel('freie Einheiten').fill('2');
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();
  await keineErnstenVerstoesse();

  // Ein unbekannter Lab-Slug wird nicht als gültig behandelt. Bis hierher
  // keine Konsolenfehler; diese Navigation erzeugt absichtlich genau die
  // Browsermeldung zur 404-Antwort, und nur diese wird danach entfernt.
  expect(fehler).toEqual([]);
  const unbekannt = await page.goto('/labs/rag-pipeline-lab-gibt-es-nicht');
  expect(unbekannt?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Diese Seite gibt es nicht' })).toBeVisible();
  expect(fehler).toEqual([
    'Failed to load resource: the server responded with a status of 404 (Not Found)',
  ]);
  fehler.length = 0;
});

test('Das Lab zeigt Chunking, Top-k, Budget, Belege und Fehlerfälle und speichert den Abschluss', async () => {
  await page.goto(LAB_URL);
  await page.waitForLoadState('networkidle');
  const anfragen: Request[] = [];
  page.on('request', (a) => anfragen.push(a));

  // Dokumente mit Quelle und Version; die alte Fassung ist sichtbar veraltet.
  await expect(page.getByText('HR-URLAUB · Version 2 · gültig ab 2026-01-01')).toBeVisible();
  await expect(page.getByText('veraltet — ersetzt durch Version 2')).toBeVisible();
  await expect(
    page.getByText('Der Antwort-Simulator ist keine KI.', { exact: false }),
  ).toBeVisible();

  // 1 — Richtiger Beleg vorhanden (Startwerte).
  await expect(
    page.getByText('29 von 40 Einheiten belegt', { exact: false }).first(),
  ).toBeVisible();
  await expect(
    antwort().getByText('Urlaub beantragst du mindestens zwei Wochen vor Urlaubsbeginn.'),
  ).toBeVisible();
  await expect(
    antwort().getByText(/Beleg: HR-URLAUB · Version 2 · Satz 2 \(urlaub-v2:klein:2\)/),
  ).toBeVisible();
  // Die veraltete Frist wird nicht als Tatsache ausgegeben.
  await expect(
    antwort().getByText('Nur in einer ersetzten Fassung belegt', { exact: false }),
  ).toBeVisible();

  // Kontextbudget: Mit größeren Chunks, k = 1 und 15 Einheiten fehlt der Beleg.
  await waehle('Größere Chunks mit Overlap');
  await expect(page.getByText('10 Chunks im Bestand.')).toBeVisible();
  await setzeK(1);
  await setzeBudget(15);
  await expect(
    page
      .getByRole('table', { name: /Alle Chunks nach Kosinusähnlichkeit/ })
      .getByText('Budget überschritten')
      .first(),
  ).toBeVisible();
  await expect(antwort().getByText(/^Nicht genügend Informationen/)).toBeVisible();
  await setzeBudget(40);
  await expect(
    antwort().getByText('Urlaub beantragst du mindestens zwei Wochen vor Urlaubsbeginn.'),
  ).toBeVisible();

  // 2 — Relevanter Chunk fällt durch Top-k heraus.
  await waehle('Kleine Chunks');
  await expect(page.getByText('15 Chunks im Bestand.')).toBeVisible();
  await waehle('Ab welchem Tag brauche ich eine Krankmeldung vom Arzt?');
  await setzeK(2);
  await expect(
    evaluation().getByText(
      /Es fehlt: Eine ärztliche Bescheinigung brauchst du ab dem vierten Krankheitstag/,
    ),
  ).toBeVisible();
  await setzeK(3);
  await expect(evaluation().getByText('Alle benötigten Aussagen sind belegt.')).toBeVisible();

  // 3 — Chunking trennt die entscheidende Aussage.
  await waehle('Darf ich bei fünf Stunden Bahnfahrt in der 1. Klasse fahren?');
  await expect(page.getByText('Trennstelle zerschneidet einen Beleg')).toBeVisible();
  await expect(
    evaluation().getByText(/Es fehlt: Ab vier Stunden Fahrzeit ist die 1\. Klasse erlaubt/),
  ).toBeVisible();
  await waehle('Größere Chunks mit Overlap');
  await expect(page.getByText('Trennstelle zerschneidet einen Beleg')).toHaveCount(0);
  await expect(
    antwort()
      .getByText(/Beleg: FIN-REISE · Version 3 · Sätze 2–3/)
      .first(),
  ).toBeVisible();

  // 4 — Kein geeigneter Beleg.
  await waehle('Wie viel Budget gibt es pro Person für die Weihnachtsfeier?');
  await expect(antwort().getByText(/^Nicht genügend Informationen/)).toBeVisible();
  await expect(antwort().getByText('erfundene Quelle')).toBeVisible();

  // Kein Abschluss ohne Entscheidungen.
  await expect(page.getByRole('button', { name: 'Lab abschließen' })).toHaveCount(0);

  // Entscheidung 1: erst falsch, dann richtig.
  const frist = page.getByRole('group', { name: /zwei Fristen auf/ });
  await frist.getByRole('button', { name: /Anfrage „Wie lange vorher/ }).click();
  await frist.getByLabel(/Vier Wochen/).check();
  await frist.getByRole('button', { name: 'Entscheidung prüfen' }).click();
  await expect(frist.getByText('Noch nicht', { exact: true })).toBeVisible();
  await frist.getByLabel(/Zwei Wochen/).check();
  await frist.getByRole('button', { name: 'Entscheidung prüfen' }).click();
  await expect(frist.getByText('Richtig', { exact: true })).toBeVisible();
  await expect(
    evaluation().getByText(/Die aktuelle und die veraltete Frist haben denselben Score/),
  ).toBeVisible();

  // Entscheidung 2: verlangt die Bahnfrage MIT kleinen Chunks.
  const grenze = page.getByRole('group', { name: /Bei kleinen Chunks fehlt/ });
  await grenze.getByRole('button', { name: /mit „Kleine Chunks“ anzeigen/ }).click();
  await expect(page.getByRole('radio', { name: 'Kleine Chunks' })).toBeChecked();
  await grenze.getByLabel(/Chunk-Grenze trennt/).check();
  await grenze.getByRole('button', { name: 'Entscheidung prüfen' }).click();
  await expect(grenze.getByText('Richtig', { exact: true })).toBeVisible();

  // Entscheidung 3.
  const keinBeleg = page.getByRole('group', { name: /Weihnachtsfeier gibt es keinen Beleg/ });
  await keinBeleg.getByRole('button', { name: /Anfrage „Wie viel Budget/ }).click();
  await keinBeleg.getByLabel(/Nicht genügend Informationen/).check();
  await keinBeleg.getByRole('button', { name: 'Entscheidung prüfen' }).click();
  await expect(keinBeleg.getByText('Richtig', { exact: true })).toBeVisible();

  // Bis hierher kein Schreibzugriff und kein Aufruf an einen fremden Host.
  const herkunft = new URL(page.url()).origin;
  expect(anfragen.filter((a) => a.method() !== 'GET').map((a) => a.url())).toEqual([]);
  expect(anfragen.filter((a) => new URL(a.url()).origin !== herkunft).map((a) => a.url())).toEqual(
    [],
  );

  const abschluss = page.waitForRequest((a) => a.method() === 'POST');
  await page.getByRole('button', { name: 'Lab abschließen' }).click();
  expect(new URL((await abschluss).url()).pathname).toBe(LAB_URL);
  await expect(page.getByText('✓ Lab abgeschlossen.')).toBeVisible();

  await page.goto('/labs');
  await expect(
    page.getByRole('link', { name: /RAG-Pipeline-Lab/ }).getByText('Abgeschlossen'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Semantische Suche verstehen/ }).getByText('Abgeschlossen'),
  ).toHaveCount(0);
});

test('Das Lab ist mit der Tastatur bedienbar und für Screenreader beschriftet', async () => {
  await page.goto(LAB_URL);

  const klein = page.getByRole('radio', { name: 'Kleine Chunks' });
  await klein.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Größere Chunks mit Overlap' })).toBeChecked();
  expect(
    await page
      .getByRole('radio', { name: 'Größere Chunks mit Overlap' })
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe('none');

  await setzeK(2);
  await setzeBudget(25);
  await expect(page.getByLabel('Kontextbudget in Einheiten')).toHaveAttribute(
    'aria-valuetext',
    '25 Einheiten',
  );
  await expect(
    page.getByRole('progressbar', { name: /Kontextbudget: \d+ von 25 Einheiten belegt/ }),
  ).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Chunks im Kontext' })).toHaveText(
    /von 25 Einheiten belegt/,
  );
  await expect(
    page.getByRole('region', { name: 'Chunk-Rangliste (horizontal scrollbar)' }),
  ).toBeVisible();

  const frist = page.getByRole('group', { name: /zwei Fristen auf/ });
  const option = frist.getByLabel(/Zwei Wochen/);
  await option.focus();
  await page.keyboard.press('Space');
  await expect(option).toBeChecked();
  await frist.getByRole('button', { name: 'Entscheidung prüfen' }).focus();
  await page.keyboard.press('Enter');
  await expect(frist.getByText('Richtig', { exact: true })).toBeVisible();

  await keineErnstenVerstoesse();
});

test('bei 375 px und im dunklen Schema ohne horizontales Scrollen und ohne schwere Befunde', async () => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const schema of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: schema, reducedMotion: 'reduce' });
    await page.goto(LAB_URL);
    await expect(page.getByRole('region', { name: /Simulierte Antwort/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
    await keineErnstenVerstoesse();
  }
  await page.goto('/lektion/von-dokumenten-zu-chunks/1');
  await expect(page.getByRole('heading', { name: 'Von Dokumenten zu Chunks' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  expect(fehler).toEqual([]);
});
