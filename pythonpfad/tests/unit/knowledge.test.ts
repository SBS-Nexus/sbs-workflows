import { describe, expect, it } from 'vitest';
import {
  assignLevels,
  dependentsOf,
  layoutConceptMap,
  type ConceptNodeInput,
} from '@/domain/knowledge/map-layout';
import {
  REVIEW_TARGET_RETENTION,
  buildForecast,
  daysUntilBelow,
  describeForecast,
  retentionAfter,
  retentionNow,
} from '@/domain/knowledge/retention';
import { concepts as KURSKONZEPTE } from '@/content/concepts';

function konzept(slug: string, prerequisiteSlugs: string[] = [], difficulty = 1): ConceptNodeInput {
  return { slug, name: slug, prerequisiteSlugs, difficulty };
}

describe('Ebenen des Konzeptgraphen', () => {
  it('setzt Konzepte ohne Voraussetzung auf Ebene 0', () => {
    const { levels } = assignLevels([konzept('a'), konzept('b')]);
    expect(levels.get('a')).toBe(0);
    expect(levels.get('b')).toBe(0);
  });

  it('legt ein Konzept eine Ebene über seine späteste Voraussetzung', () => {
    const { levels } = assignLevels([konzept('a'), konzept('b', ['a']), konzept('c', ['a', 'b'])]);
    expect(levels.get('a')).toBe(0);
    expect(levels.get('b')).toBe(1);
    expect(levels.get('c')).toBe(2);
  });

  it('übergeht unbekannte Voraussetzungen, statt abzubrechen', () => {
    // Ein Tippfehler im Inhalt darf nicht dazu führen, dass die ganze
    // Landkarte verschwindet.
    const { levels } = assignLevels([konzept('a', ['gibtsnicht'])]);
    expect(levels.get('a')).toBe(0);
  });

  it('meldet einen Kreis, statt sich aufzuhängen', () => {
    const { cycles, levels } = assignLevels([konzept('a', ['b']), konzept('b', ['a'])]);
    expect(cycles.length).toBeGreaterThan(0);
    // Trotzdem bekommt jedes Konzept eine Ebene.
    expect(levels.get('a')).toBeDefined();
    expect(levels.get('b')).toBeDefined();
  });
});

describe('Anordnung', () => {
  const eingabe = [
    konzept('grundlage'),
    konzept('mitte', ['grundlage'], 2),
    konzept('mitte-zwei', ['grundlage'], 1),
    konzept('spitze', ['mitte', 'mitte-zwei'], 3),
  ];

  it('ordnet nach Ebenen von links nach rechts', () => {
    const layout = layoutConceptMap(eingabe);
    const bySlug = new Map(layout.nodes.map((node) => [node.slug, node]));
    expect(bySlug.get('grundlage')!.x).toBeLessThan(bySlug.get('mitte')!.x);
    expect(bySlug.get('mitte')!.x).toBeLessThan(bySlug.get('spitze')!.x);
    expect(layout.levels).toBe(3);
  });

  it('sortiert innerhalb einer Ebene stabil nach Schwierigkeit und Namen', () => {
    const layout = layoutConceptMap(eingabe);
    const ebeneEins = layout.nodes
      .filter((node) => node.level === 1)
      .sort((a, b) => a.slot - b.slot)
      .map((node) => node.slug);
    // mitte-zwei hat Schwierigkeit 1, mitte hat 2 – also steht es oben.
    expect(ebeneEins).toEqual(['mitte-zwei', 'mitte']);
  });

  it('liefert für jede Voraussetzung eine Kante mit passenden Koordinaten', () => {
    const layout = layoutConceptMap(eingabe);
    expect(layout.edges).toHaveLength(4);
    const bySlug = new Map(layout.nodes.map((node) => [node.slug, node]));
    for (const edge of layout.edges) {
      expect(edge.x1).toBe(bySlug.get(edge.from)!.x);
      expect(edge.y2).toBe(bySlug.get(edge.to)!.y);
    }
  });

  it('lässt Kanten zu unbekannten Konzepten weg', () => {
    const layout = layoutConceptMap([konzept('a', ['gibtsnicht'])]);
    expect(layout.edges).toEqual([]);
  });

  it('kommt mit einem leeren Graphen zurecht', () => {
    const layout = layoutConceptMap([]);
    expect(layout.nodes).toEqual([]);
    expect(layout.width).toBe(0);
  });

  it('ordnet den echten Kursgraphen ohne Kreis an', () => {
    // Im Inhalt heißt das Feld prerequisiteSlugs; in der Datenbank landet es
    // in der Spalte prerequisiteIds (historischer Name, der Seed bildet ab).
    const eingaben = KURSKONZEPTE.map((concept) => ({
      slug: concept.slug,
      name: concept.name,
      prerequisiteSlugs: concept.prerequisiteSlugs ?? [],
      difficulty: concept.difficulty ?? 1,
    }));
    const { cycles } = assignLevels(eingaben);
    expect(cycles).toEqual([]);

    const layout = layoutConceptMap(eingaben);
    expect(layout.nodes).toHaveLength(KURSKONZEPTE.length);
    // Der Kurs baut aufeinander auf – eine flache Reihe wäre ein Hinweis
    // darauf, dass die Voraussetzungen nicht mehr ankommen.
    expect(layout.levels).toBeGreaterThan(3);
  });
});

