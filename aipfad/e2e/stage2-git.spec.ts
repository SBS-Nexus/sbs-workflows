import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-End-Abdeckung der Ausbaustufe 2.
 *
 * Geprüft wird der Weg, den eine lernende Person tatsächlich nimmt: Modul
 * finden, Lektion durcharbeiten, die neuen Aufgabenformen beantworten, die
 * Labs bedienen und den Fortschritt wiederfinden.
 */

async function registerAndOnboard(page: Page): Promise<void> {
  const email = `e2e-stage2-${Date.now()}-${Math.random().toString(36).slice(2)}@aipfad-test.local`;
  await page.goto('/registrieren');
  await page.getByLabel('Name').fill('Stage-2-Test');
  await page.getByLabel('E-Mail-Adresse').fill(email);
  await page.getByLabel('Passwort').fill('ein-sehr-sicheres-testpasswort-123');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page).toHaveURL(/\/pfad$/);
}

test('Die Git-Module erscheinen in der Bibliothek', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/lernen');

  await expect(page.getByRole('heading', { name: 'Git — die Grundlagen' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Git & GitHub — zusammenarbeiten' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Die drei Orte einer Datei' })).toBeVisible();
});

test('Eine Git-Lektion lässt sich mit den neuen Aufgabenformen abschließen', async ({ page }) => {
  await registerAndOnboard(page);

  // Schritt 1 und 2 sind Ziel und Beispiel, danach folgen die Aufgaben.
  await page.goto('/lektion/die-drei-orte/3');

  // Einsortier-Aufgabe: je Element eine Auswahlliste, kein Ziehen-und-Ablegen.
  await page
    .getByLabel('Kategorie für notizen.txt — neu angelegt, noch kein git add')
    .selectOption({ label: 'unversioniert' });
  await page
    .getByLabel('Kategorie für liesmich.md — im Editor geändert, kein git add')
    .selectOption({ label: 'geändert' });
  await page
    .getByLabel('Kategorie für preise.md — geändert und anschließend git add ausgeführt')
    .selectOption({ label: 'vorgemerkt' });
  await page
    .getByLabel('Kategorie für lizenz.txt — seit dem letzten Commit nicht angefasst')
    .selectOption({ label: 'unverändert' });

  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();

  // Weiter zur Interpretationsaufgabe: sie zeigt einen git-status-Zustand.
  await page.getByRole('link', { name: 'Weiter' }).click();
  await expect(page).toHaveURL(/\/lektion\/die-drei-orte\/4$/);
  await expect(page.getByText('Du führst jetzt git commit aus.')).toBeVisible();

  await page
    .getByText('Nur preise.md, und zwar in der Fassung von vor der letzten Bearbeitung.')
    .click();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();

  // Abschluss der Lektion.
  await page.getByRole('link', { name: 'Weiter' }).click();
  await expect(page.getByText('Lektion abgeschlossen')).toBeVisible();
});

test('Das Git-State-Lab zeigt die drei Orte und führt Befehle aus', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/labs/git-state-lab');

  await expect(page.getByRole('heading', { name: 'Arbeitsverzeichnis' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Staging Area' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Repository' })).toBeVisible();

  const eingabe = page.getByLabel('Git-Befehl eingeben');
  async function befehl(text: string): Promise<void> {
    await eingabe.fill(text);
    await eingabe.press('Enter');
    await expect(eingabe).toHaveValue('');
  }

  await befehl('git status');
  await expect(page.getByText('Unversionierte Dateien:')).toBeVisible();

  // Eine Datei ändern, vormerken, erneut ändern — der doppelte Zustand.
  await page.getByRole('button', { name: 'preise.md ändern' }).click();
  await befehl('git add preise.md');
  await page.getByRole('button', { name: 'preise.md nochmals ändern' }).click();

  await expect(page.getByText('Zwei Fassungen derselben Datei')).toBeVisible();

  await befehl('git commit -m "Preis angepasst"');
  await expect(page.getByText(/Datei\(en\) geändert/)).toBeVisible();
});

