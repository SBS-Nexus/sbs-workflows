import { expect, test, type Page } from '@playwright/test';

/**
 * Die Wiederholungsplanung auf dem ganzen Weg.
 *
 * Die Rechnung selbst ist in `tests/unit/sm2.test.ts` gegen die
 * veröffentlichten Zahlen von SM-2 geprüft. Was dort **nicht** geprüft werden
 * kann, ist die Kette dahinter: dass ein Versuch tatsächlich einen Termin
 * schreibt, dass `ConceptMastery` gefüllt wird, dass die Wiederholungsseite ihn
 * wiederfindet und dass sie zum Konzept eine passende Aufgabe zeigt.
 *
 * Diese Kette hat vier Glieder in drei Dateien. Reißt eines, sieht die
 * Anwendung völlig unauffällig aus: Die Wiederholungsseite ist dann einfach
 * leer – und „nichts offen" ist genau die Meldung, die man auch im Normalfall
 * erwartet. Ohne diesen Test fiele der Ausfall niemandem auf.
 */

function neueAdresse(): string {
  return `e2e-wdh-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
}

const PASSWORT = 'nordwind-treppe-hafen-41';

async function meldeAn(page: Page): Promise<void> {
  await page.goto('/registrieren');
  await page.fill('#name', 'Testerin Wiederholung');
  await page.fill('#email', neueAdresse());
  await page.fill('#password', PASSWORT);
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.check('input[name=experience][value=READS_QUERIES]');
  await page.check('input[name=learningGoal][value=REPORTING]');
  await page.getByText('30 Minuten').click();
  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
}

const LEKTION = '/lernen/lektion-was-steht-in-einer-tabelle';

test('ohne einen einzigen Versuch steht dort kein Rückstand', async ({ page }) => {
  await meldeAn(page);
  await page.goto('/wiederholen');

  // `EmptyState` setzt den Titel als Absatz, nicht als Überschrift - deshalb
  // hier getByText und keine Rollenabfrage.
  await expect(page.getByText('Nichts offen')).toBeVisible();
  // Der Satz ist der eigentliche Gegenstand: Eine leere Seite darf sich nicht
  // wie ein Versäumnis lesen.
  await expect(page.getByText('das ist kein Rückstand')).toBeVisible();
});

test('ein bearbeiteter Versuch erzeugt einen Termin und die Seite findet ihn', async ({ page }) => {
  await meldeAn(page);
  await page.goto(LEKTION);

  const aufgabe = page
    .locator('li')
    .filter({ has: page.getByRole('radio') })
    .first();
  await expect(aufgabe).toBeVisible();

  await aufgabe.getByRole('radio').first().check();
  await aufgabe.getByRole('button', { name: /Antwort abgeben/i }).click();
  await expect(aufgabe.getByText(/Stimmt|Noch nicht|Fast/)).toBeVisible();

  await page.goto('/wiederholen');

  /*
   * Zwei Ausgänge sind möglich, und beide sind richtig - welche Option die
   * erste ist, legt der Lehrplan fest und nicht dieser Test:
   *
   *   richtig geraten -> Termin in einem Tag, heute steht nichts an
   *   danebengelegen  -> Termin sofort, das Konzept steht heute an
   *
   * Was in **beiden** Fällen gelten muss: Es gibt jetzt einen Termin. Vor dem
   * Versuch gab es keinen, und der leere Zustand sagte das auch anders.
   * Deshalb wird hier auf genau diesen Unterschied geprüft und nicht auf einen
   * der beiden Ausgänge - ein Test, der einen davon erzwingt, wäre beim
   * nächsten Lehrplanwechsel rot, ohne dass etwas kaputt wäre.
   */
  const stehtAn = page.getByText(/steht heute an|stehen heute an/);
  const naechsterTermin = page.getByText(/Der nächste Termin:/);

  await expect(stehtAn.or(naechsterTermin)).toBeVisible();

  // Und in keinem der beiden Fälle darf noch die Meldung für „noch nie etwas
  // bearbeitet" stehen - die wäre nach einem Versuch schlicht falsch.
  await expect(page.getByText('das ist kein Rückstand')).toBeHidden();
});

test('die angesehene Lösung lässt das Konzept sofort wieder anstehen', async ({ page }) => {
  /*
   * Der Fall, an dem sich zeigt, ob die Planung das Ergebnis wirklich
   * auswertet: Eine angesehene Lösung geht als Güte 0 ein. Würde sie wie ein
   * gelöster Versuch behandelt, verschwände das Konzept für einen Tag - und
   * zwar genau das Konzept, bei dem die Lernende gerade aufgegeben hat.
   */
  await meldeAn(page);
  await page.goto(LEKTION);

  /*
   * Die Aufgabe über ihre **Position** ansprechen, nicht über einen Knopf
   * darin.
   *
   * Beide naheliegenden Locator sind hier Fallen: „Lösung ansehen" verschwindet
   * durch den eigenen Klick, und „Ich brauche einen Hinweis" heißt ab dem
   * zweiten Klick „Noch einen Hinweis". Ein Locator, den die eigene
   * Interaktion ungültig macht, trifft danach eine andere Aufgabe oder gar
   * keine – und die Fehlermeldung nennt nicht den Grund. Die Position in der
   * Aufgabenliste ändert sich durch nichts davon.
   */
  const aufgaben = page
    .getByRole('region', { name: 'Aufgaben' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3 }) });

  let index = -1;
  for (let i = 0; i < (await aufgaben.count()); i += 1) {
    if (
      await aufgaben
        .nth(i)
        .getByRole('button', { name: /Lösung ansehen/i })
        .isVisible()
    ) {
      index = i;
      break;
    }
  }
  expect(index, 'in dieser Lektion gibt es keine Aufgabe mit Musterlösung').toBeGreaterThanOrEqual(
    0,
  );

  const sqlAufgabe = aufgaben.nth(index);

  // Die Hinweisleiter ganz durchklicken - vorher ist die Lösung gesperrt.
  const hinweisKnopf = sqlAufgabe.getByRole('button', { name: /Hinweis/i });
  for (let runde = 0; runde < 8 && (await hinweisKnopf.isVisible()); runde += 1) {
    await hinweisKnopf.click();
  }
  await expect(sqlAufgabe.getByText('Mehr Hinweise gibt es nicht')).toBeVisible();

  await sqlAufgabe.getByRole('button', { name: /Lösung ansehen/i }).click();

  /*
   * Auf Seitenebene prüfen, nicht in `sqlAufgabe`: Nur eine Lösung ist offen,
   * und der Aufgaben-Locator hängt an einem Knopf, den der Klick entfernt.
   * Zusätzlich die Gegenprobe auf die Sperre - stünde sie da, hätte die
   * Hinweisleiter nicht funktioniert und der Test prüfte etwas anderes, als er
   * behauptet.
   */
  await expect(page.getByText('Noch nicht', { exact: true })).toBeHidden();
  await expect(page.getByText('Musterlösung').first()).toBeVisible();

  await page.goto('/wiederholen');
  await expect(page.getByText(/steht heute an|stehen heute an/)).toBeVisible();
});