describe('Abhängige Konzepte', () => {
  const eingabe = [
    konzept('a'),
    konzept('b', ['a']),
    konzept('c', ['b']),
    konzept('d', ['a']),
    konzept('einzeln'),
  ];

  it('findet direkte und indirekte Nachfolger', () => {
    expect(dependentsOf(eingabe, 'a')).toEqual(['b', 'c', 'd']);
    expect(dependentsOf(eingabe, 'b')).toEqual(['c']);
  });

  it('liefert nichts für ein Konzept ohne Nachfolger', () => {
    expect(dependentsOf(eingabe, 'einzeln')).toEqual([]);
    expect(dependentsOf(eingabe, 'c')).toEqual([]);
  });
});

describe('Behaltensprognose', () => {
  const gerade = new Date(2026, 7, 4, 12, 0, 0);

  it('liefert null für ein nie geübtes Konzept', () => {
    expect(retentionAfter({ stability: 5, lastPracticedAt: null, masteryScore: 0 }, 0)).toBe(0);
  });

  it('fällt mit der Zeit und nie unter null', () => {
    const eingabe = { stability: 5, lastPracticedAt: gerade, masteryScore: 100 };
    const heute = retentionAfter(eingabe, 0);
    const inFuenf = retentionAfter(eingabe, 5);
    const inDreissig = retentionAfter(eingabe, 30);

    expect(heute).toBeCloseTo(1, 5);
    expect(inFuenf).toBeLessThan(heute);
    expect(inDreissig).toBeLessThan(inFuenf);
    expect(inDreissig).toBeGreaterThanOrEqual(0);
  });

  it('fällt bei höherer Stabilität langsamer', () => {
    const wackelig = { stability: 2, lastPracticedAt: gerade, masteryScore: 100 };
    const gefestigt = { stability: 20, lastPracticedAt: gerade, masteryScore: 100 };
    expect(retentionAfter(gefestigt, 10)).toBeGreaterThan(retentionAfter(wackelig, 10));
  });

  it('deckelt an der Kompetenz', () => {
    // Ein halb beherrschtes Konzept ist auch unmittelbar nach dem Üben nicht
    // sicher abrufbar.
    const halb = { stability: 10, lastPracticedAt: gerade, masteryScore: 50 };
    expect(retentionAfter(halb, 0)).toBeCloseTo(0.5, 5);
  });

  it('rechnet die vergangene Zeit seit der letzten Übung mit', () => {
    const vorZehnTagen = new Date(gerade);
    vorZehnTagen.setDate(vorZehnTagen.getDate() - 10);
    const eingabe = { stability: 10, lastPracticedAt: vorZehnTagen, masteryScore: 100 };
    expect(retentionNow(eingabe, gerade)).toBeCloseTo(Math.exp(-1), 3);
  });

  it('sagt, in wie vielen Tagen die Schwelle unterschritten wird', () => {
    const eingabe = { stability: 10, lastPracticedAt: gerade, masteryScore: 100 };
    const tage = daysUntilBelow(eingabe, REVIEW_TARGET_RETENTION, gerade);
    // −10 · ln(0.85) ≈ 1.62 Tage
    expect(tage).toBeCloseTo(1.62, 1);
    // Zur Probe: Genau dann liegt der Wert auf der Schwelle.
    expect(retentionAfter(eingabe, tage)).toBeCloseTo(REVIEW_TARGET_RETENTION, 3);
  });

  it('meldet sofortigen Bedarf, wenn die Kompetenz unter der Schwelle liegt', () => {
    // Nicht wegen Vergessens, sondern weil es noch nicht gefestigt ist.
    const eingabe = { stability: 10, lastPracticedAt: gerade, masteryScore: 60 };
    expect(daysUntilBelow(eingabe, REVIEW_TARGET_RETENTION, gerade)).toBe(0);
  });

  it('mittelt nur über begonnene Konzepte', () => {
    const punkte = buildForecast(
      [
        { stability: 10, lastPracticedAt: gerade, masteryScore: 100 },
        { stability: 1, lastPracticedAt: null, masteryScore: 0 },
      ],
      10,
      gerade,
    );
    // Das nie geübte Konzept zieht die Kurve nicht nach unten.
    expect(punkte[0]?.retention).toBeCloseTo(1, 3);
  });

  it('zählt die Konzepte unter der Schwelle je Tag', () => {
    const punkte = buildForecast(
      [
        { stability: 2, lastPracticedAt: gerade, masteryScore: 100 },
        { stability: 200, lastPracticedAt: gerade, masteryScore: 100 },
      ],
      30,
      gerade,
    );
    expect(punkte[0]?.belowTarget).toBe(0);
    // Nach 30 Tagen liegt das wacklige Konzept (Stabilität 2) längst unter der
    // Schwelle, das sehr gefestigte (Stabilität 200) noch darüber.
    expect(punkte[30]?.belowTarget).toBe(1);
  });

  it('lässt auch gefestigte Konzepte irgendwann unter die Schwelle fallen', () => {
    // Das ist die Kernaussage der Vergessenskurve und der Grund, warum
    // überhaupt wiederholt wird: Ohne Abruf sinkt jeder Wert.
    const punkte = buildForecast(
      [{ stability: 40, lastPracticedAt: gerade, masteryScore: 100 }],
      30,
      gerade,
    );
    expect(punkte[0]?.belowTarget).toBe(0);
    expect(punkte[30]?.belowTarget).toBe(1);
  });

  it('liefert eine leere Prognose ohne Konzepte', () => {
    const punkte = buildForecast([], 30, gerade);
    expect(punkte).toHaveLength(31);
    expect(punkte.every((point) => point.retention === 0)).toBe(true);
  });

  it('formuliert die Prognose ohne Verlustsprache', () => {
    const faelle = [
      buildForecast([], 30, gerade),
      buildForecast([{ stability: 40, lastPracticedAt: gerade, masteryScore: 100 }], 30, gerade),
      buildForecast([{ stability: 1, lastPracticedAt: gerade, masteryScore: 100 }], 30, gerade),
      buildForecast([{ stability: 5, lastPracticedAt: gerade, masteryScore: 60 }], 30, gerade),
    ];
    for (const punkte of faelle) {
      const text = describeForecast(punkte);
      expect(text, text).not.toMatch(/verlier|verloren|vergisst du|droht|Gefahr|!/i);
      expect(text.length).toBeGreaterThan(20);
    }
  });
});
