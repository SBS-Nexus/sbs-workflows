'use client';

import { useState } from 'react';
import { recordLabCompletionAction } from '@/server/actions/lab-actions';
import { TokenizerLab } from './tokenizer-lab';
import { ContextWindowLab } from './context-window-lab';
import { TerminalLab } from './terminal-lab';

export function LabRunner({
  slug,
  kind,
  config,
}: {
  slug: string;
  kind: 'TERMINAL' | 'TOKENIZER' | 'CONTEXT_WINDOW';
  config: unknown;
}): React.ReactElement {
  const [saved, setSaved] = useState(false);

  async function complete(): Promise<void> {
    if (saved) return;
    setSaved(true);
    await recordLabCompletionAction(slug, { completedAt: new Date().toISOString() });
  }

  switch (kind) {
    case 'TOKENIZER':
      return <TokenizerLab config={config} onCompleteAction={complete} />;
    case 'CONTEXT_WINDOW':
      return <ContextWindowLab config={config} onCompleteAction={complete} />;
    case 'TERMINAL':
      return <TerminalLab config={config} onCompleteAction={complete} />;
  }
}
