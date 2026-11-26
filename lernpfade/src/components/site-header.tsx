import { KontoStatus } from './konto-status';

export type SiteSection = 'start' | 'vokabeln' | 'wiederholen' | 'fortschritt';

/** Bildmarke des Learning OS: drei Signalstriche, rein dekorativ. */
export function BrandMark(): React.ReactElement {
  return (
    <span className="los-brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

/**
 * Gemeinsame Kopfzeile aller Hub-Routen (Startseite, VokabelPfad,
 * Wiederholen, Fortschritt, 404). Eine Navigation „Seitennavigation", die
 * aktuelle Route trägt `aria-current="page"`. Unter 900 px steht die
 * Navigation als eigene Zeile im Fluss unter der Marke — nichts liegt über
 * dem Inhalt, nichts läuft über den Rand.
 */
export function SiteHeader({
  current,
}: {
  /** Ohne Angabe (etwa auf der 404-Seite) ist kein Eintrag aktuell. */
  current?: SiteSection;
}): React.ReactElement {
  const here = (section: SiteSection): 'page' | undefined => (current === section ? 'page' : undefined);
  return (
    <header className="los-header">
      <a className="los-brand" href="/" aria-label="Lernpfade Startseite" aria-current={here('start')}>
        <BrandMark />
        <span>
          lernpfade<span className="los-brand-period">.</span>
        </span>
        <small>by SBS Nexus</small>
      </a>
      <nav className="los-nav" aria-label="Seitennavigation">
        <a href={current === 'start' ? '#lernpfade' : '/#lernpfade'}>Pfade</a>
        <a href="/vokabeln" aria-current={here('vokabeln')}>
          Vokabeln
        </a>
        <a href="/wiederholen" aria-current={here('wiederholen')}>
          Wiederholen
        </a>
        <a href="/fortschritt" aria-current={here('fortschritt')}>
          Fortschritt
        </a>
        <KontoStatus />
      </nav>
    </header>
  );
}
