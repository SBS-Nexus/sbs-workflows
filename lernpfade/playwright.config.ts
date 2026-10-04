import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
import { E2E_PORT, HUB_ORIGIN, MOCK_SOURCE_ORIGINS } from './e2e/config';

/**
 * Browser-Tests gegen den echten Produktionsbuild des Hubs (`next build` +
 * `next start`), nicht gegen den Entwicklungsserver.
 *
 * Der Build für diese Tests schaltet die LP-05B-Live-Quellen frei und lässt
 * sie auf lokale Adressen zeigen, die in den Tests per `page.route`
 * beantwortet werden: Das sind ausdrücklich MOCKS, keine echten Apps. So
 * lassen sich der LIVE-, der „nicht angemeldet"- und der Ausfallzustand
 * deterministisch prüfen. An Transport, Auth, CORS oder Cache der echten
 * Apps ändert das nichts.
 *
 * Keine Wiederholungen: Ein instabiler Test ist ein Befund, kein Rauschen.
 */

const localChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const launchOptions = existsSync(localChromium) ? { executablePath: localChromium } : {};

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: HUB_ORIGIN,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
    launchOptions,
  },

  projects: [
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
      testIgnore: /mobil\.spec\.ts/,
    },
    {
      name: 'mobil',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /mobil\.spec\.ts/,
    },
  ],

  webServer: {
    command: `npm run build && npm run start -- --port ${E2E_PORT} --hostname 127.0.0.1`,
    url: `${HUB_ORIGIN}/vokabeln`,
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      ...(process.env as Record<string, string>),
      NEXT_PUBLIC_REVIEW_FEDERATION_SOURCES: 'python,sql,ai',
      NEXT_PUBLIC_PYTHONPFAD_URL: MOCK_SOURCE_ORIGINS.python,
      NEXT_PUBLIC_SQLPFAD_URL: MOCK_SOURCE_ORIGINS.sql,
      NEXT_PUBLIC_AIPFAD_URL: MOCK_SOURCE_ORIGINS.ai,
    },
  },
});
