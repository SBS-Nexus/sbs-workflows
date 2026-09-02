'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Badge, Button, Callout, cx } from '@/components/ui/primitives';
import { LabCompleteButton } from './lab-complete-button';
import {
  bearbeiteDatei,
  fuehreGitBefehlAus,
  status,
  UMGESETZTE_GIT_BEFEHLE,
  type GitArbeitsbaumZustand,
} from '@/domain/git/working-tree';

const configSchema = z.object({
  dateien: z.array(
    z.object({
      pfad: z.string(),
      arbeitsbaum: z.string().optional(),
      index: z.string().optional(),
      head: z.string().optional(),
    }),
  ),
  commits: z
    .array(
      z.object({
        id: z.string(),
        nachricht: z.string(),
        stand: z.record(z.string(), z.string()),
      }),
    )
    .default([]),
  /** Vorgeschlagene Bearbeitungen, damit man ohne Editor etwas ändern kann. */
  bearbeitungen: z
    .array(z.object({ pfad: z.string(), inhalt: z.string(), beschriftung: z.string() }))
    .default([]),
});

/**
 * Das Git-State-Lab.
 *
 * Kern des Labs ist die Vorhersage: Man ändert etwas, überlegt, was
 * `git status` jetzt zeigt — und prüft es erst dann. Deshalb steht die
 * Zustandsanzeige der drei Orte dauerhaft daneben: Sie macht sichtbar, was
 * `git status` in Worten beschreibt.
 */
export function GitStateLab({
  config,
  onCompleteAction,
}: {
  config: unknown;
  onCompleteAction: () => Promise<boolean>;
}): React.ReactElement {
  const { dateien, commits, bearbeitungen } = configSchema.parse(config);
  const start: GitArbeitsbaumZustand = { dateien, commits };

  const [zustand, setZustand] = useState<GitArbeitsbaumZustand>(start);
  const [verlauf, setVerlauf] = useState<{ befehl: string; ausgabe: string }[]>([]);
  const [eingabe, setEingabe] = useState('');

  function fuehreAus(roh: string): void {
    const befehl = roh.trim();
    if (!befehl) return;
    const ergebnis = fuehreGitBefehlAus(zustand, befehl);
    setZustand(ergebnis.zustand);
    setVerlauf((prev) => [...prev, { befehl, ausgabe: ergebnis.ausgabe }]);
    setEingabe('');
  }

  function bearbeite(pfad: string, inhalt: string): void {
    setZustand((prev) => bearbeiteDatei(prev, pfad, inhalt));
    setVerlauf((prev) => [...prev, { befehl: `(im Editor geändert: ${pfad})`, ausgabe: '' }]);
  }

  const eintraege = status(zustand);

  return (
    <div className="space-y-5">
      <DreiOrte zustand={zustand} />

      {bearbeitungen.length > 0 ? (
        <div>
          <p className="mb-2 text-sm text-[var(--fg-muted)]">
            Ändere etwas — so, als hättest du die Datei im Editor bearbeitet:
          </p>
          <div className="flex flex-wrap gap-2">
            {bearbeitungen.map((b) => (
              <Button
                key={`${b.pfad}-${b.beschriftung}`}
                size="sm"
                variant="secondary"
                onClick={() => bearbeite(b.pfad, b.inhalt)}
              >
                {b.beschriftung}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 font-mono text-xs text-[var(--fg-muted)]">
          Verfügbar: {UMGESETZTE_GIT_BEFEHLE.join(', ')}
        </p>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-ink-900 p-4 font-mono text-sm text-ink-50">
          {verlauf.map((eintrag, index) => (
            <div key={index} className="mb-1.5">
              <p>
                <span className="text-signal-300">$</span> {eintrag.befehl}
              </p>
              {eintrag.ausgabe ? (
                <p className="whitespace-pre-wrap text-ink-200">{eintrag.ausgabe}</p>
              ) : null}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="text-signal-300">$</span>
            <input
              type="text"
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fuehreAus(eingabe);
              }}
              className="flex-1 bg-transparent outline-none"
              aria-label="Git-Befehl eingeben"
              placeholder="git status"
            />
          </div>
        </div>
      </div>

      {eintraege.some((e) => e.status === 'staged' && e.auchUngestagt) ? (
        <Callout tone="caution" title="Zwei Fassungen derselben Datei">
          Eine Datei ist vorgemerkt und wurde danach erneut geändert. Beim Commit kommt nur die
          vorgemerkte Fassung mit — die spätere Änderung bleibt liegen. Genau deshalb führt{' '}
          <code className="font-mono">git status</code> sie doppelt auf.
        </Callout>
      ) : null}

      <LabCompleteButton
        onCompleteAction={onCompleteAction}
        label="Fertig — Lab abschließen"
        disabled={verlauf.length === 0}
      />
    </div>
  );
}

/**
 * Die drei Orte nebeneinander.
 *
 * Das ist der eigentliche Lerngegenstand: Eine Datei liegt nicht "in Git",
 * sondern in bis zu drei Fassungen an drei Orten. Wer das einmal gesehen hat,
 * versteht `git add` nicht mehr als Formalie.
 */
function DreiOrte({ zustand }: { zustand: GitArbeitsbaumZustand }): React.ReactElement {
  const orte = [
    {
      titel: 'Arbeitsverzeichnis',
      erklaerung: 'Was du gerade bearbeitest',
      fassung: (d: GitArbeitsbaumZustand['dateien'][number]) => d.arbeitsbaum,
    },
    {
      titel: 'Staging Area',
      erklaerung: 'Was beim nächsten Commit mitkommt',
      fassung: (d: GitArbeitsbaumZustand['dateien'][number]) => d.index,
    },
    {
      titel: 'Repository',
      erklaerung: 'Was bereits festgehalten ist',
      fassung: (d: GitArbeitsbaumZustand['dateien'][number]) => d.head,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {orte.map((ort) => (
        <section
          key={ort.titel}
          className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] p-3"
        >
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.1em]">
            {ort.titel}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{ort.erklaerung}</p>
          <ul className="mt-2 space-y-1">
            {zustand.dateien.map((datei) => {
              const inhalt = ort.fassung(datei);
              return (
                <li key={datei.pfad} className="flex items-start justify-between gap-2 text-xs">
                  <span
                    className={cx(
                      'font-mono',
                      inhalt === undefined && 'text-[var(--fg-muted)] line-through',
                    )}
                  >
                    {datei.pfad}
                  </span>
                  {inhalt === undefined ? (
                    <Badge tone="neutral">fehlt</Badge>
                  ) : (
                    <span className="max-w-[9rem] truncate text-right text-[var(--fg-muted)]">
                      {inhalt || '(leer)'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
