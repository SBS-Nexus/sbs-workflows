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
  evaluatePlacement,
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
    // Das Band kommt nicht mehr über die Grenze. Aus der gespeicherten
    // Punktzahl LÄSST es sich jederzeit ableiten — im laufenden Betrieb tut
    // das bisher niemand, die Punktzahl wird geschrieben und nicht gelesen.
    expect(bandZuPunktzahl(ergebnis.platzierung!.score)).toBe('refresher');

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

  it('verliert bei zwei gleichzeitigen Abschlüssen keine Punktzahl', async () => {
    // Nacheinander abzuweisen ist das Leichte. Der Fall, der die Punktzahl
    // wirklich kostet, ist der gleichzeitige: Zwei Tabs, zwei offene
    // Transaktionen. Ein `SELECT` und danach ein `UPDATE` ließe beide durch —
    // nachgestellt gegen diese Datenbank, bevor die Sperre umgebaut wurde.
    const antworten = FRAGEN.map((f) => ({ questionId: f.id, optionId: f.correctOptionId }));

    const ergebnisse = await Promise.allSettled([
      finalisiereOnboarding(userId, EINSTELLUNGEN, { art: 'beantwortet', antworten }),
      finalisiereOnboarding(userId, EINSTELLUNGEN, { art: 'uebersprungen' }),
    ]);

    // Genau einer kommt durch — welcher, entscheidet die Datenbank.
    expect(ergebnisse.filter((e) => e.status === 'fulfilled')).toHaveLength(1);
    const abgewiesen = ergebnisse.find((e) => e.status === 'rejected');
    expect(abgewiesen?.reason).toBeInstanceOf(OnboardingBereitsAbgeschlossen);

    // Und der Durchgekommene steht unverändert da: Hat der beantwortete
    // gewonnen, ist seine Punktzahl noch da; hat der übersprungene gewonnen,
    // gibt es keine. Was nicht passieren darf, ist eine Punktzahl, die
    // geschrieben und gleich wieder auf null gesetzt wurde.
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.onboardingCompleted).toBe(true);
    const gewinnerWarBeantwortet = ergebnisse[0]!.status === 'fulfilled';
    expect(user.placementScore).toBe(gewinnerWarBeantwortet ? 100 : null);
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

    // Die Punktzahl übersteht den Weg durch die Datenbank …
    expect(user.placementScore).toBe(ergebnis.platzierung!.score);
    // … und ergibt dort dasselbe Band wie vorher. Gegen einen festen Wert
    // geprüft, nicht gegen sich selbst: `bandZuPunktzahl(x)` mit demselben x
    // auf beiden Seiten wäre nach der Zeile darüber nicht mehr zu widerlegen.
    expect(bandZuPunktzahl(user.placementScore!)).toBe('refresher');
  });
});

