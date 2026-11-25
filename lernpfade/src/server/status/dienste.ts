import 'server-only';
import { normalizeSourceBaseUrl } from '../../domain/review/fetch-source.ts';
import { REVIEW_SOURCE_APP_URLS } from '../../lib/catalog.ts';
import { hubKonto } from '../konto/einstellungen.ts';
import { datenbank } from '../organisation/datenbank.ts';
import { httpPruefung, type Pruefung } from './pruefung.ts';

/**
 * E6.2 — Was die Statusseite prüft. Kritisch ist das gemeinsame Konto: Ohne
 * es kann niemand anmelden. Eine einzelne App oder die Datenbank der
 * Organisationen schränkt nur ein; Lernen in den übrigen Pfaden geht weiter.
 */
export function plattformPruefungen(): Pruefung[] {
  const holen = (adresse: string, init: RequestInit) => fetch(adresse, init);
  const liste: Pruefung[] = [];

  const konto = hubKonto();
  if (konto) {
    const basis = konto.aussteller.replace(/\/$/, '');
    liste.push(httpPruefung('konto', 'Lernpfade-Konto', true, `${basis}/.well-known/openid-configuration`, holen));
    liste.push(httpPruefung('anmeldung', 'Anmeldeseite', true, `${basis}/ui/v2/login/healthy`, holen));
  }

  const apps = [
    ['python', 'PythonPfad'],
    ['sql', 'SQLPfad'],
    ['ai', 'AIPfad'],
  ] as const;
  for (const [quelle, name] of apps) {
    const basis = normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS[quelle]);
    if (basis) liste.push(httpPruefung(quelle, name, false, `${basis}/api/ready`, holen));
  }

  const db = datenbank();
  if (db) {
    liste.push({
      id: 'organisationen',
      name: 'Organisationen und Teams',
      kritisch: false,
      pruefe: async () => {
        await db.$queryRaw`SELECT 1`;
        return true;
      },
    });
  }
  return liste;
}
