import { beforeEach, describe, expect, it } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import { destroyZentraleSitzungen } from '@/server/auth/session';
import { kontoFuerIdentitaet } from '@/server/auth/zentral-konto';
import type { ZentraleIdentitaet } from '@/server/auth/zentral-identitaet';

/**
 * Kontoregeln der Anmeldung über das gemeinsame Konto (E4.2,
 * docs/E4-2-BAUPLAN.md, Abschnitt 2) gegen eine echte Datenbank: Nur dort
 * greifen der eindeutige Index auf `authSubject` und die Bedingung beim
 * Verbinden tatsächlich.
 */

const DOMAIN = '@zentral.integrationtest.local';

function identitaet(teil: Partial<ZentraleIdentitaet> = {}): ZentraleIdentitaet {
  return {
    sub: 'sub-ada',
    email: `ada${DOMAIN}`,
    emailBestaetigt: true,
    name: 'Ada Lovelace',
    sid: 'sid-1',
    zweiFaktoren: false,
    ...teil,
  };
}

async function sitzung(userId: string, oidcSid: string | null, kennung: string): Promise<void> {
  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: kennung.padEnd(64, '0'),
      csrfSecret: 'c'.repeat(32),
      expiresAt: new Date(Date.now() + 60_000),
      oidcSid,
      oidcIdToken: oidcSid ? 'eyJ.test.token' : null,
    },
  });
}

describe('Anmeldung über das gemeinsame Konto (Integration)', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await prisma.user.deleteMany({ where: { authSubject: { startsWith: 'sub-' } } });
  });

  it('legt bei bestätigter Adresse ein neues Konto ohne Passwort an', async () => {
    const ergebnis = await kontoFuerIdentitaet(identitaet());
    expect(ergebnis).toMatchObject({
      ok: true,
      art: 'neu',
      role: 'LEARNER',
      onboardingCompleted: false,
    });

    const konto = await prisma.user.findUniqueOrThrow({ where: { authSubject: 'sub-ada' } });
    expect(konto.email).toBe(`ada${DOMAIN}`);
    expect(konto.name).toBe('Ada Lovelace');
    expect(konto.passwordHash).toBeNull();
    expect(konto.authLinkedAt).toBeInstanceOf(Date);
  });

  it('findet dasselbe Konto beim nächsten Mal über sub, auch mit neuer Adresse', async () => {
    const erst = await kontoFuerIdentitaet(identitaet());
    const dann = await kontoFuerIdentitaet(identitaet({ email: `ada.neu${DOMAIN}` }));
    expect(dann).toMatchObject({ ok: true, art: 'bekannt' });
    expect(erst.ok && dann.ok && erst.userId === dann.userId).toBe(true);

    const konto = await prisma.user.findUniqueOrThrow({ where: { authSubject: 'sub-ada' } });
    expect(konto.email).toBe(`ada.neu${DOMAIN}`);
  });

  it('übernimmt eine unbestätigte neue Adresse nicht', async () => {
    await kontoFuerIdentitaet(identitaet());
    await kontoFuerIdentitaet(identitaet({ email: `ada.neu${DOMAIN}`, emailBestaetigt: false }));
    const konto = await prisma.user.findUniqueOrThrow({ where: { authSubject: 'sub-ada' } });
    expect(konto.email).toBe(`ada${DOMAIN}`);
  });

  it('verbindet ein vorhandenes Konto mit derselben bestätigten Adresse', async () => {
    const lokal = await prisma.user.create({
      data: {
        email: `ada${DOMAIN}`,
        name: 'Ada lokal',
        passwordHash: await hashPassword('ein-sicheres-testpasswort-123'),
        onboardingCompleted: true,
      },
    });

    const ergebnis = await kontoFuerIdentitaet(identitaet());
    expect(ergebnis).toMatchObject({
      ok: true,
      art: 'verbunden',
      userId: lokal.id,
      onboardingCompleted: true,
    });

    const konto = await prisma.user.findUniqueOrThrow({ where: { id: lokal.id } });
    expect(konto.authSubject).toBe('sub-ada');
    // Name und Passwort bleiben, wie sie waren.
    expect(konto.name).toBe('Ada lokal');
    expect(konto.passwordHash).not.toBeNull();
  });

  it('verbindet und erzeugt nichts bei unbestätigter Adresse', async () => {
    const lokal = await prisma.user.create({
      data: { email: `ada${DOMAIN}`, name: 'Ada lokal', passwordHash: 'scrypt$x' },
    });

    const ergebnis = await kontoFuerIdentitaet(identitaet({ emailBestaetigt: false }));
    expect(ergebnis).toEqual({ ok: false, grund: 'adresse-unbestaetigt' });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: lokal.id } })).authSubject,
    ).toBeNull();

    const ohneKonto = await kontoFuerIdentitaet(
      identitaet({ sub: 'sub-neu', email: `neu${DOMAIN}`, emailBestaetigt: false }),
    );
    expect(ohneKonto).toEqual({ ok: false, grund: 'adresse-unbestaetigt' });
    expect(await prisma.user.count({ where: { email: `neu${DOMAIN}` } })).toBe(0);
  });

  it('legt kein zweites Konto über ein schon verbundenes', async () => {
    await kontoFuerIdentitaet(identitaet());
    const fremd = await kontoFuerIdentitaet(identitaet({ sub: 'sub-andere-person' }));
    expect(fremd).toEqual({ ok: false, grund: 'adresse-vergeben' });
    expect(await prisma.user.count({ where: { email: `ada${DOMAIN}` } })).toBe(1);
  });

  it('übersteht zwei gleichzeitige Rückkehren derselben Person', async () => {
    const [a, b] = await Promise.all([
      kontoFuerIdentitaet(identitaet()),
      kontoFuerIdentitaet(identitaet()),
    ]);
    expect(a.ok && b.ok && a.userId === b.userId).toBe(true);
    expect(await prisma.user.count({ where: { authSubject: 'sub-ada' } })).toBe(1);
  });

  it('meldet über den Rückkanal genau die Sitzungen zur sid ab', async () => {
    const ergebnis = await kontoFuerIdentitaet(identitaet());
    if (!ergebnis.ok) throw new Error('Konto erwartet');
    await sitzung(ergebnis.userId, 'sid-1', 'a');
    await sitzung(ergebnis.userId, 'sid-2', 'b');
    await sitzung(ergebnis.userId, null, 'c');

    expect(await destroyZentraleSitzungen({ sid: 'sid-1', sub: 'sub-ada' })).toBe(1);
    // Eine sid mit fremdem sub trifft nichts.
    expect(await destroyZentraleSitzungen({ sid: 'sid-2', sub: 'sub-fremd' })).toBe(0);

    const uebrig = await prisma.authSession.findMany({ where: { userId: ergebnis.userId } });
    expect(uebrig.map((s) => s.oidcSid).sort()).toEqual([null, 'sid-2'].sort());
  });

  it('meldet über den Rückkanal ohne sid alle zentralen Sitzungen der Person ab', async () => {
    const ergebnis = await kontoFuerIdentitaet(identitaet());
    if (!ergebnis.ok) throw new Error('Konto erwartet');
    await sitzung(ergebnis.userId, 'sid-1', 'd');
    await sitzung(ergebnis.userId, 'sid-2', 'e');
    await sitzung(ergebnis.userId, null, 'f');

    expect(await destroyZentraleSitzungen({ sid: null, sub: 'sub-ada' })).toBe(2);
    expect(await prisma.authSession.count({ where: { userId: ergebnis.userId } })).toBe(1);
    expect(await destroyZentraleSitzungen({ sid: null, sub: null })).toBe(0);
  });
});
