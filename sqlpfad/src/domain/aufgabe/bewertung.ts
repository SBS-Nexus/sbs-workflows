import type { Aufgabenart } from '@/content/typen';
import type { Resultset } from '@/domain/sql/resultset';
import { pruefeAnweisung, teileAnweisungen } from '@/domain/sql/statement-policy';
import type { AnweisungsKlasse } from '@/domain/sql/statement-policy';

/**
 * Aufgaben bewerten – ohne Datenbank.
 *
 * Ein großer Teil des Lehrplans lässt sich beurteilen, ohne eine einzige
 * Anweisung auszuführen: Eine Auswahl ist richtig oder nicht, eine Reihenfolge
 * stimmt oder nicht, eine vorhergesagte Zeilenzahl trifft zu oder nicht. Das
 * ist keine Notlösung für die fehlende Ausführung, sondern der Kern der
 * Didaktik – wer vorhersagt, bevor er ausführt, lernt mehr als wer ausführt und
 * danach schaut, was herauskam.
 *
 * Zwei Fälle bekommen bewusst **kein** Urteil:
 *
 *  - Eine Antwort in eigenen Worten lässt sich nicht maschinell beurteilen.
 *    Ein Textvergleich, der „ungefähr richtig" behauptet, wäre eine Anmaßung.
 *    Stattdessen kommt die Musterantwort daneben, und die Lernende sagt
 *    selbst, ob sie es getroffen hat. Das ist die ehrlichere Bewertung und
 *    zugleich die lernwirksamere.
 *  - Eine geschriebene Abfrage lässt sich nur am Ergebnis beurteilen, und das
 *    braucht einen Übungsserver. Solange keiner erreichbar ist, sagt die
 *    Bewertung genau das – sie behauptet nicht, die Abfrage sei richtig, weil
 *    sie richtig *aussieht*.
 *
 * Dieses Modul kennt weder Datenbank noch React. Es bekommt Daten und gibt ein
 * Urteil zurück, und genau deshalb lässt es sich vollständig prüfen.
 */

export interface BewertbareAufgabe {
  art: Aufgabenart;
  nutzlast?: Record<string, unknown> | null;
  erwartetesErgebnis?: Resultset | null;
  erlaubteKlassen?: readonly AnweisungsKlasse[];
}

/** Was die Lernende abgegeben hat. Die Form hängt an der Aufgabenart. */
export type Antwort =
  | { art: 'auswahl'; gewaehlt: readonly number[] }
  | { art: 'reihenfolge'; reihenfolge: readonly number[] }
  | { art: 'zahl'; wert: number }
  | { art: 'text'; text: string }
  | { art: 'sql'; sql: string };

/**
 * Das Urteil.
 *
 * `begruendung` ist immer an die Lernende gerichtet und erklärt, *warum* –
 * „Falsch" allein ist keine Rückmeldung, sondern eine Note.
 */
export type Bewertung =
  | { art: 'richtig'; begruendung: string }
  | { art: 'teilweise'; begruendung: string }
  | { art: 'falsch'; begruendung: string }
  /** Kein maschinelles Urteil möglich: Die Musterantwort steht daneben. */
  | { art: 'selbst-vergleichen'; musterantwort: string }
  /** Die Eingabe passt nicht zu dem, was die Aufgabe übt. */
  | { art: 'abgelehnt'; begruendung: string }
  /** Beurteilbar erst am Ergebnis – dafür fehlt der Übungsserver. */
  | { art: 'braucht-ausfuehrung'; begruendung: string }
  | { art: 'leer'; begruendung: string };

/** Welche Eingabeform eine Aufgabenart erwartet. */
export function antwortform(art: Aufgabenart): Antwort['art'] {
  switch (art) {
    case 'EINFACHAUSWAHL':
    case 'MEHRFACHAUSWAHL':
      return 'auswahl';
    case 'REIHENFOLGE':
      return 'reihenfolge';
    case 'ERGEBNIS_VORHERSAGEN':
      return 'zahl';
    case 'FREITEXT':
    case 'FEHLER_ERKLAEREN':
      return 'text';
    default:
      return 'sql';
  }
}

export function bewerteAufgabe(aufgabe: BewertbareAufgabe, antwort: Antwort): Bewertung {
  if (antwort.art !== antwortform(aufgabe.art)) {
    return {
      art: 'abgelehnt',
      begruendung: 'Diese Antwort passt nicht zu der Aufgabe. Lade die Seite neu.',
    };
  }

  switch (antwort.art) {
    case 'auswahl':
      return bewerteAuswahl(aufgabe, antwort.gewaehlt);
    case 'reihenfolge':
      return bewerteReihenfolge(aufgabe, antwort.reihenfolge);
    case 'zahl':
      return bewerteVorhersage(aufgabe, antwort.wert);
    case 'text':
      return bewerteText(aufgabe, antwort.text);
    case 'sql':
      return bewerteSql(aufgabe, antwort.sql);
  }
}

