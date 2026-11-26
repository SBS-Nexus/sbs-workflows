import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  istZulaessigerAussteller,
  pruefeZentraleAnmeldung,
  zentraleAnmeldungFelder,
} from '@/server/auth/zentral-konfiguration';

/** Testwerte, keine echten Geheimnisse. */
const VOLLSTAENDIG = {
  AUTH_ISSUER: 'https://konto.lernpfade.test',
  AUTH_CLIENT_ID: '345678901234567890',
  AUTH_CLIENT_SECRET: 'testgeheimnis-client-nur-fuer-unit-tests',
  AUTH_STATE_SECRET: 'testgeheimnis-zustand-nur-fuer-unit-tests-0000',
};

const schema = z.object(zentraleAnmeldungFelder).superRefine(pruefeZentraleAnmeldung);
const fehler = (werte: Record<string, string>) =>
  schema.safeParse(werte).error?.issues.map((i) => i.message) ?? [];

describe('Konfiguration der Anmeldung über das gemeinsame Konto', () => {
  it('ist ohne Werte aus und gültig', () => {
    const ergebnis = schema.parse({});
    expect(ergebnis.FEATURE_ZENTRALE_ANMELDUNG).toBe('aus');
    expect(ergebnis.AUTH_ISSUER).toBe('');
  });

  it('nimmt vollständige Werte mit und ohne Schalter an', () => {
    expect(fehler(VOLLSTAENDIG)).toEqual([]);
    expect(fehler({ ...VOLLSTAENDIG, FEATURE_ZENTRALE_ANMELDUNG: 'an' })).toEqual([]);
  });

  it('verlangt mit Schalter alle vier Werte', () => {
    expect(fehler({ FEATURE_ZENTRALE_ANMELDUNG: 'an' })).toHaveLength(4);
    expect(fehler({ FEATURE_ZENTRALE_ANMELDUNG: 'an' })[0]).toContain('AUTH_ISSUER fehlt');
  });

  it('nimmt keine halbe Konfiguration an', () => {
    const { AUTH_STATE_SECRET: _weg, ...ohne } = VOLLSTAENDIG;
    expect(fehler(ohne)).toEqual([
      'AUTH_STATE_SECRET fehlt. Die AUTH_*-Werte gelten nur vollständig, nicht teilweise.',
    ]);
  });

  it('weist zu kurze Geheimnisse und unzulässige Aussteller ab', () => {
    expect(fehler({ ...VOLLSTAENDIG, AUTH_STATE_SECRET: 'zu-kurz' })[0]).toContain(
      'mindestens 32 Zeichen',
    );
    expect(fehler({ ...VOLLSTAENDIG, AUTH_CLIENT_SECRET: 'kurz' })[0]).toContain(
      'mindestens 16 Zeichen',
    );
    expect(fehler({ ...VOLLSTAENDIG, AUTH_ISSUER: 'http://konto.lernpfade.test' })[0]).toContain(
      'AUTH_ISSUER muss',
    );
    expect(schema.safeParse({ FEATURE_ZENTRALE_ANMELDUNG: 'vielleicht' }).success).toBe(false);
  });

  it('verlangt für die Client-ID des Hubs die übrigen Werte', () => {
    expect(fehler({ AUTH_HUB_CLIENT_ID: '400000000000000001' })).toHaveLength(4);
    expect(fehler({ ...VOLLSTAENDIG, AUTH_HUB_CLIENT_ID: '400000000000000001' })).toEqual([]);
    // E5.2: auch das Maschinenkonto der Plattform verlangt die übrigen Werte.
    expect(fehler({ AUTH_PLATTFORM_SUB: '401200000000000001' })).toHaveLength(4);
    expect(fehler({ ...VOLLSTAENDIG, AUTH_PLATTFORM_SUB: '401200000000000001' })).toEqual([]);
  });

  it('lässt http nur für localhost zu', () => {
    expect(istZulaessigerAussteller('http://localhost:8080')).toBe(true);
    expect(istZulaessigerAussteller('http://127.0.0.1:8080')).toBe(true);
    expect(istZulaessigerAussteller('https://konto.lernpfade.net')).toBe(true);
    expect(istZulaessigerAussteller('http://konto.lernpfade.net')).toBe(false);
    expect(istZulaessigerAussteller('https://konto.lernpfade.net/?x=1')).toBe(false);
    expect(istZulaessigerAussteller('https://nutzer:pw@konto.lernpfade.net')).toBe(false);
    expect(istZulaessigerAussteller('kein-url')).toBe(false);
  });
});
