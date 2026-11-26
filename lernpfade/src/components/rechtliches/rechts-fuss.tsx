import { ANBIETER } from '@/lib/rechtliches';

/**
 * E6.1 — Pflichtangaben auf jeder Seite des Hubs erreichbar (§ 5 DDG: leicht
 * erkennbar, unmittelbar erreichbar). Steht unter jedem Inhalt im Layout.
 */
export function RechtsFuss(): React.ReactElement {
  return (
    <footer className="recht-fuss">
      <nav aria-label="Rechtliches">
        <span>{ANBIETER.firma}</span>
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        <a href="/avv">Auftragsverarbeitung</a>
        <a href="/status">Status</a>
      </nav>
    </footer>
  );
}
