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
