import { describe, expect, it, beforeEach } from 'vitest';
import './setup';
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import {
  submitAttempt,
  revealNextHint,
  getRevealedHints,
  getPublicExercise,
} from '@/server/services/exercise-service';

/**
 * Regressionstests für zwei Codex-Funde auf PR #29:
 *  - "Repeated Error Detection": der gerade erstellte Attempt durfte sich
 *    nicht selbst als "letzten fehlgeschlagenen Versuch" finden.
 *  - "Hint Ladder": Hinweise müssen serverseitig anhand echter
 *    Versuchszahlen freigegeben werden, nicht anhand client-gemeldeter Werte.
 */
describe('Aufgaben-Dienst', () => {
  const email = 'exercise-service@integrationtest.local';
  let userId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Aufgabentest',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    userId = user.id;
  });

  describe('Fehlerwiederholung', () => {
    it('wertet den ersten Fehler eines Typs NICHT als Wiederholung', async () => {
      // Eine falsche Option bei "was-ist-aipfad-single-choice" ergibt FAILED/MISCONCEPTION.
      const result = await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'a' }, // falsch, korrekt ist 'b'
        durationMs: 500,
        isReview: false,
      });

      expect(result.outcome).toBe('FAILED');
      const update = result.masteryUpdates[0];
      expect(update).toBeDefined();
      expect(update?.reasons.some((r) => r.includes('erneut'))).toBe(false);
    });

    it('wertet den zweiten Fehler DESSELBEN Typs als Wiederholung', async () => {
      await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'a' },
        durationMs: 500,
        isReview: false,
      });

      const second = await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'c' }, // andere falsche Option, gleicher errorType
        durationMs: 500,
        isReview: false,
      });

      expect(second.outcome).toBe('FAILED');
      const update = second.masteryUpdates[0];
      expect(update?.reasons.some((r) => r.includes('erneut'))).toBe(true);
    });

    it('ein PASSED-Attempt erzeugt keine falsche Wiederholungsbewertung', async () => {
      await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'a' },
        durationMs: 500,
        isReview: false,
      });

      const passed = await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'b' }, // korrekt
        durationMs: 500,
        isReview: false,
      });

      expect(passed.outcome).toBe('PASSED');
      const update = passed.masteryUpdates[0];
      expect(update?.reasons.some((r) => r.includes('erneut'))).toBe(false);
    });
  });

  describe('Hinweisleiter', () => {
    it('gibt Hinweisstufe 1 ohne vorherige Versuche frei', async () => {
      const result = await revealNextHint(userId, 'was-ist-aipfad-single-choice');
      expect('hint' in result).toBe(true);
      if ('hint' in result) {
        expect(result.hint.level).toBe(1);
      }
    });

    it('blockiert Hinweisstufe 2 ohne einen eigenen Versuch', async () => {
      await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 1
      const result = await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 2
      expect('blocked' in result).toBe(true);
    });

    it('gibt Hinweisstufe 2 erst nach einem echten, in der DB gespeicherten Versuch frei', async () => {
      await submitAttempt(userId, {
        exerciseSlug: 'was-ist-aipfad-single-choice',
        submission: { kind: 'singleChoice', optionId: 'a' },
        durationMs: 500,
        isReview: false,
      });

      await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 1
      const result = await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 2
      expect('hint' in result).toBe(true);
    });

    it('lässt sich NICHT durch wiederholte Aufrufe ohne echte Versuche über Stufe 1 hinaus täuschen', async () => {
      // Kein Attempt in der DB — auch ein manipulierter Client, der
      // `revealNextHint` beliebig oft aufruft, kommt ohne echten Versuch nicht
      // über Stufe 1 hinaus: die Prüfung beruht ausschließlich auf der echten
      // Versuchszahl aus der Datenbank. Es gibt keinen Client-Parameter mehr,
      // über den sich eine Zielstufe direkt anfordern ließe.
      await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 1
      const result = await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 2
      expect('blocked' in result).toBe(true);

      const attemptCount = await prisma.attempt.count({ where: { userId } });
      expect(attemptCount).toBe(0);
    });

    it('eine blockierte Freigabe schreibt keine HintReveal-Zeile', async () => {
      const first = await revealNextHint(userId, 'was-ist-aipfad-single-choice'); // Stufe 1
      expect('hint' in first).toBe(true);
      const again = await revealNextHint(userId, 'was-ist-aipfad-single-choice');
      // Ohne einen echten Versuch bleibt Stufe 2 blockiert — ein erneuter Aufruf
      // legt keine zweite Stufe-1-Zeile an.
      expect('blocked' in again).toBe(true);

      const revealCount = await prisma.hintReveal.count({ where: { userId } });
      expect(revealCount).toBe(1);
    });
  });
});

