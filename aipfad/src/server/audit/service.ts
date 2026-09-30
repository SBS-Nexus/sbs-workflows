import 'server-only';
import { prisma } from '@/server/db/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { istAuditAction } from '@/server/audit/actions';
import { redactMetadata, type AuditMetadata } from '@/server/audit/redaction';
import type {
  AppendAuditEventInput,
  AuditEventQuery,
  AuditEventRecord,
} from '@/server/audit/types';

/**
 * Der Auditdienst (E07/ENT-B06) — die EINZIGE Stelle, über die die
 * Anwendung Auditzeilen schreibt oder liest.
 *
 * ANFÜGEN UND LESEN, sonst nichts. Diese Datei exportiert bewusst kein
 * Ändern, kein Löschen, kein `deleteMany` und auch nicht das
 * Prisma-Delegate: Was nicht exportiert wird, kann kein Aufrufer
 * versehentlich verwenden.
 *
 * Anfügen gibt es in zwei Formen mit DERSELBEN Prüfung, Schwärzung und
 * Zeitvergabe: `appendAuditEvent` schreibt über den globalen Client,
 * `appendAuditEventInTransaction` über die Transaktion des Aufrufers. Die
 * zweite braucht jeder fachliche Vorgang, dessen Spur nicht ohne ihn
 * bestehen darf und er nicht ohne seine Spur — E04C löscht ein Konto und
 * schreibt `ACCOUNT_DELETED` in EINER Transaktion.
 *
 * Die eine Ausnahme ist kein Widerspruch, sondern die Grenze des Satzes:
 * Die Aufbewahrung löscht nach ALTER über den Rahmen aus E04A
 * (`src/server/retention/rules.ts`). Sie löscht nie nach Inhalt und kann
 * keine einzelne Spur entfernen. Ein fachlicher Löschpfad existiert nicht.
 *
 * AUSDRÜCKLICH NICHT ZUGESICHERT: Manipulationssicherheit auf Datenbank-
 * ebene. Es gibt keine eigene Datenbankrolle, kein `REVOKE`, keinen
 * Anfügeauslöser. Wer Schreibrechte auf der Datenbank hat, kann Zeilen
 * ändern oder entfernen. „Nur anfügbar" beschreibt hier die
 * Anwendungsschnittstelle, nicht den Speicher.
 */

/** Obergrenze für gelesene Zeilen, auch wenn niemand ein Limit angibt. */
const HOECHSTES_LIMIT = 500;
const STANDARD_LIMIT = 100;

/**
 * Obergrenzen für die Größe einer Zeile.
 *
 * Der Vertrag „knappe betriebliche Tatsachen" (docs/SECURITY.md) stand bisher
 * nur in Prosa. Prosa hält keinen Aufrufer auf: Ohne Grenze ließe sich über
 * `metadata` beliebig viel in eine Tabelle schreiben, die keinen fachlichen
 * Löschpfad hat und erst nach Ablauf der Frist verschwindet. Die Zahlen sind
 * bewusst großzügig — sie sollen einen Missbrauch abfangen, keinen
 * legitimen Vorgang.
 *
 * `HOECHSTE_KENNUNGSLAENGE` passt zu `DEPLOYMENT_ID` in `env.ts`.
 */
const HOECHSTE_KENNUNGSLAENGE = 200;
const HOECHSTE_METADATENGROESSE = 4096;

/** Wie viel einer fremden Zeichenkette in einer Fehlermeldung erscheinen darf. */
const HOECHSTE_MELDUNGSLAENGE = 80;

/**
 * Kürzt einen nicht vertrauenswürdigen Wert für eine Fehlermeldung.
 *
 * Die Meldung kann in einem Log landen; eine ungekürzte Eingabe machte den
 * Logstrom zum Ablageort für beliebigen fremden Text.
 */
