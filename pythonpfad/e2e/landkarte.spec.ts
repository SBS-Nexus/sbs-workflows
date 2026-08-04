import { expect, test } from '@playwright/test';
import { completeOnboarding, freshAccount, register } from './helpers';

/**
 * Wissenslandkarte und Behaltensprognose im Browser.
 *
 * Die Rechnung dahinter ist gesondert geprüft. Hier geht es darum, dass die
 * Darstellung ankommt und ohne Maus bedienbar ist.
 */
test.describe('Wissenslandkarte', () => {
  test.beforeEach(async ({ page }) => {
    await register(page, freshAccount());
    await completeOnboarding(page);
    await page.goto('/fortschritt');
  });

  test('zeigt die Konzepte und erklärt die Leserichtung', async ({ page }) => {
    const karte = page.getByRole('region', { name: 'Wissenslandkarte' });
    await expect(karte).toBeVisible();
    await expect(karte.getByText(/Von links nach rechts gelesen/)).toBeVisible();
    // Der Kurs hat gut drei Dutzend Konzepte; ein paar müssen sichtbar sein.
    await expect(karte.getByRole('button', { name: /^Programm,/ })).toBeVisible();
  });

  test('nennt beim Auswählen Voraussetzungen und Fundort', async ({ page }) => {
    const karte = page.getByRole('region', { name: 'Wissenslandkarte' });
    await karte.getByRole('button', { name: /^Quellcode,/ }).click();

    await expect(karte.getByRole('heading', { name: 'Quellcode', level: 3 })).toBeVisible();
    await expect(karte.getByText(/Setzt voraus:/)).toBeVisible();
    await expect(karte.getByText(/Kommt vor in:/)).toBeVisible();
  });

  test('beschriftet jeden Knoten mit seinem Stand, nicht nur mit Farbe', async ({ page }) => {
    const karte = page.getByRole('region', { name: 'Wissenslandkarte' });
    const knoten = karte.getByRole('button', { name: /^Programm,/ });
    const beschriftung = await knoten.getAttribute('aria-label');
    expect(beschriftung).toMatch(/Kompetenzwert \d+ von 100/);
  });

  test('lässt sich mit der Tastatur auswählen und wieder lösen', async ({ page }) => {
    const karte = page.getByRole('region', { name: 'Wissenslandkarte' });
    const knoten = karte.getByRole('button', { name: /^Programm,/ });
    await knoten.focus();
    await page.keyboard.press('Enter');
    await expect(knoten).toHaveAttribute('aria-pressed', 'true');

    await karte.getByRole('button', { name: 'Auswahl aufheben' }).click();
    await expect(knoten).toHaveAttribute('aria-pressed', 'false');
  });

  test('zeigt die Prognose samt Tabellenfassung', async ({ page }) => {
    const prognose = page.getByRole('region', { name: 'Wie lange bleibt es abrufbar?' });
    await expect(prognose).toBeVisible();
    // Ohne bearbeitete Aufgaben steht dort der Hinweis statt einer Kurve.
    await expect(prognose.getByText(/Sobald du die ersten Aufgaben bearbeitet hast/)).toBeVisible();
  });
});

/**
 * Die Motivationsanzeigen aus derselben Seite.
 *
 * Sie stehen hier statt in einer eigenen Datei, weil sie dieselbe Seite und
 * dasselbe Konto brauchen – ein zweiter Registrierungsdurchlauf für zwei
 * Zusicherungen wäre reine Wartezeit.
 */
test.describe('Lernrhythmus und Meilensteine', () => {
  test.beforeEach(async ({ page }) => {
    await register(page, freshAccount());
    await completeOnboarding(page);
    await page.goto('/fortschritt');
  });

  test('zeigt das Tagesziel ohne Druck', async ({ page }) => {
    const rhythmus = page.getByRole('region', { name: 'Dein Lernrhythmus' });
    await expect(rhythmus).toBeVisible();
    await expect(
      rhythmus.getByText(/Eine Pause ändert nichts an dem, was du schon gelernt hast/),
    ).toBeVisible();

    // Der Ring trägt seinen Wert als Text, nicht nur als Grafik.
    const ring = rhythmus.getByRole('img');
    const beschriftung = await ring.getAttribute('aria-label');
    expect(beschriftung).toMatch(/Tagesziel: \d+ von \d+ Minuten/);
  });

  test('beschriftet jeden Tag der Kalenderleiste vorlesbar', async ({ page }) => {
    const rhythmus = page.getByRole('region', { name: 'Dein Lernrhythmus' });
    await expect(rhythmus.getByText(/: keine Übung$/).first()).toBeVisible();
  });

  test('nennt genau einen nächsten Meilenstein', async ({ page }) => {
    const meilensteine = page.getByRole('region', { name: 'Meilensteine' });
    await expect(meilensteine).toBeVisible();
    await expect(meilensteine.getByText('Als Nächstes erreichbar')).toHaveCount(1);
    await expect(
      meilensteine.getByText(/Jeder steht für eine Fähigkeit, nicht für aufgewendete Zeit/),
    ).toBeVisible();
  });
});
