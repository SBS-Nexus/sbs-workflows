import type { Konzept } from './typen';

/**
 * Die Begriffe, deren Beherrschung einzeln verfolgt wird.
 *
 * Sie sind kleiner geschnitten als Lektionen: „NULL" und „Dreiwertige Logik"
 * sind zwei Konzepte, obwohl sie in derselben Lektion vorkommen. Wer das erste
 * verstanden hat und beim zweiten stolpert, soll das zweite wiederholen und
 * nicht die ganze Lektion.
 *
 * Die Schwierigkeit ist eine Einschätzung für die Reihenfolge, kein Urteil
 * über die Person. Sie steuert, was zuerst drankommt.
 */
export const KONZEPTE: readonly Konzept[] = [
  // --- Modul 1: Tabellen und Daten ----------------------------------------
  {
    slug: 'tabelle-zeile-spalte',
    titel: 'Tabelle, Zeile, Spalte',
    beschreibung:
      'Eine Zeile ist ein Ding, eine Spalte eine Eigenschaft aller Dinge. Klingt banal und ist ' +
      'die Grundlage jeder späteren Entscheidung.',
    schwierigkeit: 1,
  },
  {
    slug: 'datentyp',
    titel: 'Datentypen',
    beschreibung:
      'Was in einer Spalte stehen darf – und wie sie sich beim Vergleichen und Rechnen verhält.',
    schwierigkeit: 2,
  },
  {
    slug: 'null-bedeutung',
    titel: 'NULL',
    beschreibung:
      'Kein Wert. Nicht null, nicht leerer Text, nicht „unbekannt gleich nichts". Der häufigste ' +
      'Irrtum überhaupt.',
    schwierigkeit: 2,
  },
  {
    slug: 'dreiwertige-logik',
    titel: 'Wahr, falsch, unbekannt',
    beschreibung:
      'Ein Vergleich mit NULL ergibt weder wahr noch falsch. Deshalb greift WHERE dort nicht.',
    schwierigkeit: 3,
  },
  {
    slug: 'primaerschluessel',
    titel: 'Primärschlüssel',
    beschreibung: 'Die Spalte, die eine Zeile eindeutig benennt.',
    schwierigkeit: 1,
  },
  {
    slug: 'fremdschluessel',
    titel: 'Fremdschlüssel',
    beschreibung:
      'Ein Verweis von einer Tabelle auf eine andere. Die Stelle, an der aus Tabellen ein Modell ' +
      'wird.',
    schwierigkeit: 2,
  },
  {
    slug: 'select-grundform',
    titel: 'SELECT und FROM',
    beschreibung: 'Welche Spalten aus welcher Tabelle. Die kürzeste vollständige Abfrage.',
    schwierigkeit: 1,
  },
  {
    slug: 'alias',
    titel: 'Aliase',
    beschreibung: 'Spalten und Tabellen für die Dauer einer Abfrage umbenennen.',
    schwierigkeit: 2,
  },

  // --- Modul 2: Abfragen ---------------------------------------------------
  {
    slug: 'where-filter',
    titel: 'Zeilen auswählen mit WHERE',
    beschreibung: 'Aus allen Zeilen die herausnehmen, auf die eine Bedingung zutrifft.',
    schwierigkeit: 1,
  },
  {
    slug: 'vergleichsoperatoren',
    titel: 'Vergleichen',
    beschreibung:
      'Gleich, ungleich, größer, kleiner – und wie sich Text, Zahl und Datum dabei verhalten.',
    schwierigkeit: 2,
  },
  {
    slug: 'logische-verknuepfung',
    titel: 'AND, OR und Klammern',
    beschreibung:
      'Mehrere Bedingungen verbinden. AND bindet stärker als OR – die Stelle, an der Klammern ' +
      'über das Ergebnis entscheiden.',
    schwierigkeit: 3,
  },
  {
    slug: 'bereich-und-liste',
    titel: 'BETWEEN und IN',
    beschreibung: 'Kurzschreibweisen für „von bis" und „einer von diesen".',
    schwierigkeit: 2,
  },
  {
    slug: 'sortierung',
    titel: 'ORDER BY',
    beschreibung:
      'Ohne ORDER BY hat ein Ergebnis keine verlässliche Reihenfolge – auch wenn es zufällig ' +
      'sortiert aussieht.',
    schwierigkeit: 2,
  },
  {
    slug: 'mustersuche',
    titel: 'LIKE',
    beschreibung: 'Nach einem Textmuster suchen statt nach einem genauen Wert.',
    schwierigkeit: 2,
  },
  {
    slug: 'berechnete-spalten',
    titel: 'Rechnen im SELECT',
    beschreibung: 'Aus vorhandenen Spalten neue Werte bilden, ohne etwas zu speichern.',
    schwierigkeit: 2,
  },
  {
    slug: 'verarbeitungsreihenfolge',
    titel: 'Die Reihenfolge der Verarbeitung',
    beschreibung:
      'SQL Server arbeitet FROM, WHERE, SELECT, ORDER BY in dieser Reihenfolge ab – nicht in ' +
      'der, in der man sie schreibt. Daraus folgt das meiste, was zunächst willkürlich wirkt.',
    schwierigkeit: 4,
  },

  // --- Modul 3: Verbinden und Gruppieren -----------------------------------
  {
    slug: 'inner-join',
    titel: 'INNER JOIN',
    beschreibung:
      'Zwei Tabellen über ihre Schlüssel verbinden. Es kommen nur Zeilen, die auf beiden Seiten ' +
      'einen Partner haben.',
    schwierigkeit: 3,
  },
  {
    slug: 'join-bedingung',
    titel: 'Die ON-Bedingung',
    beschreibung:
      'Woran hängen die beiden Tabellen zusammen? Fehlt die Antwort, verbindet die Datenbank ' +
      'jede Zeile mit jeder.',
    schwierigkeit: 3,
  },
  {
    slug: 'left-join',
    titel: 'LEFT JOIN',
    beschreibung:
      'Alle Zeilen der linken Tabelle behalten – auch die ohne Gegenstück. Dort steht dann NULL.',
    schwierigkeit: 4,
  },
  {
    slug: 'aggregatfunktion',
    titel: 'Zusammenfassen',
    beschreibung: 'COUNT, SUM, AVG, MIN und MAX machen aus vielen Zeilen einen Wert.',
    schwierigkeit: 3,
  },
  {
    slug: 'count-und-null',
    titel: 'COUNT(*) und COUNT(Spalte)',
    beschreibung:
      'COUNT(*) zählt Zeilen, COUNT(Spalte) zählt Werte – und NULL ist keiner. Der Unterschied ' +
      'ist eine der häufigsten stillen Fehlerquellen.',
    schwierigkeit: 4,
  },
  {
    slug: 'gruppierung',
    titel: 'GROUP BY',
    beschreibung: 'Zeilen zu Gruppen zusammenfassen und je Gruppe rechnen.',
    schwierigkeit: 4,
  },
  {
    slug: 'having',
    titel: 'HAVING',
    beschreibung:
      'Auf Gruppen filtern statt auf Zeilen. WHERE kommt vor der Gruppierung, HAVING danach.',
    schwierigkeit: 4,
  },
  {
    slug: 'unterabfrage',
    titel: 'Unterabfragen',
    beschreibung: 'Eine Abfrage innerhalb einer Abfrage – als einzelner Wert oder als Liste.',
    schwierigkeit: 4,
  },
] as const;
