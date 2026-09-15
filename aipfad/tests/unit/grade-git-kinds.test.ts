import { describe, expect, it } from 'vitest';
import { gradeSubmission, toPublicPayload } from '@/domain/grading/grade';
import { exercisePayloadSchema, type ExercisePayload } from '@/domain/content/exercise-payload';

/**
 * Die drei neuen Interaktionsformen dieser Ausbaustufe.
 *
 * Neben der Bewertung wird vor allem eines geprüft: dass die öffentliche
 * Fassung KEINE Lösungsdaten enthält. Für `payload` gibt es keine
 * Typsicherheit Richtung Browser (`unknown`), deshalb muss der Test das
 * übernehmen — genauso wie für die Formen der ersten Ausbaustufe.
 */

const interpretation: ExercisePayload = exercisePayloadSchema.parse({
  kind: 'interpretation',
  ansicht: {
    art: 'gitStatus',
    eintraege: [
      { pfad: 'a.txt', status: 'staged', auchUngestagt: true },
      { pfad: 'b.txt', status: 'untracked' },
    ],
  },
  frage: 'Was passiert, wenn du jetzt committest?',
  options: [
    {
      id: 'a',
      text: 'Nur der vorgemerkte Stand von a.txt.',
      feedback: 'Richtig — die spätere Änderung an a.txt ist nicht vorgemerkt.',
    },
    { id: 'b', text: 'Beide Dateien vollständig.', feedback: 'b.txt ist gar nicht vorgemerkt.' },
  ],
  correctOptionId: 'a',
});

const classification: ExercisePayload = exercisePayloadSchema.parse({
  kind: 'classification',
  instruction: 'Ordne jeden Befehl seiner Gefährdung zu.',
  categories: [
    { id: 'harmlos', label: 'Harmlos' },
    { id: 'destruktiv', label: 'Kann Arbeit vernichten' },
  ],
  items: [
    {
      id: 'status',
      text: 'git status',
      correctCategoryId: 'harmlos',
      feedback: 'git status liest nur.',
    },
    {
      id: 'reset',
      text: 'git reset --hard',
      correctCategoryId: 'destruktiv',
      feedback: 'Nicht committete Arbeit ist danach weg.',
    },
    {
      id: 'log',
      text: 'git log',
      correctCategoryId: 'harmlos',
      feedback: 'git log liest nur.',
    },
    {
      id: 'push-force',
      text: 'git push --force',
      correctCategoryId: 'destruktiv',
      feedback: 'Überschreibt den Stand, den andere schon haben.',
    },
  ],
});

const conflict: ExercisePayload = exercisePayloadSchema.parse({
  kind: 'conflictResolution',
  pfad: 'preise.md',
  unserLabel: 'HEAD',
  ihrLabel: 'feature/preise',
  abschnitte: [
    { art: 'gemeinsam', zeilen: ['# Preise'] },
    {
      art: 'konflikt',
      id: 'k1',
      unsere: ['Basis: 9 Euro'],
      ihre: ['Basis: 12 Euro'],
      korrekt: 'ihre',
      feedback: 'Der neue Preis wurde im Team beschlossen.',
    },
    {
      art: 'konflikt',
      id: 'k2',
      unsere: ['支持: E-Mail'],
      ihre: ['Support: Telefon'],
      korrekt: 'beide',
      feedback: 'Beide Kanäle sollen angeboten werden.',
    },
  ],
});

describe('interpretation', () => {
  it('bewertet die richtige Auswahl als bestanden', () => {
    const ergebnis = gradeSubmission({
      payload: interpretation,
      submission: { kind: 'interpretation', optionId: 'a' },
    });
    expect(ergebnis.outcome).toBe('PASSED');
    expect(ergebnis.feedback[0]?.tone).toBe('success');
  });

  it('gibt bei falscher Auswahl die Rückmeldung zu genau dieser Option', () => {
    const ergebnis = gradeSubmission({
      payload: interpretation,
      submission: { kind: 'interpretation', optionId: 'b' },
    });
    expect(ergebnis.outcome).toBe('FAILED');
    expect(ergebnis.feedback[0]?.message).toContain('nicht vorgemerkt');
  });

  it('liefert die Ansicht mit, aber nicht die richtige Antwort', () => {
    const oeffentlich = JSON.stringify(toPublicPayload(interpretation));
    expect(oeffentlich).toContain('gitStatus');
    expect(oeffentlich).not.toContain('correctOptionId');
    expect(oeffentlich).not.toContain('die spätere Änderung');
  });
});

