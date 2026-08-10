/**
 * Kontrastberechnung nach WCAG 2.2.
 *
 * Farbentscheidungen lassen sich nicht mit dem Auge prüfen. „Sieht gut lesbar
 * aus" heißt bei einem hellen Grau auf Weiß regelmäßig 3:1 – und damit
 * unlesbar für einen erheblichen Teil der Menschen, für die diese Anwendung
 * gedacht ist. Deshalb steht die Rechnung hier und wird geprüft.
 *
 * Die Formel stammt aus WCAG 2.2, Abschnitt 1.4.3.
 */

/** Wandelt einen Kanalwert 0–255 in seinen linearen Anteil um. */
function linearerAnteil(wert: number): number {
  const anteil = wert / 255;
  return anteil <= 0.03928 ? anteil / 12.92 : ((anteil + 0.055) / 1.055) ** 2.4;
}

/**
 * Relative Leuchtdichte einer Farbe, 0 (schwarz) bis 1 (weiß).
 *
 * Die drei Kanäle gehen unterschiedlich stark ein: Grün wiegt am schwersten,
 * Blau am leichtesten. Das bildet die Empfindlichkeit des Auges ab und ist der
 * Grund, warum ein sattes Blau dunkler wirkt als ein gleich „kräftiges" Grün.
 */
export function leuchtdichte(hex: string): number {
  const bereinigt = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(bereinigt)) {
    throw new Error(`Kein sechsstelliger Hexwert: "${hex}"`);
  }

  const [rot, gruen, blau] = [0, 2, 4].map((versatz) =>
    linearerAnteil(Number.parseInt(bereinigt.slice(versatz, versatz + 2), 16)),
  ) as [number, number, number];

  return 0.2126 * rot + 0.7152 * gruen + 0.0722 * blau;
}

/**
 * Kontrastverhältnis zweier Farben, 1:1 bis 21:1.
 *
 * Die Reihenfolge der Angaben spielt keine Rolle – das Verhältnis ist
 * symmetrisch.
 */
export function kontrastverhaeltnis(einer: string, anderer: string): number {
  const werte = [leuchtdichte(einer), leuchtdichte(anderer)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (werte[0] + 0.05) / (werte[1] + 0.05);
}

/** Mindestverhältnisse nach WCAG 2.2 Stufe AA. */
export const AA_FLIESSTEXT = 4.5;
export const AA_GROSSE_SCHRIFT = 3;
