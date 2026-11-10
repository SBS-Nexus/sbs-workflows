'use client';

import { useEffect } from 'react';
import { Button, ErrorState } from '@/components/ui/primitives';

/**
 * Fehlergrenze für die gesamte Anwendung.
 * Zeigt eine verständliche Meldung statt einer weißen Seite – und verrät dabei
 * keine technischen Details, die für Angriffe nützlich wären. Darstellung aus
 * dem gemeinsamen Komponentenvertrag (LP-03C, `ErrorState`).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    // Die Meldung landet im Server-Log, nicht im Browser der Nutzenden.
    console.error('Unerwarteter Fehler:', error.digest ?? error.name);
  }, [error]);

  return (
    <main
      id="hauptinhalt"
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12"
    >
      <ErrorState
        kind="unexpected"
        reference={error.digest}
        actions={
          <>
            <Button type="button" onClick={reset}>
              Erneut versuchen
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.location.assign('/lernen')}
            >
              Zum Lernpfad
            </Button>
          </>
        }
      >
        <p>
          Die Seite konnte nicht vollständig geladen werden. Dein Lernfortschritt ist davon nicht
          betroffen – gespeicherte Abgaben bleiben erhalten.
        </p>
      </ErrorState>
    </main>
  );
}
