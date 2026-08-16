import type { Modul } from '../typen';

/**
 * Modul 3 – Verbinden und Gruppieren.
 *
 * Das Modul, an dem die meisten aussteigen, bekommt den meisten Platz. Zwei
 * Stellen sind dabei besonders bewusst gesetzt:
 *
 * Der LEFT JOIN steht in einer **eigenen** Lektion und nicht als Fußnote beim
 * INNER JOIN. Der Unterschied ist keine Schreibvariante, sondern eine andere
 * Frage an die Daten – und er fällt nur auf, wenn jemand ohne Gegenstück in
 * den Daten steckt. Genau dafür gibt es Elif Yilmaz.
 *
 * `COUNT(*)` gegen `COUNT(Spalte)` bekommt eine eigene Aufgabe. Beide laufen
 * fehlerfrei und liefern verschiedene Zahlen; wer das nicht weiß, hat
 * irgendwann eine Auswertung, die um ein paar Prozent danebenliegt, ohne dass
 * jemals eine Fehlermeldung erschien.
 */
export const MODUL_3: Modul = {
  slug: 'modul-verbinden-und-gruppieren',
  titel: 'Verbinden und Gruppieren',
  beschreibung:
    'Mehrere Tabellen zusammenführen und aus vielen Zeilen aussagekräftige Zahlen machen.',

  lektionen: [
    // -----------------------------------------------------------------
    {
      slug: 'lektion-zwei-tabellen-verbinden',
      titel: 'Zwei Tabellen verbinden',
      leitfrage: 'Welcher Auftrag gehört zu welcher Kundin – wenn dort nur eine Nummer steht?',
      dauerMinuten: 18,
      datensatz: 'handwerk',
      konzepte: ['inner-join', 'join-bedingung'],
      lernziele: [
        'Zwei Tabellen mit INNER JOIN über ihre Schlüssel verbinden',
        'Die ON-Bedingung aus dem Schema-Explorer ablesen',
        'Erkennen, was passiert, wenn die ON-Bedingung fehlt',
      ],
      text: `
In \`Auftraege\` steht nur eine \`KundeId\`. Um den Namen dazu zu bekommen,
verbindet man beide Tabellen:

\`\`\`sql
SELECT k.Name, a.Bezeichnung
FROM Auftraege AS a
INNER JOIN Kunden AS k ON a.KundeId = k.KundeId;
\`\`\`

Drei Dinge stecken darin:

- **Tabellenaliase.** \`AS a\` und \`AS k\` sind Kurznamen für die Dauer der
  Abfrage. Sobald zwei Tabellen im Spiel sind, gibt es Spalten, die in beiden
  vorkommen – \`KundeId\` zum Beispiel. Ohne Alias wüsste SQL Server nicht,
  welche gemeint ist, und meldet Fehler 209.
- **Die ON-Bedingung** sagt, woran die Tabellen zusammenhängen. Sie steht im
  Schema-Explorer unten als Satz: „Auftraege zeigt über KundeId auf Kunden".
- **INNER** heißt: Es kommen nur Zeilen, die auf **beiden** Seiten einen
  Partner haben. Eine Kundin ohne Auftrag taucht nicht auf.

**Was ohne ON passiert**, ist der Grund für das Zeitlimit auf dieser
Plattform: Die Datenbank verbindet dann jede Zeile mit jeder. Aus 8 Kunden und
12 Aufträgen werden 96 Zeilen – bei echten Tabellen mit Millionen Zeilen
entsprechend mehr. Die Abfrage ist nicht falsch geschrieben; sie tut genau
das, was dasteht.
`.trim(),
      aufgaben: [
        {
          slug: 'a-join-lesen',
          art: 'EINFACHAUSWAHL',
          titel: 'Woran hängen die Tabellen?',
          aufgabenstellung:
            'Du willst zu jeder Position die Bezeichnung des zugehörigen Auftrags. Wie lautet die ' +
            'ON-Bedingung?',
          nutzlast: {
            optionen: [
              'ON p.AuftragId = a.AuftragId',
              'ON p.PositionId = a.AuftragId',
              'ON p.Bezeichnung = a.Bezeichnung',
              'ON p.AuftragId = a.KundeId',
            ],
            richtig: 0,
            aufloesung:
              'Der Fremdschlüssel Positionen.AuftragId zeigt auf Auftraege.AuftragId. Beide ' +
              'Tabellen haben eine Spalte Bezeichnung – die verbindet aber nichts, sie heißt nur ' +
              'zufällig gleich.',
          },
          hinweise: [
            'Der Schema-Explorer nennt die Beziehung unten als Satz.',
            'Zwei Spalten mit demselben Namen sind noch keine Beziehung.',
          ],
          schwierigkeit: 3,
          konzepte: ['join-bedingung', 'fremdschluessel'],
        },
        {
          slug: 'a-join-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Auftrag mit Kundenname',
          aufgabenstellung:
            'Schreibe eine Abfrage, die zu jedem Auftrag den Namen der Kundin und die ' +
            'Bezeichnung liefert.',
          startSql: 'SELECT k.Name, a.Bezeichnung\nFROM Auftraege AS a\n',
          loesungSql:
            'SELECT k.Name, a.Bezeichnung FROM Auftraege AS a INNER JOIN Kunden AS k ON a.KundeId = k.KundeId;',
          loesungsErklaerung:
            'Die ON-Bedingung verbindet den Fremdschlüssel mit dem Primärschlüssel. Ohne sie ' +
            'käme jede Zeile mit jeder – 96 statt 12.',
          hinweise: [
            'Nach FROM folgt INNER JOIN mit der zweiten Tabelle.',
            'Dahinter steht ON und die Bedingung.',
            'Welche Spalte in Auftraege zeigt auf Kunden?',
          ],
          schwierigkeit: 3,
          konzepte: ['inner-join', 'join-bedingung'],
        },
        {
          slug: 'a-join-ohne-on',
          art: 'FREITEXT',
          titel: 'Wie viele Zeilen ohne ON?',
          aufgabenstellung:
            'Die Tabelle Kunden hat 8 Zeilen, Mitarbeitende hat 4. Wie viele Zeilen liefert ' +
            '`SELECT k.Name, m.Name FROM Kunden AS k CROSS JOIN Mitarbeitende AS m`? Nenn die ' +
            'Zahl und sag, wie sie zustande kommt.',
          nutzlast: {
            erwarteteStichworte: ['32', 'jede mit jeder'],
            musterantwort:
              '32 Zeilen – jede der 8 Kundenzeilen wird mit jeder der 4 Mitarbeiterzeilen ' +
              'kombiniert. Genau das passiert auch bei einem JOIN, dessen ON-Bedingung fehlt.',
          },
          hinweise: [
            'Es wird nichts weggelassen und nichts zugeordnet.',
            'Rechne: Wie viele Kombinationen gibt es aus 8 und 4?',
          ],
          schwierigkeit: 3,
          konzepte: ['join-bedingung'],
        },
        {
          slug: 'a-join-mehrdeutig',
          art: 'FEHLER_ERKLAEREN',
          titel: 'Mehrdeutiger Spaltenname',
          aufgabenstellung:
            'Die Abfrage `SELECT Name FROM Auftraege AS a INNER JOIN Kunden AS k ON a.KundeId = k.KundeId` ' +
            "bricht mit „Ambiguous column name 'Name'\" ab, obwohl es in Auftraege gar keine " +
            'Spalte Name gibt. Erkläre, was SQL Server hier meint.',
          nutzlast: {
            erwarteteStichworte: ['Alias', 'welche Tabelle'],
            musterantwort:
              'Nach dem JOIN stehen die Spalten beider Tabellen zur Verfügung. SQL Server prüft ' +
              'nicht, ob der Name nur einmal vorkommt, sondern verlangt Eindeutigkeit – hier ' +
              'kommt Name in Kunden und in Mitarbeitende vor, sobald man weiter verbindet. ' +
              'Richtig ist k.Name.',
          },
          hinweise: [
            'Es ist kein Tippfehler und keine fehlende Tabelle.',
            'Was fehlt vor dem Spaltennamen?',
          ],
          schwierigkeit: 3,
          konzepte: ['inner-join', 'alias'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-auch-die-ohne-gegenstueck',
      titel: 'Auch die ohne Gegenstück',
      leitfrage: 'Welche Kundinnen und Kunden haben noch nie etwas beauftragt?',
      dauerMinuten: 17,
      datensatz: 'handwerk',
      konzepte: ['left-join'],
      lernziele: [
        'Mit LEFT JOIN alle Zeilen der linken Tabelle behalten',
        'NULL im Ergebnis als „kein Partner gefunden" lesen',
        'Mit LEFT JOIN und IS NULL gezielt die ohne Gegenstück finden',
      ],
      text: `
Der INNER JOIN aus der letzten Lektion hat eine Eigenschaft, die man leicht
übersieht: **Er lässt weg.** Wer keinen Partner hat, kommt nicht vor. Für die
Frage „welche Kundin hat noch nie etwas beauftragt" ist das genau die falsche
Antwort – die Gesuchten sind ja gerade die, die fehlen.

\`\`\`sql
SELECT k.Name, a.Bezeichnung
FROM Kunden AS k
LEFT JOIN Auftraege AS a ON a.KundeId = k.KundeId;
\`\`\`

**LEFT** heißt: Alle Zeilen der linken Tabelle – der aus dem \`FROM\` – bleiben
erhalten. Wo es keinen Partner gibt, stehen in den Spalten der rechten Tabelle
**NULL**.

Damit lässt sich die Frage beantworten:

\`\`\`sql
SELECT k.Name
FROM Kunden AS k
LEFT JOIN Auftraege AS a ON a.KundeId = k.KundeId
WHERE a.AuftragId IS NULL;
\`\`\`

Die letzte Zeile ist der Kniff: Wenn es keinen Auftrag gab, ist auch dessen
Primärschlüssel NULL. Ein Primärschlüssel ist sonst nie NULL – deshalb ist er
hier das verlässliche Merkmal.

**Eine Falle**, die regelmäßig zuschlägt: Eine Bedingung auf die rechte
Tabelle im \`WHERE\` macht aus dem LEFT JOIN wieder einen INNER JOIN. Denn die
Zeilen ohne Partner haben dort NULL, und NULL erfüllt keine Bedingung.
Bedingungen auf die rechte Tabelle gehören ins \`ON\`, nicht ins \`WHERE\`.
`.trim(),
      aufgaben: [
        {
          slug: 'a-left-join-verstehen',
          art: 'EINFACHAUSWAHL',
          titel: 'Wie viele Zeilen liefert der LEFT JOIN?',
          aufgabenstellung:
            'Es gibt 8 Kundinnen und Kunden und 12 Aufträge; eine Person hat keinen Auftrag. Wie ' +
            'viele Zeilen liefert `FROM Kunden LEFT JOIN Auftraege`?',
          nutzlast: {
            optionen: [
              '13 – die 12 Aufträge plus die Person ohne Auftrag',
              '12 – für jeden Auftrag eine',
              '8 – für jede Kundin eine',
              '20 – alle Zeilen beider Tabellen',
            ],
            richtig: 0,
            aufloesung:
              'Jeder Auftrag ergibt eine Zeile, und die Person ohne Auftrag kommt mit NULL dazu. ' +
              'Ein LEFT JOIN liefert also mehr Zeilen als die linke Tabelle hat, wenn dort ' +
              'jemand mehrere Partner hat.',
          },
          hinweise: [
            'Eine Kundin mit drei Aufträgen erscheint dreimal.',
            'Und was ist mit der, die keinen hat – fällt sie heraus?',
          ],
          schwierigkeit: 4,
          konzepte: ['left-join'],
        },
        {
          slug: 'a-left-join-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Wer hat noch nie beauftragt?',
          aufgabenstellung:
            'Schreibe eine Abfrage, die den Namen aller Kundinnen und Kunden liefert, zu denen es ' +
            'keinen einzigen Auftrag gibt.',
          startSql: 'SELECT k.Name\nFROM Kunden AS k\n',
          loesungSql:
            'SELECT k.Name FROM Kunden AS k LEFT JOIN Auftraege AS a ON a.KundeId = k.KundeId WHERE a.AuftragId IS NULL;',
          loesungsErklaerung:
            'Der LEFT JOIN behält alle Kundinnen, das IS NULL auf den Primärschlüssel der ' +
            'rechten Tabelle behält nur die ohne Partner. Ein Primärschlüssel ist sonst nie ' +
            'NULL – deshalb ist er hier das verlässliche Merkmal.',
          erwartetesErgebnis: { spalten: ['Name'], zeilen: [['Elif Yilmaz']] },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Zuerst alle Kundinnen behalten – welche Art von JOIN tut das?',
            'Woran erkennst du im Ergebnis, dass es keinen Auftrag gab?',
            'Der Primärschlüssel der rechten Tabelle ist nur dann NULL, wenn kein Partner da war.',
          ],
          schwierigkeit: 4,
          konzepte: ['left-join', 'null-bedeutung'],
        },
        {
          slug: 'a-left-join-falle',
          art: 'FREITEXT',
          titel: 'Der LEFT JOIN, der keiner mehr ist',
          aufgabenstellung:
            'Was ändert sich, wenn man an die Abfrage `FROM Kunden AS k LEFT JOIN Auftraege AS a ' +
            'ON a.KundeId = k.KundeId` die Zeile `WHERE a.Abgeschlossen IS NOT NULL` anhängt? ' +
            'Kommt Elif Yilmaz noch vor?',
          nutzlast: {
            erwarteteStichworte: ['nein', 'INNER'],
            musterantwort:
              'Nein. Ihre Zeile hat in allen Spalten von Auftraege NULL, und NULL erfüllt die ' +
              'Bedingung nicht. Der LEFT JOIN verhält sich damit wie ein INNER JOIN – deshalb ' +
              'gehören Bedingungen auf die rechte Tabelle ins ON.',
          },
          hinweise: [
            'Welche Werte stehen bei Elif Yilmaz in den Spalten aus Auftraege?',
            'Erfüllt NULL die Bedingung IS NOT NULL?',
          ],
          schwierigkeit: 5,
          konzepte: ['left-join', 'dreiwertige-logik'],
        },
        {
          slug: 'a-left-join-nicht-zugeteilt',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Aufträge ohne Zuständige',
          aufgabenstellung:
            'Schreibe eine Abfrage, die Bezeichnung aller Aufträge liefert, denen noch niemand ' +
            'zugeteilt ist. Die Spalte MitarbeiterId darf NULL sein.',
          startSql: 'SELECT Bezeichnung\nFROM Auftraege\nWHERE ',
          loesungSql: 'SELECT Bezeichnung FROM Auftraege WHERE MitarbeiterId IS NULL;',
          loesungsErklaerung:
            'Hier braucht es gar keinen JOIN: Die Auskunft steht schon in Auftraege. Wer die ' +
            'Frage sofort mit einem JOIN beantwortet, macht die Abfrage unnötig langsam.',
          erwartetesErgebnis: {
            spalten: ['Bezeichnung'],
            zeilen: [['Heizung macht Geräusche'], ['Angebot für Elektroprüfung']],
          },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Steht die nötige Auskunft schon in einer einzigen Tabelle?',
            'Ein JOIN ist nur nötig, wenn Angaben aus zwei Tabellen zusammenkommen.',
          ],
          schwierigkeit: 3,
          konzepte: ['null-bedeutung', 'where-filter'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-zusammenfassen',
      titel: 'Aus vielen Zeilen eine Zahl',
      leitfrage: 'Wie viele Aufträge hat jede Kundin – und was kostet ein Auftrag im Schnitt?',
      dauerMinuten: 18,
      datensatz: 'handwerk',
      konzepte: ['aggregatfunktion', 'gruppierung', 'count-und-null'],
      lernziele: [
        'Mit COUNT, SUM, AVG, MIN und MAX rechnen',
        'Mit GROUP BY je Gruppe statt über alles rechnen',
        'COUNT(*) von COUNT(Spalte) unterscheiden',
      ],
      text: `
Aggregatfunktionen machen aus vielen Zeilen einen Wert:

\`\`\`sql
SELECT COUNT(*) AS Anzahl, AVG(Stundensatz) AS Schnitt
FROM Mitarbeitende;
\`\`\`

Mit \`GROUP BY\` rechnet man nicht über alles, sondern je Gruppe:

\`\`\`sql
SELECT Gewerk, COUNT(*) AS Anzahl
FROM Mitarbeitende
GROUP BY Gewerk;
\`\`\`

**Jede Spalte im SELECT muss entweder im GROUP BY stehen oder in einer
Aggregatfunktion.** Sonst kommt Fehler 8120 – und die Meldung ist berechtigt:
Wenn eine Gruppe drei Zeilen umfasst, welchen der drei Namen sollte SQL Server
anzeigen?

**\`COUNT(*)\` und \`COUNT(Spalte)\` sind nicht dasselbe.** Das ist die
wichtigste Zeile dieser Lektion:

- \`COUNT(*)\` zählt **Zeilen**.
- \`COUNT(Telefon)\` zählt **Werte** – und NULL ist keiner.

Bei acht Kundinnen, von denen zwei keine Telefonnummer hinterlassen haben,
liefert das eine 8 und das andere 6. Beide Abfragen laufen fehlerfrei. Wer den
Unterschied nicht kennt, hat irgendwann eine Auswertung, die um ein paar
Prozent danebenliegt, ohne dass je eine Fehlermeldung erschien.

Dasselbe gilt für \`AVG\`: Der Durchschnitt lässt NULL-Zeilen einfach weg,
statt sie als Null mitzuzählen. Meistens ist das richtig – aber man sollte
wissen, dass es passiert.
`.trim(),
      aufgaben: [
        {
          slug: 'a-count-stern-vs-spalte',
          art: 'EINFACHAUSWAHL',
          titel: 'Zwei Zahlen aus derselben Tabelle',
          aufgabenstellung:
            'Von acht Kundinnen und Kunden haben zwei keine Telefonnummer hinterlassen. Was ' +
            'liefert `SELECT COUNT(*), COUNT(Telefon) FROM Kunden`?',
          nutzlast: {
            optionen: ['8 und 6', '8 und 8', '6 und 6', '8 und 2'],
            richtig: 0,
            aufloesung:
              'COUNT(*) zählt Zeilen, COUNT(Telefon) zählt Werte – NULL ist keiner. Beide ' +
              'Abfragen laufen fehlerfrei; nur die Zahlen sind verschieden.',
          },
          hinweise: [
            'Was genau zählt der Stern?',
            'Zählt COUNT eine Zelle mit, in der NULL steht?',
          ],
          schwierigkeit: 4,
          konzepte: ['count-und-null', 'aggregatfunktion'],
        },
        {
          slug: 'a-group-by-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Wie viele je Gewerk?',
          aufgabenstellung:
            'Schreibe eine Abfrage, die je Gewerk die Zahl der Mitarbeitenden liefert. Die Spalte ' +
            'mit der Anzahl soll „Anzahl" heißen.',
          startSql: 'SELECT Gewerk, \nFROM Mitarbeitende\n',
          loesungSql: 'SELECT Gewerk, COUNT(*) AS Anzahl FROM Mitarbeitende GROUP BY Gewerk;',
          loesungsErklaerung:
            'Gewerk steht im GROUP BY, die Anzahl entsteht aus einer Aggregatfunktion. Beide ' +
            'Bedingungen sind erfüllt – deshalb kein Fehler 8120.',
          erwartetesErgebnis: {
            spalten: ['Gewerk', 'Anzahl'],
            zeilen: [
              ['Elektro', 2],
              ['Heizung', 1],
              ['Sanitär', 1],
            ],
          },
          vergleich: { reihenfolgeZaehlt: false, spaltennamenZaehlen: true },
          hinweise: [
            'Gezählt wird mit COUNT.',
            'Damit je Gewerk gezählt wird, braucht es GROUP BY.',
            'Die neue Spalte bekommt mit AS ihren Namen.',
          ],
          schwierigkeit: 3,
          konzepte: ['gruppierung', 'aggregatfunktion'],
        },
        {
          slug: 'a-fehler-8120',
          art: 'FEHLER_ERKLAEREN',
          titel: 'Spalte ist ungültig im select list',
          aufgabenstellung:
            'Die Abfrage `SELECT Name, Gewerk, COUNT(*) FROM Mitarbeitende GROUP BY Gewerk` ' +
            'bricht mit Fehler 8120 ab und nennt die Spalte Name. Erkläre, warum die Meldung ' +
            'berechtigt ist.',
          nutzlast: {
            erwarteteStichworte: ['Gruppe', 'welchen Wert'],
            musterantwort:
              'Die Gruppe „Elektro" umfasst zwei Zeilen mit verschiedenen Namen. SQL Server ' +
              'müsste sich für einen entscheiden – und das kann es nicht. Entweder gehört Name ' +
              'ins GROUP BY oder in eine Aggregatfunktion.',
          },
          hinweise: [
            'Wie viele Mitarbeitende hat die Gruppe Elektro?',
            'Welchen der beiden Namen sollte die Zeile anzeigen?',
          ],
          schwierigkeit: 4,
          konzepte: ['gruppierung'],
        },
        {
          slug: 'a-summe-je-auftrag',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Was kostet jeder Auftrag?',
          aufgabenstellung:
            'Schreibe eine Abfrage, die je AuftragId die Summe aus Menge mal Einzelpreis als ' +
            '„Gesamt" liefert.',
          startSql: 'SELECT AuftragId, \nFROM Positionen\n',
          loesungSql:
            'SELECT AuftragId, SUM(Menge * Einzelpreis) AS Gesamt FROM Positionen GROUP BY AuftragId;',
          loesungsErklaerung:
            'Gerechnet wird je Zeile, summiert wird je Gruppe. Die Klammer um die Rechnung ist ' +
            'wichtig: SUM(Menge) * Einzelpreis wäre etwas ganz anderes und liefe trotzdem.',
          hinweise: [
            'Zuerst je Zeile rechnen, dann summieren.',
            'Die Rechnung gehört in die Klammer von SUM.',
            'Gruppiert wird nach der Auftragsnummer.',
          ],
          schwierigkeit: 4,
          konzepte: ['aggregatfunktion', 'gruppierung', 'berechnete-spalten'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-auf-gruppen-filtern',
      titel: 'Auf Gruppen filtern',
      leitfrage: 'Welche Kundinnen haben mehr als zwei Aufträge – und wie frage ich das?',
      dauerMinuten: 16,
      datensatz: 'handwerk',
      konzepte: ['having', 'unterabfrage'],
      lernziele: [
        'HAVING von WHERE unterscheiden und beide richtig einsetzen',
        'Eine Unterabfrage als einzelnen Wert benutzen',
        'Erkennen, wann eine Unterabfrage besser ein JOIN wäre',
      ],
      text: `
\`WHERE\` filtert Zeilen, **bevor** gruppiert wird. \`HAVING\` filtert Gruppen,
**nachdem** gerechnet wurde. Das folgt direkt aus der Verarbeitungsreihenfolge
aus Modul 2, die hier um zwei Schritte länger wird:

\`\`\`
FROM      Welche Tabellen?
WHERE     Welche Zeilen davon?
GROUP BY  Zu welchen Gruppen?
HAVING    Welche Gruppen davon?
SELECT    Welche Spalten?
ORDER BY  In welcher Reihenfolge?
\`\`\`

\`\`\`sql
SELECT KundeId, COUNT(*) AS Anzahl
FROM Auftraege
GROUP BY KundeId
HAVING COUNT(*) > 2;
\`\`\`

Warum nicht \`WHERE COUNT(*) > 2\`? Weil WHERE vor der Gruppierung läuft – zu
diesem Zeitpunkt gibt es noch keine Gruppen und damit auch keine Anzahl.

Beides zusammen ist erlaubt und oft richtig:

\`\`\`sql
WHERE Abgeschlossen IS NOT NULL   -- nur erledigte Aufträge betrachten
GROUP BY KundeId
HAVING COUNT(*) > 2               -- davon die mit mehr als zwei
\`\`\`

**Unterabfragen** sind Abfragen innerhalb einer Abfrage:

\`\`\`sql
SELECT Name, Stundensatz
FROM Mitarbeitende
WHERE Stundensatz > (SELECT AVG(Stundensatz) FROM Mitarbeitende);
\`\`\`

Die innere Abfrage liefert genau einen Wert. Liefert sie mehrere, kommt
Fehler 512 – dann braucht es \`IN\` statt \`=\`, oder besser einen JOIN.
`.trim(),
      aufgaben: [
        {
          slug: 'a-having-vs-where',
          art: 'EINFACHAUSWAHL',
          titel: 'WHERE oder HAVING?',
          aufgabenstellung:
            'Du willst je Kundin die Zahl der abgeschlossenen Aufträge, aber nur für Kundinnen mit ' +
            'mehr als einem. Wohin gehört welche Bedingung?',
          nutzlast: {
            optionen: [
              '„abgeschlossen" ins WHERE, „mehr als einer" ins HAVING',
              'Beides ins WHERE',
              'Beides ins HAVING',
              '„abgeschlossen" ins HAVING, „mehr als einer" ins WHERE',
            ],
            richtig: 0,
            aufloesung:
              'Die erste Bedingung betrifft einzelne Zeilen und wirkt vor der Gruppierung. Die ' +
              'zweite betrifft eine gerechnete Zahl und kann erst danach greifen.',
          },
          hinweise: [
            'Welche Bedingung lässt sich für eine einzelne Zeile beantworten?',
            'Welche braucht erst das Ergebnis der Gruppierung?',
          ],
          schwierigkeit: 4,
          konzepte: ['having', 'verarbeitungsreihenfolge'],
        },
        {
          slug: 'a-having-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Kundinnen mit mehr als zwei Aufträgen',
          aufgabenstellung:
            'Schreibe eine Abfrage, die KundeId und die Zahl der Aufträge als „Anzahl" liefert – ' +
            'aber nur für Kundinnen und Kunden mit mehr als zwei Aufträgen.',
          startSql: 'SELECT KundeId, COUNT(*) AS Anzahl\nFROM Auftraege\nGROUP BY KundeId\n',
          loesungSql:
            'SELECT KundeId, COUNT(*) AS Anzahl FROM Auftraege GROUP BY KundeId HAVING COUNT(*) > 2;',
          loesungsErklaerung:
            'HAVING steht hinter GROUP BY und darf mit Aggregatfunktionen rechnen. In manchen ' +
            'Datenbanken ginge auch der Alias – in T-SQL nicht, weil SELECT erst danach kommt.',
          erwartetesErgebnis: {
            spalten: ['KundeId', 'Anzahl'],
            zeilen: [
              [4, 3],
              [6, 3],
              [8, 3],
            ],
          },
          vergleich: { reihenfolgeZaehlt: false, spaltennamenZaehlen: true },
          hinweise: [
            'Die Bedingung betrifft eine gerechnete Zahl.',
            'Sie gehört hinter GROUP BY.',
            'In der Bedingung steht die Funktion noch einmal, nicht der Alias.',
          ],
          schwierigkeit: 4,
          konzepte: ['having', 'gruppierung'],
        },
        {
          slug: 'a-unterabfrage-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Über dem Durchschnitt',
          aufgabenstellung:
            'Schreibe eine Abfrage, die Name und Stundensatz aller Mitarbeitenden liefert, deren ' +
            'Stundensatz über dem Durchschnitt aller Mitarbeitenden liegt.',
          startSql: 'SELECT Name, Stundensatz\nFROM Mitarbeitende\nWHERE Stundensatz > ',
          loesungSql:
            'SELECT Name, Stundensatz FROM Mitarbeitende WHERE Stundensatz > (SELECT AVG(Stundensatz) FROM Mitarbeitende);',
          loesungsErklaerung:
            'Die innere Abfrage liefert einen einzelnen Wert. Ohne Unterabfrage müsste man den ' +
            'Durchschnitt erst ausrechnen und dann von Hand eintragen – und die Abfrage stimmte ' +
            'ab dem nächsten neuen Mitarbeiter nicht mehr.',
          hinweise: [
            'Der Durchschnitt lässt sich mit AVG berechnen.',
            'Eine Abfrage darf in Klammern innerhalb einer anderen stehen.',
            'Die innere Abfrage muss genau einen Wert liefern.',
          ],
          schwierigkeit: 4,
          konzepte: ['unterabfrage', 'aggregatfunktion'],
        },
        {
          slug: 'a-unterabfrage-fehler-512',
          art: 'FEHLER_ERKLAEREN',
          titel: 'Subquery returned more than 1 value',
          aufgabenstellung:
            "Die Abfrage `SELECT Bezeichnung FROM Auftraege WHERE KundeId = (SELECT KundeId FROM Kunden WHERE Stadt = 'Mannheim')` " +
            'bricht mit Fehler 512 ab. Erkläre, was schiefgeht und wie man es behebt.',
          nutzlast: {
            erwarteteStichworte: ['mehrere', 'IN'],
            musterantwort:
              'Drei Kundinnen wohnen in Mannheim, die innere Abfrage liefert also drei Werte. An ' +
              'dieser Stelle wird genau einer erwartet. Mit IN statt = geht es – oder mit einem ' +
              'JOIN, der hier ohnehin lesbarer wäre.',
          },
          hinweise: [
            'Führ die innere Abfrage einmal für sich aus. Wie viele Zeilen liefert sie?',
            'Welcher Operator verträgt eine Liste statt eines einzelnen Werts?',
          ],
          schwierigkeit: 4,
          konzepte: ['unterabfrage'],
        },
      ],
    },
  ],
};