function fuerMeldung(wert: unknown): string {
  // Keine Zeichenkette: nur die Art. `String()` über einen fremden Wert zöge
  // dessen Inhalt in die Meldung (ein Array mit einer Adresse) oder führte
  // fremden Code aus (`toString`) — bei einem Objekt ohne Prototyp würfe es
  // sogar selbst und verdrängte diese Meldung.
  if (typeof wert !== 'string') return `(${wert === null ? 'null' : typeof wert})`;
  const text = wert;
  return text.length <= HOECHSTE_MELDUNGSLAENGE
    ? text
    : `${text.slice(0, HOECHSTE_MELDUNGSLAENGE)}… (${text.length} Zeichen)`;
}

/**
 * Prüft die Form eines Objekts an der Dienstgrenze und liefert seine
 * vorhandenen Schlüssel.
 *
 * Nur ein einfaches Objekt: Bei einer Klasseninstanz lägen Schlüssel auf dem
 * Prototyp, wo keine Schlüsselprüfung sie sieht. Jeder eigene Schlüssel —
 * `Reflect.ownKeys`, also auch nicht aufzählbare und Symbole — muss auf der
 * Positivliste stehen: Ein unbekannter (`actorId` statt `actorUserId`, etwa
 * aus einem Spread, den TypeScript nicht meldet) fiele sonst still weg.
 *
 * Die zurückgegebene Menge entscheidet danach über „vorhanden". Eine zweite
 * Frage an das Objekt (`in`) könnte bei einem Proxy anders ausfallen als die
 * hier geprüfte Liste.
 */
function vorhandeneSchluessel(
  wert: unknown,
  erlaubt: ReadonlySet<string>,
  art: 'Auditabfrage' | 'Auditeingabe',
  unbekannt: string,
): ReadonlySet<string> {
  if (typeof wert !== 'object' || wert === null) {
    throw new TypeError(`${art} muss ein einfaches Objekt sein.`);
  }
  const prototyp: unknown = Object.getPrototypeOf(wert);
  if (prototyp !== Object.prototype && prototyp !== null) {
    throw new TypeError(`${art} muss ein einfaches Objekt sein.`);
  }
  const schluessel = new Set<string>();
  for (const eintrag of Reflect.ownKeys(wert)) {
    if (typeof eintrag !== 'string' || !erlaubt.has(eintrag)) {
      throw new TypeError(`${unbekannt}: ${fuerMeldung(String(eintrag))}`);
    }
    schluessel.add(eintrag);
  }
  return schluessel;
}

/** Alle Felder, die `AppendAuditEventInput` kennt. Jedes andere ist ein Fehler. */
const ERLAUBTE_EINGABEFELDER: ReadonlySet<string> = new Set([
  'action',
  'actorUserId',
  'organizationId',
  'targetType',
  'targetId',
  'metadata',
]);

function pflichtfeld(wert: unknown, feld: string): string {
  if (typeof wert !== 'string') {
    throw new TypeError(`${feld} ist gesetzt, aber keine Zeichenkette.`);
  }
  const getrimmt = wert.trim();
  if (getrimmt.length === 0) {
    throw new TypeError(`${feld} darf nicht leer sein.`);
  }
  if (getrimmt.length > HOECHSTE_KENNUNGSLAENGE) {
    throw new TypeError(
      `${feld} darf höchstens ${HOECHSTE_KENNUNGSLAENGE} Zeichen lang sein (war ${getrimmt.length}).`,
    );
  }
  return getrimmt;
}

/**
 * Ein freiwilliges Kennungsfeld fehlt, oder es ist gültig — dieselbe Regel
 * wie bei den Lesefiltern. Ein gesetztes `undefined` (`session?.userId` nach
 * einer gescheiterten Sitzungssuche) würde sonst still zu „kein Akteur", und
 * die Spur verlöre ihre Zuordnung.
 */
function freiwilligesFeld(
  eingabe: AppendAuditEventInput,
  vorhanden: ReadonlySet<string>,
  feld: 'actorUserId' | 'organizationId' | 'targetId',
): string | null {
  if (!vorhanden.has(feld)) return null;
  return pflichtfeld(eingabe[feld], feld);
}

/** `targetType` ist Pflicht: Fehlt es, heißt die Meldung „fehlt", nicht „falsch". */
function pflichtfeldVorhanden(
  eingabe: AppendAuditEventInput,
  vorhanden: ReadonlySet<string>,
): string {
  if (!vorhanden.has('targetType')) {
    throw new TypeError('targetType fehlt.');
  }
  return pflichtfeld(eingabe.targetType, 'targetType');
}

