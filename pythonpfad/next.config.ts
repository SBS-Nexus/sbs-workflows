import type { NextConfig } from 'next';

/**
 * Sicherheits-Header.
 *
 * Die CSP ist bewusst streng. Zwei Besonderheiten sind für diese App notwendig:
 *
 * 1. `'wasm-unsafe-eval'` in `script-src`: Pyodide kompiliert WebAssembly.
 *    Ohne diese Direktive kann die Python-Laufzeit nicht starten. `'unsafe-eval'`
 *    (klassisches JavaScript-eval) wird NICHT erlaubt.
 * 2. `worker-src 'self' blob:`: Der Python-Worker wird als eigenes Skript geladen.
 *
 * Alle Pyodide-Assets liegen selbst gehostet unter /pyodide. Es wird kein CDN
 * kontaktiert, damit weder IP-Adressen noch Nutzungsmuster an Dritte abfließen.
 */
const isDev = process.env.NODE_ENV !== 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  // In der Entwicklung benötigt der Next.js-Dev-Overlay 'unsafe-eval'.
  `script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: http://localhost:*' : ''}`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Die Pyodide-Laufzeit ist unveränderlich versioniert und darf lange
        // im Browser-Cache liegen – das spart bei jedem Besuch ~10 MB Download.
        source: '/pyodide/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
