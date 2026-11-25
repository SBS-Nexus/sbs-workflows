import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * E5.1: Datenbank der Plattform (Organisationen). Wie in den Apps liest
 * Prisma 7 die Konfiguration hier und lädt `.env` nicht selbst; ohne `.env`
 * (Bereitstellung, frischer Klon) wird die Datei übersprungen.
 *
 * Ohne `DATABASE_URL` bleibt der Hub, wie er war: Organisationen sind dann
 * aus (`src/server/organisation/datenbank.ts`).
 */
const envDatei = path.join(import.meta.dirname, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const verbindungszeichenfolge = process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: { path: path.join('prisma', 'migrations') },
  ...(verbindungszeichenfolge ? { datasource: { url: verbindungszeichenfolge } } : {}),
});
