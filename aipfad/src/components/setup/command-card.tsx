'use client';

import { useState } from 'react';
import { Badge, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import type { SetupCommand } from '@/content/setup-commands';

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
        command.dangerous
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
      <div className="mt-3 flex flex-wrap gap-2">
        {command.dangerous ? (
          <Badge tone="alert">Gefährlich, nicht rückgängig zu machen</Badge>
        ) : null}
        {!command.reversible && !command.dangerous ? (
          <Badge tone="caution">Nicht rückgängig zu machen</Badge>
        ) : null}
        {command.network ? (
          <Badge tone="info">Braucht Netzwerk</Badge>
        ) : (
          <Badge tone="neutral">Kein Netzwerk nötig</Badge>
        )}
      </div>
    </div>
  );
}
