import 'server-only';
import { randomUUID } from 'node:crypto';
import { getEnv } from '@/server/env';
import { prisma } from '@/server/db/prisma';
import { sandboxDatenbankName } from '@/domain/sql/bezeichner';
import type { Ausfuehrungsergebnis, Zustandsbericht } from '@/domain/sql/runner';

/**
 * Die Anwendung spricht mit dem Runner-Dienst – und mit sonst nichts.
 *
 * Kein Port 1433, kein Treiber, keine Zugangsdaten zum Übungsserver. Diese
 * Datei kennt eine Adresse und ein Token; das ist der ganze Umfang dessen, was
 * die Anwendung über die Ausführung wissen muss (docs/SQL-RUNNER.md §3).
 *
 * **Es gibt keinen Ersatzweg.** Ist der Dienst nicht erreichbar, sagt das die
 * Rückgabe – sie erfindet kein Ergebnis und zeigt kein altes. Wer glaubt,
 * seine Abfrage sei gelaufen, lernt aus dem Ergebnis das Falsche.
 */

/** Der Dienst antwortet nicht – oder nicht rechtzeitig. */
export interface RunnerNichtErreichbar {
  art: 'runner-nicht-erreichbar';
  hinweis: string;
}

/** Der Dienst hat abgewiesen, weil gerade zu viel läuft. */
export interface RunnerAbgewiesen {
  art: 'runner-abgewiesen';
  hinweis: string;
}

export type RunnerAntwort = Ausfuehrungsergebnis | RunnerNichtErreichbar | RunnerAbgewiesen;

/**
 * Wie lange die Anwendung auf den Dienst wartet – bewusst länger als das
 * Zeitlimit der Abfrage selbst.
 *
 * Der Dienst soll die Gelegenheit haben, ein Zeitlimit als solches zu melden.
 * Bräche die Anwendung vorher ab, bekäme die Lernende „nicht erreichbar" statt
 * „zu lange gelaufen" – zwei völlig verschiedene Auskünfte, von denen nur eine
 * stimmt, und die falsche schickt sie auf die Suche nach einem Netzproblem.
 */
const ZUSCHLAG_MS = 5_000;

