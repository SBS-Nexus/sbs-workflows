import 'server-only';
import * as oidc from 'openid-client';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import { getEnv } from '@/server/env';
import { absoluteUrl, siteUrl } from '@/server/site';
import {
  identitaetAusClaims,
  pruefeAbmeldeToken,
  type AbmeldeAuftrag,
  type ZentraleIdentitaet,
} from '@/server/auth/zentral-identitaet';
import { type AnmeldeZustand } from '@/server/auth/zentral-zustand';

/**
 * Anbindung an das gemeinsame Konto der Lernpfade (konto.lernpfade.net,
 * ZITADEL) über OpenID Connect: Code-Flow mit PKCE und Client-Secret (E4.2,
 * docs/E4-2-BAUPLAN.md). Das gemeinsame Konto bestätigt, wer jemand ist;
 * Sitzung, Rollen und Lernstand bleiben in AIPfad.
 */

export const RUECKKEHR_PFAD = '/auth/rueckkehr';
export const RUECKKANAL_PFAD = '/auth/abmelden-rueckkanal';
const SCOPE = 'openid profile email';

interface Zugang {
  aussteller: string;
  clientId: string;
  clientSecret: string;
  zustandsSchluessel: string;
}

/** Die Zugangsdaten, oder `null`, solange keine gesetzt sind. */
export function zentralerZugang(): Zugang | null {
  const env = getEnv();
  // `getEnv()` stellt sicher: entweder alle vier Werte oder keiner.
  if (!env.AUTH_ISSUER) return null;
  return {
    aussteller: env.AUTH_ISSUER,
    clientId: env.AUTH_CLIENT_ID,
    clientSecret: env.AUTH_CLIENT_SECRET,
    zustandsSchluessel: env.AUTH_STATE_SECRET,
  };
}

/** Leiten /anmelden und /registrieren zum gemeinsamen Konto? */
export function zentraleAnmeldungAktiv(): boolean {
  return getEnv().FEATURE_ZENTRALE_ANMELDUNG === 'an';
}

let entdeckt: { schluessel: string; konfiguration: Promise<oidc.Configuration> } | null = null;

/**
 * Discovery einmal je Prozess. Schlägt sie fehl, wird beim nächsten Aufruf
 * neu versucht, statt einen Fehler dauerhaft festzuhalten.
 */
function konfiguration(zugang: Zugang): Promise<oidc.Configuration> {
  const schluessel = `${zugang.aussteller}|${zugang.clientId}`;
  if (entdeckt?.schluessel === schluessel) return entdeckt.konfiguration;

  const unverschluesselt = new URL(zugang.aussteller).protocol === 'http:';
  const konfiguration = oidc
    .discovery(
      new URL(zugang.aussteller),
      zugang.clientId,
      { id_token_signed_response_alg: 'RS256' },
      oidc.ClientSecretBasic(zugang.clientSecret),
      // http nur für localhost, siehe `istZulaessigerAussteller()`.
      { timeout: 10, ...(unverschluesselt ? { execute: [oidc.allowInsecureRequests] } : {}) },
    )
    .catch((fehler: unknown) => {
      entdeckt = null;
      throw fehler;
    });
  entdeckt = { schluessel, konfiguration };
  return konfiguration;
}

export interface AnmeldeStart {
  adresse: URL;
  zustand: AnmeldeZustand;
}

/** Baut die Adresse beim gemeinsamen Konto und den dazu passenden Zustand. */
export async function starteAnmeldung(
  zugang: Zugang,
  optionen: { ziel: string | null; registrieren: boolean },
): Promise<AnmeldeStart> {
  const config = await konfiguration(zugang);
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const zustand: AnmeldeZustand = {
    state: oidc.randomState(),
    nonce: oidc.randomNonce(),
    codeVerifier,
    ziel: optionen.ziel,
    erstellt: Date.now(),
  };

  const parameter: Record<string, string> = {
    redirect_uri: absoluteUrl(RUECKKEHR_PFAD),
    scope: SCOPE,
    code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
    state: zustand.state,
    nonce: zustand.nonce,
    ui_locales: 'de',
  };
  // ZITADEL zeigt mit `prompt=create` gleich die Registrierung.
  if (optionen.registrieren) parameter.prompt = 'create';

  return { adresse: oidc.buildAuthorizationUrl(config, parameter), zustand };
}

