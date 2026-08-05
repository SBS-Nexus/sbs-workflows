import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/server/site';

/**
 * Seitenverzeichnis für Suchmaschinen.
 *
 * Es enthält bewusst nur drei Adressen. Die Versuchung ist groß, hier auch
 * alle Lektionen einzutragen – „mehr Seiten im Index" klingt nach mehr
 * Sichtbarkeit. Nur: Lektionen sind ohne Anmeldung nicht erreichbar. Ein
 * Verzeichnis, das auf Adressen zeigt, hinter denen für den Krabbler eine
 * Weiterleitung zur Anmeldung steht, beschädigt das Vertrauen in die ganze
 * Datei und bringt keinen einzigen Besucher.
 *
 * Sollten später öffentliche Lernseiten dazukommen, gehören sie hierher – dann
 * aber wirklich öffentlich, nicht nur im Verzeichnis.
 */
/**
 * Zur Laufzeit erzeugt, nicht beim Übersetzen.
 *
 * Sonst würde die Adresse aus der Umgebung des Übersetzungsvorgangs
 * einbetoniert – wird in einer Pipeline ohne `APP_URL` gebaut, stünde in der
 * ausgelieferten Datei `http://localhost:3000`, und niemand merkt es, weil
 * die Datei ja existiert und gültig aussieht. Die paar Millisekunden je Abruf
 * sind der Preis dafür, dass Übersetzen und Betreiben getrennt bleiben.
 */
export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const jetzt = new Date();

  return [
    {
      url: absoluteUrl('/'),
      lastModified: jetzt,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: absoluteUrl('/registrieren'),
      lastModified: jetzt,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/anmelden'),
      lastModified: jetzt,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
