'use client';

import { useEffect, useState } from 'react';

type Stand =
  { art: 'laedt' } | { art: 'aus' } | { art: 'abgemeldet' } | { art: 'angemeldet'; name: string };

/**
 * Anmeldestand in der Kopfzeile (E4.5b). Fragt `/auth/status` im Browser ab,
 * damit die Seiten statisch bleiben. Ist die Anmeldung im Hub nicht
 * eingerichtet (`eingerichtet: false`), zeigt sie nichts, wie bisher.
 */
export function KontoStatus(): React.ReactElement | null {
  const [stand, setStand] = useState<Stand>({ art: 'laedt' });
  const [hier, setHier] = useState('/');

  useEffect(() => {
    setHier(`${window.location.pathname}${window.location.search}`);
    let aktiv = true;
    fetch('/auth/status', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (antwort) => {
        if (!aktiv) return;
        if (!antwort.ok) return setStand({ art: 'aus' });
        const daten = (await antwort.json()) as {
          eingerichtet?: boolean;
          angemeldet?: boolean;
          name?: string;
        };
        if (!daten.eingerichtet) return setStand({ art: 'aus' });
        setStand(
          daten.angemeldet ? { art: 'angemeldet', name: daten.name ?? '' } : { art: 'abgemeldet' },
        );
      })
      .catch(() => aktiv && setStand({ art: 'aus' }));
    return () => {
      aktiv = false;
    };
  }, []);

  if (stand.art === 'laedt' || stand.art === 'aus') return null;

  if (stand.art === 'abgemeldet') {
    return (
      <div className="los-konto">
        {/* Absichtlich <a>: Das Ziel leitet zum gemeinsamen Konto weiter. */}
        <a className="los-nav-cta" href={`/auth/anmelden?ziel=${encodeURIComponent(hier)}`}>
          Anmelden
        </a>
      </div>
    );
  }

  return (
    <div className="los-konto">
      <span className="los-konto-name" title="Angemeldet mit deinem Lernpfade-Konto">
        {stand.name}
      </span>
      <form method="post" action="/auth/abmelden">
        <button type="submit" className="los-nav-cta">
          Abmelden
        </button>
      </form>
    </div>
  );
}
