/**
 * Startet den Runner-Dienst.
 *
 *   npm run runner
 *
 * Die Werte hier gehören in die Umgebung **dieses** Prozesses und nicht in die
 * der Anwendung – siehe docs/SQL-RUNNER.md, Abschnitt 9. Sie stehen deshalb
 * auch nicht in `.env.example`: Eine Datei, in der ungenutzte Zugangsdaten
 * stehen, lädt dazu ein, sie irgendwann doch dort zu verwenden.
 */
import { erstelleDienst } from './dienst';
import { erstelleMssqlMotor } from './mssql-motor';
import { UEBUNGSDATEN } from '../src/content';

function pflicht(name: string): string {
  const wert = process.env[name];
  if (!wert) {
    console.error(`\n  ✖ ${name} ist nicht gesetzt.\n`);
    process.exit(1);
  }
  return wert;
}

const token = pflicht('SQL_RUNNER_TOKEN');
if (token.length < 32) {
  /*
   * Kurze Token sind der lautlose Fehler: Der Dienst läuft, alles wirkt
   * richtig, und die einzige Absicherung gegen fremde Aufrufe ist ein Wort,
   * das sich durchprobieren lässt.
   */
  console.error('\n  ✖ SQL_RUNNER_TOKEN ist zu kurz (mindestens 32 Zeichen).\n');
  process.exit(1);
}

const port = Number(process.env.SQL_RUNNER_PORT ?? 4310);
const verschluesseln = process.env.SQL_SERVER_VERSCHLUESSELN !== 'false';
const zertifikatNichtPruefen = process.env.SQL_SERVER_ZERTIFIKAT_NICHT_PRUEFEN === 'true';

if (zertifikatNichtPruefen && verschluesseln) {
  // Eine Warnung, kein Abbruch: Lokal ist es der Normalfall, im Betrieb eine
  // offene Tür für einen Angriff auf dem Übertragungsweg.
  console.warn('  ⚠ Serverzertifikate werden nicht geprüft. Nur für die lokale Entwicklung.');
}

const motor = erstelleMssqlMotor({
  host: pflicht('SQL_SERVER_HOST'),
  port: Number(process.env.SQL_SERVER_PORT ?? 1433),
  verwaltung: {
    benutzer: pflicht('SQL_SERVER_VERWALTUNG_BENUTZER'),
    passwort: pflicht('SQL_SERVER_VERWALTUNG_PASSWORT'),
  },
  verschluesseln,
  zertifikatNichtPruefen,

  /**
   * Die DDL kommt aus dem Lehrplan, nicht aus einer zweiten Quelle.
   *
   * `UebungsDatensatz.skript` ist dieselbe Angabe, aus der auch der
   * Schema-Explorer seine Tabellen zeigt. Gäbe es hier eine eigene Kopie,
   * liefen Anzeige und Sandbox beim ersten Umbenennen einer Spalte
   * auseinander – und die Lernende suchte in einer Tabelle, die es so nicht
   * mehr gibt.
   *
   * Welcher Datensatz gemeint ist, steht im Namen der Sandbox-Datenbank
   * (`sbx_<konto>_<datensatz>`). Der Runner kennt die Plattformdatenbank
   * nicht und kann es nirgends nachschlagen.
   */
  async ladeSchemaSkript(sandboxDatenbank: string): Promise<string> {
    const datensatz = UEBUNGSDATEN.find((eintrag) =>
      sandboxDatenbank.endsWith(`_${eintrag.slug.replaceAll('-', '_')}`),
    );
    if (!datensatz) {
      throw new Error(`Kein Übungsdatensatz zu ${sandboxDatenbank} gefunden.`);
    }
    return datensatz.skript;
  },
});

const dienst = erstelleDienst({ motor, token });

dienst.listen(port, () => {
  console.info(`\n  SQLPfad Runner hört auf Port ${port}.`);
  console.info('  Er ist nicht für das offene Netz gedacht – siehe docs/SQL-RUNNER.md §3.\n');
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    // Laufende Ausführungen zu Ende bringen statt Verbindungen zu kappen: Eine
    // abgeschnittene Transaktion hinterlässt eine Sandbox in einem Zustand,
    // den die Lernende nicht erklären kann.
    console.info('\n  Beende den Runner …');
    dienst.close(() => process.exit(0));
  });
}
