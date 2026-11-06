import { ButtonLink, ErrorState } from '@/components/ui/primitives';

/** Unbekannte Adresse — Darstellung aus dem Komponentenvertrag (LP-03C). */
export default function NotFound(): React.ReactElement {
  return (
    <main
      id="hauptinhalt"
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12"
    >
      <ErrorState
        kind="not-found"
        actions={
          <>
            <ButtonLink href="/lernen">Zum Lernpfad</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Zur Startseite
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
  );
}
