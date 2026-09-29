import { describe, expect, it } from 'vitest';
import { istGueltigerCronAufruf } from '@/server/retention/cron-auth';

/**
 * Die Zugangsprüfung der Cron-Route, ohne Next.js und ohne Datenbank.
 *
 * Die Route selbst prüft VOR jedem Datenbankzugriff; dass sie das tut, hält
 * `tests/integration/retention-route.test.ts` fest. Hier geht es nur um die
 * Vergleichsregel — und um die Fälle, in denen sie NICHT durchlassen darf.
 */
const GEHEIMNIS = 'ein-hinreichend-langes-testgeheimnis';

describe('Cron-Zugangsprüfung', () => {
  it('lässt den korrekten Bearer-Wert durch', () => {
    expect(istGueltigerCronAufruf(`Bearer ${GEHEIMNIS}`, GEHEIMNIS)).toBe(true);
  });

  it('weist eine fehlende Kopfzeile ab', () => {
    expect(istGueltigerCronAufruf(null, GEHEIMNIS)).toBe(false);
    expect(istGueltigerCronAufruf('', GEHEIMNIS)).toBe(false);
  });

  it('weist ein falsches Geheimnis gleicher Länge ab', () => {
    const gleichLang = 'X'.repeat(GEHEIMNIS.length);
    expect(gleichLang).toHaveLength(GEHEIMNIS.length);
    expect(istGueltigerCronAufruf(`Bearer ${gleichLang}`, GEHEIMNIS)).toBe(false);
  });

  it('weist ein zu kurzes und ein zu langes Geheimnis ab', () => {
    expect(istGueltigerCronAufruf(`Bearer ${GEHEIMNIS.slice(0, -1)}`, GEHEIMNIS)).toBe(false);
    expect(istGueltigerCronAufruf(`Bearer ${GEHEIMNIS}x`, GEHEIMNIS)).toBe(false);
  });

  it('weist das richtige Geheimnis ohne das Schema "Bearer" ab', () => {
    expect(istGueltigerCronAufruf(GEHEIMNIS, GEHEIMNIS)).toBe(false);
    expect(istGueltigerCronAufruf(`bearer ${GEHEIMNIS}`, GEHEIMNIS)).toBe(false);
    expect(istGueltigerCronAufruf(`Basic ${GEHEIMNIS}`, GEHEIMNIS)).toBe(false);
  });

  it('lässt bei leerem konfiguriertem Geheimnis NIEMANDEN durch', () => {
    // Sonst öffnete ein Konfigurationsfehler die Route für jeden — auch für
    // einen Aufruf, der selbst einen leeren Wert mitschickt.
    expect(istGueltigerCronAufruf('Bearer ', '')).toBe(false);
    expect(istGueltigerCronAufruf('Bearer irgendwas', '')).toBe(false);
    expect(istGueltigerCronAufruf(null, '')).toBe(false);
  });
});
