import { describe, expect, it } from 'vitest';
import {
  komponentenProdukte,
  kosinusAehnlichkeit,
  kosinusRechnung,
  pruefeVektor,
  skalarprodukt,
  vektornorm,
  VektorFehler,
  type VektorFehlerCode,
} from '@/domain/retrieval/vektor';
import {
  anSchwelleTeilen,
  gemeinsameWoerter,
  precisionUndRecall,
  rangliste,
  topK,
  vergleicheTreffer,
  woerter,
} from '@/domain/retrieval/ranking';

/**
 * Die Retrieval-Mathematik aus Stufe 9.
 *
 * Erwartete Werte sind von Hand gerechnet (im Kommentar daneben), nicht aus
 * der Implementierung abgeschrieben — sonst prüfte der Test nur, dass die
 * Funktion mit sich selbst übereinstimmt.
 */

function fehlerCode(fn: () => unknown): VektorFehlerCode | 'KEIN_FEHLER' | 'ANDERER_FEHLER' {
  try {
    fn();
    return 'KEIN_FEHLER';
  } catch (fehler) {
    return fehler instanceof VektorFehler ? fehler.code : 'ANDERER_FEHLER';
  }
}

describe('Skalarprodukt', () => {
  it('summiert die komponentenweisen Produkte', () => {
    // 3·4 + 4·3 = 24
    expect(skalarprodukt([3, 4], [4, 3])).toBe(24);
    // 1·2 + 2·1 + 2·2 = 8
    expect(skalarprodukt([1, 2, 2], [2, 1, 2])).toBe(8);
  });

  it('ist 0 für senkrechte Vektoren und negativ für entgegengesetzte', () => {
    expect(skalarprodukt([1, 0], [0, 1])).toBe(0);
    expect(skalarprodukt([1, 2], [-1, -2])).toBe(-5);
  });

  it('liefert die einzelnen Produkte nachvollziehbar', () => {
    expect(komponentenProdukte([1, 2, 2], [2, 1, 2])).toEqual([2, 2, 4]);
  });

  it('erzwingt gleiche Dimensionen', () => {
    expect(fehlerCode(() => skalarprodukt([1, 2], [1, 2, 3]))).toBe('DIMENSION');
  });

  it('meldet einen Überlauf statt Infinity zurückzugeben', () => {
    expect(fehlerCode(() => skalarprodukt([1e200, 1e200], [1e200, 1e200]))).toBe('UEBERLAUF');
  });
});

describe('Vektornorm', () => {
  it('ist die euklidische Länge', () => {
    expect(vektornorm([3, 4])).toBe(5);
    expect(vektornorm([1, 2, 2])).toBe(3);
    expect(vektornorm([-3, -4])).toBe(5);
  });

  it('ist 0 genau für den Nullvektor', () => {
    expect(vektornorm([0, 0, 0])).toBe(0);
    expect(vektornorm([0, 1e-300])).toBeGreaterThan(0);
  });

  it('läuft bei großen, endlichen Komponenten nicht über', () => {
    // √((1e200)² + (1e200)²) = 1e200 · √2 — naiv gerechnet wäre (1e200)² = Infinity.
    expect(vektornorm([1e200, 1e200])).toBeCloseTo(1e200 * Math.SQRT2, -185);
    expect(Number.isFinite(vektornorm([1e200, 1e200]))).toBe(true);
  });
});

