import { describe, expect, it } from 'vitest';
import {
  conceptSchema,
  courseSchema,
  labSchema,
  validateCourseGraph,
  type ExerciseContent,
  type LabContent,
} from '@/domain/content/schema';
import type { ExercisePayload, Submission } from '@/domain/content/exercise-payload';
import { gradeSubmission } from '@/domain/grading/grade';
import { course } from '@/content/course';
import { concepts as conceptDrafts } from '@/content/concepts';
import { labs as labDrafts } from '@/content/labs';
import { embeddingsRetrievalModule } from '@/content/modules/embeddings-retrieval';
import {
  semanticRetrievalConfigSchema,
  type SemanticRetrievalConfig,
} from '@/domain/labs/semantic-retrieval-config';
import { anSchwelleTeilen, gemeinsameWoerter, rangliste } from '@/domain/retrieval/ranking';

/**
 * Inhalt und Lab-Konfiguration von Stufe 9 (LP-10A).
 */

const NEUE_KONZEPTE = [
  'vektor-und-dimension',
  'text-embedding',
  'skalarprodukt-und-vektorlaenge',
  'kosinus-aehnlichkeit',
  'semantische-suche',
  'top-k-retrieval',
  'relevanz-vs-aehnlichkeit',
  'precision-und-recall',
  'chunking',
];

const parsedCourse = courseSchema.parse(course);
const parsedConcepts = conceptDrafts.map((c) => conceptSchema.parse(c));
const parsedLabs = labDrafts.map((l) => labSchema.parse(l));
const modul = parsedCourse.modules.find((m) => m.slug === embeddingsRetrievalModule.slug);

function echteLabConfig(): SemanticRetrievalConfig {
  const lab = parsedLabs.find((l) => l.slug === 'semantische-suche-lab');
  if (!lab) throw new Error('Lab fehlt');
  return semanticRetrievalConfigSchema.parse(lab.config);
}

/** Eine tiefe Kopie zum gezielten Beschädigen in Negativtests. */
function kopie(): SemanticRetrievalConfig {
  return structuredClone(echteLabConfig());
}

