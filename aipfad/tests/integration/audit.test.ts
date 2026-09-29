import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import {
  appendAuditEvent,
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
