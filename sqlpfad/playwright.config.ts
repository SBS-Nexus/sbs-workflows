import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-End-Tests gegen den echten Produktionsbuild.
 *
 * Bewusst nicht gegen den Entwicklungsserver: Nur der Produktionsbuild bildet
 * das tatsächliche Verhalten ab (Server Components, Caching, Content Security
 * Policy, vorgelagerte Zugriffsprüfung).
 *
 * Diese Tests brauchen die Plattformdatenbank, aber keinen SQL Server. Was
 * ohne echten SQL Server nicht geprüft werden kann - T-SQL-Semantik - steht
 * in einem eigenen Testprojekt und wird hier ausdrücklich nicht nachgestellt.
 */
/*
 * `.env` nur laden, wenn sie da ist: `process.loadEnvFile` wirft sonst
 * `ENOENT`, und das `?.` fängt das nicht ab. In Bereitstellungsumgebungen
 * stehen die Werte bereits in `process.env`. Ausführlich in prisma.config.ts.
 */
const envDatei = path.join(import.meta.dirname, '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * In vorbereiteten Umgebungen liegt bereits ein Chromium bereit. Ist es
 * vorhanden, wird es genutzt, statt eine zweite Kopie herunterzuladen.
 * Andernfalls greift der Standard von Playwright (`npx playwright install`).
 */
const vorhandenesChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const launchOptions = existsSync(vorhandenesChromium)
  ? { executablePath: vorhandenesChromium }
  : {};

export default defineConfig({
  testDir: './e2e',
  // Ein Worker: Die Tests teilen sich eine Datenbank und legen eigene Konten an.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
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
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
