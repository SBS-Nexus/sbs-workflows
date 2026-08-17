import type { MetadataRoute } from 'next';
import { siteUrl } from '@/server/site';

/**
 * Anweisungen für Suchmaschinen.
 *
 * Öffentlich ist nur, was ohne Anmeldung sinnvoll ist: die Startseite und die
 * beiden Zugangsseiten. Alles andere steht hinter der Anmeldung und hat in
 * einem Index nichts verloren – ein Suchtreffer, der zur Anmeldemaske führt,
 * ist für niemanden ein Treffer.
 *
 * Das `Disallow` ist dabei **keine Zugangssicherung**. Es ist eine Bitte an
 * höfliche Programme. Der eigentliche Schutz liegt in `requireUser()` und
 * `requireAdmin()`; hier geht es nur darum, keine nutzlosen Treffer zu
 * erzeugen.
 */

/**
 * Zur Laufzeit erzeugt, nicht beim Übersetzen.
 *
 * Sonst würde die Adresse aus der Umgebung des Übersetzungsvorgangs
 * einbetoniert – wird ohne die richtige `APP_URL` gebaut, stünde in der
 * ausgelieferten Datei die falsche Adresse, und niemand merkt es, weil die
 * Datei ja existiert und gültig aussieht.
 */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/anmelden', '/registrieren'],
        disallow: [
          '/lernen',
          '/ueben',
          '/wiederholen',
          '/projekte',
          '/fortschritt',
          '/profil',
          '/abfrage',
          '/onboarding',
          '/admin',
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