/**
 * Prüft die Eingabe an der Dienstgrenze.
 *
 * TypeScript hilft hier nicht: Ein Aufrufer kann casten, und ein späterer
 * Aufrufer steht vielleicht hinter einer Route. Die Prüfung läuft deshalb
 * zur Laufzeit — insbesondere die Vorgangsbezeichnung gegen das kanonische
 * Verzeichnis, damit keine erfundene Bezeichnung in die Tabelle gerät.
 */
function pruefeEingabe(eingabe: AppendAuditEventInput): {
  action: string;
  actorUserId: string | null;
  organizationId: string | null;
  targetType: string;
  targetId: string | null;
  metadata: AuditMetadata;
} {
  const vorhanden = vorhandeneSchluessel(
    eingabe,
    ERLAUBTE_EINGABEFELDER,
    'Auditeingabe',
    'Unbekanntes Auditfeld',
  );

  // Genau EIN Lesezugriff: Geprüft und geschrieben wird derselbe Wert. Ein
  // Getter, der beim zweiten Lesen etwas anderes liefert, schriebe sonst eine
  // ungeprüfte Bezeichnung.
  if (!vorhanden.has('action')) {
    throw new TypeError('action fehlt.');
  }
  const action: unknown = eingabe.action;
  if (!istAuditAction(action)) {
    // Nur die Bezeichnung, nie die übrigen Felder: Die Meldung kann in einem
    // Log landen, die Felder gehören dort nicht hin. Und auch die
    // Bezeichnung nur gekürzt — sie kommt von außen und kann beliebig lang
    // sein; sonst widerspräche dieser Satz sich selbst.
    throw new TypeError(`Unbekannte Auditvorgangsbezeichnung: ${fuerMeldung(action)}`);
  }

  // Fehlt `metadata`, ist es `{}`. Ist es gesetzt, muss es ein Objekt sein —
  // auch `null` oder `undefined` (`diff ?? null` nach einem Fehler) werden
  // abgewiesen, statt still als leere Tatsachen geschrieben zu werden.
  const metadata: unknown = vorhanden.has('metadata') ? eingabe.metadata : {};
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    throw new TypeError('Auditmetadaten müssen ein Objekt sein.');
  }

  const geschwaerzt = redactMetadata(metadata as Record<string, unknown>);
  // Nach der Schwärzung gemessen: Was zählt, ist die Größe dessen, was
  // WIRKLICH in die Zeile geht. Vor der Schwärzung gemessen wäre die Grenze
  // strenger als nötig, wenn ein langer Wert ohnehin ersetzt wird.
  const groesse = JSON.stringify(geschwaerzt).length;
  if (groesse > HOECHSTE_METADATENGROESSE) {
    throw new RangeError(
      `Auditmetadaten sind zu groß: ${groesse} Zeichen, erlaubt sind ${HOECHSTE_METADATENGROESSE}. ` +
        'Metadaten tragen knappe betriebliche Tatsachen, keine Anfrageinhalte.',
    );
  }

  return {
    action,
    actorUserId: freiwilligesFeld(eingabe, vorhanden, 'actorUserId'),
    organizationId: freiwilligesFeld(eingabe, vorhanden, 'organizationId'),
    targetType: pflichtfeldVorhanden(eingabe, vorhanden),
    targetId: freiwilligesFeld(eingabe, vorhanden, 'targetId'),
    metadata: geschwaerzt,
  };
}

/**
 * Die kleinste Datenbankfähigkeit, die das Anfügen braucht: genau
 * `auditEvent.create`, sonst nichts.
 *
 * Ein `Prisma.TransactionClient` aus `prisma.$transaction(async (tx) => …)`
 * erfüllt diesen Typ, ohne dass der Aufrufer etwas umwandeln muss. Umgekehrt
 * sieht der Dienst über diesen Parameter kein anderes Modell und keine andere
 * Operation — insbesondere kein Ändern und kein Löschen.
 */
