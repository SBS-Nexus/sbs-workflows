import 'server-only';
import * as oidc from 'openid-client';
import type { HubKonto } from './einstellungen.ts';
import type { HubSitzung } from './sitzung.ts';
import { ZWEITER_VERSUCH, type AnmeldeZustand } from './zentral-zustand.ts';

/**
 * OpenID Connect des Hubs (E4.5b): Code-Flow mit PKCE, `state` und `nonce` wie
 * in den Apps (Vertrag docs/learning-auth/), dazu `offline_access` für das
 * Aktualisierungstoken. Das Zugriffstoken ist ein JWT, das die Apps an ihren
 * Plattformquellen prüfen (E4.5a).
 */

export const RUECKKEHR_PFAD = '/auth/rueckkehr';
// `email` seit E5.1: Einladungen können an eine bestätigte Adresse gebunden sein.
const SCOPE = 'openid profile email offline_access';

let entdeckt: { schluessel: string; konfiguration: Promise<oidc.Configuration> } | null = null;

function konfiguration(konto: HubKonto): Promise<oidc.Configuration> {
  const schluessel = `${konto.aussteller}|${konto.clientId}`;
  if (entdeckt?.schluessel === schluessel) return entdeckt.konfiguration;
  const unverschluesselt = new URL(konto.aussteller).protocol === 'http:';
  const konfiguration = oidc
    .discovery(
      new URL(konto.aussteller),
      konto.clientId,
      { id_token_signed_response_alg: 'RS256' },
      oidc.ClientSecretBasic(konto.clientSecret),
      { timeout: 10, ...(unverschluesselt ? { execute: [oidc.allowInsecureRequests] } : {}) },
    )
    .catch((fehler: unknown) => {
      entdeckt = null;
      throw fehler;
    });
  entdeckt = { schluessel, konfiguration };
  return konfiguration;
}

export async function starteAnmeldung(
  konto: HubKonto,
  optionen: {
    ziel: string | null;
    zweiterVersuch?: boolean;
    /** Neu anmelden, auch mit gültiger Sitzung beim Konto (etwa nach Einrichten des zweiten Faktors). */
    frisch?: boolean;
  },
): Promise<{ adresse: URL; zustand: AnmeldeZustand }> {
  const config = await konfiguration(konto);
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const zustand: AnmeldeZustand = {
    state: `${optionen.zweiterVersuch ? ZWEITER_VERSUCH : ''}${oidc.randomState()}`,
    nonce: oidc.randomNonce(),
    codeVerifier,
    ziel: optionen.ziel,
    erstellt: Date.now(),
  };
  const adresse = oidc.buildAuthorizationUrl(config, {
    redirect_uri: `${konto.basis}${RUECKKEHR_PFAD}`,
    scope: SCOPE,
    code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
    state: zustand.state,
    nonce: zustand.nonce,
    ui_locales: 'de',
    ...(optionen.frisch ? { prompt: 'login', max_age: '0' } : {}),
  });
  return { adresse, zustand };
}

export class AnmeldungAbgebrochen extends Error {
  readonly code: string;
  constructor(code: string) {
    super(`Das gemeinsame Konto hat die Anmeldung beendet (${code}).`);
    this.name = 'AnmeldungAbgebrochen';
    this.code = code;
  }
}

function anzeigename(claims: Record<string, unknown>): string {
  for (const kandidat of [claims.name, claims.given_name, claims.preferred_username]) {
    if (typeof kandidat === 'string' && kandidat.trim().length >= 2 && !kandidat.includes('@')) {
      return kandidat.trim().slice(0, 80);
    }
  }
  return 'Angemeldet';
}

type Merkmale = Pick<HubSitzung, 'sub' | 'name' | 'email' | 'emailBestaetigt' | 'zweiFaktoren'>;

/** Was der Hub aus dem ID-Token übernimmt. `amr` wie im Anmeldevertrag der Apps. */
export function merkmaleAus(claims: Record<string, unknown> & { sub: string }): Merkmale {
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  return {
    sub: claims.sub,
    name: anzeigename(claims),
    email: email.includes('@') ? email : null,
    emailBestaetigt: claims.email_verified === true,
    zweiFaktoren: amr.includes('mfa'),
  };
}

function sitzungAus(
  tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers,
  merkmale: Merkmale,
  bisherigeAktualisierung: string | null,
): HubSitzung {
  const sekunden = tokens.expiresIn() ?? 300;
  return {
    ...merkmale,
    zugriffstoken: tokens.access_token,
    // ZITADEL gibt beim Aktualisieren ein neues Aktualisierungstoken aus.
    aktualisierung: tokens.refresh_token ?? bisherigeAktualisierung,
    gueltigBis: Date.now() + sekunden * 1000,
  };
}

/** Löst den Code ein; `aktuelleAdresse` ist die öffentliche Rückkehradresse samt Abfrage. */
export async function schliesseAnmeldungAb(
  konto: HubKonto,
  aktuelleAdresse: URL,
  zustand: AnmeldeZustand,
): Promise<{ sitzung: HubSitzung; idToken: string } | null> {
  const config = await konfiguration(konto);
  let tokens: Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>;
  try {
    tokens = await oidc.authorizationCodeGrant(config, aktuelleAdresse, {
      pkceCodeVerifier: zustand.codeVerifier,
      expectedState: zustand.state,
      expectedNonce: zustand.nonce,
      idTokenExpected: true,
    });
  } catch (fehler) {
    if (fehler instanceof oidc.AuthorizationResponseError)
      throw new AnmeldungAbgebrochen(fehler.error);
    throw fehler;
  }
  const claims = tokens.claims();
  if (!claims?.sub || !tokens.id_token) return null;
  return {
    sitzung: sitzungAus(tokens, merkmaleAus(claims), null),
    idToken: tokens.id_token,
  };
}

/**
 * Holt ein neues Zugriffstoken. `null` nur, wenn das Konto die Sitzung
 * ausdrücklich beendet hat (`invalid_grant`: abgemeldet, abgelaufen,
 * widerrufen). Ein technischer Fehler (Konto nicht erreichbar, falsche
 * Einrichtung) wirft: Dann bleibt die Sitzung im Hub bestehen, und der
 * nächste Abruf versucht es erneut.
 */
export async function aktualisiere(
  konto: HubKonto,
  sitzung: HubSitzung,
): Promise<HubSitzung | null> {
  if (!sitzung.aktualisierung) return null;
  const config = await konfiguration(konto);
  try {
    const tokens = await oidc.refreshTokenGrant(config, sitzung.aktualisierung);
    // Merkmale bleiben die der Anmeldung: Der zweite Faktor gilt für diese Anmeldung.
    return sitzungAus(
      tokens,
      {
        sub: sitzung.sub,
        name: sitzung.name,
        email: sitzung.email,
        emailBestaetigt: sitzung.emailBestaetigt,
        zweiFaktoren: sitzung.zweiFaktoren,
      },
      sitzung.aktualisierung,
    );
  } catch (fehler) {
    if (fehler instanceof oidc.ResponseBodyError && fehler.error === 'invalid_grant') return null;
    throw fehler;
  }
}

export async function abmeldeAdresse(konto: HubKonto, idToken: string | null): Promise<URL> {
  const config = await konfiguration(konto);
  return oidc.buildEndSessionUrl(config, {
    client_id: konto.clientId,
    post_logout_redirect_uri: `${konto.basis}/`,
    ...(idToken ? { id_token_hint: idToken } : {}),
  });
}
