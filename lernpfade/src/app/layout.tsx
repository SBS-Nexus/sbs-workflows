import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/*
 * Schrift (Roadmap E3): IBM Plex wie in PythonPfad, SQLPfad und AIPfad –
 * dieselben Dateien, bytegleich aus docs/learning-tokens/schriften/,
 * selbst ausgeliefert (kein Abruf bei einem Schriftennetz, das bei jedem
 * Seitenaufruf die IP-Adresse erführe). Die Stapel `--los-sans` und
 * `--los-mono` im Token-Vertrag greifen auf die beiden Variablen zu.
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
  // Nur dort gebraucht, wo Quelltext steht; nicht in jeden Seitenkopf legen.
  preload: false,
  fallback: ['ui-monospace', 'monospace'],
});

export const metadata: Metadata = {
  title: {
    default: 'Lernpfade — Technologie wirklich verstehen',
    template: '%s · Lernpfade',
  },
  description:
    'Eine gemeinsame Lernplattform für Python, SQL, Git & GitHub, AI und weitere technische Fähigkeiten.',
  applicationName: 'Lernpfade',
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0b0e0e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    // Der Hub kennt nur das helle Schema; `data-theme="light"` hält die
    // gemeinsamen Statusfarben (learning-feedback.css) auch bei System-Dunkel hell.
    <html
      lang="de"
      data-theme="light"
      data-lp-app="hub"
      className={`${plexSans.variable} ${plexMono.variable}`}
    >
      <body>
        <a className="skip-link" href="#hauptinhalt">
          Direkt zum Hauptinhalt
        </a>
        {children}
      </body>
    </html>
  );
}
