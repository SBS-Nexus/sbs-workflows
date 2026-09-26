import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '@/server/db/prisma';
import { logger } from '@/server/observability/logger';
import { decideRateLimit } from '@/server/security/rate-limit-window';
import type { RateLimitConfig, RateLimitResult } from '@/server/security/rate-limit-window';

export { RATE_LIMITS } from '@/server/security/rate-limit-window';
export type { RateLimitConfig, RateLimitResult } from '@/server/security/rate-limit-window';

/**
 * Ratenbegrenzung mit gleitendem Fenster — gemeinsam über alle Serverinstanzen
 * (E03/ENT-B07, docs/ENTERPRISE-ROADMAP.md).
 *
 * Vorher lagen die Zähler in einer `Map` je Prozess. Auf einer waagerecht
 * skalierenden Plattform hieß das: Jede Instanz zählte für sich, und die
 * tatsächlich mögliche Anzahl Versuche war das Limit MAL der Anzahl Instanzen.
 * Ein Neustart setzte sie zusätzlich zurück. Der Zähler liegt deshalb jetzt in
 * PostgreSQL — der Datenbank, die ohnehin zur Laufzeit gebraucht wird. Kein
 * Redis, kein zusätzlicher Dienst.
 *
 * ZWEI Folgen davon sind an der Schnittstelle sichtbar, beide unvermeidbar:
 *
 *  1. `checkRateLimit()` und `enforceRateLimit()` sind `async`. Ein
 *     Datenbankzugriff ist nicht synchron zu haben, und eine blockierende
 *     Attrappe wäre eine Lüge über das, was tatsächlich passiert. Namen,
 *     Parameter und Bedeutung bleiben unverändert; alle Aufrufer standen
 *     bereits in `async`-Funktionen und bekommen nur ein `await`.
 *  2. `checkRateLimit()` kann werfen. Ist die Datenbank nicht erreichbar, ist
 *     die Grenze nicht prüfbar — und dann wird gesperrt, nicht durchgelassen
 *     (`RateLimitUnavailableError`, Begründung unten und in docs/SECURITY.md).
 *
 * Die Regel selbst steht in `rate-limit-window.ts` und ist dort ohne
 * Datenbank prüfbar. Diese Datei kümmert sich ausschließlich darum, dass
 * Lesen und Schreiben des Zählers EINE unteilbare Entscheidung bilden.
 */

/**
 * Der Schlüssel geht nur als Digest in die Datenbank.
 *
 * Aufrufer bilden Schlüssel aus IP-Adresse, E-Mail-Adresse oder Nutzerkennung
 * (`requestKey()` in `server/actions/auth-actions.ts`). Nichts davon braucht
 * die Tabelle im Klartext: Sie muss Schlüssel nur auf Gleichheit vergleichen.
 *
 * Das ist Datensparsamkeit, nicht Passwortschutz — SHA-256 ohne Schlüsselung
 * ist für den Zweck richtig und bewusst gewählt: deterministisch, schnell,
 * ohne zusätzliches Geheimnis, das verwaltet und gedreht werden müsste.
 * Ebenso bewusst wird das Ergebnis NICHT als anonym bezeichnet: Wer die
 * Tabelle lesen kann und eine IP- oder E-Mail-Adresse vermutet, kann den
 * Digest nachrechnen und den Verdacht bestätigen. Es ist ein
 * pseudonymisierter Nachschlageschlüssel, und so steht es auch in
 * docs/SECURITY.md.
 */
