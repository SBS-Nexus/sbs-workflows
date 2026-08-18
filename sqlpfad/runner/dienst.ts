import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import type { SqlMotor, SqlRunner } from '../src/domain/sql/runner';
import { erstelleSqlRunner } from '../src/domain/sql/runner';
import { erstelleAufsicht, type Aufsicht, type Betriebsgrenzen } from './grenzen';

/**
 * Der Runner-Dienst: die Schnittstelle zwischen Anwendung und Übungsserver.
 *
 * Warum es ihn als eigenen Prozess gibt, steht in docs/SQL-RUNNER.md,
 * Abschnitt 3. Die Kurzfassung: Ein SQL Server ist kein kurzlebiger Prozess,
 * die Zugangsdaten zur Sandbox dürfen nicht dort liegen, wo von außen
 * erreichbare Anwendungslogik läuft, und Zeitlimit, Abbruch und Aufräumen
 * brauchen jemanden, der die einzelne Anfrage überdauert.
 *
 * ## Wer hier hereindarf
 *
 * Ausschließlich die Anwendung, mit einem gemeinsamen Token. **Kein Browser
 * spricht je mit diesem Dienst.** Er gehört nicht ins offene Netz; das Token
 * ist die zweite Sicherung, nicht die erste.
 *
 * Der Vergleich läuft zeitkonstant. Ein `===` auf Zeichenketten bricht beim
 * ersten Unterschied ab, und aus den Laufzeitunterschieden lässt sich ein
 * Token Zeichen für Zeichen erraten. Das ist keine graue Theorie, sondern der
 * Grund, warum `timingSafeEqual` existiert.
 *
 * ## Was der Dienst *nicht* tut
 *
 * Er kennt die Plattformdatenbank nicht, hat keinen Zugang zu ihr und keinen
 * Begriff von Konten, Sitzungen oder Fortschritt. Er sieht eine Sandbox-ID,
 * etwas SQL und die erlaubten Anweisungsklassen. Mehr braucht er nicht, und
 * mehr soll er nicht wissen: Was er nicht kennt, kann über ihn nicht
 * abfließen.
 */

export interface DienstOptionen {
  motor: SqlMotor;
  /** Gemeinsames Geheimnis mit der Anwendung. Mindestens 32 Zeichen. */
  token: string;
  betriebsgrenzen?: Betriebsgrenzen;
  /** Für Tests: eine eigene Aufsicht mit anderen Grenzen. */
  aufsicht?: Aufsicht;
}

interface Antwort {
  status: number;
  koerper: unknown;
}

const HOECHSTE_ANFRAGEGROESSE = 256 * 1024;

/** Zeitkonstanter Vergleich zweier Zeichenketten. */
function gleich(eins: string, zwei: string): boolean {
  const a = Buffer.from(eins);
  const b = Buffer.from(zwei);
  /*
   * Unterschiedliche Längen kann `timingSafeEqual` nicht vergleichen – es
   * wirft. Die Länge eines Tokens ist kein nennenswertes Geheimnis, deshalb
   * ist die frühe Rückgabe hier vertretbar; der Inhalt wird weiter
   * zeitkonstant geprüft.
   */
  return a.length === b.length && timingSafeEqual(a, b);
}

function liesToken(anfrage: IncomingMessage): string {
  const kopf = anfrage.headers.authorization ?? '';
  return kopf.startsWith('Bearer ') ? kopf.slice('Bearer '.length) : '';
}

async function liesKoerper(anfrage: IncomingMessage): Promise<unknown> {
  const teile: Buffer[] = [];
  let groesse = 0;

  for await (const teil of anfrage) {
    const stueck = teil as Buffer;
    groesse += stueck.length;
    // Abbrechen statt sammeln: Sonst füllt eine einzige Anfrage den
    // Arbeitsspeicher des Dienstes, und das trifft alle anderen mit.
    if (groesse > HOECHSTE_ANFRAGEGROESSE) throw new Error('Anfrage zu groß');
    teile.push(stueck);
  }

  if (teile.length === 0) return {};
  return JSON.parse(Buffer.concat(teile).toString('utf8'));
}

function alsText(wert: unknown): string {
  return typeof wert === 'string' ? wert : '';
}

/**
 * Erzeugt den Dienst, ohne ihn zu starten.
 *
 * Getrennt, damit Tests ihn auf einem freien Port starten und danach wieder
 * schließen können – ohne Umgebungsvariablen und ohne Wartezeiten.
 */
