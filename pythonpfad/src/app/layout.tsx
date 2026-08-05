import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getCurrentUser } from '@/server/auth/session';
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';
import { BRAND } from '@/lib/brand';
import { siteUrl } from '@/server/site';

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
