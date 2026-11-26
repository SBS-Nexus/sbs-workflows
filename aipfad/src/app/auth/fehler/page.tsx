import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/marketing/auth-shell';
import { ButtonLink, Callout } from '@/components/ui/primitives';
import { buttonAttributes } from '@/lib/learning-components';
import { HINWEIS_EINLEITUNG, HINWEIS_PUNKTE, hinweisFuer } from '@/server/auth/zentral-hinweise';

/**
 * Wenn die Anmeldung über das gemeinsame Konto nicht klappt (E4.2): ein
 * verständlicher Grund und ein nächster Schritt statt einer Fehlerseite.
 * Die Texte kommen aus dem Vertrag (`zentral-hinweise.ts`), die Bausteine
 * sind die dieser App.
 */
export const metadata: Metadata = {
  title: 'Anmeldung nicht abgeschlossen',
  robots: { index: false, follow: false },
};

export default async function AnmeldeFehlerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<React.ReactElement> {
  const { grund } = await searchParams;
  const hinweis = hinweisFuer(grund);
  const primaer = buttonAttributes('primary');

  return (
    <AuthShell
      title={hinweis.titel}
      intro={HINWEIS_EINLEITUNG}
      punkte={HINWEIS_PUNKTE}
      footer={
        <>
          Ohne Anmeldung offen:{' '}
          <Link
            href="/glossar"
            className="font-bold text-signal-600 underline underline-offset-4 dark:text-signal-300"
          >
            Glossar
          </Link>{' '}
          und{' '}
          <Link
            href="/nachschlagen"
            className="font-bold text-signal-600 underline underline-offset-4 dark:text-signal-300"
          >
            Nachschlagen
          </Link>
          .
        </>
      }
    >
      <Callout tone="caution">
        <p>{hinweis.text}</p>
      </Callout>
      <div className="mt-6 flex flex-wrap gap-3">
        {/* Absichtlich <a> statt <Link>: Das Ziel ist eine Route mit Weiterleitung
            zu einem anderen Host, die weder vorgeladen noch clientseitig
            aufgelöst werden darf. */}
        <a
          href="/auth/anmelden"
          className={primaer.className}
          data-lp-variant={primaer['data-lp-variant']}
          data-lp-size={primaer['data-lp-size']}
        >
          {hinweis.erneut}
        </a>
        <ButtonLink href="/" variant="secondary">
          Zur Startseite
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
