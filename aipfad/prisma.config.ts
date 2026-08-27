import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 liest die Konfiguration aus dieser Datei statt aus package.json und
 * lädt `.env` nicht mehr automatisch. Übernommen aus pythonpfad/sqlpfad,
 * inklusive der Begründung für die Existenzprüfung: `process.loadEnvFile`
 * wirft `ENOENT`, wenn `.env` fehlt (etwa direkt nach `npm install` auf einem
 * frischen Klon, bevor die Datei angelegt wurde, oder in einer
 * Bereitstellungsumgebung ohne lokale `.env`).
 */
const envDatei = path.join(import.meta.dirname, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const verbindungszeichenfolge = process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  ...(verbindungszeichenfolge ? { datasource: { url: verbindungszeichenfolge } } : {}),
});
