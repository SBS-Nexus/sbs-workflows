import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vorerst nur Unit-Tests.
 *
 * Die SQL-Integrationstests brauchen einen echten SQL Server. Sie kommen in
 * ein eigenes Projekt, sobald der Runner steht - gemockt bewiesen sie nichts
 * über SQL-Server-Semantik.
 */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    projects: [
      {
        resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
    ],
  },
});
