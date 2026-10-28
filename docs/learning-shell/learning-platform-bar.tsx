import { SHELL_APP_NAME, hubLinks, type ShellApp } from '@/lib/learning-shell';

/**
 * Plattform-Dachleiste der Lernpfade-Shell (LP-04, Vertrag LP-03A).
 *
 * KANONISCH ist `docs/learning-shell/learning-platform-bar.tsx`; jede App
 * führt eine bytegleiche Kopie (geprüft von `scripts/check-learning-shell.mjs`).
 *
 * Mit konfigurierter `NEXT_PUBLIC_LEARNING_HUB_URL` steht hier eine benannte
 * Plattformnavigation zum Hub, zu seinen Wiederholungen und zum Gesamtfortschritt
 * — eigens benannt, damit sie von den Wiederholungs- und Fortschrittszielen
 * der App unterscheidbar bleibt. Ohne Konfiguration gibt es keine Verweise:
 * keine erfundene Adresse, kein toter Link. Die Adresse wird nur gelesen.
 */
export function LearningPlatformBar({ app }: { app: ShellApp }): React.ReactElement {
  const hub = hubLinks(process.env.NEXT_PUBLIC_LEARNING_HUB_URL);

  return (
    <div className="lp-shell lp-shell-bar" data-lp-app={app}>
      <div className="lp-shell-bar-inner">
        <div className="lp-shell-bar-context">
          <span className="lp-shell-bar-brand">Lernpfade</span>
          <span aria-hidden="true" className="lp-shell-bar-separator">
            /
          </span>
          <span className="lp-shell-bar-current">{SHELL_APP_NAME[app]}</span>
        </div>

        {hub ? (
          <nav aria-label="Lernpfade-Plattform">
            <ul className="lp-shell-bar-links">
              <li>
                <a className="lp-shell-bar-link" href={hub.home}>
                  Alle Pfade
                </a>
              </li>
              <li>
                <a className="lp-shell-bar-link" href={hub.review}>
                  Alle Wiederholungen
                </a>
              </li>
              <li>
                <a className="lp-shell-bar-link" href={hub.progress}>
                  Gesamtfortschritt
                </a>
              </li>
            </ul>
          </nav>
        ) : (
          <span className="lp-shell-bar-note hidden sm:inline">Gemeinsame Lernplattform</span>
        )}
      </div>
    </div>
  );
}
