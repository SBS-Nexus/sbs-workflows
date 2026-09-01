import 'server-only';
import { getEnv } from '@/server/env';

/**
 * Die Adresse, unter der diese Installation erreichbar ist. Kommt aus
 * `APP_URL` – der einzigen Stelle, an der die Domain steht. Übernommen aus
 * PythonPfad/SQLPfad, siehe dortige Begründung in docs/ARCHITEKTUR.md.
 */

export function siteUrl(): string {
  return getEnv().APP_URL.replace(/\/+$/, '');
}

export function absoluteUrl(path = '/'): string {
  const rein = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl()}${rein === '/' ? '' : rein}`;
}

/** Läuft die Anwendung unter einer echten, verschlüsselten Adresse? */
export function isSecureDeployment(): boolean {
  return siteUrl().startsWith('https://');
}
