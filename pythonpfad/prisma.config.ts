import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 liest die Konfiguration aus dieser Datei statt aus package.json und
 * lädt `.env` nicht mehr automatisch – deshalb hier explizit.
 *
 * Seit Prisma 7 wird die Verbindungszeichenfolge nicht mehr im Schema
 * hinterlegt. Die Anwendung selbst verbindet sich über den Treiber-Adapter
 * (`@prisma/adapter-pg`, siehe src/server/db/prisma.ts); Migrationen nutzen die
 * hier angegebene URL.
 */
process.loadEnvFile?.(path.join(import.meta.dirname, '.env'));

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
