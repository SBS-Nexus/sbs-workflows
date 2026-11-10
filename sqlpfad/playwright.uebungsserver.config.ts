import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-End-Tests mit eingeschaltetem Übungsserver.
 *
 * Die Hauptsuite (`playwright.config.ts`) prüft SQLPfad so, wie es heute
 * ausgeliefert wird: `FEATURE_SQL_RUNNER` aus, Abfragen geprüft, aber nicht
 * ausgeführt. Diese Suite prüft den anderen Zustand – den ganzen Weg
 * Anwendung → Runner-Dienst → SQL Server, mit echten Abfragen und echten
 * Bewertungen. Sie startet dafür beide Prozesse selbst und braucht einen
 * erreichbaren SQL Server:
 *
 *   docker compose up -d sqlserver
 *   SQL_SERVER_HOST=127.0.0.1 SQL_SERVER_SA_PASSWORD=… npm run test:e2e:uebungsserver
 *
 * Ohne Server bricht sie ab, statt übersprungen zu werden: Wer sie aufruft,
 * will genau diesen Weg geprüft haben.
 */
const envDatei = path.join(import.meta.dirname, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const host = process.env.SQL_SERVER_HOST;
const passwort = process.env.SQL_SERVER_SA_PASSWORD;
if (!host || !passwort) {
  throw new Error(
    'Diese Suite braucht einen SQL Server: SQL_SERVER_HOST und SQL_SERVER_SA_PASSWORD setzen ' +
      '(lokal: docker compose up -d sqlserver).',
  );
}

const PORT = Number(process.env.E2E_UEBUNGSSERVER_PORT ?? 3200);
const RUNNER_PORT = Number(process.env.SQL_RUNNER_PORT ?? 4310);
const BASE_URL = `http://127.0.0.1:${PORT}`;
// Nur für diesen Lauf; Runner und Anwendung bekommen denselben Wert.
const TOKEN = process.env.SQL_RUNNER_TOKEN ?? 'e2e-uebungsserver-token-ohne-bedeutung-0123456789';

const vorhandenesChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const launchOptions = existsSync(vorhandenesChromium)
  ? { executablePath: vorhandenesChromium }
  : {};

export default defineConfig({
  testDir: './e2e-uebungsserver',
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
  },

  projects: [{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], launchOptions } }],

  webServer: [
    {
      command: 'npm run runner',
      port: RUNNER_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        SQL_RUNNER_TOKEN: TOKEN,
        SQL_RUNNER_PORT: String(RUNNER_PORT),
        SQL_SERVER_HOST: host,
        SQL_SERVER_PORT: process.env.SQL_SERVER_PORT ?? '1433',
        SQL_SERVER_VERWALTUNG_BENUTZER: process.env.SQL_SERVER_VERWALTUNG_BENUTZER ?? 'sa',
        SQL_SERVER_VERWALTUNG_PASSWORT: passwort,
        // Der Entwicklungs- und CI-Server trägt ein selbst signiertes Zertifikat.
        SQL_SERVER_ZERTIFIKAT_NICHT_PRUEFEN: 'true',
      },
    },
    {
      command: `npm run start -- --port ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        FEATURE_SQL_RUNNER: 'true',
        SQL_RUNNER_URL: `http://127.0.0.1:${RUNNER_PORT}`,
        SQL_RUNNER_TOKEN: TOKEN,
      },
    },
  ],
});
