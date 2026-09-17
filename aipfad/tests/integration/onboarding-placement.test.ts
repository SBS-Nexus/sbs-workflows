import { describe, expect, it, beforeEach } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import {
  finalisiereOnboarding,
  placementFragenFuerBrowser,
  PlatzierungUngueltig,
  OnboardingBereitsAbgeschlossen,
  type OnboardingInput,
} from '@/server/services/onboarding-service';
import { placementQuestions } from '@/content/placement';
import {
  bandZuPunktzahl,
  placementQuestionSchema,
  DONT_KNOW_OPTION_ID,
} from '@/domain/placement/placement';

/**
 * Die Einstufung hängt jetzt im Onboarding. Geprüft wird hier, was nur mit
 * einer echten Datenbank zu prüfen ist: dass der Abschluss vollständig oder
 * gar nicht passiert, dass ein zweiter Versuch nichts kaputtmacht, und dass
 * niemand das Konto eines anderen verändert.
 */

const FRAGEN = placementQuestions.map((f) => placementQuestionSchema.parse(f));

const EINSTELLUNGEN: OnboardingInput = {
  learningGoal: 'GENERAL',
  experience: 'NONE',
  dailyTimeBudget: 20,
  pace: 'STEADY',
};

async function neuerNutzer(email: string): Promise<string> {
  await prisma.user.deleteMany({ where: { email } });
  const user = await prisma.user.create({
    data: { email, name: 'Einstufungstest', passwordHash: await hashPassword('Testpasswort-123') },
  });
  return user.id;
}

