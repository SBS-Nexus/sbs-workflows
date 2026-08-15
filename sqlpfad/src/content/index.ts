import { KONZEPTE } from './konzepte';
import { MODUL_1 } from './module/modul-1-tabellen';
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
 * **Stand:** Modul 1 ist fertig, die Module 2 bis 4 folgen. Der Validator
 * zählt nicht, wie viele Module es geben *soll* – er prüft, was da ist. Eine
 * Prüfung auf „15 Lektionen" würde beim schrittweisen Schreiben nur rot
 * leuchten und wäre nach dem letzten Modul für immer bedeutungslos.
 */
export const LEHRPLAN: Lehrplan = {
  version: '0.1.0',
  konzepte: KONZEPTE,
  module: [MODUL_1],
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
