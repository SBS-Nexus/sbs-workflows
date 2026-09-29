import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const GEPRUEFTE_VARIABLEN = [
  'DATABASE_URL',
  'APP_URL',
  'DEPLOYMENT_ID',
  'ATTEMPT_RETENTION_DAYS',
  'AUDIT_RETENTION_DAYS',
  'CRON_SECRET',
  'RETENTION_MODE',
  'AUTH_SECRET',
  'NEXT_RUNTIME',
] as const;

const vorher = Object.fromEntries(
  GEPRUEFTE_VARIABLEN.map((name) => [name, process.env[name]]),
) as Record<(typeof GEPRUEFTE_VARIABLEN)[number], string | undefined>;

function gueltigeUmgebung(): void {
  process.env.DATABASE_URL = 'postgresql://aipfad:aipfad@localhost:5432/aipfad';
  process.env.APP_URL = 'http://127.0.0.1:3101';
  process.env.DEPLOYMENT_ID = 'unit-test-build';
  process.env.ATTEMPT_RETENTION_DAYS = '365';
  process.env.AUDIT_RETENTION_DAYS = '365';
  // Kein echtes Geheimnis, nur ein hinreichend langer Testwert.
  process.env.CRON_SECRET = 'testgeheimnis-nur-fuer-unit-tests';
  process.env.RETENTION_MODE = 'dry-run';
  process.env.NEXT_RUNTIME = 'nodejs';
  delete process.env.AUTH_SECRET;
}

describe('Konfigurationsvertrag beim Serverstart', () => {
  beforeEach(() => {
    vi.resetModules();
    gueltigeUmgebung();
  });

  afterEach(() => {
    for (const name of GEPRUEFTE_VARIABLEN) {
      const wert = vorher[name];
      if (wert === undefined) delete process.env[name];
      else process.env[name] = wert;
    }
  });

  it('bricht vor der Bereitschaft mit verständlicher Meldung ab, wenn DATABASE_URL fehlt', async () => {
    delete process.env.DATABASE_URL;

    const { register } = await import('@/instrumentation');

    await expect(register()).rejects.toThrow('DATABASE_URL fehlt');
  });

  it('verlangt eine Bereitstellungskennung', async () => {
    delete process.env.DEPLOYMENT_ID;

    const { register } = await import('@/instrumentation');

    await expect(register()).rejects.toThrow('DEPLOYMENT_ID fehlt');
  });

  it('startet mit vollständiger Konfiguration ohne AUTH_SECRET', async () => {
    const { register } = await import('@/instrumentation');

    await expect(register()).resolves.toBeUndefined();
  });

  it('verlangt ein Geheimnis für den geplanten Aufbewahrungslauf', async () => {
    // Seit E04A ruft ein Zeitplan eine Route mit Löschwirkung auf. Startete
    // die Anwendung ohne Geheimnis, wäre entweder die Route offen oder der
    // Zeitplan dauerhaft wirkungslos — beides still.
    delete process.env.CRON_SECRET;

    const { register } = await import('@/instrumentation');

    await expect(register()).rejects.toThrow('CRON_SECRET fehlt');
  });

  it('weist ein zu kurzes Cron-Geheimnis ab', async () => {
    process.env.CRON_SECRET = 'zu-kurz';

    const { register } = await import('@/instrumentation');

    await expect(register()).rejects.toThrow('mindestens 16 Zeichen');
  });

  it('weist einen unbekannten Aufbewahrungsmodus ab', async () => {
    process.env.RETENTION_MODE = 'vielleicht';

    const { register } = await import('@/instrumentation');

    await expect(register()).rejects.toThrow('RETENTION_MODE');
  });

  it('startet im Trockenlauf und im Ernstfall', async () => {
    for (const modus of ['dry-run', 'execute'] as const) {
      vi.resetModules();
      gueltigeUmgebung();
      process.env.RETENTION_MODE = modus;

      const { register } = await import('@/instrumentation');

      await expect(register()).resolves.toBeUndefined();
    }
  });

  it('wählt ohne gesetzten Modus den Trockenlauf', async () => {
    // Die sichere Vorgabe: Eine Bereitstellung, die den Modus vergisst,
    // zählt nur und löscht nicht.
    delete process.env.RETENTION_MODE;

    const { getEnv } = await import('@/server/env');

    expect(getEnv().RETENTION_MODE).toBe('dry-run');
  });

  it('importiert die Node-Konfiguration in einem Edge-Instrumentierungslauf nicht', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    delete process.env.DATABASE_URL;
    delete process.env.DEPLOYMENT_ID;

    const { register } = await import('@/instrumentation');

    await expect(register()).resolves.toBeUndefined();
  });
});
