'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button, Callout } from '@/components/ui/primitives';
import { LabCompleteButton } from './lab-complete-button';
import { BefehlsKonsole } from './befehls-konsole';
import { CommitGraph } from '@/components/git/git-views';
import {
  fuehreBranchBefehlAus,
  mergeArt,
  UMGESETZTE_BRANCH_BEFEHLE,
  type BranchZustand,
} from '@/domain/git/branches';

const configSchema = z.object({
  commits: z.array(
    z.object({
      id: z.string(),
      nachricht: z.string(),
      eltern: z.array(z.string()).default([]),
    }),
  ),
  branches: z.record(z.string(), z.string()),
  aktuellerBranch: z.string(),
  /** Vorschläge, damit man ohne Tippen loslegen kann. */
  vorschlaege: z.array(z.string()).default([]),
});

/**
 * Das Branch-Lab.
 *
 * Der Graph steht oben und verändert sich mit jedem Befehl — das ist der
 * ganze Punkt: Man SIEHT, dass ein Branch nur ein Zeiger ist, dass ein Commit
 * nur den aktuellen Zeiger weiterbewegt, und dass ein Merge je nach Lage
 * entweder einen Zeiger verschiebt oder einen Commit mit zwei Eltern anlegt.
 */
export function BranchLab({
  config,
  onCompleteAction,
}: {
  config: unknown;
  onCompleteAction: () => Promise<boolean>;
}): React.ReactElement {
  const start = configSchema.parse(config);
  const [zustand, setZustand] = useState<BranchZustand>({
    commits: start.commits,
    branches: start.branches,
    aktuellerBranch: start.aktuellerBranch,
  });
  const [verlauf, setVerlauf] = useState<{ befehl: string; ausgabe: string }[]>([]);

  function fuehreAus(befehl: string): void {
    const ergebnis = fuehreBranchBefehlAus(zustand, befehl);
    setZustand(ergebnis.zustand);
    setVerlauf((prev) => [...prev, { befehl, ausgabe: ergebnis.ausgabe }]);
  }

  // Was würde ein Merge des jeweils anderen Branches gerade bewirken? Diese
  // Vorschau macht den Unterschied zwischen Fast-Forward und Merge-Commit
  // sichtbar, BEVOR man ihn ausführt.
  const kopf = zustand.branches[zustand.aktuellerBranch];
  const andere = Object.entries(zustand.branches).filter(
    ([name]) => name !== zustand.aktuellerBranch,
  );

  return (
    <div className="space-y-5">
      <CommitGraph
        commits={zustand.commits}
        branches={zustand.branches}
        aktuellerBranch={zustand.aktuellerBranch}
      />

      <p className="text-sm">
        Du bist auf <code className="font-mono font-semibold">{zustand.aktuellerBranch}</code>.
      </p>

      {kopf !== undefined && andere.length > 0 ? (
        <div className="space-y-1.5">
          {andere.map(([name, spitze]) => {
            const art = mergeArt(zustand, kopf, spitze);
            return (
              <p key={name} className="text-sm text-[var(--fg-muted)]">
                <code className="font-mono">git merge {name}</code> ergäbe gerade:{' '}
                <span className="font-medium text-[var(--fg)]">
                  {art === 'fast-forward'
                    ? 'ein Fast-Forward — nur der Zeiger wandert weiter'
                    : art === 'merge-commit'
                      ? 'einen Merge-Commit mit zwei Eltern'
                      : 'nichts, der Branch steckt schon drin'}
                </span>
              </p>
            );
          })}
        </div>
      ) : null}

      {start.vorschlaege.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {start.vorschlaege.map((vorschlag) => (
            <Button
              key={vorschlag}
              size="sm"
              variant="secondary"
              onClick={() => fuehreAus(vorschlag)}
            >
              {vorschlag}
            </Button>
          ))}
        </div>
      ) : null}

      <div>
        <p className="mb-2 font-mono text-xs text-[var(--fg-muted)]">
          Verfügbar: {UMGESETZTE_BRANCH_BEFEHLE.join(', ')}
        </p>
        <BefehlsKonsole
          eintraege={verlauf}
          eingabeaufforderung={`${zustand.aktuellerBranch} $`}
          platzhalter="git switch -c feature"
          onBefehlAction={fuehreAus}
        />
      </div>

      {zustand.commits.some((c) => c.eltern.length === 2) ? (
        <Callout tone="info" title="Merge-Commit">
          Der Commit mit zwei Eltern hält beide Entwicklungslinien zusammen. An ihm ist im Verlauf
          dauerhaft ablesbar, dass hier zwei Wege zusammengeführt wurden.
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
