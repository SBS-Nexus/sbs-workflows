import { KONZEPTE } from './konzepte';
import { MODUL_1 } from './module/modul-1-tabellen';
import { MODUL_2 } from './module/modul-2-abfragen';
import { MODUL_3 } from './module/modul-3-verbinden';
import { HANDWERK } from './uebungsdaten/handwerk';
import type { Lehrplan } from './typen';
import type { UebungsDatensatz } from '@/domain/sql/schema';

/**
 * Der Lehrplan an einer Stelle.
 *
 * Diese Datei ist die Quelle für den Seed, für die Statistik auf der
 * Startseite und für den Inhaltsvalidator. Ein zweiter Ort mit derselben
 * Aufzählung wäre der Anfang zweier Wahrheiten.
 *
 * **Stand:** Die Module 1 bis 3 sind fertig, Modul 4 folgt. Der Validator
 * zählt nicht, wie viele Module es geben *soll* – er prüft, was da ist. Eine
 * Prüfung auf „15 Lektionen" würde beim schrittweisen Schreiben nur rot
 * leuchten und wäre nach dem letzten Modul für immer bedeutungslos.
 */
export const LEHRPLAN: Lehrplan = {
  version: '0.1.0',
  konzepte: KONZEPTE,
  module: [MODUL_1, MODUL_2, MODUL_3],
  projekte: [
    {
      slug: 'projekt-kundenliste',
      titel: 'Eine Kundenliste für den Aushang',
      modul: MODUL_1.slug,
      auftrag: `
Im Betrieb hängt eine Liste im Büro, die niemand mehr pflegt. Der Chef hätte
gern eine, die stimmt: alle Kundinnen und Kunden mit Ort, alphabetisch, und
gut lesbar beschriftet. Wo kein Ort hinterlegt ist, soll das erkennbar sein –
und zwar so, dass niemand denkt, dort sei versehentlich etwas gelöscht worden.
`.trim(),
      abnahme: [
        'Die Liste enthält alle Kundinnen und Kunden, auch die ohne Ort.',
        'Die Spaltenüberschriften sind auf Deutsch und ohne Abkürzungen.',
        'Ein fehlender Ort ist als solcher erkennbar und nicht als leere Zelle.',
        'Die Abfrage nennt die Spalten einzeln und benutzt kein *.',
      ],
      startSql: '-- Deine Abfrage für den Aushang:\n',
    },
    {
      slug: 'projekt-offene-auftraege',
      titel: 'Die Liste der offenen Aufträge',
      modul: MODUL_2.slug,
      auftrag: `
Montagmorgen, Besprechung. Der Chef will wissen, was gerade offen ist – und
zwar so, dass man es in zehn Sekunden überblickt: was es ist, seit wann es
liegt, und das Älteste zuoberst. Aufträge, denen noch niemand zugeteilt ist,
sind besonders interessant, weil sie sonst liegen bleiben.
`.trim(),
      abnahme: [
        'Nur offene Aufträge, keine abgeschlossenen.',
        'Die Liste ist nach dem Eingangsdatum sortiert, das älteste zuerst.',
        'Die Spaltenüberschriften sind lesbar und auf Deutsch.',
        'Du kannst erklären, warum du für „offen" IS NULL statt = NULL benutzt hast.',
      ],
      startSql: '-- Was liegt gerade offen?\n',
    },
    {
      slug: 'projekt-umsatz-je-kunde',
      titel: 'Wer bringt wie viel?',
      modul: MODUL_3.slug,
      auftrag: `
Der Steuerberater fragt nach einer Aufstellung: Was hat jede Kundin dem
Betrieb im Jahr eingebracht? Gemeint ist die Summe aller Positionen ihrer
Aufträge. Kundinnen ohne Auftrag sollen mit auftauchen – gerade sie sind
interessant, weil man sie anrufen könnte.
`.trim(),
      abnahme: [
        'Alle Kundinnen und Kunden erscheinen, auch die ohne Auftrag.',
        'Bei ihnen steht eine erkennbare Null oder ein gekennzeichnetes NULL, keine leere Zelle.',
        'Die Summe stimmt: Menge mal Einzelpreis, über alle Positionen aller Aufträge.',
        'Die Liste ist nach Summe absteigend sortiert.',
        'Du kannst erklären, warum hier ein LEFT JOIN nötig ist und ein INNER JOIN das Falsche täte.',
      ],
      startSql: '-- Umsatz je Kundin und Kunde:\n',
    },
  ],
};

/** Alle Übungsdatensätze. */
export const UEBUNGSDATEN: readonly UebungsDatensatz[] = [HANDWERK];

/** Zahlen für die Startseite. Aus dem Lehrplan gerechnet, nicht gepflegt. */
export function inhaltsZahlen(): {
  lektionen: number;
  aufgaben: number;
  konzepte: number;
  projekte: number;
} {
  const lektionen = LEHRPLAN.module.flatMap((modul) => modul.lektionen);
  return {
    lektionen: lektionen.length,
    aufgaben: lektionen.reduce((summe, lektion) => summe + lektion.aufgaben.length, 0),
    konzepte: LEHRPLAN.konzepte.length,
    projekte: LEHRPLAN.projekte.length,
  };
}
