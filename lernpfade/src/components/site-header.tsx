/** Kopfzeile der Unterseiten des Hubs mit Rückweg zur Startseite. */
export function SiteHeader({ current }: { current: 'vokabeln' | 'wiederholen' | 'fortschritt' }): React.ReactElement {
  return (
    <header className="site-header site-header-sub">
      <div className="shell header-inner">
        <a className="brand" href="/" aria-label="Lernpfade Startseite">
          <span className="brand-mark" aria-hidden="true">
            LP
          </span>
          <span>
            <strong>Lernpfade</strong>
            <small>SBS Nexus Learning</small>
          </span>
        </a>
        <nav aria-label="Seitennavigation">
          <a href="/">Pfade</a>
          <a href="/vokabeln" aria-current={current === 'vokabeln' ? 'page' : undefined}>
            Vokabeln
          </a>
          <a href="/wiederholen" aria-current={current === 'wiederholen' ? 'page' : undefined}>
            Wiederholen
          </a>
          <a href="/fortschritt" aria-current={current === 'fortschritt' ? 'page' : undefined}>
            Fortschritt
          </a>
        </nav>
      </div>
    </header>
  );
}
