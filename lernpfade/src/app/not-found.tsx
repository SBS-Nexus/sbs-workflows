import { ButtonLink, ErrorState } from '@/components/ui/primitives';
import { SiteHeader } from '@/components/site-header';

/** Unbekannte Adresse im Hub — Darstellung aus dem Komponentenvertrag (LP-03C). */
export default function NotFound(): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="shell state-page">
        <ErrorState
          kind="not-found"
          actions={
            <>
              <ButtonLink href="/">Alle Pfade</ButtonLink>
              <ButtonLink href="/wiederholen" variant="secondary">
                Wiederholen
              </ButtonLink>
            </>
          }
        >
          <p>
            Der Link führt ins Leere. Möglicherweise wurde ein Inhalt umbenannt oder ist noch nicht
            veröffentlicht.
          </p>
        </ErrorState>
      </main>
    </>
  );
}
