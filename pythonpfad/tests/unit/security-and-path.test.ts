import { beforeEach, describe, expect, it } from 'vitest';
import { checkPasswordStrength, hashPassword, verifyPassword } from '@/server/auth/password';
import { RATE_LIMITS, __resetRateLimits, checkRateLimit } from '@/server/security/rate-limit';
import { buildLearningPath, determineNextStep } from '@/domain/path/learning-path';
import { evaluatePlacement } from '@/domain/placement/placement';
import { placementQuestions } from '@/content/placement';
import { checkTutorGuardrails } from '@/domain/tutor/types';
import { RuleBasedTutor } from '@/domain/tutor/rule-based';

describe('Passwörter', () => {
  it('erzeugt für dasselbe Passwort unterschiedliche Hashes', async () => {
    const a = await hashPassword('einSicheresPasswort1');
    const b = await hashPassword('einSicheresPasswort1');
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt$')).toBe(true);
  });

  it('bestätigt das richtige und lehnt das falsche Passwort ab', async () => {
    const hash = await hashPassword('einSicheresPasswort1');
    expect(await verifyPassword('einSicheresPasswort1', hash)).toBe(true);
    expect(await verifyPassword('einSicheresPasswort2', hash)).toBe(false);
  });

  it('speichert das Passwort nirgends im Klartext', async () => {
    const hash = await hashPassword('gehEinsHierRein42');
    expect(hash).not.toContain('gehEinsHierRein42');
  });

  it('lehnt beschädigte Hashes ab, statt zu werfen', async () => {
    expect(await verifyPassword('irgendwas', 'kaputt')).toBe(false);
    expect(await verifyPassword('irgendwas', 'scrypt$a$b$c$d$e')).toBe(false);
    expect(await verifyPassword('irgendwas', '')).toBe(false);
  });

  it('prüft die Passwortqualität nach Länge statt nach Zeichenklassen', () => {
    expect(checkPasswordStrength('kurz').ok).toBe(false);
    expect(checkPasswordStrength('eine lange wortfolge zum merken').ok).toBe(true);
    expect(checkPasswordStrength('passwort123').ok).toBe(false);
    expect(checkPasswordStrength('aaaaaaaaaaaa').ok).toBe(false);
  });

  it('lehnt Passwörter mit der eigenen E-Mail-Adresse ab', () => {
    const result = checkPasswordStrength('lernendeXYZ123', 'lernende@example.org');
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('E-Mail');
  });
});

