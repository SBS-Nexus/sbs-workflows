import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

/**
 * Manifest der installierbaren Anwendung.
 *
 * Als erzeugte Route statt als feste Datei unter `public/`: Name, Beschreibung
 * und Farben kommen damit aus derselben Quelle wie überall sonst, und beim
 * Umbenennen kann nichts zurückbleiben.
 *
 * `start_url` zeigt auf den Lernpfad und nicht auf die Startseite. Wer die
 * Anwendung auf den Startbildschirm legt, will weiterlernen und nicht das
 * Werbeversprechen noch einmal lesen; wer nicht angemeldet ist, wird von dort
 * ohnehin zur Anmeldung geführt.
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
      { src: '/icon-maskable.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Weiterlernen', url: '/lernen' },
      { name: 'Wiederholen', url: '/wiederholen' },
      { name: 'Abfrage schreiben', url: '/abfrage' },
    ],
  };
}
