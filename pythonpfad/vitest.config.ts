import path from 'node:path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Zwei Testprojekte:
 *  - `unit`  – reine Domainlogik, ohne Datenbank. Läuft in Millisekunden.
 *  - `integration` – Dienste gegen eine echte PostgreSQL-Testdatenbank.
 *
 * Die Trennung sorgt dafür, dass die schnelle Rückmeldung beim Entwickeln
 * erhalten bleibt und die Integrationstests trotzdem echte Abfragen prüfen
 * statt einer Attrappe.
 */
process.loadEnvFile?.(path.join(import.meta.dirname, '.env'));

const serverOnlyStub = {
  // Siehe tests/stubs/server-only.ts
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
          // Integrationstests teilen sich eine Datenbank – deshalb nacheinander.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
