/**
 * Datenform des Suchverzeichnisses der Befehlspalette.
 *
 * Bewusst in `lib` und nicht in `server`: Die Einträge werden auf dem Server
 * zusammengestellt, aber im Browser durchsucht. Beide Seiten brauchen denselben
 * Typ, und die Datei darf deshalb nichts aus `server/` importieren.
 */

import type { SearchableEntry } from '@/lib/search/fuzzy';
import type { IconName } from '@/components/ui/icon';

export type CommandGroup =
  'Bereiche' | 'Lektionen' | 'Projekte' | 'Wiederholen' | 'Aktionen' | 'Hilfe';

/** Befehle ohne Ziel-URL. Die Palette kennt jeden dieser Namen und führt ihn aus. */
export type CommandAction = 'toggle-theme' | 'show-shortcuts' | 'toggle-motion';

export interface CommandEntry extends SearchableEntry {
  id: string;
  title: string;
  keywords?: string;
  group: CommandGroup;
  /** Zielseite. Genau eines von `href` und `action` ist gesetzt. */
  href?: string;
  action?: CommandAction;
  /** Rechts angezeigter Zusatz, etwa „Modul 2" oder „abgeschlossen". */
  hint?: string;
  /** Symbol links. Rein schmückend, immer zusätzlich zum Text. */
  icon?: IconName;
}

/**
 * Feste Einträge, die nicht aus der Datenbank stammen.
 *
 * Sie stehen hier statt im Server-Dienst, damit die Palette auch dann sinnvoll
 * arbeitet, wenn das Verzeichnis (etwa im Offlinebetrieb) leer geliefert wird.
 */
export const STATIC_COMMANDS: readonly CommandEntry[] = [
  {
    id: 'bereich-lernen',
    title: 'Lernen',
    keywords: 'lernpfad kurs module lektionen start',
    group: 'Bereiche',
    href: '/lernen',
    icon: 'lernen',
  },
  {
    id: 'bereich-ueben',
    title: 'Üben',
    keywords: 'aufgaben training uebungsmodus',
    group: 'Bereiche',
    href: '/ueben',
    icon: 'ueben',
  },
  {
    id: 'bereich-projekte',
    title: 'Projekte',
    keywords: 'projektwerkstatt anwenden bauen',
    group: 'Bereiche',
    href: '/projekte',
    icon: 'projekte',
  },
  {
    id: 'bereich-wiederholen',
    title: 'Wiederholen',
    keywords: 'wiederholung auffrischen faellig',
    group: 'Bereiche',
    href: '/wiederholen',
    icon: 'wiederholen',
  },
  {
    id: 'bereich-fortschritt',
    title: 'Fortschritt',
    keywords: 'dashboard statistik kompetenz uebersicht landkarte',
    group: 'Bereiche',
    href: '/fortschritt',
    icon: 'fortschritt',
  },
  {
    id: 'bereich-labor',
    title: 'Code-Labor',
    keywords: 'python ausprobieren spielwiese editor freies experimentieren',
    group: 'Bereiche',
    href: '/labor',
    icon: 'labor',
  },
  {
    id: 'bereich-organisation',
    title: 'Organisationen',
    keywords: 'kohorte klasse kurs team lehrkraft einladung schule',
    group: 'Bereiche',
    href: '/organisation',
    icon: 'organisation',
  },
  {
    id: 'bereich-profil',
    title: 'Profil und Einstellungen',
    keywords: 'konto daten export loeschen einstellungen darstellung',
    group: 'Bereiche',
    href: '/profil',
    icon: 'profil',
  },
  {
    id: 'aktion-theme',
    title: 'Farbschema umschalten',
    keywords: 'hell dunkel dark light modus',
    group: 'Aktionen',
    action: 'toggle-theme',
    icon: 'halbmond',
  },
  {
    id: 'aktion-motion',
    title: 'Bewegung reduzieren umschalten',
    keywords: 'animation ruhig barrierefrei',
    group: 'Aktionen',
    action: 'toggle-motion',
    icon: 'bewegung',
  },
  {
    id: 'hilfe-kuerzel',
    title: 'Tastaturkürzel anzeigen',
    keywords: 'shortcuts tasten hilfe bedienung',
    group: 'Hilfe',
    action: 'show-shortcuts',
    icon: 'info',
  },
];
