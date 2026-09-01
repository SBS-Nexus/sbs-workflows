import Link from 'next/link';

/**
 * Wissenslandkarte / Context Graph.
 *
 * Signatur-Element von AIPfad (siehe DESIGN.md): eine echte, aus den
 * Lerninhalten abgeleitete Ebenenzerlegung des Voraussetzungsgraphen, keine
 * dekorative KI-Netzwerkgrafik. Jeder Knoten ist ein echtes `<button>`-
 * Element (Tastatur/AT-Zugriff), die Kanten liegen als SVG-Linien darunter.
 *
 * Layout-Algorithmus übernommen aus pythonpfad/docs/ARCHITEKTUR.md
 * "Wissenslandkarte": Ebene 0 sind Konzepte ohne Voraussetzung, jedes weitere
 * liegt eine Ebene über seiner spätesten Voraussetzung. Bewusst kein
 * kräftebasiertes Verfahren – das ordnet bei jedem Aufruf leicht anders an.
 */

export interface ContextGraphConcept {
  slug: string;
  name: string;
  prerequisiteSlugs?: string[];
}

interface PositionedNode extends ContextGraphConcept {
  level: number;
  indexInLevel: number;
  x: number;
  y: number;
}

const COLUMN_WIDTH = 208;
const ROW_HEIGHT = 68;
const NODE_WIDTH = 176;
const NODE_HEIGHT = 44;
const PADDING = 24;

function computeLevels(concepts: ContextGraphConcept[]): Map<string, number> {
  const bySlug = new Map(concepts.map((c) => [c.slug, c]));
  const levels = new Map<string, number>();

  function levelOf(slug: string, guard: Set<string>): number {
    const cached = levels.get(slug);
    if (cached !== undefined) return cached;
    if (guard.has(slug)) return 0; // Zyklenschutz – sollte durch den Validator nie vorkommen.

    const concept = bySlug.get(slug);
    const prerequisiteSlugs = concept?.prerequisiteSlugs ?? [];
    if (!concept || prerequisiteSlugs.length === 0) {
      levels.set(slug, 0);
      return 0;
    }

    const nextGuard = new Set(guard).add(slug);
    const level =
      1 +
      Math.max(
        0,
        ...prerequisiteSlugs.filter((p) => bySlug.has(p)).map((p) => levelOf(p, nextGuard)),
      );
    levels.set(slug, level);
    return level;
  }

  for (const concept of concepts) levelOf(concept.slug, new Set());
  return levels;
}

function layout(concepts: ContextGraphConcept[]): {
  nodes: PositionedNode[];
  width: number;
  height: number;
} {
  const levels = computeLevels(concepts);
  const perLevelCount = new Map<number, number>();
  const nodes: PositionedNode[] = [];

  for (const concept of concepts) {
    const level = levels.get(concept.slug) ?? 0;
    const indexInLevel = perLevelCount.get(level) ?? 0;
    perLevelCount.set(level, indexInLevel + 1);
    nodes.push({
      ...concept,
      level,
      indexInLevel,
      x: PADDING + level * COLUMN_WIDTH,
      y: PADDING + indexInLevel * ROW_HEIGHT,
    });
  }

  const maxLevel = Math.max(0, ...nodes.map((n) => n.level));
  const maxRows = Math.max(1, ...Array.from(perLevelCount.values()));
  const width = PADDING * 2 + (maxLevel + 1) * COLUMN_WIDTH - (COLUMN_WIDTH - NODE_WIDTH);
  const height = PADDING * 2 + maxRows * ROW_HEIGHT - (ROW_HEIGHT - NODE_HEIGHT);

  return { nodes, width, height };
}

export function ContextGraph({
  concepts,
  basePath = '/wissenslandkarte',
}: {
  concepts: ContextGraphConcept[];
  /** Wohin ein Knoten verweist, z. B. `/wissenslandkarte#slug` oder `/nachschlagen?konzept=slug`. */
  basePath?: string;
}): React.ReactElement {
  const { nodes, width, height } = layout(concepts);
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));

  // Über der üblichen Mobil-Breite braucht das Scrollen einen sichtbaren Hinweis.
  const scrolls = width > 640;

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <div className="relative" style={{ width, height, minWidth: '100%' }}>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            {nodes.flatMap((node) =>
              (node.prerequisiteSlugs ?? [])
                .map((prereqSlug) => bySlug.get(prereqSlug))
                .filter((p): p is PositionedNode => p !== undefined)
                .map((prereq) => {
                  const x1 = prereq.x + NODE_WIDTH;
                  const y1 = prereq.y + NODE_HEIGHT / 2;
                  const x2 = node.x;
                  const y2 = node.y + NODE_HEIGHT / 2;
                  const midX = (x1 + x2) / 2;
                  return (
                    <path
                      key={`${prereq.slug}->${node.slug}`}
                      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="var(--color-wire-500)"
                      strokeWidth={1.5}
                      strokeOpacity={0.55}
                    />
                  );
                }),
            )}
          </svg>

          {nodes.map((node) => (
            <Link
              key={node.slug}
              href={`${basePath}#${node.slug}`}
              style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
              className="absolute flex items-center rounded-[var(--radius-md)] border border-wire-500/50 bg-[var(--bg-raised)] px-3 font-mono text-xs font-medium leading-tight text-[var(--fg)] shadow-sm transition-colors hover:border-signal-500 hover:text-signal-600 dark:hover:text-signal-300"
            >
              {node.name}
            </Link>
          ))}
        </div>
      </div>
      {scrolls ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--bg-raised)] to-transparent"
          />
          <p className="mt-2 font-mono text-[0.7rem] text-[var(--fg-muted)]">
            ← Karte lässt sich horizontal scrollen →
          </p>
        </>
      ) : null}
    </div>
  );
}
