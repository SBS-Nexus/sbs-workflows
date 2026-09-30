import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import {
  appendAuditEvent,
  appendAuditEventInTransaction,
  appendAuditEventMitZeitpunktFuerTests,
  readAuditEvents,
} from '@/server/audit/service';
import { SCHWAERZUNG } from '@/server/audit/redaction';
import {
  auditRetentionRule,
  attemptRetentionRule,
  PRODUKTIVE_REGELN,
} from '@/server/retention/rules';
import { runRetention } from '@/server/retention/runner';

/**
 * Die Auditgrundlage gegen eine echte Datenbank (E07/ENT-B06).
 *
 * Hier steht, was sich nur mit echten Zeilen zeigen lässt: dass die
 * Akteurskennung eine Kontolöschung überdauert (kein Fremdschlüssel, keine
 * Kaskade), dass geschwärzte Metadaten auch geschwärzt ANKOMMEN, dass die
 * Filter über die vorgesehenen Zugriffe funktionieren, und dass die
 * Auditfrist über den Rahmen aus E04A wirklich löscht. Die reine Logik —
 * Verzeichnis, Schwärzungsregel — steht in den Unit-Tests.
 */

const PRAEFIX = 'audit@integrationtest.local';
const ORG = 'org-integrationtest-0001';
const JETZT = new Date('2026-06-15T12:00:00.000Z');
const TAG = 24 * 60 * 60 * 1000;
const GEHEIM = 'SUPERGEHEIM-KANARIENVOGEL';

/**
 * Statische Regression: Der globale PrismaClient darf den Parameter des
 * Transaktionspfads nicht erfüllen. Wird die negative Typgrenze später
 * entfernt, macht die dann überflüssige Direktive den Typecheck rot.
 */
// @ts-expect-error Der globale PrismaClient ist kein interaktiver TransactionClient.
const GLOBALER_CLIENT_IST_KEIN_TX: Parameters<typeof appendAuditEventInTransaction>[0] = prisma;
void GLOBALER_CLIENT_IST_KEIN_TX;

/** Nur die eigenen Zeilen entfernen, keine fremden (docs/TESTING.md). */
async function eigeneZeilenEntfernen(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { contains: PRAEFIX } } });
  await prisma.auditEvent.deleteMany({
    where: { OR: [{ organizationId: ORG }, { targetType: 'IntegrationstestZiel' }] },
  });
}

async function nutzerAnlegen(name: string): Promise<string> {
  const nutzer = await prisma.user.create({
    data: {
      email: `${name}-${PRAEFIX}`,
      name: 'Audittest',
      passwordHash: await hashPassword('ein-sicheres-testpasswort-123'),
    },
  });
  return nutzer.id;
}

/** Ein Lauf über die echte Auditregel, mit fester Uhr. */
function auditLauf(mode: 'dry-run' | 'execute', now: Date = JETZT) {
  return runRetention({ rules: [auditRetentionRule], mode, now, runId: `audit-${mode}` });
}

