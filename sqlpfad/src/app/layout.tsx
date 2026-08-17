import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { BRAND } from '@/lib/brand';
import { siteUrl } from '@/server/site';

/*
 * Schriften.
 *
 * IBM Plex, dieselbe Familie wie in PythonPfad: sachlich, gut lesbar in
 * kleinen Graden, mit sauberen Umlauten und ß. Fließtext und Quelltext
 * stammen damit aus einer Hand – und bei einer Anwendung, in der Tabellen und
 * SQL-Text nebeneinander stehen, ist das keine Feinheit.
 *
 * Selbst ausgeliefert, nicht über ein Schriftennetz: Die Sicherheitsrichtlinie
 * erlaubt `font-src 'self'`, und ein Abruf bei einem Dritten würde bei jedem
 * Seitenaufruf die IP-Adresse der Lernenden dorthin melden.
 */
const plexSans = localFont({
  src: './schriften/plex-sans.woff2',
  variable: '--font-plex-sans',
  display: 'swap',
  weight: '100 700',
  // Maße der Ersatzschrift angleichen, damit der Text beim Wechsel nicht
  // springt.
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
   * Die Schreibmaschinenschrift wird nur dort gebraucht, wo SQL oder Ergebnisse
   * stehen. Ohne diese Angabe legt Next sie in den Kopf jeder Seite, und die
   * Anmeldeseite zieht mehrere Dutzend Kilobyte für eine Schrift, die dort kein
   * einziges Zeichen setzt.
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
    /*
     * Symbol und Manifest ausdrücklich verweisen.
     *
     * Next verlinkt beides nicht von selbst, nur weil die Dateien vorhanden
     * sind. Ohne diese zwei Zeilen bleibt der Browsertab leer und die
     * Anwendung nicht installierbar – und beides sieht man nicht beim
     * Entwickeln, sondern erst auf einem fremden Gerät.
     */
    icons: { icon: '/icon.svg', apple: '/icon.svg' },
    manifest: '/manifest.webmanifest',
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
    var stored = localStorage.getItem('sqlpfad-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
    if (localStorage.getItem('sqlpfad-reduce-motion') === 'true') {
      document.documentElement.setAttribute('data-reduce-motion', 'true');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html
      lang="de"
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
        {children}
      </body>
    </html>
  );
}
