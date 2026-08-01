import { describe, expect, it } from 'vitest';
import { contentStats, parseContent } from '@/content';
import { validateCourseGraph, CODE_EXERCISE_TYPES } from '@/domain/content/schema';
import { toPublicPayload } from '@/domain/content/public-view';
import { exercisePayloadSchema } from '@/domain/content/exercise-payload';

/**
 * Diese Tests sind zugleich die redaktionelle Abnahme: Sie prüfen, dass die
 * ausgelieferten Inhalte die Anforderungen des Lernmodells erfüllen und dass
 * keine Lösung versehentlich an den Browser gelangt.
 */

const content = parseContent();

describe('Ausgelieferte Inhalte', () => {
  it('erfüllt alle Beziehungsregeln ohne Fehler', () => {
    const fehler = content.validation.issues.filter((i) => i.severity === 'error');
    expect(fehler).toEqual([]);
    expect(content.validation.ok).toBe(true);
  });

  it('enthält keine offenen Warnungen', () => {
    const warnungen = content.validation.issues.filter((i) => i.severity === 'warning');
    expect(warnungen).toEqual([]);
  });

  it('erfüllt den geforderten Mindestumfang der ersten Version', () => {
    const stats = contentStats();

    expect(stats.modules).toBeGreaterThanOrEqual(3);
    expect(stats.lessons).toBeGreaterThanOrEqual(12);
    expect(stats.exercises).toBeGreaterThanOrEqual(50);
    expect(stats.exerciseKinds).toBeGreaterThanOrEqual(4);
    expect(stats.reviewSets).toBeGreaterThanOrEqual(3);
    expect(stats.projects).toBeGreaterThanOrEqual(2);
  });

  it('enthält keine Platzhaltertexte', () => {
    const alles = JSON.stringify(content);
    for (const muster of [/lorem ipsum/i, /\bTODO\b/, /coming soon/i, /lesson content here/i]) {
      expect(alles).not.toMatch(muster);
    }
  });

  it('vermeidet verharmlosende Formulierungen', () => {
    const alles = JSON.stringify(content).toLowerCase();
    for (const floskel of [
      'das ist ganz einfach',
      'du musst nur',
      'offensichtlich ist',
      'jeder weiß',
    ]) {
      expect(alles).not.toContain(floskel);
    }
  });

  it('gibt jeder Lektion mindestens ein überprüfbares Lernziel', () => {
    for (const mod of content.course.modules) {
      for (const lesson of mod.lessons) {
        expect(lesson.learningObjectives.length).toBeGreaterThan(0);
        for (const ziel of lesson.learningObjectives) {
          expect(ziel.length).toBeGreaterThan(30);
          // "Du lernst X kennen" wäre kein überprüfbares Ziel.
          expect(ziel).toMatch(/kannst|erkennst|weißt/i);
        }
      }
    }
  });

  it('baut in jeder Lektion die Hilfen ab', () => {
    for (const mod of content.course.modules) {
      for (const lesson of mod.lessons) {
        const stufen = lesson.exercises.map((e) => e.scaffoldLevel);
        expect(Math.max(...stufen)).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('gibt jeder Code-Aufgabe Tests und eine Musterlösung', () => {
    for (const mod of content.course.modules) {
      for (const lesson of mod.lessons) {
        for (const exercise of lesson.exercises) {
          if (!CODE_EXERCISE_TYPES.has(exercise.type)) continue;
          expect(exercise.publicTests.length + exercise.hiddenTests.length).toBeGreaterThan(0);
          expect(exercise.solution).toBeTruthy();
        }
      }
    }
  });

  it('versieht jede Aufgabe mit einer aufsteigenden Hinweisleiter ab Stufe 1', () => {
    for (const mod of content.course.modules) {
      for (const lesson of mod.lessons) {
        for (const exercise of lesson.exercises) {
          expect(exercise.hints.length).toBeGreaterThan(0);
          expect(exercise.hints[0]?.level).toBe(1);
          const stufen = exercise.hints.map((h) => h.level);
          expect([...stufen].sort((a, b) => a - b)).toEqual(stufen);
        }
      }
    }
  });

  it('gibt jeder frei zu schreibenden Aufgabe die volle Hinweisleiter', () => {
    for (const mod of content.course.modules) {
      for (const lesson of mod.lessons) {
        for (const exercise of lesson.exercises) {
          if (exercise.payload.kind !== 'code') continue;
          const maxStufe = Math.max(...exercise.hints.map((h) => h.level));
          expect(maxStufe).toBe(5);
        }
      }
    }
  });

  it('deckt alle acht Interaktionsformen ab', () => {
    const formen = new Set(
      content.course.modules.flatMap((m) =>
        m.lessons.flatMap((l) => l.exercises.map((e) => e.payload.kind)),
      ),
    );

    expect([...formen].sort()).toEqual([
      'code',
      'codeCompletion',
      'findError',
      'freeText',
      'multipleChoice',
      'parsons',
      'predictOutput',
      'singleChoice',
    ]);
  });

  it('verwendet jeden Konzept-Slug nur einmal und ohne Zyklen', () => {
    const slugs = content.concepts.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const ergebnis = validateCourseGraph({
      course: content.course,
      concepts: content.concepts,
      reviewSets: content.reviewSets,
      projects: content.projects,
    });
    expect(ergebnis.issues.filter((i) => i.message.includes('Zyklische'))).toEqual([]);
  });

  it('gibt jedem Projekt mindestens zwei Meilensteine mit Tests', () => {
    for (const project of content.projects) {
      expect(project.milestones.length).toBeGreaterThanOrEqual(2);
      expect(project.tests.length).toBeGreaterThanOrEqual(2);
      expect(project.rubric.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('Öffentliche Sicht auf Aufgaben', () => {
  const alleAufgaben = content.course.modules.flatMap((m) => m.lessons.flatMap((l) => l.exercises));

  it('entfernt aus jeder Aufgabe alles, was die Lösung verrät', () => {
    for (const exercise of alleAufgaben) {
      const payload = exercisePayloadSchema.parse(exercise.payload);
      const publicPayload = toPublicPayload(payload, exercise.slug);
      const serialisiert = JSON.stringify(publicPayload);

      switch (payload.kind) {
        case 'singleChoice':
          expect(serialisiert).not.toContain('correctOptionId');
          for (const option of payload.options) {
            expect(serialisiert).not.toContain(option.feedback);
          }
          break;
        case 'multipleChoice':
          expect(serialisiert).not.toContain('correctOptionIds');
          break;
        case 'freeText':
          expect(serialisiert).not.toContain(payload.sampleAnswer);
          for (const gruppe of payload.requiredKeywordGroups) {
            expect(serialisiert).not.toContain(gruppe.missingHint);
          }
          break;
        case 'predictOutput':
          expect(serialisiert).not.toContain('expectedOutput');
          expect(serialisiert).not.toContain(payload.explanation);
          break;
        case 'parsons':
          expect(serialisiert).not.toContain('correctOrder');
          break;
        case 'codeCompletion':
          for (const blank of payload.blanks) {
            expect(serialisiert).not.toContain('accepted');
            expect(serialisiert).not.toContain(blank.wrongHint);
          }
          break;
        case 'findError':
          expect(serialisiert).not.toContain('faultyLineNumbers');
          expect(serialisiert).not.toContain(payload.explanation);
          break;
        case 'code':
          expect(serialisiert).not.toContain('mustMatch');
          expect(serialisiert).not.toContain('mustNotMatch');
          break;
      }
    }
  });

  it('setzt die Einrückung bei Parsons-Aufgaben zurück', () => {
    for (const exercise of alleAufgaben) {
      const payload = exercisePayloadSchema.parse(exercise.payload);
      if (payload.kind !== 'parsons') continue;
      const publicPayload = toPublicPayload(payload, exercise.slug);
      if (publicPayload.kind !== 'parsons') continue;
      expect(publicPayload.lines.every((l) => l.indent === 0)).toBe(true);
    }
  });

  it('mischt Auswahloptionen reproduzierbar', () => {
    const exercise = alleAufgaben.find((e) => e.payload.kind === 'singleChoice');
    expect(exercise).toBeDefined();
    if (!exercise) return;

    const payload = exercisePayloadSchema.parse(exercise.payload);
    const a = toPublicPayload(payload, exercise.slug);
    const b = toPublicPayload(payload, exercise.slug);
    expect(a).toEqual(b);
  });
});

describe('validateCourseGraph', () => {
  it('meldet ein unbekanntes Konzept als Fehler', () => {
    const ergebnis = validateCourseGraph({
      course: {
        slug: 'test',
        title: 'Testkurs',
        description: 'Ein Kurs ausschließlich für diesen Test der Beziehungsprüfung.',
        version: '1.0.0',
        modules: [
          {
            slug: 'm1',
            title: 'Modul',
            summary: 'Zusammenfassung, die lang genug für die Schemaprüfung ist.',
            rationale: 'Begründung, die ebenfalls lang genug für die Schemaprüfung ist.',
            prerequisiteModuleSlugs: [],
            status: 'PUBLISHED',
            lessons: [
              {
                slug: 'l1',
                title: 'Lektion',
                learningObjectives: ['Du kannst nach dieser Lektion etwas Bestimmtes tun.'],
                everydayProblem: 'Ein Alltagsproblem, das ausführlich genug beschrieben ist.',
                mentalModel: 'Ein mentales Modell, das ausführlich genug beschrieben ist.',
                workedExample: {
                  code: 'print("hallo")',
                  annotations: [{ line: 1, text: 'Gibt Text aus.' }],
                  output: 'hallo',
                  trace: [],
                },
                reflectionPrompts: ['Was war neu?', 'Wo warst du unsicher?'],
                commonMistakes: [
                  { mistake: 'Ein Fehler.', why: 'Ein Grund.', fix: 'Eine Abhilfe.' },
                ],
                estimatedMinutes: 5,
                contentVersion: '1.0.0',
                status: 'PUBLISHED',
                primaryConceptSlugs: ['gibt-es-nicht'],
                supportingConceptSlugs: [],
                prerequisiteConceptSlugs: [],
                exercises: [
                  {
                    slug: 'x1',
                    type: 'SINGLE_CHOICE',
                    title: 'Frage',
                    prompt: 'Eine Frage mit ausreichender Länge?',
                    payload: {
                      kind: 'singleChoice',
                      options: [
                        { id: 'a', text: 'A', feedback: 'Begründung A' },
                        { id: 'b', text: 'B', feedback: 'Begründung B' },
                      ],
                      correctOptionId: 'a',
                    },
                    publicTests: [],
                    hiddenTests: [],
                    hints: [{ level: 1, kind: 'impulse', text: 'Impuls' }],
                    difficulty: 1,
                    scaffoldLevel: 5,
                    conceptSlugs: ['gibt-es-nicht'],
                    status: 'PUBLISHED',
                  },
                ],
              },
            ],
          },
        ],
      },
      concepts: [],
      reviewSets: [],
      projects: [],
    });

    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.issues.some((i) => i.message.includes('gibt-es-nicht'))).toBe(true);
  });

  it('erkennt zyklische Konzeptvoraussetzungen', () => {
    const ergebnis = validateCourseGraph({
      course: content.course,
      concepts: [
        {
          slug: 'a',
          name: 'A',
          description: 'Eine Beschreibung mit genug Zeichen.',
          difficulty: 1,
          prerequisiteSlugs: ['b'],
        },
        {
          slug: 'b',
          name: 'B',
          description: 'Eine Beschreibung mit genug Zeichen.',
          difficulty: 1,
          prerequisiteSlugs: ['a'],
        },
      ],
      reviewSets: [],
      projects: [],
    });

    expect(ergebnis.issues.some((i) => i.message.includes('Zyklische'))).toBe(true);
  });
});
