import type { MetadataRoute } from 'next';
import { siteUrl } from '@/server/site';

/**
 * Anweisungen für Suchmaschinen. Öffentlich ist nur, was ohne Anmeldung
 * sinnvoll ist. Zur Laufzeit erzeugt, nicht beim Übersetzen (siehe
 * pythonpfad/docs/ARCHITEKTUR.md für die Begründung: `APP_URL` gehört zur
 * Betriebsumgebung, nicht zum Übersetzungsvorgang).
 */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/anmelden',
          '/registrieren',
          '/lernen',
          '/nachschlagen',
          '/glossar',
          '/wissenslandkarte',
          '/setup',
        ],
        disallow: [
          '/pfad',
          '/lektion',
          '/ueben',
          '/wiederholen',
          '/labs',
          '/fortschritt',
          '/profil',
          '/onboarding',
          '/admin',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
