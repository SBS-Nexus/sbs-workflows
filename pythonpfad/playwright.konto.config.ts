import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Strecke gegen einen echten ZITADEL (E4.2, Schritt 4; docs/E4-2-BAUPLAN.md).
 * Die Testumgebung startet konto/pruefung/e2e/starte.sh; deren Werte für
 * die App (AUTH_*, Schalter `an`) liegen in $KONTO_E2E_DIR/pythonpfad.env.
 *
 * Eigene Konfiguration statt Teil von playwright.config.ts: Die übrigen
 * E2E-Tests laufen mit Schalter `aus` und eigener Registrierung. Ohne
 * Wiederholungen, damit ein wackliger Ablauf als Fehler auffällt.
 */
const envDatei = path.join(import.meta.dirname, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const kontoDir = process.env.KONTO_E2E_DIR;
if (!kontoDir) throw new Error('KONTO_E2E_DIR fehlt. Erst konto/pruefung/e2e/starte.sh ausführen.');
process.loadEnvFile(path.join(kontoDir, 'pythonpfad.env'));

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e-konto',
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },

  projects: [{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
