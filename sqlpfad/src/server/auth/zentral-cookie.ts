import 'server-only';
import { isSecureDeployment } from '@/server/site';
import { ANMELDE_COOKIE } from '@/server/auth/zentral-app';
import { ZUSTAND_GUELTIG_MS } from '@/server/auth/zentral-zustand';

/**
 * Cookie für den Zustand der laufenden Anmeldung (E4.2). Unter https mit
 * `__Host-`-Präfix: Der Browser nimmt es dann nur ohne `Domain`, mit
 * `Path=/` und `Secure` an, eine Subdomain kann es also nicht unterschieben.
 * `SameSite=Lax`, weil die Rückkehr vom gemeinsamen Konto eine
 * seitenübergreifende Navigation ist.
 */
export function zustandsCookieName(): string {
  return isSecureDeployment() ? `__Host-${ANMELDE_COOKIE}` : ANMELDE_COOKIE;
}

export function zustandsCookieOptionen(): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureDeployment(),
    path: '/',
    maxAge: Math.floor(ZUSTAND_GUELTIG_MS / 1000),
  };
}
