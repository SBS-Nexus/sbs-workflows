import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getCurrentUser } from '@/server/auth/session';
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';

export const metadata: Metadata = {
  title: {
    default: 'PythonPfad – Python verstehen. Selbst schreiben. Wirklich anwenden.',
    template: '%s · PythonPfad',
  },
  description:
    'Interaktive Lernplattform für Python-Anfängerinnen und -Anfänger: verständliche Erklärungen, Code direkt im Browser ausführen, Fehler systematisch verstehen und Gelerntes zum richtigen Zeitpunkt wiederholen.',
  applicationName: 'PythonPfad',
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
  appleWebApp: { capable: true, title: 'PythonPfad', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom wird ausdrücklich nicht gesperrt (WCAG 1.4.4).
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1017' },
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
