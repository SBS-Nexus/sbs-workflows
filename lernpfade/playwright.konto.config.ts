import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Hub gegen einen echten ZITADEL (E4.5b). Die Testumgebung startet
 * konto/pruefung/e2e/starte.sh; die Werte für den Hub liegen in
 * $KONTO_E2E_DIR/hub.env. Ohne Wiederholungen.
 */
const kontoDir = process.env.KONTO_E2E_DIR;
if (!kontoDir) throw new Error('KONTO_E2E_DIR fehlt. Erst konto/pruefung/e2e/starte.sh ausführen.');
process.loadEnvFile(path.join(kontoDir, 'hub.env'));

const PORT = 3210;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e-konto',
  testMatch: /hub-.*\.spec\.ts/,
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
