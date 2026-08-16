import 'server-only';
import sql from 'mssql';
import {
  type Ausfuehrungsauftrag,
  type Ausfuehrungsgrenzen,
  type RohAusfuehrung,
  type SqlMotor,
  type Zustandsbericht,
} from '@/domain/sql/runner';
import { uebersetzeTreiberfehler, zuResultset } from '@/domain/sql/treiber-uebersetzung';
import { alsBezeichner } from '@/domain/sql/bezeichner';

/**
 * Der Anschluss an einen echten SQL Server.
 *
 * **Dieser Code gehört in den Runner-Prozess, nicht in einen Request-Handler.**
 * Die Begründung steht in docs/SQL-RUNNER.md, Abschnitt 3: Ein SQL Server ist
 * kein kurzlebiger Prozess, und die Zugangsdaten zur Sandbox dürfen nicht in
 * einer Umgebung liegen, die von außen erreichbare Anwendungslogik ausführt.
 * Er ist deshalb an keine Route angeschlossen.
 *
 * **Zum Stand der Prüfung, ohne Beschönigung:** Was hier steht, ist gegen
 * keinen laufenden SQL Server gelaufen. Die Teile, die sich ohne Server prüfen
 * lassen – Ergebnisumwandlung, Fehlerzuordnung, Bildung von Bezeichnern –
 * liegen in `src/domain/sql/` und sind dort geprüft. Der Rest, also
 * Verbindungsaufbau, Zeitlimit, Abbruch und das Zurücksetzen einer Sandbox,
 * ist nach der Treiberdokumentation geschrieben und wartet auf die
 * Integrationstests aus docker-compose.yml. Bis die einmal grün gelaufen sind,
 * gilt diese Datei als unbewiesen.
 *
 * **Zur Benennung:** `Ausfuehrungsauftrag.sandboxId` trägt hier den
 * Datenbanknamen der Sandbox, wie ihn `sandboxDatenbankName()` bildet – nicht
 * die Zeilennummer aus der Plattformdatenbank. Der Motor kennt die
 * Plattformdatenbank nicht und darf sie nicht kennen.
 */

export interface MssqlMotorOptionen {
  host: string;
  port: number;
  /**
   * Anmeldename mit den Rechten, Sandboxes anzulegen und zurückzusetzen.
   *
   * Ausdrücklich ein anderer als der, mit dem Lernenden-SQL läuft. Dieser hier
   * darf Datenbanken erzeugen; jener darf ausschließlich in seiner eigenen
   * Sandbox lesen und schreiben.
   */
  verwaltung: { benutzer: string; passwort: string };
  /** Verschlüsselte Verbindung. Außerhalb der lokalen Entwicklung immer wahr. */
  verschluesseln: boolean;
  /**
   * Serverzertifikat nicht prüfen.
   *
   * Nur für die lokale Entwicklung gedacht, wo der Container ein selbst
   * signiertes Zertifikat mitbringt. Im Betrieb ist das eine offene Tür für
   * einen Angriff auf dem Übertragungsweg – deshalb steht es als eigene
   * Angabe da und nicht als stiller Standardwert.
   */
  zertifikatNichtPruefen: boolean;
  /**
   * Liefert die DDL samt Beispieldaten für eine Sandbox.
   *
   * Ohne diesen Rückruf wäre „Zurücksetzen" eine leere Datenbank – und damit
   * kaputter als der Zustand davor.
   */
  ladeSchemaSkript(sandboxDatenbank: string): Promise<string>;
}

/**
 * Ein laufender Auftrag.
 *
 * Wird gebraucht, damit `brichAb` genau die eine Ausführung trifft und nicht
 * die Verbindung als Ganzes: Eine gekappte Verbindung würde auch die
 * Ausführungen anderer Lernender im selben Pool mitreißen.
 */
interface LaufenderAuftrag {
  anfrage: sql.Request;
  abgebrochen: boolean;
}

