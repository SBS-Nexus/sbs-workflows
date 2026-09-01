import { describe, expect, it, beforeEach } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword, verifyPassword } from '@/server/auth/password';

describe('Auth (Integration mit echter Datenbank)', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: '@integrationtest.local' } } });
  });

  it('legt ein Konto an und der gespeicherte Hash lässt sich verifizieren', async () => {
    const email = 'person@integrationtest.local';
    const passwordHash = await hashPassword('ein-sicheres-testpasswort-123');

    const user = await prisma.user.create({
      data: { email, name: 'Integrationstest', passwordHash },
    });

    expect(user.id).toBeTruthy();
    expect(user.passwordHash).not.toBe('ein-sicheres-testpasswort-123');

    const reloaded = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(await verifyPassword('ein-sicheres-testpasswort-123', reloaded.passwordHash)).toBe(true);
    expect(await verifyPassword('falsches-passwort', reloaded.passwordHash)).toBe(false);
  });

  it('verhindert doppelte E-Mail-Adressen (eindeutiger Index)', async () => {
    const email = 'doppelt@integrationtest.local';
    const passwordHash = await hashPassword('ein-sicheres-testpasswort-123');
    await prisma.user.create({ data: { email, name: 'Erst', passwordHash } });

    await expect(
      prisma.user.create({ data: { email, name: 'Zweit', passwordHash } }),
    ).rejects.toThrow();
  });

  it('löscht beim Entfernen des Kontos abhängige Sitzungen (onDelete: Cascade)', async () => {
    const email = 'loeschen@integrationtest.local';
    const passwordHash = await hashPassword('ein-sicheres-testpasswort-123');
    const user = await prisma.user.create({ data: { email, name: 'Löschtest', passwordHash } });

    await prisma.authSession.create({
      data: {
        userId: user.id,
        tokenHash: 'a'.repeat(64),
        csrfSecret: 'b'.repeat(32),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const remainingSessions = await prisma.authSession.count({ where: { userId: user.id } });
    expect(remainingSessions).toBe(0);
  });
});
