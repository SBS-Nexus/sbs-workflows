'use client';

import { useState } from 'react';
import { LabCompleteButton } from './lab-complete-button';
import { z } from 'zod';
import { Button, Callout } from '@/components/ui/primitives';
import { fuehreBefehlAus, type SimuliertesDateisystem } from '@/domain/labs/terminal';

const configSchema = z.object({
  startingDirectory: z.string(),
  fileSystem: z.record(z.string(), z.string().nullable()),
  allowedCommands: z.array(z.string()),
  dangerousCommands: z.array(z.string()),
});

/** Sehr einfacher, deterministischer Terminal-Simulator zum freien Erkunden. */
export function TerminalLab({
  config,
  onCompleteAction,
}: {
  config: unknown;
  onCompleteAction: () => Promise<boolean>;
}): React.ReactElement {
  const { startingDirectory, fileSystem, allowedCommands, dangerousCommands } =
    configSchema.parse(config);
  const [cwd, setCwd] = useState(startingDirectory);
  const [dateisystem, setDateisystem] = useState<SimuliertesDateisystem>(fileSystem);
  const [history, setHistory] = useState<{ command: string; output: string }[]>([]);
  const [current, setCurrent] = useState('');
  const [confirmDanger, setConfirmDanger] = useState<string | null>(null);

  /**
   * Die eigentliche Auswertung liegt in `domain/labs/terminal.ts` — eine reine
   * Funktion ohne Shell, ohne Prozessaufruf, ohne Dateisystemzugriff. Hier
   * bleibt nur die Bestätigung gefährlicher Befehle und die Darstellung.
   */
  function run(raw: string): void {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const name = trimmed.split(/\s+/)[0] ?? '';

    if (dangerousCommands.includes(name) && confirmDanger !== trimmed) {
      setConfirmDanger(trimmed);
      return;
    }
    setConfirmDanger(null);

    const ergebnis = fuehreBefehlAus({ cwd, fileSystem: dateisystem }, trimmed, allowedCommands);
    setCwd(ergebnis.cwd);
    setDateisystem(ergebnis.fileSystem);
    setHistory((prev) =>
      ergebnis.clearHistory ? [] : [...prev, { command: trimmed, output: ergebnis.output }],
    );
    setCurrent('');
  }

  return (
    <div>
      <p className="mb-3 font-mono text-xs text-[var(--fg-muted)]">
        Verfügbar: {allowedCommands.join(', ')}
      </p>
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-ink-900 p-4 font-mono text-sm text-ink-50">
        <p className="mb-2 text-ink-300">{startingDirectory} $</p>
        {history.map((entry, index) => (
          <div key={index}>
            <p>
              <span className="text-signal-300">$</span> {entry.command}
            </p>
            {entry.output ? (
              <p className="whitespace-pre-wrap text-ink-200">{entry.output}</p>
            ) : null}
          </div>
        ))}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-signal-300">{cwd} $</span>
          <input
            type="text"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run(current)}
            className="flex-1 bg-transparent outline-none"
            aria-label="Befehl eingeben"
          />
        </div>
      </div>

      {confirmDanger ? (
        <Callout tone="alert" title="Nicht rückgängig zu machen" className="mt-3">
          <p className="mb-2">
            <code className="font-mono">{confirmDanger}</code> wirklich ausführen?
          </p>
          <Button size="sm" variant="danger" onClick={() => run(confirmDanger)}>
            Ja, ausführen
          </Button>
        </Callout>
      ) : null}

      <div className="mt-5">
        <LabCompleteButton
          onCompleteAction={onCompleteAction}
          label="Fertig — Lab abschließen"
          disabled={history.length === 0}
        />
      </div>
    </div>
  );
}