function digest(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Höchstens so viele abgelaufene Zeilen werden auf einmal entfernt. Deckelt
 * die Arbeit eines einzelnen Aufräumlaufs — ohne Grenze wäre das ein
 * unbeschränkter Löschvorgang mitten in einer Anfrage.
 */
const AUFRAEUMEN_HOECHSTENS = 500;

/**
 * Jede so-und-so-vielte Anfrage räumt auf.
 *
 * Bewusst an die Anfragen gekoppelt und nicht an die Uhr: Ein fester Zeittakt
 * (etwa einmal je Minute) hätte bei Lastspitzen zu wenig entfernt. Ein
 * zusätzlicher Dienst oder ein Cron-Eintrag wäre dafür neue Infrastruktur —
 * ausdrücklich nicht im Umfang von E03.
 *
 * Einschränkung, die dazugehört: Der Zähler unten ist Modulzustand JE PROZESS.
 * Die Aufräumrate wächst deshalb mit der Last je Instanz, nicht mit der Last
 * insgesamt. Eine Instanz, die vor ihrer hundertsten Anfrage beendet wird,
 * räumt nie auf (docs/SECURITY.md). Gezählt werden außerdem nur Anfragen, die
 * tatsächlich entschieden wurden: Wirft der Datenbankzugriff, kommt es nicht
 * bis hierher.
 */
const AUFRAEUMEN_JEDE_N_TE_ANFRAGE = 100;

/**
 * Wie oft der Zählvorgang höchstens neu ansetzt, wenn ein gleichzeitiger
 * Aufräumlauf ihm die Zeile zwischen Anlegen und Sperren wegnimmt. Mehr als
 * ein Anlauf ist dafür praktisch nie nötig; die Grenze steht nur, damit
 * daraus unter keinen Umständen eine Endlosschleife wird.
 */
const HOECHSTENS_ANLAEUFE = 3;

let anfragenSeitAufraeumen = 0;

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message?: string) {
    super(
      message ??
        `Zu viele Versuche in kurzer Zeit. Bitte warte ${formatWait(retryAfterSeconds)} und versuche es erneut.`,
    );
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Die Datenbank ist nicht erreichbar, die Grenze also nicht prüfbar.
 *
 * ENTSCHEIDUNG: sperren (fail closed), nicht durchlassen — einheitlich für
 * alle Grenzen, auch die des Lernbetriebs.
 *
 * Für Anmeldung und Registrierung ist das Argument unmittelbar: Durchlassen
 * hieße, bei einem Datenbankausfall genau den Schutz abzuschalten, der
 * Credential Stuffing und Massen-Enumeration begrenzt — und mit ihm die
 * Begründung, warum der scrypt-Aufwand VOR der Authentifizierung vertretbar
 * ist (docs/SECURITY.md). Ein Ausfall wäre damit zugleich das Zeitfenster für
 * den Angriff.
 *
 * Für `submitAttempt`, `hintReveal` und `labAttempt` gilt dieselbe Regel, und
 * zwar ohne Nachteil: Alle drei schreiben oder lesen unmittelbar danach
 * selbst in der Datenbank. Ist sie weg, scheitert die Aktion ohnehin. Das
 * Sperren an der Grenze ändert dort die Fehlermeldung, nicht die
 * Verfügbarkeit. Eine zweite, laxere Richtlinie für den Lernbetrieb hätte
 * also nichts gewonnen und die Regel nur schwerer prüfbar gemacht.
 *
 * Als `RateLimitError`-Unterklasse angelegt, damit die bestehende Behandlung
 * in `auth-actions.ts` greift und Nutzende eine verständliche Meldung sehen
 * statt eines Serverfehlers. Die Meldung behauptet ausdrücklich NICHT, eine
 * Grenze sei erreicht.
 */
export class RateLimitUnavailableError extends RateLimitError {
  constructor(cause: unknown) {
    super(
      0,
      'Das ist gerade nicht möglich: Die Zählung der Versuche ist nicht erreichbar. Bitte versuche es in Kürze erneut.',
    );
    this.name = 'RateLimitUnavailableError';
    this.cause = cause;
  }
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} Sekunden`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? 'eine Minute' : `${minutes} Minuten`;
}

/**
 * Prüft und verbraucht einen Versuch. Bei nicht erreichbarer Datenbank wirft
 * die Funktion `RateLimitUnavailableError`, statt durchzulassen.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  let result: RateLimitResult;

  try {
    result = await zaehleUndPruefe(digest(key), config, now);
  } catch (error) {
    // Kein stilles Abfangen: Der Fehler wird protokolliert UND die Anfrage
    // abgewiesen. Protokolliert wird nur die Fehlerart, nicht der Schlüssel
    // und nicht seine Zeichenkette aus der Verbindung.
    logger.error('Ratenbegrenzung nicht prüfbar, Anfrage wird abgewiesen', {
      fehlerart: error instanceof Error ? error.name : 'unbekannt',
      code: typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined,
    });
    throw new RateLimitUnavailableError(error);
  }

  await vielleichtAufraeumen();
  return result;
}

/**
 * Lesen, Entscheiden und Zurückschreiben in EINER Transaktion mit Zeilensperre.
 *
 * Warum nicht `SELECT` und danach `UPDATE` ohne Transaktion: Zwei gleichzeitige
 * Anfragen auf denselben Schlüssel läsen beide denselben Stand, fänden beide
 * Platz und schrieben beide — die Grenze wäre um die Anzahl gleichzeitiger
 * Anfragen überschreitbar, und genau das darf nicht sein.
 *
 * Die drei Anweisungen sind je einzeln nötig:
 *
 *  1. `ON CONFLICT DO NOTHING` stellt sicher, dass die Zeile EXISTIERT. Ohne
 *     sie sperrt `FOR UPDATE` nichts (eine nicht vorhandene Zeile lässt sich
 *     nicht sperren), zwei gleichzeitige Erstzugriffe kämen beide durch und
 *     einer der Versuche ginge verloren. Legen zwei Transaktionen zugleich an,
 *     wartet die zweite hier auf den Eindeutigkeitsindex.
 *  2. `FOR UPDATE` sperrt die Zeile bis zum Ende der Transaktion. Jede weitere
 *     Anfrage auf denselben Schlüssel wartet ab hier.
 *  3. Das Zurückschreiben ist bewusst wieder ein `UPSERT`, und Schritt 2
 *     bricht ab, wenn die Zeile verschwunden ist. Ein gleichzeitiger
 *     Aufräumlauf kann sie zwischen 1 und 2 entfernt haben — `ON CONFLICT DO
 *     NOTHING` hält keine Sperre auf einer Zeile, die es schon gab. Dann
 *     sperrt `FOR UPDATE` nichts, zwei gleichzeitige Anläufe läsen beide
 *     denselben leeren Stand, schrieben beide `[jetzt]` — und ein Versuch
 *     bliebe ungezählt. Deshalb wird in diesem Fall neu angesetzt statt
 *     entschieden (`HOECHSTENS_ANLAEUFE`).
 *
 * Folge der Sperre: Anfragen auf DENSELBEN Schlüssel werden serialisiert. Bei
 * einem Ansturm auf einen einzelnen Schlüssel kann eine Transaktion in die
 * Zeitgrenze laufen; sie scheitert dann, und das heißt hier abweisen. Das ist
 * die richtige Richtung — ein Ansturm auf einen Schlüssel ist genau der Fall,
 * für den die Grenze da ist. Verschiedene Schlüssel behindern sich nicht: Die
 * Sperre hängt an der Zeile, nicht an der Tabelle.
 */
async function zaehleUndPruefe(
  keyHash: string,
  config: RateLimitConfig,
  now: number,
): Promise<RateLimitResult> {
  for (let anlauf = 1; anlauf <= HOECHSTENS_ANLAEUFE; anlauf += 1) {
    const ergebnis = await einAnlauf(keyHash, config, now);
    if (ergebnis) return ergebnis;
  }

  // Dafür müsste ein Aufräumlauf die Zeile dreimal hintereinander genau
  // zwischen Anlegen und Sperren entfernen. Tritt es doch ein, gilt dieselbe
  // Regel wie sonst: nicht zuverlässig prüfbar heißt abweisen. `checkRateLimit`
  // macht daraus `RateLimitUnavailableError`.
  throw new Error('Ratengrenzen-Zeile wurde wiederholt zwischen Anlegen und Sperren entfernt.');
}

/**
 * Ein einzelner Anlauf. Gibt `null` zurück, wenn die Zeile zwischen Schritt 1
 * und Schritt 2 verschwunden ist; dann hat niemand eine Sperre gehalten und
 * auf dem leeren Stand darf nicht entschieden werden.
 *
 * `now` bleibt über alle Anläufe gleich. Das ist Absicht: Gezählt werden soll
 * der Zeitpunkt der Anfrage, nicht der des letzten Anlaufs.
 */
async function einAnlauf(
  keyHash: string,
  config: RateLimitConfig,
  now: number,
): Promise<RateLimitResult | null> {
  const vorlaeufigesEnde = new Date(now + config.windowMs);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO rate_limit_buckets ("keyHash", hits, "expiresAt")
      VALUES (${keyHash}, ARRAY[]::timestamp[], ${vorlaeufigesEnde})
      ON CONFLICT ("keyHash") DO NOTHING`;

    const zeilen = await tx.$queryRaw<{ hits: Date[] }[]>`
      SELECT hits FROM rate_limit_buckets WHERE "keyHash" = ${keyHash} FOR UPDATE`;

    if (zeilen.length === 0) return null;

    const bisher = (zeilen[0]?.hits ?? []).map((zeitpunkt) => zeitpunkt.getTime());
    const entscheidung = decideRateLimit(bisher, config, now);

    // Aufbewahrung so kurz wie möglich: Ablauf ist der JÜNGSTE gezählte
    // Versuch plus Fensterbreite — der Zeitpunkt, ab dem die Zeile nichts
    // mehr abweisen kann. Ein abgewiesener Versuch wird nicht gezählt und
    // verlängert die Aufbewahrung deshalb auch nicht.
    const ende = new Date((entscheidung.hits.at(-1) ?? now) + config.windowMs);
    const gespeicherteZeitpunkte = entscheidung.hits.map((zeitpunkt) => new Date(zeitpunkt));

    await tx.$executeRaw`
      INSERT INTO rate_limit_buckets ("keyHash", hits, "expiresAt")
      VALUES (${keyHash}, ${gespeicherteZeitpunkte}::timestamp[], ${ende})
      ON CONFLICT ("keyHash") DO UPDATE
        SET hits = EXCLUDED.hits, "expiresAt" = EXCLUDED."expiresAt"`;

    return entscheidung.result;
  });
}

