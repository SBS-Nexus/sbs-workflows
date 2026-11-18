import { describe, expect, it } from 'vitest';
import { clientIpAus, UNBEKANNTE_IP } from '@/server/security/client-ip';

/**
 * Die Regel, nach der die Ratengrenzen ihre Herkunft bestimmen. Diese Datei
 * ist in PythonPfad, SQLPfad und AIPfad gleich.
 */
const anfrage = (kopfzeilen: Record<string, string> = {}): Headers => new Headers(kopfzeilen);

const ECHT = '203.0.113.7';

describe('clientIpAus', () => {
  it('nimmt x-real-ip, wie der Railway-Edge sie setzt', () => {
    expect(clientIpAus(anfrage({ 'x-real-ip': ECHT }))).toBe(ECHT);
  });

  it('zieht x-real-ip jeder Angabe in x-forwarded-for vor', () => {
    expect(
      clientIpAus(anfrage({ 'x-real-ip': ECHT, 'x-forwarded-for': '198.51.100.1, 198.51.100.2' })),
    ).toBe(ECHT);
  });

  it('liest x-vercel-forwarded-for nicht: außerhalb von Vercel setzt der Client sie frei', () => {
    expect(clientIpAus(anfrage({ 'x-vercel-forwarded-for': '198.51.100.1' }))).toBe(UNBEKANNTE_IP);
    expect(
      clientIpAus(anfrage({ 'x-vercel-forwarded-for': '198.51.100.1', 'x-real-ip': ECHT })),
    ).toBe(ECHT);
  });

  it('nimmt ohne x-real-ip den rechten Eintrag von x-forwarded-for', () => {
    expect(clientIpAus(anfrage({ 'x-forwarded-for': `198.51.100.1, ${ECHT}` }))).toBe(ECHT);
  });

  it('ein vom Client vorangestellter Eintrag ändert den Schlüssel nicht', () => {
    const schluessel = ['1.1.1.1', '2.2.2.2', '10.0.0.1', 'beliebig'].map((gefaelscht) =>
      clientIpAus(anfrage({ 'x-forwarded-for': `${gefaelscht}, ${ECHT}` })),
    );

    expect(new Set(schluessel)).toEqual(new Set([ECHT]));
  });

  it('übergeht eine x-real-ip, die keine IP-Adresse ist', () => {
    expect(clientIpAus(anfrage({ 'x-real-ip': 'keine-ip', 'x-forwarded-for': ECHT }))).toBe(ECHT);
    expect(clientIpAus(anfrage({ 'x-real-ip': 'a'.repeat(5000) }))).toBe(UNBEKANNTE_IP);
  });

  it('nimmt einen leeren letzten Eintrag nicht zum Anlass, weiter links zu suchen', () => {
    // Weiter links steht, was der Client geschickt hat. Lieber ein gemeinsamer
    // Zähler als ein Wert, den die anfragende Seite bestimmt.
    expect(clientIpAus(anfrage({ 'x-forwarded-for': `${ECHT}, ` }))).toBe(UNBEKANNTE_IP);
  });

  it('akzeptiert IPv6 und entfernt Leerraum', () => {
    expect(clientIpAus(anfrage({ 'x-real-ip': ' 2001:db8::1 ' }))).toBe('2001:db8::1');
    expect(clientIpAus(anfrage({ 'x-forwarded-for': ` ${ECHT} ` }))).toBe(ECHT);
  });

  it('fällt ohne jede Angabe auf einen gemeinsamen Zähler zurück', () => {
    expect(clientIpAus(anfrage())).toBe(UNBEKANNTE_IP);
  });
});
