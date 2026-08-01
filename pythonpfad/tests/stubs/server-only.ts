/**
 * Ersatz für das Paket `server-only` in Tests.
 *
 * `server-only` wirft beim Import außerhalb einer Server-Umgebung. In Vitest
 * ist genau das der Fall, obwohl die geprüften Module echter Servercode sind.
 * Der Ersatz erhält die Prüfung im Anwendungsbuild und macht die Module in
 * Tests importierbar.
 */
export {};
