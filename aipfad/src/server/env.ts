import 'server-only';
import { z } from 'zod';

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
  DATABASE_URL: z.string().min(1, 'DATABASE_URL fehlt.'),
  APP_URL: z.url().default('http://localhost:3000'),
  DEPLOYMENT_ID: z
    .string()
    .trim()
    .min(1, 'DEPLOYMENT_ID fehlt. Nutze eine unveränderliche Build- oder Commit-Kennung.')
    .max(200, 'DEPLOYMENT_ID darf höchstens 200 Zeichen lang sein.'),
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
