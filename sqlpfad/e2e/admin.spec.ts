import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

/**
 * Der Redaktionsbereich und wer ihn sieht.
 *
 * Zwei Dinge werden hier geprüft, und das erste ist das wichtigere: dass eine
 * **Lernende ihn nicht sieht**. Ein Adminbereich, der sich durch Eintippen der
 * Adresse öffnet, ist kein Adminbereich – und der Fehler fällt niemandem auf,
 * weil die Leiste den Link ja gar nicht anbietet.
 *
 * Die Rolle lässt sich über die Oberfläche nicht vergeben; das ist Absicht
 * (siehe `scripts/konto-anlegen.ts`). Für den zweiten Fall wird sie deshalb
 * direkt in der Datenbank gesetzt – auf demselben Weg, den auch das Skript
 * geht. Ohne diesen Griff wäre der Adminbereich hier gar nicht erreichbar und
 * bliebe ungeprüft.
 */

function neueAdresse(): string {
  return `e2e-admin-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
}

const PASSWORT = 'nordwind-treppe-hafen-41';

async function meldeAn(page: Page): Promise<string> {
  const adresse = neueAdresse();
  await page.goto('/registrieren');
  await page.fill('#name', 'Testerin Redaktion');
  await page.fill('#email', adresse);
  await page.fill('#password', PASSWORT);
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.check('input[name=experience][value=READS_QUERIES]');
  await page.check('input[name=learningGoal][value=REPORTING]');
  await page.getByText('30 Minuten').click();
  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);

  return adresse;
}

async function macheZuAdmin(adresse: string): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const ergebnis = await client.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1`, [
      adresse,
    ]);
    // Ohne diese Prüfung liefe der Test weiter und meldete „Lernende sehen den
    // Bereich nicht" - obwohl die Rolle schlicht nie gesetzt wurde.
    expect(ergebnis.rowCount, 'die Rolle wurde an keinem Konto gesetzt').toBe(1);
  } finally {
    await client.end();
  }
}

test('eine Lernende sieht die Redaktion nicht – auch nicht über die Adresse', async ({ page }) => {
  await meldeAn(page);

  await expect(page.getByRole('link', { name: 'Redaktion' })).toBeHidden();

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/fortschritt$/);
  await expect(page.getByRole('heading', { name: 'Redaktion' })).toBeHidden();
});

test('eine Adminsitzung sieht den Stand der Inhalte', async ({ page }) => {
  const adresse = await meldeAn(page);
  await macheZuAdmin(adresse);

  await page.reload();
  await page.getByRole('link', { name: 'Redaktion' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await expect(page.getByRole('heading', { name: 'Redaktion', level: 1 })).toBeVisible();

  /*
   * Der Abgleich ist der Grund, warum es diese Seite gibt: Dateien gegen
   * Datenbank. Er muss aufgehen - der Seed lief vor diesem Testlauf, und wenn
   * er es nicht tut, ist das ein echter Befund und kein Testfehler.
   */
  await expect(page.getByRole('heading', { name: 'Dateien gegen Datenbank' })).toBeVisible();

  /*
   * Erst die Gegenprobe, dann die eigentliche Aussage.
   *
   * „‚weicht ab' ist nicht sichtbar" wäre für sich genommen auch dann grün,
   * wenn die Spalte überhaupt nicht rendert - also genau dann, wenn der
   * Abgleich kaputt ist. Die fünf „gleich"-Marken davor schließen das aus:
   * Sie beweisen, dass die Spalte da ist und ihre beiden Werte kennt.
   */
  await expect(page.getByText('gleich', { exact: true })).toHaveCount(5);
  await expect(page.getByText('weicht ab')).toBeHidden();

  // Der Validator ist derselbe, den der Seed ausführt.
  await expect(page.getByText('Ohne Befund')).toBeVisible();
});

test('die Redaktion nennt keine einzelnen Lernenden', async ({ page }) => {
  /*
   * Die Zusicherung, die im Kopf der Seite steht, hier nachgeprüft: Zählungen
   * ja, Namen und Adressen nein. Wer später eine Tabelle „letzte Versuche"
   * ergänzt, soll hier stolpern und nicht erst in der
   * Datenschutzfolgenabschätzung.
   */
  const adresse = await meldeAn(page);
  await macheZuAdmin(adresse);

  await page.goto('/admin');
  const inhalt = await page.content();

  expect(inhalt).not.toContain(adresse);
  expect(inhalt).not.toContain('Testerin Redaktion');
});
