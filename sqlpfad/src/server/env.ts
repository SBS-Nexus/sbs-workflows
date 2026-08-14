import 'server-only';
import { z } from 'zod';

/**
 * Zentrale, validierte Konfiguration.
 *
 * Fehlt eine notwendige Variable oder ist sie unplausibel, schlägt der Start
 * mit einer verständlichen Meldung fehl – statt später mit einem schwer
 * zuzuordnenden Laufzeitfehler.
 *
 * `server-only` verhindert, dass diese Datei versehentlich in ein
 * Client-Bundle gerät. Die Zugangsdaten zur Übungsdatenbank sind der
 * empfindlichste Wert der ganzen Anwendung; sie dürfen den Server nie
 * verlassen.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Plattformdatenbank: Konten, Fortschritt, Inhalte. Niemals Lernenden-SQL. */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL fehlt.'),

  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET muss mindestens 32 Zeichen lang sein (openssl rand -base64 48).'),

  APP_URL: z.url().default('http://localhost:3000'),

  /**
   * Der Schalter aus docs/SQL-RUNNER.md, Abschnitt 6.
   *
   * Steht er auf `false`, erklärt die Anwendung sichtbar, dass das Ausführen
   * von Abfragen gerade nicht zur Verfügung steht. Es gibt ausdrücklich
   * keinen stillen Rückfall auf eine andere Ausführungsart: Lieber eine
   * ehrlich abgeschaltete Funktion als eine, die Lizenz oder Isolation
   * verletzt.
   */
  FEATURE_SQL_RUNNER: z
    .enum(['true', 'false'])
    .default('false')
    .transform((wert) => wert === 'true'),

  /** Adresse des Runner-Dienstes. Die Anwendung spricht nie direkt Port 1433. */
  SQL_RUNNER_URL: z.string().default(''),
  SQL_RUNNER_TOKEN: z.string().default(''),

  SQL_ZEITLIMIT_MS: z.coerce.number().int().min(500).max(60_000).default(5_000),
  SQL_MAX_ZEILEN: z.coerce.number().int().min(10).max(10_000).default(500),
  SQL_MAX_ANWEISUNGEN: z.coerce.number().int().min(1).max(100).default(10),

  ATTEMPT_RETENTION_DAYS: z.coerce.number().int().min(0).max(3650).default(365),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
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

/**
 * Darf die Anwendung Abfragen ausführen?
 *
 * Der Schalter allein genügt nicht: Ohne Adresse und Token des Runner-Dienstes
 * gäbe es niemanden, der die Abfrage entgegennimmt. Beides zusammen zu prüfen
 * verhindert den Zustand, in dem die Oberfläche einen Ausführen-Knopf anbietet,
 * der jedes Mal in einen Verbindungsfehler läuft.
 */
export function istSqlRunnerVerfuegbar(): boolean {
  const env = getEnv();
  return env.FEATURE_SQL_RUNNER && env.SQL_RUNNER_URL !== '' && env.SQL_RUNNER_TOKEN !== '';
}
