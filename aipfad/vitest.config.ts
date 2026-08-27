import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Zwei Testprojekte, übernommen aus PythonPfad/SQLPfad:
 *  - `unit`  – reine Domainlogik, ohne Datenbank. Läuft in Millisekunden.
 *  - `integration` – Dienste gegen eine echte PostgreSQL-Testdatenbank.
 */
const envDatei = path.join(import.meta.dirname, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const serverOnlyStub = {
  'server-only': path.join(import.meta.dirname, 'tests/stubs/server-only.ts'),
};

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: { alias: serverOnlyStub },
  test: {
    globals: false,
    projects: [
      {
        plugins: [tsconfigPaths()],
        resolve: { alias: serverOnlyStub },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        plugins: [tsconfigPaths()],
        resolve: { alias: serverOnlyStub },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['tests/integration/setup.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
