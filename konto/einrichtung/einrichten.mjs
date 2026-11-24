#!/usr/bin/env node
// Richtet die ZITADEL-Instanz auf konto.lernpfade.net ein (docs/E4-1-BAUPLAN.md).
//
// Meldet sich als System-Nutzer mit einem selbst signierten JWT an. Der
// öffentliche Schlüssel steht während der Einrichtung in ZITADEL_SYSTEMAPIUSERS.
// Danach wird er dort entfernt und der private Schlüssel gelöscht.
//
// Ausgabe: nur Schritte und Statuscodes. Neue Geheimnisse (Token der
// Anmelde-App, Signaturschlüssel des Mailanbieters) landen als JSON in
// --ausgabe (Dateirechte 600) und gehen von dort per Datei an Railway.
//
// Aufruf:
//   node konto/einrichtung/einrichten.mjs --basis https://konto.lernpfade.net \
//     --schluessel /pfad/einrichtung.pem --nutzer einrichtung \
//     --mail-endpunkt https://<konto-mail>.up.railway.app/ --ausgabe /pfad/geheim \
//     [--login-token-erneuern] [--mail-neu] [--ueber https://<konto-proxy>.up.railway.app]
//     [--anwendungen [--anwendung-basis aipfad=http://127.0.0.1:3101]
//      [--rueckkanal-basis aipfad=http://host.docker.internal:3101] [--secret-erneuern aipfad]]
//
// --ueber schickt die Anfragen an eine andere Adresse desselben Proxys (etwa
// solange das DNS für konto.lernpfade.net noch fehlt). Das Token bleibt auf
// --basis ausgestellt; der Proxy setzt den Host ohnehin auf konto.lernpfade.net.
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ANWENDUNGEN, PROJEKT, oidcEinstellungen } from './anwendungen.mjs';
import { iconSvg, logoSvg, schriftDatei } from './marke.mjs';
import { systemToken } from './zugang.mjs';
import { NACHRICHTEN } from './texte.mjs';

const { values: arg } = parseArgs({
  options: {
    basis: { type: 'string' },
    schluessel: { type: 'string' },
    nutzer: { type: 'string', default: 'einrichtung' },
    'mail-endpunkt': { type: 'string' },
    ausgabe: { type: 'string' },
    'login-token-erneuern': { type: 'boolean', default: false },
    'mail-neu': { type: 'boolean', default: false },
    'nur-pruefen': { type: 'boolean', default: false },
    ueber: { type: 'string' },
    anwendungen: { type: 'boolean', default: false },
    'anwendung-basis': { type: 'string', multiple: true, default: [] },
    'rueckkanal-basis': { type: 'string', multiple: true, default: [] },
    'secret-erneuern': { type: 'string', multiple: true, default: [] },
  },
});
for (const pflicht of ['basis', 'schluessel', 'ausgabe']) {
  if (!arg[pflicht]) throw new Error(`--${pflicht} fehlt`);
}
const BASIS = arg.basis.replace(/\/$/, '');
const ZIEL = (arg.ueber ?? arg.basis).replace(/\/$/, '');

// --- Anmeldung als System-Nutzer -------------------------------------------

const TOKEN = systemToken({
  nutzer: arg.nutzer,
  aussteller: BASIS,
  schluesselPfad: arg.schluessel,
});

/** Fehler, die beim zweiten Lauf erwartbar sind und nichts bedeuten. */
const SCHON_SO =
  /already exists|alreadyexists|not changed|notchanged|has not been changed|no changes|existiert bereits|nicht (?:ver)?ändert|nicht geändert|keine änderungen/i;

