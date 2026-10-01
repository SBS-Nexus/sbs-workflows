import type { Metadata, Viewport } from 'next';
import './globals.css';

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
  themeColor: '#111827',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="de">
      <body>
        <a className="skip-link" href="#hauptinhalt">
          Direkt zum Hauptinhalt
        </a>
        {children}
      </body>
    </html>
  );
}
