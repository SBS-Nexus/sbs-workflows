import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-End-Tests gegen den echten Produktionsbuild. Bewusst nicht gegen
 * den Entwicklungsserver: Nur der Produktionsbuild bildet das tatsächliche
 * Verhalten ab (Server Components, Caching, Content Security Policy).
 * Übernommen aus PythonPfad/SQLPfad.
 */
const envDatei = path.join(import.meta.dirname, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const PORT = Number(process.env.E2E_PORT ?? 3101);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const vorhandenesChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const launchOptions = existsSync(vorhandenesChromium)
  ? { executablePath: vorhandenesChromium }
  : {};

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], launchOptions },
      testIgnore: /mobil\.spec\.ts/,
    },
    {
      name: 'mobil',
      use: { ...devices['Pixel 7'], launchOptions },
      testMatch: /mobil\.spec\.ts/,
    },
  ],

  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
