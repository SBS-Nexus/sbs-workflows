'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button, cx } from '@/components/ui/primitives';

const configSchema = z.object({
  examples: z.array(z.object({ text: z.string(), tokens: z.array(z.string()) })).min(1),
});

const TINTS = [
  'border-ink-300 bg-ink-100 text-ink-800 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-100',
  'border-signal-300 bg-signal-100 text-signal-700 dark:border-signal-700 dark:bg-signal-900/50 dark:text-signal-200',
  'border-wire-300 bg-wire-100 text-wire-600 dark:border-wire-600 dark:bg-wire-900/50 dark:text-wire-300',
];

export function TokenizerLab({
  config,
  onCompleteAction,
}: {
  config: unknown;
  onCompleteAction: () => void;
}): React.ReactElement {
  const { examples } = configSchema.parse(config);
  const [selected, setSelected] = useState(0);
  const [done, setDone] = useState(false);
  const example = examples[selected] ?? examples[0]!;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {examples.map((ex, index) => (
          <button
            key={ex.text}
            type="button"
            onClick={() => setSelected(index)}
            className={cx(
              'rounded-[var(--radius-md)] border px-3 py-1.5 font-mono text-sm',
              index === selected
                ? 'border-signal-500 bg-signal-100 dark:bg-signal-900/40'
                : 'border-[var(--border)] hover:bg-ink-100 dark:hover:bg-ink-800',
            )}
          >
            {ex.text.length > 24 ? `${ex.text.slice(0, 24)}…` : ex.text}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-raised)] p-4">
        {example.tokens.map((token, index) => (
          <span
            key={index}
            className={cx(
              'flex flex-col items-center rounded-[var(--radius-sm)] border px-2 py-1 font-mono text-sm',
              TINTS[index % TINTS.length],
            )}
          >
            <span className="whitespace-pre">
              {token.startsWith(' ') ? `·${token.slice(1)}` : token}
            </span>
            <span className="mt-0.5 text-[0.65rem] leading-none opacity-60">{index}</span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">
        {example.tokens.length} Tokens für {example.text.split(/\s+/).length} sichtbare Wörter.
      </p>

      {!done ? (
        <Button
          className="mt-5"
          onClick={() => {
            setDone(true);
            onCompleteAction();
          }}
        >
          Verstanden — Lab abschließen
        </Button>
      ) : (
        <p className="mt-5 font-mono text-sm text-success-700 dark:text-success-100">
          ✓ Lab abgeschlossen.
        </p>
      )}
    </div>
  );
}
