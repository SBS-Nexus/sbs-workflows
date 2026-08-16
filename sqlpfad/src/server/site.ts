import 'server-only';
import { getEnv } from '@/server/env';

/**
 * Die Adresse, unter der diese Installation erreichbar ist.
 *
 * Sie kommt aus `APP_URL` und ist damit die *einzige* Stelle, an der die Domain
 * steht. Ein Umzug – von `localhost` auf die eigene Domain, oder von einer
 * Domain auf eine andere – ist deshalb eine Zeile in der Umgebungsdatei und
 * kein Suchen-und-Ersetzen im Quelltext.
 *
 * Warum das mehr ist als Bequemlichkeit: Absolute Adressen stehen in
 * `sitemap.xml`, in `robots.txt`, in den kanonischen Verweisen und in den
 * Vorschaubildern für geteilte Links. Sind die falsch, verweist die Seite auf
 * sich selbst unter einer Adresse, die es nicht gibt – Suchmaschinen und
 * Messenger folgen dem, Menschen landen im Nichts.
 */

/** Die Basisadresse ohne abschließenden Schrägstrich. */
export function siteUrl(): string {
  return getEnv().APP_URL.replace(/\/+$/, '');
}

/**
 * Macht aus einem Pfad eine vollständige Adresse.
 *
 * Akzeptiert Pfade mit und ohne führenden Schrägstrich, damit Aufrufstellen
 * sich darüber keine Gedanken machen müssen.
 */
export function absoluteUrl(path = '/'): string {
  const rein = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl()}${rein === '/' ? '' : rein}`;
}

/**
 * Läuft die Anwendung unter einer echten, verschlüsselten Adresse?
 *
 * Davon hängen zwei Dinge ab: ob `Strict-Transport-Security` gesetzt werden
 * darf (unter `http://localhost` wäre das eine Falle, die den Rechner für
 * Monate auf HTTPS festnagelt) und ob Sitzungscookies das `Secure`-Merkmal
 * bekommen.
 */
export function isSecureDeployment(): boolean {
  return siteUrl().startsWith('https://');
}
