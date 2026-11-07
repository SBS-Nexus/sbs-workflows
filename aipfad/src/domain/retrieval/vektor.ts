/**
 * Vektorrechnung für das Retrieval-Modul (Stufe 9).
 *
 * Reine Funktionen ohne Framework, Datenbank oder Zufall. Jede Funktion
 * liest ihre Eingaben nur und gibt neue Werte zurück — keine wird verändert.
 *
 * Ungültige Eingaben werden NICHT stillschweigend in ein Ergebnis verwandelt.
 * Wer zwei Vektoren unterschiedlicher Länge vergleicht, einen Nullvektor
 * normiert oder NaN hineingibt, bekommt einen `VektorFehler` mit Code statt
 * einer Zahl, die nach Ergebnis aussieht. Ein Score von 0 für "konnte nicht
 * rechnen" wäre von einem echten Score 0 ("steht senkrecht") nicht zu
 * unterscheiden.
 */

export type VektorFehlerCode =
  'KEIN_ARRAY' | 'LEER' | 'NICHT_ENDLICH' | 'DIMENSION' | 'NULLVEKTOR' | 'UEBERLAUF';

export class VektorFehler extends Error {
  readonly code: VektorFehlerCode;

  constructor(code: VektorFehlerCode, message: string) {
    super(message);
    this.name = 'VektorFehler';
    this.code = code;
  }
}

/** Ein Vektor ist hier eine nicht leere Liste endlicher Zahlen. */
export type Vektor = readonly number[];

/**
 * Prüft einen Vektor und wirft bei jeder Verletzung. `name` taucht in der
 * Meldung auf, damit klar ist, WELCHER Vektor das Problem hat.
 */
export function pruefeVektor(wert: unknown, name = 'Vektor'): asserts wert is Vektor {
  if (!Array.isArray(wert)) {
    throw new VektorFehler('KEIN_ARRAY', `${name} ist keine Zahlenliste.`);
  }
  if (wert.length === 0) {
    throw new VektorFehler('LEER', `${name} hat keine Dimension.`);
  }
  for (const [index, komponente] of wert.entries()) {
    if (typeof komponente !== 'number' || !Number.isFinite(komponente)) {
      throw new VektorFehler(
        'NICHT_ENDLICH',
        `${name}[${index}] ist keine endliche Zahl (${String(komponente)}).`,
      );
    }
  }
}

function pruefeGleicheDimension(a: Vektor, b: Vektor, nameA: string, nameB: string): void {
  if (a.length !== b.length) {
    throw new VektorFehler(
      'DIMENSION',
      `${nameA} hat ${a.length} Dimensionen, ${nameB} hat ${b.length}. Nur gleich lange Vektoren sind vergleichbar.`,
    );
  }
}

function endlichOderFehler(wert: number, was: string): number {
  // Endliche, aber sehr große Komponenten können beim Multiplizieren über
  // Number.MAX_VALUE hinauslaufen. Auch das wird gemeldet statt als
  // Infinity weitergereicht.
  if (!Number.isFinite(wert)) {
    throw new VektorFehler('UEBERLAUF', `${was} ist zu groß für eine endliche Zahl.`);
  }
  return wert;
}

/** Komponentenweise Produkte a[i]·b[i] — die Summanden des Skalarprodukts. */
export function komponentenProdukte(
  a: unknown,
  b: unknown,
  namen: { a?: string; b?: string } = {},
): number[] {
  const { va, vb } = pruefePaar(a, b, namen);
  return va.map((wert, index) => wert * (vb[index] as number));
}

/** Skalarprodukt Σ a[i]·b[i]. */
export function skalarprodukt(a: unknown, b: unknown): number {
  const summe = komponentenProdukte(a, b).reduce((acc, produkt) => acc + produkt, 0);
  return endlichOderFehler(summe, 'Das Skalarprodukt');
}

/** Euklidische Länge √(Σ v[i]²). */
export function vektornorm(v: unknown): number {
  pruefeVektor(v);
  // Skaliert über den größten Betrag, damit große Komponenten beim Quadrieren
  // nicht überlaufen. Für die kleinen Werte des Labs ändert das nichts am
  // Ergebnis, macht die Funktion aber auch außerhalb davon belastbar.
  const groesster = Math.max(...v.map((wert) => Math.abs(wert)));
  if (groesster === 0) return 0;
  const summe = v.reduce((acc, wert) => acc + (wert / groesster) ** 2, 0);
  return endlichOderFehler(groesster * Math.sqrt(summe), 'Die Vektorlänge');
}

