import { bestimmeKlasse, pruefeAnweisung, teileAnweisungen } from '@/domain/sql/statement-policy';
import type { Aufgabe, Lehrplan, Lektion } from './typen';

/**
 * Prüft den Lehrplan, bevor er jemanden erreicht.
 *
 * Ein Inhaltsfehler ist teurer als ein Programmfehler: Er sieht richtig aus,
 * fällt niemandem auf, und die Lernende sucht den Fehler bei sich. Deshalb
 * läuft diese Prüfung als Test und nicht als Redaktionsleitfaden.
 *
 * Die wichtigste Regel steht in `pruefeMusterloesung`: **Die Musterlösung muss
 * durch die eigene Policy der Aufgabe kommen.** Wer eine UPDATE-Aufgabe
 * schreibt und die Freigabe vergisst, merkt das sonst erst, wenn eine Lernende
 * die richtige Lösung eintippt und eine Ablehnung bekommt.
 */

export interface Befund {
  /** Wo der Fehler steckt – Slug-Pfad wie `modul-1/lektion-2/aufgabe-3`. */
  ort: string;
  problem: string;
}

const HINWEISE_MINDESTENS = 2;
const HINWEISE_HOECHSTENS = 5;

/** Arten, die ohne SQL keinen Sinn ergeben. */
const BRAUCHT_SQL = new Set<Aufgabe['art']>([
  'ABFRAGE_ERGAENZEN',
  'ABFRAGE_SCHREIBEN',
  'FEHLER_FINDEN',
  'TRANSFER',
]);

/** Arten, die ohne Auswahlmöglichkeiten keinen Sinn ergeben. */
const BRAUCHT_OPTIONEN = new Set<Aufgabe['art']>([
  'EINFACHAUSWAHL',
  'MEHRFACHAUSWAHL',
  'REIHENFOLGE',
]);

function pruefeMusterloesung(aufgabe: Aufgabe, ort: string, befunde: Befund[]): void {
  if (!aufgabe.loesungSql) return;

  const erlaubte = aufgabe.erlaubteKlassen ?? ['SELECT'];

  /*
   * Jede Anweisung einzeln - nicht nur die erste.
   *
   * Eine Musterlösung darf aus mehreren Anweisungen bestehen; die
   * Transaktionslektion besteht ausdrücklich daraus. Wer nur die erste prüft,
   * sieht bei `BEGIN TRANSACTION; UPDATE ...;` nur die Transaktion und lässt
   * das UPDATE durch, auch wenn die Aufgabe DML gar nicht freigegeben hat.
   * Der Runner prüft die Eingabe der Lernenden ebenso vollständig - beide
   * Seiten müssen denselben Maßstab anlegen, sonst weicht die Musterlösung von
   * dem ab, was die Aufgabe tatsächlich annimmt.
   */
  for (const anweisung of teileAnweisungen(aufgabe.loesungSql)) {
    if (pruefeAnweisung(anweisung, erlaubte).erlaubt) continue;

    befunde.push({
      ort,
      problem:
        `Die Musterlösung enthält eine ${bestimmeKlasse(anweisung)}-Anweisung, die Aufgabe ` +
        `lässt aber nur ${erlaubte.join(', ')} zu. Wer sie richtig löst, bekäme eine Ablehnung.`,
    });
  }
}

