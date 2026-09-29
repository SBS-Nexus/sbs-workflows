import 'server-only';
import { prisma } from '@/server/db/prisma';
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
  const text = typeof wert === 'string' ? wert : String(wert);
  return text.length <= HOECHSTE_MELDUNGSLAENGE
    ? text
    : `${text.slice(0, HOECHSTE_MELDUNGSLAENGE)}… (${text.length} Zeichen)`;
}

function pflichtfeld(wert: string, feld: string): string {
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

function freiwilligesFeld(wert: string | undefined, feld: string): string | undefined {
  if (wert === undefined) return undefined;
  return pflichtfeld(wert, feld);
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
  if (!istAuditAction(eingabe.action)) {
    // Nur die Bezeichnung, nie die übrigen Felder: Die Meldung kann in einem
    // Log landen, die Felder gehören dort nicht hin. Und auch die
    // Bezeichnung nur gekürzt — sie kommt von außen und kann beliebig lang
    // sein; sonst widerspräche dieser Satz sich selbst.
    throw new TypeError(`Unbekannte Auditvorgangsbezeichnung: ${fuerMeldung(eingabe.action)}`);
  }

  const metadata = eingabe.metadata ?? {};
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    throw new TypeError('Auditmetadaten müssen ein Objekt sein.');
  }

  const geschwaerzt = redactMetadata(metadata);
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
    action: eingabe.action,
    actorUserId: freiwilligesFeld(eingabe.actorUserId, 'actorUserId') ?? null,
    organizationId: freiwilligesFeld(eingabe.organizationId, 'organizationId') ?? null,
    targetType: pflichtfeld(eingabe.targetType, 'targetType'),
    targetId: freiwilligesFeld(eingabe.targetId, 'targetId') ?? null,
    metadata: geschwaerzt,
  };
}

async function schreiben(
  eingabe: AppendAuditEventInput,
  occurredAt: Date,
): Promise<AuditEventRecord> {
  const geprueft = pruefeEingabe(eingabe);

  const zeile = await prisma.auditEvent.create({
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
  return schreiben(eingabe, new Date());
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
  return schreiben(eingabe, occurredAt);
}

/**
 * Liest Auditzeilen, neueste zuerst.
 *
 * Ohne Filter liefert sie die neuesten `STANDARD_LIMIT` Zeilen. Das Limit
 * ist immer gedeckelt: Eine Auditabfrage ohne Obergrenze wäre der leichteste
 * Weg, die Tabelle in einer Antwort auszuleeren.
 */
export async function readAuditEvents(query: AuditEventQuery = {}): Promise<AuditEventRecord[]> {
  // `Number.isFinite` zuerst: `Math.min(Math.max(NaN, 1), 500)` ist `NaN`,
  // und ein `NaN` reichte bis zu Prisma durch, dessen Fehlermeldung den
  // absoluten Quellpfad und einen Codeausschnitt enthält. Ein `take`, das
  // aus `Number(searchParams.get(...))` stammt, ist genau dieser Fall.
  const gewuenscht = Number.isFinite(query.take) ? Number(query.take) : STANDARD_LIMIT;
  const take = Math.min(Math.max(Math.trunc(gewuenscht), 1), HOECHSTES_LIMIT);

  const occurredAt =
    query.occurredFrom || query.occurredBefore
      ? {
          ...(query.occurredFrom ? { gte: new Date(query.occurredFrom.getTime()) } : {}),
          ...(query.occurredBefore ? { lt: new Date(query.occurredBefore.getTime()) } : {}),
        }
      : undefined;

  const zeilen = await prisma.auditEvent.findMany({
    where: {
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(occurredAt ? { occurredAt } : {}),
    },
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
