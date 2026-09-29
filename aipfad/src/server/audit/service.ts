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

function pflichtfeld(wert: string, feld: string): string {
  const getrimmt = wert.trim();
  if (getrimmt.length === 0) {
    throw new TypeError(`${feld} darf nicht leer sein.`);
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
    // Log landen, die Felder gehören dort nicht hin.
    throw new TypeError(`Unbekannte Auditvorgangsbezeichnung: ${String(eingabe.action)}`);
  }

  const metadata = eingabe.metadata ?? {};
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    throw new TypeError('Auditmetadaten müssen ein Objekt sein.');
  }

  return {
    action: eingabe.action,
    actorUserId: freiwilligesFeld(eingabe.actorUserId, 'actorUserId') ?? null,
    organizationId: freiwilligesFeld(eingabe.organizationId, 'organizationId') ?? null,
    targetType: pflichtfeld(eingabe.targetType, 'targetType'),
    targetId: freiwilligesFeld(eingabe.targetId, 'targetId') ?? null,
    metadata: redactMetadata(metadata),
  };
}

/**
 * Fügt eine Auditzeile an.
 *
 * `occurredAt` kommt vom Server. Der Parameter existiert für Tests, die
 * eine feste Grenze brauchen — nicht für Aufrufer, die einen Zeitpunkt
 * mitbringen wollen; eine künftige Route darf ihn nicht durchreichen.
 */
export async function appendAuditEvent(
  eingabe: AppendAuditEventInput,
  occurredAt: Date = new Date(),
): Promise<AuditEventRecord> {
  const geprueft = pruefeEingabe(eingabe);

  const zeile = await prisma.auditEvent.create({
    data: { ...geprueft, occurredAt: new Date(occurredAt.getTime()) },
  });

  return alsRecord(zeile);
}

/**
 * Liest Auditzeilen, neueste zuerst.
 *
 * Ohne Filter liefert sie die neuesten `STANDARD_LIMIT` Zeilen. Das Limit
 * ist immer gedeckelt: Eine Auditabfrage ohne Obergrenze wäre der leichteste
 * Weg, die Tabelle in einer Antwort auszuleeren.
 */
export async function readAuditEvents(query: AuditEventQuery = {}): Promise<AuditEventRecord[]> {
  const take = Math.min(Math.max(query.take ?? STANDARD_LIMIT, 1), HOECHSTES_LIMIT);

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