interface AuditAppendWriter {
  auditEvent: Pick<Prisma.TransactionClient['auditEvent'], 'create'>;
}

/**
 * Öffentliche Typgrenze für den Transaktionspfad.
 *
 * Ein echter `Prisma.TransactionClient` hat keine eigene `$connect`-
 * Methode; der globale `PrismaClient` schon. Die negative Eigenschaft hält
 * den globalen Client deshalb bereits beim Typecheck aus dieser Schnittstelle
 * heraus, ohne dem Dienst weitere Datenbankfähigkeiten zu geben.
 */
export interface AuditAppendTransaction extends AuditAppendWriter {
  $connect?: never;
}

/**
 * Der EINE Schreibweg. Beide öffentlichen Formen des Anfügens landen hier;
 * Prüfung, Schwärzung und Größengrenzen gibt es deshalb nur einmal.
 *
 * Öffnet selbst keine Transaktion. Scheitert die Prüfung, wirft sie, bevor
 * geschrieben wird — innerhalb einer Transaktion des Aufrufers rollt dieser
 * Fehler dann auch den fachlichen Vorgang zurück. Das ist gewollt: Ein
 * prüfpflichtiger Vorgang ohne gültige Spur findet nicht statt.
 */
async function schreiben(
  db: AuditAppendWriter,
  eingabe: AppendAuditEventInput,
  occurredAt: Date,
): Promise<AuditEventRecord> {
  const geprueft = pruefeEingabe(eingabe);

  const zeile = await db.auditEvent.create({
    data: { ...geprueft, occurredAt: new Date(occurredAt.getTime()) },
  });

  return alsRecord(zeile);
}

/**
 * Fügt eine Auditzeile an. Der Zeitpunkt kommt IMMER vom Server.
 *
 * Es gibt hier absichtlich keinen Zeitparameter. Eine frühere Fassung hatte
 * einen mit dem Hinweis, eine Route dürfe ihn nicht durchreichen — aber ein
 * Hinweis ist eine Bitte, keine Grenze: Wer eine Route baut und den Wert aus
 * der Anfrage weiterreicht, könnte eine Spur zurückdatieren. Jetzt ist der
 * einzige Weg dazu die Funktion darunter, deren Name das Missverständnis
 * ausschließt.
 */
export async function appendAuditEvent(eingabe: AppendAuditEventInput): Promise<AuditEventRecord> {
  return schreiben(prisma, eingabe, new Date());
}

/**
 * Fügt eine Auditzeile INNERHALB der Transaktion des Aufrufers an.
 *
 *     await prisma.$transaction(async (tx) => {
 *       await tx.user.delete({ where: { id } });
 *       await appendAuditEventInTransaction(tx, { action: 'ACCOUNT_DELETED', … });
 *     });
 *
 * Fachlicher Vorgang und Spur werden gemeinsam festgeschrieben oder gemeinsam
 * verworfen. Es entsteht keine zweite Transaktion; der Dienst schreibt über
 * genau das `tx`, das er bekommt. Prüfung, Schwärzung und serverseitiger
 * Zeitpunkt sind dieselben wie bei `appendAuditEvent`.
 */
export async function appendAuditEventInTransaction(
  tx: AuditAppendTransaction,
  eingabe: AppendAuditEventInput,
): Promise<AuditEventRecord> {
  // TypeScript kann absichtlich umgangen werden. Deshalb dieselbe Grenze
  // zusätzlich zur Laufzeit: Der globale PrismaClient besitzt `$connect`,
  // ein interaktiver TransactionClient nicht. Ohne diese Prüfung könnte ein
  // Cast die Auditzeile außerhalb des fachlichen Transaktionskontexts
  // festschreiben.
  //
  // Der zweite Vergleich fängt eine Hülle um das Delegate des globalen
  // Clients (`{ auditEvent: prisma.auditEvent }`): Sie hat kein `$connect`
  // und erfüllt den Typ, schriebe aber ebenfalls außerhalb der Transaktion.
  // Das Delegate ist pro Client stabil, das von `tx` ein anderes.
  if ('$connect' in tx || tx.auditEvent === prisma.auditEvent) {
    throw new TypeError(
      'appendAuditEventInTransaction erwartet einen Prisma-Transaktionsclient, nicht den globalen Prisma-Client.',
    );
  }

  return schreiben(tx, eingabe, new Date());
}

