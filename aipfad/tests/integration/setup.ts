import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { beforeAll } from 'vitest';

/**
 * Integrationstests laufen gegen eine echte PostgreSQL-Datenbank, nicht
 * gegen eine Attrappe — nur so werden Fremdschlüssel, Löschregeln,
 * eindeutige Indizes und JSON-Spalten tatsächlich mitgeprüft. Übernommen
 * aus PythonPfad/SQLPfad.
 */
const projectRoot = path.resolve(import.meta.dirname, '..', '..');

const envDatei = path.join(projectRoot, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL ist nicht gesetzt. Vorlage: .env.example');
}

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
    env: { ...process.env, DATABASE_URL: testDatabaseUrl, SEED_DEMO_USERS: 'false' },
    stdio: 'pipe',
  });
}, 180_000);
