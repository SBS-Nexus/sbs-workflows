import { randomBytes } from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma, createTestUser, deleteTestUser } from './helpers';
import {
  __hashTokenForTests,
  applyRetentionPolicy,
  pruneExpiredSessions,
} from '@/server/auth/session';
import { verifyPassword } from '@/server/auth/password';
import {
  getProjectTests,
  getProjectView,
  listProjects,
  saveProjectDraft,
  submitProject,
} from '@/server/services/project-service';

let userId: string;

beforeEach(async () => {
  const user = await createTestUser();
  userId = user.id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Konten und Sitzungen', () => {
  it('legt Konten mit gehashtem Passwort an', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(user.passwordHash).not.toContain('einTestPasswort2026');
    expect(user.passwordHash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('einTestPasswort2026', user.passwordHash)).toBe(true);
  });

  it('verhindert doppelte E-Mail-Adressen', async () => {
    const bestehend = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await expect(
      prisma.user.create({
        data: { email: bestehend.email, name: 'Zweite', passwordHash: 'scrypt$1$1$1$a$b' },
      }),
    ).rejects.toThrow();
  });

  it('speichert Sitzungen nur als Hash', async () => {
    const token = randomBytes(32).toString('base64url');

    await prisma.authSession.create({
      data: {
        userId,
        tokenHash: __hashTokenForTests(token),
        csrfSecret: 'geheim',
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    const gespeichert = await prisma.authSession.findFirstOrThrow({ where: { userId } });
    expect(gespeichert.tokenHash).not.toBe(token);
    expect(gespeichert.tokenHash).toHaveLength(64);

    const gefunden = await prisma.authSession.findUnique({
      where: { tokenHash: __hashTokenForTests(token) },
    });
    expect(gefunden?.id).toBe(gespeichert.id);
  });

  it('entfernt abgelaufene Sitzungen', async () => {
    await prisma.authSession.create({
      data: {
        userId,
        tokenHash: __hashTokenForTests('abgelaufen'),
        csrfSecret: 'geheim',
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await prisma.authSession.create({
      data: {
        userId,
        tokenHash: __hashTokenForTests('gueltig'),
        csrfSecret: 'geheim',
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    await pruneExpiredSessions();

    const verbleibend = await prisma.authSession.findMany({ where: { userId } });
    expect(verbleibend).toHaveLength(1);
    expect(verbleibend[0]?.tokenHash).toBe(__hashTokenForTests('gueltig'));
  });

  it('löscht Sitzungen mit dem Konto', async () => {
    await prisma.authSession.create({
      data: {
        userId,
        tokenHash: __hashTokenForTests('mitkonto'),
        csrfSecret: 'geheim',
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.authSession.count({ where: { userId } })).toBe(0);
  });
});

describe('Aufbewahrungsfrist', () => {
  it('entfernt Versuchsdaten, die älter als die konfigurierte Frist sind', async () => {
    const exercise = await prisma.exercise.findFirstOrThrow({ select: { id: true } });

    const alt = await prisma.attempt.create({
      data: {
        userId,
        exerciseId: exercise.id,
        submittedCode: 'alt',
        result: 'PASSED',
        createdAt: new Date(Date.now() - 400 * 24 * 3600 * 1000),
      },
    });
    const neu = await prisma.attempt.create({
      data: { userId, exerciseId: exercise.id, submittedCode: 'neu', result: 'PASSED' },
    });

    await applyRetentionPolicy();

    expect(await prisma.attempt.findUnique({ where: { id: alt.id } })).toBeNull();
    expect(await prisma.attempt.findUnique({ where: { id: neu.id } })).not.toBeNull();
  });
});

describe('Projektwerkstatt', () => {
  it('listet alle veröffentlichten Projekte mit Startstatus', async () => {
    const projects = await listProjects(userId);

    expect(projects.length).toBeGreaterThanOrEqual(2);
    expect(projects.every((p) => p.status === 'NOT_STARTED')).toBe(true);
    expect(projects.every((p) => p.milestoneCount >= 2)).toBe(true);
  });

  it('liefert Startdateien und Meilensteine', async () => {
    const project = await getProjectView(userId, 'begruessung-und-altersrechner');

    expect(project).not.toBeNull();
    expect(project!.files).toHaveLength(1);
    expect(project!.files[0]?.path).toBe('main.py');
    expect(project!.milestones.length).toBeGreaterThanOrEqual(3);
    expect(project!.tests.length).toBeGreaterThanOrEqual(2);
    expect(project!.submission).toBeNull();
  });

  it('speichert Zwischenstände und gibt sie zurück', async () => {
    await saveProjectDraft(userId, 'begruessung-und-altersrechner', [
      { path: 'main.py', content: '# mein Zwischenstand' },
    ]);

    const project = await getProjectView(userId, 'begruessung-und-altersrechner');
    expect(project!.files[0]?.content).toBe('# mein Zwischenstand');
    expect(project!.submission?.status).toBe('IN_PROGRESS');
  });

  it('nimmt ein Projekt erst mit erfüllten Meilensteinen und Reflexion ab', async () => {
    const tests = await getProjectTests('begruessung-und-altersrechner');
    const alleBestanden = tests.map((t) => ({ id: t.id, passed: true }));

    const ohneReflexion = await submitProject({
      userId,
      projectSlug: 'begruessung-und-altersrechner',
      files: [{ path: 'main.py', content: 'print("x")' }],
      testResults: alleBestanden,
    });

    if ('error' in ohneReflexion) throw new Error(ohneReflexion.error);
    expect(ohneReflexion.status).toBe('SUBMITTED');
    expect(ohneReflexion.message).toContain('Reflexion');

    const mitReflexion = await submitProject({
      userId,
      projectSlug: 'begruessung-und-altersrechner',
      files: [{ path: 'main.py', content: 'print("x")' }],
      testResults: alleBestanden,
      reflection:
        'Schwierig war für mich die Umwandlung der Eingabe. Ich habe sie mit print(type(...)) geprüft.',
    });

    if ('error' in mitReflexion) throw new Error(mitReflexion.error);
    expect(mitReflexion.status).toBe('ACCEPTED');
    expect(mitReflexion.milestonesDone).toBe(mitReflexion.milestonesTotal);

    const gespeichert = await prisma.projectSubmission.findFirstOrThrow({ where: { userId } });
    expect(gespeichert.status).toBe('ACCEPTED');
    expect(gespeichert.submittedAt).not.toBeNull();
  });

  it('meldet teilweise erfüllte Meilensteine als überarbeitungsbedürftig', async () => {
    const tests = await getProjectTests('tarifrechner');
    const teilweise = tests.map((t, index) => ({ id: t.id, passed: index === 0 }));

    const result = await submitProject({
      userId,
      projectSlug: 'tarifrechner',
      files: [{ path: 'main.py', content: 'print("x")' }],
      testResults: teilweise,
    });

    if ('error' in result) throw new Error(result.error);
    expect(['NEEDS_REVISION', 'IN_PROGRESS']).toContain(result.status);
    expect(result.milestonesDone).toBeLessThan(result.milestonesTotal);
    expect(result.milestoneResults.some((m) => !m.done)).toBe(true);
  });

  it('lehnt ein unbekanntes Projekt ab', async () => {
    const result = await submitProject({
      userId,
      projectSlug: 'gibt-es-nicht',
      files: [],
      testResults: [],
    });
    expect('error' in result).toBe(true);
  });
});
