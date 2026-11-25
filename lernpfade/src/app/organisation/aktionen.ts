'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  aendereRolle,
  benenneUm,
  entferne,
  kontext,
  ladeEin,
  legeAn,
  loeseEin,
  OrganisationsFehler,
  verlasse,
  widerrufe,
} from '@/server/organisation/dienst';
import {
  archiviereTeam,
  entferneAusTeam,
  fuegeHinzu,
  legeTeamAn,
  setzeFreigabe,
} from '@/server/organisation/teams';
import { anmeldeAdresse, orgZugang } from '@/server/organisation/zugang';
import { EINLOESUNG_TEXT } from '@/domain/organisation/regeln';

/**
 * Server-Aktionen der Organisationen (E5.1). Jede Aktion prüft selbst:
 * Anmeldung, Mitgliedschaft und Recht (im Dienst). Server-Aktionen sind über
 * direkte POST-Anfragen erreichbar; die Seite allein schützt nichts.
 */

export type Antwort = { meldung?: string; erfolg?: string; link?: string };

const NICHT_EINGERICHTET = 'Organisationen sind hier nicht eingerichtet.';

async function angemeldet(ziel: string) {
  const zugang = await orgZugang();
  if (!zugang) throw new Error(NICHT_EINGERICHTET);
  if (!zugang.person) redirect(anmeldeAdresse(ziel));
  return { ...zugang, person: zugang.person };
}

async function mitKontext(kuerzel: string) {
  const zugang = await angemeldet(`/organisation/${kuerzel}`);
  const k = await kontext(zugang.db, zugang.person.sub, kuerzel);
  if (!k) throw new OrganisationsFehler('nicht-gefunden', 'Du bist nicht Mitglied dieser Organisation.');
  return { ...zugang, k };
}

function alsAntwort(fehler: unknown): Antwort {
  if (fehler instanceof OrganisationsFehler) return { meldung: fehler.message };
  throw fehler;
}

export async function legeAnAktion(_vorher: Antwort, daten: FormData): Promise<Antwort> {
  const { db, person } = await angemeldet('/organisation');
  let kuerzel: string;
  try {
    const ergebnis = await legeAn(db, person, daten.get('name'));
    if (!ergebnis.ok) return { meldung: ergebnis.meldung };
    kuerzel = ergebnis.kuerzel;
  } catch (fehler) {
    return alsAntwort(fehler);
  }
  redirect(`/organisation/${kuerzel}`);
}

export async function ladeEinAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  try {
    const { db, person, k, konto } = await mitKontext(kuerzel);
    const ergebnis = await ladeEin(db, k, person, {
      rolle: daten.get('rolle'),
      email: daten.get('email') ?? undefined,
      maxNutzungen: daten.get('maxNutzungen') ?? 1,
      team: daten.get('team') ?? undefined,
    });
    if (!ergebnis.ok) return { meldung: ergebnis.meldung };
    refresh();
    return {
      erfolg: 'Einladung erstellt. Den Link siehst du nur jetzt – kopiere ihn und gib ihn weiter.',
      link: `${konto.basis}/einladung/${ergebnis.token}`,
    };
  } catch (fehler) {
    return alsAntwort(fehler);
  }
}

export async function widerrufeAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  try {
    const { db, person, k } = await mitKontext(kuerzel);
    await widerrufe(db, k, person, String(daten.get('einladung') ?? ''));
    refresh();
    return { erfolg: 'Einladung zurückgezogen.' };
  } catch (fehler) {
    return alsAntwort(fehler);
  }
}

export async function aendereRolleAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  try {
    const { db, person, k } = await mitKontext(kuerzel);
    const ergebnis = await aendereRolle(db, k, person, String(daten.get('mitglied') ?? ''), daten.get('rolle'));
    if (!ergebnis.ok) return { meldung: ergebnis.meldung };
    refresh();
    return { erfolg: 'Rolle geändert.' };
  } catch (fehler) {
    return alsAntwort(fehler);
  }
}

export async function entferneAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  try {
    const { db, person, k } = await mitKontext(kuerzel);
    const ergebnis = await entferne(db, k, person, String(daten.get('mitglied') ?? ''));
    if (!ergebnis.ok) return { meldung: ergebnis.meldung };
    refresh();
    return { erfolg: 'Mitglied entfernt.' };
  } catch (fehler) {
    return alsAntwort(fehler);
  }
}

