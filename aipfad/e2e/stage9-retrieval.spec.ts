import { test, expect, type Locator, type Page, type Request } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { onboardingAbschliessen, registriere } from './helfer';

/**
 * End-to-End-Abdeckung von LP-10A (Stufe 9): Modul finden, eine Lektion samt
 * Aufgabenfeedback durcharbeiten, das Retrieval-Lab bedienen — mit Maus und
 * Tastatur, auf Desktop und bei 375 px — und den Abschluss gespeichert
 * wiederfinden.
 */

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const LAB_URL = '/labs/semantische-suche-lab';

/** Sammelt Konsolenfehler und nicht gefangene Ausnahmen der Seite. */
function beobachteFehler(page: Page): string[] {
  const fehler: string[] = [];
  page.on('console', (nachricht) => {
    if (nachricht.type() === 'error') fehler.push(nachricht.text());
  });
  page.on('pageerror', (ausnahme) => fehler.push(ausnahme.message));
  return fehler;
}

async function keineErnstenVerstoesse(page: Page): Promise<void> {
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

async function anmelden(page: Page): Promise<void> {
  await registriere(page, 'Retrieval-Test');
  await onboardingAbschliessen(page);
}

function rangliste(page: Page): Locator {
  return page.getByRole('table', { name: /absteigend nach Score/ });
}

/** Dokumenttitel der Rangliste in angezeigter Reihenfolge. */
async function ranglistenTitel(page: Page): Promise<string[]> {
  return rangliste(page).locator('tbody th[scope="row"]').allInnerTexts();
}

async function ranglistenScores(page: Page): Promise<string[]> {
  return rangliste(page).locator('tbody tr td:nth-of-type(2)').allInnerTexts();
}

function treffer(page: Page): Locator {
  return page.getByRole('region', { name: /Treffer mit Quelltext/ }).getByRole('listitem');
}

async function setzeK(page: Page, k: number): Promise<void> {
  const regler = page.getByLabel('Anzahl der Treffer k');
  await regler.focus();
  await regler.press('Home');
  for (let i = 1; i < k; i += 1) await regler.press('ArrowRight');
  await expect(page.getByText(`k = ${k}`, { exact: true })).toBeVisible();
}

test('Das Modul erscheint in der Bibliothek, ein unbekanntes Lab nicht', async ({ page }) => {
  await anmelden(page);
  await page.goto('/lernen');
  await expect(page.getByRole('heading', { name: 'Embeddings & semantische Suche' })).toBeVisible();
  for (const titel of [
    'Vektoren und Embeddings',
    'Ähnlichkeit berechnen',
    'Semantisches Retrieval',
    'Retrieval richtig beurteilen',
  ]) {
    await expect(page.getByRole('link', { name: titel })).toBeVisible();
  }

  await page.goto('/labs');
  await expect(page.getByRole('link', { name: /Semantische Suche verstehen/ })).toBeVisible();

  // Ein unbekannter Lab-Slug wird nicht als gültig behandelt. (Im selben
  // Test, weil jede Registrierung das Kontingent je Herkunft belastet.)
  const antwort = await page.goto('/labs/semantische-suche-lab-gibt-es-nicht');
  expect(antwort?.status()).toBe(404);
});

test('Eine Lektion lässt sich mit Rückmeldung zu den Aufgaben durchlaufen', async ({ page }) => {
  const fehler = beobachteFehler(page);
  await anmelden(page);

  await page.goto('/lektion/aehnlichkeit-berechnen/1');
  await expect(page.getByRole('heading', { name: 'Ähnlichkeit berechnen' })).toBeVisible();
  await page.getByRole('link', { name: 'Weiter' }).click();
  await expect(page.getByText('Kosinus(a, b) = 24 / (5 · 5) = 24 / 25 = 0,96')).toBeVisible();
  await page.getByRole('link', { name: 'Weiter' }).click();

  // Schritt 3: Reihenfolge — mit den Pfeilknöpfen sortieren, kein Ziehen.
  const ziel = [
    'Prüfen, ob beide Vektoren gleich viele Dimensionen haben.',
    'Das Skalarprodukt bilden',
    'Das Skalarprodukt durch das Produkt',
    'Kontrollieren, dass das Ergebnis',
    'Den Wert mit den Werten anderer Dokumente',
  ];
  const zeilen = page.locator('main ol').first().getByRole('listitem');
  await expect(zeilen).toHaveCount(ziel.length);
  for (const [index, text] of ziel.entries()) {
    const aktuell = (await zeilen.allInnerTexts()).findIndex((z) => z.includes(text));
    expect(aktuell, text).toBeGreaterThanOrEqual(index);
    for (let platz = aktuell; platz > index; platz -= 1) {
      await zeilen.nth(platz).getByRole('button', { name: 'Nach oben' }).click();
      // Erst weiter, wenn die Zeile wirklich eine Position nach oben gerückt ist.
      await expect(zeilen.nth(platz - 1)).toContainText(text);
    }
  }
  await page.getByRole('button', { name: 'Reihenfolge abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Weiter' }).click();

  // Schritt 4: Rechenaufgabe — erst mit vergessener Wurzel, dann richtig.
  await expect(page).toHaveURL(/\/lektion\/aehnlichkeit-berechnen\/4$/);
  await page.getByLabel('Summe der Produkte 1·2 + 2·1 + 2·2').fill('8');
  await page.getByLabel('Wurzel aus 1² + 2² + 2²').fill('9');
  await page.getByLabel('Skalarprodukt geteilt durch das Produkt der Längen').fill('8/9');
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Teilweise richtig')).toBeVisible();
  await expect(page.getByText('Vergiss die Wurzel nicht.')).toBeVisible();

  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
  await page.getByLabel('Summe der Produkte 1·2 + 2·1 + 2·2').fill('8');
  await page.getByLabel('Wurzel aus 1² + 2² + 2²').fill('3');
  await page.getByLabel('Skalarprodukt geteilt durch das Produkt der Längen').fill('0,89');
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Weiter' }).click();

  // Schritt 5: Transferaufgabe.
  await page.getByText('Beide Treffer lesen und klären, ob ein Rahmenvertrag vorliegt').click();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Weiter' }).click();

  await expect(page.getByText('Lektion abgeschlossen')).toBeVisible();
  await keineErnstenVerstoesse(page);
  expect(fehler).toEqual([]);
});

test('Das Lab rechnet, rankt, ändert Top-k und speichert den Abschluss', async ({ page }) => {
  const fehler = beobachteFehler(page);
  await anmelden(page);
  await page.goto(LAB_URL);
  await page.waitForLoadState('networkidle');

  // Ab hier: Jede Interaktion bis zum Abschluss läuft im Browser.
  const anfragen: Request[] = [];
  page.on('request', (anfrage) => anfragen.push(anfrage));

  await expect(page.getByText('Didaktische Beispielvektoren', { exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: /Didaktische Beispielvektoren/ })).toBeVisible();

  // Die Urlaubsfrage ist vorausgewählt: Der Scheintreffer liegt vorn.
  await expect(page.getByLabel('Wie beantrage ich Urlaub für eine Reise im August?')).toBeChecked();
  expect((await ranglistenTitel(page)).slice(0, 3)).toEqual([
    'Rückblick Teamausflug',
    'Urlaub beantragen',
    'Krankmeldung',
  ]);
  expect((await ranglistenScores(page)).slice(0, 4)).toEqual(['0,977', '0,932', '0,848', '0,600']);
  await expect(treffer(page)).toHaveCount(3);

  // Top-k verändern.
  await setzeK(page, 1);
  await expect(treffer(page)).toHaveCount(1);
  await expect(treffer(page).first()).toContainText('Rückblick Teamausflug');
  await setzeK(page, 5);
  await expect(treffer(page)).toHaveCount(5);
  await setzeK(page, 3);

  // Rechenweg nachvollziehen.
  await page.getByLabel('Kosinusähnlichkeit der Anfrage zu').selectOption({
    label: 'Urlaub beantragen',
  });
  await expect(page.getByText('0,820 / (0,943 · 0,933) =')).toBeVisible();

  // Suchbestand ändern: Ohne den Teamausflug rückt der Urlaubsantrag vor.
  await page.getByRole('checkbox', { name: /Rückblick Teamausflug/ }).uncheck();
  expect((await ranglistenTitel(page))[0]).toBe('Urlaub beantragen');
  await expect(page.getByRole('button', { name: 'Alle Dokumente wieder aufnehmen' })).toBeVisible();
  await page.getByRole('button', { name: 'Alle Dokumente wieder aufnehmen' }).click();
  expect((await ranglistenTitel(page))[0]).toBe('Rückblick Teamausflug');

  // Kein Abschluss ohne inhaltliche Entscheidung.
  await expect(page.getByRole('button', { name: 'Lab abschließen' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Fachlich relevant?' })).toHaveCount(0);

  // Entscheidung 1: erst der Scheintreffer, dann die richtige Antwort.
  const erste = page.getByRole('group', { name: /Welches Dokument beantwortet/ });
  await erste.getByLabel('Rückblick Teamausflug — er hat den höchsten Score.').check();
  await erste.getByRole('button', { name: 'Entscheidung prüfen' }).click();
  await expect(erste.getByText('Noch nicht', { exact: true })).toBeVisible();
  await erste.getByLabel('Urlaub beantragen — Platz 2.').check();
  await erste.getByRole('button', { name: 'Entscheidung prüfen' }).click();
  await expect(erste.getByText('Richtig', { exact: true })).toBeVisible();

  // Jetzt erscheint das fachliche Urteil neben der mathematischen Nähe.
  await expect(page.getByRole('columnheader', { name: 'Fachlich relevant?' })).toBeVisible();
  await expect(page.getByText('Irreführender Treffer', { exact: true })).toBeVisible();
  // k = 3, alle drei über der Schwelle, eins davon relevant: 1/3 und 1/1.
  await expect(page.getByText(/Precision 0,33, Recall 1,00/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lab abschließen' })).toHaveCount(0);

  // Entscheidung 2: fehlende Treffer.
  const zweite = page.getByRole('group', { name: /Kantine/ });
  await zweite
    .getByRole('button', { name: 'Anfrage „Was gibt es heute in der Kantine zu essen?“ anzeigen' })
    .click();
  await expect(page.getByText('Kein ausreichend ähnlicher Treffer')).toBeVisible();
  await zweite.getByLabel(/Offen melden, dass im Suchbestand nichts Passendes steht/).check();
  await zweite.getByRole('button', { name: 'Entscheidung prüfen' }).click();
  await expect(zweite.getByText('Richtig', { exact: true })).toBeVisible();

  // Bis hierher: kein Schreibzugriff, kein Aufruf an einen fremden Host.
  const herkunft = new URL(page.url()).origin;
  expect(anfragen.filter((a) => a.method() !== 'GET').map((a) => a.url())).toEqual([]);
  expect(anfragen.filter((a) => new URL(a.url()).origin !== herkunft).map((a) => a.url())).toEqual(
    [],
  );

  // Abschluss über die bestehende Server Action.
  const abschluss = page.waitForRequest((a) => a.method() === 'POST');
  await page.getByRole('button', { name: 'Lab abschließen' }).click();
  expect(new URL((await abschluss).url()).pathname).toBe(LAB_URL);
  await expect(page.getByText('✓ Lab abgeschlossen.')).toBeVisible();

  // Der Abschluss ist gespeichert, nicht nur angezeigt.
  await page.goto('/labs');
  await expect(
    page.getByRole('link', { name: /Semantische Suche verstehen/ }).getByText('Abgeschlossen'),
  ).toBeVisible();
  // Andere Labs bleiben offen.
  await expect(
    page.getByRole('link', { name: /Tokenizer-Lab/ }).getByText('Abgeschlossen'),
  ).toHaveCount(0);

  expect(fehler).toEqual([]);
});

test('Das Lab ist vollständig mit der Tastatur bedienbar', async ({ page }) => {
  const fehler = beobachteFehler(page);
  await anmelden(page);
  await page.goto(LAB_URL);

  // Anfrage per Pfeiltaste wechseln (native Radiogruppe).
  const urlaub = page.getByLabel('Wie beantrage ich Urlaub für eine Reise im August?');
  await urlaub.focus();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByLabel('Bis wann muss ich die Belege einer Dienstreise abgeben?'),
  ).toBeChecked();
  expect((await ranglistenTitel(page))[0]).toBe('Reisekosten abrechnen');

  // Sichtbarer Fokus.
  const fokussiert = page.getByLabel('Bis wann muss ich die Belege einer Dienstreise abgeben?');
  const umriss = await fokussiert.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(umriss).not.toBe('none');

  // Top-k per Tastatur.
  await setzeK(page, 2);
  await expect(treffer(page)).toHaveCount(2);

  // Die Ranglistenzusammenfassung steht für Screenreader bereit.
  await expect(page.getByRole('status').filter({ hasText: 'Top-2 für „Bis wann' })).toHaveText(
    /1\. Reisekosten abrechnen \(0,996\)/,
  );

  // Entscheidung per Tastatur: Knopf fokussieren, Enter, Auswahl, Leertaste.
  const erste = page.getByRole('group', { name: /Welches Dokument beantwortet/ });
  await erste.getByRole('button', { name: /Anfrage „Wie beantrage ich Urlaub/ }).focus();
  await page.keyboard.press('Enter');
  await expect(urlaub).toBeChecked();
  const option = erste.getByLabel('Urlaub beantragen — Platz 2.');
  await option.focus();
  await page.keyboard.press('Space');
  await expect(option).toBeChecked();
  await erste.getByRole('button', { name: 'Entscheidung prüfen' }).focus();
  await page.keyboard.press('Enter');
  await expect(erste.getByText('Richtig', { exact: true })).toBeVisible();

  await keineErnstenVerstoesse(page);
  expect(fehler).toEqual([]);
});

test.describe('bei 375 px Breite', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('bleibt das Lab ohne horizontales Scrollen der Seite lesbar', async ({ page }) => {
    const fehler = beobachteFehler(page);
    await anmelden(page);
    await page.goto(LAB_URL);

    await expect(rangliste(page)).toBeVisible();
    const breite = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(breite).toBeLessThanOrEqual(375);

    // Die breite Rangliste scrollt in ihrem eigenen, per Tastatur
    // erreichbaren Bereich — nicht die ganze Seite.
    const bereich = page.getByRole('region', { name: 'Rangliste (horizontal scrollbar)' });
    await bereich.focus();
    await expect(bereich).toBeFocused();

    await setzeK(page, 4);
    await expect(treffer(page)).toHaveCount(4);
    await keineErnstenVerstoesse(page);

    await page.goto('/lektion/vektoren-und-embeddings/1');
    await expect(page.getByRole('heading', { name: 'Vektoren und Embeddings' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
    expect(fehler).toEqual([]);
  });
});
