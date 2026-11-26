// Mailtexte des Identitätsdienstes. Ersetzen die mitgelieferten Texte von
// ZITADEL, die von „Zitadel“ sprechen. Platzhalter wie {{.Code}} füllt ZITADEL;
// konto-mail maskiert alle Werte und erlaubt nur <br> und <strong>.
// Gültigkeiten entsprechen den Standardwerten in cmd/defaults.yaml (v4.20.5):
// Bestätigungs- und Passwortcodes 1 Stunde, Einrichtungs- und Einladungscodes 72 Stunden.

const FUSS_DE = 'Lernpfade · Python, SQL und KI Schritt für Schritt';
const FUSS_EN = 'Lernpfade · Python, SQL and AI step by step';

/** Schlüssel = Pfadteil der Admin-API: PUT /admin/v1/text/message/<schluessel>/<sprache> */
export const NACHRICHTEN = {
  de: {
    init: {
      title: 'Dein Konto einrichten',
      preHeader: 'Bestätige deine Adresse und lege dein Passwort fest.',
      subject: 'Dein Lernpfade-Konto ist bereit',
      greeting: 'Hallo {{.DisplayName}},',
      text: 'für dich wurde ein Konto bei Lernpfade angelegt. Bestätige deine Adresse und lege dein Passwort fest – danach kannst du direkt loslegen.<br><br>Dein Code: <strong>{{.Code}}</strong><br>Er gilt 72 Stunden.',
      buttonText: 'Konto einrichten',
      footerText: FUSS_DE,
    },
    verifyemail: {
      title: 'Bestätige deine E-Mail-Adresse',
      preHeader: 'Ein Klick, dann ist dein Konto vollständig.',
      subject: 'Bitte bestätige deine E-Mail-Adresse',
      greeting: 'Hallo {{.DisplayName}},',
      text: 'bitte bestätige deine Adresse. Damit gehört das Konto sicher dir, und du kannst dein Passwort jederzeit selbst zurücksetzen.<br><br>Dein Code: <strong>{{.Code}}</strong><br>Er gilt eine Stunde.',
      buttonText: 'Adresse bestätigen',
      footerText: FUSS_DE,
    },
    passwordreset: {
      title: 'Neues Passwort festlegen',
      preHeader: 'Du hast ein neues Passwort angefordert.',
      subject: 'Dein neues Passwort für Lernpfade',
      greeting: 'Hallo {{.DisplayName}},',
      text: 'du hast ein neues Passwort angefordert.<br><br>Dein Code: <strong>{{.Code}}</strong><br>Er gilt eine Stunde.<br><br>Warst du das nicht, ignoriere diese Mail einfach. Dein bisheriges Passwort bleibt gültig.',
      buttonText: 'Neues Passwort festlegen',
      footerText: FUSS_DE,
    },
    password_change: {
      title: 'Dein Passwort wurde geändert',
      preHeader: 'Zur Sicherheit: eine Änderung an deinem Konto.',
      subject: 'Dein Passwort wurde geändert',
      greeting: 'Hallo {{.DisplayName}},',
      text: 'das Passwort für dein Lernpfade-Konto wurde gerade geändert.<br><br>Warst du das nicht, setze es sofort über „Passwort vergessen“ zurück.',
      buttonText: 'Zur Anmeldung',
      footerText: FUSS_DE,
    },
    invite_user: {
      title: 'Du bist eingeladen',
      preHeader: 'Lege dein Passwort fest und starte deinen Lernpfad.',
      subject: 'Einladung zu Lernpfade',
      greeting: 'Hallo {{.DisplayName}},',
      text: 'du wurdest zu Lernpfade eingeladen. Lege dein Passwort fest und starte deinen Lernpfad.<br><br>Die Einladung gilt 72 Stunden.',
      buttonText: 'Einladung annehmen',
      footerText: FUSS_DE,
    },
    passwordless_registration: {
      title: 'Passkey einrichten',
      preHeader: 'Anmelden ohne Passwort – mit Fingerabdruck, Gesicht oder Geräte-PIN.',
      subject: 'Richte deinen Passkey ein',
      greeting: 'Hallo {{.DisplayName}},',
      text: 'mit einem Passkey meldest du dich ohne Passwort an – mit Fingerabdruck, Gesicht oder der PIN deines Geräts. Das ist bequemer und sicherer.<br><br>Der Link gilt eine Stunde.',
      buttonText: 'Passkey einrichten',
      footerText: FUSS_DE,
    },
  },
  en: {
    init: {
      title: 'Set up your account',
      preHeader: 'Confirm your address and choose your password.',
      subject: 'Your Lernpfade account is ready',
      greeting: 'Hello {{.DisplayName}},',
      text: 'an account was created for you at Lernpfade. Confirm your address and choose your password, then you can start right away.<br><br>Your code: <strong>{{.Code}}</strong><br>It is valid for 72 hours.',
      buttonText: 'Set up account',
      footerText: FUSS_EN,
    },
    verifyemail: {
      title: 'Confirm your email address',
      preHeader: 'One click and your account is complete.',
      subject: 'Please confirm your email address',
      greeting: 'Hello {{.DisplayName}},',
      text: 'please confirm your address. This keeps your account yours and lets you reset your password on your own.<br><br>Your code: <strong>{{.Code}}</strong><br>It is valid for one hour.',
      buttonText: 'Confirm address',
      footerText: FUSS_EN,
    },
    passwordreset: {
      title: 'Choose a new password',
      preHeader: 'You requested a new password.',
      subject: 'Your new Lernpfade password',
      greeting: 'Hello {{.DisplayName}},',
      text: 'you requested a new password.<br><br>Your code: <strong>{{.Code}}</strong><br>It is valid for one hour.<br><br>If this wasn’t you, simply ignore this email. Your current password stays valid.',
      buttonText: 'Choose new password',
      footerText: FUSS_EN,
    },
    password_change: {
      title: 'Your password was changed',
      preHeader: 'For your security: a change to your account.',
      subject: 'Your password was changed',
      greeting: 'Hello {{.DisplayName}},',
      text: 'the password for your Lernpfade account was just changed.<br><br>If this wasn’t you, reset it right away via “Forgot password”.',
      buttonText: 'Sign in',
      footerText: FUSS_EN,
    },
    invite_user: {
      title: 'You are invited',
      preHeader: 'Choose your password and start your learning path.',
      subject: 'Invitation to Lernpfade',
      greeting: 'Hello {{.DisplayName}},',
      text: 'you were invited to Lernpfade. Choose your password and start your learning path.<br><br>The invitation is valid for 72 hours.',
      buttonText: 'Accept invitation',
      footerText: FUSS_EN,
    },
    passwordless_registration: {
      title: 'Set up a passkey',
      preHeader: 'Sign in without a password – with fingerprint, face or device PIN.',
      subject: 'Set up your passkey',
      greeting: 'Hello {{.DisplayName}},',
      text: 'with a passkey you sign in without a password – using your fingerprint, face or device PIN. It is easier and safer.<br><br>The link is valid for one hour.',
      buttonText: 'Set up passkey',
      footerText: FUSS_EN,
    },
  },
};
