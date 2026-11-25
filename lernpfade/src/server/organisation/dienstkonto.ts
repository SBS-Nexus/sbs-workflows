import 'server-only';
import * as oidc from 'openid-client';
import { hubKonto } from '../konto/einstellungen.ts';

/**
 * E5.2 — Diensttoken der Plattform für die Team-Quelle der Apps.
 *
 * Das Maschinenkonto `lernpfade-plattform` im gemeinsamen Konto holt sich per
 * Client Credentials ein JWT; die Apps prüfen dessen `sub`
 * (`AUTH_PLATTFORM_SUB`). Werte: `PLATTFORM_CLIENT_ID` und
 * `PLATTFORM_CLIENT_SECRET`, beide oder keiner; ohne sie gibt es keinen
 * Teamstand. Das Token bleibt im Speicher des Prozesses, bis es bald abläuft.
 */

type Zwischenspeicher = { token: string; gueltigBis: number; schluessel: string };
let gespeichert: Zwischenspeicher | null = null;
let entdeckt: { schluessel: string; konfiguration: Promise<oidc.Configuration> } | null = null;

export function dienstkontoEingerichtet(): boolean {
  return Boolean(hubKonto() && process.env.PLATTFORM_CLIENT_ID?.trim() && process.env.PLATTFORM_CLIENT_SECRET);
}

function konfiguration(aussteller: string, clientId: string, secret: string): Promise<oidc.Configuration> {
  const schluessel = `${aussteller}|${clientId}`;
  if (entdeckt?.schluessel === schluessel) return entdeckt.konfiguration;
  const unverschluesselt = new URL(aussteller).protocol === 'http:';
  const neu = oidc
    .discovery(new URL(aussteller), clientId, undefined, oidc.ClientSecretBasic(secret), {
      timeout: 10,
      ...(unverschluesselt ? { execute: [oidc.allowInsecureRequests] } : {}),
    })
    .catch((fehler: unknown) => {
      entdeckt = null;
      throw fehler;
    });
  entdeckt = { schluessel, konfiguration: neu };
  return neu;
}

/** Ein gültiges Diensttoken oder `null`, wenn das Dienstkonto nicht eingerichtet ist. */
export async function diensttoken(jetzt = Date.now()): Promise<string | null> {
  const konto = hubKonto();
  const clientId = process.env.PLATTFORM_CLIENT_ID?.trim();
  const secret = process.env.PLATTFORM_CLIENT_SECRET;
  if (!konto || !clientId || !secret) return null;
  const schluessel = `${konto.aussteller}|${clientId}`;
  if (gespeichert?.schluessel === schluessel && gespeichert.gueltigBis - 60_000 > jetzt) return gespeichert.token;

  const config = await konfiguration(konto.aussteller, clientId, secret);
  const antwort = await oidc.clientCredentialsGrant(config, { scope: 'openid' });
  gespeichert = {
    token: antwort.access_token,
    gueltigBis: jetzt + (antwort.expiresIn() ?? 300) * 1000,
    schluessel,
  };
  return gespeichert.token;
}
