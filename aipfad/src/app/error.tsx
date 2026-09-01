'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Callout } from '@/components/ui/primitives';

/**
 * Fehlergrenze für die gesamte Anwendung. Zeigt eine verständliche Meldung
 * statt einer weißen Seite und verrät dabei keine technischen Details.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
    console.error('Unerwarteter Fehler:', error.digest ?? error.name);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
      <Callout tone="alert" title="Da ist etwas schiefgegangen">
        <p>
          Die Seite konnte nicht vollständig geladen werden. Dein Lernfortschritt ist davon nicht
          betroffen – gespeicherte Abgaben bleiben erhalten.
        </p>
        {error.digest ? (
          <p className="mt-2 text-sm">
            Kennung für die Fehlersuche: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}
      </Callout>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Erneut versuchen
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/pfad')}>
          Zum Lernpfad
        </Button>
      </div>
    </div>
  );
}
