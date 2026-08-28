import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, RATE_LIMITS, __resetRateLimits } from '@/server/security/rate-limit';

describe('Ratenbegrenzung', () => {
  beforeEach(() => {
    __resetRateLimits();
  });

  it('erlaubt Anfragen bis zur Grenze und blockiert danach', () => {
    const config = { limit: 3, windowMs: 60_000 };
    const now = Date.now();
    expect(checkRateLimit('k', config, now).allowed).toBe(true);
    expect(checkRateLimit('k', config, now).allowed).toBe(true);
    expect(checkRateLimit('k', config, now).allowed).toBe(true);
    expect(checkRateLimit('k', config, now).allowed).toBe(false);
  });

  it('führt Pro-Konto- und reine IP-Grenze als unabhängige Zähler', () => {
    // Zwei verschiedene E-Mail-Adressen von derselben IP teilen sich denselben
    // IP-Schlüssel, haben aber getrennte Pro-Konto-Schlüssel — genau das
    // Verhalten, das enforcePerIpLimit() in auth-actions.ts zusätzlich zur
    // Pro-Konto-Grenze durchsetzt.
    const now = Date.now();
    const perAccount = { limit: 10, windowMs: 60_000 };
    const perIp = { limit: 2, windowMs: 60_000 };

    expect(checkRateLimit('login:1.2.3.4:a@example.com', perAccount, now).allowed).toBe(true);
    expect(checkRateLimit('login-ip:1.2.3.4', perIp, now).allowed).toBe(true);

    expect(checkRateLimit('login:1.2.3.4:b@example.com', perAccount, now).allowed).toBe(true);
    expect(checkRateLimit('login-ip:1.2.3.4', perIp, now).allowed).toBe(true);

    // Dritte, neue Adresse von derselben IP: Pro-Konto-Grenze ist frisch und
    // würde allein nicht greifen — die IP-Grenze aber schon.
    expect(checkRateLimit('login:1.2.3.4:c@example.com', perAccount, now).allowed).toBe(true);
    expect(checkRateLimit('login-ip:1.2.3.4', perIp, now).allowed).toBe(false);
  });

  it('definiert sinnvolle IP-only-Grenzen für Login und Registrierung', () => {
    expect(RATE_LIMITS.loginPerIp.limit).toBeGreaterThan(RATE_LIMITS.login.limit);
    expect(RATE_LIMITS.registerPerIp.limit).toBeGreaterThan(RATE_LIMITS.register.limit);
  });
});