export interface AnmeldeErgebnis {
  identitaet: ZentraleIdentitaet;
  idToken: string;
}

export class AnmeldungAbgebrochen extends Error {
  constructor(public readonly code: string) {
    super(`Das gemeinsame Konto hat die Anmeldung beendet (${code}).`);
    this.name = 'AnmeldungAbgebrochen';
  }
}

/**
 * Löst den Code ein und prüft das ID-Token (Signatur, Aussteller,
 * Zielgruppe, Ablauf, `nonce`, `state`, PKCE). `aktuelleAdresse` muss die
 * öffentliche Adresse sein, unter der der Browser zurückkam: Ohne Abfrage
 * wird sie zur `redirect_uri` des Token-Abrufs und muss der registrierten
 * gleichen.
 */
export async function schliesseAnmeldungAb(
  zugang: Zugang,
  aktuelleAdresse: URL,
  zustand: AnmeldeZustand,
): Promise<AnmeldeErgebnis | null> {
  const config = await konfiguration(zugang);

  let tokens: Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>;
  try {
    tokens = await oidc.authorizationCodeGrant(config, aktuelleAdresse, {
      pkceCodeVerifier: zustand.codeVerifier,
      expectedState: zustand.state,
      expectedNonce: zustand.nonce,
      idTokenExpected: true,
    });
  } catch (fehler) {
    if (fehler instanceof oidc.AuthorizationResponseError) {
      throw new AnmeldungAbgebrochen(fehler.error);
    }
    throw fehler;
  }

  const claims = tokens.claims();
  const idToken = tokens.id_token;
  if (!claims || !idToken) return null;

  let alle: Record<string, unknown> = { ...claims };
  // ZITADEL legt Adresse und Name nur ins ID-Token, wenn die Anwendung das
  // so eingestellt hat. Fehlen sie, kommen sie aus UserInfo.
  if (typeof claims.email !== 'string') {
    const info = await oidc.fetchUserInfo(config, tokens.access_token, claims.sub);
    alle = { ...info, ...claims };
  }

  const identitaet = identitaetAusClaims(alle);
  return identitaet ? { identitaet, idToken } : null;
}

/** Adresse zum Abmelden beim gemeinsamen Konto, danach zurück zur Startseite. */
export async function abmeldeAdresse(zugang: Zugang, idToken: string | null): Promise<URL> {
  const config = await konfiguration(zugang);
  const parameter: Record<string, string> = {
    client_id: zugang.clientId,
    // Genau wie registriert, mit Schrägstrich am Ende: ZITADEL vergleicht die
    // Adresse zeichengenau (`absoluteUrl('/')` liefert sie ohne).
    post_logout_redirect_uri: `${siteUrl()}/`,
  };
  if (idToken) parameter.id_token_hint = idToken;
  return oidc.buildEndSessionUrl(config, parameter);
}

let schluesselbund: { aussteller: string; schluessel: JWTVerifyGetKey } | null = null;

/** Prüft ein Logout-Token gegen die öffentlichen Schlüssel des Kontos. */
export async function pruefeRueckkanal(zugang: Zugang, token: string): Promise<AbmeldeAuftrag> {
  const config = await konfiguration(zugang);
  const metadaten = config.serverMetadata();
  if (!metadaten.jwks_uri) throw new Error('Das gemeinsame Konto nennt keine jwks_uri.');

  if (schluesselbund?.aussteller !== metadaten.issuer) {
    schluesselbund = {
      aussteller: metadaten.issuer,
      schluessel: createRemoteJWKSet(new URL(metadaten.jwks_uri), {
        timeoutDuration: 5000,
        cooldownDuration: 30_000,
        cacheMaxAge: 10 * 60 * 1000,
      }),
    };
  }

  return pruefeAbmeldeToken(token, {
    aussteller: metadaten.issuer,
    zielgruppe: zugang.clientId,
    schluessel: schluesselbund.schluessel,
  });
}
