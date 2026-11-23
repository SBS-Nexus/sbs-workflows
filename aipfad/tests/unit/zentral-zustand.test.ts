import { describe, expect, it } from 'vitest';
import {
  oeffneZustand,
  sicheresZiel,
  versiegleZustand,
  ZUSTAND_GUELTIG_MS,
  type AnmeldeZustand,
} from '@/server/auth/zentral-zustand';

const SCHLUESSEL = 'testschluessel-nur-fuer-unit-tests-000000000';
const JETZT = Date.UTC(2026, 10, 23, 12, 0, 0);

function zustand(teil: Partial<AnmeldeZustand> = {}): AnmeldeZustand {
  return {
    state: 'state-abc',
    nonce: 'nonce-def',
    codeVerifier: 'verifier-ghi',
    ziel: '/lektion/tokens',
    erstellt: JETZT,
    ...teil,
  };
}

describe('Signierter Anmeldezustand (E4.2)', () => {
  it('öffnet, was mit demselben Schlüssel versiegelt wurde', () => {
    const wert = versiegleZustand(zustand(), SCHLUESSEL);
    expect(oeffneZustand(wert, SCHLUESSEL, JETZT + 1000)).toEqual(zustand());
  });

  it('verwirft einen veränderten Inhalt', () => {
    const [, signatur] = versiegleZustand(zustand(), SCHLUESSEL).split('.');
    const fremd = Buffer.from(JSON.stringify(zustand({ ziel: '/fortschritt' }))).toString(
      'base64url',
    );
    expect(oeffneZustand(`${fremd}.${signatur}`, SCHLUESSEL, JETZT)).toBeNull();
  });

  it('verwirft einen anderen Schlüssel', () => {
    const wert = versiegleZustand(zustand(), SCHLUESSEL);
    expect(oeffneZustand(wert, `${SCHLUESSEL}-anders`, JETZT)).toBeNull();
  });

  it('verwirft abgelaufene und vordatierte Zustände', () => {
    const wert = versiegleZustand(zustand(), SCHLUESSEL);
    expect(oeffneZustand(wert, SCHLUESSEL, JETZT + ZUSTAND_GUELTIG_MS + 1)).toBeNull();
    expect(oeffneZustand(wert, SCHLUESSEL, JETZT - 2 * 60_000)).toBeNull();
  });

  it('verwirft Unsinn ohne Ausnahme', () => {
    for (const wert of [undefined, '', 'abc', 'a.b.c', '.', 'x'.repeat(5000)]) {
      expect(oeffneZustand(wert, SCHLUESSEL, JETZT)).toBeNull();
    }
  });

  it('verwirft einen Zustand mit unzulässigem Ziel, auch wenn er signiert ist', () => {
    const wert = versiegleZustand(zustand({ ziel: '//boese.example' }), SCHLUESSEL);
    expect(oeffneZustand(wert, SCHLUESSEL, JETZT)).toBeNull();
  });

  it('erlaubt einen Zustand ohne Ziel', () => {
    const wert = versiegleZustand(zustand({ ziel: null }), SCHLUESSEL);
    expect(oeffneZustand(wert, SCHLUESSEL, JETZT)?.ziel).toBeNull();
  });
});

describe('Rücksprungziele (kein offener Redirect)', () => {
  it('lässt relative Pfade dieser App durch', () => {
    expect(sicheresZiel('/pfad')).toBe('/pfad');
    expect(sicheresZiel('/lektion/tokens/2?ansicht=kurz#teil')).toBe(
      '/lektion/tokens/2?ansicht=kurz#teil',
    );
  });

  it('weist alles ab, was auf einen anderen Host führen kann', () => {
    for (const ziel of [
      'https://boese.example/',
      '//boese.example',
      '/\\boese.example',
      '\\\\boese.example',
      'javascript:alert(1)',
      '/\t/boese.example',
      '/%0a/boese',
      'pfad',
      '',
    ]) {
      const ergebnis = sicheresZiel(ziel);
      if (ergebnis !== null)
        expect(new URL(ergebnis, 'https://www.aipfad.de').host).toBe('www.aipfad.de');
      else expect(ergebnis).toBeNull();
    }
    expect(sicheresZiel('//boese.example')).toBeNull();
    expect(sicheresZiel('/\\boese.example')).toBeNull();
    expect(sicheresZiel('/\t/boese.example')).toBeNull();
  });

  it('führt nie zurück in die Anmeldung', () => {
    for (const ziel of [
      '/auth/anmelden',
      '/auth/rueckkehr?code=x',
      '/anmelden',
      '/registrieren',
      '/api/health',
    ]) {
      expect(sicheresZiel(ziel)).toBeNull();
    }
  });

  it('nimmt nur Text an und begrenzt die Länge', () => {
    expect(sicheresZiel(['/pfad'])).toBeNull();
    expect(sicheresZiel(undefined)).toBeNull();
    expect(sicheresZiel(`/${'a'.repeat(600)}`)).toBeNull();
  });
});