/**
 * Entfernt abgelaufene Zeilen — beschränkt auf `hoechstens` Stück je Lauf.
 *
 * Warum das Tabellenwachstum beschränkt ist: Jeder Schlüssel belegt genau EINE
 * Zeile, deren Zeitpunktfeld auf das Fenster beschnitten wird und deshalb
 * höchstens `limit` Einträge trägt. Neue Zeilen entstehen nur durch Anfragen,
 * und je hundert entschiedene Anfragen EINER INSTANZ wird ein Lauf ausgelöst,
 * der bis zu fünfhundert abgelaufene Zeilen entfernt. Die Einschränkung dieser
 * Kopplung steht bei `AUFRAEUMEN_JEDE_N_TE_ANFRAGE`.
 *
 * Der Index auf `expiresAt` macht daraus einen begrenzten Indexzugriff statt
 * eines vollständigen Tabellendurchlaufs bei jeder Anfrage.
 *
 * `jetzt` kommt bewusst aus der Anwendung und NICHT aus `now()` der Datenbank.
 * DAS IST DIE TRAGENDE ZUSICHERUNG DIESER FUNKTION — nicht die Spaltenart.
 *
 * Die Spalten sind `timestamp` ohne Zeitzone, wie jede andere Zeitspalte
 * dieses Schemas. Darin steht die UTC-Wanduhrzeit. `now()` liefert dagegen
 * `timestamptz`; beim Vergleich wird die Spalte mit der Zeitzone der SITZUNG
 * gedeutet. Auf einem Rechner in `Europe/Berlin` gilt eine Zeile, die erst in
 * 60 Sekunden abläuft, damit bereits als abgelaufen — um den Versatz der
 * Sitzungszeitzone, also eine Stunde im Winter und zwei in der Sommerzeit —
 * und wäre hier mitten im laufenden Fenster entfernt worden. Der Zähler hätte von vorn
 * begonnen und die Grenze wäre unterlaufen.
 *
 * Wichtig für alle, die das später anfassen: Der Fehler ist mit `timestamp`
 * GENAUSO vorhanden wie mit `timestamptz`. Die Spaltenart wurde nur der
 * Einheitlichkeit halber geändert und behebt hier gar nichts. Wer `${jetzt}`
 * durch `now()` ersetzt, holt den Fehler zurück — unabhängig von der
 * Spaltenart. In der CI (UTC, Versatz null) fällt das nicht auf; der
 * Regressionstest in `tests/integration/rate-limit.test.ts` schlägt nur auf
 * einem Rechner an, der nicht in UTC läuft.
 *
 * `expiresAt` wird ZWEIMAL geprüft, in der Unterabfrage und noch einmal außen.
 * Das ist keine Dopplung: Die Unterabfrage arbeitet auf dem Schnappschuss des
 * Anweisungsbeginns. Hält eine gleichzeitige Transaktion die Zeile gesperrt
 * und schreibt sie fort, wartet das `DELETE` auf die Sperre und prüft danach
 * nur noch sein äußeres Prädikat gegen die NEUE Fassung der Zeile. Ohne die
 * äußere Bedingung würde ein eben erst aufgefrischter, LEBENDER Zähler
 * gelöscht, obwohl er zu diesem Zeitpunkt gar nicht mehr abgelaufen ist.
 */
