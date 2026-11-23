// Anwendungen, die sich über das gemeinsame Konto anmelden (E4.2 ff.,
// docs/E4-2-BAUPLAN.md, Abschnitt 4). Eingerichtet von einrichten.mjs mit
// --anwendungen; die Pfade entsprechen den Routen in aipfad/src/app/auth/.

export const PROJEKT = 'Lernpfade';

export const ANWENDUNGEN = [
  { schluessel: 'aipfad', name: 'AIPfad', basis: 'https://www.aipfad.de' },
];

/**
 * OIDC-Einstellungen einer Web-Anwendung: Code-Flow, Client-Secret per Basic,
 * Adresse und Name im ID-Token, Rückkanal-Abmeldung. Eine Adresse über http
 * (nur die CI-Strecke auf localhost) braucht in ZITADEL den Entwicklungsmodus.
 * `rueckkanal` weicht nur in der CI-Strecke ab: Dort erreicht ZITADEL die App
 * aus dem Container über host.docker.internal statt über 127.0.0.1.
 */
export function oidcEinstellungen(basis, rueckkanal = basis) {
  return {
    redirectUris: [`${basis}/auth/rueckkehr`],
    postLogoutRedirectUris: [`${basis}/`],
    responseTypes: ['OIDC_RESPONSE_TYPE_CODE'],
    grantTypes: ['OIDC_GRANT_TYPE_AUTHORIZATION_CODE'],
    appType: 'OIDC_APP_TYPE_WEB',
    authMethodType: 'OIDC_AUTH_METHOD_TYPE_BASIC',
    version: 'OIDC_VERSION_1_0',
    devMode: basis.startsWith('http://'),
    accessTokenType: 'OIDC_TOKEN_TYPE_BEARER',
    accessTokenRoleAssertion: false,
    idTokenRoleAssertion: false,
    idTokenUserinfoAssertion: true,
    clockSkew: '0s',
    backChannelLogoutUri: `${rueckkanal}/auth/abmelden-rueckkanal`,
  };
}
