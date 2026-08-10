import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { getCurrentUser } from '@/server/auth/session';
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';
import { BRAND } from '@/lib/brand';
import { siteUrl } from '@/server/site';

/*
 * Schriften.
 *
 * Vorher stand hier `ui-sans-serif, system-ui` – also die Systemschrift. Die
 * ist auf jedem Gerät eine andere, und sie ist das, was einer Oberfläche am
 * schnellsten ansieht, dass niemand über die Schrift nachgedacht hat.
 *
 * IBM Plex ist eine ausdrücklich für ein Unternehmen entworfene Schrift:
 * sachlich, gut lesbar in kleinen Graden, mit sauberen Umlauten und ß. Die
 * Familie deckt Fließtext und Quelltext ab, beides stammt also aus einer Hand.
 * Bewusst nicht Inter – die steckt inzwischen in so vielen Oberflächen, dass
 * sie selbst zum Systemgeschmack geworden ist.
 *
 * Selbst ausgeliefert, nicht über ein Schriftennetz: Die Sicherheitsrichtlinie
 * erlaubt `font-src 'self'`, und ein Abruf bei einem Dritten würde bei jedem
 * Seitenaufruf die IP-Adresse der Lernenden dorthin melden.
 *
 * `display: 'swap'` sorgt dafür, dass sofort etwas lesbar ist. Ein Text, der
 * eine halbe Sekunde unsichtbar bleibt, weil die Schrift noch lädt, ist der
 * schlechtere Tausch – erst recht auf einer langsamen Verbindung.
 */
const plexSans = localFont({
  src: './schriften/plex-sans.woff2',
  variable: '--font-plex-sans',
  display: 'swap',
  weight: '100 700',
  // Maße der Ersatzschrift angleichen, damit der Text beim Wechsel nicht
  // springt. Ohne diese Angabe verschiebt sich beim Eintreffen der Schrift die
  // halbe Seite – ein Ruckeln, das man jedem Aufruf ansieht.
  adjustFontFallback: 'Arial',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const plexMono = localFont({
  src: [
    { path: './schriften/plex-mono-400.woff2', weight: '400', style: 'normal' },
    { path: './schriften/plex-mono-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
  /*
   * Nicht vorab laden.
   *
   * Die Schreibmaschinenschrift wird nur dort gebraucht, wo Quelltext steht -
   * auf Lektions-, Übungs- und Projektseiten. Ohne diese Angabe legt Next sie
   * in den Kopf jeder Seite, und die Anmeldeseite zieht 30 kB für eine Schrift,
   * die dort kein einziges Zeichen setzt. Gemessen: 74,3 kB statt 44,4 kB.
   */
  preload: false,
  fallback: ['ui-monospace', 'monospace'],
});

/**
 * `metadataBase` ist der Grund, warum hier eine Funktion und keine Konstante
 * steht: Die Adresse kommt aus der Umgebung und ist beim Übersetzen noch nicht
 * bekannt. Ohne sie erzeugt Next relative Verweise auf das Vorschaubild – und
 * relative Adressen versteht kein Messenger, der eine Vorschau bauen will.
 */
export function generateMetadata(): Metadata {
  const basis = siteUrl();
  return {
    metadataBase: new URL(basis),
    title: { default: BRAND.title, template: `%s · ${BRAND.name}` },
    description: BRAND.description,
    applicationName: BRAND.name,
    robots: { index: true, follow: true },
    manifest: '/manifest.webmanifest',
    icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
    appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: 'default' },
    openGraph: {
      type: 'website',
      locale: 'de_DE',
      siteName: BRAND.name,
      title: BRAND.title,
      description: BRAND.description,
      url: basis,
    },
    twitter: { card: 'summary_large_image', title: BRAND.title, description: BRAND.description },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom wird ausdrücklich nicht gesperrt (WCAG 1.4.4).
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRAND.colors.surfaceLight },
    { media: '(prefers-color-scheme: dark)', color: BRAND.colors.surfaceDark },
  ],
};

/**
 * Setzt Farbschema und Bewegungspräferenz, bevor React hydratisiert.
 * Ohne dieses Skript blitzt beim Laden kurz das falsche Schema auf.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('pythonpfad-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
    if (localStorage.getItem('pythonpfad-reduce-motion') === 'true') {
      document.documentElement.setAttribute('data-reduce-motion', 'true');
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  return (
    <html
      lang="de"
      {...(user?.theme === 'light' || user?.theme === 'dark' ? { 'data-theme': user.theme } : {})}
      {...(user?.reduceMotion ? { 'data-reduce-motion': 'true' } : {})}
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#hauptinhalt" className="skip-link">
          Direkt zum Hauptinhalt springen
        </a>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
