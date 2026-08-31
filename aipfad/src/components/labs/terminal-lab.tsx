'use client';

import { useState } from 'react';
import { LabCompleteButton } from './lab-complete-button';
import { z } from 'zod';
import { Button, Callout } from '@/components/ui/primitives';

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
  const [history, setHistory] = useState<{ command: string; output: string }[]>([]);
  const [current, setCurrent] = useState('');
  const [confirmDanger, setConfirmDanger] = useState<string | null>(null);

  function resolve(path: string): string {
    if (path.startsWith('/')) return path;
    return `${cwd}/${path}`.replace(/\/+/g, '/');
  }

  function run(raw: string): void {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const [cmd, ...args] = trimmed.split(/\s+/);
    const name = cmd ?? '';

    if (dangerousCommands.includes(name) && confirmDanger !== trimmed) {
      setConfirmDanger(trimmed);
      return;
    }
    setConfirmDanger(null);

    let output: string;
    if (!allowedCommands.includes(name)) {
      output = `Befehl nicht verfügbar in diesem Lab: ${name}`;
    } else if (name === 'pwd') {
      output = cwd;
    } else if (name === 'ls') {
      const prefix = `${cwd}/`;
      const entries = Object.keys(fileSystem)
        .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
        .map((p) => p.slice(prefix.length));
      output = entries.length > 0 ? entries.join('  ') : '(leer)';
    } else if (name === 'cd') {
      const target = resolve(args[0] ?? '/');
      if (Object.prototype.hasOwnProperty.call(fileSystem, target) && fileSystem[target] === null) {
        setCwd(target);
        output = '';
      } else {
        output = `Kein solches Verzeichnis: ${args[0] ?? ''}`;
      }
    } else if (name === 'cat') {
      const target = resolve(args[0] ?? '');
      const content = fileSystem[target];
      output = typeof content === 'string' ? content : `Datei nicht gefunden: ${args[0] ?? ''}`;
    } else if (name === 'echo') {
      output = args.join(' ');
    } else if (name === 'rm') {
      output = `${args[0] ?? ''} gelöscht. (simuliert — nichts wurde wirklich verändert)`;
    } else {
      output = '';
    }

    setHistory((prev) => [...prev, { command: trimmed, output }]);
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