function pruefeAufgabe(aufgabe: Aufgabe, ort: string, konzepte: Set<string>): Befund[] {
  const befunde: Befund[] = [];

  if (aufgabe.aufgabenstellung.trim().length < 15) {
    befunde.push({ ort, problem: 'Die Aufgabenstellung ist zu kurz, um verständlich zu sein.' });
  }

  if (BRAUCHT_SQL.has(aufgabe.art) && !aufgabe.loesungSql) {
    befunde.push({ ort, problem: `Aufgabenart ${aufgabe.art} ohne Musterlösung.` });
  }

  if (BRAUCHT_OPTIONEN.has(aufgabe.art)) {
    const optionen = aufgabe.nutzlast?.['optionen'];
    if (!Array.isArray(optionen) || optionen.length < 2) {
      befunde.push({
        ort,
        problem: `Aufgabenart ${aufgabe.art} braucht mindestens zwei Optionen.`,
      });
    }
  }

  if (
    (aufgabe.art === 'FREITEXT' || aufgabe.art === 'FEHLER_ERKLAEREN') &&
    typeof aufgabe.nutzlast?.['musterantwort'] !== 'string'
  ) {
    // Ohne Musterantwort gäbe es nach dem Absenden nichts zu vergleichen –
    // die Aufgabe wäre eine Frage, auf die nie jemand antwortet.
    befunde.push({ ort, problem: `Aufgabenart ${aufgabe.art} ohne Musterantwort.` });
  }

  if (aufgabe.art === 'ERGEBNIS_VORHERSAGEN' && !aufgabe.erwartetesErgebnis) {
    befunde.push({
      ort,
      problem: 'Eine Vorhersageaufgabe ohne erwartetes Ergebnis lässt sich nicht auflösen.',
    });
  }

  if (aufgabe.erwartetesErgebnis) {
    const { spalten, zeilen } = aufgabe.erwartetesErgebnis;
    const schief = zeilen.find((zeile) => zeile.length !== spalten.length);
    if (schief) {
      befunde.push({
        ort,
        problem:
          `Das erwartete Ergebnis hat ${spalten.length} Spalten, aber eine Zeile mit ` +
          `${schief.length} Werten. Die Bewertung würde immer scheitern.`,
      });
    }
  }

  if (
    aufgabe.hinweise.length < HINWEISE_MINDESTENS ||
    aufgabe.hinweise.length > HINWEISE_HOECHSTENS
  ) {
    befunde.push({
      ort,
      problem:
        `${aufgabe.hinweise.length} Hinweise. Erlaubt sind ${HINWEISE_MINDESTENS} bis ` +
        `${HINWEISE_HOECHSTENS}: Ein einzelner Hinweis ist entweder zu vage oder verrät alles.`,
    });
  }

  /*
   * Kein Hinweis darf die Lösung enthalten.
   *
   * Die Leiter soll denken lassen, nicht abkürzen. Ein Hinweis, der die
   * Musterlösung wörtlich nennt, macht die Aufgabe zu einer Abschreibübung -
   * und die Bewertung danach zu einer Auskunft über nichts.
   */
  if (aufgabe.loesungSql) {
    const loesung = aufgabe.loesungSql.replace(/\s+/g, ' ').trim().toLowerCase();
    for (const hinweis of aufgabe.hinweise) {
      if (hinweis.replace(/\s+/g, ' ').toLowerCase().includes(loesung)) {
        befunde.push({ ort, problem: 'Ein Hinweis enthält die Musterlösung im Wortlaut.' });
      }
    }
  }

  if (aufgabe.schwierigkeit < 1 || aufgabe.schwierigkeit > 5) {
    befunde.push({
      ort,
      problem: `Schwierigkeit ${aufgabe.schwierigkeit} liegt außerhalb 1 bis 5.`,
    });
  }

  if (aufgabe.konzepte.length === 0) {
    befunde.push({
      ort,
      problem:
        'Ohne Konzept zahlt die Aufgabe auf nichts ein und taucht nie in Wiederholungen auf.',
    });
  }

  for (const konzept of aufgabe.konzepte) {
    if (!konzepte.has(konzept)) {
      befunde.push({ ort, problem: `Unbekanntes Konzept: ${konzept}` });
    }
  }

  pruefeMusterloesung(aufgabe, ort, befunde);
  return befunde;
}

