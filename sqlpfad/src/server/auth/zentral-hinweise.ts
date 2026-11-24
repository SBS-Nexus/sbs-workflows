/**
 * Texte der Hinweisseite /auth/fehler (Vertrag docs/learning-auth/). Die
 * Gründe kommen aus /auth/rueckkehr und /auth/anmelden; ein unbekannter Grund
 * zeigt den allgemeinen Text. Jede App stellt sie mit eigenen Bausteinen dar.
 */

export interface Hinweis {
  titel: string;
  text: string;
  erneut: string;
}

export const HINWEISE: Record<string, Hinweis> = {
  abgebrochen: {
    titel: 'Anmeldung abgebrochen',
    text: 'Du hast die Anmeldung bei deinem Lernpfade-Konto beendet. Es wurde nichts geändert.',
    erneut: 'Erneut anmelden',
  },
  abgelaufen: {
    titel: 'Die Anmeldung hat zu lange gedauert',
    text: 'Ein Anmeldeversuch gilt dreißig Minuten. Starte ihn einfach noch einmal.',
    erneut: 'Neu starten',
  },
  'adresse-unbestaetigt': {
    titel: 'Bitte bestätige zuerst deine E-Mail-Adresse',
    text: 'Du hast dafür eine Mail von lernpfade.net mit einem Code bekommen. Sobald die Adresse bestätigt ist, geht es hier weiter.',
    erneut: 'Weiter zur Bestätigung',
  },
  'adresse-vergeben': {
    titel: 'Diese Adresse gehört schon zu einem anderen Konto',
    text: 'Hier ist die E-Mail-Adresse bereits mit einem anderen Lernpfade-Konto verbunden. Melde dich mit dem Konto an, mit dem du diesen Lernpfad bisher genutzt hast.',
    erneut: 'Mit anderem Konto anmelden',
  },
  'zweiter-faktor': {
    titel: 'Für dieses Konto ist ein zweiter Faktor Pflicht',
    text: 'Konten mit Verwaltungsrechten melden sich mit Passkey oder Authenticator-App an. Richte einen davon in deinem Lernpfade-Konto ein und melde dich erneut an.',
    erneut: 'Erneut anmelden',
  },
  unvollstaendig: {
    titel: 'Deinem Konto fehlt eine E-Mail-Adresse',
    text: 'Lernstände werden über die E-Mail-Adresse zugeordnet. Hinterlege eine Adresse in deinem Lernpfade-Konto und melde dich erneut an.',
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

export const ALLGEMEIN: Hinweis = {
  titel: 'Die Anmeldung hat gerade nicht geklappt',
  text: 'Dein Lernstand ist sicher. Versuche es in einem Moment noch einmal.',
  erneut: 'Erneut versuchen',
};

/** Der Hinweis zu einem Grund aus der Adresse; Unbekanntes wird allgemein. */
export function hinweisFuer(grund: unknown): Hinweis {
  return (
    (typeof grund === 'string' && Object.hasOwn(HINWEISE, grund) && HINWEISE[grund]) || ALLGEMEIN
  );
}

export const HINWEIS_EINLEITUNG =
  'Mit deinem Lernpfade-Konto meldest du dich bei PythonPfad, SQLPfad und AIPfad an.';

export const HINWEIS_PUNKTE = [
  'Ein Konto für alle Lernpfade, mit Passkey oder Passwort.',
  'Dein Lernstand bleibt in der App, das Konto bestätigt nur, dass du es bist.',
  'Abmelden hier meldet dich auch beim Lernpfade-Konto ab.',
] as const;