/**
 * Regressionstest für den Codex-Fund "Restore persisted hints when mounting
 * the ladder" (PR #29, exakter Head fdfa141): `HintReveal` wurde zwar
 * serverseitig persistiert, aber beim erneuten Aufbau der Oberfläche nicht
 * wieder mitgeliefert. Der Client begann dann wieder bei Stufe 1, während
 * der Server schon weiter war — der zuletzt gelesene Hinweis war nicht mehr
 * erreichbar und Anzeige und Freigabe liefen dauerhaft auseinander.
 */
describe('Wiederherstellung freigegebener Hinweise', () => {
  const email = 'hint-restore@integrationtest.local';
  const exerciseSlug = 'was-ist-aipfad-single-choice';
  let userId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Hinweistest',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    userId = user.id;
  });

  it('liefert ohne Freigabe keine Hinweise', async () => {
    await expect(getRevealedHints(userId, exerciseSlug)).resolves.toEqual([]);
  });

  it('liefert genau die bereits freigegebenen Stufen mit echtem Text zurück', async () => {
    const revealed = await revealNextHint(userId, exerciseSlug);
    expect(revealed).toHaveProperty('hint');
    const ersterHinweis = 'hint' in revealed ? revealed.hint : null;
    expect(ersterHinweis?.level).toBe(1);

    // Genau das, was der Client beim nächsten Seitenaufbau bekommt.
    const restored = await getRevealedHints(userId, exerciseSlug);
    expect(restored.map((h) => h.level)).toEqual([1]);
    expect(restored[0]?.text).toBe(ersterHinweis?.text);
  });

  it('gibt nach der Wiederherstellung die nächste Stufe frei, nicht erneut Stufe 1', async () => {
    await revealNextHint(userId, exerciseSlug);

    // Ein eigener Versuch schaltet Stufe 2 frei (MIN_ATTEMPTS_FOR_LEVEL[2] = 1).
    await submitAttempt(userId, {
      exerciseSlug,
      submission: { kind: 'singleChoice', optionId: 'a' },
      durationMs: 500,
      isReview: false,
    });

    const zweiter = await revealNextHint(userId, exerciseSlug);
    expect('hint' in zweiter && zweiter.hint.level).toBe(2);

    const restored = await getRevealedHints(userId, exerciseSlug);
    expect(restored.map((h) => h.level)).toEqual([1, 2]);
  });

  it('liefert keine Hinweise anderer Personen', async () => {
    await revealNextHint(userId, exerciseSlug);

    const andere = await prisma.user.create({
      data: {
        email: 'hint-restore-fremd@integrationtest.local',
        name: 'Fremd',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    await expect(getRevealedHints(andere.id, exerciseSlug)).resolves.toEqual([]);
    await prisma.user.delete({ where: { id: andere.id } });
  });
});

/**
 * Regressionstests für die beiden Hälften des Codex-Funds "Hint Ladder", die
 * bislang unbelegt waren (Testanalyse zu PR #29):
 *
 *  1. `hintsUsed` eines Versuchs muss aus echten `HintReveal`-Zeilen stammen.
 *     Diese Zusicherung war nicht abgesichert: `revealedHintCount()` ließ sich
 *     auf `return 0` setzen, ohne dass ein einziger Test rot wurde — obwohl
 *     genau das der Fehler war, der die volle Hinweisleiter als eigenständige
 *     Lösung verbuchte.
 *  2. Hinweistexte dürfen die öffentliche Aufgabenfassung nie verlassen.
 */
describe('Hinweisnutzung wird serverseitig hergeleitet', () => {
  const email = 'hints-used@integrationtest.local';
  const exerciseSlug = 'was-ist-aipfad-single-choice';
  let userId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Hinweisnutzung',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    userId = user.id;
  });

  async function letzterVersuch() {
    return prisma.attempt.findFirstOrThrow({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { hintsUsed: true },
    });
  }

  it('schreibt hintsUsed = 0, solange kein Hinweis freigegeben wurde', async () => {
    await submitAttempt(userId, {
      exerciseSlug,
      submission: { kind: 'singleChoice', optionId: 'b' },
      durationMs: 500,
      isReview: false,
    });
    expect((await letzterVersuch()).hintsUsed).toBe(0);
  });

  it('zählt einen freigegebenen Hinweis in hintsUsed des Versuchs mit', async () => {
    await revealNextHint(userId, exerciseSlug);

    await submitAttempt(userId, {
      exerciseSlug,
      submission: { kind: 'singleChoice', optionId: 'b' },
      durationMs: 500,
      isReview: false,
    });

    // Der Wert kommt NICHT vom Client — er wird aus den HintReveal-Zeilen
    // dieser Person zu dieser Aufgabe gezählt.
    expect((await letzterVersuch()).hintsUsed).toBe(1);
    expect(await prisma.hintReveal.count({ where: { userId } })).toBe(1);
  });

  it('zählt nur die seit dem vorherigen Versuch neu freigegebenen Hinweise', async () => {
    await revealNextHint(userId, exerciseSlug); // Stufe 1
    await submitAttempt(userId, {
      exerciseSlug,
      submission: { kind: 'singleChoice', optionId: 'a' },
      durationMs: 500,
      isReview: false,
    });
    expect((await letzterVersuch()).hintsUsed).toBe(1);

    await revealNextHint(userId, exerciseSlug); // Stufe 2, jetzt freigeschaltet
    await submitAttempt(userId, {
      exerciseSlug,
      submission: { kind: 'singleChoice', optionId: 'b' },
      durationMs: 500,
      isReview: false,
    });

    // Für DIESEN Versuch wurde eine Stufe neu in Anspruch genommen — nicht
    // zwei. Die frühere Stufe gehört zum vorherigen Versuch.
    expect((await letzterVersuch()).hintsUsed).toBe(1);
  });

  it('wertet einen späteren Abruf ohne neue Hinweise als eigenständig', async () => {
    await revealNextHint(userId, exerciseSlug);
    await submitAttempt(userId, {
      exerciseSlug,
      submission: { kind: 'singleChoice', optionId: 'a' },
      durationMs: 500,
      isReview: false,
    });
    expect((await letzterVersuch()).hintsUsed).toBe(1);

    // Eine geplante Wiederholung ohne erneute Hilfe. Zählte hier die
    // Gesamtzahl über die Lebensdauer, gälte jede künftige Wiederholung
    // dieser Aufgabe auf Dauer als hinweisgestützt und der hilfefreie Abruf
    // ließe sich nie mehr nachweisen (Codex-Review auf PR #29, b41d724).
    await submitAttempt(userId, {
      exerciseSlug,
      submission: { kind: 'singleChoice', optionId: 'b' },
      durationMs: 500,
      isReview: true,
    });
    expect((await letzterVersuch()).hintsUsed).toBe(0);
  });

  it('liefert in der öffentlichen Aufgabe nur Stufennummern, keinen Hinweistext', async () => {
    const publicExercise = await getPublicExercise(exerciseSlug);
    expect(publicExercise).not.toBeNull();
    expect(publicExercise?.hintLevels).toEqual([1, 2]);

    // Kein Hinweistext darf in dem, was den Server Richtung Browser verlässt,
    // auftauchen — auch nicht in einem verschachtelten Feld.
    const serialisiert = JSON.stringify(publicExercise);
    expect(serialisiert).not.toContain('Werkstatt und einem Hörsaal');
    expect(serialisiert).not.toContain('Textmenge zu eigener Anwendung');
    expect(serialisiert).not.toContain('correctOptionId');
  });
});

