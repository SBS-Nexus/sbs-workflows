'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Card, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import type { KnowledgeMapData, KnowledgeNode } from '@/server/services/knowledge-service';

/**
 * Wissenslandkarte.
 *
 * Aufbau: Die Verbindungslinien liegen in einem SVG, die Knoten darüber als
 * echte Schaltflächen. Damit ist die Bedienung nativ – Tabulator, Eingabetaste
 * und Leertaste funktionieren ohne Nachbau, der Fokusrahmen erscheint von
 * selbst, und die Namen stehen als Text im Dokument statt als SVG-Beschriftung.
 * Ein SVG mit nachgebauten Knopfrollen wäre kürzer, aber schlechter bedienbar.
 *
 * Gelesen wird von links nach rechts: Ganz links stehen die Konzepte ohne
 * Voraussetzung, weiter rechts das, was darauf aufbaut. Diese Richtung ist der
 * eigentliche Inhalt der Darstellung.
 *
 * Farbe steht nie allein: Jeder Knoten trägt zusätzlich seinen Kompetenzstand
 * als Text in der Beschriftung, und die Auswahl zeigt alles im Klartext.
 */

const BAND_FILL: Record<string, string> = {
  new: 'bg-[var(--surface-sunken)] border-[var(--border-strong)] text-[var(--text-muted)]',
  building: 'bg-[var(--caution-soft)] border-[var(--caution)] text-[var(--caution)]',
  usable: 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]',
  solid: 'bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]',
  durable: 'bg-[var(--success)] border-[var(--success)] text-[var(--text-inverse)]',
};

