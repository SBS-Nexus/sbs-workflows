import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Zwei Testprojekte, streng getrennt.
 *
 * `unit` läuft überall und in Millisekunden. `sql` braucht einen echten SQL
 * Server und wird ohne Zugangsdaten übersprungen statt bestanden – die
 * Begründung steht in tests/sql/motor.integration.test.ts.
 *
 * Die Trennung ist Absicht: Läge beides in einem Projekt, würde ein Lauf ohne
 * Server grün melden und dabei die Hälfte dessen verschweigen, was er hätte
 * prüfen sollen.
 */
const alias = {
  '@': path.resolve(import.meta.dirname, 'src'),
  /*
   * `server-only` wirft beim Import außerhalb einer Server-Umgebung – genau
   * das ist sein Zweck. In Vitest gibt es diese Umgebung nicht, und der
   * Motor ließe sich sonst gar nicht importieren. Siehe tests/stubs.
   */
  'server-only': path.resolve(import.meta.dirname, 'tests/stubs/server-only.ts'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        resolve: { alias },
        test: {
          name: 'sql',
          include: ['tests/sql/**/*.test.ts'],
          environment: 'node',
          // Ein Server, eine Testdatenbank: parallele Läufe würden sich
          // gegenseitig die Datenbank unter den Füßen wegziehen.
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 180_000,
        },
      },
    ],
  },
});
