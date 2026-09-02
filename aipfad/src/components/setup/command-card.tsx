'use client';

import { useState } from 'react';
import { Badge, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { istGefaehrlich, type SetupCommand } from '@/content/setup-commands';
import { GEFAHR_BESCHRIFTUNG, WIRKBEREICH_BESCHRIFTUNG } from '@/domain/commands/safety';

export function CommandCard({ command }: { command: SetupCommand }): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(command.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Zwischenablage nicht verfügbar (z. B. kein sicherer Kontext) — der
      // Befehl bleibt weiterhin markier- und kopierbar per Hand.
    }
  }

  return (
    <div
      className={cx(
        'rounded-[var(--radius-md)] border p-4',
        istGefaehrlich(command)
          ? 'border-alert-500 bg-alert-100 dark:bg-alert-900/30'
          : 'border-[var(--border)] bg-[var(--bg-raised)]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <code className="font-mono text-sm font-semibold">{command.command}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-2.5 py-1 font-mono text-xs hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          {copied ? <Icon name="check" size={14} /> : null}
          {copied ? 'Kopiert' : 'Kopieren'}
        </button>
      </div>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">{command.description}</p>
      <p className="mt-1 text-sm">{command.whatHappens}</p>

      {command.example ? (
        <p className="mt-3 overflow-x-auto rounded-[var(--radius-sm)] bg-ink-100 px-3 py-2 font-mono text-xs dark:bg-ink-800">
          {command.example}
        </p>
      ) : null}

      {command.prerequisites && command.prerequisites.length > 0 ? (
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          Vorher nötig: {command.prerequisites.join(' · ')}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge
          tone={
            istGefaehrlich(command)
              ? 'alert'
              : command.safety.gefahr === 'achtsam'
                ? 'caution'
                : 'success'
          }
        >
          {GEFAHR_BESCHRIFTUNG[command.safety.gefahr]}
        </Badge>
        {command.safety.wirkung.map((bereich) => (
          <Badge key={bereich} tone="neutral">
            {WIRKBEREICH_BESCHRIFTUNG[bereich]}
          </Badge>
        ))}
        {!command.safety.reversibel ? <Badge tone="alert">Nicht rückgängig zu machen</Badge> : null}
        {command.safety.netzwerk ? <Badge tone="info">Braucht Netzwerk</Badge> : null}
      </div>
    </div>
  );
}