/**
 * NUR FÜR TESTS: fügt mit einem gewählten Zeitpunkt an.
 *
 * Die Aufbewahrungsprüfungen brauchen Zeilen, die messbar zu alt sind; ohne
 * diesen Weg müssten sie warten oder an der Schnittstelle vorbei direkt in
 * die Tabelle schreiben — und prüften dann nicht mehr, was der Dienst tut.
 * Im Anwendungscode hat diese Funktion nichts zu suchen.
 */
export async function appendAuditEventMitZeitpunktFuerTests(
  eingabe: AppendAuditEventInput,
  occurredAt: Date,
): Promise<AuditEventRecord> {
  return schreiben(prisma, eingabe, occurredAt);
}

/** Die Filter, die eine Abfrage auf Akteur, Organisation oder Vorgangsart einschränken. */
const KENNUNGSFILTER = ['actorUserId', 'organizationId', 'action'] as const;

/** Alle Schlüssel, die `AuditEventQuery` kennt. Jeder andere ist ein Fehler. */
const ERLAUBTE_ABFRAGESCHLUESSEL: ReadonlySet<string> = new Set([
  ...KENNUNGSFILTER,
  'occurredFrom',
  'occurredBefore',
  'take',
]);

/**
 * Prüft die Lesefilter an der Dienstgrenze und baut daraus die Bedingung.
 *
 * Die Regel: Ein Filter fehlt, oder er ist gültig. Einen dritten Zustand gibt
 * es nicht. Die Form (einfaches Objekt, Positivliste) prüft
 * `vorhandeneSchluessel` vorher; hier wird jeder Wert genau einmal gelesen. Ein
 * gesetzter Schlüssel, dessen Wert keine Zeichenkette ist —
 * `undefined` aus `session?.userId`, ein Prisma-Operator wie `{ not: 'x' }`
 * aus einem Anfragekörper —, weitete die Abfrage sonst still auf fremde
 * Zeilen aus. Er wirft deshalb, statt als „kein Filter" zu gelten. Eine leere
 * Zeichenkette ist gültig und findet nichts.
 *
 * Dieselbe Begründung wie beim Anfügen: TypeScript hilft hier nicht, ein
 * Aufrufer kann casten. Die Meldung nennt nur das Feld, nie den Wert.
 */
function pruefeLesefilter(
  query: AuditEventQuery,
  vorhanden: ReadonlySet<string>,
): Prisma.AuditEventWhereInput {
  const where: Prisma.AuditEventWhereInput = {};

  for (const feld of KENNUNGSFILTER) {
    // Ein eigener Getter ist ebenso gesetzt wie ein Datenfeld; sein Wert wird
    // genau einmal gelesen.
    if (!vorhanden.has(feld)) continue;
    const wert: unknown = query[feld];
    if (typeof wert !== 'string') {
      throw new TypeError(`Auditfilter ${feld} ist gesetzt, aber keine Zeichenkette.`);
    }
    // Die Vorgangsart ist keine freie Kennung. Ein falsch geschriebener
    // Vorgang (`ACCOUNT_DELETE`) fände sonst nichts — und ein leeres Ergebnis
    // hieße für die prüfende Person „kein solcher Vorgang".
    if (feld === 'action' && !istAuditAction(wert)) {
      throw new TypeError('Auditfilter action ist keine bekannte Vorgangsbezeichnung.');
    }
    where[feld] = wert;
  }

  const gte = zeitgrenze(query, vorhanden, 'occurredFrom');
  const lt = zeitgrenze(query, vorhanden, 'occurredBefore');
  if (gte || lt) {
    where.occurredAt = { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) };
  }

  return where;
}

/**
 * Eine Zeitgrenze fehlt, oder sie ist ein gültiges `Date`. Ein ungültiges
 * Datum (`new Date('abc')`) ist wahr und erreichte sonst Prisma, dessen
 * Fehlermeldung den absoluten Quellpfad enthält — derselbe Fall wie `NaN`
 * bei `take`.
 */
