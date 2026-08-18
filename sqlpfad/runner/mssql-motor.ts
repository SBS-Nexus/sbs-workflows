/*
 * Kein `server-only`.
 *
 * Diese Datei lag früher unter `src/server/` und trug den Vermerk. Er war dort
 * richtig und ist hier falsch: Der Motor gehört zum **Runner-Prozess**, nicht
 * zur Anwendung. Die Anwendung spricht nie Port 1433 – siehe
 * docs/SQL-RUNNER.md, Abschnitt 3. `server-only` würde den Import außerhalb
 * von Next verhindern, also genau dort, wo er hingehört.
 */
import { randomBytes } from 'node:crypto';
import sql from 'mssql';
import {
  type Ausfuehrungsauftrag,
  type Ausfuehrungsgrenzen,
  type RohAusfuehrung,
  type SqlMotor,
  type Zustandsbericht,
} from '../src/domain/sql/runner';
import { uebersetzeTreiberfehler, zuResultset } from '../src/domain/sql/treiber-uebersetzung';
import { alsBezeichner, sandboxAnmeldename } from '../src/domain/sql/bezeichner';

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
  /**
   * Pools des **Verwaltungsnamens**. Nur für `master` und für das Einspielen
   * der Struktur nach dem Zurücksetzen – niemals für Lernenden-SQL.
   */
  const verwaltungsPools = new Map<string, Promise<sql.ConnectionPool>>();

  /**
   * Pools der **Sandbox-Anmeldenamen**. Hier läuft fremdes SQL, und nur hier.
   */
  const ausfuehrungsPools = new Map<string, Promise<sql.ConnectionPool>>();

  /**
   * Die Kennwörter der Sandbox-Anmeldenamen – ausschließlich im Speicher
   * dieses Prozesses.
   *
   * Sie werden nirgends abgelegt. Das ist kein Verzicht auf Bequemlichkeit,
   * sondern die einfachere Lösung: Nach einem Neustart des Dienstes ist die
   * Karte leer, und der nächste Zugriff setzt das Kennwort neu
   * (`ALTER LOGIN … WITH PASSWORD`). Ein Kennwort, das man neu vergeben kann,
   * muss man nicht aufbewahren – und was nicht abgelegt ist, kann auch nicht
   * abfließen.
   */
  const kennwoerter = new Map<string, string>();

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

  /**
   * Öffnet einen Pool und merkt ihn sich – oder wirft ihn weg, wenn er
   * scheitert.
   *
   * Einen kaputten Pool zu behalten wäre der Fehler: Jeder weitere Versuch
   * scheiterte dann an derselben alten Zusage, auch wenn der Server längst
   * wieder erreichbar ist.
   */
  async function oeffne(
    karte: Map<string, Promise<sql.ConnectionPool>>,
    schluessel: string,
    konfiguration: sql.config,
  ): Promise<sql.ConnectionPool> {
    const vorhanden = karte.get(schluessel);
    if (vorhanden) return vorhanden;

    const neuer = new sql.ConnectionPool(konfiguration).connect();
    karte.set(schluessel, neuer);

    try {
      return await neuer;
    } catch (fehler) {
      karte.delete(schluessel);
      throw fehler;
    }
  }

  function holeVerwaltungsPool(datenbank: string): Promise<sql.ConnectionPool> {
    return oeffne(verwaltungsPools, datenbank, basisKonfiguration(datenbank));
  }

  /**
   * Ein Kennwort, das gefahrlos in einen Anweisungstext darf.
   *
   * `CREATE LOGIN` nimmt keinen Parameter – das Kennwort muss in den Text.
   * Base64url besteht ausschließlich aus `A–Z a–z 0–9 - _`; darin gibt es
   * kein Hochkomma, mit dem sich die Zeichenkette verlassen ließe. Wieder die
   * Regel aus `bezeichner.ts`: eine kleine bekannte Menge zulassen, statt
   * gefährliche Zeichen zu entfernen.
   */
  function erzeugeKennwort(): string {
    return randomBytes(33).toString('base64url');
  }

  /**
   * Sorgt dafür, dass es den Anmeldenamen dieser Sandbox gibt – mit genau den
   * Rechten, die eine Lernende braucht, und keinem mehr.
   *
   * Was er **nicht** bekommt, ist die eigentliche Aussage:
   *
   * - kein `db_owner` – sonst könnte er Rechte an sich selbst vergeben
   * - keine Serverrolle, insbesondere nicht `sysadmin`
   * - keinen Zugriff auf `master` oder eine andere Sandbox
   * - kein `VIEW ANY DATABASE`, damit fremde Sandboxes nicht einmal in der
   *   Liste auftauchen
   *
   * Was er bekommt: lesen, schreiben und Struktur ändern **in seiner eigenen
   * Datenbank**. Das Ändern der Struktur ist nötig, weil Modul 4 CREATE TABLE
   * und ALTER TABLE übt – ohne das wäre der halbe Lehrplan nicht ausführbar.
   */
  async function stelleAnmeldenamenSicher(sandbox: string): Promise<string> {
    const vorhandenes = kennwoerter.get(sandbox);
    if (vorhandenes) return vorhandenes;

    const anmeldename = sandboxAnmeldename(sandbox);
    const anmeldeBezeichner = alsBezeichner(anmeldename);
    const kennwort = erzeugeKennwort();

    const verwaltung = await holeVerwaltungsPool('master');
    await verwaltung.request().batch(
      `IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'${anmeldename}')
         CREATE LOGIN ${anmeldeBezeichner} WITH PASSWORD = '${kennwort}', CHECK_POLICY = OFF;
       ELSE
         ALTER LOGIN ${anmeldeBezeichner} WITH PASSWORD = '${kennwort}';
       DENY VIEW ANY DATABASE TO ${anmeldeBezeichner};`,
    );

    const inSandbox = await holeVerwaltungsPool(sandbox);
    await inSandbox.request().batch(
      `IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'${anmeldename}')
         CREATE USER ${anmeldeBezeichner} FOR LOGIN ${anmeldeBezeichner};
       ALTER ROLE db_datareader ADD MEMBER ${anmeldeBezeichner};
       ALTER ROLE db_datawriter ADD MEMBER ${anmeldeBezeichner};
       ALTER ROLE db_ddladmin  ADD MEMBER ${anmeldeBezeichner};`,
    );

    kennwoerter.set(sandbox, kennwort);
    return kennwort;
  }

  /** Der Pool, in dem Lernenden-SQL läuft. Niemals der Verwaltungsname. */
  async function holeAusfuehrungsPool(sandbox: string): Promise<sql.ConnectionPool> {
    const kennwort = await stelleAnmeldenamenSicher(sandbox);
    return oeffne(ausfuehrungsPools, sandbox, {
      ...basisKonfiguration(sandbox),
      user: sandboxAnmeldename(sandbox),
      password: kennwort,
    });
  }

  /** Schließt alle Pools auf eine Sandbox – beide Sorten. */
  async function schliessePools(sandbox: string): Promise<void> {
    for (const karte of [verwaltungsPools, ausfuehrungsPools]) {
      const pool = karte.get(sandbox);
      if (!pool) continue;
      karte.delete(sandbox);
      await pool.then((offen) => offen.close()).catch(() => undefined);
    }
    // Das Kennwort mit vergessen: Nach dem Verwerfen der Datenbank ist der
    // Benutzer darin weg, und der nächste Zugriff muss ihn neu anlegen.
    kennwoerter.delete(sandbox);
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

      /*
       * Der **Ausführungspool**, nicht der Verwaltungspool.
       *
       * Das ist die eine Zeile, an der das Berechtigungsmodell aus
       * docs/SQL-RUNNER.md, Abschnitt 4 hängt. Stünde hier der
       * Verwaltungsname, liefe fremdes SQL mit den Rechten, Datenbanken
       * anzulegen – und jede Lücke in der Anweisungsprüfung wäre sofort ein
       * Zugriff auf alle anderen Sandboxes. Die Anweisungsprüfung ist
       * ausdrücklich nicht als Sicherheitsgrenze gedacht; diese Zeile ist es.
       */
      const pool = await holeAusfuehrungsPool(auftrag.sandboxId);
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
      await schliessePools(sandboxId);

      const verwaltung = await holeVerwaltungsPool('master');

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

      /*
       * Struktur und Beispieldaten legt die **Verwaltung** an, nicht die
       * Lernende. Ihr Anmeldename existiert in der frisch erzeugten Datenbank
       * noch gar nicht – `DROP DATABASE` hat den Benutzer darin mitgenommen.
       * Er entsteht beim nächsten `holeAusfuehrungsPool` neu.
       */
      const frisch = await holeVerwaltungsPool(sandboxId);
      await frisch.request().batch(skript);
    },

    async zustand(): Promise<Zustandsbericht> {
      const begonnen = Date.now();
      try {
        const pool = await holeVerwaltungsPool('master');
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
