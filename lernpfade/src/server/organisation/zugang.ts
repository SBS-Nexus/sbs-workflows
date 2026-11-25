import 'server-only';
import type { PrismaClient } from '../../generated/prisma/client.ts';
import type { Person } from '../../domain/organisation/regeln.ts';
import { sitzungLesen } from '../konto/cookies.ts';
import { hubKonto, type HubKonto } from '../konto/einstellungen.ts';
import { datenbank } from './datenbank.ts';

/**
 * Was jede Organisationsseite und jede Aktion braucht: Konto, Datenbank und
 * die angemeldete Person. `null`, wenn Organisationen nicht eingerichtet sind
 * (kein gemeinsames Konto oder keine Datenbank); dann gibt es die Seiten nicht.
 */
export type OrgZugang = { konto: HubKonto; db: PrismaClient; person: Person | null };

export async function orgZugang(): Promise<OrgZugang | null> {
  const konto = hubKonto();
  const db = datenbank();
  if (!konto || !db) return null;
  const sitzung = await sitzungLesen(konto);
  return {
    konto,
    db,
    person: sitzung
      ? {
          sub: sitzung.sub,
          name: sitzung.name,
          email: sitzung.email,
          emailBestaetigt: sitzung.emailBestaetigt,
          zweiFaktoren: sitzung.zweiFaktoren,
        }
      : null,
  };
}

/** Anmelden mit Rückkehr an diese Stelle; `frisch` verlangt eine neue Anmeldung (zweiter Faktor). */
export function anmeldeAdresse(ziel: string, frisch = false): string {
  return `/auth/anmelden?ziel=${encodeURIComponent(ziel)}${frisch ? '&bestaetigen=1' : ''}`;
}

/** Einrichtung des zweiten Faktors in der Anmelde-App des Kontos. */
export function zweiterFaktorAdresse(konto: HubKonto): string {
  return `${konto.aussteller.replace(/\/$/, '')}/ui/v2/login/mfa/set`;
}