describe('Auditgrundlage (Integration mit echter Datenbank)', () => {
  beforeEach(eigeneZeilenEntfernen);
  afterAll(eigeneZeilenEntfernen);

  it('fügt an und liest zurück', async () => {
    const userId = await nutzerAnlegen('anfuegen');
    const angelegt = await appendAuditEvent({
      action: 'ACCOUNT_DELETED',
      actorUserId: userId,
      targetType: 'IntegrationstestZiel',
      targetId: userId,
      metadata: { reasonCode: 'TEST' },
    });

    expect(angelegt.id).toBeTruthy();
    expect(angelegt.occurredAt).toBeInstanceOf(Date);

    const gelesen = await readAuditEvents({ actorUserId: userId });
    expect(gelesen).toHaveLength(1);
    expect(gelesen[0]?.action).toBe('ACCOUNT_DELETED');
    expect(gelesen[0]?.metadata).toEqual({ reasonCode: 'TEST' });
  });

  it('filtert nach Akteur, Organisation und Vorgangsart', async () => {
    const einer = await nutzerAnlegen('filter-a');
    const anderer = await nutzerAnlegen('filter-b');

    await appendAuditEvent({
      action: 'ACCOUNT_DELETED',
      actorUserId: einer,
      targetType: 'IntegrationstestZiel',
    });
    await appendAuditEvent({
      action: 'PERSONAL_DATA_EXPORTED',
      actorUserId: anderer,
      organizationId: ORG,
      targetType: 'IntegrationstestZiel',
    });

    expect(await readAuditEvents({ actorUserId: einer })).toHaveLength(1);
    expect((await readAuditEvents({ actorUserId: einer }))[0]?.actorUserId).toBe(einer);

    const nachOrg = await readAuditEvents({ organizationId: ORG });
    expect(nachOrg).toHaveLength(1);
    expect(nachOrg[0]?.actorUserId).toBe(anderer);

    const nachVorgang = await readAuditEvents({ action: 'PERSONAL_DATA_EXPORTED' });
    expect(nachVorgang.every((e) => e.action === 'PERSONAL_DATA_EXPORTED')).toBe(true);
    expect(nachVorgang.length).toBeGreaterThan(0);
  });

  it('behandelt einen explizit leeren Filter nicht wie einen fehlenden Filter', async () => {
    const userId = await nutzerAnlegen('leerer-filter');
    await appendAuditEvent({
      action: 'ACCOUNT_DELETED',
      actorUserId: userId,
      organizationId: ORG,
      targetType: 'IntegrationstestZiel',
    });

    // Vor der Korrektur wurde '' wegen der Truthiness-Prüfung verworfen.
    // Damit wurde aus einem einschränkenden Filter eine ungefilterte Abfrage.
    // Alle drei Kennungsfilter, nicht nur der Akteur.
    await expect(readAuditEvents({ actorUserId: '' })).resolves.toEqual([]);
    await expect(readAuditEvents({ organizationId: '' })).resolves.toEqual([]);
    // Die Vorgangsart ist keine freie Kennung: Eine unbekannte Bezeichnung —
    // auch '' — wird abgewiesen, wie beim Anfügen.
    await expect(readAuditEvents({ action: '' as never })).rejects.toThrow(
      'Auditfilter action ist keine bekannte Vorgangsbezeichnung',
    );
  });

  it('weist einen falsch geschriebenen Vorgangsfilter ab, statt nichts zu finden', async () => {
    const userId = await nutzerAnlegen('vorgangsfilter');
    await appendAuditEvent({
      action: 'ACCOUNT_DELETED',
      actorUserId: userId,
      targetType: 'IntegrationstestZiel',
    });

    // Ein leeres Ergebnis hieße für die prüfende Person „keine Löschung" —
    // ein falsches Negativ in der Prüfspur.
    await expect(readAuditEvents({ action: 'ACCOUNT_DELETE' as never })).rejects.toThrow(
      'Auditfilter action ist keine bekannte Vorgangsbezeichnung',
    );
    await expect(readAuditEvents({ action: 'ACCOUNT_DELETED' })).resolves.toHaveLength(1);
  });

  it('weist einen gesetzten, aber ungültigen Filter ab, statt ihn wegzulassen', async () => {
    const userId = await nutzerAnlegen('ungueltiger-filter');
    await appendAuditEvent({
      action: 'ACCOUNT_DELETED',
      actorUserId: userId,
      organizationId: ORG,
      targetType: 'IntegrationstestZiel',
    });

    // `undefined` aus `session?.userId`: Als „kein Filter" gelesen, läse die
    // Abfrage die Zeilen ALLER Akteure. Der Aufruf ist typkorrekt.
    const ohneSitzung: { userId?: string } = {};
    await expect(readAuditEvents({ actorUserId: ohneSitzung.userId })).rejects.toThrow(
      'Auditfilter actorUserId ist gesetzt, aber keine Zeichenkette',
    );
    await expect(readAuditEvents({ organizationId: undefined })).rejects.toThrow(TypeError);
    await expect(readAuditEvents({ action: undefined })).rejects.toThrow(TypeError);

    // Ein Prisma-Operator aus einem Anfragekörper, per Cast durchgereicht:
    // `{ not: … }` läse die Zeilen fremder Organisationen.
    await expect(readAuditEvents({ organizationId: { not: 'x' } as never })).rejects.toThrow(
      'Auditfilter organizationId ist gesetzt, aber keine Zeichenkette',
    );

    // Ein ungültiges Datum ist wahr und erreichte sonst Prisma, dessen
    // Fehlermeldung den absoluten Quellpfad enthält.
    await expect(readAuditEvents({ occurredFrom: new Date('keine-zeit') })).rejects.toThrow(
      'Auditfilter occurredFrom ist gesetzt, aber kein gültiges Datum',
    );
    await expect(readAuditEvents({ occurredBefore: '2026-01-01' as never })).rejects.toThrow(
      'Auditfilter occurredBefore ist gesetzt, aber kein gültiges Datum',
    );

    // Die Abfrage muss ein einfaches Objekt sein. Eine Klasseninstanz ist
    // typkorrekt, ihre Getter liegen aber auf dem Prototyp — ein falsch
    // geschriebener (`actorId`) fiele durch jede Schlüsselprüfung und
    // hinterließe eine ungefilterte Abfrage.
    class Abfrage {
      take = 50;
      get actorId(): string {
        return userId;
      }
    }
    await expect(readAuditEvents(new Abfrage())).rejects.toThrow(
      'Auditabfrage muss ein einfaches Objekt sein',
    );
    await expect(readAuditEvents(Object.create({ actorUserId: userId }))).rejects.toThrow(
      'Auditabfrage muss ein einfaches Objekt sein',
    );

    // Ein nicht aufzählbarer unbekannter Schlüssel zählt ebenfalls.
    const versteckt = {};
    Object.defineProperty(versteckt, 'actorId', { value: userId, enumerable: false });
    await expect(readAuditEvents(versteckt)).rejects.toThrow('Unbekannter Auditfilter: actorId');

    // Ein eigener Getter mit richtigem Schlüssel schränkt ein, und er wird
    // genau einmal gelesen.
    let lesungen = 0;
    const mitGetter = {
      get actorUserId(): string {
        lesungen += 1;
        return 'jemand-anderes';
      },
    };
    await expect(readAuditEvents(mitGetter)).resolves.toEqual([]);
    expect(lesungen).toBe(1);

    // Ein Proxy, dessen `has` anderes meldet als `ownKeys`: Anwesenheit
    // entscheidet die bereits geprüfte Schlüsselliste, nicht `in`.
    const widerspruechlich = new Proxy({ actorUserId: 'jemand-anderes' }, { has: () => false });
    await expect(readAuditEvents(widerspruechlich)).resolves.toEqual([]);

    // Eine Zeitgrenze, deren `getTime` beim zweiten Aufruf `NaN` liefert,
    // erreichte sonst Prisma. Gelesen wird der innere Wert, genau einmal.
    const tueckischesDatum = new Date('2020-01-01T00:00:00.000Z');
    let zeitLesungen = 0;
    Object.defineProperty(tueckischesDatum, 'getTime', {
      value: () => (++zeitLesungen === 1 ? 0 : Number.NaN),
    });
    await expect(
      readAuditEvents({ actorUserId: userId, occurredFrom: tueckischesDatum }),
    ).resolves.toHaveLength(1);

    // Keine Abfrage, sondern `null`: die eigene Meldung, nicht die der Laufzeit.
    await expect(readAuditEvents(null as never)).rejects.toThrow(
      'Auditabfrage muss ein einfaches Objekt sein',
    );

    // Ebenso `undefined`: `readAuditEvents(bauAbfrage(sitzung))` ohne Sitzung
    // fiele sonst auf einen Vorgabewert zurück und läse über ALLE Akteure.
    // Wer ungefiltert lesen will, schreibt das ausdrücklich: `{}`.
    await expect(readAuditEvents(undefined as never)).rejects.toThrow(
      'Auditabfrage muss ein einfaches Objekt sein',
    );

    // `take` wird ebenfalls nur einmal gelesen: Ein zweiter Zugriff, der
    // `NaN` liefert, erreichte sonst Prisma.
    let takeLesungen = 0;
    const wechselndesTake = {
      actorUserId: userId,
      get take(): number {
        takeLesungen += 1;
        return takeLesungen === 1 ? 10 : Number.NaN;
      },
    };
    await expect(readAuditEvents(wechselndesTake)).resolves.toHaveLength(1);

    // Ein unbekannter Schlüssel — Tippfehler oder nicht unterstütztes Feld,
    // per Cast aus einem Anfragekörper — fiele sonst weg und hinterließe eine
    // ungefilterte Abfrage.
    await expect(readAuditEvents({ actorId: userId } as never)).rejects.toThrow(
      'Unbekannter Auditfilter: actorId',
    );
    await expect(readAuditEvents({ targetId: userId } as never)).rejects.toThrow(
      'Unbekannter Auditfilter: targetId',
    );

    // Die Meldung nennt nur das Feld, nie den Wert.
    await expect(
      readAuditEvents({ organizationId: { geheim: GEHEIM } as never }),
    ).rejects.not.toThrow(GEHEIM);
  });

  it('speichert die Organisationskennung als undurchsichtiges Abbild', async () => {
    // Es gibt noch kein Organisationsmodell (E08). Die Kennung muss sich
    // trotzdem schreiben und lesen lassen, ohne Fremdschlüssel.
    await appendAuditEvent({
      action: 'ORGANIZATION_CREATED',
      organizationId: ORG,
      targetType: 'IntegrationstestZiel',
      targetId: ORG,
    });

    const zeilen = await readAuditEvents({ organizationId: ORG });
    expect(zeilen[0]?.organizationId).toBe(ORG);
    expect(zeilen[0]?.actorUserId).toBeNull();
  });

  it('schreibt Metadaten NUR geschwärzt in die Datenbank', async () => {
    const userId = await nutzerAnlegen('schwaerzung');
    await appendAuditEvent({
      action: 'ACCOUNT_DELETED',
      actorUserId: userId,
      targetType: 'IntegrationstestZiel',
      metadata: { email: GEHEIM, tief: { token: GEHEIM }, reasonCode: 'BEHALTEN' },
    });

    // Direkt an der Tabelle vorbei am Dienst gelesen: Entscheidend ist, was
    // GESPEICHERT wurde, nicht was der Rückgabewert zeigt.
    const roh = await prisma.auditEvent.findFirstOrThrow({ where: { actorUserId: userId } });
    expect(JSON.stringify(roh.metadata)).not.toContain(GEHEIM);
    expect(JSON.stringify(roh)).not.toContain(GEHEIM);
    const metadata = roh.metadata as Record<string, unknown>;
    expect(metadata.email).toBe(SCHWAERZUNG);
    expect(metadata.reasonCode).toBe('BEHALTEN');
  });

  it('speichert weder Name noch Adresse des Akteurs, nur die Kennung', async () => {
    const userId = await nutzerAnlegen('sparsamkeit');
    const nutzer = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await appendAuditEvent({
      action: 'ACCOUNT_DELETED',
      actorUserId: userId,
      targetType: 'IntegrationstestZiel',
    });

    const roh = await prisma.auditEvent.findFirstOrThrow({ where: { actorUserId: userId } });
    const alsText = JSON.stringify(roh);
    expect(alsText).not.toContain(nutzer.email);
    expect(alsText).toContain(userId);
    // Die Spalten selbst: kein Klarname, kein lesbares Etikett.
    expect(Object.keys(roh).sort()).toEqual(
      [
        'action',
        'actorUserId',
        'id',
        'metadata',
        'occurredAt',
        'organizationId',
        'targetId',
        'targetType',
      ].sort(),
    );
  });

  it('weist eine erfundene Vorgangsbezeichnung ab, statt sie zu schreiben', async () => {
    await expect(
      appendAuditEvent({
        // Bewusst am Typ vorbei: genau der Fall, den die Laufzeitprüfung hält.
        action: 'GIBT_ES_NICHT' as never,
        targetType: 'IntegrationstestZiel',
      }),
      // Auf die MELDUNG der Eingabeprüfung, nicht nur auf `TypeError`: Beim
      // Zurücklesen wirft `alsRecord()` ebenfalls einen `TypeError`, und
      // eine Prüfung nur auf die Fehlerart bestünde deshalb auch dann, wenn
      // die Eingabeprüfung ganz fehlte — die Zeile wäre dann längst
      // geschrieben.
    ).rejects.toThrow('Unbekannte Auditvorgangsbezeichnung');

    expect(await prisma.auditEvent.count({ where: { action: 'GIBT_ES_NICHT' } })).toBe(0);
  });

  it('kürzt eine überlange Vorgangsbezeichnung in der Fehlermeldung', async () => {
    // Die Meldung kann in einem Log landen. Eine ungekürzte Eingabe machte
    // den Logstrom zum Ablageort für beliebigen fremden Text.
    const sehrLang = 'X'.repeat(50_000);
    await expect(
      appendAuditEvent({ action: sehrLang as never, targetType: 'IntegrationstestZiel' }),
    ).rejects.toThrow(/… \(50000 Zeichen\)/);
  });

  it('begrenzt die Größe der Metadaten', async () => {
    // „Knappe betriebliche Tatsachen" stand bisher nur in der Prosa. Ohne
    // Grenze ließe sich beliebig viel in eine Tabelle schreiben, die keinen
    // fachlichen Löschpfad hat.
    await expect(
      appendAuditEvent({
        action: 'ACCOUNT_DELETED',
        targetType: 'IntegrationstestZiel',
        metadata: { blob: 'A'.repeat(200_000) },
      }),
    ).rejects.toThrow(RangeError);

    expect(await prisma.auditEvent.count({ where: { targetType: 'IntegrationstestZiel' } })).toBe(
      0,
    );
  });

  it('weist ein gesetztes, aber ungültiges Kennungsfeld beim Anfügen ab', async () => {
    // `actorUserId: session?.userId` nach einer gescheiterten Sitzungssuche:
    // Still als „kein Akteur" geschrieben, verlöre die Spur ihre Zuordnung.
    const ohneSitzung: { userId?: string } = {};
    await expect(
      appendAuditEvent({
        action: 'ACCOUNT_DELETED',
        actorUserId: ohneSitzung.userId,
        targetType: 'IntegrationstestZiel',
      }),
    ).rejects.toThrow('actorUserId ist gesetzt, aber keine Zeichenkette');
    await expect(
      appendAuditEvent({
        action: 'ACCOUNT_DELETED',
        organizationId: null as never,
        targetType: 'IntegrationstestZiel',
      }),
    ).rejects.toThrow('organizationId ist gesetzt, aber keine Zeichenkette');
    await expect(
      appendAuditEvent({ action: 'ACCOUNT_DELETED', targetType: 42 as never }),
    ).rejects.toThrow('targetType ist gesetzt, aber keine Zeichenkette');

    expect(await prisma.auditEvent.count({ where: { targetType: 'IntegrationstestZiel' } })).toBe(
      0,
    );
  });

  it('weist ein unbekanntes Eingabefeld ab, statt die Zuordnung still zu verlieren', async () => {
    // Überzählige Eigenschaften aus einem Spread meldet TypeScript nicht.
    // Ohne Prüfung würde `actorId` still verworfen und die Zeile ohne Akteur
    // geschrieben — genau die Spur einer Kontolöschung verlöre ihre Zuordnung.
    const kontext = { actorId: 'nutzer-aus-der-sitzung' };
    await expect(
      appendAuditEvent({
        ...kontext,
        action: 'ACCOUNT_DELETED',
        targetType: 'IntegrationstestZiel',
      }),
    ).rejects.toThrow('Unbekanntes Auditfeld: actorId');

    // Ein fehlendes Pflichtfeld heißt „fehlt", nicht „gesetzt, aber falsch".
    await expect(appendAuditEvent({ action: 'ACCOUNT_DELETED' } as never)).rejects.toThrow(
      'targetType fehlt',
    );

    expect(await prisma.auditEvent.count({ where: { targetType: 'IntegrationstestZiel' } })).toBe(
      0,
    );
  });

  it('weist fehlende Vorgangsbezeichnung und gesetzte, aber leere Metadaten ab', async () => {
    // Die Vorgangsbezeichnung fehlt: „fehlt", nicht „unbekannt: undefined".
    await expect(appendAuditEvent({ targetType: 'IntegrationstestZiel' } as never)).rejects.toThrow(
      'action fehlt',
    );

    // Auch ein geerbter Wert zählt nicht als gesetzt — über „vorhanden"
    // entscheidet die geprüfte Schlüsselliste, nicht der Prototyp.
    const prototyp = Object.prototype as Record<string, unknown>;
    prototyp.action = 'ACCOUNT_DELETED';
    try {
      await expect(
        appendAuditEvent({ targetType: 'IntegrationstestZiel' } as never),
      ).rejects.toThrow('action fehlt');
    } finally {
      delete prototyp.action;
    }

    // `metadata: diff ?? null` nach einem Fehler: still als `{}` geschrieben,
    // verlöre die Zeile ihre Tatsachen.
    for (const leer of [null, undefined]) {
      await expect(
        appendAuditEvent({
          action: 'ACCOUNT_DELETED',
          targetType: 'IntegrationstestZiel',
          metadata: leer as never,
        }),
      ).rejects.toThrow('Auditmetadaten müssen ein Objekt sein');
    }

    expect(await prisma.auditEvent.count({ where: { targetType: 'IntegrationstestZiel' } })).toBe(
      0,
    );
  });

  it('zeigt eine unbekannte Vorgangsbezeichnung, die keine Zeichenkette ist, nur als Art', async () => {
    // Die Meldung kann in einem Log landen: kein `String()` über fremde
    // Werte, das Inhalte (etwa eine Adresse) in die Meldung zöge.
    const fehler = await appendAuditEvent({
      action: ['ACCOUNT_DELETED', GEHEIM] as never,
      targetType: 'IntegrationstestZiel',
    }).catch((e: unknown) => e);
    expect(fehler).toBeInstanceOf(TypeError);
    expect((fehler as Error).message).toContain('Unbekannte Auditvorgangsbezeichnung');
    expect((fehler as Error).message).not.toContain(GEHEIM);

    // Ein Objekt ohne Prototyp ließe `String()` selbst werfen und verdrängte
    // die Meldung des Dienstes.
    await expect(
      appendAuditEvent({
        action: Object.create(null) as never,
        targetType: 'IntegrationstestZiel',
      }),
    ).rejects.toThrow('Unbekannte Auditvorgangsbezeichnung');
  });

  it('liest die Vorgangsbezeichnung genau einmal', async () => {
    // Geprüft und geschrieben wird DERSELBE Wert. Ein Getter, der beim
    // zweiten Lesen etwas anderes liefert, schriebe sonst eine erfundene
    // Bezeichnung — und jede spätere Leseabfrage über diese Zeile würfe.
    const userId = await nutzerAnlegen('einmal-lesen');
    let lesungen = 0;
    const eingabe = {
      get action(): string {
        lesungen += 1;
        return lesungen === 1 ? 'ACCOUNT_DELETED' : 'FREI_ERFUNDEN';
      },
      actorUserId: userId,
      targetType: 'IntegrationstestZiel',
    };

    const angelegt = await appendAuditEvent(eingabe as never);
    expect(angelegt.action).toBe('ACCOUNT_DELETED');
    expect(lesungen).toBe(1);
    await expect(readAuditEvents({ actorUserId: userId })).resolves.toHaveLength(1);
  });

  it('begrenzt die Länge der Kennungsfelder', async () => {
    await expect(
      appendAuditEvent({
        action: 'ACCOUNT_DELETED',
        targetType: 'X'.repeat(5000),
      }),
    ).rejects.toThrow('höchstens 200 Zeichen');
  });

  it('deckelt die gelesene Menge, auch bei unbrauchbarem Limit', async () => {
    const userId = await nutzerAnlegen('limit');
    await appendAuditEvent({
      action: 'ACCOUNT_DELETED',
      actorUserId: userId,
      targetType: 'IntegrationstestZiel',
    });

    // `NaN` entsteht leicht aus `Number(searchParams.get('take'))`. Ohne
    // Abfangen reichte es bis zu Prisma durch, dessen Fehlermeldung den
    // absoluten Quellpfad enthält.
    await expect(
      readAuditEvents({ actorUserId: userId, take: Number('keine-zahl') }),
    ).resolves.toHaveLength(1);
    await expect(readAuditEvents({ actorUserId: userId, take: -5 })).resolves.toHaveLength(1);
    await expect(readAuditEvents({ actorUserId: userId, take: 1e9 })).resolves.toHaveLength(1);
  });

  it('überdauert die Löschung des Kontos, auf das der Akteursabdruck zeigt', async () => {
    // Der Kern der Abbildsemantik: kein Fremdschlüssel, keine Kaskade.
    // Ohne diese Eigenschaft löschte E04C die Spur ihrer selbst.
    const userId = await nutzerAnlegen('ueberdauert');
    const ereignis = await appendAuditEvent({
      action: 'ACCOUNT_DELETED',
      actorUserId: userId,
      targetType: 'IntegrationstestZiel',
      targetId: userId,
    });

    await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();

    const danach = await prisma.auditEvent.findUnique({ where: { id: ereignis.id } });
    expect(danach).not.toBeNull();
    expect(danach?.actorUserId).toBe(userId);
  });
});

