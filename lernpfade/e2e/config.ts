/** Gemeinsame Adressen für Playwright-Konfiguration und Tests. */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3210);
export const HUB_ORIGIN = `http://127.0.0.1:${E2E_PORT}`;

/**
 * Adressen der MOCK-Quellen für die LP-05B-Regression. Unter diesen Adressen
 * läuft nichts; die Tests beantworten die Anfragen mit `page.route`.
 */
export const MOCK_SOURCE_ORIGINS = {
  python: 'http://127.0.0.1:4101',
  sql: 'http://127.0.0.1:4102',
  ai: 'http://127.0.0.1:4103',
} as const;
