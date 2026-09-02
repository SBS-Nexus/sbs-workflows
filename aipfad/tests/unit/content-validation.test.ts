import { describe, expect, it } from 'vitest';
import {
  courseSchema,
  conceptSchema,
  labSchema,
  validateCourseGraph,
  validateCommandReference,
  type ConceptContent,
  type ConceptDraft,
} from '@/domain/content/schema';
import { course } from '@/content/course';
import { concepts as conceptDrafts } from '@/content/concepts';
import { labs as labDrafts } from '@/content/labs';
import { SETUP_SECTIONS } from '@/content/setup-commands';
import { exercisePayloadSchema } from '@/domain/content/exercise-payload';
import { toPublicPayload } from '@/domain/grading/grade';
import { UMGESETZTE_BEFEHLE } from '@/domain/labs/terminal';
import { z } from 'zod';

function parseAll() {
  const parsedCourse = courseSchema.parse(course);
  const parsedConcepts: ConceptContent[] = conceptDrafts.map((c) => conceptSchema.parse(c));
  const parsedLabs = labDrafts.map((l) => labSchema.parse(l));
  return { parsedCourse, parsedConcepts, parsedLabs };
}

describe('AIPfad content (Stage 0/1/4/5)', () => {
  it('parses and validates without errors', () => {
    const { parsedCourse, parsedConcepts, parsedLabs } = parseAll();
    const result = validateCourseGraph({
      course: parsedCourse,
      concepts: parsedConcepts,
      labs: parsedLabs,
    });
    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('has no cycles in the concept prerequisite graph', () => {
    const { parsedConcepts } = parseAll();
    const bySlug = new Map(parsedConcepts.map((c) => [c.slug, c]));
    const visit = (slug: string, trail: Set<string>): void => {
      expect(trail.has(slug)).toBe(false);
      const next = new Set(trail).add(slug);
      for (const pre of bySlug.get(slug)?.prerequisiteSlugs ?? []) {
        if (bySlug.has(pre)) visit(pre, next);
      }
    };
    for (const concept of parsedConcepts) visit(concept.slug, new Set());
  });

  it('rejects placeholder text via validateCourseGraph', () => {
    const { parsedCourse, parsedConcepts, parsedLabs } = parseAll();
    const withPlaceholder = structuredClone(parsedCourse);
    const firstLesson = withPlaceholder.modules[0]?.lessons[0];
    if (!firstLesson) throw new Error('Testfixtur: keine Lektion vorhanden.');
    firstLesson.everydayProblem = 'TODO: Platzhaltertext für diese Lektion einfügen.';

    const result = validateCourseGraph({
      course: withPlaceholder,
      concepts: parsedConcepts,
      labs: parsedLabs,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes('Platzhaltertext'))).toBe(true);
  });

  it('detects a concept-cycle if one is introduced', () => {
    const { parsedConcepts, parsedCourse, parsedLabs } = parseAll();
    const withCycle: ConceptContent[] = structuredClone(parsedConcepts);
    const [first, second] = withCycle;
    if (!first || !second) throw new Error('Testfixtur: zu wenige Konzepte.');
    first.prerequisiteSlugs = [...first.prerequisiteSlugs, second.slug];
    second.prerequisiteSlugs = [...second.prerequisiteSlugs, first.slug];

    const result = validateCourseGraph({
      course: parsedCourse,
      concepts: withCycle,
      labs: parsedLabs,
    });
    expect(result.issues.some((i) => i.message.includes('Zyklische Voraussetzung'))).toBe(true);
  });

  it('every lesson has a scaffold-level ≥4 exercise or is flagged with a warning', () => {
    const { parsedCourse } = parseAll();
    for (const mod of parsedCourse.modules) {
      for (const lesson of mod.lessons) {
        const hasReducedScaffold = lesson.exercises.some((e) => e.scaffoldLevel >= 4);
        expect(hasReducedScaffold).toBe(true);
      }
    }
  });

  it('every lesson has at least two reflection prompts', () => {
    const { parsedCourse } = parseAll();
    for (const mod of parsedCourse.modules) {
      for (const lesson of mod.lessons) {
        expect(lesson.reflectionPrompts.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('has a real, non-placeholder concept graph with every module represented', () => {
    const { parsedCourse } = parseAll();
    // Bewusst eine Untergrenze statt einer festen Zahl: Der Kurs wächst je
    // Ausbaustufe, und ein Test, der bei jedem neuen Modul rot wird, prüft
    // nur noch sich selbst.
    expect(parsedCourse.modules.length).toBeGreaterThanOrEqual(4);
    const totalLessons = parsedCourse.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    expect(totalLessons).toBeGreaterThanOrEqual(10);
    // Jedes Modul trägt mindestens eine Lektion.
    for (const modul of parsedCourse.modules) {
      expect(modul.lessons.length).toBeGreaterThan(0);
    }
  });

  it('placement-relevant concept slugs referenced in content actually exist', () => {
    const { parsedConcepts } = parseAll();
    const slugs = new Set(parsedConcepts.map((c) => c.slug));
    // Stichprobe: Konzepte, auf die die Startseite/Nachschlagen-Seite verweisen.
    for (const slug of ['context-window', 'token', 'halluzination', 'prompt-ziel-und-kontext']) {
      expect(slugs.has(slug)).toBe(true);
    }
  });

  it('draft concepts have unique slugs', () => {
    const slugs = (conceptDrafts as ConceptDraft[]).map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

/**
 * Die öffentliche Fassung einer Aufgabe darf die Lösung nicht mitliefern.
 * Für `ordering` ist das nicht selbstverständlich: die angezeigte Reihenfolge
 * entsteht aus den redaktionell vergebenen IDs. Werden die Elemente in
 * Lösungsreihenfolge benannt, käme die Liste bereits richtig sortiert im
 * Browser an (Sicherheitsprüfung zu PR #29). Diese Prüfung läuft über den
 * echten Inhalt, nicht über ein Beispiel.
 */
describe('Keine Aufgabe liefert ihre Lösung im öffentlichen Teil mit', () => {
  const orderingPayloads = courseSchema
    .parse(course)
    .modules.flatMap((m) => m.lessons)
    .flatMap((l) => l.exercises)
    .map((e) => exercisePayloadSchema.parse(e.payload))
    .filter((p) => p.kind === 'ordering');

  it('findet überhaupt ordering-Aufgaben zum Prüfen', () => {
    expect(orderingPayloads.length).toBeGreaterThan(0);
  });

  it.each(orderingPayloads.map((p, i) => [i, p] as const))(
    'ordering-Aufgabe %i wird nicht in Lösungsreihenfolge ausgeliefert',
    (_index, payload) => {
      const publicPayload = toPublicPayload(payload) as { items: { id: string }[] };
      expect(publicPayload.items.map((i) => i.id)).not.toEqual(payload.correctOrder);
    },
  );

  it.each(orderingPayloads.map((p, i) => [i, p] as const))(
    'ordering-Aufgabe %i enthält im öffentlichen Teil keine correctOrder',
    (_index, payload) => {
      expect(JSON.stringify(toPublicPayload(payload))).not.toContain('correctOrder');
    },
  );
});

/**
 * "Was angeboten wird, funktioniert auch."
 *
 * Das Terminal-Lab wies `mkdir`, `touch`, `cp`, `mv`, `which` und `clear` als
 * verfügbar aus, ohne sie umzusetzen — der Befehl verpuffte wirkungslos und
 * die Lernumgebung lehrte still etwas Falsches (Codex-Review auf PR #29).
 * Diese Prüfung hält den Grundsatz für künftige Inhalte fest.
 */
describe('Terminal-Labs bewerben nur umgesetzte Befehle', () => {
  const terminalConfigSchema = z.object({ allowedCommands: z.array(z.string()) });

  const terminalLabs = labDrafts
    .map((l) => labSchema.parse(l))
    .filter((l) => l.kind === 'TERMINAL');

  it('findet überhaupt ein Terminal-Lab zum Prüfen', () => {
    expect(terminalLabs.length).toBeGreaterThan(0);
  });

  it.each(terminalLabs.map((l) => [l.slug, l] as const))(
    '%s: jeder beworbene Befehl ist im Simulator umgesetzt',
    (_slug, lab) => {
      const { allowedCommands } = terminalConfigSchema.parse(lab.config);
      const fehlend = allowedCommands.filter(
        (c) => !(UMGESETZTE_BEFEHLE as readonly string[]).includes(c),
      );
      expect(fehlend).toEqual([]);
    },
  );
});

/**
 * Erweiterte Inhaltsprüfungen der Ausbaustufe 2.
 *
 * Die Befehlsreferenz ist Lernmaterial wie jedes andere: Ein Befehl, der
 * Arbeit vernichten kann, muss auch sagen, welche. Und ein Befehl, der im
 * Lernstoff genannt wird, muss nachschlagbar sein.
 */
describe('Befehlsreferenz', () => {
  const alleBefehle = SETUP_SECTIONS.flatMap((s) => s.commands);

  it('ist in sich stimmig', () => {
    const result = validateCommandReference(alleBefehle);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('erklärt bei jedem destruktiven Befehl, was verloren gehen kann', () => {
    const destruktiv = alleBefehle.filter((b) => b.safety.gefahr === 'destruktiv');
    expect(destruktiv.length).toBeGreaterThan(0);
    for (const befehl of destruktiv) {
      expect(befehl.whatHappens.length).toBeGreaterThanOrEqual(60);
    }
  });

  it('meldet einen destruktiven Befehl ohne Erklärung', () => {
    const result = validateCommandReference([
      {
        command: 'git reset --hard',
        whatHappens: 'Setzt zurück.',
        safety: { gefahr: 'destruktiv', reversibel: false, wirkung: ['verlauf'] },
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.message).toContain('ohne ausreichende Erklärung');
  });

  it('meldet einen widersprüchlichen Wirkbereich', () => {
    const result = validateCommandReference([
      {
        command: 'git status',
        whatHappens: 'Liest nur.',
        safety: { gefahr: 'harmlos', reversibel: true, wirkung: ['nur-lesend', 'verlauf'] },
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.message).toContain('widerspricht sich');
  });

  it('deckt die Git- und GitHub-Befehle des Lernstoffs ab', () => {
    const namen = new Set(alleBefehle.map((b) => b.command.split(/\s+/).slice(0, 2).join(' ')));
    for (const erwartet of [
      'git init',
      'git status',
      'git add',
      'git commit',
      'git diff',
      'git log',
      'git branch',
      'git switch',
      'git merge',
      'git remote',
      'git fetch',
      'git pull',
      'git push',
      'git restore',
      'git revert',
      'git reset',
      'git reflog',
      'gh auth',
      'gh pr',
      'gh issue',
      'gh run',
    ]) {
      expect(namen).toContain(erwartet);
    }
  });
});

describe('Lernstoff nennt nur nachschlagbare Befehle', () => {
  it('meldet keinen Git-Befehl ohne Referenzeintrag', () => {
    const result = validateCourseGraph({
      course: courseSchema.parse(course),
      concepts: conceptDrafts.map((c) => conceptSchema.parse(c)),
      labs: labDrafts.map((l) => labSchema.parse(l)),
      referenzBefehle: SETUP_SECTIONS.flatMap((s) => s.commands).map((b) => b.command),
    });
    const fehlend = result.issues.filter((i) => i.message.includes('Befehlsreferenz'));
    expect(fehlend).toEqual([]);
  });

  it('erkennt einen im Text genannten, nicht nachschlagbaren Befehl', () => {
    const parsed = courseSchema.parse(course);
    const ersteLektion = parsed.modules[0]?.lessons[0];
    expect(ersteLektion).toBeDefined();
    const manipuliert = {
      ...parsed,
      modules: [
        {
          ...parsed.modules[0]!,
          lessons: [
            { ...ersteLektion!, mentalModel: `${ersteLektion!.mentalModel} Nutze git flurfunk.` },
            ...parsed.modules[0]!.lessons.slice(1),
          ],
        },
        ...parsed.modules.slice(1),
      ],
    };
    const result = validateCourseGraph({
      course: manipuliert,
      concepts: conceptDrafts.map((c) => conceptSchema.parse(c)),
      labs: labDrafts.map((l) => labSchema.parse(l)),
      referenzBefehle: SETUP_SECTIONS.flatMap((s) => s.commands).map((b) => b.command),
    });
    expect(result.issues.some((i) => i.message.includes('git flurfunk'))).toBe(true);
  });
});

describe('Labs sind im Wissensgraphen verankert', () => {
  it('verknüpft jedes Lab mit mindestens einem Konzept', () => {
    for (const lab of labDrafts.map((l) => labSchema.parse(l))) {
      expect(lab.relatedConceptSlugs.length).toBeGreaterThan(0);
    }
  });
});

/**
 * Keine Aufgabe im gesamten Kurs liefert Lösungsdaten an den Browser.
 *
 * Bewusst über den ECHTEN Inhalt statt über Beispiele, und bewusst über alle
 * Interaktionsformen statt je eine Stichprobe: `PublicExercise.payload` ist
 * `unknown` und wird im Browser wieder gecastet — der Übersetzer prüft auf
 * diesem Weg nichts. Diese Prüfung ist die einzige Stelle, an der ein
 * vergessenes Feld auffällt, bevor es ausgeliefert wird.
 */
describe('Keine Lösungsdaten in der öffentlichen Fassung — gesamter Kurs', () => {
  const alleAufgaben = courseSchema
    .parse(course)
    .modules.flatMap((m) => m.lessons)
    .flatMap((l) => l.exercises);

  /** Feldnamen, die ausschließlich der Bewertung dienen. */
  const VERRAETERISCHE_FELDER = [
    'correctOptionId',
    'correctOptionIds',
    'correctOrder',
    'correctCategoryId',
    'korrekt',
    'accepted',
    'wrongHint',
    'quality',
    'expectedCommands',
    'feedback',
    'solutionNotes',
  ];

  it('prüft eine aussagekräftige Zahl an Aufgaben', () => {
    expect(alleAufgaben.length).toBeGreaterThanOrEqual(40);
  });

  it.each(alleAufgaben.map((a) => [a.slug, a] as const))(
    '%s: öffentliche Fassung enthält kein Bewertungsfeld',
    (_slug, aufgabe) => {
      const oeffentlich = JSON.stringify(toPublicPayload(aufgabe.payload));
      for (const feld of VERRAETERISCHE_FELDER) {
        expect(oeffentlich).not.toContain(feld);
      }
    },
  );

  it('deckt jede eingesetzte Interaktionsform ab', () => {
    const formen = new Set(alleAufgaben.map((a) => a.payload.kind));
    // Die drei neuen Formen dieser Ausbaustufe sind tatsächlich im Einsatz.
    expect(formen).toContain('interpretation');
    expect(formen).toContain('classification');
    expect(formen).toContain('conflictResolution');
    // Und jede Form kommt durch toPublicPayload, ohne zu werfen.
    for (const aufgabe of alleAufgaben) {
      expect(toPublicPayload(aufgabe.payload)).toBeDefined();
    }
  });
});
