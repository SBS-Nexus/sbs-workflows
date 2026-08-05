#!/usr/bin/env node
/**
 * Richtet die lokale Entwicklungsumgebung ein.
 *
 * Ersetzt die Schrittfolge aus der Anleitung – Datei kopieren, Schlüssel
 * erzeugen, Migrationen anwenden, Beispieldaten laden – durch einen Aufruf.
 * Das ist kein Komfort um seiner selbst willen: Jeder dieser Schritte hat eine
 * Stelle, an der es klemmt (vergessener Schlüssel, laufende Datenbank auf
 * einem anderen Port, falsches Verzeichnis), und jede dieser Stellen meldet
 * sich mit einer Fehlermeldung, die nur versteht, wer das Projekt kennt.
 *
 * Bewusst in Node geschrieben und nicht als Shell-Skript: Auf Windows gibt es
 * weder `cp` noch `openssl`, und genau dort wird diese Datei am dringendsten
 * gebraucht.
 *
 * Aufruf:
 *   npm install
 *   npm run einrichten
 *   npm run dev
 */

import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_DATEI = join(WURZEL, '.env');
const VORLAGE = join(WURZEL, '.env.example');

const AUS = {
  schritt: (text) => console.info(`\n▸ ${text}`),
  gut: (text) => console.info(`  ✓ ${text}`),
  hinweis: (text) => console.info(`  · ${text}`),
  fehler: (text) => console.error(`\n✗ ${text}`),
};

function abbrechen(titel, rat) {
  AUS.fehler(titel);
  console.error(`\n${rat}\n`);
  process.exit(1);
}

// --- 1. Node-Fassung --------------------------------------------------------

function pruefeNode() {
  AUS.schritt('Node.js prüfen');
  const gross = Number(process.versions.node.split('.')[0]);
  if (gross < 22) {
    abbrechen(
      `Node ${process.versions.node} ist zu alt. Gebraucht wird 22 oder neuer.`,
      'Aktuelle Fassung von https://nodejs.org herunterladen (LTS), installieren,\n' +
        'danach ein NEUES Terminalfenster öffnen – ein bereits offenes kennt den\n' +
        'neuen Pfad noch nicht.',
    );
  }
  AUS.gut(`Node ${process.versions.node}`);
}

// --- 2. Konfigurationsdatei -------------------------------------------------

async function legeEnvAn() {
  AUS.schritt('Konfiguration (.env)');

  if (existsSync(ENV_DATEI)) {
    AUS.gut('.env ist vorhanden und wird nicht angefasst');
    return;
  }
  if (!existsSync(VORLAGE)) {
    abbrechen(
      '.env.example fehlt.',
      'Das Skript läuft im falschen Verzeichnis. Es gehört in den Ordner\n' +
        '„pythonpfad" innerhalb des Projekts.',
    );
  }

  await copyFile(VORLAGE, ENV_DATEI);

  // Der Beispielschlüssel ist öffentlich bekannt und taugt nicht einmal
  // lokal – jeder, der ihn kennt, könnte sich eine gültige Sitzung bauen.
  const schluessel = randomBytes(48).toString('base64');
  const inhalt = (await readFile(ENV_DATEI, 'utf8')).replace(
    /^AUTH_SECRET=.*$/m,
    `AUTH_SECRET="${schluessel}"`,
  );
  await writeFile(ENV_DATEI, inhalt, 'utf8');

  AUS.gut('.env aus der Vorlage angelegt');
  AUS.gut('AUTH_SECRET zufällig erzeugt');
}

// --- 3. Datenbank -----------------------------------------------------------

async function leseDatenbankAdresse() {
  const inhalt = await readFile(ENV_DATEI, 'utf8');
  const treffer = inhalt.match(/^DATABASE_URL="?([^"\n]+)"?/m);
  if (!treffer?.[1]) return null;
  try {
    const url = new URL(treffer[1]);
    return { host: url.hostname, port: Number(url.port || 5432) };
  } catch {
    return null;
  }
}

/** Antwortet an dieser Stelle überhaupt jemand? */
function istErreichbar({ host, port }, zeitlimitMs = 1500) {
  return new Promise((fertig) => {
    const verbindung = createConnection({ host, port });
    const schliessen = (ergebnis) => {
      verbindung.destroy();
      fertig(ergebnis);
    };
    verbindung.setTimeout(zeitlimitMs);
    verbindung.once('connect', () => schliessen(true));
    verbindung.once('timeout', () => schliessen(false));
    verbindung.once('error', () => schliessen(false));
  });
}

