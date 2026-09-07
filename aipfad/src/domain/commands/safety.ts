/**
 * Sicherheitsmerkmale eines Befehls.
 *
 * Die Merkmale stehen hier zentral, weil drei Stellen dieselbe Wahrheit
 * brauchen: der Nachschlagebereich, die Einstufungsaufgaben und der
 * Inhaltsvalidator, der destruktive Befehle ohne Warnung meldet. Eine zweite,
 * abweichende Liste wäre schlimmer als gar keine.
 *
 * Die Einteilung folgt der Frage, die beim Lernen wirklich zählt: Was passiert,
 * wenn ich das ausführe — und komme ich da wieder heraus?
 */

/** Was ein Befehl anfasst. Ein Befehl kann mehrere Bereiche berühren. */
export const WIRKBEREICHE = [
  /** Liest nur, verändert nichts. */
  'nur-lesend',
  /** Verändert Dateien im Arbeitsverzeichnis. */
  'arbeitsverzeichnis',
  /** Verändert die Staging Area. */
  'staging',
  /** Legt Commits an oder schreibt vorhandene um. */
  'verlauf',
  /** Wirkt über das Netzwerk auf ein entferntes Repository. */
  'remote',
] as const;

export type Wirkbereich = (typeof WIRKBEREICHE)[number];

/**
 * Wie riskant der Befehl ist.
 *
 *  - `harmlos`     — schlimmstenfalls unnötig; nichts geht verloren.
 *  - `achtsam`     — verändert etwas Sichtbares, ist aber rückholbar.
 *  - `destruktiv`  — kann Arbeit unwiederbringlich vernichten oder den
 *                    Verlauf so umschreiben, dass andere davon getroffen sind.
 */
export const GEFAHR_STUFEN = ['harmlos', 'achtsam', 'destruktiv'] as const;
export type GefahrStufe = (typeof GEFAHR_STUFEN)[number];

export const GEFAHR_BESCHRIFTUNG: Record<GefahrStufe, string> = {
  harmlos: 'Harmlos',
  achtsam: 'Mit Bedacht',
  destruktiv: 'Kann Arbeit vernichten',
};

export const WIRKBEREICH_BESCHRIFTUNG: Record<Wirkbereich, string> = {
  'nur-lesend': 'Liest nur',
  arbeitsverzeichnis: 'Ändert Arbeitsverzeichnis',
  staging: 'Ändert Staging Area',
  verlauf: 'Ändert Verlauf',
  remote: 'Wirkt aufs Remote',
};

export interface BefehlSicherheit {
  /** Welche Bereiche der Befehl berührt. */
  wirkung: Wirkbereich[];
  gefahr: GefahrStufe;
  /** Lässt sich das Ergebnis mit Bordmitteln wieder herstellen? */
  reversibel: boolean;
  /** Braucht der Befehl eine Netzwerkverbindung? */
  netzwerk: boolean;
}

/**
 * Ein destruktiver Befehl MUSS erklären, was genau verloren gehen kann.
 * Der Inhaltsvalidator prüft das; hier steht die Regel, damit beide Seiten
 * dieselbe Bedingung meinen.
 */
export function brauchtWarnung(sicherheit: BefehlSicherheit): boolean {
  return sicherheit.gefahr === 'destruktiv' || !sicherheit.reversibel;
}

/** Berührt der Befehl etwas, das andere Mitwirkende sehen? */
export function wirktNachAussen(sicherheit: BefehlSicherheit): boolean {
  return sicherheit.wirkung.includes('remote');
}
