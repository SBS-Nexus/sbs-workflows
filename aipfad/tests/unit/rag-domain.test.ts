import { describe, expect, it } from 'vitest';
import {
  chunkEnthaeltGruppe,
  chunkeBestand,
  chunkeDokument,
  einheitenFuerText,
  getrennteGruppen,
  type ChunkStrategie,
  type RagDokument,
} from '@/domain/rag/chunking';
import { waehleKontext } from '@/domain/rag/kontext';
import { pruefeAussagen, simuliereAntwort, type Aussage, type Quelle } from '@/domain/rag/antwort';
import { bewerteRag } from '@/domain/rag/evaluation';
import { VektorFehler } from '@/domain/retrieval/vektor';

/**
 * Die RAG-Domain aus Stufe 10. Erwartete Werte sind von Hand abgeleitet
 * (Kommentare), nicht aus der Implementierung abgeschrieben.
 */

const KLEIN: ChunkStrategie = { id: 'klein', saetzeProChunk: 1, overlap: 0 };
const GROSS: ChunkStrategie = { id: 'gross', saetzeProChunk: 2, overlap: 1 };

/** Fünf Sätze mit je n Wörtern, Vektor (1, n). */
function dokument(id: string, anzahl: number): RagDokument {
  return {
    id,
    saetze: Array.from({ length: anzahl }, (_, i) => ({
      text: `Satz ${i + 1} in ${id}.`,
      vektor: [1, i + 1],
    })),
  };
}