function zeitgrenze(
  query: AuditEventQuery,
  vorhanden: ReadonlySet<string>,
  feld: 'occurredFrom' | 'occurredBefore',
): Date | undefined {
  if (!vorhanden.has(feld)) return undefined;
  const wert: unknown = query[feld];
  if (!(wert instanceof Date)) {
    throw new TypeError(`Auditfilter ${feld} ist gesetzt, aber kein gültiges Datum.`);
  }
  // Der innere Zeitwert, genau einmal gelesen: Ein überschriebenes `getTime`
  // könnte sonst beim Prüfen etwas anderes liefern als beim Übernehmen.
  const zeit: number = Date.prototype.getTime.call(wert);
  if (!Number.isFinite(zeit)) {
    throw new TypeError(`Auditfilter ${feld} ist gesetzt, aber kein gültiges Datum.`);
  }
  return new Date(zeit);
}

/**
 * Liest Auditzeilen, neueste zuerst.
 *
 * Die Abfrage ist Pflicht. Ein Vorgabewert machte aus `undefined` —
 * `readAuditEvents(bauAbfrage(sitzung))` ohne Sitzung — still eine Abfrage
 * über alle Akteure. Wer ungefiltert lesen will, schreibt `{}`.
 *
 * Ohne Filter liefert sie die neuesten `STANDARD_LIMIT` Zeilen. Das Limit
 * ist immer gedeckelt: Eine Auditabfrage ohne Obergrenze wäre der leichteste
 * Weg, die Tabelle in einer Antwort auszuleeren.
 */
export async function readAuditEvents(query: AuditEventQuery): Promise<AuditEventRecord[]> {
  // Die Form wird ZUERST geprüft: Kein Getter einer Abfrage, die ohnehin
  // abgewiesen wird, soll vorher laufen.
  const vorhanden = vorhandeneSchluessel(
    query,
    ERLAUBTE_ABFRAGESCHLUESSEL,
    'Auditabfrage',
    'Unbekannter Auditfilter',
  );
  const where = pruefeLesefilter(query, vorhanden);

  // `Number.isFinite` zuerst: `Math.min(Math.max(NaN, 1), 500)` ist `NaN`,
  // und ein `NaN` reichte bis zu Prisma durch, dessen Fehlermeldung den
  // absoluten Quellpfad und einen Codeausschnitt enthält. Ein `take`, das
  // aus `Number(searchParams.get(...))` stammt, ist genau dieser Fall.
  //
  // Genau EIN Lesezugriff: Ein Getter, der beim zweiten Lesen `NaN` liefert,
  // käme sonst an der Prüfung vorbei.
  const rohesTake: unknown = vorhanden.has('take') ? query.take : undefined;
  const gewuenscht = Number.isFinite(rohesTake) ? Number(rohesTake) : STANDARD_LIMIT;
  const take = Math.min(Math.max(Math.trunc(gewuenscht), 1), HOECHSTES_LIMIT);

  const zeilen = await prisma.auditEvent.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take,
  });

  return zeilen.map(alsRecord);
}

function alsRecord(zeile: {
  id: string;
  action: string;
  actorUserId: string | null;
  organizationId: string | null;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  occurredAt: Date;
}): AuditEventRecord {
  if (!istAuditAction(zeile.action)) {
    // Kann nur entstehen, wenn jemand an der Anwendung vorbei geschrieben
    // hat. Genau der Fall, den die Datenbank NICHT verhindert — deshalb
    // fällt er hier auf, statt als scheinbar gültiger Wert weiterzulaufen.
    throw new TypeError(`Auditzeile mit unbekannter Vorgangsbezeichnung: ${zeile.id}`);
  }

  return {
    id: zeile.id,
    action: zeile.action,
    actorUserId: zeile.actorUserId,
    organizationId: zeile.organizationId,
    targetType: zeile.targetType,
    targetId: zeile.targetId,
    metadata: (zeile.metadata ?? {}) as AuditMetadata,
    occurredAt: zeile.occurredAt,
  };
}
