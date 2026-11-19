import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Learning OS ohne konfigurierte Fach-Apps (eigener Testprozess): Kein Pfad
 * darf einen Link bekommen, Status kommen aus dem Katalog, keine Zahlen.
 */
for (const name of ['NEXT_PUBLIC_PYTHONPFAD_URL', 'NEXT_PUBLIC_SQLPFAD_URL', 'NEXT_PUBLIC_AIPFAD_URL', 'NEXT_PUBLIC_GITPFAD_URL']) {
  delete process.env[name];
}
const os = await import('./learning-os.ts');

test('vier Pfadzeilen in fester Reihenfolge, ohne Adresse kein Link', () => {
  assert.deepEqual(
    os.LEARNING_OS_TRACKS.map((track) => track.slug),
    ['python', 'sql', 'git', 'ai'],
  );
  for (const track of os.LEARNING_OS_TRACKS) {
    assert.equal(track.href, undefined, `${track.slug}: kein toter Link`);
    assert.equal('href' in track, false, `${track.slug}: auch kein leeres href-Feld`);
  }
  assert.equal(os.LEARNING_OS_SQL_HREF, undefined);
});

test('Status und Namen stammen aus dem Katalog', () => {
  assert.deepEqual(
    os.LEARNING_OS_TRACKS.map((track) => [track.appName, track.statusLabel]),
    [
      ['PythonPfad', 'Verfügbar'],
      ['SQLPfad', 'Verfügbar'],
      ['Git & GitHub', 'Verfügbar'],
      ['AIPfad', 'In Ausbau'],
    ],
  );
});

test('geplante Pfade nur als Liste, ohne Link; VokabelPfad bleibt der lokale MVP im Hub', () => {
  assert.deepEqual(
    os.LEARNING_OS_PLANNED.map((path) => [path.slug, path.statusLabel]),
    [
      ['typescript', 'Geplant'],
      ['data-analytics', 'Geplant'],
      ['automation', 'Geplant'],
      ['security', 'Geplant'],
    ],
  );
  for (const path of os.LEARNING_OS_PLANNED) assert.equal('href' in path, false);
  assert.deepEqual(os.LEARNING_OS_VOCAB, { href: '/vokabeln', statusLabel: 'Lokaler MVP' });
});

test('keine erfundenen Fortschritts- oder Leistungswerte in den Pfadtexten', () => {
  for (const track of os.LEARNING_OS_TRACKS) {
    const text = [track.name, track.category, track.description, track.statusLabel].join(' ');
    assert.doesNotMatch(text, /\d+\s*%|\bXP\b|Punkte|Level\s*\d/i, track.slug);
  }
});

test('empfohlene Reihenfolge wie in der Roadmap: Einstieg Python → SQL → AI, Fachbereich SQL → AI', () => {
  assert.deepEqual(
    os.LEARNING_OS_ROUTES.map((route) => [route.id, route.steps.map((step) => step.slug)]),
    [
      ['einstieg', ['python', 'sql', 'ai']],
      ['fachbereich', ['sql', 'ai']],
    ],
  );
  // Git & GitHub begleitet den Einstieg von der ersten Woche an.
  const einstieg = os.LEARNING_OS_ROUTES.find((route) => route.id === 'einstieg');
  assert.match(einstieg?.companion.text ?? '', /Git & GitHub/);
  assert.match(einstieg?.companion.text ?? '', /ersten Woche/);
});

test('jeder Schritt begründet seine Stelle; Namen und Status aus dem Katalog', () => {
  for (const route of os.LEARNING_OS_ROUTES) {
    for (const step of route.steps) {
      assert.ok(step.why.length > 40, `${route.id}/${step.slug}: Begründung fehlt`);
      assert.doesNotMatch(step.why, /\d+\s*%|\bXP\b|Punkte|Level\s*\d/i, `${route.id}/${step.slug}`);
    }
  }
  assert.deepEqual(
    os.LEARNING_OS_ROUTES[0]?.steps.map((step) => [step.appName, step.statusLabel]),
    [
      ['PythonPfad', 'Verfügbar'],
      ['SQLPfad', 'Verfügbar'],
      ['AIPfad', 'In Ausbau'],
    ],
  );
});

test('ohne konfigurierte Apps: kein Startlink, kein Git-Link – nur der Hinweis', () => {
  for (const route of os.LEARNING_OS_ROUTES) {
    assert.equal('href' in route.start, false, `${route.id}: kein toter Startlink`);
    assert.equal('href' in route.companion, false, `${route.id}: kein toter Begleitlink`);
  }
});
