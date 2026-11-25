/**
 * E6.2 — Bewertung der Statusseite (docs/E6-PLAN.md). Reine Logik.
 *
 * Kritisch sind Dienste, ohne die niemand anmelden oder lernen kann (Konto,
 * Hub-Datenbank). Fällt eine einzelne App aus, ist der Betrieb eingeschränkt,
 * nicht gestört: Die übrigen Pfade bleiben nutzbar.
 */

export type DienstStatus = 'betrieb' | 'langsam' | 'stoerung';
export type GesamtStatus = 'betrieb' | 'eingeschraenkt' | 'stoerung';

export type Dienst = {
  id: string;
  name: string;
  kritisch: boolean;
  status: DienstStatus;
  /** Antwortzeit in Millisekunden; `null` bei Ausfall. */
  ms: number | null;
};

export type Statusbericht = {
  gesamt: GesamtStatus;
  geprueftAm: string;
  dienste: Dienst[];
};

/** Ab dieser Antwortzeit gilt ein Dienst als langsam. */
export const LANGSAM_AB_MS = 2000;

export const DIENST_TEXT: Readonly<Record<DienstStatus, string>> = {
  betrieb: 'In Betrieb',
  langsam: 'Langsam',
  stoerung: 'Gestört',
};

export const GESAMT_TEXT: Readonly<Record<GesamtStatus, string>> = {
  betrieb: 'Alle Dienste in Betrieb',
  eingeschraenkt: 'Eingeschränkter Betrieb',
  stoerung: 'Störung',
};

export function bewerte(ok: boolean, ms: number): DienstStatus {
  if (!ok) return 'stoerung';
  return ms >= LANGSAM_AB_MS ? 'langsam' : 'betrieb';
}

export function gesamt(dienste: readonly Dienst[]): GesamtStatus {
  if (dienste.some((d) => d.kritisch && d.status === 'stoerung')) return 'stoerung';
  if (dienste.some((d) => d.status !== 'betrieb')) return 'eingeschraenkt';
  return 'betrieb';
}