describe('Kosinusähnlichkeit', () => {
  it('rechnet das Lehrbeispiel nach', () => {
    // 24 / (5 · 5) = 0,96
    expect(kosinusAehnlichkeit([3, 4], [4, 3])).toBeCloseTo(0.96, 12);
    // 8 / (3 · 3) = 0,888…
    expect(kosinusAehnlichkeit([1, 2, 2], [2, 1, 2])).toBeCloseTo(8 / 9, 12);
  });

  it('hängt nur von der Richtung ab, nicht von der Länge', () => {
    expect(kosinusAehnlichkeit([3, 4], [6, 8])).toBe(1);
    expect(kosinusAehnlichkeit([3, 4], [0.3, 0.4])).toBe(1);
  });

  it('liegt zwischen −1 und 1 und trifft die Ränder', () => {
    expect(kosinusAehnlichkeit([1, 0], [0, 1])).toBe(0);
    expect(kosinusAehnlichkeit([1, 2, 3], [-1, -2, -3])).toBe(-1);
    // Gleitkomma-Rauschen darf den Wert nicht über 1 schieben.
    const v = [0.1, 0.2, 0.3, 0.7];
    expect(kosinusAehnlichkeit(v, v)).toBeLessThanOrEqual(1);
    expect(kosinusAehnlichkeit(v, v)).toBeCloseTo(1, 15);
  });

  it('ist symmetrisch', () => {
    const a = [0.8, 0, 0, 0.5, 0];
    const b = [0.7, 0.1, 0, 0.6, 0.1];
    expect(kosinusAehnlichkeit(a, b)).toBe(kosinusAehnlichkeit(b, a));
  });

  it('gibt den Rechenweg vollständig aus', () => {
    const rechnung = kosinusRechnung([3, 4], [4, 3]);
    expect(rechnung).toEqual({
      produkte: [12, 12],
      skalarprodukt: 24,
      normA: 5,
      normB: 5,
      kosinus: expect.closeTo(0.96, 12) as number,
    });
  });

  it('weist Nullvektoren auf beiden Seiten ausdrücklich zurück', () => {
    expect(fehlerCode(() => kosinusAehnlichkeit([0, 0], [1, 2]))).toBe('NULLVEKTOR');
    expect(fehlerCode(() => kosinusAehnlichkeit([1, 2], [0, 0]))).toBe('NULLVEKTOR');
    expect(fehlerCode(() => kosinusAehnlichkeit([0, 0], [0, 0]))).toBe('NULLVEKTOR');
  });

  it('erzwingt gleiche Dimensionen, bevor ein Nullvektor geprüft wird', () => {
    expect(fehlerCode(() => kosinusAehnlichkeit([0, 0], [1, 2, 3]))).toBe('DIMENSION');
  });

  it('bleibt bei großen Komponenten endlich und korrekt', () => {
    expect(kosinusAehnlichkeit([1e200, 0], [1e200, 1e200])).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it('meldet einen nicht darstellbaren Rechenweg, statt Infinity auszugeben', () => {
    expect(fehlerCode(() => kosinusRechnung([1e200, 0], [1e200, 1e200]))).toBe('UEBERLAUF');
  });
});

describe('Ungültige Eingaben werden zurückgewiesen, nicht umgedeutet', () => {
  it.each([
    ['NaN', [1, Number.NaN], 'NICHT_ENDLICH'],
    ['Infinity', [1, Number.POSITIVE_INFINITY], 'NICHT_ENDLICH'],
    ['-Infinity', [Number.NEGATIVE_INFINITY, 1], 'NICHT_ENDLICH'],
    ['Zeichenkette', [1, '2'], 'NICHT_ENDLICH'],
    ['null', [1, null], 'NICHT_ENDLICH'],
    ['leere Liste', [], 'LEER'],
    ['kein Array', { 0: 1, length: 1 }, 'KEIN_ARRAY'],
    ['undefined', undefined, 'KEIN_ARRAY'],
  ] as const)('%s', (_name, eingabe, code) => {
    expect(fehlerCode(() => pruefeVektor(eingabe))).toBe(code);
    expect(fehlerCode(() => skalarprodukt(eingabe, [1, 2]))).toBe(code);
    expect(fehlerCode(() => vektornorm(eingabe))).toBe(code);
    expect(fehlerCode(() => kosinusAehnlichkeit([1, 2], eingabe))).toBe(code);
  });

  it('nennt in der Meldung, welcher Vektor und welche Stelle betroffen ist', () => {
    expect(() => kosinusRechnung([1, 2], [1, Number.NaN], { b: 'Dokument "x"' })).toThrow(
      /Dokument "x"\[1\]/,
    );
  });
});

describe('Keine Mutation der Eingaben', () => {
  it('lässt eingefrorene Vektoren und Dokumentlisten unverändert', () => {
    const anfrage = Object.freeze([0.8, 0, 0, 0.5, 0]);
    const dokumente = Object.freeze([
      Object.freeze({ id: 'b', vektor: Object.freeze([0.1, 0.8, 0, 0.7, 0]) }),
      Object.freeze({ id: 'a', vektor: Object.freeze([0.9, 0.1, 0.1, 0.2, 0]) }),
    ]);
    const vorher = JSON.stringify({ anfrage, dokumente });

    // Eingefrorene Objekte werfen im Strict Mode bei jedem Schreibversuch.
    expect(() => {
      skalarprodukt(anfrage, dokumente[0]?.vektor);
      vektornorm(anfrage);
      kosinusRechnung(anfrage, dokumente[1]?.vektor);
      const liste = rangliste(anfrage, dokumente);
      topK(liste.eintraege, 1);
      anSchwelleTeilen(liste.eintraege, 0.5);
    }).not.toThrow();

    expect(JSON.stringify({ anfrage, dokumente })).toBe(vorher);
    // Die Reihenfolge der Eingabeliste bleibt, auch wenn die Rangliste umsortiert.
    expect(dokumente.map((d) => d.id)).toEqual(['b', 'a']);
  });

  it('gibt neue Listen zurück statt der Eingabe', () => {
    const sortiert = [{ id: 'a' }, { id: 'b' }];
    const ergebnis = topK(sortiert, 5);
    expect(ergebnis.treffer).not.toBe(sortiert);
    expect(ergebnis.treffer).toEqual(sortiert);
  });
});

describe('Rangliste', () => {
  const dokumente = [
    { id: 'reisekosten', vektor: [0.1, 0.8, 0, 0.7, 0] },
    { id: 'urlaubsantrag', vektor: [0.9, 0.1, 0.1, 0.2, 0] },
    { id: 'teamausflug', vektor: [0.7, 0.1, 0, 0.6, 0.1] },
    { id: 'passwort', vektor: [0, 0, 0.9, 0, 0] },
  ];

  it('sortiert absteigend nach Kosinusähnlichkeit und nummeriert ab 1', () => {
    const { eintraege } = rangliste([0.8, 0, 0, 0.5, 0], dokumente);
    // teamausflug: 0,86 / (√0,89 · √0,87) ≈ 0,9774
    // urlaubsantrag: 0,82 / (√0,89 · √0,87) ≈ 0,9319
    // reisekosten: 0,43 / (√0,89 · √1,14) ≈ 0,4269
    // passwort: 0 / … = 0
    expect(eintraege.map((e) => e.id)).toEqual([
      'teamausflug',
      'urlaubsantrag',
      'reisekosten',
      'passwort',
    ]);
    expect(eintraege.map((e) => e.platz)).toEqual([1, 2, 3, 4]);
    expect(eintraege[0]?.score).toBeCloseTo(0.86 / Math.sqrt(0.89 * 0.87), 12);
    expect(eintraege[1]?.score).toBeCloseTo(0.82 / Math.sqrt(0.89 * 0.87), 12);
    expect(eintraege[2]?.score).toBeCloseTo(0.43 / Math.sqrt(0.89 * 1.14), 12);
    expect(eintraege[3]?.score).toBe(0);
  });

  it('löst Gleichstand deterministisch über die Kennung auf', () => {
    // Drei Vektoren mit exakt gleicher Richtung wie die Anfrage.
    const gleich = [
      { id: 'c', vektor: [2, 2] },
      { id: 'a', vektor: [1, 1] },
      { id: 'b', vektor: [3, 3] },
    ];
    const erwartet = ['a', 'b', 'c'];
    expect(rangliste([1, 1], gleich).eintraege.map((e) => e.id)).toEqual(erwartet);
    // Unabhängig von der Eingabereihenfolge.
    expect(rangliste([1, 1], [...gleich].reverse()).eintraege.map((e) => e.id)).toEqual(erwartet);
  });

  it('wertet Gleitkomma-Rauschen in der letzten Stelle als Gleichstand', () => {
    // 0,1 + 0,2 ist in Gleitkomma nicht exakt 0,3; beide sind gemeint als gleich.
    expect(vergleicheTreffer({ id: 'b', score: 0.1 + 0.2 }, { id: 'a', score: 0.3 })).toBe(1);
    expect(vergleicheTreffer({ id: 'a', score: 0.1 + 0.2 }, { id: 'b', score: 0.3 })).toBe(-1);
    // Ein echter Unterschied entscheidet weiterhin.
    expect(vergleicheTreffer({ id: 'z', score: 0.31 }, { id: 'a', score: 0.3 })).toBeLessThan(0);
  });

  it('nutzt die Codepunkt-Reihenfolge statt einer Ortseinstellung', () => {
    const gleich = [
      { id: 'b', vektor: [1, 0] },
      { id: 'B', vektor: [1, 0] },
      { id: 'a', vektor: [1, 0] },
    ];
    expect(rangliste([1, 0], gleich).eintraege.map((e) => e.id)).toEqual(['B', 'a', 'b']);
  });

  it('weist Dokument-Nullvektoren ausdrücklich aus statt mit Score 0', () => {
    const { eintraege, ausgeschlossen } = rangliste(
      [1, 0],
      [
        { id: 'leer', vektor: [0, 0] },
        { id: 'senkrecht', vektor: [0, 1] },
      ],
    );
    expect(eintraege.map((e) => e.id)).toEqual(['senkrecht']);
    expect(eintraege[0]?.score).toBe(0);
    expect(ausgeschlossen).toEqual([
      { id: 'leer', grund: 'NULLVEKTOR', meldung: expect.stringContaining('leer') as string },
    ]);
  });

  it('wirft bei einem Anfrage-Nullvektor, statt alles mit 0 zu bewerten', () => {
    expect(fehlerCode(() => rangliste([0, 0], [{ id: 'a', vektor: [1, 0] }]))).toBe('NULLVEKTOR');
  });

  it('wirft bei abweichender Dimension eines Dokuments — auch bei einem Nullvektor', () => {
    expect(fehlerCode(() => rangliste([1, 0], [{ id: 'a', vektor: [1, 0, 0] }]))).toBe('DIMENSION');
    expect(fehlerCode(() => rangliste([1, 0], [{ id: 'a', vektor: [0, 0, 0] }]))).toBe('DIMENSION');
  });

  it('wirft bei NaN in einem Dokumentvektor', () => {
    expect(fehlerCode(() => rangliste([1, 0], [{ id: 'a', vektor: [Number.NaN, 0] }]))).toBe(
      'NICHT_ENDLICH',
    );
  });

  it('wirft bei doppelten Dokumentkennungen', () => {
    expect(() =>
      rangliste(
        [1, 0],
        [
          { id: 'a', vektor: [1, 0] },
          { id: 'a', vektor: [0, 1] },
        ],
      ),
    ).toThrow(/Doppelte Dokumentkennung/);
  });

  it('liefert für einen leeren Suchbestand eine leere Rangliste', () => {
    expect(rangliste([1, 0], [])).toEqual({ eintraege: [], ausgeschlossen: [] });
  });
});

describe('Top-k', () => {
  const sortiert = ['a', 'b', 'c', 'd', 'e'];

  it('nimmt genau die ersten k', () => {
    expect(topK(sortiert, 1).treffer).toEqual(['a']);
    expect(topK(sortiert, 3).treffer).toEqual(['a', 'b', 'c']);
    expect(topK(sortiert, 5).treffer).toEqual(sortiert);
  });

  it('meldet sichtbar, wenn weniger Kandidaten als k vorhanden sind', () => {
    expect(topK(['a', 'b'], 5)).toEqual({ treffer: ['a', 'b'], angefordert: 5, verfuegbar: 2 });
    expect(topK([], 3)).toEqual({ treffer: [], angefordert: 3, verfuegbar: 0 });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('lehnt k = %s ab', (k) => {
    expect(() => topK(sortiert, k)).toThrow(RangeError);
  });
});

describe('Schwelle', () => {
  const treffer = [
    { id: 'a', score: 0.9 },
    { id: 'b', score: 0.55 },
    { id: 'c', score: 0.2 },
  ];

  it('teilt an der Schwelle; genau auf der Schwelle zählt als darüber', () => {
    const { ueber, unter } = anSchwelleTeilen(treffer, 0.55);
    expect(ueber.map((t) => t.id)).toEqual(['a', 'b']);
    expect(unter.map((t) => t.id)).toEqual(['c']);
  });

  it('liefert eine leere Liste statt des besten Kandidaten, wenn nichts reicht', () => {
    expect(anSchwelleTeilen(treffer, 0.95).ueber).toEqual([]);
  });

  it.each([Number.NaN, 1.5, -1.5])('lehnt die Schwelle %s ab', (schwelle) => {
    expect(() => anSchwelleTeilen(treffer, schwelle)).toThrow(RangeError);
  });
});

describe('Precision und Recall', () => {
  it('rechnet das Beispiel aus Lektion 4', () => {
    // Geliefert A, B, C, D; relevant A, C, F → 2 von 4 geliefert, 2 von 3 gefunden.
    expect(precisionUndRecall(['A', 'B', 'C', 'D'], ['A', 'C', 'F'])).toEqual({
      relevantGefunden: 2,
      geliefert: 4,
      relevantGesamt: 3,
      precision: 0.5,
      recall: 2 / 3,
    });
  });

  it('kennzeichnet nicht definierte Werte mit null statt 0 oder 1', () => {
    expect(precisionUndRecall([], ['a']).precision).toBeNull();
    expect(precisionUndRecall([], ['a']).recall).toBe(0);
    expect(precisionUndRecall(['a'], []).recall).toBeNull();
    expect(precisionUndRecall(['a'], []).precision).toBe(0);
  });

  it('lehnt doppelte Treffer ab, statt sie doppelt zu zählen', () => {
    expect(() => precisionUndRecall(['a', 'a'], ['a'])).toThrow(/doppelt/);
  });
});

describe('Schlüsselwortvergleich', () => {
  it('vergleicht ganze Wörter ohne Füllwörter', () => {
    expect(woerter('Wie beantrage ich Urlaub für eine Reise?')).toEqual([
      'beantrage',
      'reise',
      'urlaub',
    ]);
    expect(
      gemeinsameWoerter(
        'Wie beantrage ich Urlaub?',
        'Urlaub beantragst du im Personalportal. Ein Urlaubstag zählt einzeln.',
      ),
    ).toEqual(['urlaub']);
  });

  it('findet keine Übereinstimmung, wenn nur die Bedeutung gleich ist', () => {
    expect(
      gemeinsameWoerter(
        'Ich komme nicht mehr in mein Konto.',
        'Über das Self-Service-Portal setzt du dein Passwort selbst zurück.',
      ),
    ).toEqual([]);
  });
});