/**
 * Regressionstest für den Codex-Fund "Serialize concurrent mastery updates"
 * (PR #29, Head dd89677): Die gemeinsame Transaktion allein genügte nicht.
 * Unter PostgreSQLs Vorgabe `Read Committed` durften zwei gleichzeitige
 * Einreichungen derselben Person zum selben Konzept beide denselben
 * Ausgangsstand lesen; der spätere Schreibvorgang überschrieb den früheren,
 * und ein Lernfortschritt ging verloren, obwohl beide Attempts verbucht
 * wurden. Jetzt läuft die Transaktion serialisierbar und wird bei einem
 * Konflikt wiederholt.
 */
describe('Gleichzeitige Einreichungen zum selben Konzept', () => {
  const email = 'mastery-race@integrationtest.local';
  const exerciseSlug = 'was-ist-aipfad-single-choice';
  let userId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Wettlauf Kompetenz',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    userId = user.id;
  });

  it('verliert keinen Kompetenzfortschritt und verbucht jeden Versuch', async () => {
    const parallel = 4;
    const results = await Promise.allSettled(
      Array.from({ length: parallel }, () =>
        submitAttempt(userId, {
          exerciseSlug,
          submission: { kind: 'singleChoice', optionId: 'b' }, // richtig
          durationMs: 500,
          isReview: false,
        }),
      ),
    );

    // Kein Aufruf darf an einem Serialisierungskonflikt scheitern.
    expect(results.filter((r) => r.status === 'rejected')).toEqual([]);
    expect(await prisma.attempt.count({ where: { userId } })).toBe(parallel);

    // Der Endstand muss ALLE Erfolge enthalten, nicht nur den zuletzt
    // geschriebenen: successfulRetrievals wird bei jedem bestandenen Versuch
    // um eins erhöht. Bei einem verlorenen Schreibvorgang stünde hier weniger.
    const mastery = await prisma.conceptMastery.findFirstOrThrow({ where: { userId } });
    expect(mastery.successfulRetrievals).toBe(parallel);
  });
});