async function api(methode, pfad, koerper, { orgId, erlaubt = [] } = {}) {
  const kopf = { authorization: `Bearer ${TOKEN}`, accept: 'application/json' };
  if (koerper !== undefined) kopf['content-type'] = 'application/json';
  if (orgId) kopf['x-zitadel-orgid'] = orgId;
  const antwort = await fetch(ZIEL + pfad, {
    method: methode,
    headers: kopf,
    body: koerper === undefined ? undefined : JSON.stringify(koerper),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await antwort.text();
  let daten = {};
  try {
    daten = text ? JSON.parse(text) : {};
  } catch {
    daten = { message: text.slice(0, 200) };
  }
  return {
    status: antwort.status,
    ok: antwort.ok,
    daten,
    erlaubt: erlaubt.includes(antwort.status),
  };
}

let fehler = 0;
async function schritt(name, methode, pfad, koerper, optionen) {
  const r = await api(methode, pfad, koerper, optionen);
  const harmlos = !r.ok && SCHON_SO.test(String(r.daten?.message ?? ''));
  if (r.ok || harmlos || r.erlaubt) {
    console.log(`OK     ${name} (${r.status}${harmlos ? ', schon so' : ''})`);
  } else {
    fehler += 1;
    // Fehlermeldungen von ZITADEL enthalten keine Geheimnisse; gekürzt trotzdem.
    console.log(`FEHLER ${name} (${r.status}) ${String(r.daten?.message ?? '').slice(0, 160)}`);
  }
  return r;
}

/** Lädt eine Datei in die Assets-API (Logo, Icon, Schrift); max. 512 KB laut ZITADEL. */
async function hochladen(name, pfad, inhalt, typ, dateiname) {
  const formular = new FormData();
  formular.append('file', new Blob([inhalt], { type: typ }), dateiname);
  const antwort = await fetch(ZIEL + pfad, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}` },
    body: formular,
    signal: AbortSignal.timeout(30_000),
  });
  if (antwort.ok) {
    console.log(`OK     ${name} (${antwort.status})`);
  } else {
    fehler += 1;
    console.log(`FEHLER ${name} (${antwort.status}) ${(await antwort.text()).slice(0, 160)}`);
  }
}

function schreibeGeheim(datei, variablen) {
  mkdirSync(arg.ausgabe, { recursive: true, mode: 0o700 });
  const pfad = join(arg.ausgabe, datei);
  writeFileSync(pfad, JSON.stringify(variablen), { mode: 0o600 });
  chmodSync(pfad, 0o600);
  console.log(`DATEI  ${datei} geschrieben (${Object.keys(variablen).join(', ')})`);
}

// --- Ablauf -----------------------------------------------------------------

const org = await schritt('Standard-Organisation lesen', 'GET', '/admin/v1/orgs/default');
const orgId = org.daten?.org?.id;
if (!orgId) throw new Error('Standard-Organisation nicht gefunden – Zugang prüfen');
if (arg['nur-pruefen']) {
  console.log(fehler === 0 ? 'Zugang funktioniert.' : 'Zugang fehlerhaft.');
  process.exit(fehler === 0 ? 0 : 1);
}

// Passwörter: Länge statt Zeichenregeln (Bauplan, Abschnitt 4).
await schritt('Passwortregeln', 'PUT', '/admin/v1/policies/password/complexity', {
  minLength: 12,
  hasUppercase: false,
  hasLowercase: false,
  hasNumber: false,
  hasSymbol: false,
});

// Keine Dauersperre nach Passwörtern (Fremde könnten Konten sperren); 5 Codes.
await schritt('Sperrregeln', 'PUT', '/admin/v1/policies/password/lockout', {
  maxPasswordAttempts: 0,
  maxOtpAttempts: 5,
});

await schritt('Anmelderegeln', 'PUT', '/admin/v1/policies/login', {
  allowUsernamePassword: true,
  allowRegister: true,
  allowExternalIdp: false,
  forceMfa: false,
  forceMfaLocalOnly: false,
  passwordlessType: 'PASSWORDLESS_TYPE_ALLOWED',
  hidePasswordReset: false,
  ignoreUnknownUsernames: true,
  defaultRedirectUri: '',
  passwordCheckLifetime: '864000s', // 10 Tage
  externalLoginCheckLifetime: '864000s',
  mfaInitSkipLifetime: '0s', // Lernende werden nicht zum zweiten Faktor gedrängt
  secondFactorCheckLifetime: '64800s', // 18 Stunden
  multiFactorCheckLifetime: '43200s', // 12 Stunden
  allowDomainDiscovery: false,
  disableLoginWithEmail: false,
  disableLoginWithPhone: true,
});

// Zweiter Faktor: TOTP und Sicherheitsschlüssel; kein SMS, kein Mail-Code.
for (const typ of ['SECOND_FACTOR_TYPE_OTP', 'SECOND_FACTOR_TYPE_U2F']) {
  await schritt(
    `Zweiter Faktor ${typ}`,
    'POST',
    '/admin/v1/policies/login/second_factors',
    { type: typ },
    { erlaubt: [409] },
  );
}
for (const typ of ['SECOND_FACTOR_TYPE_OTP_EMAIL', 'SECOND_FACTOR_TYPE_OTP_SMS']) {
  await schritt(
    `Zweiter Faktor ${typ} aus`,
    'DELETE',
    `/admin/v1/policies/login/second_factors/${typ}`,
    undefined,
    { erlaubt: [404] },
  );
}
// Passkeys (ein Faktor mit Nutzerprüfung zählt in amr als mfa).
await schritt(
  'Passkeys',
  'POST',
  '/admin/v1/policies/login/multi_factors',
  { type: 'MULTI_FACTOR_TYPE_U2F_WITH_VERIFICATION' },
  { erlaubt: [409] },
);

await schritt('Domain-Regeln', 'PUT', '/admin/v1/policies/domain', {
  userLoginMustBeDomain: false,
  validateOrgDomains: false,
  smtpSenderAddressMatchesInstanceDomain: false,
});
await schritt('Benachrichtigung bei Passwortänderung', 'PUT', '/admin/v1/policies/notification', {
  passwordChange: true,
});

// Marke: Learning OS (docs/learning-tokens, docs/learning-feedback).
await schritt('Markenfarben', 'PUT', '/admin/v1/policies/label', {
  primaryColor: '#0b0e0e',
  backgroundColor: '#f2f2e9',
  fontColor: '#141c18',
  warnColor: '#c0281c',
  primaryColorDark: '#d0fa83',
  backgroundColorDark: '#0b0e0e',
  fontColorDark: '#f1f1e9',
  warnColorDark: '#f2867c',
  hideLoginNameSuffix: true,
  disableWatermark: true,
  themeMode: 'THEME_MODE_AUTO',
});
// Logo (hell/dunkel), Icon und IBM Plex für die Anmeldeseite (konto/einrichtung/marke.mjs).
const ASSETS = '/assets/v1/instance/policy/label';
await hochladen('Logo hell', `${ASSETS}/logo`, logoSvg('hell'), 'image/svg+xml', 'logo-hell.svg');
await hochladen(
  'Logo dunkel',
  `${ASSETS}/logo/dark`,
  logoSvg('dunkel'),
  'image/svg+xml',
  'logo-dunkel.svg',
);
await hochladen('Icon hell', `${ASSETS}/icon`, iconSvg(), 'image/svg+xml', 'icon.svg');
await hochladen('Icon dunkel', `${ASSETS}/icon/dark`, iconSvg(), 'image/svg+xml', 'icon.svg');
await hochladen(
  'Schrift IBM Plex Sans',
  `${ASSETS}/font`,
  schriftDatei(),
  'font/woff2',
  'plex-sans.woff2',
);
await schritt('Marke aktivieren', 'POST', '/admin/v1/policies/label/_activate', {});

await schritt('Standardsprache Deutsch', 'PUT', '/admin/v1/languages/default/de');
await schritt('Sprachen und Organisationsregistrierung', 'PUT', '/admin/v1/restrictions', {
  disallowPublicOrgRegistration: true,
  allowedLanguages: { list: ['de', 'en'] },
});

for (const [sprache, texte] of Object.entries(NACHRICHTEN)) {
  for (const [typ, text] of Object.entries(texte)) {
    await schritt(
      `Mailtext ${typ} (${sprache})`,
      'PUT',
      `/admin/v1/text/message/${typ}/${sprache}`,
      { language: sprache, ...text },
    );
  }
}

// Texte der Anmeldeseite (Login v2): Du-Ton der Lernpfade, ohne „Zitadel“.
// Die Anmelde-App führt sie mit ihren eingebauten Texten zusammen.
// Zweimal gesetzt: Kennt die Anmelde-App die Organisation (etwa auf der
// Bestätigungsseite), fragt sie deren Texte ab, und ZITADEL ergänzt die dann
// aus den eingebauten Texten statt aus denen der Instanz (gefunden mit der
// CI-Strecke zu E4.2: „Benutzer verifizieren“ statt unseres Titels).
for (const sprache of ['de', 'en']) {
  const texte = JSON.parse(
    readFileSync(new URL(`./anmeldetexte.${sprache}.json`, import.meta.url), 'utf8'),
  );
  await schritt(`Anmeldetexte (${sprache})`, 'PUT', '/v2/settings/hosted_login_translation', {
    instance: true,
    locale: sprache,
    translations: texte,
  });
  await schritt(
    `Anmeldetexte (${sprache}, Organisation)`,
    'PUT',
    '/v2/settings/hosted_login_translation',
    { organizationId: orgId, locale: sprache, translations: texte },
  );
}

// Mailversand über konto-mail (HTTP-Anbieter mit Signatur).
if (arg['mail-endpunkt']) {
  const liste = await schritt('Mailanbieter lesen', 'POST', '/admin/v1/email/_search', {});
  const alle = liste.daten?.result ?? [];
  const passende = alle.filter((p) => p.http?.endpoint === arg['mail-endpunkt']);
  if (passende.length > 0 && !arg['mail-neu']) {
    console.log(
      'OK     Mailanbieter vorhanden (Signaturschlüssel unverändert; --mail-neu erneuert ihn)',
    );
  } else {
    const neu = await schritt('Mailanbieter anlegen', 'POST', '/admin/v1/email/http', {
      endpoint: arg['mail-endpunkt'],
      description: 'konto-mail → Scaleway Transactional Email',
    });
    if (neu.ok && neu.daten?.id && neu.daten?.signingKey) {
      schreibeGeheim('konto-mail.json', {
        ZITADEL_SIGNING_KEY: neu.daten.signingKey,
      });
      await schritt(
        'Mailanbieter aktivieren',
        'POST',
        `/admin/v1/email/${neu.daten.id}/_activate`,
        {},
      );
      for (const alt of alle) {
        await schritt(
          `Alten Mailanbieter entfernen (${alt.id})`,
          'DELETE',
          `/admin/v1/email/${alt.id}`,
        );
      }
    }
  }
} else {
  console.log('HINWEIS --mail-endpunkt fehlt: Mailanbieter nicht eingerichtet');
}

// Zugang der Anmelde-App: Maschinennutzer mit IAM_LOGIN_CLIENT und Token.
const suche = await schritt(
  'Anmelde-App-Nutzer suchen',
  'POST',
  '/management/v1/users/_search',
  {
    queries: [
      {
        userNameQuery: {
          userName: 'login-client',
          method: 'TEXT_QUERY_METHOD_EQUALS',
        },
      },
    ],
  },
  { orgId },
);
let loginNutzer = suche.daten?.result?.[0]?.id;
let neuAngelegt = false;
if (!loginNutzer) {
  const angelegt = await schritt(
    'Anmelde-App-Nutzer anlegen',
    'POST',
    '/management/v1/users/machine',
    {
      userName: 'login-client',
      name: 'Anmelde-App',
      description: 'konto-login (ZITADEL Login v2)',
      accessTokenType: 'ACCESS_TOKEN_TYPE_BEARER',
    },
    { orgId },
  );
  loginNutzer = angelegt.daten?.userId;
  neuAngelegt = Boolean(loginNutzer);
}
if (loginNutzer) {
  await schritt(
    'Rolle IAM_LOGIN_CLIENT',
    'POST',
    '/admin/v1/members',
    { userId: loginNutzer, roles: ['IAM_LOGIN_CLIENT'] },
    { erlaubt: [409] },
  );
  if (neuAngelegt || arg['login-token-erneuern']) {
    // Läuft nach zwei Jahren ab; Erneuern steht in konto/README.md.
    const ablauf = new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000).toISOString();
    const pat = await schritt(
      'Token der Anmelde-App',
      'POST',
      `/management/v1/users/${loginNutzer}/pats`,
      { expirationDate: ablauf },
      { orgId },
    );
    if (pat.ok && pat.daten?.token) {
      schreibeGeheim('konto-login.json', {
        ZITADEL_SERVICE_USER_TOKEN: pat.daten.token,
      });
      console.log(`HINWEIS Token gilt bis ${ablauf.slice(0, 10)}`);
    }
  } else {
    console.log(
      'OK     Token der Anmelde-App unverändert (--login-token-erneuern erzeugt ein neues)',
    );
  }
}

// Anwendungen am gemeinsamen Konto (E4.2): Projekt, OIDC-Anwendungen und
// die Rückkanal-Abmeldung. Neue Zugangsdaten landen je Anwendung in
// <schluessel>-auth.json (AUTH_CLIENT_ID, AUTH_CLIENT_SECRET).
if (arg.anwendungen) {
  const zuordnung = (liste) =>
    Object.fromEntries(
      liste.map((eintrag) => {
        const [schluessel, basis] = eintrag.split('=');
        return [schluessel, basis.replace(/\/$/, '')];
      }),
    );
  const basisFuer = zuordnung(arg['anwendung-basis']);
  const rueckkanalFuer = zuordnung(arg['rueckkanal-basis']);

  await schritt('Rückkanal-Abmeldung einschalten', 'PUT', '/v2/features/instance', {
    enableBackChannelLogout: true,
  });
  // Auch wenn sie schon an war ("schon so"): Den Stand lesen und ausgeben.
  const stand = await schritt('Funktionen lesen', 'GET', '/v2/features/instance');
  console.log(
    `HINWEIS Rückkanal=${stand.daten?.enableBackChannelLogout?.enabled} LoginV2=${stand.daten?.loginV2?.required}`,
  );

  const projekte = await schritt(
    `Projekt ${PROJEKT} suchen`,
    'POST',
    '/management/v1/projects/_search',
    { queries: [{ nameQuery: { name: PROJEKT, method: 'TEXT_QUERY_METHOD_EQUALS' } }] },
    { orgId },
  );
  let projektId = projekte.daten?.result?.[0]?.id;
  if (!projektId) {
    const neu = await schritt(
      `Projekt ${PROJEKT} anlegen`,
      'POST',
      '/management/v1/projects',
      {
        name: PROJEKT,
        projectRoleAssertion: false,
        projectRoleCheck: false,
        hasProjectCheck: false,
      },
      { orgId },
    );
    projektId = neu.daten?.id;
  }

  if (projektId) {
    const vorhanden = await schritt(
      'Anwendungen lesen',
      'POST',
      `/management/v1/projects/${projektId}/apps/_search`,
      { query: { limit: 100 } },
      { orgId },
    );
    for (const anwendung of ANWENDUNGEN) {
      const basis = basisFuer[anwendung.schluessel] ?? anwendung.basis;
      const einstellungen = oidcEinstellungen(
        basis,
        rueckkanalFuer[anwendung.schluessel] ?? basis,
        anwendung,
      );
      const app = (vorhanden.daten?.result ?? []).find((a) => a.name === anwendung.name);

      if (!app) {
        const neu = await schritt(
          `Anwendung ${anwendung.name} anlegen (${basis})`,
          'POST',
          `/management/v1/projects/${projektId}/apps/oidc`,
          { name: anwendung.name, ...einstellungen },
          { orgId },
        );
        if (neu.ok && neu.daten?.clientSecret) {
          schreibeGeheim(`${anwendung.schluessel}-auth.json`, {
            AUTH_CLIENT_ID: neu.daten.clientId,
            AUTH_CLIENT_SECRET: neu.daten.clientSecret,
          });
        }
        continue;
      }

      await schritt(
        `Anwendung ${anwendung.name} einstellen (${basis})`,
        'PUT',
        `/management/v1/projects/${projektId}/apps/${app.id}/oidc_config`,
        einstellungen,
        { orgId },
      );
      if (arg['secret-erneuern'].includes(anwendung.schluessel)) {
        const secret = await schritt(
          `Client-Secret ${anwendung.name} erneuern`,
          'POST',
          `/management/v1/projects/${projektId}/apps/${app.id}/oidc_config/_generate_client_secret`,
          {},
          { orgId },
        );
        if (secret.ok && secret.daten?.clientSecret) {
          schreibeGeheim(`${anwendung.schluessel}-auth.json`, {
            AUTH_CLIENT_ID: app.oidcConfig?.clientId,
            AUTH_CLIENT_SECRET: secret.daten.clientSecret,
          });
        }
      } else {
        console.log(
          `OK     Client-Secret ${anwendung.name} unverändert (--secret-erneuern ${anwendung.schluessel})`,
        );
      }
    }
  }
}

console.log(fehler === 0 ? 'Fertig, ohne Fehler.' : `Fertig mit ${fehler} Fehler(n).`);
process.exit(fehler === 0 ? 0 : 1);
