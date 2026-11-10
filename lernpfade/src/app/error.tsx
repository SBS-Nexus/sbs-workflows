'use client';

import { useEffect } from 'react';
import { Button, ButtonLink, ErrorState } from '@/components/ui/primitives';

/**
 * Fehlergrenze des Hubs. Verständliche Meldung statt weißer Seite, ohne
 * technische Details; lokale Vokabeldaten im Browser bleiben unberührt.
 * Darstellung aus dem Komponentenvertrag (LP-03C, `ErrorState`).
 */
export default function HubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    console.error('Unerwarteter Fehler:', error.digest ?? error.name);
  }, [error]);

  return (
    <main id="hauptinhalt" className="shell state-page">
      <ErrorState
        kind="unexpected"
        reference={error.digest}
        actions={
          <>
            <Button type="button" onClick={reset}>
              Erneut versuchen
            </Button>
            <ButtonLink href="/" variant="secondary">
              Alle Pfade
            </ButtonLink>
          </>
        }
      >
        <p>
          Die Seite konnte nicht vollständig geladen werden. Deine Vokabeln und dein Stand in diesem
          Browser sind davon nicht betroffen.
        </p>
      </ErrorState>
    </main>
  );
}
