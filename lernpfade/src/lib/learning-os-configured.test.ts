import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Learning OS mit konfigurierten Fach-Apps (eigener Testprozess): Links nur
 * für gültige http(s)-Adressen, ohne Schrägstrich am Ende; Git folgt dem
 * AIPfad, solange kein eigener GitPfad konfiguriert ist.
 */
process.env.NEXT_PUBLIC_PYTHONPFAD_URL = 'javascript:alert(1)';
process.env.NEXT_PUBLIC_SQLPFAD_URL = 'https://sql.example.test/';
process.env.NEXT_PUBLIC_AIPFAD_URL = 'https://ai.example.test';
delete process.env.NEXT_PUBLIC_GITPFAD_URL;
const os = await import('./learning-os.ts');

const hrefOf = (slug: string): string | undefined => os.LEARNING_OS_TRACKS.find((track) => track.slug === slug)?.href;

test('nur gültige http(s)-Adressen werden zu Links', () => {
  assert.equal(hrefOf('python'), undefined, 'kein javascript:-Link');
  assert.equal(hrefOf('sql'), 'https://sql.example.test');
  assert.equal(hrefOf('ai'), 'https://ai.example.test');
  assert.equal(os.LEARNING_OS_SQL_HREF, 'https://sql.example.test');
});

test('Git & GitHub verweist ohne eigenen GitPfad auf die Git-Lektion im AIPfad', () => {
  assert.equal(hrefOf('git'), 'https://ai.example.test/lektion/warum-versionsverwaltung/1');
});

test('Startlinks der Wege folgen denselben Adressen wie die Pfadzeilen', () => {
  const [einstieg, fachbereich] = os.LEARNING_OS_ROUTES;
  assert.equal(einstieg?.start.href, undefined, 'Python ohne gültige Adresse: kein Startlink');
  assert.equal(fachbereich?.start.href, 'https://sql.example.test');
  assert.equal(einstieg?.companion.href, 'https://ai.example.test/lektion/warum-versionsverwaltung/1');
  assert.equal(einstieg?.companion.linkLabel, 'Git-Grundlagen ansehen');
});