/**
 * Erzeugt eine Anfrage mit eigenem Zeitlimit.
 *
 * Der Treiber nimmt das Zeitlimit als zweites Konstruktorargument entgegen
 * (`lib/base/request.js`, `overrides.requestTimeout`), die mitgelieferten
 * Typen kennen dieses Argument aber nicht. Die Umtypung steht deshalb hier,
 * einmal, mit dieser Begründung – und nicht an jeder Aufrufstelle.
 *
 * Der Weg über die Verbindungskonfiguration wäre der falsche: Er setzt das
 * Zeitlimit für den ganzen Pool. Eine Aufgabe darf aber ein anderes Limit
 * haben als die nächste.
 */
type AnfrageMitZeitlimit = new (
  parent: sql.ConnectionPool,
  overrides?: { requestTimeout?: number },
) => sql.Request;

function erstelleAnfrage(pool: sql.ConnectionPool, zeitlimitMs: number): sql.Request {
  const Konstruktor = sql.Request as unknown as AnfrageMitZeitlimit;
  return new Konstruktor(pool, { requestTimeout: zeitlimitMs });
}

/** Ergebnisform des Treibers im `arrayRowMode`. */
interface TreiberErgebnis {
  recordsets?: unknown[][][];
  columns?: Array<Array<{ name?: string; index?: number }>>;
  rowsAffected?: number[];
}

