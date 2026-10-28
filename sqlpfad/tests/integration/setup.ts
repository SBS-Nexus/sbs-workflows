import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { beforeAll } from 'vitest';

/**
 * Integrationstests gegen eine echte PostgreSQL-Plattformdatenbank (LP-05B).
 *
 * Nicht zu verwechseln mit dem Projekt `sql`, das den SQL-Server-Motor für
 * Lernenden-Abfragen prüft. Hier geht es um die Plattformdatenbank (Konten,
 * Fortschritt, Inhalte) — dieselbe Bauweise wie in PythonPfad und AIPfad:
 * Schema anwenden, Inhalte seeden, dann gegen echte Zeilen prüfen.
 *
 * Ohne `TEST_DATABASE_URL` bricht der Lauf ab, statt grün zu melden.
 */
const projectRoot = path.resolve(import.meta.dirname, '..', '..');

const envDatei = path.join(projectRoot, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL ist nicht gesetzt. Integrationstests brauchen eine eigene Testdatenbank. Vorlage: .env.example',
  );
}

// Alle Module, die DATABASE_URL lesen, greifen dadurch auf die Testdatenbank zu.
process.env.DATABASE_URL = testDatabaseUrl;
process.env.AUTH_SECRET ??= 'testschluessel-nur-fuer-automatisierte-tests-0000';

beforeAll(() => {
  execSync('npx prisma migrate deploy', {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'pipe',
  });

  execSync('npx tsx prisma/seed.ts', {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'pipe',
  });
}, 180_000);