describe('Onboarding mit Einstufung', () => {
  let userId: string;

  beforeEach(async () => {
    userId = await neuerNutzer('placement@integrationtest.local');
  });

  it('speichert Punktzahl, Einstellungen und Pfad in einem Schritt', async () => {
    const alleRichtig = FRAGEN.map((f) => ({ questionId: f.id, optionId: f.correctOptionId }));
    const ergebnis = await finalisiereOnboarding(userId, EINSTELLUNGEN, {
      art: 'beantwortet',
      antworten: alleRichtig,
    });

    expect(ergebnis.platzierung?.score).toBe(100);
    expect(ergebnis.platzierung?.band).toBe('refresher');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.onboardingCompleted).toBe(true);
    expect(user.placementCompleted).toBe(true);
    expect(user.placementScore).toBe(100);
    expect(user.currentPathId).not.toBeNull();
    expect(user.dailyTimeBudget).toBe(20);

    // Der Pfad enthält alle Lektionen — die Einstufung kürzt nichts.
    const pfad = await prisma.learningPath.findFirstOrThrow({ where: { userId } });
    // Gegen die Lektionen DIESES Kurses, nicht gegen alle der Datenbank:
    // Eine veröffentlichte Lektion unter einem Entwurfsmodul ließe den Test
    // sonst aus dem falschen Grund scheitern.
    const imKurs = await prisma.lesson.count({
      where: {
        status: 'PUBLISHED',
        module: { is: { status: 'PUBLISHED', courseId: pfad.courseId } },
      },
    });
    expect(pfad.lessonSlugs.length).toBe(imKurs);
    expect(pfad.rationale).toContain('nie eine Lektion übersprungen');
  });

  it('lässt kein Zwischenergebnis zurück: entweder alles oder nichts', async () => {
    // Eine erfundene Antwort bricht ab, BEVOR etwas geschrieben wird.
    await expect(
      finalisiereOnboarding(userId, EINSTELLUNGEN, {
        art: 'beantwortet',
        antworten: [{ questionId: 'gibt-es-nicht', optionId: 'a' }],
      }),
    ).rejects.toBeInstanceOf(PlatzierungUngueltig);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.onboardingCompleted).toBe(false);
    expect(user.placementCompleted).toBe(false);
    expect(user.placementScore).toBeNull();
    expect(await prisma.learningPath.count({ where: { userId } })).toBe(0);
  });

  it('hält nach beantworteter Einstufung immer eine Punktzahl fest', async () => {
    // Bewusst nur für den beantworteten Weg: Übersprungen heißt gerade
    // `placementCompleted` OHNE Punktzahl, und das ist kein Widerspruch,
    // sondern die Aussage "bewusst ausgelassen".

    await finalisiereOnboarding(userId, EINSTELLUNGEN, {
      art: 'beantwortet',
      antworten: FRAGEN.map((f) => ({ questionId: f.id, optionId: DONT_KNOW_OPTION_ID })),
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.placementCompleted).toBe(true);
    expect(user.placementScore).not.toBeNull();
    expect(user.placementScore).toBe(0);
  });

  it('macht auch einen Fehler MITTEN in der Transaktion rückgängig', async () => {
    // Die Prüfung der Antworten greift vor der Transaktion — das allein
    // belegt noch kein Zurückrollen. Hier scheitert der Pfad, nachdem die
    // Nutzerzeile bereits geschrieben wurde: Danach darf nichts davon
    // stehen geblieben sein.
    const kurse = await prisma.course.findMany({ where: { status: 'PUBLISHED' } });
    await prisma.course.updateMany({
      where: { status: 'PUBLISHED' },
      data: { status: 'DRAFT' },
    });

    try {
      await expect(
        finalisiereOnboarding(userId, EINSTELLUNGEN, { art: 'uebersprungen' }),
      ).rejects.toThrow(/Kein veröffentlichter Kurs/);

      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user.onboardingCompleted).toBe(false);
      expect(user.placementCompleted).toBe(false);
      expect(user.currentPathId).toBeNull();
      expect(await prisma.learningPath.count({ where: { userId } })).toBe(0);
    } finally {
      for (const kurs of kurse) {
        await prisma.course.update({ where: { id: kurs.id }, data: { status: 'PUBLISHED' } });
      }
    }
  });

  it('erlaubt das Überspringen und hält den Pfad trotzdem vollständig', async () => {
    const ergebnis = await finalisiereOnboarding(userId, EINSTELLUNGEN, {
      art: 'uebersprungen',
    });

    expect(ergebnis.platzierung).toBeNull();
    expect(ergebnis.erklaerungen).toEqual([]);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.onboardingCompleted).toBe(true);
    expect(user.placementCompleted).toBe(true);
    expect(user.placementScore).toBeNull();

    const pfad = await prisma.learningPath.findFirstOrThrow({ where: { userId } });
    const imKurs = await prisma.lesson.count({
      where: {
        status: 'PUBLISHED',
        module: { is: { status: 'PUBLISHED', courseId: pfad.courseId } },
      },
    });
    expect(pfad.lessonSlugs.length).toBe(imKurs);
  });

  it('weist einen zweiten Durchlauf ab, statt die Einstufung zu überschreiben', async () => {
    // Der frühere Test hier schickte ZWEIMAL DIESELBEN Antworten und war
    // deshalb grün, ohne irgendetwas zu zeigen: Derselbe Endzustand entsteht
    // auch beim blinden Überschreiben. Der gefährliche Fall ist ein zweiter
    // Aufruf mit ANDEREM Inhalt.
    const antworten = FRAGEN.map((f) => ({ questionId: f.id, optionId: f.correctOptionId }));
    await finalisiereOnboarding(userId, EINSTELLUNGEN, { art: 'beantwortet', antworten });
    const nachErstem = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(nachErstem.placementScore).toBeGreaterThan(0);

    // Ein "übersprungen" hinterher setzte die Punktzahl sonst auf null —
    // lautlos, ohne Fehler, ohne Weg zurück.
    await expect(
      finalisiereOnboarding(userId, EINSTELLUNGEN, { art: 'uebersprungen' }),
    ).rejects.toBeInstanceOf(OnboardingBereitsAbgeschlossen);

    const nachZweitem = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(nachZweitem.placementScore).toBe(nachErstem.placementScore);
    expect(nachZweitem.currentPathId).toBe(nachErstem.currentPathId);
    // Kein zweiter Pfad.
    expect(await prisma.learningPath.count({ where: { userId } })).toBe(1);
  });

  it('lehnt eine Option ab, die nicht zu ihrer Frage gehört', async () => {
    await expect(
      finalisiereOnboarding(userId, EINSTELLUNGEN, {
        art: 'beantwortet',
        antworten: [{ questionId: FRAGEN[0]!.id, optionId: 'zzz' }],
      }),
    ).rejects.toBeInstanceOf(PlatzierungUngueltig);
  });

  it('lehnt zwei Antworten zur selben Frage ab', async () => {
    const frage = FRAGEN[0]!;
    await expect(
      finalisiereOnboarding(userId, EINSTELLUNGEN, {
        art: 'beantwortet',
        antworten: [
          { questionId: frage.id, optionId: frage.options[0]!.id },
          { questionId: frage.id, optionId: frage.options[1]!.id },
        ],
      }),
    ).rejects.toBeInstanceOf(PlatzierungUngueltig);
  });

  it('rührt das Konto eines anderen nicht an', async () => {
    const fremdId = await neuerNutzer('fremd@integrationtest.local');
    await finalisiereOnboarding(userId, EINSTELLUNGEN, { art: 'uebersprungen' });

    const fremd = await prisma.user.findUniqueOrThrow({ where: { id: fremdId } });
    expect(fremd.onboardingCompleted).toBe(false);
    expect(fremd.placementCompleted).toBe(false);
    expect(await prisma.learningPath.count({ where: { userId: fremdId } })).toBe(0);
  });

  it('gibt dem Browser keine Lösung mit', () => {
    const serialisiert = JSON.stringify(placementFragenFuerBrowser());
    for (const frage of FRAGEN) {
      expect(serialisiert).not.toContain(frage.explanation);
    }
    expect(serialisiert).not.toContain('correctOptionId');
  });

  it('ordnet eine gespeicherte Punktzahl wieder demselben Band zu', async () => {
    const antworten = FRAGEN.map((f) => ({ questionId: f.id, optionId: f.correctOptionId }));
    const ergebnis = await finalisiereOnboarding(userId, EINSTELLUNGEN, {
      art: 'beantwortet',
      antworten,
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(bandZuPunktzahl(user.placementScore!)).toBe(ergebnis.platzierung?.band);
  });
});
