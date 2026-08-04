import { describe, expect, it } from 'vitest';
import {
  MIN_COHORT_SIZE_FOR_AGGREGATES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  can,
  mayShowAggregates,
  mayViewNamedProgress,
  type OrgRoleName,
} from '@/domain/organisation/permissions';
import { buildCohortInsights, type LearnerSnapshot } from '@/domain/organisation/cohort-insights';

const NAMEN = new Map([
  ['variablen', 'Variablen'],
  ['schleifen', 'Schleifen'],
  ['bedingungen', 'Bedingungen'],
]);

function lernende(id: string, overrides: Partial<LearnerSnapshot> = {}): LearnerSnapshot {
  return {
    userId: id,
    lessonsCompleted: 0,
    exercisesPassed: 0,
    masteryByConcept: {},
    lastActiveAt: null,
    ...overrides,
  };
}

describe('Berechtigungen', () => {
  it('gibt der Inhaberin alles, was es gibt', () => {
    expect(can('OWNER', 'organisation.verwalten')).toBe(true);
    expect(can('OWNER', 'protokoll.lesen')).toBe(true);
    expect(can('OWNER', 'kohorte.einzeln-lesen')).toBe(true);
  });

  it('lässt die Lehrkraft die Organisation nicht verwalten', () => {
    // Sonst könnte eine Lehrkraft sich selbst oder andere zur Inhaberin machen.
    expect(can('TEACHER', 'organisation.verwalten')).toBe(false);
    expect(can('TEACHER', 'protokoll.lesen')).toBe(false);
    // Ihre eigentliche Arbeit kann sie aber tun.
    expect(can('TEACHER', 'kohorte.verwalten')).toBe(true);
    expect(can('TEACHER', 'einladung.verwalten')).toBe(true);
    expect(can('TEACHER', 'kohorte.summen-lesen')).toBe(true);
  });

  it('gibt Mitgliedern keinerlei Einblick in andere', () => {
    const alles = [
      'organisation.verwalten',
      'kohorte.verwalten',
      'einladung.verwalten',
      'kohorte.summen-lesen',
      'kohorte.einzeln-lesen',
      'protokoll.lesen',
    ] as const;
    for (const faehigkeit of alles) {
      expect(can('MEMBER', faehigkeit), faehigkeit).toBe(false);
    }
  });

  it('verlangt für die namentliche Ansicht beides: Berechtigung und Einwilligung', () => {
    expect(mayViewNamedProgress('TEACHER', true)).toBe(true);
    // Berechtigung ohne Einwilligung reicht nicht …
    expect(mayViewNamedProgress('TEACHER', false)).toBe(false);
    // … und Einwilligung ohne Berechtigung auch nicht.
    expect(mayViewNamedProgress('MEMBER', true)).toBe(false);
  });

  it('beschriftet jede Rolle verständlich', () => {
    for (const rolle of ['OWNER', 'TEACHER', 'MEMBER'] as OrgRoleName[]) {
      expect(ROLE_LABELS[rolle].length).toBeGreaterThan(3);
      expect(ROLE_DESCRIPTIONS[rolle].length).toBeGreaterThan(30);
    }
  });

  it('weist Summenwerte erst ab der Mindestgröße aus', () => {
    expect(mayShowAggregates(MIN_COHORT_SIZE_FOR_AGGREGATES - 1)).toBe(false);
    expect(mayShowAggregates(MIN_COHORT_SIZE_FOR_AGGREGATES)).toBe(true);
  });
});

