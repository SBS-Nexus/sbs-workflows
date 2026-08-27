import type { NextConfig } from 'next';

/**
 * Sicherheits-Header. Die CSP ist streng: kein `unsafe-eval`, kein externes
 * Skript, keine Drittanbieter-Fonts oder -CDNs. AIPfad führt anders als
 * PythonPfad keinen WebAssembly-Code im Browser aus, daher entfällt die dort
 * nötige `wasm-unsafe-eval`-Ausnahme.
 */
const isDev = process.env.NODE_ENV !== 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: http://localhost:*' : ''}`,
  "worker-src 'self'",
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
  /*
   * aipfad/ ist kein eigenes Git-Repository, sondern ein Geschwisterprojekt
   * innerhalb von sbs-workflows. Ohne diese Angabe sucht Turbopack die
   * Projektwurzel anhand von package-lock.json außerhalb des Repositories und
   * warnt bei jedem Build.
   */
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