// --- Auswahl ---------------------------------------------------------------

function bewerteAuswahl(aufgabe: BewertbareAufgabe, gewaehlt: readonly number[]): Bewertung {
  const richtig = alsIndexmenge(aufgabe.nutzlast?.['richtig']);
  if (!richtig) {
    // Ein Inhaltsfehler, den der Validator abfängt. Hier trotzdem behandeln:
    // Ein Absturz wäre für die Lernende ein Fehler bei ihr.
    return { art: 'abgelehnt', begruendung: 'Zu dieser Aufgabe fehlt die Lösung im Inhalt.' };
  }

  if (gewaehlt.length === 0) {
    return { art: 'leer', begruendung: 'Wähle zuerst eine Antwort aus.' };
  }

  if (aufgabe.art === 'EINFACHAUSWAHL' && gewaehlt.length > 1) {
    return { art: 'abgelehnt', begruendung: 'Hier ist genau eine Antwort gemeint.' };
  }

  const gewaehltMenge = new Set(gewaehlt);
  const fehlend = [...richtig].filter((index) => !gewaehltMenge.has(index)).length;
  const zuviel = [...gewaehltMenge].filter((index) => !richtig.has(index)).length;

  if (fehlend === 0 && zuviel === 0) {
    return { art: 'richtig', begruendung: aufloesung(aufgabe) };
  }

  /*
   * Teilweise richtig ist eine eigene Rückmeldung und nicht „falsch".
   *
   * Wer drei von vier richtigen Antworten findet und keine falsche, hat die
   * Sache im Wesentlichen verstanden. Das als schlicht falsch zu melden, wäre
   * unehrlich - und es nimmt der nächsten Rückmeldung die Aussagekraft.
   */
  if (zuviel === 0) {
    return {
      art: 'teilweise',
      begruendung:
        `Alles, was du gewählt hast, ist richtig – aber es fehlt ${fehlend === 1 ? 'noch eine' : `noch ${fehlend}`}. ` +
        aufloesung(aufgabe),
    };
  }

  if (fehlend === 0) {
    return {
      art: 'teilweise',
      begruendung:
        `Die richtigen sind alle dabei, ${zuviel === 1 ? 'eine gehört' : `${zuviel} gehören`} aber nicht dazu. ` +
        aufloesung(aufgabe),
    };
  }

  return { art: 'falsch', begruendung: aufloesung(aufgabe) };
}

// --- Reihenfolge -----------------------------------------------------------

function bewerteReihenfolge(aufgabe: BewertbareAufgabe, reihenfolge: readonly number[]): Bewertung {
  const richtig = aufgabe.nutzlast?.['richtig'];
  if (!Array.isArray(richtig) || !richtig.every((wert) => typeof wert === 'number')) {
    return { art: 'abgelehnt', begruendung: 'Zu dieser Aufgabe fehlt die Lösung im Inhalt.' };
  }

  if (reihenfolge.length !== richtig.length) {
    return { art: 'leer', begruendung: 'Bring erst alle Bausteine in eine Reihenfolge.' };
  }

  if (reihenfolge.every((wert, stelle) => wert === richtig[stelle])) {
    return { art: 'richtig', begruendung: aufloesung(aufgabe) };
  }

  /*
   * Wie viele Bausteine an der richtigen Stelle stehen, ist die einzige Zahl,
   * die hier etwas aussagt - und sie sagt es, ohne zu verraten, welche.
   */
  const treffer = reihenfolge.filter((wert, stelle) => wert === richtig[stelle]).length;
  if (treffer > 0) {
    return {
      art: 'teilweise',
      begruendung:
        `${treffer} von ${richtig.length} stehen schon an der richtigen Stelle. ` +
        aufloesung(aufgabe),
    };
  }

  return { art: 'falsch', begruendung: aufloesung(aufgabe) };
}

// --- Vorhersage ------------------------------------------------------------