export function erstelleDienst(optionen: DienstOptionen): ReturnType<typeof createServer> {
  const runner: SqlRunner = erstelleSqlRunner(optionen.motor);
  const aufsicht = optionen.aufsicht ?? erstelleAufsicht(optionen.betriebsgrenzen);

  async function behandle(pfad: string, koerper: unknown): Promise<Antwort> {
    const daten = (koerper ?? {}) as Record<string, unknown>;

    switch (pfad) {
      case '/zustand':
        return { status: 200, koerper: await runner.health() };

      case '/ausfuehren': {
        const sandboxId = alsText(daten.sandboxId);
        if (!sandboxId) return { status: 400, koerper: { fehler: 'sandboxId fehlt' } };

        const einlass = aufsicht.bittEinlass(sandboxId);
        if (!einlass.eingelassen) {
          /*
           * 429 und nicht 503: Es ist eine Aussage über diese Anfrage im
           * Verhältnis zu anderen, nicht über einen kaputten Dienst. Die
           * Anwendung soll das der Lernenden auch so zeigen können.
           */
          return {
            status: 429,
            koerper: { fehler: einlass.grund, hinweis: einlass.hinweis },
          };
        }

        try {
          return {
            status: 200,
            koerper: await runner.execute({
              sandboxId,
              ausfuehrungId: alsText(daten.ausfuehrungId),
              sql: alsText(daten.sql),
              erlaubteKlassen: Array.isArray(daten.erlaubteKlassen)
                ? (daten.erlaubteKlassen as string[])
                : [],
              ...(daten.grenzen ? { grenzen: daten.grenzen } : {}),
            } as Parameters<SqlRunner['execute']>[0]),
          };
        } finally {
          // Im `finally`, nicht nach dem `await`: Sonst bliebe der Platz nach
          // einem Fehler für immer belegt, und die Grenze verwandelte sich
          // von einem Schutz in eine Sperre.
          aufsicht.entlasse(sandboxId);
        }
      }

      case '/abbrechen': {
        const ausfuehrungId = alsText(daten.ausfuehrungId);
        if (!ausfuehrungId) return { status: 400, koerper: { fehler: 'ausfuehrungId fehlt' } };
        await runner.cancel(ausfuehrungId);
        return { status: 200, koerper: { abgebrochen: true } };
      }

      case '/sandbox/zuruecksetzen': {
        const sandboxId = alsText(daten.sandboxId);
        if (!sandboxId) return { status: 400, koerper: { fehler: 'sandboxId fehlt' } };
        await runner.resetSandbox(sandboxId);
        return { status: 200, koerper: { zurueckgesetzt: true } };
      }

      default:
        return { status: 404, koerper: { fehler: 'Unbekannter Weg' } };
    }
  }

  return createServer((anfrage: IncomingMessage, antwort: ServerResponse) => {
    void (async () => {
      const sende = (status: number, koerper: unknown): void => {
        const text = JSON.stringify(koerper);
        antwort.writeHead(status, {
          'content-type': 'application/json; charset=utf-8',
          // Der Dienst hat nichts, was ein Browser einbetten oder ein Zwischen-
          // speicher aufbewahren sollte.
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        });
        antwort.end(text);
      };

      if (!gleich(liesToken(anfrage), optionen.token)) {
        /*
         * Ohne Einzelheiten. Ob das Token fehlte, abgelaufen oder schlicht
         * falsch war, geht den Anfragenden nichts an – und wer es errät,
         * bekommt aus der Antwort keinen Anhaltspunkt, wie nah er war.
         */
        sende(401, { fehler: 'Nicht berechtigt' });
        return;
      }

      if (anfrage.method !== 'POST' && anfrage.url !== '/zustand') {
        sende(405, { fehler: 'Nur POST' });
        return;
      }

      try {
        const koerper = await liesKoerper(anfrage);
        const pfad = (anfrage.url ?? '').split('?')[0] ?? '';
        const ergebnis = await behandle(pfad, koerper);
        sende(ergebnis.status, ergebnis.koerper);
      } catch (fehler) {
        /*
         * Die Meldung wird protokolliert, aber nicht ausgeliefert. Sie kann
         * Hostnamen, Anmeldenamen und Pfade enthalten – alles Dinge, die in
         * einer Antwort an einen Aufrufer nichts verloren haben.
         */
        console.error('[runner] Anfrage gescheitert:', fehler);
        sende(500, { fehler: 'Der Dienst konnte die Anfrage nicht bearbeiten.' });
      }
    })();
  });
}