function pruefeLektion(lektion: Lektion, ort: string, konzepte: Set<string>): Befund[] {
  const befunde: Befund[] = [];

  if (!lektion.leitfrage.trim().endsWith('?')) {
    // Jede Lektion beginnt mit einer Frage an die Daten. Ein Aussagesatz wäre
    // wieder eine Überschrift und kein Einstieg.
    befunde.push({ ort, problem: 'Die Leitfrage ist keine Frage.' });
  }

  if (lektion.lernziele.length === 0) {
    befunde.push({ ort, problem: 'Keine Lernziele angegeben.' });
  }

  if (lektion.aufgaben.length < 3) {
    befunde.push({
      ort,
      problem: `Nur ${lektion.aufgaben.length} Aufgaben. Eine Lektion braucht mindestens drei.`,
    });
  }

  for (const konzept of lektion.konzepte) {
    if (!konzepte.has(konzept)) befunde.push({ ort, problem: `Unbekanntes Konzept: ${konzept}` });
  }

  return befunde;
}

/** Prüft den gesamten Lehrplan. Eine leere Liste heißt: in Ordnung. */
export function pruefeLehrplan(lehrplan: Lehrplan): Befund[] {
  const befunde: Befund[] = [];
  const konzepte = new Set(lehrplan.konzepte.map((konzept) => konzept.slug));
  const gesehen = new Set<string>();

  /** Ein doppelter Slug überschreibt beim Seed still den vorherigen Eintrag. */
  const merkeSlug = (slug: string, ort: string): void => {
    if (gesehen.has(slug)) befunde.push({ ort, problem: `Slug kommt doppelt vor: ${slug}` });
    gesehen.add(slug);
  };

  for (const konzept of lehrplan.konzepte) merkeSlug(konzept.slug, `konzept/${konzept.slug}`);

  for (const modul of lehrplan.module) {
    merkeSlug(modul.slug, modul.slug);

    for (const lektion of modul.lektionen) {
      const lektionsOrt = `${modul.slug}/${lektion.slug}`;
      merkeSlug(lektion.slug, lektionsOrt);
      befunde.push(...pruefeLektion(lektion, lektionsOrt, konzepte));

      for (const aufgabe of lektion.aufgaben) {
        const aufgabenOrt = `${lektionsOrt}/${aufgabe.slug}`;
        merkeSlug(aufgabe.slug, aufgabenOrt);
        befunde.push(...pruefeAufgabe(aufgabe, aufgabenOrt, konzepte));
      }
    }
  }

  const modulSlugs = new Set(lehrplan.module.map((modul) => modul.slug));
  for (const projekt of lehrplan.projekte) {
    const ort = `projekt/${projekt.slug}`;
    merkeSlug(projekt.slug, ort);

    if (!modulSlugs.has(projekt.modul)) {
      befunde.push({ ort, problem: `Unbekanntes Modul: ${projekt.modul}` });
    }
    if (projekt.abnahme.length === 0) {
      befunde.push({
        ort,
        problem: 'Ohne Abnahmekriterien weiß niemand, wann das Projekt fertig ist.',
      });
    }
  }

  /*
   * Ein Konzept ohne Aufgabe ist eine Sackgasse: Es taucht in der
   * Wissenslandkarte auf, lässt sich aber nie üben und bleibt für immer auf
   * null. Das sieht nach eigenem Versäumnis aus und ist ein Fehler im Inhalt.
   */
  const geuebt = new Set(
    lehrplan.module.flatMap((modul) =>
      modul.lektionen.flatMap((lektion) => lektion.aufgaben.flatMap((aufgabe) => aufgabe.konzepte)),
    ),
  );
  for (const konzept of lehrplan.konzepte) {
    if (!geuebt.has(konzept.slug)) {
      befunde.push({
        ort: `konzept/${konzept.slug}`,
        problem: 'Kein einziger Aufgabenbezug – das Konzept bliebe für immer bei null.',
      });
    }
  }

  return befunde;
}