describe('Ratenbegrenzung', () => {
  beforeEach(() => __resetRateLimits());

  it('lässt Anfragen bis zum Limit zu und blockt danach', () => {
    const config = RATE_LIMITS.login;
    for (let i = 0; i < config.limit; i += 1) {
      expect(checkRateLimit('test', config).allowed).toBe(true);
    }
    const geblockt = checkRateLimit('test', config);
    expect(geblockt.allowed).toBe(false);
    expect(geblockt.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('trennt verschiedene Schlüssel', () => {
    const config = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit('a', config).allowed).toBe(true);
    expect(checkRateLimit('b', config).allowed).toBe(true);
    expect(checkRateLimit('a', config).allowed).toBe(false);
  });

  it('gibt nach Ablauf des Fensters wieder frei', () => {
    const config = { limit: 1, windowMs: 1000 };
    const start = 1_000_000;
    expect(checkRateLimit('c', config, start).allowed).toBe(true);
    expect(checkRateLimit('c', config, start + 500).allowed).toBe(false);
    expect(checkRateLimit('c', config, start + 1500).allowed).toBe(true);
  });
});

describe('Lernpfad', () => {
  const lessons = [
    {
      slug: 'a',
      title: 'A',
      moduleSlug: 'm1',
      moduleOrder: 0,
      lessonOrder: 0,
      estimatedMinutes: 10,
      primaryConceptSlugs: ['k1'],
    },
    {
      slug: 'b',
      title: 'B',
      moduleSlug: 'm1',
      moduleOrder: 0,
      lessonOrder: 1,
      estimatedMinutes: 10,
      primaryConceptSlugs: ['k2'],
    },
    {
      slug: 'c',
      title: 'C',
      moduleSlug: 'm2',
      moduleOrder: 1,
      lessonOrder: 0,
      estimatedMinutes: 20,
      primaryConceptSlugs: ['k3'],
    },
  ];

  it('behält die fachliche Reihenfolge unabhängig von der Einstufung bei', () => {
    const pfad = buildLearningPath({
      lessons,
      placementScore: 95,
      demonstratedConceptSlugs: ['k1', 'k2', 'k3'],
      learningGoal: 'GENERAL',
      dailyTimeBudget: 20,
      pace: 'STEADY',
    });

    expect(pfad.lessonSlugs).toEqual(['a', 'b', 'c']);
  });

  it('überspringt niemals eine Lektion, sondern kürzt sie höchstens ab', () => {
    const pfad = buildLearningPath({
      lessons,
      placementScore: 95,
      demonstratedConceptSlugs: ['k1'],
      learningGoal: 'GENERAL',
      dailyTimeBudget: 20,
      pace: 'STEADY',
    });

    expect(pfad.steps).toHaveLength(3);
    expect(pfad.steps[0]?.mode).toBe('refresher');
    expect(pfad.steps[1]?.mode).toBe('full');
    expect(pfad.steps[0]!.estimatedMinutes).toBeLessThan(lessons[0]!.estimatedMinutes);
  });

  it('erklärt den Pfad in verständlichen Worten', () => {
    const pfad = buildLearningPath({
      lessons,
      placementScore: 10,
      demonstratedConceptSlugs: [],
      learningGoal: 'OFFICE_AUTOMATION',
      dailyTimeBudget: 10,
      pace: 'RELAXED',
    });

    expect(pfad.rationale).toContain('Büroaufgaben automatisieren');
    expect(pfad.rationale).toContain('Grundlagen');
    expect(pfad.estimatedDays).toBeGreaterThan(0);
  });

  it('rechnet mit höherem Tempo weniger Lerntage', () => {
    const gemaechlich = buildLearningPath({
      lessons,
      placementScore: 50,
      demonstratedConceptSlugs: [],
      learningGoal: 'GENERAL',
      dailyTimeBudget: 20,
      pace: 'RELAXED',
    });
    const zuegig = buildLearningPath({
      lessons,
      placementScore: 50,
      demonstratedConceptSlugs: [],
      learningGoal: 'GENERAL',
      dailyTimeBudget: 20,
      pace: 'FOCUSED',
    });

    expect(zuegig.estimatedDays).toBeLessThanOrEqual(gemaechlich.estimatedDays);
  });
});

describe('Nächster Schritt', () => {
  it('stellt fällige Wiederholungen vor neuen Stoff', () => {
    const step = determineNextStep({
      lessonSlugs: ['a', 'b'],
      completedLessonSlugs: [],
      inProgressLessonSlug: 'a',
      dueReviewCount: 3,
    });

    expect(step.kind).toBe('review');
    expect(step.href).toBe('/wiederholen');
  });

  it('setzt eine begonnene Lektion fort', () => {
    const step = determineNextStep({
      lessonSlugs: ['a', 'b'],
      completedLessonSlugs: [],
      inProgressLessonSlug: 'a',
      dueReviewCount: 0,
    });

    expect(step.kind).toBe('continue');
    expect(step.href).toBe('/lernen/a');
  });

  it('schlägt die nächste offene Lektion vor', () => {
    const step = determineNextStep({
      lessonSlugs: ['a', 'b'],
      completedLessonSlugs: ['a'],
      inProgressLessonSlug: null,
      dueReviewCount: 0,
    });

    expect(step.kind).toBe('start');
    expect(step.href).toBe('/lernen/b');
  });

  it('verweist nach Abschluss des Pfads auf Projekte', () => {
    const step = determineNextStep({
      lessonSlugs: ['a'],
      completedLessonSlugs: ['a'],
      inProgressLessonSlug: null,
      dueReviewCount: 0,
    });

    expect(step.kind).toBe('done');
    expect(step.href).toBe('/projekte');
  });
});

describe('Einstufung', () => {
  it('bewertet alle Fragen richtig als hohes Ergebnis', () => {
    const result = evaluatePlacement(
      placementQuestions,
      placementQuestions.map((q) => ({ questionId: q.id, optionId: q.correctOptionId })),
    );

    expect(result.score).toBe(100);
    expect(result.band).toBe('refresher');
    expect(result.demonstratedConceptSlugs.length).toBeGreaterThan(0);
  });

  it('wertet fehlende Antworten wie "Weiß ich nicht"', () => {
    const result = evaluatePlacement(placementQuestions, []);
    expect(result.score).toBe(0);
    expect(result.band).toBe('beginner');
    expect(result.demonstratedConceptSlugs).toEqual([]);
  });

  it('formuliert das Ergebnis ohne Abwertung der Person', () => {
    const result = evaluatePlacement(placementQuestions, []);
    expect(result.message).toContain('Grundlagen');
    expect(result.message.toLowerCase()).not.toContain('schlecht');
    expect(result.message.toLowerCase()).not.toContain('leider');
  });

  it('zählt richtige Antworten je Bereich', () => {
    const nurLogik = placementQuestions
      .filter((q) => q.area === 'logic')
      .map((q) => ({ questionId: q.id, optionId: q.correctOptionId }));

    const result = evaluatePlacement(placementQuestions, nurLogik);
    expect(result.byArea.logic.correct).toBe(result.byArea.logic.total);
    expect(result.byArea.python.correct).toBe(0);
  });
});

describe('Tutor-Leitplanken', () => {
  it('verwirft eine Antwort, die die Musterlösung enthält', () => {
    const result = checkTutorGuardrails(
      {
        provider: 'anthropic',
        paragraphs: ['Hier ist die Lösung: summe = 0 für alle Werte addieren und ausgeben.'],
        nextStep: 'Übernimm das.',
      },
      {
        solution: 'summe = 0 für alle Werte addieren und ausgeben.',
        maxHintLevel: 5,
        hintsRevealed: 0,
      },
    );

    expect(result.ok).toBe(false);
    expect(result.violations.join(' ')).toContain('Musterlösung');
  });

  it('verwirft lange Codeblöcke vor Abschluss der Hinweisleiter', () => {
    const code = ['a = 1', 'b = 2', 'c = 3', 'd = 4', 'e = 5', 'print(a)'].join('\n');
    const result = checkTutorGuardrails(
      {
        provider: 'anthropic',
        paragraphs: [`Hier:\n\`\`\`python\n${code}\n\`\`\``],
        nextStep: 'Probiere das.',
      },
      { solution: null, maxHintLevel: 5, hintsRevealed: 1 },
    );

    expect(result.ok).toBe(false);
    expect(result.violations.join(' ')).toContain('Codezeilen');
  });

  it('lässt kurze Ausschnitte zu', () => {
    const result = checkTutorGuardrails(
      {
        provider: 'anthropic',
        paragraphs: ['Denk an dieses Muster:\n```python\nsumme = summe + wert\n```'],
        nextStep: 'Übertrage es auf deine Aufgabe.',
      },
      { solution: null, maxHintLevel: 5, hintsRevealed: 0 },
    );

    expect(result.ok).toBe(true);
  });

  it('verwirft Antworten mit unbelegter Gewissheit', () => {
    const result = checkTutorGuardrails(
      {
        provider: 'anthropic',
        paragraphs: ['Dein Code ist garantiert richtig.'],
        nextStep: 'Reiche ihn ein.',
      },
      { solution: null, maxHintLevel: 5, hintsRevealed: 5 },
    );

    expect(result.ok).toBe(false);
  });

  it('verwirft übermäßig lange Antworten', () => {
    const result = checkTutorGuardrails(
      { provider: 'anthropic', paragraphs: ['x'.repeat(2500)], nextStep: 'Weiter.' },
      { solution: null, maxHintLevel: 5, hintsRevealed: 5 },
    );

    expect(result.ok).toBe(false);
  });
});

describe('Regelbasierter Tutor', () => {
  const tutor = new RuleBasedTutor();
  const context = {
    exerciseTitle: 'Summe bilden',
    exercisePrompt: 'Bilde die Summe aller Werte.',
    concepts: [
      { slug: 'akkumulator', name: 'Akkumulator', description: 'Sammelt Zwischenergebnisse.' },
    ],
    masteryByConcept: { akkumulator: 30 },
    attempts: 2,
    hintsRevealed: 1,
    maxHintLevel: 5,
    lastPassedTests: 1,
    lastTotalTests: 3,
  };

  it('stellt bei einem Denkimpuls eine Frage statt eine Lösung zu liefern', async () => {
    const reply = await tutor.reply({ mode: 'impulse' }, context);
    expect(reply.paragraphs.join(' ')).toContain('?');
    expect(reply.provider).toBe('rule-based');
    expect(
      checkTutorGuardrails(reply, { solution: null, maxHintLevel: 5, hintsRevealed: 1 }).ok,
    ).toBe(true);
  });

  it('übersetzt eine Fehlermeldung und benennt die eigene Unsicherheit', async () => {
    const reply = await tutor.reply(
      { mode: 'error-help', traceback: "NameError: name 'summe' is not defined" },
      context,
    );

    expect(reply.paragraphs.join(' ')).toContain('NameError');
    expect(reply.caveat).toBeTruthy();
    expect(reply.documentation?.url).toContain('docs.python.org');
  });

  it('weist auf eine fehlende Umwandlung hin, ohne den Code zu schreiben', async () => {
    const reply = await tutor.reply(
      { mode: 'check-approach', code: 'alter = input("Alter: ")\nprint(alter * 2)' },
      context,
    );

    expect(reply.paragraphs.join(' ')).toContain('wandelst sie aber nirgends um');
    expect(reply.paragraphs.join(' ')).not.toContain('int(');
  });

  it('bleibt bei jedem Modus innerhalb der Leitplanken', async () => {
    const modes = [
      'simpler',
      'impulse',
      'error-help',
      'check-approach',
      'control-question',
      'similar-example',
      'explain-error-message',
      'verify-understanding',
    ] as const;

    for (const mode of modes) {
      const reply = await tutor.reply({ mode, code: 'for x in y:\n    pass' }, context);
      const guardrails = checkTutorGuardrails(reply, {
        solution: null,
        maxHintLevel: 5,
        hintsRevealed: 0,
      });
      expect(guardrails.violations, `Modus ${mode}`).toEqual([]);
      expect(reply.nextStep.length).toBeGreaterThan(10);
    }
  });
});
