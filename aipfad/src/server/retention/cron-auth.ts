import { timingSafeEqual } from 'node:crypto';

/**
 * Prüft den Kopfzeilenwert, mit dem Vercel geplante Läufe aufruft.
 *
 * Vercel schickt bei gesetztem `CRON_SECRET`:
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Bewusst keine eigene Krypto über das Nötige hinaus: Es ist ein Vergleich
 * zweier Zeichenketten zwischen zwei Maschinen, kein Passwortverfahren.
 * `timingSafeEqual` ist trotzdem sinnvoll, weil ein zeichenweise abbrechender
 * Vergleich den Wert über die Antwortzeit verraten kann.
 *
 * `timingSafeEqual` wirft bei ungleicher Länge. Deshalb wird die Länge vorher
 * geprüft — dass sie sich unterscheidet, verrät nur die Länge, und die ist
 * ohnehin durch die Konfiguration festgelegt.
 *
 * Ohne `server-only`, damit die Prüfung auf der Unit-Ebene ohne Datenbank
 * testbar bleibt. Sie liest selbst nichts aus der Umgebung; das Geheimnis wird
 * übergeben.
 */
export function istGueltigerCronAufruf(
  authorizationHeader: string | null,
  erwartetesGeheimnis: string,
): boolean {
  // Ein leeres oder fehlendes konfiguriertes Geheimnis darf NIE durchlassen.
  // Sonst öffnete ein Konfigurationsfehler die Route für jeden.
  if (erwartetesGeheimnis.length === 0) return false;
  if (!authorizationHeader) return false;

  const praefix = 'Bearer ';
  if (!authorizationHeader.startsWith(praefix)) return false;

  const uebergeben = Buffer.from(authorizationHeader.slice(praefix.length), 'utf8');
  const erwartet = Buffer.from(erwartetesGeheimnis, 'utf8');

  if (uebergeben.length !== erwartet.length) return false;
  return timingSafeEqual(uebergeben, erwartet);
}
