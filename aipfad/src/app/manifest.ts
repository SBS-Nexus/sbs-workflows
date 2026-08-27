import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

/**
 * Manifest der installierbaren Anwendung. `start_url` zeigt auf den
 * Lernpfad, nicht auf die Startseite: Wer die App auf den Startbildschirm
 * legt, will weiterlernen, nicht das Werbeversprechen noch einmal lesen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.title,
    short_name: BRAND.name,
    description: BRAND.description,
    lang: 'de',
    dir: 'ltr',
    start_url: '/pfad',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: BRAND.colors.surfaceLight,
    theme_color: '#b45309',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      { src: '/icon-maskable.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Weiterlernen', url: '/pfad' },
      { name: 'Lernbibliothek', url: '/lernen' },
      { name: 'Wiederholen', url: '/wiederholen' },
    ],
  };
}
