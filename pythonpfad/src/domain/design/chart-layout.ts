/**
 * Geometrie für die Diagramme.
 *
 * Diagramme sind der Ort, an dem sich Darstellungsfehler am leichtesten
 * verstecken: Ein Balken, der bei einem Wert von null trotzdem einen Pixel
 * hoch ist, eine Skala, die bei einem einzelnen Ausreißer alles andere
 * plattdrückt, eine Achse, deren Beschriftung nicht zu den Linien passt. Man
 * sieht ein Bild, es sieht plausibel aus, und es stimmt nicht.
 *
 * Deshalb steht die Rechnung hier und nicht in der Komponente: Sie lässt sich
 * ohne Browser prüfen, und die Komponente kümmert sich nur noch um Farbe und
 * Beschriftung.
 */

// ---------------------------------------------------------------------------
// Säulendiagramm
// ---------------------------------------------------------------------------

export interface SaeuleEingabe {
  /** Beschriftung unter der Säule, etwa „Mo". */
  label: string;
  /** Gemessener Wert. Negative Werte gibt es hier nicht. */
  wert: number;
  /** Zusätzliche Angabe für die Vorlesefassung, etwa das Datum. */
  beschreibung?: string;
}

export interface Saeule extends SaeuleEingabe {
  index: number;
  /** Höhe in Prozent der Zeichenfläche, 0 bis 100. */
  hoehe: number;
  /** Ist dies der höchste Wert der Reihe? */
  istHoechster: boolean;
}

export interface SaeulenDiagramm {
  saeulen: Saeule[];
  /** Wert der obersten Rasterlinie. Immer eine runde Zahl. */
  skalenMaximum: number;
  /** Werte der Rasterlinien von unten nach oben, einschließlich null. */
  rasterlinien: number[];
  /** Höchster gemessener Wert – für die Textfassung. */
  hoechsterWert: number;
  /** Summe aller Werte – für die Textfassung. */
  summe: number;
}

/**
 * Rundet die Obergrenze der Skala auf einen gefälligen Wert auf.
 *
 * Eine Achse, die bei 7 endet, weil der höchste Wert 7 ist, wirkt willkürlich
 * und lässt sich nicht ablesen. Gesucht ist die nächste runde Zahl aus der
 * Reihe 1, 2, 5, 10, 20, 50 … – dieselbe Staffel, die jede brauchbare
 * Diagrammbibliothek benutzt, weil Menschen in ihr rechnen.
 */
export function rundeSkala(hoechsterWert: number): number {
  if (hoechsterWert <= 0) return 1;

  const groessenordnung = 10 ** Math.floor(Math.log10(hoechsterWert));
  const anteil = hoechsterWert / groessenordnung;

  const stufe = anteil <= 1 ? 1 : anteil <= 2 ? 2 : anteil <= 5 ? 5 : 10;
  return stufe * groessenordnung;
}

/**
 * Wählt die Anzahl der Abschnitte zwischen Grundlinie und Obergrenze.
 *
 * Fünf Abschnitte sind der Regelfall: Weniger lassen sich nicht ablesen, mehr
 * machen ein kleines Diagramm unruhig. Entscheidend ist aber, dass die
 * Beschriftung ganze Zahlen ergibt. Hier werden Aufgaben und Lerntage gezählt;
 * eine Achse, die „0,3 Aufgaben" behauptet, ist nicht bloß hässlich, sie ist
 * falsch – es gibt keine drittel Aufgabe.
 *
 * Das betrifft ausschließlich die beiden kleinsten Obergrenzen der Staffel: 1
 * bekommt einen Abschnitt, 2 bekommt zwei. Alles ab 5 ist durch fünf teilbar.
 */
function waehleAbschnitte(skalenMaximum: number): number {
  for (const anzahl of [5, 4, 3, 2]) {
    if (skalenMaximum % anzahl === 0) return anzahl;
  }
  return 1;
}

/**
 * Baut ein Säulendiagramm.
 *
 * Ein Wert von null ergibt ausdrücklich die Höhe null und nicht eine
 * Mindesthöhe. Ein Tag ohne Übung ist ein Tag ohne Übung; ein Stummel, der
 * so aussieht wie „ein bisschen", wäre eine Verfälschung. Die Komponente
 * zeichnet stattdessen ein flaches Feld, das sichtbar bleibt.
 */
export function baueSaeulen(eingaben: readonly SaeuleEingabe[]): SaeulenDiagramm {
  const werte = eingaben.map((eintrag) => Math.max(0, eintrag.wert));
  const hoechsterWert = werte.length > 0 ? Math.max(...werte) : 0;
  const skalenMaximum = rundeSkala(hoechsterWert);

  const abschnitte = waehleAbschnitte(skalenMaximum);
  const rasterlinien = Array.from(
    { length: abschnitte + 1 },
    (_, index) => (skalenMaximum / abschnitte) * index,
  );

  const saeulen = eingaben.map((eintrag, index) => {
    const wert = Math.max(0, eintrag.wert);
    return {
      ...eintrag,
      wert,
      index,
      hoehe: skalenMaximum === 0 ? 0 : (wert / skalenMaximum) * 100,
      istHoechster: wert > 0 && wert === hoechsterWert,
    };
  });

  return {
    saeulen,
    skalenMaximum,
    rasterlinien,
    hoechsterWert,
    summe: werte.reduce((summe, wert) => summe + wert, 0),
  };
}