/** Absichtlicher Abbruch nach beiden Schreibvorgängen. */
class AbsichtlicherAbbruch extends Error {}

describe('Anfügen in der Transaktion des Aufrufers (Integration mit echter Datenbank)', () => {
  beforeEach(eigeneZeilenEntfernen);
  afterAll(eigeneZeilenEntfernen);

  // Das Muster, das E04C braucht: fachliche Löschung und `ACCOUNT_DELETED`
  // in EINER Transaktion. Geprüft wird der DIENST (`appendAuditEventInTransaction`),
  // nicht ein direktes `tx.auditEvent.create`. E04C selbst ist das nicht.

  it('weist den globalen Prisma-Client auch bei umgangenem Typcheck zur Laufzeit ab', async () => {
    await expect(
      appendAuditEventInTransaction(prisma as never, {
        action: 'ACCOUNT_DELETED',
        targetType: 'IntegrationstestZiel',
      }),
    ).rejects.toThrow('nicht den globalen Prisma-Client');

    // Eine Hülle um das Delegate des globalen Clients hat kein `$connect` und
    // erfüllt den Typ ohne Cast — sie schriebe trotzdem außerhalb jeder
    // Transaktion.
    await expect(
      appendAuditEventInTransaction(
        { auditEvent: prisma.auditEvent },
        { action: 'ACCOUNT_DELETED', targetType: 'IntegrationstestZiel' },
      ),
    ).rejects.toThrow('nicht den globalen Prisma-Client');

    expect(await prisma.auditEvent.count({ where: { targetType: 'IntegrationstestZiel' } })).toBe(
      0,
    );
  });

  it('verwirft Löschung und Auditzeile gemeinsam, wenn die Transaktion scheitert', async () => {
    const userId = await nutzerAnlegen('tx-rollback');
    let angelegteId: string | undefined;

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user.delete({ where: { id: userId } });
        const ereignis = await appendAuditEventInTransaction(tx, {
          action: 'ACCOUNT_DELETED',
          actorUserId: userId,
          targetType: 'IntegrationstestZiel',
          targetId: userId,
        });
        angelegteId = ereignis.id;

        // Beweis, dass die Zeile in DIESER Transaktion liegt und nicht
        // nebenher festgeschrieben wurde: innen sichtbar, außen noch nicht.
        expect(await tx.auditEvent.count({ where: { id: ereignis.id } })).toBe(1);
        expect(await prisma.auditEvent.count({ where: { id: ereignis.id } })).toBe(0);

        throw new AbsichtlicherAbbruch('nach beiden Schreibvorgängen');
      }),
    ).rejects.toBeInstanceOf(AbsichtlicherAbbruch);

    expect(angelegteId).toBeTruthy();
    // Weder die fachliche Änderung noch die Spur ist geblieben.
    expect(await prisma.user.findUnique({ where: { id: userId } })).not.toBeNull();
    expect(await prisma.auditEvent.count({ where: { id: angelegteId } })).toBe(0);
    expect(await readAuditEvents({ actorUserId: userId })).toHaveLength(0);
  });

  it('schreibt Löschung und Auditzeile gemeinsam fest, wenn die Transaktion gelingt', async () => {
    const userId = await nutzerAnlegen('tx-commit');
    const vorher = new Date();

    const ereignis = await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: userId } });
      return appendAuditEventInTransaction(tx, {
        action: 'ACCOUNT_DELETED',
        actorUserId: userId,
        targetType: 'IntegrationstestZiel',
        targetId: userId,
        metadata: { reasonCode: 'TEST', email: GEHEIM },
      });
    });
    const nachher = new Date();

    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();

    const gelesen = await readAuditEvents({ actorUserId: userId });
    expect(gelesen).toHaveLength(1);
    expect(gelesen[0]?.id).toBe(ereignis.id);
    expect(gelesen[0]?.action).toBe('ACCOUNT_DELETED');

    // Derselbe kanonische Weg wie beim normalen Anfügen: Zeitpunkt vom
    // Server, Metadaten geschwärzt GESPEICHERT.
    const roh = await prisma.auditEvent.findUniqueOrThrow({ where: { id: ereignis.id } });
    expect(roh.occurredAt.getTime()).toBeGreaterThanOrEqual(vorher.getTime());
    expect(roh.occurredAt.getTime()).toBeLessThanOrEqual(nachher.getTime());
    expect(JSON.stringify(roh)).not.toContain(GEHEIM);
    expect((roh.metadata as Record<string, unknown>).email).toBe(SCHWAERZUNG);
    expect((roh.metadata as Record<string, unknown>).reasonCode).toBe('TEST');
  });

  it('lässt eine ungültige Auditeingabe den fachlichen Vorgang mit zurückrollen', async () => {
    const userId = await nutzerAnlegen('tx-ungueltig');

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user.delete({ where: { id: userId } });
        await appendAuditEventInTransaction(tx, {
          action: 'GIBT_ES_NICHT' as never,
          actorUserId: userId,
          targetType: 'IntegrationstestZiel',
        });
      }),
    ).rejects.toThrow('Unbekannte Auditvorgangsbezeichnung');

    // Ein prüfpflichtiger Vorgang ohne gültige Spur findet nicht statt.
    expect(await prisma.user.findUnique({ where: { id: userId } })).not.toBeNull();
    expect(await prisma.auditEvent.count({ where: { actorUserId: userId } })).toBe(0);
  });
});

