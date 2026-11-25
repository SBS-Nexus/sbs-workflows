/**
 * E5.3 — Regeln der Lernpläne (docs/E5-PLAN.md, Entscheidung 6).
 *
 * Ein Eintrag gibt einen Pfad vor, ein Ziel in abgeschlossenen Lektionen
 * (oder alle) und optional einen Tag, bis zu dem es erreicht sein soll. Ob es
 * erreicht ist, rechnet der Hub aus dem Stand, den die Pfade ohnehin geprüft
 * herausgeben. Reine Logik ohne Datenbank und ohne Netz.
 */

export const PFADE = ['python', 'sql', 'ai'] as const;
export type Pfad = (typeof PFADE)[number];

export const PFAD_NAME: Readonly<Record<Pfad, string>> = {
  python: 'PythonPfad',
  sql: 'SQLPfad',
  ai: 'AIPfad',
};

export const ZIEL_MAX = 1000;
export const EINTRAEGE_MAX = 30;

/** Ziel: Anzahl abgeschlossener Lektionen, `null` = alle Lektionen des Pfads. */
export type Eintrag = { pfad: Pfad; ziel: number | null; faellig: string | null };

export type EintragsStatus = 'erreicht' | 'offen' | 'ueberfaellig' | 'nicht-begonnen';

export const STATUS_TEXT: Readonly<Record<EintragsStatus, string>> = {
  erreicht: 'erreicht',
  offen: 'offen',
  ueberfaellig: 'überfällig',
  'nicht-begonnen': 'noch nicht begonnen',
};

const TAG = /^(\d{4})-(\d{2})-(\d{2})$/;

const BERLIN = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Heutiger Kalendertag in Deutschland, als `YYYY-MM-DD`. */
export function heuteTag(jetzt: Date): string {
  return BERLIN.format(jetzt);
}

function istTag(text: string): boolean {
  const m = TAG.exec(text);
  if (!m) return false;
  const datum = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(datum.getTime()) && datum.toISOString().slice(0, 10) === text;
}

/** Eingabe eines Eintrags aus einem Formular prüfen. */
export function pruefeEintrag(
  eingabe: { pfad: unknown; ziel: unknown; alle: unknown; faellig: unknown },
  jetzt: Date,
): { ok: true; eintrag: Eintrag } | { ok: false; grund: string } {
  const pfad = PFADE.find((p) => p === eingabe.pfad);
  if (!pfad) return { ok: false, grund: 'Bitte wähle einen Pfad.' };

  let ziel: number | null;
  if (eingabe.alle === 'on' || eingabe.alle === true) {
    ziel = null;
  } else {
    const zahl = Number(eingabe.ziel);
    if (!Number.isInteger(zahl) || zahl < 1 || zahl > ZIEL_MAX) {
      return { ok: false, grund: `Das Ziel ist eine Zahl von 1 bis ${ZIEL_MAX} Lektionen – oder „alle Lektionen“.` };
    }
    ziel = zahl;
  }

  let faellig: string | null = null;
  if (typeof eingabe.faellig === 'string' && eingabe.faellig.trim() !== '') {
    const tag = eingabe.faellig.trim();
    if (!istTag(tag)) return { ok: false, grund: 'Das Datum ist ungültig.' };
    const heute = heuteTag(jetzt);
    if (tag < heute) return { ok: false, grund: 'Die Fälligkeit liegt in der Vergangenheit.' };
    if (Number(tag.slice(0, 4)) > Number(heute.slice(0, 4)) + 5) {
      return { ok: false, grund: 'Die Fälligkeit liegt mehr als fünf Jahre in der Zukunft.' };
    }
    faellig = tag;
  }
  return { ok: true, eintrag: { pfad, ziel, faellig } };
}

/**
 * Status eines Eintrags für eine Person. `stand` ist `null`, wenn der Pfad
 * die Person nicht kennt. Überfällig erst am Tag nach der Fälligkeit.
 */
export function eintragsStatus(
  eintrag: Pick<Eintrag, 'ziel' | 'faellig'>,
  stand: { abgeschlossen: number; gesamt: number } | null,
  heute: string,
): EintragsStatus {
  const vorbei = eintrag.faellig !== null && heute > eintrag.faellig;
  if (stand) {
    const ziel = eintrag.ziel ?? stand.gesamt;
    if (ziel > 0 && stand.abgeschlossen >= ziel) return 'erreicht';
  }
  if (vorbei) return 'ueberfaellig';
  return stand ? 'offen' : 'nicht-begonnen';
}

/** „10 Lektionen“ oder „alle Lektionen“. */
export function zielText(ziel: number | null): string {
  if (ziel === null) return 'alle Lektionen';
  return ziel === 1 ? '1 Lektion' : `${ziel} Lektionen`;
}
