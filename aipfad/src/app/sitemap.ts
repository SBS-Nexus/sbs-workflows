import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/server/site';

/**
 * Seitenverzeichnis für Suchmaschinen. Zur Laufzeit erzeugt, nicht beim
 * Übersetzen – sonst würde `APP_URL` aus der Übersetzungsumgebung
 * einbetoniert. Enthält nur öffentlich sinnvolle Adressen; die
 * Lernbibliothek ist – anders als bei PythonPfad – ohne Anmeldung lesbar
 * und gehört deshalb mit hinein (siehe robots.ts).
 */
export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const jetzt = new Date();

  return [
    { url: absoluteUrl('/'), lastModified: jetzt, changeFrequency: 'monthly', priority: 1 },
    {
      url: absoluteUrl('/lernen'),
      lastModified: jetzt,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/nachschlagen'),
      lastModified: jetzt,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/glossar'),
      lastModified: jetzt,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl('/wissenslandkarte'),
      lastModified: jetzt,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    { url: absoluteUrl('/setup'), lastModified: jetzt, changeFrequency: 'monthly', priority: 0.5 },
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
