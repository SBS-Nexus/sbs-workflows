import type { Modul } from '../typen';

/**
 * Modul 1 – Tabellen und Daten.
 *
 * Vor der ersten Abfrage steht das Lesen. Wer sofort mit `SELECT` anfängt,
 * schreibt Abfragen gegen ein Modell, das er sich nur vorstellt – und sucht
 * später stundenlang Fehler, die keine Syntaxfehler sind.
 *
 * Die vier Lektionen beantworten deshalb vier Fragen in dieser Reihenfolge:
 * Was steht da? Was heißt es, wenn nichts dasteht? Woran hängen die Tabellen
 * zusammen? Und erst dann: Wie hole ich etwas heraus?
 */
export const MODUL_1: Modul = {
  slug: 'modul-tabellen-und-daten',
  titel: 'Tabellen und Daten',
  beschreibung:
    'Was in einer Tabelle steht, warum NULL nicht „leer" heißt und wie Tabellen zusammenhängen.',

  lektionen: [
    // -----------------------------------------------------------------
    {
      slug: 'lektion-was-steht-in-einer-tabelle',
      titel: 'Was in einer Tabelle steht',
      leitfrage: 'Der Chef fragt: Wie viele Kundinnen und Kunden haben wir eigentlich?',
      dauerMinuten: 12,
      datensatz: 'handwerk',
      konzepte: ['tabelle-zeile-spalte', 'datentyp'],
      lernziele: [
        'Eine Zeile als ein Ding und eine Spalte als eine Eigenschaft lesen',
        'Aus dem Datentyp ablesen, was in einer Spalte stehen kann',
        'Im Schema-Explorer finden, welche Tabelle eine Frage beantwortet',
      ],
      text: `
Eine Tabelle sieht aus wie eine Tabellenkalkulation, und für den Anfang ist
das eine brauchbare Vorstellung. Ein Unterschied ist trotzdem wichtig genug,
um ihn hier vorwegzunehmen.

**Eine Zeile ist ein Ding.** In \`Kunden\` ist jede Zeile eine Kundin oder ein
Kunde. Nicht ein Auftrag, nicht eine Rechnung – ein Kunde. Wenn du dich später
fragst, warum eine Abfrage plötzlich acht Zeilen liefert statt drei, ist die
Antwort fast immer: Du hast das Ding gewechselt, ohne es zu merken.

**Eine Spalte ist eine Eigenschaft aller Dinge in dieser Tabelle.** \`Stadt\`
gibt es für jede Kundin – auch dann, wenn dort nichts steht.

**Der Datentyp sagt, was dort stehen darf.** \`nvarchar(60)\` ist Text bis 60
Zeichen, \`int\` eine ganze Zahl, \`date\` ein Datum. Das klingt nach
Buchhaltung und entscheidet später über Stunden: Ein Datum als Text lässt sich
nicht sinnvoll sortieren, und eine Zahl als Text nicht summieren.

Sieh dir im Schema-Explorer rechts die vier Tabellen an, bevor du weiterliest.
`.trim(),
      aufgaben: [
        {
          slug: 'a-welche-tabelle-kunden',
          art: 'EINFACHAUSWAHL',
          titel: 'Welche Tabelle beantwortet die Frage?',
          aufgabenstellung:
            'Der Chef will wissen, wie viele Kundinnen und Kunden der Betrieb hat. In welcher ' +
            'Tabelle steht die Antwort?',
          nutzlast: {
            optionen: ['Kunden', 'Auftraege', 'Positionen', 'Mitarbeitende'],
            richtig: 0,
            aufloesung:
              'Jede Zeile in Kunden ist ein Kunde. Die Zahl der Zeilen ist die Zahl der Kunden. ' +
              'In Auftraege steht dieselbe Kundennummer mehrfach – dort würdest du Aufträge zählen.',
          },
          hinweise: [
            'Frag dich zuerst: Was ist hier ein „Ding"? Ein Kunde oder ein Auftrag?',
            'In welcher Tabelle steht jede Kundin genau einmal?',
          ],
          schwierigkeit: 1,
          konzepte: ['tabelle-zeile-spalte'],
        },
        {
          slug: 'a-datentyp-zuordnen',
          art: 'EINFACHAUSWAHL',
          titel: 'Was passt in Stundensatz?',
          aufgabenstellung:
            'Die Spalte Stundensatz hat den Datentyp decimal(6,2). Welcher Wert lässt sich dort ' +
            'ohne Umweg speichern?',
          nutzlast: {
            optionen: ['68.00', 'achtundsechzig Euro', '68 EUR', '2026-01-08'],
            richtig: 0,
            aufloesung:
              'decimal(6,2) ist eine Zahl mit zwei Nachkommastellen. „68 EUR" wäre Text – und ' +
              'Text lässt sich nicht addieren, ohne ihn vorher umzuwandeln.',
          },
          hinweise: [
            'decimal ist ein Zahlentyp. Was davon ist eine Zahl?',
            'Die Währung steht nicht in der Spalte. Warum wohl nicht?',
          ],
          schwierigkeit: 2,
          konzepte: ['datentyp'],
        },
        {
          slug: 'a-erste-abfrage-lesen',
          art: 'ERGEBNIS_VORHERSAGEN',
          titel: 'Wie viele Zeilen kommen heraus?',
          aufgabenstellung:
            'Die Tabelle Mitarbeitende hat vier Zeilen. Wie sieht das Ergebnis von ' +
            '`SELECT Name FROM Mitarbeitende` aus? Sag es voraus, bevor du weiterliest.',
          erwartetesErgebnis: {
            spalten: ['Name'],
            zeilen: [['Katrin Storz'], ['Tobias Renner'], ['Miriam Hoff'], ['Paul Denk']],
          },
          vergleich: { reihenfolgeZaehlt: false },
          loesungSql: 'SELECT Name FROM Mitarbeitende;',
          loesungsErklaerung:
            'Eine Spalte, vier Zeilen. Die Auswahl der Spalten ändert die Zahl der Zeilen nicht – ' +
            'das tut erst WHERE.',
          hinweise: [
            'Die Auswahl der Spalten macht das Ergebnis schmaler, nicht kürzer.',
            'Wie viele Zeilen hat die Tabelle laut Schema-Explorer?',
          ],
          schwierigkeit: 1,
          konzepte: ['tabelle-zeile-spalte', 'select-grundform'],
        },
        {
          slug: 'a-spalten-auswaehlen',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Name und Stadt',
          aufgabenstellung:
            'Schreibe eine Abfrage, die aus der Tabelle Kunden nur Name und Stadt liefert – in ' +
            'dieser Reihenfolge.',
          startSql: '-- Deine Abfrage:\n',
          loesungSql: 'SELECT Name, Stadt FROM Kunden;',
          loesungsErklaerung:
            'Die Reihenfolge im SELECT bestimmt die Reihenfolge der Spalten im Ergebnis. Sie hat ' +
            'nichts mit der Reihenfolge in der Tabelle zu tun.',
          erwartetesErgebnis: {
            spalten: ['Name', 'Stadt'],
            zeilen: [
              ['Anna Brandt', 'Mannheim'],
              ['Mehmet Kaya', 'Weinheim'],
              ['Sofia Adler', 'Mannheim'],
              ['Bäckerei Lindner', 'Heidelberg'],
              ['Jonas Brandt', 'Mannheim'],
              ['Praxis Dr. Weiß', 'Ludwigshafen'],
              ['Elif Yilmaz', null],
              ['Hausverwaltung Süd', 'Speyer'],
            ],
          },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Zwei Spalten werden durch ein Komma getrennt.',
            'Die Form ist SELECT … FROM …',
            'Achte darauf, dass Name vor Stadt steht – die Aufgabe verlangt diese Reihenfolge.',
          ],
          schwierigkeit: 1,
          konzepte: ['select-grundform', 'tabelle-zeile-spalte'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-null-heisst-nicht-leer',
      titel: 'NULL heißt nicht leer',
      leitfrage: 'Bei Elif Yilmaz steht keine Stadt. Heißt das, sie wohnt nirgends?',
      dauerMinuten: 15,
      datensatz: 'handwerk',
      konzepte: ['null-bedeutung', 'dreiwertige-logik'],
      lernziele: [
        'NULL von der leeren Zeichenfolge und von der Zahl 0 unterscheiden',
        'Verstehen, warum ein Vergleich mit NULL weder wahr noch falsch ist',
        'IS NULL statt = NULL benutzen – und sagen können, warum',
      ],
      text: `
In der Zeile von Elif Yilmaz steht bei \`Stadt\` nichts. In der Anzeige siehst
du dort **NULL** – nicht eine leere Zelle. Das ist Absicht, denn drei Dinge
sehen leer aus und sind völlig verschieden:

| Was steht da | Bedeutung |
| --- | --- |
| \`NULL\` | Es gibt keinen Wert. Niemand weiß, wo sie wohnt. |
| \`''\` | Ein Text, der aus null Zeichen besteht. Jemand hat ausdrücklich nichts eingetragen. |
| \`0\` | Die Zahl null. Ein Wert, und zwar ein sehr bestimmter. |

Der Unterschied ist keine Wortklauberei. **NULL ist kein Wert, sondern die
Abwesenheit eines Werts** – und deshalb funktioniert der Vergleich damit
anders, als man erwartet.

\`\`\`sql
WHERE Stadt = NULL      -- findet nie etwas
WHERE Stadt IS NULL     -- findet die Zeilen ohne Stadt
\`\`\`

Warum? Weil \`=\` fragt: „Ist der linke Wert gleich dem rechten?" Wenn einer
von beiden unbekannt ist, lautet die ehrliche Antwort weder ja noch nein,
sondern **unbekannt**. Und \`WHERE\` nimmt nur Zeilen, bei denen die Antwort
*wahr* ist. Unbekannt ist nicht wahr – die Zeile fällt heraus.

Das ist die dreiwertige Logik: wahr, falsch, unbekannt. Sie ist der Grund für
einen guten Teil der Abfragen, die „einfach nichts liefern".
`.trim(),
      aufgaben: [
        {
          slug: 'a-null-unterscheiden',
          art: 'EINFACHAUSWAHL',
          titel: 'Drei Arten von nichts',
          aufgabenstellung:
            'In Telefon steht bei Mehmet Kaya NULL. Was bedeutet das nach dem, was im ' +
            'Schema-Explorer zu dieser Spalte steht?',
          nutzlast: {
            optionen: [
              'Er hat keine Telefonnummer hinterlassen.',
              'Seine Telefonnummer ist die leere Zeichenfolge.',
              'Seine Telefonnummer ist 0.',
              'Die Zeile ist fehlerhaft.',
            ],
            richtig: 0,
            aufloesung:
              'NULL heißt: kein Wert vorhanden. Die Spaltenbeschreibung sagt es ausdrücklich – ' +
              'nicht „unbekannt gleich leer".',
          },
          hinweise: [
            'Sieh im Schema-Explorer nach, was zu Telefon steht.',
            'Eine leere Zeichenfolge wäre ein Wert. Ist hier einer da?',
          ],
          schwierigkeit: 2,
          konzepte: ['null-bedeutung'],
        },
        {
          slug: 'a-gleich-null-vorhersagen',
          art: 'ERGEBNIS_VORHERSAGEN',
          titel: 'Was liefert = NULL?',
          aufgabenstellung:
            'Sag voraus, was `SELECT Name FROM Kunden WHERE Stadt = NULL` liefert. Eine Kundin ' +
            'hat keine Stadt – kommt sie im Ergebnis vor?',
          erwartetesErgebnis: { spalten: ['Name'], zeilen: [] },
          vergleich: { reihenfolgeZaehlt: false },
          loesungSql: 'SELECT Name FROM Kunden WHERE Stadt = NULL;',
          loesungsErklaerung:
            'Keine einzige Zeile. Der Vergleich ergibt für jede Zeile „unbekannt", und WHERE ' +
            'nimmt nur, was wahr ist. Auch die Zeile ohne Stadt fällt heraus – gerade sie.',
          hinweise: [
            'Was ist die Antwort auf „ist unbekannt gleich unbekannt?"',
            'WHERE nimmt Zeilen, bei denen die Bedingung wahr ist. Ist „unbekannt" wahr?',
          ],
          schwierigkeit: 3,
          konzepte: ['dreiwertige-logik', 'null-bedeutung'],
        },
        {
          slug: 'a-is-null-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Wer hat keine Stadt hinterlassen?',
          aufgabenstellung:
            'Schreibe eine Abfrage, die den Namen aller Kundinnen und Kunden liefert, bei denen ' +
            'keine Stadt eingetragen ist.',
          startSql: 'SELECT Name\nFROM Kunden\nWHERE ',
          loesungSql: 'SELECT Name FROM Kunden WHERE Stadt IS NULL;',
          loesungsErklaerung:
            'IS NULL fragt nicht nach Gleichheit, sondern nach Abwesenheit. Deshalb ist es der ' +
            'einzige Weg, NULL zu finden.',
          erwartetesErgebnis: { spalten: ['Name'], zeilen: [['Elif Yilmaz']] },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Mit = kommst du hier nicht weiter – das war die Aufgabe davor.',
            'Es gibt eine eigene Schreibweise für „hat keinen Wert".',
            'Sie besteht aus zwei Wörtern und beginnt mit IS.',
          ],
          schwierigkeit: 2,
          konzepte: ['null-bedeutung'],
        },
        {
          slug: 'a-null-fehler-erklaeren',
          art: 'FEHLER_ERKLAEREN',
          titel: 'Die Abfrage liefert nichts',
          aufgabenstellung:
            'Eine Kollegin schreibt `SELECT * FROM Auftraege WHERE Abgeschlossen = NULL` und ' +
            'wundert sich, dass keine offenen Aufträge kommen – obwohl es welche gibt. Erkläre ' +
            'in einem Satz, woran es liegt.',
          nutzlast: {
            erwarteteStichworte: ['IS NULL', 'unbekannt'],
            musterantwort:
              'Der Vergleich mit = ergibt bei NULL weder wahr noch falsch, sondern unbekannt – ' +
              'und WHERE nimmt nur wahre Zeilen. Richtig wäre IS NULL.',
          },
          hinweise: [
            'Die Abfrage ist syntaktisch richtig. Es ist kein Tippfehler.',
            'Denk an die drei möglichen Antworten eines Vergleichs.',
          ],
          schwierigkeit: 3,
          konzepte: ['dreiwertige-logik', 'null-bedeutung'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-schluessel-und-beziehungen',
      titel: 'Schlüssel und Beziehungen',
      leitfrage: 'In Auftraege steht nur eine Nummer statt eines Namens. Warum eigentlich?',
      dauerMinuten: 14,
      datensatz: 'handwerk',
      konzepte: ['primaerschluessel', 'fremdschluessel'],
      lernziele: [
        'Den Primärschlüssel einer Tabelle benennen',
        'Einen Fremdschlüssel als Verweis lesen',
        'Erkennen, welche Tabellen für eine Frage zusammengehören',
      ],
      text: `
In \`Auftraege\` steht keine Kundin, sondern eine \`KundeId\`. Das sieht nach
Umweg aus und hat einen einfachen Grund: **Ein Name gehört genau einmal
gespeichert.** Stünde er in jedem Auftrag, müsste man ihn bei einer Heirat in
zwölf Zeilen ändern – und beim dreizehnten Mal übersieht ihn jemand.

Zwei Begriffe dafür:

- Der **Primärschlüssel** benennt eine Zeile eindeutig. In \`Kunden\` ist das
  \`KundeId\`. Zwei Zeilen mit derselben Nummer kann es nicht geben; die
  Datenbank lässt es nicht zu.
- Ein **Fremdschlüssel** ist ein Verweis darauf. \`Auftraege.KundeId\` zeigt
  auf \`Kunden.KundeId\`. Die Datenbank wacht darüber: Ein Auftrag für Kunde 99
  lässt sich nicht anlegen, wenn es diesen Kunden nicht gibt.

Im Schema-Explorer stehen diese Verweise unten als Sätze – genau in der Form,
die du gleich im JOIN brauchst.

Ein Fremdschlüssel darf übrigens NULL sein. \`Auftraege.MitarbeiterId\` ist so
einer: Ein Auftrag, dem noch niemand zugeteilt ist, hat dort keinen Wert. Das
ist kein Fehler, sondern eine Aussage.
`.trim(),
      aufgaben: [
        {
          slug: 'a-primaerschluessel-finden',
          art: 'EINFACHAUSWAHL',
          titel: 'Welche Spalte ist der Primärschlüssel?',
          aufgabenstellung:
            'Sieh im Schema-Explorer nach: Welche Spalte benennt eine Zeile in Positionen ' +
            'eindeutig?',
          nutzlast: {
            optionen: ['PositionId', 'AuftragId', 'Bezeichnung', 'Menge'],
            richtig: 0,
            aufloesung:
              'PositionId ist als Schlüssel gekennzeichnet. AuftragId kommt mehrfach vor – ein ' +
              'Auftrag hat schließlich mehrere Positionen.',
          },
          hinweise: [
            'Im Schema-Explorer ist eine Spalte je Tabelle mit „Schlüssel" markiert.',
            'Eine Spalte, die mehrfach denselben Wert enthält, kann keine Zeile eindeutig benennen.',
          ],
          schwierigkeit: 1,
          konzepte: ['primaerschluessel'],
        },
        {
          slug: 'a-fremdschluessel-lesen',
          art: 'EINFACHAUSWAHL',
          titel: 'Worauf zeigt AuftragId in Positionen?',
          aufgabenstellung:
            'In der Tabelle Positionen gibt es eine Spalte AuftragId. Was bedeutet ein Wert von ' +
            '6 in dieser Spalte?',
          nutzlast: {
            optionen: [
              'Die Zeile gehört zum Auftrag mit der Nummer 6.',
              'Es ist die sechste Position dieses Auftrags.',
              'Der Auftrag umfasst sechs Positionen.',
              'Die Position kostet 6 Euro.',
            ],
            richtig: 0,
            aufloesung:
              'Ein Fremdschlüssel ist ein Verweis: Die Zahl ist die Nummer der Zeile in der ' +
              'anderen Tabelle, nicht eine Zählung.',
          },
          hinweise: [
            'Der Schema-Explorer zeigt unten, worauf diese Spalte zeigt.',
            'Eine Nummer, die auf eine andere Tabelle verweist, zählt nichts.',
          ],
          schwierigkeit: 2,
          konzepte: ['fremdschluessel'],
        },
        {
          slug: 'a-welche-tabellen-fuer-frage',
          art: 'MEHRFACHAUSWAHL',
          titel: 'Welche Tabellen brauchst du?',
          aufgabenstellung:
            'Die Frage lautet: Wie heißen die Kundinnen und Kunden mit einem noch offenen ' +
            'Auftrag? Welche Tabellen enthalten die nötigen Angaben?',
          nutzlast: {
            optionen: ['Kunden', 'Auftraege', 'Positionen', 'Mitarbeitende'],
            richtig: [0, 1],
            aufloesung:
              'Der Name steht in Kunden, „offen" steht als NULL in Auftraege.Abgeschlossen. ' +
              'Positionen und Mitarbeitende beantworten hier nichts.',
          },
          hinweise: [
            'Zerleg die Frage: Woher kommt der Name? Woher kommt „offen"?',
            'Woran erkennt man in Auftraege, dass etwas noch läuft?',
          ],
          schwierigkeit: 3,
          konzepte: ['fremdschluessel', 'tabelle-zeile-spalte'],
        },
        {
          slug: 'a-offene-auftraege',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Die offenen Aufträge',
          aufgabenstellung:
            'Schreibe eine Abfrage, die Bezeichnung und Eingegangen aller Aufträge liefert, die ' +
            'noch nicht abgeschlossen sind.',
          startSql: 'SELECT Bezeichnung, Eingegangen\nFROM Auftraege\nWHERE ',
          loesungSql: 'SELECT Bezeichnung, Eingegangen FROM Auftraege WHERE Abgeschlossen IS NULL;',
          loesungsErklaerung:
            '„Noch nicht abgeschlossen" steht in den Daten als fehlender Wert. Das ist eine ' +
            'Entscheidung des Datenmodells und der Grund, warum man NULL verstehen muss, bevor ' +
            'man abfragt.',
          erwartetesErgebnis: {
            spalten: ['Bezeichnung', 'Eingegangen'],
            zeilen: [
              ['Heizung macht Geräusche', new Date('2026-03-02T00:00:00Z')],
              ['Neues Waschbecken einbauen', new Date('2026-02-25T00:00:00Z')],
              ['Thermostate tauschen', new Date('2026-03-01T00:00:00Z')],
              ['Angebot für Elektroprüfung', new Date('2026-03-10T00:00:00Z')],
            ],
          },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Woran erkennst du in den Daten, dass ein Auftrag noch läuft?',
            'Die Spalte heißt Abgeschlossen und darf NULL sein.',
            'Für „hat keinen Wert" gibt es eine eigene Schreibweise.',
          ],
          schwierigkeit: 2,
          konzepte: ['null-bedeutung', 'select-grundform'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-die-erste-eigene-abfrage',
      titel: 'Die erste eigene Abfrage',
      leitfrage: 'Wie bekomme ich genau die Spalten, die ich brauche – und mit lesbaren Namen?',
      dauerMinuten: 12,
      datensatz: 'handwerk',
      konzepte: ['select-grundform', 'alias'],
      lernziele: [
        'SELECT mit einer Spaltenliste statt mit * schreiben',
        'Spalten mit AS benennen',
        'Erkennen, wann * bequem ist und wann es schadet',
      ],
      text: `
Die kürzeste vollständige Abfrage besteht aus zwei Teilen:

\`\`\`sql
SELECT Name, Stadt
FROM Kunden;
\`\`\`

\`SELECT\` sagt, **welche Spalten**, \`FROM\` sagt, **aus welcher Tabelle**.
Mehr braucht es nicht.

Statt der Spaltenliste kann dort auch \`*\` stehen – „alle Spalten". Zum
Nachsehen ist das praktisch. In allem, was länger bestehen soll, ist es eine
schlechte Angewohnheit: Kommt später eine Spalte dazu, ändert sich das
Ergebnis deiner Abfrage, ohne dass jemand sie angefasst hat.

Mit \`AS\` bekommt eine Spalte im Ergebnis einen anderen Namen:

\`\`\`sql
SELECT Name AS Kundin, KundeSeit AS [Kunde seit]
FROM Kunden;
\`\`\`

Die eckigen Klammern braucht es, weil im Namen ein Leerzeichen steht. Das ist
T-SQL-Schreibweise; andere Datenbanken benutzen dafür Anführungszeichen.

Wichtig: Der Alias gilt nur für diese eine Abfrage. In der Tabelle heißt die
Spalte weiterhin \`KundeSeit\`.
`.trim(),
      aufgaben: [
        {
          slug: 'a-stern-oder-liste',
          art: 'EINFACHAUSWAHL',
          titel: 'Warum nicht immer SELECT *?',
          aufgabenstellung:
            'Was spricht dagegen, in einer Abfrage, die dauerhaft in einem Bericht läuft, ' +
            'SELECT * zu schreiben?',
          nutzlast: {
            optionen: [
              'Kommt später eine Spalte dazu, ändert sich das Ergebnis unbemerkt.',
              'SELECT * ist in T-SQL nicht erlaubt.',
              'SELECT * liefert immer alle Zeilen, auch mit WHERE.',
              'SELECT * sortiert das Ergebnis zufällig.',
            ],
            richtig: 0,
            aufloesung:
              'Der Bericht bekäme eine Spalte mehr, ohne dass jemand die Abfrage geändert hat. ' +
              'Zum schnellen Nachsehen bleibt * trotzdem nützlich.',
          },
          hinweise: [
            'Denk daran, was passiert, wenn jemand die Tabelle erweitert.',
            'Die Abfrage steht in einem Bericht und wird über Monate nicht angefasst.',
          ],
          schwierigkeit: 2,
          konzepte: ['select-grundform'],
        },
        {
          slug: 'a-alias-vorhersagen',
          art: 'ERGEBNIS_VORHERSAGEN',
          titel: 'Wie heißt die Spalte im Ergebnis?',
          aufgabenstellung:
            'Sag voraus, wie die Spaltenüberschrift von ' +
            '`SELECT Gewerk AS Fachbereich FROM Mitarbeitende` lautet und wie viele Zeilen kommen.',
          erwartetesErgebnis: {
            spalten: ['Fachbereich'],
            zeilen: [['Elektro'], ['Sanitär'], ['Elektro'], ['Heizung']],
          },
          vergleich: { reihenfolgeZaehlt: false, spaltennamenZaehlen: true },
          loesungSql: 'SELECT Gewerk AS Fachbereich FROM Mitarbeitende;',
          loesungsErklaerung:
            'Die Überschrift ist der Alias, nicht der Spaltenname. Und „Elektro" kommt zweimal ' +
            'vor – ein Alias fasst nichts zusammen.',
          hinweise: [
            'AS ändert die Überschrift. Ändert es auch die Zeilen?',
            'Zwei Mitarbeitende haben dasselbe Gewerk. Kommen beide vor?',
          ],
          schwierigkeit: 2,
          konzepte: ['alias'],
        },
        {
          slug: 'a-alias-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Eine Liste für den Aushang',
          aufgabenstellung:
            'Schreibe eine Abfrage, die aus Mitarbeitende den Namen als „Mitarbeiterin" und das ' +
            'Gewerk als „Bereich" liefert.',
          startSql: 'SELECT \nFROM Mitarbeitende;',
          loesungSql: 'SELECT Name AS Mitarbeiterin, Gewerk AS Bereich FROM Mitarbeitende;',
          loesungsErklaerung:
            'Zwei Aliase, ein Komma dazwischen. Beide Namen kommen ohne Leerzeichen aus und ' +
            'brauchen deshalb keine eckigen Klammern.',
          erwartetesErgebnis: {
            spalten: ['Mitarbeiterin', 'Bereich'],
            zeilen: [
              ['Katrin Storz', 'Elektro'],
              ['Tobias Renner', 'Sanitär'],
              ['Miriam Hoff', 'Elektro'],
              ['Paul Denk', 'Heizung'],
            ],
          },
          vergleich: { reihenfolgeZaehlt: false, spaltennamenZaehlen: true },
          hinweise: [
            'Ein Alias steht hinter der Spalte, mit AS dazwischen.',
            'Zwei Spalten trennt ein Komma.',
          ],
          schwierigkeit: 2,
          konzepte: ['alias', 'select-grundform'],
        },
        {
          slug: 'a-fehler-finden-komma',
          art: 'FEHLER_FINDEN',
          titel: 'Was stimmt hier nicht?',
          aufgabenstellung:
            'Diese Abfrage bricht mit einer Fehlermeldung ab: ' +
            '`SELECT Name Stadt FROM Kunden`. Finde den Fehler und schreibe sie richtig.',
          startSql: 'SELECT Name Stadt FROM Kunden;',
          loesungSql: 'SELECT Name, Stadt FROM Kunden;',
          loesungsErklaerung:
            'Ohne Komma liest SQL Server „Stadt" als Alias für Name – die Abfrage liefert dann ' +
            'eine Spalte mit falscher Überschrift statt zwei Spalten. Genau deshalb ist dieser ' +
            'Fehler tückisch: Er führt nicht immer zu einer Fehlermeldung.',
          erwartetesErgebnis: {
            spalten: ['Name', 'Stadt'],
            zeilen: [
              ['Anna Brandt', 'Mannheim'],
              ['Mehmet Kaya', 'Weinheim'],
              ['Sofia Adler', 'Mannheim'],
              ['Bäckerei Lindner', 'Heidelberg'],
              ['Jonas Brandt', 'Mannheim'],
              ['Praxis Dr. Weiß', 'Ludwigshafen'],
              ['Elif Yilmaz', null],
              ['Hausverwaltung Süd', 'Speyer'],
            ],
          },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Zähl nach, wie viele Spalten die Abfrage liefern soll.',
            'Zwischen zwei Spalten gehört ein Zeichen, das hier fehlt.',
          ],
          schwierigkeit: 1,
          konzepte: ['select-grundform', 'alias'],
        },
      ],
    },
  ],
};
