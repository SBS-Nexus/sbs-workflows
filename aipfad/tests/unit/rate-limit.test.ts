import { describe, expect, it } from 'vitest';
import { decideRateLimit, RATE_LIMITS } from '@/server/security/rate-limit-window';

/**
 * Die Regel selbst, ohne Datenbank.
 *
 * Seit E03 liegt der Zähler in PostgreSQL. Was dort gespeichert wird und dass
 * zwei Instanzen ihn wirklich teilen, prüft `tests/integration/rate-limit.test.ts`
 * gegen eine echte Datenbank — hier geht es ausschließlich um die
 * Entscheidung: Wann ist die Grenze erreicht, was wird gespeichert, wie lange
 * muss gewartet werden. `decideRateLimit()` ist genau diese Regel und wird
 * vom Datenbankpfad unverändert verwendet, es gibt also keine zweite Fassung.
 */
describe('Ratenbegrenzung', () => {
  it('erlaubt Anfragen bis zur Grenze und blockiert danach', () => {
    const config = { limit: 3, windowMs: 60_000 };
    const now = Date.now();

    let hits: number[] = [];
    const ergebnisse = [0, 1, 2, 3].map(() => {
      const entscheidung = decideRateLimit(hits, config, now);
      hits = entscheidung.hits;
      return entscheidung.result.allowed;
    });

    expect(ergebnisse).toEqual([true, true, true, false]);
  });

  it('zählt einen abgewiesenen Versuch nicht mit', () => {
    const config = { limit: 1, windowMs: 60_000 };
    const now = Date.now();

    const erster = decideRateLimit([], config, now);
    const zweiter = decideRateLimit(erster.hits, config, now);

    // Sonst verlängerte jeder weitere Versuch die Sperre, und wer einmal
    // gegen die Wand gelaufen ist, käme nie wieder heraus.
    expect(zweiter.result.allowed).toBe(false);
    expect(zweiter.hits).toEqual(erster.hits);
  });

  it('vergisst Versuche, sobald sie aus dem Fenster fallen', () => {
    const config = { limit: 2, windowMs: 60_000 };
    const start = Date.now();

    const belegt = [start, start + 1];
    expect(decideRateLimit(belegt, config, start + 2).result.allowed).toBe(false);
    expect(decideRateLimit(belegt, config, start + 60_002).result.allowed).toBe(true);
  });

  it('rechnet die Wartezeit auf den ältesten Versuch im Fenster', () => {
    const config = { limit: 1, windowMs: 60_000 };
    const start = Date.now();

    const abgewiesen = decideRateLimit([start], config, start + 20_000).result;

    expect(abgewiesen.allowed).toBe(false);
    expect(abgewiesen.remaining).toBe(0);
    expect(abgewiesen.retryAfterSeconds).toBe(40);
  });

  it('rundet die Wartezeit nie auf null ab', () => {
    const config = { limit: 1, windowMs: 60_000 };
    const start = Date.now();

    // Der älteste Versuch fällt in 100 ms aus dem Fenster. Eine gemeldete
    // Wartezeit von 0 Sekunden wäre eine Einladung, sofort erneut zu fragen.
    expect(decideRateLimit([start], config, start + 59_900).result.retryAfterSeconds).toBe(1);
  });

  it('meldet die verbleibenden Versuche', () => {
    const config = { limit: 3, windowMs: 60_000 };
    const now = Date.now();

    expect(decideRateLimit([], config, now).result.remaining).toBe(2);
    expect(decideRateLimit([now], config, now).result.remaining).toBe(1);
    expect(decideRateLimit([now, now], config, now).result.remaining).toBe(0);
  });

  it('verlässt sich nicht auf die Reihenfolge der gespeicherten Zeitpunkte', () => {
    // Über mehrere Serverinstanzen hinweg gibt es keine gemeinsame Uhr: Die
    // Zeitpunkte können in beliebiger Reihenfolge in der Zeile stehen. Die
    // Wartezeit rechnet aber auf dem ÄLTESTEN.
    const config = { limit: 2, windowMs: 60_000 };
    const start = Date.now();

    const durcheinander = [start + 30_000, start];
    expect(decideRateLimit(durcheinander, config, start + 40_000).result.retryAfterSeconds).toBe(
      20,
    );
  });

  it('führt Pro-Konto- und reine IP-Grenze als unabhängige Zähler', () => {
    // Zwei verschiedene E-Mail-Adressen von derselben IP teilen sich denselben
    // IP-Schlüssel, haben aber getrennte Pro-Konto-Schlüssel — genau das
    // Verhalten, das enforcePerIpLimit() in auth-actions.ts zusätzlich zur
    // Pro-Konto-Grenze durchsetzt. Die Schlüsseltrennung selbst prüft der
    // Integrationstest; hier zählt, dass zwei getrennte Zählerstände auch zu
    // zwei getrennten Entscheidungen führen.
    const now = Date.now();
    const perAccount = { limit: 10, windowMs: 60_000 };
    const perIp = { limit: 2, windowMs: 60_000 };

    let ipHits: number[] = [];
    const konten = ['a@example.com', 'b@example.com', 'c@example.com'];
    const ipErgebnisse = konten.map(() => {
      // Jede Adresse startet mit einem frischen Pro-Konto-Zähler …
      expect(decideRateLimit([], perAccount, now).result.allowed).toBe(true);
      // … der IP-Zähler läuft dagegen über alle drei weiter.
      const entscheidung = decideRateLimit(ipHits, perIp, now);
      ipHits = entscheidung.hits;
      return entscheidung.result.allowed;
    });

    expect(ipErgebnisse).toEqual([true, true, false]);
  });

  it('definiert sinnvolle IP-only-Grenzen für Login und Registrierung', () => {
    expect(RATE_LIMITS.loginPerIp.limit).toBeGreaterThan(RATE_LIMITS.login.limit);
    expect(RATE_LIMITS.registerPerIp.limit).toBeGreaterThan(RATE_LIMITS.register.limit);
  });

  it('hält jede konfigurierte Grenze plausibel und begrenzt die Zeilengröße', () => {
    // Die gespeicherte Zeitpunktliste ist genau so lang wie das Limit — die
    // Zeilengröße hängt also an dieser Tabelle und nirgends sonst.
    for (const [name, config] of Object.entries(RATE_LIMITS)) {
      expect(config.limit, name).toBeGreaterThan(0);
      expect(config.windowMs, name).toBeGreaterThan(0);
      expect(config.limit, name).toBeLessThanOrEqual(240);
    }

    expect(Object.keys(RATE_LIMITS).sort()).toEqual([
      'hintReveal',
      'labAttempt',
      'login',
      'loginPerAccount',
      'loginPerIp',
      'register',
      'registerPerIp',
      'submitAttempt',
    ]);
  });
});
