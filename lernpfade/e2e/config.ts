/** Gemeinsame Adressen für Playwright-Konfiguration und Tests. */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3210);
export const HUB_ORIGIN = `http://127.0.0.1:${E2E_PORT}`;

/**
 * Zweiter Hub-Prozess desselben Builds, aber OHNE freigeschaltete
 * Fortschrittsquellen (`PROGRESS_FEDERATION_SOURCES` leer) — für den Zustand
 * „nicht verbunden" (LP-07).
 */
export const E2E_PORT_UNCONNECTED = E2E_PORT + 1;
export const HUB_ORIGIN_UNCONNECTED = `http://127.0.0.1:${E2E_PORT_UNCONNECTED}`;

/**
 * Adressen der MOCK-Quellen für die LP-05B-Regression und LP-07. Unter diesen Adressen
 * läuft nichts; die Tests beantworten die Anfragen mit `page.route`.
 */
export const MOCK_SOURCE_ORIGINS = {
  python: 'http://127.0.0.1:4101',
  sql: 'http://127.0.0.1:4102',
  ai: 'http://127.0.0.1:4103',
} as const;