function dockerVorhanden() {
  const ergebnis = spawnSync('docker', ['--version'], { stdio: 'ignore', shell: true });
  return ergebnis.status === 0;
}

async function stellePostgresBereit() {
  AUS.schritt('Datenbank prüfen');

  const adresse = await leseDatenbankAdresse();
  if (!adresse) {
    abbrechen(
      'In der .env steht keine lesbare DATABASE_URL.',
      'Die Zeile muss so aussehen:\n' +
        '  DATABASE_URL="postgresql://pythonpfad:pythonpfad@localhost:5432/pythonpfad?schema=public"',
    );
  }

  if (await istErreichbar(adresse)) {
    AUS.gut(`PostgreSQL antwortet auf ${adresse.host}:${adresse.port}`);
    return;
  }

  AUS.hinweis(`Auf ${adresse.host}:${adresse.port} antwortet niemand.`);

  if (dockerVorhanden()) {
    AUS.hinweis('Docker ist da – die Datenbank wird gestartet …');
    const ergebnis = spawnSync('docker', ['compose', 'up', '-d'], {
      cwd: WURZEL,
      stdio: 'inherit',
      shell: true,
    });
    if (ergebnis.status !== 0) {
      abbrechen(
        'Der Start der Datenbank über Docker ist fehlgeschlagen.',
        'Läuft Docker Desktop? Es muss gestartet sein, nicht nur installiert.\n' +
          'Alternativ ohne Docker: PostgreSQL 16 installieren und die beiden\n' +
          'Datenbanken „pythonpfad" und „pythonpfad_test" anlegen.',
      );
    }

    // Der Container ist gestartet, PostgreSQL selbst braucht noch einen Moment.
    for (let versuch = 0; versuch < 30; versuch += 1) {
      if (await istErreichbar(adresse)) {
        AUS.gut('PostgreSQL läuft');
        return;
      }
      await new Promise((weiter) => setTimeout(weiter, 1000));
    }
    abbrechen(
      'Die Datenbank ist auch nach 30 Sekunden nicht erreichbar.',
      'Sieh nach, was der Container meldet:  docker compose logs postgres',
    );
  }

  abbrechen(
    'Es läuft keine Datenbank, und Docker ist nicht vorhanden.',
    'Zwei Wege:\n\n' +
      '  A) Docker Desktop installieren (docker.com), starten, dann dieses\n' +
      '     Skript erneut aufrufen. Den Rest erledigt es allein.\n\n' +
      '  B) PostgreSQL 16 installieren (postgresql.org/download), dabei ein\n' +
      '     Passwort vergeben, und anschließend zwei Datenbanken anlegen:\n' +
      '       pythonpfad  und  pythonpfad_test\n' +
      '     Danach in der .env Benutzername und Passwort in DATABASE_URL und\n' +
      '     TEST_DATABASE_URL eintragen und dieses Skript erneut aufrufen.',
  );
}

// --- 4. Schema und Beispieldaten -------------------------------------------

function fuehreAus(beschreibung, befehl, argumente) {
  AUS.schritt(beschreibung);
  const ergebnis = spawnSync(befehl, argumente, { cwd: WURZEL, stdio: 'inherit', shell: true });
  if (ergebnis.status !== 0) {
    abbrechen(
      `${beschreibung} ist fehlgeschlagen.`,
      'Die Meldung darüber sagt, woran es lag. Häufigste Ursache: Die\n' +
        'Zugangsdaten in der .env passen nicht zur laufenden Datenbank.',
    );
  }
}

// --- Ablauf -----------------------------------------------------------------

async function main() {
  console.info('\nPythonPfad – lokale Einrichtung');
  console.info('═══════════════════════════════');

  pruefeNode();
  await legeEnvAn();
  await stellePostgresBereit();
  fuehreAus('Datenbankschema anlegen', 'npm', ['run', 'db:deploy']);
  fuehreAus('Beispieldaten laden', 'npm', ['run', 'db:seed']);

  console.info('\n═══════════════════════════════');
  console.info('Fertig. Jetzt starten mit:\n');
  console.info('    npm run dev\n');
  console.info('Danach im Browser:  http://localhost:3000\n');
  console.info('Beispielkonto zum Anmelden:');
  console.info('    lernende@example.org  /  LernenMachtSpass24\n');
}

await main();
