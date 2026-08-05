import { expect, test } from '@playwright/test';
import { completeOnboarding, freshAccount, register } from './helpers';

/**
 * Der Ladefortschritt der Python-Laufzeit ist gemessen, nicht geschätzt.
 *
 * Warum das einen eigenen Test verdient: Vorher zeigte die Oberfläche ein
 * drehendes Rädchen, während im Hintergrund rund 13 MB liefen. Für jemanden,
 * der zum ersten Mal auf „Ausführen" drückt, ist ein Rädchen, das sich zwanzig
 * Sekunden dreht, kaum von „kaputt" zu unterscheiden – und der häufigste Grund,
 * eine Seite zu schließen.
 *
 * Der Wert entsteht im Worker: Ein eingepacktes `fetch` zählt die Bytes des
 * ausgepackten Antwortstroms gegen die Größen aus `manifest.json`. Diese Kette
 * hat mehrere Glieder, die still reißen können – fehlt das Manifest, ändert
 * sich ein Dateiname, oder gibt der Server plötzlich keinen Strom mehr heraus,
 * dann lädt Python weiterhin einwandfrei, und nur die Anzeige ist wieder tot.
 * Ein Test, der bloß prüft, ob Python irgendwann startet, würde das nie
 * bemerken. Deshalb dieser hier.
 */
test('zeigt beim ersten Laden einen gemessenen Fortschritt', async ({ page }) => {
  /*
   * Im Browser selbst abtasten, nicht über die Fernsteuerung.
   *
   * Die Verbindung zu drosseln wäre hier übrigens wirkungslos: Das ließe sich
   * nur für das Dokument einstellen, der Download läuft aber im Worker und
   * damit in einem eigenen Ziel.
   */
  await page.addInitScript(() => {
    const werte: number[] = [];
    (window as unknown as { __fortschritt: number[] }).__fortschritt = werte;

    // Alle 20 Millisekunden nachsehen – im Browser selbst, nicht über die
    // Fernsteuerung. Der Unterschied entscheidet: Ein Abtasten von außen
    // kostet je Durchgang mehrere Millisekunden Übertragung, und der Download
    // vom lokalen Server ist in Sekundenbruchteilen vorbei. Von innen sind 20
    // Millisekunden ein sicherer Takt.
    window.setInterval(() => {
      const balken = document.querySelector('[aria-label*="Python-Laufzeit"]');
      const roh = balken?.getAttribute('aria-valuenow');
      if (roh === null || roh === undefined) return;
      const zahl = Number(roh);
      if (werte[werte.length - 1] !== zahl) werte.push(zahl);
    }, 20);
  });

  await register(page, freshAccount());
  await completeOnboarding(page);
  await page.goto('/labor');

  await page.getByRole('button', { name: 'Ausführen' }).click();
  await expect(page.getByText(/läuft in deinem Browser/)).toBeVisible({ timeout: 90_000 });

  const werte = await page.evaluate(
    () => (window as unknown as { __fortschritt: number[] }).__fortschritt,
  );

  expect(
    werte.length,
    'Es wurde kein messbarer Fortschritt angezeigt. Vermutlich findet der ' +
      'Worker die Größen in /pyodide/manifest.json nicht mehr, oder der ' +
      'eingepackte fetch reicht den Antwortstrom nicht mehr durch.',
  ).toBeGreaterThanOrEqual(3);

  // Die Werte müssen ansteigen und im gültigen Bereich liegen. Ein Balken, der
  // zurückspringt, wäre schlimmer als keiner – er sähe nach einem Fehler aus.
  for (const [index, wert] of werte.entries()) {
    expect(wert, `Wert ${index}`).toBeGreaterThanOrEqual(0);
    expect(wert, `Wert ${index}`).toBeLessThanOrEqual(100);
    if (index > 0)
      expect(wert, `Wert ${index} springt zurück`).toBeGreaterThanOrEqual(werte[index - 1]!);
  }

  // Und am Ende steht die Anzeige wirklich bei 100 und nicht bei 83.
  expect(werte[werte.length - 1]).toBe(100);
});
