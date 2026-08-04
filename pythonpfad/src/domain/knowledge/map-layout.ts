/**
 * Anordnung der Wissenslandkarte.
 *
 * Der Konzeptgraph des Kurses ist gerichtet und kreisfrei: Jedes Konzept nennt
 * seine Voraussetzungen, und keine Kette führt im Kreis. Genau diese Struktur
 * lässt sich in Ebenen zerlegen – Ebene 0 sind die Konzepte ohne
 * Voraussetzung, Ebene n die, deren Voraussetzungen spätestens auf Ebene n−1
 * liegen. Das ergibt eine Darstellung, die von links nach rechts gelesen genau
 * der Reihenfolge entspricht, in der man die Dinge lernen kann.
 *
 * Warum ein eigenes Layout statt einer Graphenbibliothek: Der Graph ist klein
 * (Größenordnung dreißig Knoten), die Struktur ist bekannt, und das Ergebnis
 * soll auf jedem Gerät gleich aussehen. Ein kräftebasiertes Verfahren würde
 * bei jedem Aufruf leicht anders anordnen – bei einer Landkarte, in der man
 * sich wiederfinden soll, ist das ein Nachteil und kein Merkmal.
 */

export interface ConceptNodeInput {
  slug: string;
  name: string;
  /** Slugs der Konzepte, die vorher sinnvoll sind. */
  prerequisiteSlugs: readonly string[];
  /** 1–5. */
  difficulty: number;
}

export interface LayoutNode extends ConceptNodeInput {
  /** Ebene im Graphen, 0 = ohne Voraussetzung. */
  level: number;
  /** Position innerhalb der Ebene, 0-basiert. */
  slot: number;
  x: number;
  y: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MapLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  /** Anzahl der Ebenen. */
  levels: number;
}

/** Abstände in Nutzereinheiten des SVG-Koordinatensystems. */
const SPALTE = 200;
const ZEILE = 78;
const RAND_X = 110;
const RAND_Y = 46;

/**
 * Berechnet die Ebene jedes Konzepts.
 *
 * Ein Konzept liegt eine Ebene unter seiner spätesten Voraussetzung. Fehlende
 * Voraussetzungen (etwa ein Tippfehler im Inhalt) werden übergangen statt
 * einen Fehler auszulösen: Eine Landkarte, die wegen eines einzelnen falschen
 * Verweises gar nicht erscheint, hilft niemandem.
 *
 * Sollte der Graph wider Erwarten doch einen Kreis enthalten, bricht die
 * Berechnung nicht ab, sondern ordnet die betroffenen Konzepte der höchsten
 * bis dahin bekannten Ebene zu. Der Zyklus wird zusätzlich gemeldet, damit die
 * Inhaltsprüfung ihn finden kann.
 */
export function assignLevels(concepts: readonly ConceptNodeInput[]): {
  levels: Map<string, number>;
  cycles: string[];
} {
  const bekannt = new Set(concepts.map((concept) => concept.slug));
  const bySlug = new Map(concepts.map((concept) => [concept.slug, concept]));
  const levels = new Map<string, number>();
  const inArbeit = new Set<string>();
  const cycles: string[] = [];

  const bestimme = (slug: string): number => {
    const vorhanden = levels.get(slug);
    if (vorhanden !== undefined) return vorhanden;

    if (inArbeit.has(slug)) {
      // Kreis entdeckt. Wir brechen die Kette hier ab und merken uns das.
      if (!cycles.includes(slug)) cycles.push(slug);
      return 0;
    }

    const concept = bySlug.get(slug);
    if (!concept) return 0;

    inArbeit.add(slug);
    let hoechste = -1;
    for (const voraussetzung of concept.prerequisiteSlugs) {
      if (!bekannt.has(voraussetzung)) continue;
      hoechste = Math.max(hoechste, bestimme(voraussetzung));
    }
    inArbeit.delete(slug);

    const ebene = hoechste + 1;
    levels.set(slug, ebene);
    return ebene;
  };

  for (const concept of concepts) bestimme(concept.slug);
  return { levels, cycles };
}

/**
 * Ordnet die Konzepte an.
 *
 * Innerhalb einer Ebene wird nach Schwierigkeit und dann nach Namen sortiert.
 * Das ist stabil und für die lesende Person nachvollziehbar – anders als eine
 * Sortierung nach Datenbankreihenfolge, die sich beim nächsten Seeding ändern
 * könnte.
 */
export function layoutConceptMap(concepts: readonly ConceptNodeInput[]): MapLayout {
  if (concepts.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0, levels: 0 };
  }

  const { levels } = assignLevels(concepts);

  const proEbene = new Map<number, ConceptNodeInput[]>();
  for (const concept of concepts) {
    const ebene = levels.get(concept.slug) ?? 0;
    const liste = proEbene.get(ebene);
    if (liste) liste.push(concept);
    else proEbene.set(ebene, [concept]);
  }

  const nodes: LayoutNode[] = [];
  const maxEbene = Math.max(...proEbene.keys());
  let maxSlots = 0;

  for (let ebene = 0; ebene <= maxEbene; ebene += 1) {
    const liste = [...(proEbene.get(ebene) ?? [])].sort((a, b) => {
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      return a.name.localeCompare(b.name, 'de');
    });
    maxSlots = Math.max(maxSlots, liste.length);

    liste.forEach((concept, slot) => {
      nodes.push({
        ...concept,
        level: ebene,
        slot,
        x: RAND_X + ebene * SPALTE,
        y: RAND_Y + slot * ZEILE,
      });
    });
  }

  const byId = new Map(nodes.map((node) => [node.slug, node]));
  const edges: LayoutEdge[] = [];
  for (const node of nodes) {
    for (const voraussetzung of node.prerequisiteSlugs) {
      const von = byId.get(voraussetzung);
      if (!von) continue;
      edges.push({ from: von.slug, to: node.slug, x1: von.x, y1: von.y, x2: node.x, y2: node.y });
    }
  }

  return {
    nodes,
    edges,
    width: RAND_X * 2 + maxEbene * SPALTE,
    height: RAND_Y * 2 + Math.max(0, maxSlots - 1) * ZEILE,
    levels: maxEbene + 1,
  };
}

/**
 * Alle Konzepte, die auf einem Konzept aufbauen – direkt und indirekt.
 *
 * Wird gebraucht, um beim Auswählen eines Knotens zu zeigen, wofür er die
 * Grundlage bildet. Das beantwortet die häufigste Frage vor der Landkarte:
 * „Warum soll ich das können?"
 */
export function dependentsOf(concepts: readonly ConceptNodeInput[], slug: string): string[] {
  const direkt = new Map<string, string[]>();
  for (const concept of concepts) {
    for (const voraussetzung of concept.prerequisiteSlugs) {
      const liste = direkt.get(voraussetzung);
      if (liste) liste.push(concept.slug);
      else direkt.set(voraussetzung, [concept.slug]);
    }
  }

  const ergebnis = new Set<string>();
  const offen = [...(direkt.get(slug) ?? [])];
  while (offen.length > 0) {
    const aktuell = offen.pop();
    if (aktuell === undefined || ergebnis.has(aktuell)) continue;
    ergebnis.add(aktuell);
    offen.push(...(direkt.get(aktuell) ?? []));
  }

  return [...ergebnis].sort();
}
