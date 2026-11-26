import { z } from 'zod';

/**
 * Umgebungswerte der Anmeldung über das gemeinsame Konto (Vertrag
 * docs/learning-auth/). Jede App nimmt die Felder in ihr `env.ts` auf und
 * prüft sie mit `pruefeZentraleAnmeldung` (`superRefine`):
 *
 *   const schema = z.object({ ..., ...zentraleAnmeldungFelder })
 *     .superRefine(pruefeZentraleAnmeldung);
 *
 * `aus` (Vorgabe): Die eigenen Formulare gelten. Sind die vier AUTH_*-Werte
 * gesetzt, lässt sich der Weg über /auth/anmelden trotzdem schon ausprobieren.
 * `an`: /anmelden und /registrieren leiten zum gemeinsamen Konto, die eigenen
 * Formulare nehmen nichts mehr an.
 */
export const zentraleAnmeldungFelder = {
  FEATURE_ZENTRALE_ANMELDUNG: z.enum(['aus', 'an']).default('aus'),
  /** Aussteller des gemeinsamen Kontos, etwa https://konto.lernpfade.net. */
  AUTH_ISSUER: z.string().trim().default(''),
  AUTH_CLIENT_ID: z.string().trim().default(''),
  AUTH_CLIENT_SECRET: z.string().default(''),
  /** Schlüssel für den signierten Zustand zwischen Start und Rückkehr. */
  AUTH_STATE_SECRET: z.string().default(''),
  /**
   * Client-ID des Lernpfade-Hubs (E4.5). Gesetzt nehmen die Plattformquellen
   * dessen Zugriffstoken an; leer bleibt dieser Weg aus.
   */
  AUTH_HUB_CLIENT_ID: z.string().trim().default(''),
  /**
   * `sub` des Maschinenkontos der Plattform (E5.2). Gesetzt nimmt die
   * Team-Quelle dessen Diensttoken an; leer bleibt dieser Weg aus.
   */
  AUTH_PLATTFORM_SUB: z.string().trim().default(''),
};

type ZentraleWerte = {
  FEATURE_ZENTRALE_ANMELDUNG: 'aus' | 'an';
  AUTH_ISSUER: string;
  AUTH_CLIENT_ID: string;
  AUTH_CLIENT_SECRET: string;
  AUTH_STATE_SECRET: string;
  AUTH_HUB_CLIENT_ID: string;
  AUTH_PLATTFORM_SUB: string;
};

const ZENTRALE_WERTE = [
  'AUTH_ISSUER',
  'AUTH_CLIENT_ID',
  'AUTH_CLIENT_SECRET',
  'AUTH_STATE_SECRET',
] as const;

/**
 * Ein Aussteller muss eine Adresse ohne Abfrage und Anker sein, über https.
 * `http` nur für localhost: Die CI-Strecke betreibt einen echten ZITADEL ohne
 * TLS auf dem Runner.
 */
export function istZulaessigerAussteller(wert: string): boolean {
  let url: URL;
  try {
    url = new URL(wert);
  } catch {
    return false;
  }
  if (url.search || url.hash || url.username || url.password) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

/** Entweder alle vier AUTH_*-Werte oder keiner; mit Schalter `an` alle. */
export function pruefeZentraleAnmeldung(env: ZentraleWerte, ctx: z.RefinementCtx): void {
  const gesetzt = ZENTRALE_WERTE.filter((name) => env[name].length > 0);
  const gefordert =
    env.FEATURE_ZENTRALE_ANMELDUNG === 'an' ||
    gesetzt.length > 0 ||
    env.AUTH_HUB_CLIENT_ID !== '' ||
    env.AUTH_PLATTFORM_SUB !== '';
  if (!gefordert) return;

  for (const name of ZENTRALE_WERTE) {
    if (env[name].length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: [name],
        message:
          env.FEATURE_ZENTRALE_ANMELDUNG === 'an'
            ? `${name} fehlt. FEATURE_ZENTRALE_ANMELDUNG=an braucht alle vier AUTH_*-Werte.`
            : `${name} fehlt. Die AUTH_*-Werte gelten nur vollständig, nicht teilweise.`,
      });
    }
  }
  if (env.AUTH_ISSUER && !istZulaessigerAussteller(env.AUTH_ISSUER)) {
    ctx.addIssue({
      code: 'custom',
      path: ['AUTH_ISSUER'],
      message: 'AUTH_ISSUER muss eine https-Adresse ohne Abfrage sein (http nur für localhost).',
    });
  }
  if (env.AUTH_CLIENT_SECRET && env.AUTH_CLIENT_SECRET.length < 16) {
    ctx.addIssue({
      code: 'custom',
      path: ['AUTH_CLIENT_SECRET'],
      message: 'AUTH_CLIENT_SECRET muss mindestens 16 Zeichen lang sein.',
    });
  }
  if (env.AUTH_STATE_SECRET && env.AUTH_STATE_SECRET.length < 32) {
    ctx.addIssue({
      code: 'custom',
      path: ['AUTH_STATE_SECRET'],
      message: 'AUTH_STATE_SECRET muss mindestens 32 Zeichen lang sein.',
    });
  }
}