export async function benenneUmAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  try {
    const { db, person, k } = await mitKontext(kuerzel);
    const ergebnis = await benenneUm(db, k, person, daten.get('name'));
    if (!ergebnis.ok) return { meldung: ergebnis.meldung };
    refresh();
    return { erfolg: 'Name gespeichert.' };
  } catch (fehler) {
    return alsAntwort(fehler);
  }
}

export async function verlasseAktion(kuerzel: string, _vorher: Antwort): Promise<Antwort> {
  const { db, person } = await angemeldet(`/organisation/${kuerzel}`);
  const ergebnis = await verlasse(db, person, kuerzel);
  if (!ergebnis.ok) return { meldung: ergebnis.meldung };
  redirect('/organisation');
}

export async function loeseEinAktion(token: string, _vorher: Antwort): Promise<Antwort> {
  const { db, person } = await angemeldet(`/einladung/${token}`);
  const ergebnis = await loeseEin(db, person, token);
  if (!ergebnis.ok) {
    return { meldung: ergebnis.grund === 'ungueltig' ? 'Diese Einladung gibt es nicht.' : EINLOESUNG_TEXT[ergebnis.grund] };
  }
  redirect(`/organisation/${ergebnis.kuerzel}`);
}

// ---------------------------------------------------------------------------
// E5.2 — Teams und Einwilligung
// ---------------------------------------------------------------------------

export async function legeTeamAnAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  let ziel: string;
  try {
    const { db, person, k } = await mitKontext(kuerzel);
    const ergebnis = await legeTeamAn(db, k, person, daten.get('name'));
    if (!ergebnis.ok) return { meldung: ergebnis.meldung };
    ziel = `/organisation/${kuerzel}/teams/${ergebnis.kuerzel}`;
  } catch (fehler) {
    return alsAntwort(fehler);
  }
  redirect(ziel);
}

export async function fuegeHinzuAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  try {
    const { db, person, k } = await mitKontext(kuerzel);
    const ergebnis = await fuegeHinzu(db, k, person, String(daten.get('team') ?? ''), String(daten.get('mitglied') ?? ''));
    if (!ergebnis.ok) return { meldung: ergebnis.meldung };
    refresh();
    return { erfolg: 'Ins Team aufgenommen.' };
  } catch (fehler) {
    return alsAntwort(fehler);
  }
}

export async function entferneAusTeamAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  try {
    const { db, person, k } = await mitKontext(kuerzel);
    const ergebnis = await entferneAusTeam(db, k, person, String(daten.get('teamMitglied') ?? ''));
    if (!ergebnis.ok) return { meldung: ergebnis.meldung };
    refresh();
    return { erfolg: 'Aus dem Team genommen.' };
  } catch (fehler) {
    return alsAntwort(fehler);
  }
}

export async function archiviereTeamAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  try {
    const { db, person, k } = await mitKontext(kuerzel);
    const archivieren = daten.get('archivieren') === '1';
    const ergebnis = await archiviereTeam(db, k, person, String(daten.get('team') ?? ''), archivieren);
    if (!ergebnis.ok) return { meldung: ergebnis.meldung };
    refresh();
    return { erfolg: archivieren ? 'Team archiviert.' : 'Team wieder geöffnet.' };
  } catch (fehler) {
    return alsAntwort(fehler);
  }
}

/** Die Person entscheidet selbst; wirkt sofort. */
export async function setzeFreigabeAktion(kuerzel: string, _vorher: Antwort, daten: FormData): Promise<Antwort> {
  const { db, person } = await angemeldet(`/organisation/${kuerzel}`);
  const freigabe = daten.get('freigabe') === '1';
  const ergebnis = await setzeFreigabe(db, person, String(daten.get('teamMitglied') ?? ''), freigabe);
  if (!ergebnis.ok) return { meldung: ergebnis.meldung };
  refresh();
  return {
    erfolg: freigabe
      ? 'Dein Stand ist in diesem Team jetzt namentlich sichtbar.'
      : 'Dein Stand erscheint in diesem Team jetzt nur noch in Summen.',
  };
}