describe('Chunking: Grenzen und Overlap', () => {
  it('teilt ohne Overlap in aufeinanderfolgende Fenster; der Rest bildet einen eigenen Chunk', () => {
    const chunks = chunkeDokument(dokument('d', 5), { id: 's', saetzeProChunk: 2, overlap: 0 });
    // Sätze 0–1, 2–3, 4
    expect(chunks.map((c) => [c.von, c.bis])).toEqual([
      [0, 1],
      [2, 3],
      [4, 4],
    ]);
  });

  it('teilt mit Overlap in Fenster mit Schrittweite Größe − Overlap und endet am letzten Satz', () => {
    const chunks = chunkeDokument(dokument('d', 5), GROSS);
    // Schrittweite 1: 0–1, 1–2, 2–3, 3–4 — kein fünftes Fenster nur aus Satz 4.
    expect(chunks.map((c) => [c.von, c.bis])).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
  });

  it('erzeugt bei Overlap 1 von 3 Sätzen genau die erwarteten Fenster', () => {
    const chunks = chunkeDokument(dokument('d', 7), { id: 's', saetzeProChunk: 3, overlap: 1 });
    // Schrittweite 2: 0–2, 2–4, 4–6
    expect(chunks.map((c) => [c.von, c.bis])).toEqual([
      [0, 2],
      [2, 4],
      [4, 6],
    ]);
  });

  it('deckt jeden Satz ab', () => {
    for (const strategie of [KLEIN, GROSS, { id: 's', saetzeProChunk: 3, overlap: 2 }]) {
      for (const anzahl of [1, 2, 3, 4, 7]) {
        const chunks = chunkeDokument(dokument('d', anzahl), strategie);
        for (let satz = 0; satz < anzahl; satz += 1) {
          expect(chunks.some((c) => c.von <= satz && satz <= c.bis)).toBe(true);
        }
      }
    }
  });

  it('vergibt deterministische Kennungen aus Dokument, Strategie und laufender Nummer', () => {
    const a = chunkeBestand([dokument('a', 3), dokument('b', 2)], GROSS).map((c) => c.id);
    const b = chunkeBestand([dokument('a', 3), dokument('b', 2)], GROSS).map((c) => c.id);
    expect(a).toEqual(['a:gross:1', 'a:gross:2', 'b:gross:1']);
    expect(b).toEqual(a);
  });

  it('ordnet jeden Chunk seiner Quelle und seinem Satzbereich zu', () => {
    const [erster, zweiter] = chunkeDokument(dokument('reise', 3), GROSS);
    expect(erster).toMatchObject({ dokumentId: 'reise', strategieId: 'gross', von: 0, bis: 1 });
    expect(zweiter).toMatchObject({ dokumentId: 'reise', von: 1, bis: 2 });
    expect(erster?.text).toBe('Satz 1 in reise. Satz 2 in reise.');
  });

  it('bildet den Chunk-Vektor als Summe der Satzvektoren', () => {
    const [erster] = chunkeDokument(dokument('d', 3), GROSS);
    // (1, 1) + (1, 2) = (2, 3)
    expect(erster?.vektor).toEqual([2, 3]);
  });

  it('zählt didaktische Einheiten als Wörter', () => {
    expect(einheitenFuerText('Ab vier Stunden Fahrzeit gilt diese Einschränkung nicht.')).toBe(8);
    expect(einheitenFuerText('  zwei   Wörter ')).toBe(2);
    expect(einheitenFuerText('')).toBe(0);
    const [erster] = chunkeDokument(dokument('d', 2), GROSS);
    // "Satz 1 in d. Satz 2 in d." = 8 Wörter
    expect(erster?.einheiten).toBe(8);
  });

  it.each([
    [{ id: 'x', saetzeProChunk: 0, overlap: 0 }],
    [{ id: 'x', saetzeProChunk: 1.5, overlap: 0 }],
    [{ id: 'x', saetzeProChunk: 2, overlap: 2 }],
    [{ id: 'x', saetzeProChunk: 2, overlap: -1 }],
    [{ id: 'x', saetzeProChunk: 2, overlap: 0.5 }],
  ])('lehnt die Strategie %j ab, statt endlos oder falsch zu teilen', (strategie) => {
    expect(() => chunkeDokument(dokument('d', 3), strategie)).toThrow(RangeError);
  });

  it('lehnt Dokumente ohne Sätze, ungültige Vektoren und doppelte Kennungen ab', () => {
    expect(() => chunkeDokument({ id: 'leer', saetze: [] }, KLEIN)).toThrow(RangeError);
    expect(() =>
      chunkeDokument(
        {
          id: 'd',
          saetze: [
            { text: 'a', vektor: [1, 0] },
            { text: 'b', vektor: [1, Number.NaN] },
          ],
        },
        KLEIN,
      ),
    ).toThrow(VektorFehler);
    expect(() =>
      chunkeDokument(
        {
          id: 'd',
          saetze: [
            { text: 'a', vektor: [1, 0] },
            { text: 'b', vektor: [1, 0, 0] },
          ],
        },
        KLEIN,
      ),
    ).toThrow(/Dimensionen/);
    expect(() => chunkeBestand([dokument('a', 2), dokument('a', 2)], KLEIN)).toThrow(/Doppelte/);
  });

  it('meldet Belegsgruppen, die eine Strategie zerschneidet', () => {
    const regelUndAusnahme = [
      { dokumentId: 'r', satz: 1 },
      { dokumentId: 'r', satz: 2 },
    ];
    const gruppen = [{ gruppe: regelUndAusnahme }];
    const klein = chunkeDokument(dokument('r', 4), KLEIN);
    const gross = chunkeDokument(dokument('r', 4), GROSS);
    expect(getrennteGruppen(klein, gruppen)).toEqual(gruppen);
    expect(getrennteGruppen(gross, gruppen)).toEqual([]);
    expect(gross.filter((c) => chunkEnthaeltGruppe(c, regelUndAusnahme)).map((c) => c.id)).toEqual([
      'r:gross:2',
    ]);
  });
});