describe('Kohortenauswertung', () => {
  const jetzt = new Date(2026, 7, 4, 12, 0, 0);
  const gestern = new Date(2026, 7, 3, 12, 0, 0);
  const vorDreiWochen = new Date(2026, 6, 14, 12, 0, 0);

  it('gibt bei zu kleiner Kohorte gar nichts aus', () => {
    const insights = buildCohortInsights(
      [lernende('a', { lessonsCompleted: 5 }), lernende('b', { lessonsCompleted: 9 })],
      2,
      NAMEN,
      jetzt,
    );
    expect(insights.aggregates).toBeNull();
    expect(insights.hardestConcepts).toEqual([]);
    expect(insights.guidance).toContain('mindestens 3');
  });

  it('rechnet mit dem Median statt dem Durchschnitt', () => {
    // Eine einzelne sehr aktive Person darf das Bild nicht verschieben.
    const insights = buildCohortInsights(
      [
        lernende('a', { lessonsCompleted: 1 }),
        lernende('b', { lessonsCompleted: 2 }),
        lernende('c', { lessonsCompleted: 3 }),
        lernende('d', { lessonsCompleted: 200 }),
      ],
      0,
      NAMEN,
      jetzt,
    );
    // Durchschnitt wäre 51,5 – der Median beschreibt die Gruppe.
    expect(insights.aggregates?.lessonsCompletedMedian).toBe(2.5);
  });

  it('zählt nur die letzten sieben Tage als aktiv', () => {
    const insights = buildCohortInsights(
      [
        lernende('a', { lastActiveAt: gestern }),
        lernende('b', { lastActiveAt: vorDreiWochen }),
        lernende('c', { lastActiveAt: null }),
        lernende('d', { lastActiveAt: gestern }),
      ],
      0,
      NAMEN,
      jetzt,
    );
    expect(insights.aggregates?.activeShareLast7Days).toBe(0.5);
  });

  it('findet die Konzepte, an denen die Gruppe hängt', () => {
    const insights = buildCohortInsights(
      [
        lernende('a', { masteryByConcept: { variablen: 90, schleifen: 30 } }),
        lernende('b', { masteryByConcept: { variablen: 85, schleifen: 40 } }),
        lernende('c', { masteryByConcept: { variablen: 95, schleifen: 20 } }),
      ],
      0,
      NAMEN,
      jetzt,
    );
    expect(insights.hardestConcepts[0]?.name).toBe('Schleifen');
    expect(insights.hardestConcepts[0]?.strugglingShare).toBe(1);
    // Variablen sitzen bei allen – das Konzept taucht gar nicht auf.
    expect(insights.hardestConcepts.map((c) => c.slug)).not.toContain('variablen');
  });

  it('lässt Konzepte weg, die kaum jemand begonnen hat', () => {
    // Sonst stünde ganz oben, was genau eine Person angefangen hat – in einer
    // kleinen Gruppe wäre das eine Aussage über diese eine Person.
    const insights = buildCohortInsights(
      [
        lernende('a', { masteryByConcept: { bedingungen: 10 } }),
        lernende('b', { masteryByConcept: {} }),
        lernende('c', { masteryByConcept: {} }),
        lernende('d', { masteryByConcept: {} }),
      ],
      0,
      NAMEN,
      jetzt,
    );
    expect(insights.hardestConcepts).toEqual([]);
  });

  it('zählt ein nie begonnenes Konzept nicht als Hängenbleiben', () => {
    const insights = buildCohortInsights(
      [
        lernende('a', { masteryByConcept: { schleifen: 30 } }),
        lernende('b', { masteryByConcept: { schleifen: 30 } }),
        lernende('c', { masteryByConcept: { schleifen: 90 } }),
      ],
      0,
      NAMEN,
      jetzt,
    );
    const schleifen = insights.hardestConcepts.find((c) => c.slug === 'schleifen');
    // Zwei von drei, die es begonnen haben, liegen darunter.
    expect(schleifen?.strugglingShare).toBeCloseTo(2 / 3, 5);
    expect(schleifen?.startedShare).toBe(1);
  });

  it('höchstens fünf Konzepte', () => {
    const viele: Record<string, number> = {};
    for (let i = 0; i < 12; i += 1) viele[`konzept-${i}`] = 10 + i;
    const insights = buildCohortInsights(
      [
        lernende('a', { masteryByConcept: viele }),
        lernende('b', { masteryByConcept: viele }),
        lernende('c', { masteryByConcept: viele }),
      ],
      0,
      NAMEN,
      jetzt,
    );
    expect(insights.hardestConcepts).toHaveLength(5);
  });

  it('formuliert die Empfehlung sachlich und ohne Schuldzuweisung', () => {
    const faelle = [
      buildCohortInsights(
        [
          lernende('a', { masteryByConcept: { schleifen: 20 } }),
          lernende('b', { masteryByConcept: { schleifen: 20 } }),
          lernende('c', { masteryByConcept: { schleifen: 20 } }),
        ],
        0,
        NAMEN,
        jetzt,
      ),
      buildCohortInsights([lernende('a'), lernende('b'), lernende('c')], 0, NAMEN, jetzt),
    ];

    for (const insights of faelle) {
      expect(insights.guidance, insights.guidance).not.toMatch(
        /versagt|faul|schlecht|Rückstand|zu langsam|!/i,
      );
      expect(insights.guidance.length).toBeGreaterThan(30);
    }
  });

  it('nennt in der Auswertung nie eine Kennung', () => {
    const insights = buildCohortInsights(
      [
        lernende('geheime-id-1', { masteryByConcept: { schleifen: 10 } }),
        lernende('geheime-id-2', { masteryByConcept: { schleifen: 10 } }),
        lernende('geheime-id-3', { masteryByConcept: { schleifen: 10 } }),
      ],
      0,
      NAMEN,
      jetzt,
    );
    const alsText = JSON.stringify(insights);
    expect(alsText).not.toContain('geheime-id');
  });
});