describe('Was das Ergebnis über die Client-Grenze trägt', () => {
  // Alles, was nur die Bewertung angeht. Landete eines dieser Felder im
  // Rückgabewert, stünde es im Browser — eine Serveraktion überträgt das
  // ganze Objekt, nicht nur die Felder, die die Anzeige liest.
  const VERBOTEN = [
    'band',
    'byArea',
    'demonstratedConceptSlugs',
    'version',
    'correctOptionId',
    'weight',
    'demonstratesConceptSlug',
  ];

  /**
   * Sammelt JEDEN Schlüssel, der irgendwo im Objekt steckt.
   *
   * Absichtlich nicht die erwarteten Felder herausgreifen und vergleichen:
   * Das ginge auch dann durch, wenn daneben noch zehn weitere stünden.
   *
   * Die Liste der verbotenen Namen allein genügt aber nicht — sie fängt nur,
   * was heute schon heißt, wie es heißt. Ein `loesung: frage.correctOptionId`
   * in den Erklärungen wäre ein echter Verrat der Lösung unter neuem Namen
   * und stünde auf keiner Liste. Deshalb wird unten zusätzlich die
   * vollständige Schlüsselmenge festgenagelt: Was nicht ausdrücklich erlaubt
   * ist, lässt die Prüfung scheitern.
   */
  function alleSchluessel(wert: unknown, gesammelt = new Set<string>()): Set<string> {
    if (Array.isArray(wert)) {
      for (const eintrag of wert) alleSchluessel(eintrag, gesammelt);
    } else if (wert !== null && typeof wert === 'object') {
      for (const [name, inhalt] of Object.entries(wert)) {
        gesammelt.add(name);
        alleSchluessel(inhalt, gesammelt);
      }
    }
    return gesammelt;
  }

  let userId: string;
  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: '@grenztest.local' } } });
    const user = await prisma.user.create({
      data: {
        email: `grenze-${Date.now()}@grenztest.local`,
        passwordHash: await hashPassword('Testpasswort-123'),
        name: 'Grenze',
      },
    });
    userId = user.id;
  });

  it('gibt nach beantworteter Einstufung nur Punktzahl, Text und Erklärungen heraus', async () => {
    // Gemischt beantworten, nicht alles richtig. Eine Probe aus lauter
    // richtigen Antworten sieht nur einen Zweig: Ein Feld, das der Server
    // NUR bei falscher Antwort anhängt — etwa die Lösung „zum Vergleich" —
    // käme darin nie vor und bliebe unentdeckt, obwohl gerade Anfängerinnen
    // die meisten Fragen falsch haben. Nachgestellt, bevor das hier stand.
    const antworten = FRAGEN.map((frage, i) => ({
      questionId: frage.id,
      optionId:
        i % 3 === 0
          ? frage.correctOptionId
          : i % 3 === 1
            ? // `!` statt eines Rückfalls auf die richtige Antwort: Gäbe es je
              // eine Frage mit nur einer Option, entmischte ein Rückfall die
              // Probe lautlos — `some(!richtig)` bliebe grün, weil das
              // Drittel „Weiß ich nicht" ebenfalls falsch zählt.
              frage.options.find((o) => o.id !== frage.correctOptionId)!.id
            : DONT_KNOW_OPTION_ID,
    }));
    const ergebnis = await finalisiereOnboarding(userId, EINSTELLUNGEN, {
      art: 'beantwortet',
      antworten,
    });

    // Beide Zweige kommen in der Probe wirklich vor.
    expect(ergebnis.erklaerungen.some((e) => e.richtig)).toBe(true);
    expect(ergebnis.erklaerungen.some((e) => !e.richtig)).toBe(true);

    // Das, was die Ergebnisanzeige braucht, ist da …
    // Auf den Punkt festgenagelt, nicht nur „zwischen 0 und 100": Die drei
    // Proben decken die drei Bänder nur ab, solange diese hier bei 39 und
    // damit in „advanced-beginner" bleibt. Verschöbe eine Inhaltsänderung
    // sie über 70, stünde „refresher" zweimal da und „advanced-beginner"
    // gar nicht mehr — lautlos.
    expect(ergebnis.platzierung!.score).toBe(39);
    expect(ergebnis.erklaerungen).toHaveLength(FRAGEN.length);

    // … und zwar Wort für Wort das, was in den Fragen steht. Auf den TYP zu
    // prüfen genügt nicht: In einen erlaubten Text lässt sich alles
    // hineinschreiben, auch die Lösung. Wer den Text verändert, muss diese
    // Zusicherung anfassen.
    expect(ergebnis.erklaerungen.map((e) => e.questionId)).toEqual(FRAGEN.map((f) => f.id));
    expect(ergebnis.erklaerungen.map((e) => e.question)).toEqual(FRAGEN.map((f) => f.question));
    expect(ergebnis.erklaerungen.map((e) => e.explanation)).toEqual(
      FRAGEN.map((f) => f.explanation),
    );
    // Die Nachricht nicht NUR gegen `evaluatePlacement()` halten: Das wäre
    // dieselbe Funktion auf beiden Seiten, und ein dort eingebautes Leck
    // bewegte beide zugleich. Deshalb zusätzlich gegen das, was auf keinen
    // Fall darin stehen darf.
    const nachricht = ergebnis.platzierung!.message;
    expect(nachricht).toBe(evaluatePlacement(FRAGEN, antworten).message);
    for (const band of ['beginner', 'advanced-beginner', 'refresher']) {
      expect(nachricht, band).not.toContain(band);
    }
    for (const frage of FRAGEN) {
      expect(nachricht, frage.id).not.toContain(frage.explanation);
      // Die Kennung der richtigen Antwort steht hier bewusst NICHT: Sie ist
      // ein einzelner Buchstabe ("b"), und der kommt in jedem deutschen Satz
      // vor — die Prüfung wäre nicht zu bestehen und sagte nichts aus.
    }

    // Die Punktzahl trägt genau zwei Felder, nicht das ganze Ergebnis.
    expect(Object.keys(ergebnis.platzierung!).sort()).toEqual(['message', 'score']);

    // So, wie es über die Leitung ginge: Die Schlüsselmenge des ganzen Baums
    // ist abschließend aufgezählt. Ein zusätzliches Feld — gleich unter
    // welchem Namen und auf welcher Ebene — macht diese Zusicherung rot.
    // Der JSON-Umweg bildet ab, was über die Leitung ginge — solange dort
    // schlichte Objekte, Felder und Zeichenketten stehen. Eine `Map` oder
    // ein `Date` fiele hier flach und die Aufzählung sähe deren Inhalt
    // nicht; die Schlüsselmenge darunter schließt beides für heute aus.
    const uebertragen = JSON.parse(JSON.stringify(ergebnis));
    expect([...alleSchluessel(uebertragen)].sort()).toEqual([
      'erklaerungen',
      'explanation',
      'message',
      'platzierung',
      'question',
      'questionId',
      'richtig',
      'score',
    ]);

    // Zusätzlich die Namensliste: Sie sagt beim Scheitern deutlicher, WAS
    // hinausgerutscht ist, als eine Mengendifferenz es täte.
    const schluessel = alleSchluessel(uebertragen);
    for (const feld of VERBOTEN) {
      expect(schluessel.has(feld), `${feld} darf nicht über die Grenze`).toBe(false);
    }
  });

  it('gibt auch im Anfängerband nichts weiter heraus', async () => {
    // Das andere Ende. Die gemischte Probe liegt bei 39 Punkten
    // („advanced-beginner"), die richtige bei 100 („refresher") — ein Feld,
    // das nur im Band „beginner" anhinge, käme in keiner von beiden vor.
    // Das ist das Band, in dem die meisten anfangen.
    const ergebnis = await finalisiereOnboarding(userId, EINSTELLUNGEN, {
      art: 'beantwortet',
      antworten: FRAGEN.map((f) => ({ questionId: f.id, optionId: DONT_KNOW_OPTION_ID })),
    });

    expect(ergebnis.platzierung!.score).toBe(0);
    expect(ergebnis.erklaerungen.every((e) => !e.richtig)).toBe(true);
    expect(Object.keys(ergebnis.platzierung!).sort()).toEqual(['message', 'score']);
    expect([...alleSchluessel(JSON.parse(JSON.stringify(ergebnis)))].sort()).toEqual([
      'erklaerungen',
      'explanation',
      'message',
      'platzierung',
      'question',
      'questionId',
      'richtig',
      'score',
    ]);
  });

  it('gibt auch bei lauter richtigen Antworten nichts weiter heraus', async () => {
    // Die gemischte Probe landet bei 39 Punkten, Band „advanced-beginner".
    // Ein Feld, das der Server nur bei voller Punktzahl oder nur im Band
    // „refresher" anhängte, käme darin nicht vor — dieselbe Lücke wie zuvor
    // bei den falschen Antworten, nur am anderen Ende.
    const ergebnis = await finalisiereOnboarding(userId, EINSTELLUNGEN, {
      art: 'beantwortet',
      antworten: FRAGEN.map((f) => ({ questionId: f.id, optionId: f.correctOptionId })),
    });

    expect(ergebnis.platzierung!.score).toBe(100);
    expect(ergebnis.erklaerungen.every((e) => e.richtig)).toBe(true);
    expect(Object.keys(ergebnis.platzierung!).sort()).toEqual(['message', 'score']);
    expect([...alleSchluessel(JSON.parse(JSON.stringify(ergebnis)))].sort()).toEqual([
      'erklaerungen',
      'explanation',
      'message',
      'platzierung',
      'question',
      'questionId',
      'richtig',
      'score',
    ]);
  });

  it('gibt bei übersprungener Einstufung nichts heraus', async () => {
    const ergebnis = await finalisiereOnboarding(userId, EINSTELLUNGEN, { art: 'uebersprungen' });

    expect(ergebnis.platzierung).toBeNull();
    expect(ergebnis.erklaerungen).toEqual([]);

    // Auch hier die Schlüsselmenge abschließend: Sonst wäre ein Feld, das
    // NUR im übersprungenen Fall angehängt wird, von keiner Aufzählung
    // gedeckt — dieselbe Lücke wie bei den falschen Antworten.
    const uebertragen = JSON.parse(JSON.stringify(ergebnis));
    expect([...alleSchluessel(uebertragen)].sort()).toEqual(['erklaerungen', 'platzierung']);

    const schluessel = alleSchluessel(uebertragen);
    for (const feld of VERBOTEN) {
      expect(schluessel.has(feld), `${feld} darf nicht über die Grenze`).toBe(false);
    }
  });
});
