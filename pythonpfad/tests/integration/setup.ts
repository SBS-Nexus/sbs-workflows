import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { beforeAll } from 'vitest';

/**
 * Integrationstests laufen gegen eine echte PostgreSQL-Datenbank, nicht gegen
 * eine Attrappe. Nur so werden Fremdschlüssel, Löschregeln, eindeutige Indizes
 * und JSON-Spalten tatsächlich mitgeprüft.
 *
 * Vor dem ersten Test wird das Schema auf die Testdatenbank angewendet und der
 * Inhalt geseedet.
 */
const projectRoot = path.resolve(import.meta.dirname, '..', '..');

/*
 * `.env` nur laden, wenn sie da ist: `process.loadEnvFile` wirft sonst
 * `ENOENT`, und das `?.` fängt das nicht ab. In Bereitstellungsumgebungen
 * stehen die Werte bereits in `process.env`. Ausführlich in prisma.config.ts.
 */
const envDatei = path.join(projectRoot, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL ist nicht gesetzt. Vorlage: .env.example – die Datenbank legt docker-compose automatisch an.',
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
