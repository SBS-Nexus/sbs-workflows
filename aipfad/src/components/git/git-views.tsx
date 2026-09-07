import { Badge, cx } from '@/components/ui/primitives';
import type { DateiStatus } from '@/domain/git/working-tree';
import { baueGraph } from '@/domain/git/branches';

/**
 * Darstellungen für Git-Zustände.
 *
 * Bewusst als reine Anzeigekomponenten ohne eigenen Zustand: Dieselben
 * Ansichten werden in Aufgaben (Interpretation) und in Labs gebraucht. Eine
 * zweite, leicht abweichende Fassung wäre die sichere Quelle für Widersprüche
 * zwischen "was die Aufgabe zeigt" und "was das Lab zeigt".
 *
 * Alle Ansichten sind reiner Text und Standardelemente — keine Zeichenfläche,
 * keine Maus-Interaktion als einziger Weg. Das hält sie mit der Tastatur und
 * mit einer Vorlesehilfe bedienbar.
 */

// ---------------------------------------------------------------------------
// git status
// ---------------------------------------------------------------------------

const STATUS_BESCHRIFTUNG: Record<DateiStatus, string> = {
  untracked: 'unversioniert',
  modified: 'geändert',
  staged: 'vorgemerkt',
  committed: 'unverändert',
};

const STATUS_TON: Record<DateiStatus, 'neutral' | 'caution' | 'success' | 'info'> = {
  untracked: 'neutral',
  modified: 'caution',
  staged: 'info',
  committed: 'success',
};

export interface StatusZeile {
  pfad: string;
  status: DateiStatus;
  auchUngestagt?: boolean;
}