export function erstelleMssqlMotor(optionen: MssqlMotorOptionen): SqlMotor {
  /** Ein Verbindungspool je Sandbox-Datenbank. */
  const pools = new Map<string, Promise<sql.ConnectionPool>>();
  const laufende = new Map<string, LaufenderAuftrag>();

  function basisKonfiguration(datenbank: string): sql.config {
    return {
      server: optionen.host,
      port: optionen.port,
      user: optionen.verwaltung.benutzer,
      password: optionen.verwaltung.passwort,
      database: datenbank,
      options: {
        encrypt: optionen.verschluesseln,
        trustServerCertificate: optionen.zertifikatNichtPruefen,
        // Ohne diese Angabe liefert der Treiber Datumswerte in der Zeitzone
        // des Servers. Zwei Ergebnisse, die denselben Zeitpunkt meinen, gälten
        // dann als verschieden.
        useUTC: true,
      },
      pool: { max: 4, min: 0, idleTimeoutMillis: 30_000 },
    };
  }

  async function holePool(datenbank: string): Promise<sql.ConnectionPool> {
    const vorhanden = pools.get(datenbank);
    if (vorhanden) return vorhanden;

    const neuer = new sql.ConnectionPool(basisKonfiguration(datenbank)).connect();
    pools.set(datenbank, neuer);

    try {
      return await neuer;
    } catch (fehler) {
      // Einen kaputten Pool nicht behalten: Sonst scheitert jeder weitere
      // Versuch an derselben alten Zusage, auch wenn der Server längst wieder
      // erreichbar ist.
      pools.delete(datenbank);
      throw fehler;
    }
  }

  async function schliessePool(datenbank: string): Promise<void> {
    const pool = pools.get(datenbank);
    if (!pool) return;
    pools.delete(datenbank);
    await pool.then((offen) => offen.close()).catch(() => undefined);
  }

  return {
    async fuehreAus(
      auftrag: Ausfuehrungsauftrag,
      grenzen: Ausfuehrungsgrenzen,
    ): Promise<RohAusfuehrung> {
      // Auch hier geprüft, nicht nur beim Anlegen. Der Name kommt aus einer
      // anderen Schicht, und eine Prüfung, die man sich sparen kann, ist der
      // Anfang der Lücke.
      alsBezeichner(auftrag.sandboxId);

      const pool = await holePool(auftrag.sandboxId);
      const anfrage = erstelleAnfrage(pool, grenzen.zeitlimitMs);

      /*
       * `arrayRowMode` liefert Zeilen als Arrays statt als Objekte. Notwendig,
       * nicht bequem: Als Objekt gingen die Spaltenreihenfolge und doppelte
       * Spaltennamen verloren – siehe zuResultset().
       */
      anfrage.arrayRowMode = true;

      laufende.set(auftrag.ausfuehrungId, { anfrage, abgebrochen: false });

      try {
        const ergebnis = (await anfrage.batch(auftrag.sql)) as unknown as TreiberErgebnis;

        const ersteZeilen = ergebnis.recordsets?.[0];
        const ersteSpalten = ergebnis.columns?.[0];

        /*
         * Nur die erste Ergebnismenge wird ausgewertet.
         *
         * Eine Aufgabe hat genau ein erwartetes Ergebnis. Mehrere Mengen
         * entstehen, wenn jemand mehrere SELECT hintereinander schreibt – das
         * ist eine eigene Rückmeldung wert und nicht die stille Auswahl der
         * letzten.
         */
        const betroffene = (ergebnis.rowsAffected ?? []).reduce((summe, zahl) => summe + zahl, 0);

        return {
          ...(ersteZeilen && ersteSpalten
            ? { resultset: zuResultset(ersteZeilen, ersteSpalten) }
            : {}),
          ...(betroffene > 0 ? { betroffeneZeilen: betroffene } : {}),
        };
      } catch (fehler) {
        throw uebersetzeTreiberfehler(fehler, grenzen.zeitlimitMs);
      } finally {
        laufende.delete(auftrag.ausfuehrungId);
      }
    },

    async brichAb(ausfuehrungId: string): Promise<void> {
      const eintrag = laufende.get(ausfuehrungId);
      if (!eintrag || eintrag.abgebrochen) return;
      eintrag.abgebrochen = true;
      eintrag.anfrage.cancel();
    },

    async setzeSandboxZurueck(sandboxId: string): Promise<void> {
      /*
       * Zurücksetzen heißt: verwerfen und neu aufbauen.
       *
       * Der naheliegende Weg wäre, alle Tabellen zu leeren und neu zu füllen.
       * Er ist der falsche: Wer in einer Übung eine Tabelle anlegt, eine Spalte
       * ändert oder einen Index setzt, bekäme eine Datenbank zurück, die zwar
       * die richtigen Zeilen enthält, aber nicht mehr die richtige Struktur.
       * Genau dann ist „Zurücksetzen" das Versprechen, das gebrochen wird.
       */
      const name = alsBezeichner(sandboxId);

      // Das Skript zuerst holen. Schlägt das fehl, ist die Sandbox noch heil –
      // besser als eine verworfene Datenbank ohne Inhalt.
      const skript = await optionen.ladeSchemaSkript(sandboxId);

      // Eigene Verbindungen schließen, sonst blockiert das Verwerfen an der
      // eigenen offenen Sitzung.
      await schliessePool(sandboxId);

      const verwaltung = await holePool('master');

      /*
       * SINGLE_USER WITH ROLLBACK IMMEDIATE trennt verbliebene Sitzungen.
       * Ohne das wartet DROP DATABASE auf eine Verbindung, die vielleicht nie
       * von selbst geht – und die Lernende sieht einen Knopf, der nichts tut.
       *
       * Der Name steht zweimal in unterschiedlicher Form im Text: `DB_ID`
       * erwartet eine Zeichenfolge, `ALTER`/`DROP` einen Bezeichner. Beide
       * Formen stammen aus derselben geprüften Quelle.
       */
      await verwaltung.request().batch(
        `IF DB_ID(N'${sandboxId}') IS NOT NULL
         BEGIN
           ALTER DATABASE ${name} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
           DROP DATABASE ${name};
         END;
         CREATE DATABASE ${name};`,
      );

      // Struktur und Beispieldaten einspielen – in der neuen Datenbank.
      const frisch = await holePool(sandboxId);
      await frisch.request().batch(skript);
    },

    async zustand(): Promise<Zustandsbericht> {
      const begonnen = Date.now();
      try {
        const pool = await holePool('master');
        await pool.request().query('SELECT 1');
        return {
          erreichbar: true,
          hinweis: 'Der Übungsserver antwortet.',
          antwortzeitMs: Date.now() - begonnen,
        };
      } catch {
        /*
         * Die Meldung des Treibers wird bewusst nicht durchgereicht. Sie
         * enthält Hostnamen und Portnummern, richtet sich an Betreibende und
         * hilft niemandem, der gerade eine Aufgabe lösen wollte.
         */
        return {
          erreichbar: false,
          hinweis:
            'Der Übungsserver antwortet gerade nicht. Deine Lösungen bleiben gespeichert; ' +
            'versuch es in ein paar Minuten noch einmal.',
        };
      }
    },
  };
}
