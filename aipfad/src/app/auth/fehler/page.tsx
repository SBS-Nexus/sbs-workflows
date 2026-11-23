import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/marketing/auth-shell';
import { ButtonLink, Callout } from '@/components/ui/primitives';
import { buttonAttributes } from '@/lib/learning-components';

/**
 * Wenn die Anmeldung über das gemeinsame Konto nicht klappt (E4.2): ein
 * verständlicher Grund und ein nächster Schritt statt einer Fehlerseite.
 * Die Gründe kommen aus `/auth/rueckkehr` und `/auth/anmelden`; ein
 * unbekannter Grund zeigt den allgemeinen Text.
 */
export const metadata: Metadata = {
  title: 'Anmeldung nicht abgeschlossen',
  robots: { index: false, follow: false },
};

interface Hinweis {
  titel: string;
  text: string;
  erneut: string;
}

const HINWEISE: Record<string, Hinweis> = {
  abgebrochen: {
    titel: 'Anmeldung abgebrochen',
    text: 'Du hast die Anmeldung bei deinem Lernpfade-Konto beendet. Es wurde nichts geändert.',
    erneut: 'Erneut anmelden',
  },
  abgelaufen: {
    titel: 'Die Anmeldung hat zu lange gedauert',
    text: 'Ein Anmeldeversuch gilt zehn Minuten. Starte ihn einfach noch einmal.',
    erneut: 'Neu starten',
  },
  'adresse-unbestaetigt': {
    titel: 'Bitte bestätige zuerst deine E-Mail-Adresse',
    text: 'Du hast dafür eine Mail von lernpfade.net mit einem Code bekommen. Sobald die Adresse bestätigt ist, geht es hier weiter.',
    erneut: 'Weiter zur Bestätigung',
  },
  'adresse-vergeben': {
    titel: 'Diese Adresse gehört schon zu einem anderen Konto',
    text: 'In AIPfad ist die E-Mail-Adresse bereits mit einem anderen Lernpfade-Konto verbunden. Melde dich mit dem Konto an, mit dem du AIPfad bisher genutzt hast.',
    erneut: 'Mit anderem Konto anmelden',
  },
  'zweiter-faktor': {
    titel: 'Für dieses Konto ist ein zweiter Faktor Pflicht',
    text: 'Konten mit Verwaltungsrechten melden sich mit Passkey oder Authenticator-App an. Richte einen davon in deinem Lernpfade-Konto ein und melde dich erneut an.',
    erneut: 'Erneut anmelden',
  },
  unvollstaendig: {
    titel: 'Deinem Konto fehlt eine E-Mail-Adresse',
    text: 'AIPfad ordnet Lernstände über die E-Mail-Adresse zu. Hinterlege eine Adresse in deinem Lernpfade-Konto und melde dich erneut an.',
    erneut: 'Erneut anmelden',
  },
  abgelehnt: {
    titel: 'Die Anmeldung wurde nicht bestätigt',
    text: 'Dein Lernpfade-Konto hat die Anmeldung nicht freigegeben. Melde dich bitte erneut an.',
    erneut: 'Erneut anmelden',
  },
  'nicht-erreichbar': {
    titel: 'Das Lernpfade-Konto ist gerade nicht erreichbar',
    text: 'Dein Lernstand ist sicher. Versuche es in einem Moment noch einmal.',
    erneut: 'Erneut versuchen',
  },
};

const ALLGEMEIN: Hinweis = {
  titel: 'Die Anmeldung hat gerade nicht geklappt',
  text: 'Dein Lernstand ist sicher. Versuche es in einem Moment noch einmal.',
  erneut: 'Erneut versuchen',
};

export default async function AnmeldeFehlerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<React.ReactElement> {
  const { grund } = await searchParams;
  const hinweis =
    (typeof grund === 'string' && Object.hasOwn(HINWEISE, grund) && HINWEISE[grund]) || ALLGEMEIN;
  const primaer = buttonAttributes('primary');

  return (
    <AuthShell
      title={hinweis.titel}
      intro="Mit deinem Lernpfade-Konto meldest du dich bei PythonPfad, SQLPfad und AIPfad an."
      punkte={[
        'Ein Konto für alle Lernpfade, mit Passkey oder Passwort.',
        'Dein Lernstand bleibt in AIPfad, das Konto bestätigt nur, dass du es bist.',
        'Abmelden in AIPfad meldet dich auch beim Lernpfade-Konto ab.',
      ]}
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