/**
 * Regressionstest für den Codex-Fund "Refresh prior-attempt state on
 * serialization retries" (PR #29, Head 301c8c9): Die Abfrage des letzten
 * fehlgeschlagenen Versuchs lief außerhalb der Transaktion. Ein
 * Wiederholungslauf las danach zwar den inzwischen geschriebenen
 * Kompetenzstand, benutzte aber weiterhin die veraltete Vorgänger-Abfrage —
 * `repeatedErrorType` blieb fälschlich false, und der zweite Fehler bekam
 * weder den Abschlag noch die Rückmeldung für eine Fehlerwiederholung.
 */
describe('Gleichzeitige Fehlversuche mit derselben Fehlerart', () => {
  const email = 'repeat-error-race@integrationtest.local';
  const exerciseSlug = 'was-ist-aipfad-single-choice';
  let userId: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Wettlauf Fehlerart',
        passwordHash: await hashPassword('ein-testpasswort-123'),
      },
    });
    userId = user.id;
  });

  it('wertet den später verbuchten Fehler als Wiederholung', async () => {
    // Zwei gleichzeitige ERSTE Fehlversuche, gleiche Fehlerart. Genau einer
    // wird zuerst verbucht; der andere muss ihn sehen.
    const [ersterLauf, zweiterLauf] = await Promise.all([
      submitAttempt(userId, {
        exerciseSlug,
        submission: { kind: 'singleChoice', optionId: 'a' },
        durationMs: 500,
        isReview: false,
      }),
      submitAttempt(userId, {
        exerciseSlug,
        submission: { kind: 'singleChoice', optionId: 'c' },
        durationMs: 500,
        isReview: false,
      }),
    ]);

    expect(ersterLauf.outcome).toBe('FAILED');
    expect(zweiterLauf.outcome).toBe('FAILED');
    expect(await prisma.attempt.count({ where: { userId } })).toBe(2);

    const alsWiederholungGewertet = [ersterLauf, zweiterLauf].filter((r) =>
      r.masteryUpdates.some((u) => u.reasons.some((grund) => grund.includes('erneut'))),
    );

    // Mit der veralteten Vorgänger-Abfrage sahen BEIDE Läufe keinen früheren
    // Fehlversuch, und die Liste bliebe leer.
    expect(alsWiederholungGewertet).toHaveLength(1);
  });
});
