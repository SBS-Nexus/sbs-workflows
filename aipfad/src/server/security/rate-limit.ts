import 'server-only';

/**
 * Einfache Ratenbegrenzung mit gleitendem Fenster. Bewusst im Arbeitsspeicher
 * gehalten: Für eine Instanz genügt das. Wird die Anwendung auf mehrere
 * Instanzen verteilt, muss dieser Speicher gegen einen gemeinsamen Zähler
 * getauscht werden – die Schnittstelle bleibt dabei gleich. Vermerkt in
 * docs/SECURITY.md. Übernommen aus PythonPfad/SQLPfad.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  submitAttempt: { limit: 240, windowMs: 60 * 60 * 1000 },
  labAttempt: { limit: 120, windowMs: 60 * 60 * 1000 },
  /**
   * Zusätzliche, ausschließlich IP-basierte Obergrenze für Anmeldung und
   * Registrierung — unabhängig von der jeweiligen E-Mail-Adresse.
   *
   * Der reguläre `login`/`register`-Schlüssel kombiniert IP und E-Mail
   * (`requestKey()` in `server/actions/auth-actions.ts`). Das begrenzt
   * Versuche gegen EIN Konto wirksam, aber jede neue E-Mail-Adresse eröffnet
   * einen frischen Zähler. Von derselben IP aus reihum viele verschiedene
   * Adressen durchzuprobieren (Credential Stuffing mit geleakten
   * Zugangsdaten, oder massenhaftes Ausloten, welche Adressen bereits ein
   * Konto haben) bliebe dadurch ungebremst. Diese zusätzliche, gröbere
   * IP-only-Grenze schließt genau diese Lücke, ohne die feinere
   * Pro-Konto-Grenze zu ersetzen — beide werden durchgesetzt.
   */
  loginPerIp: { limit: 30, windowMs: 15 * 60 * 1000 },
  registerPerIp: { limit: 15, windowMs: 60 * 60 * 1000 },
  hintReveal: { limit: 120, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key) ?? { hits: [] };
  const windowStart = now - config.windowMs;

  bucket.hits = bucket.hits.filter((timestamp) => timestamp > windowStart);

  if (bucket.hits.length >= config.limit) {
    const oldest = bucket.hits[0] ?? now;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  if (buckets.size > 5_000) pruneBuckets(now);

  return {
    allowed: true,
    remaining: config.limit - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

function pruneBuckets(now: number): void {
  const maxWindow = Math.max(...Object.values(RATE_LIMITS).map((c) => c.windowMs));
  for (const [key, bucket] of buckets) {
    const alive = bucket.hits.filter((t) => t > now - maxWindow);
    if (alive.length === 0) buckets.delete(key);
    else bucket.hits = alive;
  }
}

/** Nur für Tests. */
export function __resetRateLimits(): void {
  buckets.clear();
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      `Zu viele Versuche in kurzer Zeit. Bitte warte ${formatWait(retryAfterSeconds)} und versuche es erneut.`,
    );
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} Sekunden`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? 'eine Minute' : `${minutes} Minuten`;
}

export function enforceRateLimit(key: string, config: RateLimitConfig): void {
  const result = checkRateLimit(key, config);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
}
