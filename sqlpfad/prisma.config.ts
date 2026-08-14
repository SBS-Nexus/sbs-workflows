import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 liest die Konfiguration aus dieser Datei statt aus package.json und
 * lädt `.env` nicht mehr automatisch – deshalb hier explizit.
 *
 * Seit Prisma 7 wird die Verbindungszeichenfolge nicht mehr im Schema
 * hinterlegt. Die Anwendung selbst verbindet sich über den Treiber-Adapter
 * (`@prisma/adapter-pg`, siehe src/server/db/prisma.ts); Migrationen nutzen die
 * hier angegebene URL.
 *
 * Die Prüfung auf die Datei ist notwendig, nicht vorsichtshalber:
 * `process.loadEnvFile` wirft `ENOENT`, wenn die Datei fehlt. Das `?.` fängt
 * das nicht ab – es schützt nur davor, dass die Funktion selbst in älteren
 * Node-Fassungen nicht existiert.
 *
 * In einer Bereitstellungsumgebung gibt es keine `.env`: Dort stehen die Werte
 * bereits in `process.env`. Ohne diese Prüfung scheitert `prisma generate` im
 * postinstall-Schritt, und zwar mit einer Meldung über die Konfigurationsdatei –
 * die eigentliche Ursache, die fehlende `.env`, steht erst am Ende der Zeile.
 * Genau daran ist die erste Bereitstellung gescheitert.
 *
 * Fehlt die Datei, wird nichts geladen. Ist sie vorhanden, aber fehlerhaft,
 * schlägt der Aufruf weiterhin fehl – das ist erwünscht.
 */
const envDatei = path.join(import.meta.dirname, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

/*
 * Die Verbindungszeichenfolge wird nur eingetragen, wenn es sie gibt.
 *
 * `prisma generate` braucht überhaupt keine Datenbank – es erzeugt nur den
 * Client aus dem Schema. Trotzdem wertet Prisma diese Datei vollständig aus,
 * und ein fest eingetragenes `env('DATABASE_URL')` bricht mit einem Fehler ab,
 * sobald die Variable fehlt.
 *
 * Das trifft zwei Fälle, die beide vorkommen und beide nichts mit Migrationen
 * zu tun haben:
 *
 *  1. `npm install` auf einem frischen Klon. Der postinstall-Schritt läuft,
 *     bevor `npm run einrichten` die `.env` überhaupt angelegt hat – die
 *     dokumentierte Reihenfolge ist genau diese.
 *  2. Eine Bereitstellungsumgebung, in der beim Bauen keine Datenbank
 *     erreichbar sein muss.
 *
 * Fehlt die Angabe hier, melden `migrate` und `db seed` das von sich aus und
 * mit eigener Meldung. Nur `generate` läuft auch ohne durch – und genau so
 * soll es sein.
 */
const verbindungszeichenfolge = process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  ...(verbindungszeichenfolge ? { datasource: { url: verbindungszeichenfolge } } : {}),
});
