import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

/**
 * Manifest der installierbaren Anwendung.
 *
 * Vorher lag es als feste Datei unter `public/`. Als erzeugte Route hat es zwei
 * Vorteile: Name, Beschreibung und Farben kommen aus derselben Quelle wie
 * überall sonst, und beim Umbenennen kann nichts zurückbleiben.
 *
 * `start_url` zeigt auf den Lernpfad und nicht auf die Startseite: Wer die App
 * auf den Startbildschirm legt, will weiterlernen und nicht das Werbeversprechen
 * noch einmal lesen. Wer nicht angemeldet ist, wird von dort ohnehin zur
 * Anmeldung geführt.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.title,
    short_name: BRAND.name,
    description: BRAND.shortDescription,
    lang: 'de',
    dir: 'ltr',
    start_url: '/lernen',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: BRAND.colors.surfaceLight,
    theme_color: BRAND.colors.primary,
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      // Eigene Zeichnung mit Rand ringsum: Bei „maskable" schneidet das
      // Betriebssystem eine Form aus dem Bild aus. Ohne Sicherheitsabstand
      // wäre der Pfad an den Rändern abgeschnitten.
      { src: '/icon-maskable.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Weiterlernen', url: '/lernen' },
      { name: 'Wiederholen', url: '/wiederholen' },
      { name: 'Code-Labor', url: '/labor' },
    ],
  };
}
