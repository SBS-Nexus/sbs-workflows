import type { NextConfig } from 'next';

/**
 * Sicherheits-Header.
 *
 * Die CSP ist strenger als bei PythonPfad, und zwar aus einem inhaltlichen
 * Grund: Dort läuft eine WebAssembly-Laufzeit im Browser, deshalb braucht sie
 * `'wasm-unsafe-eval'` und einen Worker aus einem Blob. SQLPfad führt nichts im
 * Browser aus – T-SQL läuft auf dem Server. Beide Ausnahmen entfallen damit
 * ersatzlos.
 *
 * Es wird kein CDN kontaktiert. Schriften liegen selbst gehostet unter
 * `font-src 'self'`, damit bei keinem Seitenaufruf die IP-Adresse der
 * Lernenden an Dritte gemeldet wird.
 */
const isDev = process.env.NODE_ENV !== 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  // In der Entwicklung benötigt der Next.js-Dev-Overlay 'unsafe-eval'.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: http://localhost:*' : ''}`,
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

/*
 * Hinweis zu `Strict-Transport-Security`: Diese Kopfzeile steht bewusst NICHT
 * hier, sondern in src/proxy.ts. Next wertet `headers()` beim Übersetzen aus
 * und schreibt das Ergebnis in das Routen-Manifest – die Kopfzeile hinge damit
 * an der Umgebung des Übersetzungsvorgangs, nicht an der des Betriebs. Genau
 * das soll sie nicht.
 */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  experimental: {
    optimizePackageImports: ['@codemirror/view', '@codemirror/state'],
  },
  /*
   * Der SQL-Server-Treiber gehört nicht in ein gebündeltes Serverpaket.
   * `mssql` lädt Teile seiner Abhängigkeiten zur Laufzeit nach; gebündelt
   * fehlen sie dann.
   */
  serverExternalPackages: ['mssql'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