test('Das Branch-Lab zeichnet den Graphen und unterscheidet die Merge-Arten', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/labs/branch-lab');

  const eingabe = page.getByLabel('Git-Befehl eingeben');
  async function befehl(text: string): Promise<void> {
    await eingabe.fill(text);
    await eingabe.press('Enter');
    await expect(eingabe).toHaveValue('');
  }

  await befehl('git switch -c feature/anmeldung');
  await expect(page.getByText('Zu neuem Branch "feature/anmeldung" gewechselt.')).toBeVisible();

  await befehl('git commit -m "Anmeldeformular"');
  await befehl('git switch main');

  // Ohne eigenen Commit auf main wäre das ein Fast-Forward.
  await expect(page.getByText(/ein Fast-Forward/)).toBeVisible();

  await befehl('git commit -m "Tippfehler behoben"');
  // Jetzt sind beide Linien auseinandergelaufen.
  await expect(page.getByText(/einen Merge-Commit mit zwei Eltern/)).toBeVisible();

  await befehl('git merge feature/anmeldung');
  await expect(page.getByText(/Merge-Commit .* angelegt/)).toBeVisible();
  await expect(page.getByText('(Merge-Commit, zwei Eltern)')).toBeVisible();
});

test('Das Merge-Konflikt-Lab führt durch auflösen, vormerken und committen', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/labs/merge-conflict-lab');

  // Die Marker stehen sichtbar in der Datei — je Konfliktstelle einmal.
  await expect(page.getByText('<<<<<<< main').first()).toBeVisible();
  await expect(page.getByText('>>>>>>> feature/preise').first()).toBeVisible();
  await expect(page.getByText('<<<<<<< main')).toHaveCount(2);

  // Vor dem Auflösen lässt sich nichts vormerken.
  await page.getByRole('button', { name: 'git add preise.md' }).click();
  await expect(page.getByText('Es sind noch Konfliktstellen offen.')).toBeVisible();

  // Beide Stellen entscheiden.
  const k1 = page.getByRole('group', { name: /Konfliktstelle k1/ });
  await k1.getByRole('button', { name: 'Ihre übernehmen' }).click();
  const k2 = page.getByRole('group', { name: /Konfliktstelle k2/ });
  await k2.getByRole('button', { name: 'Beide behalten' }).click();

  // Ohne git add lässt sich der Merge nicht abschließen — der übersprungene Schritt.
  await page.getByRole('button', { name: 'git commit' }).click();
  await expect(page.getByText(/Noch nichts vorgemerkt/)).toBeVisible();

  await page.getByRole('button', { name: 'git add preise.md' }).click();
  await expect(page.getByText('preise.md als aufgelöst vorgemerkt.')).toBeVisible();

  await page.getByRole('button', { name: 'git commit' }).click();
  // Sowohl die Terminalausgabe als auch die Erfolgsmeldung nennen das —
  // die exakte Übereinstimmung trifft die Überschrift der Meldung.
  await expect(page.getByText('Merge abgeschlossen', { exact: true })).toBeVisible();

  // Erst jetzt lässt sich das Lab abschließen.
  await page.getByRole('button', { name: 'Fertig — Lab abschließen' }).click();
  await expect(page.getByText('✓ Lab abgeschlossen.')).toBeVisible();

  await page.goto('/labs');
  const labKarte = page.locator('a', { hasText: 'Merge-Konflikt-Lab' });
  await expect(labKarte.getByText('Abgeschlossen')).toBeVisible();
});

test('Der Fortschritt weist die Git-Lektion aus', async ({ page }) => {
  await registerAndOnboard(page);

  await page.goto('/lektion/warum-versionsverwaltung/3');
  await page
    .getByText('Sie hält zu jedem Stand fest, wer ihn wann und mit welcher Begründung erzeugt hat.')
    .click();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Weiter' }).click();
  await page
    .getByText('Jede arbeitet für sich weiter, danach führt ihr beide Stände zusammen.')
    .click();
  await page.getByRole('button', { name: 'Antwort abgeben' }).click();
  await expect(page.getByText('Richtig', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Weiter' }).click();
  await expect(page.getByText('Lektion abgeschlossen')).toBeVisible();

  await page.goto('/fortschritt');
  // Die Kachel nennt Zähler und Nenner getrennt von der Beschriftung.
  await expect(page.getByText('Lektionen abgeschlossen')).toBeVisible();
  await expect(page.getByText(/^1 von \d+$/)).toBeVisible();
});
