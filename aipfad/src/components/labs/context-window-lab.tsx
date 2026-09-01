'use client';

import { useState } from 'react';
import { LabCompleteButton } from './lab-complete-button';
import { z } from 'zod';
import { Button, cx } from '@/components/ui/primitives';

const configSchema = z.object({
  windowSizeTokens: z.number(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      text: z.string(),
      tokens: z.number(),
    }),
  ),
});

const ROLE_LABEL: Record<string, string> = {
  system: 'System',
  user: 'User',
  assistant: 'Assistant',
};

export function ContextWindowLab({
  config,
  onCompleteAction,
}: {
  config: unknown;
  onCompleteAction: () => Promise<boolean>;
}): React.ReactElement {
  const { windowSizeTokens, messages } = configSchema.parse(config);
  const [shown, setShown] = useState(1);

  const visible = messages.slice(0, shown);
  let running = 0;
  const inWindow = new Set<number>();
  for (let i = visible.length - 1; i >= 0; i--) {
    const msg = visible[i];
    if (!msg) continue;
    running += msg.tokens;
    if (running > windowSizeTokens) break;
    inWindow.add(i);
  }

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--fg-muted)]">
        Kontextfenster-Größe in diesem Beispiel: {windowSizeTokens} Tokens.
      </p>
      <div className="space-y-2">
        {visible.map((msg, index) => (
          <div
            key={index}
            className={cx(
              'rounded-[var(--radius-md)] border p-3 text-sm transition-opacity',
              inWindow.has(index)
                ? 'border-wire-500 bg-wire-100 dark:bg-wire-900/30'
                : 'border-[var(--border)] opacity-40 line-through',
            )}
          >
            <span className="font-mono text-xs font-semibold text-[var(--fg-muted)]">
              {ROLE_LABEL[msg.role]} · {msg.tokens} Tokens
            </span>
            <p className="mt-1">{msg.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {shown < messages.length ? (
          <Button size="sm" onClick={() => setShown((s) => s + 1)}>
            Nächste Nachricht
          </Button>
        ) : (
          <LabCompleteButton
            onCompleteAction={onCompleteAction}
            label="Verstanden — Lab abschließen"
            size="sm"
          />
        )}
        <p className="text-xs text-[var(--fg-muted)]">
          Durchgestrichene Nachrichten liegen nicht mehr im Kontextfenster.
        </p>
      </div>
    </div>
  );
}