export async function pruneExpiredBuckets(
  hoechstens: number = AUFRAEUMEN_HOECHSTENS,
  jetzt: Date = new Date(),
): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM rate_limit_buckets
    WHERE "keyHash" IN (
      SELECT "keyHash" FROM rate_limit_buckets
      WHERE "expiresAt" < ${jetzt}
      ORDER BY "expiresAt"
      LIMIT ${hoechstens}
    )
    AND "expiresAt" < ${jetzt}`;
}

/**
 * Das Aufräumen darf die Entscheidung nicht gefährden: Sie ist zu diesem
 * Zeitpunkt bereits gefallen und festgeschrieben. Scheitert das Entfernen,
 * wird das vermerkt und die Anfrage läuft weiter — abgelaufene Zeilen sind
 * ein Platzproblem, kein Sicherheitsproblem.
 */
async function vielleichtAufraeumen(): Promise<void> {
  anfragenSeitAufraeumen += 1;
  if (anfragenSeitAufraeumen < AUFRAEUMEN_JEDE_N_TE_ANFRAGE) return;
  anfragenSeitAufraeumen = 0;

  try {
    await pruneExpiredBuckets();
  } catch (error) {
    logger.warn('Abgelaufene Ratengrenzen-Zeilen konnten nicht entfernt werden', {
      fehlerart: error instanceof Error ? error.name : 'unbekannt',
    });
  }
}

/**
 * Nur für Tests: entfernt gezielt die Zeilen der angegebenen Schlüssel.
 *
 * Bewusst KEIN `TRUNCATE`: Die Tabelle ist prozessübergreifend geteilt, und
 * ein Test, der alles leert, zieht anderen Tests den Zustand unter den Füßen
 * weg (docs/TESTING.md).
 */
export async function __resetRateLimits(keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return;
  await prisma.rateLimitBucket.deleteMany({ where: { keyHash: { in: keys.map(digest) } } });
}

/** Nur für Tests: der Digest, unter dem ein Schlüssel gespeichert wird. */
export function __rateLimitKeyHash(key: string): string {
  return digest(key);
}

export async function enforceRateLimit(key: string, config: RateLimitConfig): Promise<void> {
  const result = await checkRateLimit(key, config);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
}
