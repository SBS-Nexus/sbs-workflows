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
   * Aufbewahrungsfrist für Auditzeilen (E07/ENT-B06).
   *
   * Anders als `ATTEMPT_RETENTION_DAYS` ist diese Frist PFLICHT, ohne
   * Vorgabewert und strikt größer als 0. Der Grund liegt in der Datenart:
   * Für `AuditEvent` ist die altersbasierte Aufbewahrung der EINZIGE
   * Löschweg — es gibt keinen fachlichen Pfad, der eine Zeile entfernt.
   * Ein stiller Vorgabewert oder eine 0 (im Rahmen: „abgeschaltet") hieße
   * deshalb: Auditzeilen bleiben für immer. Das wäre eine
   * Aufbewahrungsentscheidung, die niemand getroffen hat.
   *
   * Hier steht ausdrücklich KEINE gesetzliche Frist. Welche Dauer richtig
   * ist, entscheidet die Bereitstellung; `.env.example` zeigt nur einen
   * technischen Beispielwert.
   */
  AUDIT_RETENTION_DAYS: z.coerce
    .number({ error: 'AUDIT_RETENTION_DAYS fehlt. Vorlage: .env.example' })
    .int('AUDIT_RETENTION_DAYS muss eine ganze Zahl sein.')
    .min(1, 'AUDIT_RETENTION_DAYS muss größer als 0 sein; 0 wäre "nie löschen".')
    .max(3650, 'AUDIT_RETENTION_DAYS darf höchstens 3650 betragen.'),
  /**
   * Geheimnis für den geplanten Aufbewahrungslauf (E04A).
   *
   * Bewusst PFLICHT und ohne Vorgabewert: Die Anwendung hat seit E04A einen
   * Zeitplan, der eine Route mit Löschwirkung aufruft. Startete sie ohne
   * Geheimnis, wäre entweder die Route offen oder der Zeitplan dauerhaft
   * wirkungslos — beides still. E02 hat dafür die Richtung vorgegeben: Was
   * der Betrieb braucht, wird beim Start geprüft, nicht beim ersten Aufruf.
   *
   * Mindestens 16 Zeichen, passend zur heutigen Vercel-Empfehlung.
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
