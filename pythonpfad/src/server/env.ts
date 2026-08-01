import 'server-only';
import { z } from 'zod';

/**
 * Zentrale, validierte Konfiguration.
 *
 * Fehlt eine notwendige Variable oder ist sie unplausibel, schlägt der Start
 * mit einer verständlichen Meldung fehl – statt später mit einem
 * schwer zuzuordnenden Laufzeitfehler.
 *
 * Diese Datei ist mit `server-only` markiert und kann dadurch nicht versehentlich
 * in ein Client-Bundle geraten. Secrets bleiben auf dem Server.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL fehlt.'),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET muss mindestens 32 Zeichen lang sein (openssl rand -base64 48).'),
  APP_URL: z.url().default('http://localhost:3000'),
  ATTEMPT_RETENTION_DAYS: z.coerce.number().int().min(0).max(3650).default(365),

  AI_TUTOR_PROVIDER: z.enum(['rule-based', 'anthropic', 'openai-compatible']).default('rule-based'),
  AI_TUTOR_API_KEY: z.string().default(''),
  AI_TUTOR_MODEL: z.string().default('claude-sonnet-5'),
  AI_TUTOR_BASE_URL: z.string().default(''),
  AI_TUTOR_RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(1000).default(30),
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

/** Ist die Anwendung so konfiguriert, dass ein externer KI-Anbieter nutzbar wäre? */
export function isExternalAiConfigured(): boolean {
  const env = getEnv();
  return env.AI_TUTOR_PROVIDER !== 'rule-based' && env.AI_TUTOR_API_KEY.length > 0;
}