describe('Kontextauswahl: Top-k und Budget', () => {
  // Drei Chunks mit festen Richtungen; Anfrage (1, 0).
  const chunks = chunkeBestand(
    [
      {
        id: 'd',
        saetze: [
          { text: 'eins zwei drei vier', vektor: [1, 0] }, // Kosinus 1
          { text: 'eins zwei drei vier fünf sechs', vektor: [1, 1] }, // Kosinus 0,707
          { text: 'eins zwei', vektor: [1, 2] }, // Kosinus 0,447
        ],
      },
    ],
    KLEIN,
  );

  it('nutzt Ranking und Top-k aus LP-10A und weist ausgeschlossene Chunks mit Grund aus', () => {
    const kontext = waehleKontext([1, 0], chunks, { k: 2, budget: 100 });
    expect(kontext.eintraege.map((e) => [e.chunk.id, e.platz, e.ausgeschlossen])).toEqual([
      ['d:klein:1', 1, null],
      ['d:klein:2', 2, null],
      ['d:klein:3', 3, 'top-k'],
    ]);
    expect(kontext.eintraege[1]?.score).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it('übernimmt in Rangfolge, überspringt, was nicht passt, und lässt Kleineres nachrücken', () => {
    // Einheiten: 4, 6, 2. Budget 7: 4 passt, 4 + 6 = 10 nicht, 4 + 2 = 6 passt.
    const kontext = waehleKontext([1, 0], chunks, { k: 3, budget: 7 });
    expect(kontext.eintraege.map((e) => e.ausgeschlossen)).toEqual([null, 'budget', null]);
    expect(kontext.imKontext.map((c) => c.id)).toEqual(['d:klein:1', 'd:klein:3']);
    expect(kontext.belegteEinheiten).toBe(6);
  });

  it('lässt ein Budget von 0 zu und übernimmt dann nichts', () => {
    const kontext = waehleKontext([1, 0], chunks, { k: 3, budget: 0 });
    expect(kontext.imKontext).toEqual([]);
    expect(kontext.eintraege.every((e) => e.ausgeschlossen === 'budget')).toBe(true);
  });

  it('wählt bei Gleichstand stabil nach Chunk-Kennung, unabhängig von der Eingabereihenfolge', () => {
    const gleich = chunkeBestand(
      [
        { id: 'b', saetze: [{ text: 'gleich', vektor: [2, 0] }] },
        { id: 'a', saetze: [{ text: 'gleich', vektor: [1, 0] }] },
      ],
      KLEIN,
    );
    const vorwaerts = waehleKontext([1, 0], gleich, { k: 1, budget: 10 });
    const rueckwaerts = waehleKontext([1, 0], [...gleich].reverse(), { k: 1, budget: 10 });
    expect(vorwaerts.imKontext.map((c) => c.id)).toEqual(['a:klein:1']);
    expect(rueckwaerts.imKontext.map((c) => c.id)).toEqual(['a:klein:1']);
  });

  it.each([-1, 1.5, Number.NaN])('lehnt das Budget %s ab', (budget) => {
    expect(() => waehleKontext([1, 0], chunks, { k: 1, budget })).toThrow(RangeError);
  });

  it('lehnt ein ungültiges k über die Top-k-Funktion aus LP-10A ab', () => {
    expect(() => waehleKontext([1, 0], chunks, { k: 0, budget: 10 })).toThrow(RangeError);
  });

  it('verändert die Chunks nicht', () => {
    const eingefroren = Object.freeze(
      chunks.map((c) => Object.freeze({ ...c, vektor: Object.freeze([...c.vektor]) })),
    );
    const vorher = JSON.stringify(eingefroren);
    expect(() => waehleKontext([1, 0], eingefroren as never, { k: 3, budget: 7 })).not.toThrow();
    expect(JSON.stringify(eingefroren)).toBe(vorher);
  });
});

describe('Belegprüfung und Antwort-Simulator', () => {
  const quellen: Quelle[] = [
    { id: 'neu', status: 'aktuell' },
    { id: 'alt', status: 'veraltet' },
    { id: 'reise', status: 'aktuell' },
  ];
  const bestand: RagDokument[] = [
    { id: 'neu', saetze: [{ text: 'Frist zwei Wochen.', vektor: [1, 0] }] },
    { id: 'alt', saetze: [{ text: 'Frist vier Wochen.', vektor: [1, 0] }] },
    {
      id: 'reise',
      saetze: [
        { text: 'Zweite Klasse.', vektor: [0, 1] },
        { text: 'Ab vier Stunden nicht.', vektor: [0, 1] },
      ],
    },
  ];
  const klein = chunkeBestand(bestand, KLEIN);
  const gross = chunkeBestand(bestand, GROSS);
  const zwei: Aussage = {
    id: 'zwei',
    text: 'Zwei Wochen Frist.',
    belege: [[{ dokumentId: 'neu', satz: 0 }]],
    schliesstAus: ['vier'],
  };
  const vier: Aussage = {
    id: 'vier',
    text: 'Vier Wochen Frist.',
    belege: [[{ dokumentId: 'alt', satz: 0 }]],
  };
  const ersteKlasse: Aussage = {
    id: 'erste',
    text: 'Erste Klasse ab vier Stunden.',
    belege: [
      [
        { dokumentId: 'reise', satz: 0 },
        { dokumentId: 'reise', satz: 1 },
      ],
    ],
  };
  const erfunden: Aussage = {
    id: 'erfunden',
    text: 'Laut Richtlinie X gibt es 50 Euro.',
    belege: [],
    zitierteQuelle: 'richtlinie-x',
  };

  it('belegt eine Aussage aus aktueller Quelle und verweist nur auf Chunks im Kontext', () => {
    const [g] = pruefeAussagen([zwei], klein, quellen);
    expect(g?.status).toBe('belegt');
    expect(g?.belegChunks.map((c) => c.id)).toEqual(['neu:klein:1']);
  });

  it('hält eine nur veraltet belegte Aussage zurück', () => {
    const kontext = klein.filter((c) => c.dokumentId === 'alt');
    const [g] = pruefeAussagen([vier], kontext, quellen);
    expect(g?.status).toBe('veraltet');
    expect(simuliereAntwort([g!]).belegt).toEqual([]);
  });

  it('lässt die aktuelle Fassung gelten, wenn die ausschließende Aussage nur veraltet belegt ist', () => {
    const geprueft = pruefeAussagen([zwei, vier], klein, quellen);
    expect(geprueft.map((g) => [g.aussage.id, g.status])).toEqual([
      ['zwei', 'belegt'],
      ['vier', 'veraltet'],
    ]);
  });

  it('markiert zwei aktuell belegte, einander ausschließende Aussagen beide als widersprüchlich', () => {
    const quellenBeideAktuell: Quelle[] = quellen.map((q) => ({ ...q, status: 'aktuell' }));
    const geprueft = pruefeAussagen([zwei, vier], klein, quellenBeideAktuell);
    expect(geprueft.map((g) => g.status)).toEqual(['widerspruechlich', 'widerspruechlich']);
    expect(geprueft[0]?.widersprichtDen).toEqual(['vier']);
    expect(geprueft[1]?.widersprichtDen).toEqual(['zwei']);
    expect(simuliereAntwort(geprueft).nichtGenuegend).toBe(true);
  });

  it('erkennt einen zerschnittenen Beleg: beide Sätze im Kontext, aber in verschiedenen Chunks', () => {
    const [g] = pruefeAussagen([ersteKlasse], klein, quellen);
    expect(g?.status).toBe('unbelegt');
    expect(g?.getrennt).toBe(true);
    const [mitOverlap] = pruefeAussagen([ersteKlasse], gross, quellen);
    expect(mitOverlap?.status).toBe('belegt');
    expect(mitOverlap?.belegChunks.map((c) => c.id)).toEqual(['reise:gross:1']);
  });

  it('gibt ohne Beleg „nicht genügend Informationen“ aus und markiert eine erfundene Quelle', () => {
    const geprueft = pruefeAussagen([erfunden], klein, quellen);
    expect(geprueft[0]).toMatchObject({
      status: 'unbelegt',
      erfundeneQuelle: true,
      belegChunks: [],
    });
    const antwort = simuliereAntwort(geprueft);
    expect(antwort.nichtGenuegend).toBe(true);
    expect(antwort.zurueckgehalten.map((g) => g.aussage.id)).toEqual(['erfunden']);
  });

  it('gibt keine Aussage als Tatsache aus, deren Beleg-Chunk nicht im Kontext liegt', () => {
    for (const kontextGroesse of [0, 1, 2, 3, 4]) {
      const kontext = klein.slice(0, kontextGroesse);
      const ids = new Set(kontext.map((c) => c.id));
      for (const g of simuliereAntwort(pruefeAussagen([zwei, vier, ersteKlasse], kontext, quellen))
        .belegt) {
        expect(g.belegChunks.length).toBeGreaterThan(0);
        for (const chunk of g.belegChunks) expect(ids.has(chunk.id)).toBe(true);
      }
    }
  });

  it('lehnt Chunks unbekannter Quellen und doppelte Aussagekennungen ab', () => {
    expect(() => pruefeAussagen([zwei], klein, [])).toThrow(/unbekannten Quelle/);
    expect(() => pruefeAussagen([zwei, zwei], klein, quellen)).toThrow(/Doppelte/);
  });

  it('verändert weder Aussagen noch Kontext', () => {
    const aussagen = Object.freeze([Object.freeze({ ...zwei }), Object.freeze({ ...vier })]);
    const vorher = JSON.stringify({ aussagen, klein });
    pruefeAussagen(aussagen, klein, quellen);
    expect(JSON.stringify({ aussagen, klein })).toBe(vorher);
  });
});

describe('Evaluation', () => {
  const quellen: Quelle[] = [{ id: 'reise', status: 'aktuell' }];
  const bestand: RagDokument[] = [
    {
      id: 'reise',
      saetze: [
        { text: 'Reise beantragen.', vektor: [1, 0] },
        { text: 'Zweite Klasse.', vektor: [1, 1] },
        { text: 'Ab vier Stunden nicht.', vektor: [0, 1] },
      ],
    },
  ];
  const ersteKlasse: Aussage = {
    id: 'erste',
    text: 'Erste Klasse ab vier Stunden.',
    belege: [
      [
        { dokumentId: 'reise', satz: 1 },
        { dokumentId: 'reise', satz: 2 },
      ],
    ],
  };

  it('trennt Retrieval-Qualität von Antwortqualität', () => {
    const gross = chunkeBestand(bestand, GROSS); // 0–1, 1–2
    const geprueft = pruefeAussagen([ersteKlasse], gross, quellen);
    const bewertung = bewerteRag({
      geprueft,
      benoetigteAussagen: ['erste'],
      kontext: gross,
      alleChunks: gross,
    });
    // Ein tragender Chunk (1–2) von zwei im Kontext; einer von einem im Bestand.
    expect(bewertung).toMatchObject({
      kontextPrecision: 0.5,
      kontextRecall: 1,
      vollstaendigkeit: 1,
      fehlend: [],
      ungestuetzteFakten: 0,
      ergebnisKorrekt: true,
    });
  });

  it('meldet fehlende Aussagen und ein nicht definiertes Recall bei zerschnittenem Beleg', () => {
    const klein = chunkeBestand(bestand, KLEIN);
    const geprueft = pruefeAussagen([ersteKlasse], klein, quellen);
    const bewertung = bewerteRag({
      geprueft,
      benoetigteAussagen: ['erste'],
      kontext: klein,
      alleChunks: klein,
    });
    // Kein Chunk im Bestand trägt die Gruppe: Recall 0/0 ist nicht definiert.
    expect(bewertung).toMatchObject({
      kontextPrecision: 0,
      kontextRecall: null,
      vollstaendigkeit: 0,
      fehlend: ['erste'],
      ergebnisKorrekt: false,
    });
  });

  it('wertet „nicht genügend Informationen“ als richtig, wenn nichts benötigt wird', () => {
    const geprueft = pruefeAussagen(
      [{ id: 'x', text: 'Erfunden.', belege: [], zitierteQuelle: 'gibt-es-nicht' }],
      [],
      quellen,
    );
    const bewertung = bewerteRag({ geprueft, benoetigteAussagen: [], kontext: [], alleChunks: [] });
    expect(bewertung).toMatchObject({
      kontextPrecision: null,
      vollstaendigkeit: null,
      ergebnisKorrekt: true,
    });
  });

  it('lehnt eine unbekannte benötigte Aussage ab', () => {
    expect(() =>
      bewerteRag({ geprueft: [], benoetigteAussagen: ['fehlt'], kontext: [], alleChunks: [] }),
    ).toThrow(/unbekannt/);
  });
});