export function ConceptMap({ data }: { data: KnowledgeMapData }): React.ReactElement {
  const [selected, setSelected] = useState<string | null>(null);
  const node: KnowledgeNode | null = selected ? (data.nodes[selected] ?? null) : null;

  // Vorgänger und Nachfolger des ausgewählten Knotens werden hervorgehoben.
  // Ohne diese Hervorhebung ist ein Graph mit dreißig Knoten kaum zu lesen.
  const verwandt = useMemo(() => {
    if (!selected) return new Set<string>();
    const menge = new Set<string>([selected]);
    for (const edge of data.layout.edges) {
      if (edge.to === selected) menge.add(edge.from);
      if (edge.from === selected) menge.add(edge.to);
    }
    return menge;
  }, [selected, data.layout.edges]);

  if (data.layout.nodes.length === 0) {
    return (
      <Card>
        <p className="text-[var(--text-muted)]">
          Die Landkarte entsteht, sobald Kursinhalte eingespielt sind.
        </p>
      </Card>
    );
  }

  return (
    <Card as="section" aria-labelledby="landkarte-titel" className="card-accent group">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="landkarte-titel"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight"
          >
            <span aria-hidden="true" className="icon-tile size-9">
              <Icon name="karte" size={19} />
            </span>
            Wissenslandkarte
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Von links nach rechts gelesen: Was links steht, ist Voraussetzung für das rechts
            daneben. {data.startedPercent} Prozent der Konzepte hast du begonnen.
          </p>
        </div>
        {selected ? (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="min-h-10 rounded-lg border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-sunken)]"
          >
            Auswahl aufheben
          </button>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <div
          className="relative"
          style={{ width: `${data.layout.width}px`, height: `${data.layout.height}px` }}
        >
          <svg
            width={data.layout.width}
            height={data.layout.height}
            aria-hidden="true"
            className="absolute inset-0"
          >
            {data.layout.edges.map((edge) => {
              const hervor = verwandt.has(edge.from) && verwandt.has(edge.to);
              return (
                <line
                  key={`${edge.from}->${edge.to}`}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={hervor ? 'var(--accent)' : 'var(--border-strong)'}
                  strokeWidth={hervor ? 2 : 1}
                  opacity={selected && !hervor ? 0.25 : 1}
                />
              );
            })}
          </svg>

          <ul>
            {data.layout.nodes.map((position) => {
              const eintrag = data.nodes[position.slug];
              if (!eintrag) return null;
              const istAusgewaehlt = selected === position.slug;
              const gedimmt = selected !== null && !verwandt.has(position.slug);

              return (
                <li key={position.slug}>
                  <button
                    type="button"
                    onClick={() => setSelected(istAusgewaehlt ? null : position.slug)}
                    aria-pressed={istAusgewaehlt}
                    aria-label={`${eintrag.name}, ${eintrag.bandLabel}, Kompetenzwert ${eintrag.masteryScore} von 100`}
                    style={{
                      left: `${position.x}px`,
                      top: `${position.y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={cx(
                      'absolute max-w-[11rem] rounded-lg border px-2.5 py-1.5 text-center text-xs font-medium transition-opacity',
                      BAND_FILL[eintrag.band],
                      istAusgewaehlt && 'ring-2 ring-[var(--focus-ring)] ring-offset-1',
                      gedimmt && 'opacity-40',
                    )}
                  >
                    {eintrag.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
        {(
          [
            ['new', 'noch nicht begonnen'],
            ['building', 'im Aufbau'],
            ['usable', 'brauchbar'],
            ['solid', 'gefestigt'],
            ['durable', 'dauerhaft'],
          ] as const
        ).map(([band, label]) => (
          <span key={band} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-3 rounded border', BAND_FILL[band])} />
            {label}
          </span>
        ))}
      </p>

      {node ? <NodeDetails node={node} /> : null}
    </Card>
  );
}

function NodeDetails({ node }: { node: KnowledgeNode }): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-enter mt-4 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{node.name}</h3>
        <Badge
          tone={
            node.band === 'solid' || node.band === 'durable'
              ? 'success'
              : node.band === 'new'
                ? 'neutral'
                : node.band === 'building'
                  ? 'caution'
                  : 'info'
          }
        >
          {node.bandLabel}
        </Badge>
      </div>

      <p className="mt-2 text-[0.9375rem]">{node.description}</p>

      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Kompetenzwert
          </dt>
          <dd className="tabular-nums">{node.masteryScore} von 100</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Geschätzter Abruf heute
          </dt>
          <dd className="tabular-nums">
            {node.lastPracticedAt ? `${node.retentionPercent} Prozent` : 'noch nicht geübt'}
          </dd>
        </div>
        {node.daysUntilRefresh !== null ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Auffrischung lohnt sich
            </dt>
            <dd>
              {node.daysUntilRefresh === 0
                ? 'jetzt'
                : `in etwa ${node.daysUntilRefresh} ${node.daysUntilRefresh === 1 ? 'Tag' : 'Tagen'}`}
            </dd>
          </div>
        ) : null}
        {node.nextReviewAt ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Eingeplant für
            </dt>
            <dd>
              {new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(node.nextReviewAt)}
            </dd>
          </div>
        ) : null}
      </dl>

      {node.prerequisiteNames.length > 0 ? (
        <p className="mt-3 text-sm">
          <span className="font-medium">Setzt voraus:</span> {node.prerequisiteNames.join(', ')}
        </p>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Setzt nichts voraus – ein Einstiegspunkt.
        </p>
      )}

      {node.dependentNames.length > 0 ? (
        <p className="mt-1 text-sm">
          <span className="font-medium">Grundlage für:</span>{' '}
          {node.dependentNames.slice(0, 6).join(', ')}
          {node.dependentNames.length > 6 ? ` und ${node.dependentNames.length - 6} weitere` : ''}
        </p>
      ) : null}

      {node.lessons.length > 0 ? (
        <p className="mt-3 text-sm">
          <span className="font-medium">Kommt vor in:</span>{' '}
          {node.lessons.map((lesson, index) => (
            <span key={lesson.slug}>
              {index > 0 ? ', ' : ''}
              <Link href={`/lernen/${lesson.slug}`} className="text-[var(--accent)] underline">
                {lesson.title}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