/** Vollständiger, nachvollziehbarer Rechenweg einer Kosinusähnlichkeit. */
export interface KosinusRechnung {
  /** a[i]·b[i] je Dimension. */
  produkte: number[];
  skalarprodukt: number;
  normA: number;
  normB: number;
  /** skalarprodukt / (normA · normB), im Intervall [−1, 1]. */
  kosinus: number;
}

interface GepruftesPaar {
  va: Vektor;
  vb: Vektor;
  nameA: string;
  nameB: string;
}

/** Prüft beide Vektoren und ihre Dimension — in dieser Reihenfolge. */
function pruefePaar(a: unknown, b: unknown, namen: { a?: string; b?: string }): GepruftesPaar {
  const nameA = namen.a ?? 'Vektor a';
  const nameB = namen.b ?? 'Vektor b';
  pruefeVektor(a, nameA);
  pruefeVektor(b, nameB);
  pruefeGleicheDimension(a, b, nameA, nameB);
  return { va: a, vb: b, nameA, nameB };
}

/**
 * Längen und Kosinus über die normierten Vektoren. So läuft auch bei sehr
 * großen Komponenten kein Zwischenwert über, selbst wenn das Skalarprodukt
 * selbst nicht mehr darstellbar wäre.
 */
function normenUndKosinus({ va, vb, nameA, nameB }: GepruftesPaar): {
  normA: number;
  normB: number;
  kosinus: number;
} {
  const normA = vektornorm(va);
  const normB = vektornorm(vb);
  if (normA === 0) {
    throw new VektorFehler('NULLVEKTOR', `${nameA} ist ein Nullvektor und hat keine Richtung.`);
  }
  if (normB === 0) {
    throw new VektorFehler('NULLVEKTOR', `${nameB} ist ein Nullvektor und hat keine Richtung.`);
  }

  const normiert = va.reduce((acc, wert, index) => {
    return acc + (wert / normA) * ((vb[index] as number) / normB);
  }, 0);

  // Nach Cauchy-Schwarz liegt der Wert in [−1, 1]. Gleitkomma-Rundung kann
  // ihn um wenige Einheiten der letzten Stelle darüber schieben (etwa
  // 1.0000000000000002 für zwei gleiche Vektoren). Nur dieses Rauschen wird
  // begrenzt; ein echter Rechenfehler wäre um Größenordnungen größer.
  const kosinus = Math.min(1, Math.max(-1, normiert));
  return { normA, normB, kosinus };
}

/**
 * Kosinusähnlichkeit samt Rechenweg.
 *
 * Für einen Nullvektor ist der Kosinus mathematisch nicht definiert (Division
 * durch 0). Das ist kein Randfall, den man mit 0 "auffängt", sondern ein
 * eigener Fehler: Ein Nullvektor hat keine Richtung, also auch keine
 * Ähnlichkeit zu irgendetwas.
 *
 * Der Rechenweg enthält Produkte und Skalarprodukt im Klartext. Sind die
 * nicht mehr als endliche Zahl darstellbar, meldet die Funktion `UEBERLAUF`
 * — ein Rechenweg mit "Infinity" erklärte nichts. Wer nur den Wert braucht,
 * nimmt `kosinusAehnlichkeit()`, das ohne diese Zwischenwerte auskommt.
 */
export function kosinusRechnung(
  a: unknown,
  b: unknown,
  namen: { a?: string; b?: string } = {},
): KosinusRechnung {
  const paar = pruefePaar(a, b, namen);
  const { normA, normB, kosinus } = normenUndKosinus(paar);

  const produkte = paar.va.map((wert, index) =>
    endlichOderFehler(wert * (paar.vb[index] as number), `Das Produkt in Dimension ${index}`),
  );
  const summe = endlichOderFehler(
    produkte.reduce((acc, produkt) => acc + produkt, 0),
    'Das Skalarprodukt',
  );

  return { produkte, skalarprodukt: summe, normA, normB, kosinus };
}

/** Kosinusähnlichkeit zweier Vektoren im Intervall [−1, 1]. */
export function kosinusAehnlichkeit(a: unknown, b: unknown): number {
  return normenUndKosinus(pruefePaar(a, b, {})).kosinus;
}
