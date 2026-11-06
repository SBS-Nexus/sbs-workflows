import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { LEHRPLAN } from '../src/content';

/**
 * Der Weg durch eine Lektion: Stand, gelöste Aufgaben, Abschluss, weiter.
 *
 * Vorher stand jede Aufgabe für sich – kein Stand, kein Abschluss, kein Weg
 * zur nächsten Lektion. Und die Optionen standen in Lehrplanreihenfolge: Die
 * erste Antwort war immer richtig, die Reihenfolge-Aufgabe beim Öffnen gelöst.
 * Diese Datei läuft mit ausgeschaltetem Übungsserver; Schreibaufgaben zählen
 * dann nicht zum Stand.
 */

const PASSWORT = 'nordwind-treppe-hafen-41';
const SHOTS = 'test-results/screenshots';

async function bild(page: Page, bereich: Locator, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await bereich.screenshot({ path: `${SHOTS}/${name}.png` });
}
const LEKTION = LEHRPLAN.module[0]!.lektionen[0]!;
const NAECHSTE = LEHRPLAN.module[0]!.lektionen[1]!;

async function meldeAn(page: Page): Promise<void> {
  const adresse = `e2e-verlauf-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
  await page.goto('/registrieren');
  await page.fill('#name', 'Testerin Muster');
  await page.fill('#email', adresse);
  await page.fill('#password', PASSWORT);
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
}

function karte(page: Page, titel: string): Locator {
  return page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: titel, exact: true }) });
}

const stand = (page: Page): Locator => page.getByRole('progressbar', { name: /Gelöste Aufgaben/ });

test('eine Lektion durcharbeiten: Stand zählt mit, Abschluss führt weiter', async ({ page }) => {
  await meldeAn(page);
  await page.goto(`/lernen/${LEKTION.slug}`);

  // Ohne Übungsserver zählen alle Aufgaben außer den Schreibaufgaben.
  const beurteilbar = LEKTION.aufgaben.filter((a) => a.art !== 'ABFRAGE_SCHREIBEN');
  const gesamt = beurteilbar.length;
  await expect(stand(page)).toHaveAttribute('aria-valuetext', `0 von ${gesamt}`);
  await expect(page.getByText(`0 von ${gesamt} Aufgaben gelöst`)).toBeVisible();

  let geloest = 0;
  for (const aufgabe of beurteilbar) {
    const bereich = karte(page, aufgabe.titel);
    if (aufgabe.art === 'EINFACHAUSWAHL') {
      const nutzlast = aufgabe.nutzlast as { optionen: string[]; richtig: number };
      await bereich.getByRole('radio', { name: nutzlast.optionen[nutzlast.richtig]! }).check();
    } else if (aufgabe.art === 'ERGEBNIS_VORHERSAGEN') {
      await bereich.getByRole('spinbutton').fill(String(aufgabe.erwartetesErgebnis!.zeilen.length));
    } else {
      throw new Error(`Aufgabenart ${aufgabe.art} ist in dieser Prüfung nicht vorgesehen.`);
    }
    await bereich.getByRole('button', { name: /Antwort abgeben/ }).click();
    await expect(bereich.getByText('Stimmt', { exact: true })).toBeVisible();
    await expect(bereich.getByText('Gelöst', { exact: true })).toBeVisible();
    geloest += 1;
    await expect(stand(page)).toHaveAttribute('aria-valuetext', `${geloest} von ${gesamt}`);
  }

  const abschluss = page.getByRole('region', { name: 'Lektion geschafft' });
  await expect(abschluss).toBeVisible();
  await bild(page, abschluss, 'lektionsverlauf-abschluss-1280-light');
  await bild(page, stand(page).locator('xpath=../..'), 'lektionsverlauf-stand-1280-light');
  await expect(page.getByRole('status').filter({ hasText: 'Lektion abgeschlossen.' })).toHaveCount(
    1,
  );
  await expect(stand(page)).toHaveAttribute('data-lp-complete', 'true');

  // Beim Wiederkommen: abgeschlossen, Marken an den gelösten Aufgaben.
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Diese Lektion hast du abgeschlossen' }),
  ).toBeVisible();
  await expect(page.getByText('Gelöst', { exact: true })).toHaveCount(gesamt);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 375, height: 800 });
  await bild(
    page,
    page.getByRole('region', { name: 'Diese Lektion hast du abgeschlossen' }),
    'lektionsverlauf-abschluss-375-dark',
  );

  await page.getByRole('link', { name: `Weiter: ${NAECHSTE.titel}` }).click();
  await expect(page).toHaveURL(new RegExp(`/lernen/${NAECHSTE.slug}$`));
  await expect(page.getByRole('heading', { level: 1, name: NAECHSTE.titel })).toBeVisible();
});

test('eine Reihenfolge-Aufgabe ist beim Öffnen nicht schon gelöst', async ({ page }) => {
  const lektion = LEHRPLAN.module
    .flatMap((modul) => modul.lektionen)
    .find((l) => l.aufgaben.some((a) => a.art === 'REIHENFOLGE'))!;
  const aufgabe = lektion.aufgaben.find((a) => a.art === 'REIHENFOLGE')!;

  await meldeAn(page);
  await page.goto(`/lernen/${lektion.slug}`);
  const bereich = karte(page, aufgabe.titel);
  // Unverändert abgeben: Vorher stand die Lösung schon da.
  await bereich.getByRole('button', { name: /Antwort abgeben/ }).click();
  await expect(bereich.getByText(/Noch nicht|Fast/)).toBeVisible();
  await expect(bereich.getByText('Stimmt', { exact: true })).toHaveCount(0);
});
