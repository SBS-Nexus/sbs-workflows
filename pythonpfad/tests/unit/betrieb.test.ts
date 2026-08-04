import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FEATURE_FLAGS, allFlags, isEnabled } from '@/server/feature-flags';
import { logger, newRequestId, shortUserId } from '@/server/observability/logger';

describe('Funktionsschalter', () => {
  const urspruenglich = { ...process.env };

  afterEach(() => {
    process.env = { ...urspruenglich };
  });

  it('gilt ohne jede Konfiguration mit dem Standardwert', () => {
    for (const flag of FEATURE_FLAGS) {
      delete process.env[`FEATURE_${flag.key}`];
      expect(isEnabled(flag.key), flag.key).toBe(flag.defaultValue);
    }
  });

  it('nimmt nur die ausdrücklichen Werte true und false an', () => {
    const key = 'WISSENSLANDKARTE';
    process.env[`FEATURE_${key}`] = 'false';
    expect(isEnabled(key)).toBe(false);

    process.env[`FEATURE_${key}`] = 'true';
    expect(isEnabled(key)).toBe(true);

    // Alles andere führt zum Standardwert und nicht zu Zufall.
    for (const unsinn of ['1', '0', 'ja', 'JA', 'TRUE', '', 'vielleicht']) {
      process.env[`FEATURE_${key}`] = unsinn;
      expect(isEnabled(key), unsinn).toBe(true);
    }
  });

  it('kennt einen unbekannten Schalter nicht und schaltet ihn ab', () => {
    expect(isEnabled('GIBT_ES_NICHT')).toBe(false);
  });

  it('meldet, welche Schalter ausdrücklich gesetzt wurden', () => {
    delete process.env.FEATURE_WISSENSLANDKARTE;
    process.env.FEATURE_ORGANISATIONEN = 'false';

    const stand = allFlags();
    const landkarte = stand.find((flag) => flag.key === 'WISSENSLANDKARTE');
    const organisationen = stand.find((flag) => flag.key === 'ORGANISATIONEN');

    expect(landkarte?.overridden).toBe(false);
    expect(organisationen?.overridden).toBe(true);
    expect(organisationen?.enabled).toBe(false);
  });

  it('beschreibt jeden Schalter verständlich', () => {
    for (const flag of FEATURE_FLAGS) {
      expect(flag.description.length, flag.key).toBeGreaterThan(30);
      expect(flag.key, flag.key).toMatch(/^[A-Z_]+$/);
    }
  });

  it('hat eindeutige Schlüssel', () => {
    const keys = FEATURE_FLAGS.map((flag) => flag.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('Protokollierung', () => {
  let ausgabe: string[] = [];

  beforeEach(() => {
    ausgabe = [];
    vi.spyOn(console, 'info').mockImplementation((zeile: unknown) => {
      ausgabe.push(String(zeile));
    });
    vi.spyOn(console, 'warn').mockImplementation((zeile: unknown) => {
      ausgabe.push(String(zeile));
    });
    vi.spyOn(console, 'error').mockImplementation((zeile: unknown) => {
      ausgabe.push(String(zeile));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('schreibt eine JSON-Zeile mit Zeitstempel und Stufe', () => {
    logger.info('Etwas ist passiert', { requestId: 'abc123' });

    expect(ausgabe).toHaveLength(1);
    const eintrag = JSON.parse(ausgabe[0] ?? '{}') as Record<string, unknown>;
    expect(eintrag.level).toBe('info');
    expect(eintrag.message).toBe('Etwas ist passiert');
    expect(eintrag.requestId).toBe('abc123');
    expect(typeof eintrag.ts).toBe('string');
  });

  it('entfernt personenbezogene Felder, auch wenn sie mitgegeben werden', () => {
    logger.warn('Anmeldung fehlgeschlagen', {
      email: 'jemand@example.org',
      password: 'geheim',
      token: 'abcdef',
      submittedCode: 'print("hallo")',
      name: 'Lea Beispiel',
      requestId: 'r1',
    });

    const zeile = ausgabe[0] ?? '';
    expect(zeile).not.toContain('jemand@example.org');
    expect(zeile).not.toContain('geheim');
    expect(zeile).not.toContain('abcdef');
    expect(zeile).not.toContain('print("hallo")');
    expect(zeile).not.toContain('Lea Beispiel');
    // Die Kennung der Anfrage bleibt – ohne sie wäre das Protokoll nutzlos.
    expect(zeile).toContain('r1');
  });

  it('trennt Fehler von den übrigen Stufen', () => {
    logger.error('Kaputt');
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();
  });

  it('kürzt die Nutzerkennung', () => {
    const gekuerzt = shortUserId('clx1234567890abcdefghijklmno');
    expect(gekuerzt).toHaveLength(8);
    expect('clx1234567890abcdefghijklmno'.startsWith(gekuerzt)).toBe(true);
  });

  it('erzeugt unterscheidbare Anfragekennungen', () => {
    const kennungen = new Set(Array.from({ length: 200 }, () => newRequestId()));
    // Bei 200 Ziehungen dürfen sich höchstens vereinzelt welche wiederholen.
    expect(kennungen.size).toBeGreaterThan(190);
  });
});
