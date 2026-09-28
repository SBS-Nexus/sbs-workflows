/**
 * Die Entscheidungslogik der Ratenbegrenzung — reines Rechnen, ohne
 * Datenbank, ohne Uhr, ohne `server-only`.
 *
 * Bewusst von `rate-limit.ts` getrennt: Seit die Zähler in PostgreSQL liegen
 * (E03), braucht die öffentliche Schnittstelle eine Verbindung. Die Regel
 * selbst — welches Fenster gilt, ab wann ist die Grenze erreicht, wie lange
 * muss gewartet werden — braucht sie nicht. Getrennt gehalten bleibt sie auf
 * der Unit-Ebene prüfbar ("Domainlogik, keine I/O", docs/TESTING.md) und die
 * Integrationstests können sich auf das beschränken, was wirklich nur gegen
 * eine echte Datenbank nachweisbar ist: gemeinsamer Zustand und Atomarität.
 */

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
  /**
   * Grenze allein auf das Konto — ohne IP-Anteil, damit sie sich nicht durch
   * einen Herkunftswechsel zurücksetzen lässt. `login` (IP + E-Mail) deckt
   * die eine Richtung ab, `loginPerIp` die andere; erst diese dritte Grenze
   * verhindert, dass ein gezielt ausgewähltes Konto über viele Herkünfte
   * hinweg beliebig lange beschossen wird. Bewusst großzügiger als `login`:
   * hier teilen sich alle legitimen Geräte einer Person einen Zähler.
   */
  loginPerAccount: { limit: 20, windowMs: 15 * 60 * 1000 },
  /**
   * Registrierungen je Herkunft und Stunde.
   *
   * Bewusst nicht sehr eng: Hinter einer einzelnen öffentlichen IP-Adresse
   * steckt oft ein ganzes Netz — eine Schulklasse, ein Büro, ein Café. Fünfzehn
   * Anmeldungen pro Stunde hätten dort reguläre Nutzung blockiert, und ein
   * fälschlich ausgesperrter Kurs ist ein größerer Schaden als ein etwas
   * höheres Kontingent. Gegen massenhafte Kontoerstellung bleibt die Grenze
   * wirksam.
   */
  registerPerIp: { limit: 60, windowMs: 60 * 60 * 1000 },
  hintReveal: { limit: 120, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;

export interface RateLimitDecision {
  /**
   * Der Zustand, der gespeichert werden soll: das auf das Fenster
   * beschnittene Feld, beim erlaubten Versuch um `now` verlängert.
   *
   * Ein ABGEWIESENER Versuch wird nicht angehängt — sonst verlängerte jede
   * weitere Anfrage die Sperre, und wer gegen die Wand läuft, käme nie
   * wieder heraus. Das entspricht dem bisherigen Speicherzähler.
   */
  hits: number[];
  result: RateLimitResult;
}

/**
 * Entscheidet über einen Versuch am gleitenden Fenster.
 *
 * `previousHits` darf in beliebiger Reihenfolge kommen: Über mehrere
 * Serverinstanzen hinweg gibt es keine gemeinsame Uhr, und `retryAfter`
 * rechnet auf dem ÄLTESTEN Eintrag. Deshalb wird hier sortiert, statt sich
 * auf die Einfügereihenfolge zu verlassen.
 */
export function decideRateLimit(
  previousHits: readonly number[],
  config: RateLimitConfig,
  now: number,
): RateLimitDecision {
  const windowStart = now - config.windowMs;
  const kept = previousHits.filter((timestamp) => timestamp > windowStart).sort((a, b) => a - b);

  if (kept.length >= config.limit) {
    const oldest = kept[0] ?? now;
    return {
      hits: kept,
      result: {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000)),
      },
    };
  }

  const hits = [...kept, now];
  return {
    hits,
    result: { allowed: true, remaining: config.limit - hits.length, retryAfterSeconds: 0 },
  };
}