async function rufe(pfad: string, koerper: unknown, zeitlimitMs: number): Promise<RunnerAntwort> {
  const env = getEnv();

  let antwort: Response;
  try {
    antwort = await fetch(`${env.SQL_RUNNER_URL.replace(/\/+$/, '')}${pfad}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.SQL_RUNNER_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(koerper),
      signal: AbortSignal.timeout(zeitlimitMs),
      cache: 'no-store',
    });
  } catch {
    /*
     * Die Ursache wird nicht durchgereicht. Sie enthält Adresse und Port des
     * Dienstes; beides geht niemanden etwas an, der gerade eine Aufgabe lösen
     * wollte, und hilft ihm auch nicht weiter.
     */
    return {
      art: 'runner-nicht-erreichbar',
      hinweis:
        'Der Übungsserver antwortet gerade nicht. Deine Abfrage steht noch im Editor, und ' +
        'gespeichert ist alles – versuch es in ein paar Minuten noch einmal.',
    };
  }

  if (antwort.status === 429) {
    const inhalt = (await antwort.json().catch(() => ({}))) as { hinweis?: string };
    return {
      art: 'runner-abgewiesen',
      hinweis: inhalt.hinweis ?? 'Gerade läuft zu viel gleichzeitig. Versuch es kurz danach.',
    };
  }

  if (!antwort.ok) {
    return {
      art: 'runner-nicht-erreichbar',
      hinweis:
        'Der Übungsserver konnte die Abfrage nicht entgegennehmen. Es liegt nicht an deiner ' +
        'Eingabe – versuch es gleich noch einmal.',
    };
  }

  return (await antwort.json()) as Ausfuehrungsergebnis;
}

/**
 * Sorgt dafür, dass es für dieses Konto eine Sandbox gibt, und liefert ihren
 * Datenbanknamen.
 *
 * Die Zeile in der Plattformdatenbank und die Datenbank auf dem Übungsserver
 * sind zwei Dinge, die auseinanderlaufen können. Deshalb steht der Zustand in
 * der Zeile und wird erst auf `READY` gesetzt, wenn der Runner bestätigt hat.
 * Eine Zeile ohne Datenbank wäre sonst eine stille Zusage, die beim ersten
 * Ausführen bricht – und zwar mit einer Meldung, die niemand versteht.
 */
export async function stelleSandboxBereit(
  userId: string,
  schemaSlug: string,
): Promise<{ datenbank: string } | RunnerNichtErreichbar> {
  const schema = await prisma.practiceSchema.findUnique({ where: { slug: schemaSlug } });
  if (!schema) {
    return {
      art: 'runner-nicht-erreichbar',
      hinweis: `Den Übungsdatensatz „${schemaSlug}" gibt es auf dieser Installation nicht.`,
    };
  }

  const datenbank = sandboxDatenbankName(userId, schemaSlug);
  const schluessel = { userId_practiceSchemaId: { userId, practiceSchemaId: schema.id } };

  const vorhanden = await prisma.sandbox.findUnique({ where: schluessel });

  if (vorhanden?.state === 'READY' && vorhanden.schemaVersion === schema.version) {
    // Nur ein Zeitstempel, kein Zustandswechsel: `lastUsedAt` entscheidet
    // später, was aufgeräumt werden darf.
    await prisma.sandbox.update({ where: schluessel, data: { lastUsedAt: new Date() } });
    return { datenbank };
  }

  await prisma.sandbox.upsert({
    where: schluessel,
    create: {
      userId,
      practiceSchemaId: schema.id,
      databaseName: datenbank,
      schemaVersion: schema.version,
      state: 'PROVISIONING',
    },
    update: { state: 'PROVISIONING', stateReason: null },
  });

  const env = getEnv();
  const ergebnis = await rufe(
    '/sandbox/zuruecksetzen',
    { sandboxId: datenbank },
    // Aufbauen dauert länger als eine Abfrage: Datenbank verwerfen, neu
    // anlegen, Struktur und Beispieldaten einspielen.
    env.SQL_ZEITLIMIT_MS * 6,
  );

  if ('art' in ergebnis && ergebnis.art === 'runner-nicht-erreichbar') {
    await prisma.sandbox.update({
      where: schluessel,
      data: { state: 'FAILED', stateReason: ergebnis.hinweis },
    });
    return ergebnis;
  }

  await prisma.sandbox.update({
    where: schluessel,
    data: {
      state: 'READY',
      stateReason: null,
      schemaVersion: schema.version,
      lastResetAt: new Date(),
      lastUsedAt: new Date(),
    },
  });

  return { datenbank };
}

export async function fuehreImRunnerAus(daten: {
  datenbank: string;
  sql: string;
  erlaubteKlassen: readonly string[];
}): Promise<RunnerAntwort> {
  const env = getEnv();

  return rufe(
    '/ausfuehren',
    {
      sandboxId: daten.datenbank,
      // Eine zufällige Kennung genügt: Sie muss nur diese eine Ausführung
      // treffen, wenn jemand abbricht.
      ausfuehrungId: randomUUID(),
      sql: daten.sql,
      erlaubteKlassen: daten.erlaubteKlassen,
      grenzen: {
        zeitlimitMs: env.SQL_ZEITLIMIT_MS,
        maxZeilen: env.SQL_MAX_ZEILEN,
        maxAnweisungen: env.SQL_MAX_ANWEISUNGEN,
      },
    },
    env.SQL_ZEITLIMIT_MS + ZUSCHLAG_MS,
  );
}

/** Für die Anzeige: Antwortet der Übungsserver? */
export async function runnerZustand(): Promise<Zustandsbericht> {
  const ergebnis = await rufe('/zustand', {}, 5_000);
  if ('erreichbar' in ergebnis) return ergebnis as unknown as Zustandsbericht;

  return {
    erreichbar: false,
    hinweis: 'hinweis' in ergebnis ? ergebnis.hinweis : 'Der Übungsserver antwortet gerade nicht.',
  };
}