// ---------------------------------------------------------------------------
// Verlaufslinie
// ---------------------------------------------------------------------------

export interface LinienPunkt {
  x: number;
  y: number;
}

export interface Verlaufslinie {
  /** `d`-Wert für die Linie. */
  pfad: string;
  /** `d`-Wert für die gefüllte Fläche darunter. Leer, wenn es nichts zu füllen gibt. */
  flaeche: string;
  punkte: LinienPunkt[];
}

/**
 * Zeichnet eine Reihe von Werten als weiche Linie.
 *
 * Die Werte werden auf eine Fläche von `breite` × `hoehe` abgebildet, wobei
 * `y = 0` oben liegt (SVG-Konvention) und der höchste Wert entsprechend oben
 * landet.
 *
 * Geglättet wird mit kubischen Bézierkurven, deren Steuerpunkte waagerecht
 * zwischen zwei Punkten liegen. Das ist bewusst eine schwache Glättung: Eine
 * stärkere würde die Kurve zwischen zwei Messpunkten über deren Werte hinaus
 * ausschlagen lassen – man sähe Zwischenstände, die es nie gab.
 */
export function baueVerlaufslinie(
  werte: readonly number[],
  optionen: { breite?: number; hoehe?: number; maximum?: number } = {},
): Verlaufslinie {
  const breite = optionen.breite ?? 100;
  const hoehe = optionen.hoehe ?? 40;

  if (werte.length === 0) return { pfad: '', flaeche: '', punkte: [] };

  const maximum = optionen.maximum ?? Math.max(...werte, 1);
  const schritt = werte.length === 1 ? 0 : breite / (werte.length - 1);

  const punkte = werte.map((wert, index) => ({
    x: Math.round(index * schritt * 100) / 100,
    y: Math.round((hoehe - (Math.max(0, wert) / maximum) * hoehe) * 100) / 100,
  }));

  const [erster, ...rest] = punkte;
  if (!erster) return { pfad: '', flaeche: '', punkte: [] };

  let pfad = `M ${erster.x} ${erster.y}`;
  let vorheriger = erster;
  for (const punkt of rest) {
    const mitte = Math.round(((vorheriger.x + punkt.x) / 2) * 100) / 100;
    pfad += ` C ${mitte} ${vorheriger.y}, ${mitte} ${punkt.y}, ${punkt.x} ${punkt.y}`;
    vorheriger = punkt;
  }

  const letzter = punkte[punkte.length - 1]!;
  const flaeche = `${pfad} L ${letzter.x} ${hoehe} L ${erster.x} ${hoehe} Z`;

  return { pfad, flaeche, punkte };
}

// ---------------------------------------------------------------------------
// Ringdiagramm
// ---------------------------------------------------------------------------

export interface RingAbschnitt {
  /** Anteil am Ganzen, 0 bis 1. */
  anteil: number;
  /** Länge des gefüllten Teils in Benutzereinheiten. */
  laenge: number;
  /** Verschiebung, damit der Abschnitt an der richtigen Stelle beginnt. */
  versatz: number;
}

/**
 * Teilt einen Ring in Abschnitte auf.
 *
 * Gedacht für `stroke-dasharray` und `stroke-dashoffset`: Jeder Abschnitt wird
 * als eigener Kreis mit derselben Geometrie gezeichnet, aber unterschiedlichem
 * Versatz. Das ist deutlich weniger Rechnerei als Kreissegmente aus Bögen
 * zusammenzusetzen, und die Übergänge lassen sich animieren.
 *
 * Anteile, die zusammen mehr als eins ergeben, werden gestaucht – sonst liefe
 * der letzte Abschnitt über den Anfang und der Ring sähe voller aus, als er
 * ist.
 */
export function baueRing(werte: readonly number[], umfang: number): RingAbschnitt[] {
  const positiv = werte.map((wert) => Math.max(0, wert));
  const summe = positiv.reduce((gesamt, wert) => gesamt + wert, 0);
  if (summe <= 0) return positiv.map(() => ({ anteil: 0, laenge: 0, versatz: 0 }));

  let gelaufen = 0;
  return positiv.map((wert) => {
    const anteil = wert / summe;
    const abschnitt = {
      anteil,
      laenge: Math.round(anteil * umfang * 100) / 100,
      versatz: Math.round(-gelaufen * umfang * 100) / 100,
    };
    gelaufen += anteil;
    return abschnitt;
  });
}
