import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma, createTestUser, deleteTestUser } from './helpers';
import {
  acceptInvitation,
  createCohort,
  createInvitation,
  createOrganisation,
  getAuditLog,
  getCohortOverview,
  getOrgContext,
  listOrganisations,
  listOwnCohorts,
  setProgressConsent,
} from '@/server/services/organisation-service';

/**
 * Organisationen, Einladungen und Einwilligung gegen eine echte Datenbank.
 *
 * Der Schwerpunkt liegt auf dem, was schiefgehen darf und was nicht:
 * Berechtigungen, Einmaligkeit von Einladungen und die Frage, wer wen sieht.
 */
describe('Organisationen', () => {
  let ownerId = '';
  let teacherId = '';
  let learnerId = '';
  let orgSlug = '';

  beforeEach(async () => {
    ownerId = (await createTestUser()).id;
    teacherId = (await createTestUser()).id;
    learnerId = (await createTestUser()).id;

    const organisation = await createOrganisation(ownerId, 'Volkshochschule Beispielstadt');
    orgSlug = organisation.slug;
  });

  afterEach(async () => {
    await prisma.organization.deleteMany({ where: { slug: orgSlug } });
    await deleteTestUser(ownerId);
    await deleteTestUser(teacherId);
    await deleteTestUser(learnerId);
  });

  it('macht die anlegende Person zur Inhaberin', async () => {
    const context = await getOrgContext(ownerId, orgSlug);
    expect(context?.role).toBe('OWNER');

    const liste = await listOrganisations(ownerId);
    expect(liste.map((eintrag) => eintrag.slug)).toContain(orgSlug);
  });

  it('gibt Fremden keinen Zugang', async () => {
    expect(await getOrgContext(learnerId, orgSlug)).toBeNull();
  });

  it('erzeugt aus gleichen Namen unterschiedliche Kennungen', async () => {
    const zweite = await createOrganisation(ownerId, 'Volkshochschule Beispielstadt');
    expect(zweite.slug).not.toBe(orgSlug);
    await prisma.organization.deleteMany({ where: { slug: zweite.slug } });
  });

  it('nimmt eine Einladung an und trägt in die Kohorte ein', async () => {
    const context = await getOrgContext(ownerId, orgSlug);
    expect(context).not.toBeNull();

    const kohorte = await createCohort(context!, ownerId, 'Kurs Herbst 2026');
    const einladung = await createInvitation(context!, ownerId, {
      role: 'MEMBER',
      cohortSlug: kohorte.slug,
    });

    const ergebnis = await acceptInvitation(learnerId, einladung.token);
    expect(ergebnis.ok).toBe(true);

    const mitgliedschaft = await getOrgContext(learnerId, orgSlug);
    expect(mitgliedschaft?.role).toBe('MEMBER');

    const eigene = await listOwnCohorts(learnerId);
    expect(eigene.map((eintrag) => eintrag.cohortName)).toContain('Kurs Herbst 2026');
    // Die Einwilligung ist standardmäßig aus.
    expect(eigene[0]?.shareProgressWithTeachers).toBe(false);
  });

  it('lässt eine Einladung nur einmal einlösen', async () => {
    const context = await getOrgContext(ownerId, orgSlug);
    const einladung = await createInvitation(context!, ownerId, { role: 'MEMBER' });

    expect((await acceptInvitation(learnerId, einladung.token)).ok).toBe(true);
    const zweiterVersuch = await acceptInvitation(teacherId, einladung.token);
    expect(zweiterVersuch.ok).toBe(false);
  });

  it('speichert das Einladungstoken nur als Hash', async () => {
    const context = await getOrgContext(ownerId, orgSlug);
    const einladung = await createInvitation(context!, ownerId, { role: 'MEMBER' });

    const zeilen = await prisma.invitation.findMany({
      where: { organizationId: context!.organizationId },
      select: { tokenHash: true },
    });
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0]?.tokenHash).not.toBe(einladung.token);
    expect(zeilen[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('weist abgelaufene Einladungen ab', async () => {
    const context = await getOrgContext(ownerId, orgSlug);
    const einladung = await createInvitation(context!, ownerId, { role: 'MEMBER' });

    await prisma.invitation.updateMany({
      where: { organizationId: context!.organizationId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const ergebnis = await acceptInvitation(learnerId, einladung.token);
    expect(ergebnis.ok).toBe(false);
  });

  it('antwortet bei unbekanntem Token genauso wie bei abgelaufenem', async () => {
    // Sonst verriete die Antwort, ob ein geratenes Token je gültig war.
    const context = await getOrgContext(ownerId, orgSlug);
    const einladung = await createInvitation(context!, ownerId, { role: 'MEMBER' });
    await prisma.invitation.updateMany({
      where: { organizationId: context!.organizationId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const abgelaufen = await acceptInvitation(learnerId, einladung.token);
    const unbekannt = await acceptInvitation(learnerId, 'voellig-erfundenes-token');

    expect(abgelaufen.ok).toBe(false);
    expect(unbekannt.ok).toBe(false);
    expect(abgelaufen.ok === false && unbekannt.ok === false && abgelaufen.reason).toBe(
      unbekannt.ok === false ? unbekannt.reason : '',
    );
  });

  it('hindert eine Lehrkraft daran, eine Inhaberin einzuladen', async () => {
    const ownerContext = await getOrgContext(ownerId, orgSlug);
    const lehrEinladung = await createInvitation(ownerContext!, ownerId, { role: 'TEACHER' });
    await acceptInvitation(teacherId, lehrEinladung.token);

    const teacherContext = await getOrgContext(teacherId, orgSlug);
    expect(teacherContext?.role).toBe('TEACHER');

    await expect(createInvitation(teacherContext!, teacherId, { role: 'OWNER' })).rejects.toThrow(
      /Inhaberin/,
    );
  });

  it('verwehrt einem Mitglied das Anlegen von Kohorten', async () => {
    const context = await getOrgContext(ownerId, orgSlug);
    const einladung = await createInvitation(context!, ownerId, { role: 'MEMBER' });
    await acceptInvitation(learnerId, einladung.token);

    const memberContext = await getOrgContext(learnerId, orgSlug);
    await expect(createCohort(memberContext!, learnerId, 'Heimlich')).rejects.toThrow(
      /Berechtigung/,
    );
  });

  it('zeigt niemanden namentlich ohne Einwilligung – und danach schon', async () => {
    const context = await getOrgContext(ownerId, orgSlug);
    const kohorte = await createCohort(context!, ownerId, 'Sichtbarkeitstest');

    // Drei Mitglieder, damit Summenwerte überhaupt ausgewiesen werden.
    for (const userId of [learnerId, teacherId]) {
      const einladung = await createInvitation(context!, ownerId, {
        role: 'MEMBER',
        cohortSlug: kohorte.slug,
      });
      await acceptInvitation(userId, einladung.token);
    }
    const dritte = await createTestUser();
    const einladung = await createInvitation(context!, ownerId, {
      role: 'MEMBER',
      cohortSlug: kohorte.slug,
    });
    await acceptInvitation(dritte.id, einladung.token);

    const ohne = await getCohortOverview(context!, kohorte.slug);
    expect(ohne?.namedLearners).toEqual([]);
    expect(ohne?.insights.memberCount).toBe(3);
    expect(ohne?.insights.aggregates).not.toBeNull();

    const kohorteId = await prisma.cohort.findFirstOrThrow({
      where: { organizationId: context!.organizationId, slug: kohorte.slug },
      select: { id: true },
    });
    await setProgressConsent(learnerId, kohorteId.id, true);

    const mit = await getCohortOverview(context!, kohorte.slug);
    expect(mit?.namedLearners).toHaveLength(1);
    expect(mit?.insights.consentedCount).toBe(1);

    // Zurücknehmen wirkt sofort.
    await setProgressConsent(learnerId, kohorteId.id, false);
    const danach = await getCohortOverview(context!, kohorte.slug);
    expect(danach?.namedLearners).toEqual([]);

    await deleteTestUser(dritte.id);
  });

  it('hält Verwaltungshandlungen im Prüfprotokoll fest', async () => {
    const context = await getOrgContext(ownerId, orgSlug);
    await createCohort(context!, ownerId, 'Protokolltest');
    await createInvitation(context!, ownerId, { role: 'TEACHER' });

    const protokoll = await getAuditLog(context!);
    const texte = protokoll.map((eintrag) => eintrag.summary);
    expect(texte.some((text) => text.includes('Protokolltest'))).toBe(true);
    expect(texte.some((text) => text.includes('Einladung'))).toBe(true);
    expect(texte.some((text) => text.includes('Organisation'))).toBe(true);
  });

  it('verwehrt einer Lehrkraft das Prüfprotokoll', async () => {
    const ownerContext = await getOrgContext(ownerId, orgSlug);
    const einladung = await createInvitation(ownerContext!, ownerId, { role: 'TEACHER' });
    await acceptInvitation(teacherId, einladung.token);

    const teacherContext = await getOrgContext(teacherId, orgSlug);
    await expect(getAuditLog(teacherContext!)).rejects.toThrow(/Berechtigung/);
  });

  it('bindet eine Einladung an die angegebene Adresse', async () => {
    const context = await getOrgContext(ownerId, orgSlug);
    const einladung = await createInvitation(context!, ownerId, {
      role: 'MEMBER',
      email: 'jemand.anderes@example.org',
    });

    const ergebnis = await acceptInvitation(learnerId, einladung.token);
    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.ok === false && ergebnis.reason).toMatch(/andere E-Mail-Adresse/);
  });
});