function bewerteVorhersage(aufgabe: BewertbareAufgabe, wert: number): Bewertung {
  const erwartet = aufgabe.erwartetesErgebnis;
  if (!erwartet) {
    return { art: 'abgelehnt', begruendung: 'Zu dieser Aufgabe fehlt das erwartete Ergebnis.' };
  }

  if (!Number.isInteger(wert) || wert < 0) {
    return { art: 'leer', begruendung: 'Trag eine Zahl ein – null Zeilen sind auch eine Antwort.' };
  }

  const zeilen = erwartet.zeilen.length;
  if (wert === zeilen) {
    return {
      art: 'richtig',
      begruendung:
        zeilen === 0
          ? 'Genau: keine einzige Zeile. Ein leeres Ergebnis ist ein Ergebnis und kein Fehler.'
          : `Genau ${zeilen} ${zeilen === 1 ? 'Zeile' : 'Zeilen'}. Das vollständige Ergebnis steht unten.`,
    };
  }

  return {
    art: 'falsch',
    begruendung:
      `Es sind ${zeilen} ${zeilen === 1 ? 'Zeile' : 'Zeilen'}, nicht ${wert}. Sieh dir das ` +
      'Ergebnis unten an – woran hättest du die Zahl vorher ablesen können?',
  };
}

// --- Text ------------------------------------------------------------------

function bewerteText(aufgabe: BewertbareAufgabe, text: string): Bewertung {
  if (text.trim().length < 10) {
    return {
      art: 'leer',
      begruendung:
        'Schreib deine Antwort erst in eigenen Worten auf. Danach kommt die Musterantwort ' +
        'daneben – vorher gelesen, überzeugt sie dich nur davon, dass du es ohnehin gewusst hättest.',
    };
  }

  const musterantwort = aufgabe.nutzlast?.['musterantwort'];
  if (typeof musterantwort !== 'string') {
    return { art: 'abgelehnt', begruendung: 'Zu dieser Aufgabe fehlt die Musterantwort.' };
  }

  return { art: 'selbst-vergleichen', musterantwort };
}

// --- SQL -------------------------------------------------------------------

function bewerteSql(aufgabe: BewertbareAufgabe, sql: string): Bewertung {
  if (sql.trim() === '') {
    return { art: 'leer', begruendung: 'Im Editor steht noch nichts.' };
  }

  const erlaubte = aufgabe.erlaubteKlassen ?? ['SELECT'];
  const anweisungen = teileAnweisungen(sql);

  if (anweisungen.length === 0) {
    return { art: 'leer', begruendung: 'Im Editor steht nur ein Kommentar.' };
  }

  /*
   * Die Policy läuft auch ohne Übungsserver.
   *
   * Sie ist keine Sicherheitsprüfung - die Grenze sind die
   * Datenbankberechtigungen -, sondern Didaktik: Wer in einer Leselektion ein
   * UPDATE schreibt, hat die Aufgabe missverstanden und soll das sofort
   * erfahren, nicht erst, wenn irgendwann ein Server bereitsteht.
   */
  for (const anweisung of anweisungen) {
    const ergebnis = pruefeAnweisung(anweisung, erlaubte);
    if (!ergebnis.erlaubt) return { art: 'abgelehnt', begruendung: ergebnis.begruendung };
  }

  return {
    art: 'braucht-ausfuehrung',
    begruendung:
      'Deine Abfrage ist geprüft und passt zu dem, was diese Aufgabe übt. Ob sie das ' +
      'Richtige liefert, zeigt sich erst am Ergebnis – und dafür braucht es den Übungsserver, ' +
      'der auf dieser Installation noch nicht eingeschaltet ist. Es wird hier weder ein ' +
      'Ergebnis erfunden noch behauptet, die Abfrage sei richtig, weil sie richtig aussieht.',
  };
}

// --- Gemeinsames -----------------------------------------------------------

function aufloesung(aufgabe: BewertbareAufgabe): string {
  const text = aufgabe.nutzlast?.['aufloesung'];
  return typeof text === 'string' ? text : '';
}

/** `richtig` als Indexmenge – die Nutzlast erlaubt eine Zahl oder eine Liste. */
function alsIndexmenge(wert: unknown): Set<number> | null {
  if (typeof wert === 'number') return new Set([wert]);
  if (Array.isArray(wert) && wert.every((eintrag) => typeof eintrag === 'number')) {
    return new Set(wert as number[]);
  }
  return null;
}

/**
 * Wie das Urteil im Versuchsverlauf festgehalten wird.
 *
 * `null` heißt ausdrücklich: **nicht festhalten**. Ein „selbst vergleichen"
 * oder ein „braucht Ausführung" ist kein Ergebnis; es als FAILED zu speichern,
 * würde die Kompetenzwerte mit Zahlen füllen, die niemand gemessen hat.
 */
export function alsVersuchsergebnis(bewertung: Bewertung): 'PASSED' | 'PARTIAL' | 'FAILED' | null {
  switch (bewertung.art) {
    case 'richtig':
      return 'PASSED';
    case 'teilweise':
      return 'PARTIAL';
    case 'falsch':
      return 'FAILED';
    default:
      return null;
  }
}
