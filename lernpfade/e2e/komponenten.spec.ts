import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations, gotoVocab } from './helpers';
import {
  AKZENT,
  erwarte404,
  erwarteEinsinken,
  erwarteFokusring,
  erwarteFortschritt,
  erwarteGesperrt,
  erwarteLeerzustand,
  erwarteOhneUebergang,
  erwarteTragenderKnopf,
  horizontalOverflow,
  messe,
} from './komponenten-pruefung';

/**
 * LP-03C — Button, ProgressBar, EmptyState und ErrorState im Hub aus dem
 * gemeinsamen Komponentenvertrag, geprüft am echten VokabelPfad (lokal im
 * Browser, keine Anfragen nach außen) und an der neuen 404-Seite. Der Hub ist
 * nur hell; sein Pfad-Akzent ist Indigo.
 */

const SHOTS = 'test-results/screenshots';

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

const STARTER = 'Englisch: Alltag & Arbeit';

test('VokabelPfad leer: kompakte Leerzustände, Knöpfe im Hub-Akzent mit Unterkante', async ({ page }) => {
  for (const breite of [375, 1280]) {
    await page.setViewportSize({ width: breite, height: 900 });
    await gotoVocab(page);
    const leer = page.locator('.lp-ui-empty[data-lp-size="compact"]');
    await expect(leer).toHaveCount(2);
    await erwarteLeerzustand(leer.nth(0), 'start', `Daily Review leer ${breite}`);
    await erwarteLeerzustand(leer.nth(1), 'start', `Decks leer ${breite}`);
    await expect(leer.nth(1).locator('.lp-ui-empty-title')).toHaveText('Noch keine Decks');

    const anlegen = page.getByRole('button', { name: 'Deck anlegen' });
    await erwarteTragenderKnopf(anlegen, AKZENT.hub.light!, `Deck anlegen ${breite}`);
    await erwarteEinsinken(page, anlegen, `Deck anlegen ${breite}`);
    await erwarteFokusring(page, anlegen, `Deck anlegen ${breite}`);

    const uebernehmen = page.getByRole('button', { name: `Als eigenes Deck übernehmen: ${STARTER}` });
    await expect(uebernehmen).toHaveAttribute('data-lp-variant', 'secondary');
    const m = await messe(uebernehmen);
    expect(m.edgeWidth, 'Unterkante auch sekundär').toBe(4);
    expect(m.contrast).toBeGreaterThanOrEqual(4.5);

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await bild(page, `komponenten-hub-vokabeln-${breite}`);
  }
  await expectNoSeriousA11yViolations(page, '/vokabeln leer');
});

test('Übernommenes Starterdeck: gesperrter Knopf ist flach, Session zeigt „0 von n"', async ({ page }) => {
  await gotoVocab(page);
  await page.getByRole('button', { name: `Als eigenes Deck übernehmen: ${STARTER}` }).click();
  const bereits = page.getByRole('button', { name: `Bereits übernommen: ${STARTER}` });
  await erwarteGesperrt(page, bereits, 'Bereits übernommen');

  await page.getByRole('button', { name: 'Session starten' }).click();
  const balken = page.locator('.lp-ui-progress');
  await erwarteFortschritt(balken, /^0 von \d+$/, 'Session');
  await expect(balken).toHaveAttribute('aria-label', /^0 von \d+ Abfragen bewertet$/);
  await page.getByRole('button', { name: 'Antwort zeigen' }).click();
  await page.getByRole('button', { name: /^Gut/ }).click();
  await expect(balken).toHaveAttribute('aria-valuetext', /^1 von \d+$/);
  await bild(page, 'komponenten-hub-session-1280');
});

test('Bewegung reduzieren: kein Übergang, Einsinken bleibt', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoVocab(page);
  const anlegen = page.getByRole('button', { name: 'Deck anlegen' });
  await erwarteOhneUebergang(anlegen, 'System');
  await erwarteEinsinken(page, anlegen, 'System, reduziert');
});

test('Unbekannte Adresse: 404 mit gemeinsamem Fehlerzustand statt englischer Vorgabe', async ({ page }) => {
  for (const breite of [375, 1280]) {
    await page.setViewportSize({ width: breite, height: 800 });
    const zustand = await erwarte404(page, '/gibt-es-nicht-lp03c', `404 ${breite}`);
    await expect(page.getByText('This page could not be found')).toHaveCount(0);
    await erwarteTragenderKnopf(zustand.getByRole('link', { name: 'Alle Pfade' }), AKZENT.hub.light!, `404 ${breite}`);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await expectNoSeriousA11yViolations(page, `404 ${breite}`);
    await bild(page, `komponenten-hub-404-${breite}`);
  }
});
