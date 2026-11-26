import { FeedbackCallout } from '@/components/feedback/callout';
import { ButtonLink } from '@/components/ui/primitives';

/**
 * Hinweise der Organisationsseiten (E5.1). Wortlaut des zweiten Faktors wie
 * in den Apps (`docs/learning-auth/zentral-hinweise.ts`, `zweiter-faktor`).
 */

export function ZweiterFaktorHinweis({
  einrichten,
  erneutAnmelden,
}: {
  einrichten: string;
  erneutAnmelden: string;
}): React.ReactElement {
  return (
    <FeedbackCallout message={{ tone: 'info', title: 'Für Verwaltungsrechte ist ein zweiter Faktor Pflicht', live: false }}>
      <p>
        Wer eine Organisation verwaltet oder Lernende einlädt, meldet sich mit Passkey oder Authenticator-App an.
        Richte einen davon in deinem Lernpfade-Konto ein und melde dich danach erneut an.
      </p>
      <p className="org-aktionen">
        <ButtonLink href={einrichten}>Zweiten Faktor einrichten</ButtonLink>
        <ButtonLink variant="secondary" href={erneutAnmelden}>
          Erneut anmelden
        </ButtonLink>
      </p>
    </FeedbackCallout>
  );
}

export function AnmeldenHinweis({ adresse, text }: { adresse: string; text: string }): React.ReactElement {
  return (
    <FeedbackCallout message={{ tone: 'info', title: 'Anmeldung nötig', live: false }}>
      <p>{text}</p>
      <p className="org-aktionen">
        <ButtonLink href={adresse}>Mit Lernpfade-Konto anmelden</ButtonLink>
      </p>
    </FeedbackCallout>
  );
}
