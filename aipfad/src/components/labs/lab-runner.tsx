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

  /**
   * Meldet zurück, ob der Abschluss wirklich gespeichert wurde. Die Sperre
   * wird erst NACH dem erfolgreichen Speichern gesetzt — vorher blieb ein
   * fehlgeschlagener Versuch für immer gesperrt (Code-Review auf PR #29).
   */
  async function complete(): Promise<boolean> {
    if (saved) return true;
    try {
      await recordLabCompletionAction(slug, { completedAt: new Date().toISOString() });
      setSaved(true);
      return true;
    } catch {
      return false;
    }
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
