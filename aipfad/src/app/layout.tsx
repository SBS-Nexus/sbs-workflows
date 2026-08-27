import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { getCurrentUser } from '@/server/auth/session';
import { BRAND } from '@/lib/brand';
import { siteUrl } from '@/server/site';

/*
 * Schriften. IBM Plex, selbst ausgeliefert (siehe pythonpfad/docs/ARCHITEKTUR.md
 * für die Begründung: kein Schriftennetz, damit kein Dritter bei jedem
 * Seitenaufruf die IP-Adresse der Lernenden erfährt).
 *
 * Anders als PythonPfad wird Plex Mono hier VORGELADEN: Es ist in AIPfad die
 * Auszeichnungsschrift (Überschriften, Navigation), nicht nur die
 * Quelltextschrift, und erscheint damit auf jeder Seite – siehe DESIGN.md.
 */
const plexSans = localFont({
  src: './schriften/plex-sans.woff2',
  variable: '--font-plex-sans',
  display: 'swap',
  weight: '100 700',
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
  fallback: ['ui-monospace', 'monospace'],
});

export function generateMetadata(): Metadata {
  const basis = siteUrl();
  return {
    metadataBase: new URL(basis),
    title: { default: BRAND.title, template: `%s · ${BRAND.name}` },
    description: BRAND.description,
    applicationName: BRAND.name,
    robots: { index: true, follow: true },
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
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRAND.colors.surfaceLight },
    { media: '(prefers-color-scheme: dark)', color: BRAND.colors.surfaceDark },
  ],
};

/** Setzt Farbschema, bevor React hydratisiert – sonst blitzt kurz das falsche Schema auf. */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('aipfad-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
    if (localStorage.getItem('aipfad-reduce-motion') === 'true') {
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
        {children}
      </body>
    </html>
  );
}
