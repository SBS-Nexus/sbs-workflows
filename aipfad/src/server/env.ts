import 'server-only';
import { z } from 'zod';
import { isAllowedHubOriginSetting } from '@/server/platform/review-source-http';

/**
 * Zentrale, validierte Konfiguration. Fehlt eine notwendige Variable oder ist
 * sie unplausibel, wirft `getEnv()` mit einer verständlichen Meldung – statt
 * später mit einem schwer zuzuordnenden Laufzeitfehler.
 *
 * `src/instrumentation.ts` ruft `getEnv()` beim Start jeder Node.js-
 * Serverinstanz auf. Ungültige oder fehlende Pflichtvariablen verhindern
 * damit, dass der Prozess Anfragen entgegennimmt.
 *
 * Diese Datei ist mit `server-only` markiert und kann dadurch nicht
 * versehentlich in ein Client-Bundle geraten. Secrets bleiben auf dem Server.
 *
 * Anders als PythonPfad enthält diese Ausbaustufe keine KI-Anbieter-Variablen:
 * Es findet kein Live-Aufruf an einen externen Dienst statt (siehe
 * docs/CONTENT-POLICY.md). Ein AI-Gateway ist als nächster Ausbauschritt in
 * docs/LEHRPLAN.md vorgesehen.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string({ error: 'DATABASE_URL fehlt.' }).min(1, 'DATABASE_URL fehlt.'),
  APP_URL: z.url().default('http://localhost:3000'),
  DEPLOYMENT_ID: z
    .string({
      error: 'DEPLOYMENT_ID fehlt. Nutze eine unveränderliche Build- oder Commit-Kennung.',
    })
    .trim()
    .min(1, 'DEPLOYMENT_ID fehlt. Nutze eine unveränderliche Build- oder Commit-Kennung.')
    .max(200, 'DEPLOYMENT_ID darf höchstens 200 Zeichen lang sein.'),
  ATTEMPT_RETENTION_DAYS: z.coerce.number().int().min(0).max(3650).default(365),
  /**
   * Geheimnis für den geplanten Aufbewahrungslauf (E04A).
   *
   * Bewusst PFLICHT und ohne Vorgabewert: Die Anwendung hat seit E04A einen
   * Zeitplan, der eine Route mit Löschwirkung aufruft. Startete sie ohne
   * Geheimnis, wäre entweder die Route offen oder der Zeitplan dauerhaft
   * wirkungslos — beides still. E02 hat dafür die Richtung vorgegeben: Was
   * der Betrieb braucht, wird beim Start geprüft, nicht beim ersten Aufruf.
   *
   * Mindestens 16 Zeichen. Die Grenze stammt aus der Vercel-Empfehlung und
   * gilt für den Railway-Cron unverändert.
   */
  CRON_SECRET: z
    .string({ error: 'CRON_SECRET fehlt. Vorlage: .env.example' })
    .min(16, 'CRON_SECRET muss mindestens 16 Zeichen lang sein.'),
  /**
   * Trockenlauf oder Ernstfall für die Aufbewahrung (E04A).
   *
   * Vorgabe ist `dry-run`. Eine Bereitstellung, die versehentlich nichts
   * setzt, zählt dann nur — sie löscht nicht. Für eine unwiderrufliche
   * Operation ist das die einzig vertretbare Vorgabe; `execute` muss jemand
   * ausdrücklich wählen.
   */
  RETENTION_MODE: z.enum(['dry-run', 'execute']).default('dry-run'),
  /**
   * Origin des Lernpfade-Hubs, der die schreibgeschützte Wiederholungsquelle
   * (LP-05B, `/api/platform/review-source`) aus dem Browser lesen darf.
   *
   * Leer (Vorgabe) heißt: keine CORS-Freigabe, der Hub kann nichts lesen.
   * Genau EINE Origin, ohne Pfad und ohne Platzhalter; `http` nur für
   * `localhost`. Ein ungültiger Wert verhindert den Start, statt still eine
   * falsche Herkunft freizugeben. Siehe docs/SECURITY.md.
   */
  PLATFORM_HUB_ORIGIN: z.string().trim().default('').refine(isAllowedHubOriginSetting, {
    message:
      'PLATFORM_HUB_ORIGIN muss eine einzelne Origin sein (https://host[:port], ohne Pfad) oder leer bleiben.',
  }),
  /**
   * Anmeldung über das gemeinsame Konto der Lernpfade (E4.2,
   * docs/E4-2-BAUPLAN.md).
   *
   * `aus` (Vorgabe): Die eigenen Formulare unter /anmelden und /registrieren
   * gelten. Sind die vier AUTH_*-Werte gesetzt, lässt sich der Weg über
   * /auth/anmelden trotzdem schon ausprobieren, ohne dass jemand umgeleitet
   * wird.
   * `an`: /anmelden und /registrieren leiten zum gemeinsamen Konto, die
   * eigenen Formulare nehmen nichts mehr an.
   */
  FEATURE_ZENTRALE_ANMELDUNG: z.enum(['aus', 'an']).default('aus'),
  /** Aussteller des gemeinsamen Kontos, etwa https://konto.lernpfade.net. */
  AUTH_ISSUER: z.string().trim().default(''),
  AUTH_CLIENT_ID: z.string().trim().default(''),
  AUTH_CLIENT_SECRET: z.string().default(''),
  /** Schlüssel für den signierten Zustand zwischen Start und Rückkehr. */
  AUTH_STATE_SECRET: z.string().default(''),
});

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

const geprueftesSchema = envSchema.superRefine((env, ctx) => {
  const gesetzt = ZENTRALE_WERTE.filter((name) => env[name].length > 0);
  const gefordert = env.FEATURE_ZENTRALE_ANMELDUNG === 'an' || gesetzt.length > 0;
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
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = geprueftesSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Die Umgebungskonfiguration ist unvollständig:\n${details}\n\nVorlage: .env.example`,
    );
  }

  cached = parsed.data;
  return cached;
}