function fehlerpfade(config: unknown): string[] {
  const ergebnis = semanticRetrievalConfigSchema.safeParse(config);
  if (ergebnis.success) return [];
  return ergebnis.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('Modul „Embeddings & semantische Suche“', () => {
  it('ist im Kurs veröffentlicht, nach den LLM-Grundlagen und am Ende angehängt', () => {
    expect(modul).toBeDefined();
    expect(modul?.status).toBe('PUBLISHED');
    expect(modul?.prerequisiteModuleSlugs).toEqual(['llm-grundlagen']);
    // Angehängt, nicht eingeschoben: Die Reihenfolge bestehender Module und
    // damit der bestehende Lernpfad bleibt unverändert.
    expect(parsedCourse.modules.at(-1)?.slug).toBe('embeddings-semantische-suche');
    expect(parsedCourse.modules.slice(0, 6).map((m) => m.slug)).toEqual([
      'orientierung',
      'technischer-arbeitsplatz',
      'llm-grundlagen',
      'prompting-grundlagen',
      'git-grundlagen',
      'git-zusammenarbeit',
    ]);
  });

  it('hat die vier geforderten Lektionen in dieser Reihenfolge', () => {
    expect(modul?.lessons.map((l) => l.title)).toEqual([
      'Vektoren und Embeddings',
      'Ähnlichkeit berechnen',
      'Semantisches Retrieval',
      'Retrieval richtig beurteilen',
    ]);
  });

  it.each(embeddingsRetrievalModule.lessons.map((l) => [l.slug] as const))(
    '%s: vollständige Lektion mit gestuften Hilfen',
    (slug) => {
      const lektion = modul?.lessons.find((l) => l.slug === slug);
      expect(lektion).toBeDefined();
      if (!lektion) return;
      expect(lektion.learningObjectives.length).toBeGreaterThanOrEqual(2);
      expect(lektion.workedExample.annotations.length).toBeGreaterThanOrEqual(3);
      expect(lektion.commonMistakes.length).toBeGreaterThanOrEqual(2);
      expect(lektion.reflectionPrompts.length).toBeGreaterThanOrEqual(2);
      expect(lektion.exercises.length).toBeGreaterThanOrEqual(1);
      // Mindestens eine Aufgabe mit reduzierten Hilfen.
      expect(Math.max(...lektion.exercises.map((e) => e.scaffoldLevel))).toBeGreaterThanOrEqual(4);
      for (const aufgabe of lektion.exercises) {
        // Progressiv: mindestens drei Stufen, lückenlos ab 1.
        expect(aufgabe.hints.length).toBeGreaterThanOrEqual(3);
        expect(aufgabe.hints.map((h) => h.level)).toEqual(
          aufgabe.hints.map((_, index) => index + 1),
        );
      }
    },
  );

  it('führt jedes neue Konzept genau einmal als Hauptkonzept ein', () => {
    const eingefuehrt = modul?.lessons.flatMap((l) => l.primaryConceptSlugs) ?? [];
    expect([...eingefuehrt].sort()).toEqual([...NEUE_KONZEPTE].sort());
  });

  it('wiederholt Stufe 4 nicht: „embedding“ ist Voraussetzung, kein neues Hauptkonzept', () => {
    const lektion1 = modul?.lessons[0];
    expect(lektion1?.prerequisiteConceptSlugs).toContain('embedding');
    expect(lektion1?.primaryConceptSlugs).not.toContain('embedding');
  });

  it('nennt keine Anbieter, Modellnamen oder Preise als Lerninhalt', () => {
    const text = JSON.stringify(embeddingsRetrievalModule);
    for (const muster of [
      /openai/i,
      /anthropic/i,
      /\bgemini\b/i,
      /\bcohere\b/i,
      /mistral/i,
      /\bgpt[-\s]?\d/i,
      /text-embedding-/i,
      /€|\$|\bEUR\b|\bUSD\b/,
      /api[-\s]?key/i,
    ]) {
      expect(text).not.toMatch(muster);
    }
  });
});

describe('Konzeptgraph von Stufe 9', () => {
  const nachSlug = new Map(parsedConcepts.map((c) => [c.slug, c]));

  it('enthält die neuen Konzepte ohne doppelte Slugs', () => {
    for (const slug of NEUE_KONZEPTE) expect(nachSlug.has(slug)).toBe(true);
    const slugs = parsedConcepts.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('hängt über Voraussetzungen am bestehenden Konzept „embedding“', () => {
    const erreichbar = (slug: string, ziel: string, besucht = new Set<string>()): boolean => {
      if (slug === ziel) return true;
      if (besucht.has(slug)) return false;
      besucht.add(slug);
      return (nachSlug.get(slug)?.prerequisiteSlugs ?? []).some((pre) =>
        erreichbar(pre, ziel, besucht),
      );
    };
    for (const slug of NEUE_KONZEPTE) expect(erreichbar(slug, 'embedding')).toBe(true);
  });

  it('besteht die Gesamtprüfung ohne Fehler und ohne Warnungen', () => {
    const ergebnis = validateCourseGraph({
      course: parsedCourse,
      concepts: parsedConcepts,
      labs: parsedLabs,
    });
    expect(ergebnis.issues).toEqual([]);
  });

  it('meldet einen Zyklus, wenn eines der neuen Konzepte sich selbst voraussetzt', () => {
    const verbogen = parsedConcepts.map((c) =>
      c.slug === 'vektor-und-dimension'
        ? { ...c, prerequisiteSlugs: [...c.prerequisiteSlugs, 'precision-und-recall'] }
        : c,
    );
    const ergebnis = validateCourseGraph({
      course: parsedCourse,
      concepts: verbogen,
      labs: parsedLabs,
    });
    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.issues.some((i) => i.message.startsWith('Zyklische Voraussetzung'))).toBe(true);
  });
});

/** Baut aus der hinterlegten Lösung eine Abgabe — nur für den Test. */
function musterAbgabe(payload: ExercisePayload): Submission {
  switch (payload.kind) {
    case 'singleChoice':
      return { kind: 'singleChoice', optionId: payload.correctOptionId };
    case 'multipleChoice':
      return { kind: 'multipleChoice', optionIds: payload.correctOptionIds };
    case 'ordering':
      return { kind: 'ordering', orderedItemIds: payload.correctOrder };
    case 'fillIn':
      return {
        kind: 'fillIn',
        values: Object.fromEntries(payload.blanks.map((b) => [b.id, b.accepted[0] ?? ''])),
      };
    case 'scenarioDecision': {
      const optimal = payload.options.find((o) => o.quality === 'optimal');
      return { kind: 'scenarioDecision', optionId: optimal?.id ?? '' };
    }
    case 'classification':
      return {
        kind: 'classification',
        zuordnung: Object.fromEntries(payload.items.map((i) => [i.id, i.correctCategoryId])),
      };
    default:
      throw new Error(`Interaktionsform ${payload.kind} kommt in diesem Modul nicht vor.`);
  }
}

describe('Aufgaben von Stufe 9 sind lösbar und bewertbar', () => {
  const aufgaben: ExerciseContent[] = modul?.lessons.flatMap((l) => l.exercises) ?? [];

  it('hat mindestens drei Aufgaben je Lektion', () => {
    for (const lektion of modul?.lessons ?? []) {
      expect(lektion.exercises.length).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(aufgaben.map((a) => [a.slug, a] as const))(
    '%s: Musterlösung besteht, falsche Antwort nicht',
    (_slug, aufgabe) => {
      const richtig = gradeSubmission({
        payload: aufgabe.payload,
        submission: musterAbgabe(aufgabe.payload),
      });
      expect(richtig.outcome).toBe('PASSED');

      const p = aufgabe.payload;
      let falsch: Submission;
      if (p.kind === 'singleChoice') {
        const andere = p.options.find((o) => o.id !== p.correctOptionId);
        falsch = { kind: 'singleChoice', optionId: andere?.id ?? '' };
      } else if (p.kind === 'scenarioDecision') {
        const andere = p.options.find((o) => o.quality === 'problematic');
        falsch = { kind: 'scenarioDecision', optionId: andere?.id ?? '' };
      } else if (p.kind === 'multipleChoice') {
        falsch = { kind: 'multipleChoice', optionIds: [] };
      } else if (p.kind === 'ordering') {
        falsch = { kind: 'ordering', orderedItemIds: [...p.correctOrder].reverse() };
      } else if (p.kind === 'fillIn') {
        falsch = {
          kind: 'fillIn',
          values: Object.fromEntries(p.blanks.map((b) => [b.id, 'falsch'])),
        };
      } else if (p.kind === 'classification') {
        const erste = p.categories[0]?.id ?? '';
        falsch = {
          kind: 'classification',
          zuordnung: Object.fromEntries(p.items.map((i) => [i.id, erste])),
        };
      } else {
        throw new Error('unerwartete Form');
      }
      expect(gradeSubmission({ payload: p, submission: falsch }).outcome).not.toBe('PASSED');
    },
  );

  it('akzeptiert Dezimalkomma und Dezimalpunkt gleichermaßen', () => {
    const aufgabe = aufgaben.find((a) => a.slug === 'emb-kosinus-fill-in');
    if (aufgabe?.payload.kind !== 'fillIn') throw new Error('Aufgabe fehlt');
    for (const kosinus of ['8/9', '0,89', '0.89', ' 0,889 ']) {
      const ergebnis = gradeSubmission({
        payload: aufgabe.payload,
        submission: { kind: 'fillIn', values: { skalar: '8', laenge: '3', kosinus } },
      });
      expect(ergebnis.outcome, kosinus).toBe('PASSED');
    }
    // Ohne Wurzel (9 statt 3) ist es falsch.
    const ohneWurzel = gradeSubmission({
      payload: aufgabe.payload,
      submission: { kind: 'fillIn', values: { skalar: '8', laenge: '9', kosinus: '8/9' } },
    });
    expect(ohneWurzel.outcome).not.toBe('PASSED');
  });
});

describe('Lab „Semantische Suche verstehen“', () => {
  it('ist als eigene Lab-Art mit Konzepten registriert', () => {
    const lab = parsedLabs.find((l) => l.slug === 'semantische-suche-lab');
    expect(lab?.kind).toBe('SEMANTIC_RETRIEVAL');
    expect(lab?.relatedConceptSlugs.length).toBeGreaterThan(0);
    expect(lab?.instructions).toMatch(/nicht von einem Embedding-Modell berechnet/);
  });

  it('kennzeichnet die Vektoren ausdrücklich als didaktisch', () => {
    expect(echteLabConfig().vektorHerkunft).toBe('didaktisch');
  });

  it('bietet Top-k von 1 bis 5 und mindestens vier Anfragen', () => {
    const config = echteLabConfig();
    expect(config.topK).toEqual({ min: 1, max: 5, start: 3 });
    expect(config.anfragen.length).toBeGreaterThanOrEqual(4);
  });

  it('demonstriert den irreführenden Treffer: Platz 1 ist nicht relevant', () => {
    const config = echteLabConfig();
    const anfrage = config.anfragen.find((a) => a.id === 'urlaub');
    if (!anfrage?.irrefuehrend) throw new Error('Urlaubsanfrage fehlt');
    const liste = rangliste(anfrage.vektor, config.dokumente).eintraege;
    expect(liste[0]?.id).toBe(anfrage.irrefuehrend.dokumentId);
    expect(anfrage.relevanteDokumentIds).not.toContain(liste[0]?.id);
    expect(liste[1]?.id).toBe('urlaubsantrag');
    // Die Werte, die Lektion 3 und 4 zitieren.
    expect(liste.slice(0, 4).map((e) => Number(e.score.toFixed(3)))).toEqual([
      0.977, 0.932, 0.848, 0.6,
    ]);
  });

  it('zeigt den fehlenden Treffer: Kein Dokument erreicht für die Kantinenfrage die Schwelle', () => {
    const config = echteLabConfig();
    const anfrage = config.anfragen.find((a) => a.id === 'kantine');
    if (!anfrage) throw new Error('Kantinenanfrage fehlt');
    const liste = rangliste(anfrage.vektor, config.dokumente).eintraege;
    expect(liste.length).toBeGreaterThan(0);
    expect(anSchwelleTeilen(liste, config.schwelle).ueber).toEqual([]);
  });

  it('zeigt den Vorteil semantischer Suche: kein gemeinsames Wort, trotzdem Platz 1', () => {
    const config = echteLabConfig();
    const anfrage = config.anfragen.find((a) => a.id === 'konto');
    const passwort = config.dokumente.find((d) => d.id === 'passwort');
    if (!anfrage || !passwort) throw new Error('Daten fehlen');
    expect(gemeinsameWoerter(anfrage.text, passwort.text)).toEqual([]);
    expect(rangliste(anfrage.vektor, config.dokumente).eintraege[0]?.id).toBe('passwort');
  });

  it('nennt im Lerninhalt dieselben Werte, die das Lab berechnet', () => {
    const config = echteLabConfig();
    const belege = config.anfragen.find((a) => a.id === 'belege');
    if (!belege) throw new Error('Belegeanfrage fehlt');
    const liste = rangliste(belege.vektor, config.dokumente).eintraege;
    const wert = (id: string): string =>
      (liste.find((e) => e.id === id)?.score ?? Number.NaN).toFixed(3).replace('.', ',');
    const beispiel = JSON.stringify(modul?.lessons[2]?.workedExample);
    expect(beispiel).toContain(`Reisekosten abrechnen ${wert('reisekosten')}`);
    expect(beispiel).toContain(`Rückblick Teamausflug ${wert('teamausflug')}`);
    expect(beispiel).toContain(`Urlaub beantragen ${wert('urlaubsantrag')}`);
  });
});

describe('Ungültige Lab-Konfigurationen werden abgelehnt', () => {
  it('nimmt die echte Konfiguration an', () => {
    expect(fehlerpfade(echteLabConfig())).toEqual([]);
  });

  it('verlangt die Herkunftsangabe der Vektoren', () => {
    const { vektorHerkunft: _weg, ...ohne } = kopie();
    expect(fehlerpfade(ohne).some((f) => f.startsWith('vektorHerkunft'))).toBe(true);
    expect(fehlerpfade({ ...kopie(), vektorHerkunft: 'modell' }).length).toBeGreaterThan(0);
  });

  it('lehnt einen Dokumentvektor mit falscher Dimension ab', () => {
    const config = kopie();
    config.dokumente[0]?.vektor.push(0.5);
    expect(fehlerpfade(config)).toContainEqual(expect.stringMatching(/^dokumente\.0\.vektor: /));
  });

  it('lehnt einen Anfragevektor mit falscher Dimension ab', () => {
    const config = kopie();
    config.anfragen[1]?.vektor.pop();
    expect(fehlerpfade(config)).toContainEqual(expect.stringMatching(/^anfragen\.1\.vektor: /));
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
  ])('lehnt %s in einem Vektor ab', (_name, wert) => {
    const config = kopie();
    if (config.dokumente[2]) config.dokumente[2].vektor[1] = wert;
    expect(fehlerpfade(config)).toContainEqual(expect.stringMatching(/^dokumente\.2\.vektor\.1: /));
  });

  it('lehnt Nullvektoren für Dokumente und Anfragen ab', () => {
    const config = kopie();
    if (config.dokumente[0]) config.dokumente[0].vektor = [0, 0, 0, 0, 0];
    if (config.anfragen[0]) config.anfragen[0].vektor = [0, 0, 0, 0, 0];
    const fehler = fehlerpfade(config);
    expect(fehler).toContainEqual(expect.stringMatching(/^dokumente\.0\.vektor: .*Nullvektor/));
    expect(fehler).toContainEqual(expect.stringMatching(/^anfragen\.0\.vektor: .*Nullvektor/));
  });

  it('meldet einen endlichen, aber nicht darstellbaren Rechenweg als Befund statt abzustürzen', () => {
    // Alle Komponenten sind endlich, beide Normen auch, der Kosinus ist 1 —
    // aber 1e200 · 1e200 läuft im erklärenden Komponentenprodukt über.
    // Review 5812621557 (P2): safeParse warf hier, statt ein Ergebnis zu liefern.
    const config = kopie();
    const anfrage = config.anfragen[0];
    const dokument = config.dokumente[0];
    if (!anfrage || !dokument) throw new Error('Daten fehlen');
    anfrage.vektor = [1e200, 0, 0, 0, 0];
    dokument.vektor = [1e200, 0, 0, 0, 0];

    expect(() => semanticRetrievalConfigSchema.safeParse(config)).not.toThrow();
    expect(fehlerpfade(config)).toContainEqual(
      expect.stringMatching(
        /^anfragen\.0: Für Anfrage "urlaub" lässt sich die Rangliste nicht berechnen: .*zu groß/,
      ),
    );

    // Auch die Gesamtprüfung meldet den Befund, statt abzubrechen.
    const labs: LabContent[] = parsedLabs.map((l) =>
      l.slug === 'semantische-suche-lab' ? { ...l, config } : l,
    );
    const ergebnis = validateCourseGraph({
      course: parsedCourse,
      concepts: parsedConcepts,
      labs,
    });
    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        where: 'lab:semantische-suche-lab.config.anfragen.0',
      }),
    );
  });

  it('lehnt doppelte Dokumentkennungen ab, ohne beim Rechnen abzustürzen', () => {
    const config = kopie();
    if (config.dokumente[1] && config.dokumente[0]) config.dokumente[1].id = config.dokumente[0].id;
    expect(fehlerpfade(config)).toContainEqual(expect.stringMatching(/doppelt vergeben/));
  });

  it('lehnt unbekannte Dokumente in relevanteDokumentIds ab', () => {
    const config = kopie();
    config.anfragen[0]?.relevanteDokumentIds.push('gibt-es-nicht');
    expect(fehlerpfade(config)).toContainEqual(expect.stringMatching(/Unbekanntes Dokument/));
  });

  it('lehnt einen irreführenden Treffer ab, der zugleich relevant ist', () => {
    const config = kopie();
    config.anfragen[0]?.relevanteDokumentIds.push('teamausflug');
    expect(fehlerpfade(config)).toContainEqual(
      expect.stringMatching(/zugleich relevant und irreführend/),
    );
  });

  it('lehnt einen irreführenden Treffer ab, der gar nicht vor dem relevanten liegt', () => {
    const config = kopie();
    const anfrage = config.anfragen[0];
    if (anfrage?.irrefuehrend) anfrage.irrefuehrend.dokumentId = 'passwort';
    expect(fehlerpfade(config)).toContainEqual(
      expect.stringMatching(/hinter dem besten relevanten Dokument/),
    );
  });

  it('lehnt eine Anfrage „ohne Treffer“ ab, für die doch etwas über der Schwelle liegt', () => {
    const config = kopie();
    config.schwelle = 0.1;
    expect(fehlerpfade(config)).toContainEqual(
      expect.stringMatching(/keine relevanten Dokumente, aber Treffer über der Schwelle/),
    );
  });

  it('lehnt eine Entscheidung mit zwei richtigen Optionen ab', () => {
    const config = kopie();
    for (const option of config.entscheidungen[0]?.optionen ?? []) option.korrekt = true;
    expect(fehlerpfade(config)).toContainEqual(expect.stringMatching(/Genau eine Option/));
  });

  it('lehnt eine Entscheidung zu einer unbekannten Anfrage ab', () => {
    const config = kopie();
    if (config.entscheidungen[0]) config.entscheidungen[0].anfrageId = 'unbekannt';
    expect(fehlerpfade(config)).toContainEqual(expect.stringMatching(/Unbekannte Anfrage/));
  });

  it('lehnt einen Startwert für k oberhalb des Maximums ab', () => {
    const config = kopie();
    config.topK.start = 9;
    expect(fehlerpfade(config)).toContainEqual(expect.stringMatching(/^topK\.start: /));
  });

  it('lehnt eine Schwelle außerhalb von −1 bis 1 ab', () => {
    expect(fehlerpfade({ ...kopie(), schwelle: 1.2 }).length).toBeGreaterThan(0);
  });

  it('wird von validateCourseGraph mitgeprüft, nicht nur von der Maske', () => {
    const kaputt = kopie();
    kaputt.dokumente[0]?.vektor.push(1);
    const labs: LabContent[] = parsedLabs.map((l) =>
      l.slug === 'semantische-suche-lab' ? { ...l, config: kaputt } : l,
    );
    const ergebnis = validateCourseGraph({
      course: parsedCourse,
      concepts: parsedConcepts,
      labs,
    });
    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        where: 'lab:semantische-suche-lab.config.dokumente.0.vektor',
      }),
    );
  });

  it('nimmt eine unbekannte Lab-Art nicht an', () => {
    const lab = labDrafts.find((l) => l.slug === 'semantische-suche-lab');
    expect(labSchema.safeParse({ ...lab, kind: 'VECTOR_DATABASE' }).success).toBe(false);
  });
});
