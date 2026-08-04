/**
 * Anordnung des Lernpfads als geschwungene Strecke.
 *
 * Eine Liste untereinander sagt nichts darüber aus, dass die Lektionen einen
 * Weg bilden. Eine Strecke tut das: Sie hat eine Richtung, sie hat ein Vorher
 * und ein Nachher, und man sieht auf einen Blick, wie weit man gekommen ist.
 *
 * Die Berechnung steht hier und nicht in der Komponente, weil sie reine
 * Rechnung ist – damit ist sie ohne Browser prüfbar, und die Komponente bleibt
 * frei von Geometrie.
 *
 * Koordinatensystem: x läuft von 0 bis 100 (wird später als Prozent der
 * Breite gelesen), y in Pixeln. Diese Mischung ist Absicht: Die Strecke soll
 * sich in der Breite dem Fenster anpassen, in der Höhe aber überall gleich
 * viel Platz je Lektion lassen.
 */

export interface TrailPoint {
  /** Position in der Liste, bei 0 beginnend. */
  index: number;
  /** Waagerecht, 0 bis 100. */
  x: number;
  /** Senkrecht, in Pixeln ab dem oberen Rand. */
  y: number;
}

export interface TrailLayout {
  points: TrailPoint[];
  /** Fertiger `d`-Wert für das SVG-Pfadelement. Leer, wenn es nichts zu zeichnen gibt. */
  path: string;
  /** Gesamthöhe in Pixeln. */
  height: number;
}

export interface TrailOptions {
  /** Senkrechter Abstand zweier Punkte in Pixeln. */
  step?: number;
  /** Wie weit die Strecke höchstens von der Mitte abweicht (in x-Einheiten). */
  amplitude?: number;
}

const STANDARD_STEP = 108;
const STANDARD_AMPLITUDE = 24;

/**
 * Der Ausschlag folgt einer Sinuswelle mit der Periode 4.
 *
 * Damit ergibt sich Mitte → rechts → Mitte → links → Mitte. Eine Periode von 2
 * (nur links/rechts im Wechsel) sähe wie eine Zickzacklinie aus; die Periode 4
 * ergibt eine ruhige Schlangenlinie, die auch bei vielen Lektionen nicht
 * unruhig wirkt.
 */
function offsetFor(index: number, amplitude: number): number {
  return Math.sin((index * Math.PI) / 2) * amplitude;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function layoutTrail(count: number, options: TrailOptions = {}): TrailLayout {
  const step = options.step ?? STANDARD_STEP;
  const amplitude = options.amplitude ?? STANDARD_AMPLITUDE;

  if (count <= 0) {
    return { points: [], path: '', height: 0 };
  }

  const points: TrailPoint[] = Array.from({ length: count }, (_, index) => ({
    index,
    x: round(50 + offsetFor(index, amplitude)),
    y: round(step / 2 + index * step),
  }));

  return { points, path: buildPath(points), height: round(count * step) };
}

/**
 * Verbindet die Punkte zu einer weichen Linie.
 *
 * Zwischen zwei Punkten liegt eine kubische Bézierkurve, deren Steuerpunkte
 * senkrecht über und unter den Endpunkten liegen. Dadurch verlässt und trifft
 * die Linie jeden Punkt senkrecht – die Übergänge sind knickfrei, ohne dass
 * dafür gerechnet werden müsste.
 */
function buildPath(points: readonly TrailPoint[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  if (rest.length === 0) return `M ${first.x} ${first.y}`;

  let d = `M ${first.x} ${first.y}`;
  let previous = first;
  for (const point of rest) {
    const mitte = round((previous.y + point.y) / 2);
    d += ` C ${previous.x} ${mitte}, ${point.x} ${mitte}, ${point.x} ${point.y}`;
    previous = point;
  }
  return d;
}