describe('Auditaufbewahrung (Integration mit echter Datenbank)', () => {
  beforeEach(eigeneZeilenEntfernen);
  afterAll(eigeneZeilenEntfernen);

  /** Eine alte und eine junge Zeile, relativ zur festen Uhr. */
  async function zweiZeilenAnlegen(): Promise<{ alt: string; jung: string }> {
    const alt = await appendAuditEventMitZeitpunktFuerTests(
      { action: 'ORGANIZATION_CREATED', organizationId: ORG, targetType: 'IntegrationstestZiel' },
      new Date(JETZT.getTime() - 400 * TAG),
    );
    const jung = await appendAuditEventMitZeitpunktFuerTests(
      { action: 'ORGANIZATION_UPDATED', organizationId: ORG, targetType: 'IntegrationstestZiel' },
      new Date(JETZT.getTime() - 10 * TAG),
    );
    return { alt: alt.id, jung: jung.id };
  }

  const lebt = async (id: string): Promise<boolean> =>
    (await prisma.auditEvent.findUnique({ where: { id } })) !== null;

  it('zählt im Trockenlauf und lässt beide Zeilen stehen', async () => {
    // AUDIT_RETENTION_DAYS ist in tests/integration/setup.ts fest auf 365 gepinnt.
    const { alt, jung } = await zweiZeilenAnlegen();

    const bericht = await auditLauf('dry-run');

    expect(bericht.rules[0]?.ruleId).toBe('AUDIT_RETENTION');
    expect(bericht.rules[0]?.candidateCount).toBeGreaterThanOrEqual(1);
    expect(bericht.rules[0]?.deletedCount).toBe(0);
    expect(await lebt(alt)).toBe(true);
    expect(await lebt(jung)).toBe(true);
  });

  it('löscht im Ernstfall genau die zu alte Zeile', async () => {
    const { alt, jung } = await zweiZeilenAnlegen();

    const bericht = await auditLauf('execute');

    expect(bericht.status).toBe('success');
    expect(bericht.rules[0]?.deletedCount).toBeGreaterThanOrEqual(1);
    expect(await lebt(alt)).toBe(false);
    expect(await lebt(jung)).toBe(true);
  });

  it('löscht beim zweiten Ernstfall nichts mehr', async () => {
    await zweiZeilenAnlegen();

    await auditLauf('execute');
    const zweiter = await auditLauf('execute');

    expect(zweiter.status).toBe('success');
    expect(zweiter.rules[0]?.deletedCount).toBe(0);
  });

  it('lässt die Versuchsdaten unberührt und nutzt eine eigene Variable', async () => {
    // Zwei Datenarten, zwei Fristen, zwei Variablen: Der Auditlauf darf
    // keine Attempt-Zeile anfassen.
    const userId = await nutzerAnlegen('getrennt');
    const aufgabe = await prisma.exercise.findFirstOrThrow({ select: { id: true } });
    const versuch = await prisma.attempt.create({
      data: {
        userId,
        exerciseId: aufgabe.id,
        submittedAnswer: {},
        result: 'PASSED',
        hintsUsed: 0,
        durationMs: 5000,
        createdAt: new Date(JETZT.getTime() - 3000 * TAG),
      },
    });
    await zweiZeilenAnlegen();

    await auditLauf('execute');

    // Die uralte Attempt-Zeile lebt noch: Der Auditlauf hat sie nicht gesehen.
    expect(await prisma.attempt.findUnique({ where: { id: versuch.id } })).not.toBeNull();
    expect(auditRetentionRule.retentionDaysEnvVar).toBe('AUDIT_RETENTION_DAYS');
    expect(attemptRetentionRule.retentionDaysEnvVar).toBe('ATTEMPT_RETENTION_DAYS');
    expect(auditRetentionRule.retentionDaysEnvVar).not.toBe(
      attemptRetentionRule.retentionDaysEnvVar,
    );
  });

  it('führt seit E07 genau zwei produktive Regeln', async () => {
    expect(PRODUKTIVE_REGELN.map((r) => r.id)).toEqual(['ATTEMPT_RETENTION', 'AUDIT_RETENTION']);
    expect(PRODUKTIVE_REGELN.map((r) => r.dataCategory)).toEqual(['Attempt', 'AuditEvent']);
  });

  it('lässt eine scheiternde Auditregel die Versuchsregel nicht verändern', async () => {
    // E07-eigener Beleg: Der allgemeine Teilfehlerfall steht im Unit-Test;
    // hier geht es darum, dass die ATTEMPT-Semantik gegen echte Zeilen
    // unverändert bleibt, wenn die Auditregel scheitert.
    const userId = await nutzerAnlegen('teilfehler');
    const aufgabe = await prisma.exercise.findFirstOrThrow({ select: { id: true } });
    const alterVersuch = await prisma.attempt.create({
      data: {
        userId,
        exerciseId: aufgabe.id,
        submittedAnswer: {},
        result: 'PASSED',
        hintsUsed: 0,
        durationMs: 5000,
        createdAt: new Date(JETZT.getTime() - 3000 * TAG),
      },
    });

    const kaputteAuditregel = {
      ...auditRetentionRule,
      countCandidates: () => Promise.reject(new RangeError('Auditzählung fehlgeschlagen')),
    };

    const bericht = await runRetention({
      rules: [kaputteAuditregel, attemptRetentionRule],
      mode: 'execute',
      now: JETZT,
      runId: 'audit-teilfehler',
    });

    expect(bericht.rules.map((r) => r.status)).toEqual(['failed', 'success']);
    expect(bericht.status).toBe('partial-failure');
    // Die Attempt-Regel hat trotzdem gearbeitet: Die uralte Zeile ist weg.
    expect(await prisma.attempt.findUnique({ where: { id: alterVersuch.id } })).toBeNull();
  });
});
