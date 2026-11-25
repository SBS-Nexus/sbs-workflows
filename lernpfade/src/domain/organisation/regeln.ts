/**
 * E5.1 — Regeln der Organisationen (docs/E5-PLAN.md, Abschnitte 5 und 6).
 *
 * Reine Logik ohne Datenbank: Rollen und Rechte, Plätze, Kürzel und die
 * Prüfung, ob eine Einladung eingelöst werden darf. Der Dienst
 * (`src/server/organisation/dienst.ts`) wendet sie in Transaktionen an.
 */

export const ROLLEN = ['ADMIN', 'TEACHER', 'LEARNER'] as const;
export type Rolle = (typeof ROLLEN)[number];

export const ROLLEN_NAME: Readonly<Record<Rolle, string>> = {
  ADMIN: 'Admin',
  TEACHER: 'Lehrkraft',
  LEARNER: 'Lernend',
};

export type Recht =
  | 'organisation.umbenennen'
  | 'mitglieder.sehen'
  | 'mitglieder.verwalten'
  | 'einladen.lernende'
  | 'einladen.leitung'
  | 'protokoll.lesen';

const RECHTE: Readonly<Record<Rolle, readonly Recht[]>> = {
  ADMIN: [
    'organisation.umbenennen',
    'mitglieder.sehen',
    'mitglieder.verwalten',
    'einladen.lernende',
    'einladen.leitung',
    'protokoll.lesen',
  ],
  TEACHER: ['mitglieder.sehen', 'einladen.lernende'],
  LEARNER: [],
};

export function darf(rolle: Rolle, recht: Recht): boolean {
  return RECHTE[rolle].includes(recht);
}

/** Rechte über Lernende hinaus verlangen den zweiten Faktor (Entscheidung vom 20.11.2026). */
export function brauchtZweitenFaktor(rolle: Rolle): boolean {
  return rolle !== 'LEARNER';
}

/** Wer darf mit welcher Rolle einladen? Lehrkräfte nur Lernende. */
export function darfEinladenAls(rolle: Rolle, neueRolle: Rolle): boolean {
  return darf(rolle, neueRolle === 'LEARNER' ? 'einladen.lernende' : 'einladen.leitung');
}

/** Nur Lernende belegen einen Platz. */
export function belegtPlatz(rolle: Rolle): boolean {
  return rolle === 'LEARNER';
}

export const TESTPHASE_PLAETZE = 10;
export const EINLADUNG_GUELTIG_TAGE = 14;
/** Obergrenze für die Einlösungen eines offenen Links. */
export const EINLADUNG_MAX_NUTZUNGEN = 500;
export const NAME_MIN = 2;
export const NAME_MAX = 80;

/** Name einer Organisation: getrimmt, Leerraum zusammengefasst, 2–80 Zeichen. */
export function pruefeName(eingabe: unknown): { ok: true; name: string } | { ok: false; grund: string } {
  if (typeof eingabe !== 'string') return { ok: false, grund: 'Bitte gib einen Namen ein.' };
  const name = eingabe.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < NAME_MIN) return { ok: false, grund: `Der Name braucht mindestens ${NAME_MIN} Zeichen.` };
  if (name.length > NAME_MAX) return { ok: false, grund: `Der Name darf höchstens ${NAME_MAX} Zeichen haben.` };
  return { ok: true, name };
}

/** Kürzel aus dem Namen, wie in PythonPfad: klein, ohne Umlaute, Bindestriche, höchstens 40 Zeichen. */
export function kuerzelAus(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/g, '') || 'organisation'
  );
}

export type Platzstand = { belegt: number; gesamt: number; frei: number };

export function platzstand(belegt: number, gesamt: number): Platzstand {
  return { belegt, gesamt, frei: Math.max(0, gesamt - belegt) };
}

/** Was eine Einladung im Moment der Einlösung ausmacht. */
export type EinladungsLage = {
  rolle: Rolle;
  email: string | null;
  maxNutzungen: number;
  nutzungen: number;
  gueltigBis: Date;
  widerrufen: boolean;
  organisationGesperrt: boolean;
  /** Bereits Mitglied dieser Organisation? */
  schonMitglied: boolean;
  /** Belegte Plätze und Plätze der Organisation. */
  plaetze: Platzstand;
};

export type Person = {
  sub: string;
  name: string;
  email: string | null;
  emailBestaetigt: boolean;
  zweiFaktoren: boolean;
};

export type EinloesungsUrteil =
  | { ok: true }
  | {
      ok: false;
      grund:
        | 'abgelaufen'
        | 'widerrufen'
        | 'aufgebraucht'
        | 'gesperrt'
        | 'schon-mitglied'
        | 'adresse-unbestaetigt'
        | 'adresse-falsch'
        | 'voll';
    };

/**
 * Darf diese Person diese Einladung jetzt einlösen? Die Reihenfolge ist
 * Absicht: Erst die Einladung selbst, dann die Person, zuletzt die Plätze.
 * Eine gebundene Einladung zählt nur mit bestätigter, gleicher Adresse.
 */
export function urteileUeberEinloesung(lage: EinladungsLage, person: Person, jetzt: Date): EinloesungsUrteil {
  if (lage.widerrufen) return { ok: false, grund: 'widerrufen' };
  if (lage.gueltigBis.getTime() <= jetzt.getTime()) return { ok: false, grund: 'abgelaufen' };
  if (lage.nutzungen >= lage.maxNutzungen) return { ok: false, grund: 'aufgebraucht' };
  if (lage.organisationGesperrt) return { ok: false, grund: 'gesperrt' };
  if (lage.schonMitglied) return { ok: false, grund: 'schon-mitglied' };
  if (lage.email) {
    if (!person.email || !person.emailBestaetigt) return { ok: false, grund: 'adresse-unbestaetigt' };
    if (person.email !== lage.email) return { ok: false, grund: 'adresse-falsch' };
  }
  if (belegtPlatz(lage.rolle) && lage.plaetze.frei <= 0) return { ok: false, grund: 'voll' };
  return { ok: true };
}

export const EINLOESUNG_TEXT: Readonly<Record<Exclude<EinloesungsUrteil, { ok: true }>['grund'], string>> = {
  abgelaufen: 'Diese Einladung ist abgelaufen. Bitte um eine neue.',
  widerrufen: 'Diese Einladung wurde zurückgezogen.',
  aufgebraucht: 'Dieser Einladungslink wurde schon so oft genutzt, wie vorgesehen. Bitte um einen neuen.',
  gesperrt: 'Diese Organisation nimmt derzeit niemanden auf.',
  'schon-mitglied': 'Du bist bereits Mitglied dieser Organisation.',
  'adresse-unbestaetigt':
    'Diese Einladung gilt für eine bestimmte E-Mail-Adresse. Bestätige deine Adresse in deinem Lernpfade-Konto und öffne den Link erneut.',
  'adresse-falsch':
    'Diese Einladung gilt für eine andere E-Mail-Adresse. Melde dich mit dem Konto an, an das sie ging.',
  voll: 'Alle Plätze dieser Organisation sind belegt. Bitte die Person, die dich eingeladen hat, um einen freien Platz.',
};

/** Kann ein Admin diese Rollenänderung vornehmen, ohne die Organisation ohne Admin zu lassen? */
export function rollenwechselErlaubt(alt: Rolle, neu: Rolle, adminsInsgesamt: number): boolean {
  if (alt === neu) return true;
  return !(alt === 'ADMIN' && adminsInsgesamt <= 1);
}