export function GitStatusAnsicht({ eintraege }: { eintraege: StatusZeile[] }): React.ReactElement {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">Dateien und ihr Git-Zustand</caption>
      <thead>
        <tr className="border-b border-[var(--border)]">
          <th scope="col" className="py-1.5 pr-3 font-medium text-[var(--fg-muted)]">
            Datei
          </th>
          <th scope="col" className="py-1.5 font-medium text-[var(--fg-muted)]">
            Zustand
          </th>
        </tr>
      </thead>
      <tbody>
        {eintraege.map((eintrag) => (
          <tr key={eintrag.pfad} className="border-b border-[var(--border)] last:border-0">
            <td className="py-1.5 pr-3 font-mono text-xs">{eintrag.pfad}</td>
            <td className="py-1.5">
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge tone={STATUS_TON[eintrag.status]}>
                  {STATUS_BESCHRIFTUNG[eintrag.status]}
                </Badge>
                {eintrag.auchUngestagt && eintrag.status === 'staged' ? (
                  <Badge tone="caution">zusätzlich geändert</Badge>
                ) : null}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

export interface DiffZeile {
  marke: 'kontext' | 'hinzu' | 'weg';
  text: string;
}

const DIFF_ZEICHEN: Record<DiffZeile['marke'], string> = {
  kontext: ' ',
  hinzu: '+',
  weg: '-',
};

/**
 * Ein Diff wird nicht allein über Farbe unterschieden: Jede Zeile trägt
 * vorne ihr Zeichen (+/-), damit die Bedeutung auch ohne Farbwahrnehmung
 * lesbar bleibt.
 */
export function DiffAnsicht({
  pfad,
  zeilen,
}: {
  pfad: string;
  zeilen: DiffZeile[];
}): React.ReactElement {
  return (
    <figure className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
      <figcaption className="border-b border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1.5 font-mono text-xs">
        {pfad}
      </figcaption>
      <div className="overflow-x-auto">
        <pre className="min-w-max p-3 font-mono text-xs leading-relaxed">
          {zeilen.map((zeile, index) => (
            <span
              key={index}
              className={cx(
                'block',
                zeile.marke === 'hinzu' &&
                  'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-100',
                zeile.marke === 'weg' &&
                  'bg-alert-100 text-alert-700 dark:bg-alert-900/40 dark:text-alert-100',
              )}
            >
              {DIFF_ZEICHEN[zeile.marke]}
              {zeile.text}
            </span>
          ))}
        </pre>
      </div>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Commit-Graph
// ---------------------------------------------------------------------------

export interface GraphCommit {
  id: string;
  nachricht: string;
  eltern: string[];
}

export interface CommitGraphProps {
  commits: GraphCommit[];
  /** Branchname -> Commit-Kennung. */
  branches: Record<string, string>;
  aktuellerBranch?: string;
}

/**
 * Der Commit-Graph als SVG mit vorangestellter Textfassung.
 *
 * Die Textfassung ist kein Zusatz für den Notfall, sondern der eigentliche
 * Inhalt: Sie steht für Vorlesehilfen zur Verfügung und trägt dieselbe
 * Aussage wie die Zeichnung. Die Zeichnung selbst ist deshalb
 * `aria-hidden`.
 */
export function CommitGraph({
  commits,
  branches,
  aktuellerBranch,
}: CommitGraphProps): React.ReactElement {
  // Die Anordnung kommt aus der Domainschicht — dieselbe Funktion, die auch
  // der Branch-Simulator nutzt. Eine zweite Fassung hier wäre die sichere
  // Quelle für Widersprüche zwischen Lab und Aufgabe.
  const knoten = baueGraph({
    commits,
    branches,
    aktuellerBranch: aktuellerBranch ?? Object.keys(branches)[0] ?? 'main',
  });
  const spalten = Math.max(1, ...knoten.map((k) => k.spalte + 1));
  const zeilen = Math.max(1, ...knoten.map((k) => k.zeile + 1));

  const ABSTAND_X = 104;
  const ABSTAND_Y = 66;
  const RAND = 26;
  const breite = RAND * 2 + (spalten - 1) * ABSTAND_X;
  const hoehe = RAND * 2 + (zeilen - 1) * ABSTAND_Y;

  const position = (id: string): { x: number; y: number } | null => {
    const k = knoten.find((n) => n.commit.id === id);
    if (!k) return null;
    return { x: RAND + k.spalte * ABSTAND_X, y: RAND + k.zeile * ABSTAND_Y };
  };

  return (
    <figure className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] p-3">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${breite} ${hoehe}`}
          width={breite}
          height={hoehe}
          aria-hidden="true"
          className="max-w-none"
        >
          {knoten.map((k) =>
            k.commit.eltern.map((elternId) => {
              const von = position(elternId);
              const bis = position(k.commit.id);
              if (!von || !bis) return null;
              return (
                <line
                  key={`${elternId}-${k.commit.id}`}
                  x1={von.x}
                  y1={von.y}
                  x2={bis.x}
                  y2={bis.y}
                  stroke="var(--border-strong)"
                  strokeWidth={2}
                />
              );
            }),
          )}
          {knoten.map((k) => {
            const p = position(k.commit.id);
            if (!p) return null;
            return (
              <g key={k.commit.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={11}
                  fill="var(--bg)"
                  stroke="var(--fg)"
                  strokeWidth={2}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="ui-monospace, monospace"
                  fill="var(--fg)"
                >
                  {k.commit.id}
                </text>
                {k.zeiger.length > 0 ? (
                  <text
                    x={p.x}
                    y={p.y - 18}
                    textAnchor="middle"
                    fontSize={10}
                    fontFamily="ui-monospace, monospace"
                    fill="var(--fg-muted)"
                  >
                    {k.zeiger.join(', ')}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <figcaption className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 text-xs">
        {knoten.map((k) => (
          <p key={k.commit.id}>
            <span className="font-mono">{k.commit.id}</span> — {k.commit.nachricht}
            {k.commit.eltern.length === 2 ? ' (Merge-Commit, zwei Eltern)' : ''}
            {k.zeiger.length > 0 ? (
              <>
                {' · '}
                <span className="font-medium">
                  {k.zeiger.map((z) => (z === aktuellerBranch ? `${z} (hier)` : z)).join(', ')}
                </span>
              </>
            ) : null}
          </p>
        ))}
      </figcaption>
    </figure>
  );
}
