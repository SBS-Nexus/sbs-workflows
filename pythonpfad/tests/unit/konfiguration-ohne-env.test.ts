import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Die Konfigurationsdateien müssen ohne `.env` ladbar bleiben.
 *
 * Anlass ist eine gescheiterte Bereitstellung. `process.loadEnvFile` wirft
 * `ENOENT`, wenn die Datei fehlt – das `?.` davor fängt das nicht ab, es
 * schützt nur davor, dass die Funktion in älteren Node-Fassungen nicht
 * existiert. In einer Bereitstellungsumgebung gibt es keine `.env`; die Werte
 * stehen dort bereits in `process.env`. Der Aufruf brach den postinstall-Schritt
 * ab, und zwar mit einer Meldung über die Konfigurationsdatei – die eigentliche
 * Ursache stand erst am Zeilenende.
 *
 * Dasselbe traf `npm install` auf einem frischen Klon: Der postinstall-Schritt
 * läuft, bevor `npm run einrichten` die `.env` anlegt.
 *
 * Was dieser Test ist und was nicht: Er liest den Quelltext und prüft eine
 * Regel. Er führt die Dateien nicht aus – das ginge hier nicht sinnvoll, weil
 * im Arbeitsverzeichnis eine `.env` liegt und die Bedingung damit immer erfüllt
 * wäre. Der vollständige Nachweis ist ein Bau ohne `.env`; dieser Test hält
 * fest, was dabei herauskam, damit es nicht unbemerkt zurückfällt.
 */

const WURZEL = path.resolve(import.meta.dirname, '..', '..');

const DATEIEN = [
  'prisma.config.ts',
  'prisma/seed.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'tests/integration/setup.ts',
];

function lies(datei: string): string {
  return readFileSync(path.join(WURZEL, datei), 'utf8');
}

describe('Konfiguration ohne .env', () => {
  it.each(DATEIEN)('%s lädt .env nur, wenn sie vorhanden ist', (datei) => {
    const quelle = lies(datei);
    if (!quelle.includes('loadEnvFile')) return;

    expect(
      quelle,
      `${datei} ruft process.loadEnvFile ohne vorherige Prüfung auf. ` +
        'Ohne .env wirft der Aufruf ENOENT und bricht den Bau ab.',
    ).toMatch(/if \(existsSync\(envDatei\)\) process\.loadEnvFile\?\.\(envDatei\)/);
  });

  it('erzwingt die Verbindungszeichenfolge nicht beim Erzeugen des Clients', () => {
    /*
     * `prisma generate` braucht keine Datenbank. Prismas `env`-Hilfsfunktion
     * bricht trotzdem ab, sobald die Variable fehlt – und damit jeden
     * `npm install` vor der ersten Einrichtung.
     *
     * Geprüft wird die Import-Zeile und nicht das Vorkommen von
     * `env('DATABASE_URL')` im Text: Die Zeichenfolge steht auch in den
     * Kommentaren, die genau diesen Zusammenhang erklären. Ein Test, der an
     * einer Erklärung scheitert, erzieht dazu, Erklärungen wegzulassen.
     */
    const quelle = lies('prisma.config.ts');
    const importZeile = quelle.match(/^import \{[^}]*\} from 'prisma\/config';$/m)?.[0];

    expect(importZeile, 'prisma.config.ts importiert nicht mehr aus prisma/config').toBeDefined();
    expect(importZeile).not.toMatch(/\benv\b/);
    expect(quelle).toContain('process.env.DATABASE_URL');
  });
});
