/**
 * Next.js ruft register() einmal auf, wenn eine neue Serverinstanz startet,
 * und wartet auf den Abschluss, bevor sie Anfragen annimmt.
 *
 * Die Konfiguration wird nur im Node.js-Runtime geprüft: Dort laufen die
 * AIPfad-Serverpfade mit Datenbank und Sitzungen. Ein Edge-Instrumentierungs-
 * Lauf darf kein Node-only-Modul importieren.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { getEnv } = await import('@/server/env');
  getEnv();
}
