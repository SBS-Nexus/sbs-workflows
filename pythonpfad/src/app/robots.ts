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
 * Das `Disallow` ist dabei keine Zugangssicherung. Es ist eine Bitte an
 * höfliche Programme. Der eigentliche Schutz liegt in `requireUser()`; hier
 * geht es nur darum, keine nutzlosen Treffer zu erzeugen und Krabbler nicht
 * durch geschlossene Türen laufen zu lassen.
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
          '/labor',
          '/onboarding',
          '/einstufung',
          '/organisation',
          '/einladung',
          '/admin',
          '/api/',
          '/offline',
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