describe('classification', () => {
  it('bewertet alle richtigen Zuordnungen als bestanden', () => {
    const ergebnis = gradeSubmission({
      payload: classification,
      submission: {
        kind: 'classification',
        zuordnung: {
          status: 'harmlos',
          reset: 'destruktiv',
          log: 'harmlos',
          'push-force': 'destruktiv',
        },
      },
    });
    expect(ergebnis.outcome).toBe('PASSED');
    expect(ergebnis.score).toBe(1);
  });

  it('bewertet die Hälfte richtig als teilweise richtig', () => {
    const ergebnis = gradeSubmission({
      payload: classification,
      submission: {
        kind: 'classification',
        zuordnung: {
          status: 'harmlos',
          reset: 'harmlos',
          log: 'harmlos',
          'push-force': 'harmlos',
        },
      },
    });
    expect(ergebnis.outcome).toBe('PARTIAL');
    expect(ergebnis.feedback.some((f) => f.message.includes('git reset --hard'))).toBe(true);
  });

  it('bewertet überwiegend falsche Zuordnungen als nicht bestanden', () => {
    const ergebnis = gradeSubmission({
      payload: classification,
      submission: {
        kind: 'classification',
        zuordnung: {
          status: 'destruktiv',
          reset: 'harmlos',
          log: 'destruktiv',
          'push-force': 'harmlos',
        },
      },
    });
    expect(ergebnis.outcome).toBe('FAILED');
  });

  it('liefert die Kategorien mit, aber nicht die richtige Zuordnung', () => {
    const oeffentlich = JSON.stringify(toPublicPayload(classification));
    expect(oeffentlich).toContain('Kann Arbeit vernichten');
    expect(oeffentlich).not.toContain('correctCategoryId');
    expect(oeffentlich).not.toContain('liest nur');
  });
});

describe('conflictResolution', () => {
  it('bewertet beide richtigen Entscheidungen als bestanden', () => {
    const ergebnis = gradeSubmission({
      payload: conflict,
      submission: {
        kind: 'conflictResolution',
        entscheidungen: { k1: 'ihre', k2: 'beide' },
      },
    });
    expect(ergebnis.outcome).toBe('PASSED');
  });

  it('nennt bei einer falschen Entscheidung die fachliche Begründung', () => {
    const ergebnis = gradeSubmission({
      payload: conflict,
      submission: {
        kind: 'conflictResolution',
        entscheidungen: { k1: 'unsere', k2: 'beide' },
      },
    });
    expect(ergebnis.outcome).toBe('PARTIAL');
    expect(ergebnis.feedback.some((f) => f.message.includes('im Team beschlossen'))).toBe(true);
  });

  it('liefert beide Fassungen mit, aber nicht die richtige Auflösung', () => {
    const oeffentlich = JSON.stringify(toPublicPayload(conflict));
    expect(oeffentlich).toContain('Basis: 9 Euro');
    expect(oeffentlich).toContain('Basis: 12 Euro');
    expect(oeffentlich).not.toContain('korrekt');
    expect(oeffentlich).not.toContain('im Team beschlossen');
  });
});

describe('Öffentliche Fassung ist vollständig', () => {
  it('behandelt jede Interaktionsform ausdrücklich', () => {
    // Der Rückgabetyp ist `unknown`; eine vergessene Form würde sonst
    // stillschweigend `undefined` liefern und im Browser eine leere Aufgabe
    // erzeugen. Deshalb wirft die Funktion dann lieber.
    for (const payload of [interpretation, classification, conflict]) {
      expect(toPublicPayload(payload)).toBeDefined();
    }
  });
});
