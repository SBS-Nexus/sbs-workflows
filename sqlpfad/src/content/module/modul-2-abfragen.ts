import type { Modul } from '../typen';

/**
 * Modul 2 – Abfragen.
 *
 * Die vierte Lektion ist der Grund, warum dieses Modul so aufgebaut ist. Sie
 * erklärt, in welcher Reihenfolge SQL Server eine Abfrage abarbeitet – und
 * damit auf einen Schlag ein halbes Dutzend Dinge, die vorher wie Willkür
 * aussahen: warum ein Alias im WHERE nicht funktioniert, warum ORDER BY zuletzt
 * kommt, warum eine Bedingung auf eine berechnete Spalte scheitert.
 *
 * Sie steht bewusst am Ende und nicht am Anfang: Die Regel ist erst dann eine
 * Erklärung, wenn man die Fälle kennt, die sie erklärt.
 */
export const MODUL_2: Modul = {
  slug: 'modul-abfragen',
  titel: 'Abfragen',
  beschreibung:
    'Zeilen auswählen, Bedingungen verbinden, sortieren – und die Reihenfolge, in der SQL Server ' +
    'das alles tatsächlich abarbeitet.',

  lektionen: [
    // -----------------------------------------------------------------
    {
      slug: 'lektion-zeilen-auswaehlen',
      titel: 'Zeilen auswählen',
      leitfrage: 'Welche Aufträge sind dieses Jahr eingegangen?',
      dauerMinuten: 14,
      datensatz: 'handwerk',
      konzepte: ['where-filter', 'vergleichsoperatoren'],
      lernziele: [
        'Mit WHERE nur die Zeilen holen, die eine Bedingung erfüllen',
        'Die Vergleichsoperatoren richtig wählen',
        'Text, Zahl und Datum im Vergleich unterscheiden',
      ],
      text: `
Bisher kamen immer alle Zeilen. \`WHERE\` ist die Stelle, an der ausgewählt
wird:

\`\`\`sql
SELECT Name, Stadt
FROM Kunden
WHERE Stadt = 'Mannheim';
\`\`\`

**Text steht in einfachen Anführungszeichen**, Zahlen nicht. Das ist kein
Geschmack, sondern der Unterschied zwischen einem Wert und einem Namen:
\`Stadt = Mannheim\` ohne Anführungszeichen würde SQL Server als „Spalte Stadt
gleich Spalte Mannheim" lesen – und mit Fehler 207 abbrechen, weil es diese
Spalte nicht gibt.

Die Operatoren:

| Zeichen | Bedeutung |
| --- | --- |
| \`=\` | gleich |
| \`<>\` | ungleich |
| \`<\` \`>\` | kleiner, größer |
| \`<=\` \`>=\` | kleiner oder gleich, größer oder gleich |

Bei Datumsangaben gilt dasselbe wie bei Zahlen: \`>\` heißt später, \`<\` heißt
früher. Ein Datum schreibt man als Text in der Form \`'2026-01-01'\` – diese
Schreibweise versteht SQL Server unabhängig von der Spracheinstellung des
Servers, und das ist ein Grund, sie sich anzugewöhnen.

Und der Punkt aus Modul 1 gilt weiter: Eine Zeile mit NULL in der verglichenen
Spalte fällt bei jedem dieser Operatoren heraus, auch bei \`<>\`.
`.trim(),
      aufgaben: [
        {
          slug: 'a-where-text',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Alle aus Mannheim',
          aufgabenstellung:
            'Schreibe eine Abfrage, die Name und Telefon aller Kundinnen und Kunden aus Mannheim ' +
            'liefert.',
          startSql: 'SELECT Name, Telefon\nFROM Kunden\nWHERE ',
          loesungSql: "SELECT Name, Telefon FROM Kunden WHERE Stadt = 'Mannheim';",
          loesungsErklaerung:
            'Der Text steht in einfachen Anführungszeichen. Ohne sie würde SQL Server nach einer ' +
            'Spalte namens Mannheim suchen und mit Fehler 207 abbrechen.',
          erwartetesErgebnis: {
            spalten: ['Name', 'Telefon'],
            zeilen: [
              ['Anna Brandt', '0621 445566'],
              ['Sofia Adler', '0621 998877'],
              ['Jonas Brandt', null],
            ],
          },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Die Bedingung gehört hinter WHERE.',
            'Ein Textwert braucht einfache Anführungszeichen.',
          ],
          schwierigkeit: 1,
          konzepte: ['where-filter'],
        },
        {
          /*
           * Eine Aufgabe zu WHERE, die sich ohne Übungsserver beurteilen lässt.
           *
           * Alle anderen Aufgaben zu diesem Konzept sind Schreibaufgaben. Ohne
           * diese hier stünde „Zeilen auswählen mit WHERE" in der
           * Wissenslandkarte dauerhaft auf „braucht den Server" – bei einem
           * Begriff, der zum Kern des Moduls gehört.
           */
          slug: 'a-where-wirkung',
          art: 'EINFACHAUSWAHL',
          titel: 'Was macht WHERE mit dem Ergebnis?',
          aufgabenstellung:
            'Die Tabelle Kunden hat 8 Zeilen und 5 Spalten. Du hängst an eine Abfrage über alle ' +
            'Spalten ein WHERE an, auf das drei Kundinnen passen. Wie sieht das Ergebnis aus?',
          nutzlast: {
            optionen: [
              '3 Zeilen und weiterhin 5 Spalten',
              '3 Zeilen und 3 Spalten',
              '8 Zeilen, bei denen 5 leer sind',
              '8 Zeilen, davon 3 hervorgehoben',
            ],
            richtig: 0,
            aufloesung:
              'WHERE macht das Ergebnis kürzer, nicht schmaler. Welche Spalten herauskommen, ' +
              'entscheidet allein die Liste hinter SELECT. Und es bleiben keine leeren Zeilen ' +
              'übrig: Was die Bedingung nicht erfüllt, kommt gar nicht erst vor.',
          },
          hinweise: [
            'Zwei Dinge sind zu trennen: die Zahl der Zeilen und die Zahl der Spalten.',
            'Welcher Teil einer Abfrage bestimmt die Spalten?',
          ],
          schwierigkeit: 1,
          konzepte: ['where-filter'],
        },
        {
          slug: 'a-where-datum',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Aufträge seit Februar',
          aufgabenstellung:
            'Schreibe eine Abfrage, die Bezeichnung und Eingegangen aller Aufträge liefert, die ' +
            'am 1. Februar 2026 oder später eingegangen sind.',
          startSql: 'SELECT Bezeichnung, Eingegangen\nFROM Auftraege\nWHERE ',
          loesungSql:
            "SELECT Bezeichnung, Eingegangen FROM Auftraege WHERE Eingegangen >= '2026-02-01';",
          loesungsErklaerung:
            '„Oder später" schließt den Tag selbst ein – also >= und nicht >. Diese eine Stelle ' +
            'ist der häufigste Fehler bei Datumsgrenzen.',
          erwartetesErgebnis: {
            spalten: ['Bezeichnung', 'Eingegangen'],
            zeilen: [
              ['Tropfenden Wasserhahn abdichten', new Date('2026-02-02T00:00:00Z')],
              ['Heizung macht Geräusche', new Date('2026-03-02T00:00:00Z')],
              ['Beleuchtung Verkaufsraum erweitern', new Date('2026-02-18T00:00:00Z')],
              ['Neues Waschbecken einbauen', new Date('2026-02-25T00:00:00Z')],
              ['Thermostate tauschen', new Date('2026-03-01T00:00:00Z')],
              ['Angebot für Elektroprüfung', new Date('2026-03-10T00:00:00Z')],
            ],
          },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Ein Datum schreibt man als Text: 2026-02-01',
            '„Am 1. Februar oder später" – wird der 1. Februar selbst mitgezählt?',
          ],
          schwierigkeit: 2,
          konzepte: ['where-filter', 'vergleichsoperatoren'],
        },
        {
          slug: 'a-ungleich-und-null',
          art: 'ERGEBNIS_VORHERSAGEN',
          titel: 'Alle außer Mannheim?',
          aufgabenstellung:
            "Sag voraus, welche Namen `SELECT Name FROM Kunden WHERE Stadt <> 'Mannheim'` " +
            'liefert. Denk an die Kundin ohne Stadt.',
          erwartetesErgebnis: {
            spalten: ['Name'],
            zeilen: [
              ['Mehmet Kaya'],
              ['Bäckerei Lindner'],
              ['Praxis Dr. Weiß'],
              ['Hausverwaltung Süd'],
            ],
          },
          vergleich: { reihenfolgeZaehlt: false },
          loesungSql: "SELECT Name FROM Kunden WHERE Stadt <> 'Mannheim';",
          loesungsErklaerung:
            'Elif Yilmaz fehlt. Ihre Stadt ist NULL, und „unbekannt ungleich Mannheim" ergibt ' +
            'wieder unbekannt – nicht wahr. Wer sie mitzählen will, braucht ' +
            'OR Stadt IS NULL.',
          hinweise: [
            'Wie viele Kundinnen und Kunden haben eine Stadt, die nicht Mannheim ist?',
            'Und was ist mit der Zeile, in der gar keine Stadt steht?',
          ],
          schwierigkeit: 3,
          konzepte: ['vergleichsoperatoren', 'dreiwertige-logik'],
        },
        {
          slug: 'a-fehler-anfuehrungszeichen',
          art: 'FEHLER_FINDEN',
          titel: 'Ungültiger Spaltenname',
          aufgabenstellung:
            "Diese Abfrage bricht mit „Invalid column name 'Elektro'\" ab: " +
            '`SELECT Name FROM Mitarbeitende WHERE Gewerk = Elektro`. Schreibe sie richtig.',
          startSql: 'SELECT Name FROM Mitarbeitende WHERE Gewerk = Elektro;',
          loesungSql: "SELECT Name FROM Mitarbeitende WHERE Gewerk = 'Elektro';",
          loesungsErklaerung:
            'Ohne Anführungszeichen liest SQL Server Elektro als Spaltennamen. Die Fehlermeldung ' +
            'sagt das sogar – man muss sie nur als solche lesen.',
          erwartetesErgebnis: {
            spalten: ['Name'],
            zeilen: [['Katrin Storz'], ['Miriam Hoff']],
          },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Die Meldung nennt Elektro einen Spaltennamen. Was sollte es stattdessen sein?',
            'Wie unterscheidet SQL Server einen Textwert von einem Namen?',
          ],
          schwierigkeit: 1,
          konzepte: ['where-filter', 'datentyp'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-mehrere-bedingungen',
      titel: 'Mehrere Bedingungen',
      leitfrage: 'Welche offenen Aufträge aus Mannheim liegen schon länger als einen Monat?',
      dauerMinuten: 16,
      datensatz: 'handwerk',
      konzepte: ['logische-verknuepfung', 'bereich-und-liste'],
      lernziele: [
        'Bedingungen mit AND und OR verbinden',
        'Erkennen, wann Klammern das Ergebnis ändern',
        'BETWEEN und IN als Kurzschreibweise benutzen',
      ],
      text: `
Zwei Bedingungen verbindet man mit \`AND\` (beide müssen zutreffen) oder
\`OR\` (mindestens eine).

\`\`\`sql
SELECT Bezeichnung
FROM Auftraege
WHERE Abgeschlossen IS NULL
  AND Eingegangen < '2026-02-01';
\`\`\`

**AND bindet stärker als OR.** Das ist die wichtigste Zeile dieser Lektion,
denn es führt zu Ergebnissen, die man nicht bemerkt:

\`\`\`sql
WHERE Gewerk = 'Elektro' OR Gewerk = 'Heizung' AND Stundensatz > 70
\`\`\`

Das liest SQL Server als: *Elektro* – oder *Heizung mit mehr als 70 Euro*. Wer
alle aus beiden Gewerken über 70 Euro wollte, braucht Klammern:

\`\`\`sql
WHERE (Gewerk = 'Elektro' OR Gewerk = 'Heizung') AND Stundensatz > 70
\`\`\`

Beide Abfragen laufen ohne Fehler. Der Unterschied fällt nur auf, wenn man das
Ergebnis prüft – und genau deshalb steht hier eine Vorhersageaufgabe.

Zwei Kurzschreibweisen sparen Tipparbeit und machen die Absicht deutlicher:

- \`Stundensatz BETWEEN 64 AND 69\` statt \`>= 64 AND <= 69\`. **BETWEEN
  schließt beide Grenzen ein** – ein häufiger Irrtum.
- \`Gewerk IN ('Elektro', 'Heizung')\` statt zweier OR-Bedingungen.
`.trim(),
      aufgaben: [
        {
          slug: 'a-and-verbinden',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Offen und älter als Februar',
          aufgabenstellung:
            'Schreibe eine Abfrage, die Bezeichnung und Eingegangen der Aufträge liefert, die ' +
            'noch offen sind und vor dem 1. Februar 2026 eingegangen sind.',
          startSql: 'SELECT Bezeichnung, Eingegangen\nFROM Auftraege\nWHERE ',
          loesungSql:
            "SELECT Bezeichnung, Eingegangen FROM Auftraege WHERE Abgeschlossen IS NULL AND Eingegangen < '2026-02-01';",
          loesungsErklaerung:
            'Zwei Bedingungen mit AND. Beide müssen zutreffen – deshalb bleibt nur ein Auftrag ' +
            'übrig, obwohl es vier offene gibt.',
          erwartetesErgebnis: { spalten: ['Bezeichnung', 'Eingegangen'], zeilen: [] },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Zwei Bedingungen, die beide gelten sollen.',
            'Für „noch offen" brauchst du wieder IS NULL.',
            'Das Ergebnis darf durchaus leer sein – prüf nach, ob es das sein muss.',
          ],
          schwierigkeit: 2,
          konzepte: ['logische-verknuepfung', 'where-filter'],
        },
        {
          slug: 'a-klammern-vorhersagen',
          art: 'ERGEBNIS_VORHERSAGEN',
          titel: 'Wo AND stärker bindet',
          aufgabenstellung:
            'Sag voraus, welche Namen ' +
            "`SELECT Name FROM Mitarbeitende WHERE Gewerk = 'Elektro' OR Gewerk = 'Heizung' AND Stundensatz > 70` " +
            'liefert.',
          erwartetesErgebnis: {
            spalten: ['Name'],
            zeilen: [['Katrin Storz'], ['Miriam Hoff'], ['Paul Denk']],
          },
          vergleich: { reihenfolgeZaehlt: false },
          loesungSql:
            "SELECT Name FROM Mitarbeitende WHERE Gewerk = 'Elektro' OR Gewerk = 'Heizung' AND Stundensatz > 70;",
          loesungsErklaerung:
            'Beide Elektro-Leute kommen ohne Bedingung durch, weil AND zuerst ausgewertet wird. ' +
            'Paul Denk kommt dazu, weil er Heizung macht und 71 Euro kostet. Mit Klammern um ' +
            'die OR-Bedingung wären es nur Paul Denk.',
          hinweise: [
            'Welcher Teil wird zuerst ausgewertet?',
            'Gilt die Bedingung mit dem Stundensatz für beide Gewerke oder nur für eines?',
          ],
          schwierigkeit: 4,
          konzepte: ['logische-verknuepfung'],
        },
        {
          slug: 'a-in-liste',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Zwei Städte',
          aufgabenstellung:
            'Schreibe eine Abfrage, die den Namen aller Kundinnen und Kunden aus Mannheim oder ' +
            'Weinheim liefert. Benutze dafür IN.',
          startSql: 'SELECT Name\nFROM Kunden\nWHERE ',
          loesungSql: "SELECT Name FROM Kunden WHERE Stadt IN ('Mannheim', 'Weinheim');",
          loesungsErklaerung:
            'IN ist kürzer als zwei OR-Bedingungen und sagt die Absicht deutlicher: „einer aus ' +
            'dieser Liste".',
          erwartetesErgebnis: {
            spalten: ['Name'],
            zeilen: [['Anna Brandt'], ['Mehmet Kaya'], ['Sofia Adler'], ['Jonas Brandt']],
          },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'IN erwartet eine Liste in runden Klammern.',
            'Die einzelnen Werte sind Text und werden durch Kommas getrennt.',
          ],
          schwierigkeit: 2,
          konzepte: ['bereich-und-liste'],
        },
        {
          slug: 'a-between-grenzen',
          art: 'EINFACHAUSWAHL',
          titel: 'Schließt BETWEEN die Grenzen ein?',
          aufgabenstellung:
            'Welche Stundensätze liefert `WHERE Stundensatz BETWEEN 64.50 AND 68.00` aus der ' +
            'Tabelle Mitarbeitende?',
          nutzlast: {
            optionen: [
              '64,50 und 68,00 sind dabei',
              'Nur was echt dazwischen liegt, ohne die Grenzen',
              'Nur die untere Grenze zählt mit',
              'Nur die obere Grenze zählt mit',
            ],
            richtig: 0,
            aufloesung:
              'BETWEEN schließt beide Grenzen ein. Es entspricht >= 64.50 AND <= 68.00 – ein ' +
              'Punkt, an dem sich viele einmal vertun und danach nie wieder.',
          },
          hinweise: [
            'BETWEEN lässt sich in zwei Vergleiche übersetzen. In welche?',
            'Tobias Renner kostet genau 64,50. Ist er dabei?',
          ],
          schwierigkeit: 2,
          konzepte: ['bereich-und-liste'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-sortieren-und-suchen',
      titel: 'Sortieren und suchen',
      leitfrage: 'Wie bekomme ich die Liste alphabetisch – und wie finde ich alle „Brandt"?',
      dauerMinuten: 13,
      datensatz: 'handwerk',
      konzepte: ['sortierung', 'mustersuche'],
      lernziele: [
        'Mit ORDER BY sortieren, auf- und absteigend',
        'Wissen, dass ein Ergebnis ohne ORDER BY keine verlässliche Reihenfolge hat',
        'Mit LIKE nach einem Muster suchen statt nach einem genauen Wert',
      ],
      text: `
**Ohne \`ORDER BY\` hat ein Ergebnis keine verlässliche Reihenfolge.** Dass es
bisher sortiert aussah, war Zufall – die Datenbank darf die Zeilen liefern, wie
es ihr am schnellsten passt, und das kann sich ändern, wenn Daten dazukommen
oder ein Index gebaut wird.

\`\`\`sql
SELECT Name, Stadt
FROM Kunden
ORDER BY Name;              -- aufsteigend, das ist der Standard
ORDER BY KundeSeit DESC;   -- absteigend, neueste zuerst
\`\`\`

Nach mehreren Spalten sortiert man mit Komma: \`ORDER BY Stadt, Name\` sortiert
zuerst nach Stadt und innerhalb einer Stadt nach Name.

Wo NULL landet, ist in SQL Server festgelegt: **bei aufsteigender Sortierung
zuerst.** Das überrascht regelmäßig – „nichts" gilt als kleiner als jeder Wert.

Für die Suche nach einem Muster gibt es \`LIKE\`:

| Muster | Findet |
| --- | --- |
| \`'Brandt'\` | genau Brandt |
| \`'%Brandt'\` | alles, was auf Brandt endet |
| \`'Brandt%'\` | alles, was mit Brandt anfängt |
| \`'%Brandt%'\` | alles, was Brandt irgendwo enthält |

Das Prozentzeichen steht für beliebig viele Zeichen, auch für keines. Der
Unterstrich \`_\` steht für genau ein Zeichen.
`.trim(),
      aufgaben: [
        {
          slug: 'a-order-by-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Alphabetisch nach Name',
          aufgabenstellung:
            'Schreibe eine Abfrage, die Name und Stadt aller Kundinnen und Kunden alphabetisch ' +
            'nach Name sortiert liefert.',
          startSql: 'SELECT Name, Stadt\nFROM Kunden\n',
          loesungSql: 'SELECT Name, Stadt FROM Kunden ORDER BY Name;',
          loesungsErklaerung:
            'Aufsteigend ist der Standard – ASC darf man schreiben, muss man aber nicht.',
          erwartetesErgebnis: {
            spalten: ['Name', 'Stadt'],
            zeilen: [
              ['Anna Brandt', 'Mannheim'],
              ['Bäckerei Lindner', 'Heidelberg'],
              ['Elif Yilmaz', null],
              ['Hausverwaltung Süd', 'Speyer'],
              ['Jonas Brandt', 'Mannheim'],
              ['Mehmet Kaya', 'Weinheim'],
              ['Praxis Dr. Weiß', 'Ludwigshafen'],
              ['Sofia Adler', 'Mannheim'],
            ],
          },
          vergleich: { reihenfolgeZaehlt: true },
          hinweise: [
            'ORDER BY steht am Ende der Abfrage.',
            'Für aufsteigend brauchst du kein zusätzliches Wort.',
          ],
          schwierigkeit: 1,
          konzepte: ['sortierung'],
        },
        {
          slug: 'a-order-by-desc',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Die neuesten Aufträge zuerst',
          aufgabenstellung:
            'Schreibe eine Abfrage, die Bezeichnung und Eingegangen aller Aufträge liefert, den ' +
            'zuletzt eingegangenen zuerst.',
          startSql: 'SELECT Bezeichnung, Eingegangen\nFROM Auftraege\n',
          loesungSql: 'SELECT Bezeichnung, Eingegangen FROM Auftraege ORDER BY Eingegangen DESC;',
          loesungsErklaerung:
            'DESC dreht die Reihenfolge um. Bei Datumsangaben heißt „größer" später – der ' +
            'jüngste Auftrag steht damit oben.',
          hinweise: [
            'Für absteigend gibt es ein eigenes Wort.',
            'Es steht hinter der Spalte, nach der sortiert wird.',
          ],
          schwierigkeit: 1,
          konzepte: ['sortierung'],
        },
        {
          slug: 'a-like-suchen',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Alle Brandts',
          aufgabenstellung:
            'Im Betrieb gibt es zwei Kundinnen und Kunden mit dem Nachnamen Brandt. Schreibe ' +
            'eine Abfrage, die alle Namen liefert, die auf „Brandt" enden.',
          startSql: 'SELECT Name\nFROM Kunden\nWHERE ',
          loesungSql: "SELECT Name FROM Kunden WHERE Name LIKE '%Brandt';",
          loesungsErklaerung:
            'Das Prozentzeichen am Anfang steht für den Vornamen – beliebig viele Zeichen. Am ' +
            'Ende steht keines, deshalb muss der Name dort aufhören.',
          erwartetesErgebnis: {
            spalten: ['Name'],
            zeilen: [['Anna Brandt'], ['Jonas Brandt']],
          },
          vergleich: { reihenfolgeZaehlt: false },
          hinweise: [
            'Für eine Mustersuche brauchst du LIKE statt =.',
            'Das Prozentzeichen steht für beliebig viele Zeichen.',
            'Wo muss es stehen, damit der Name auf Brandt endet?',
          ],
          schwierigkeit: 2,
          konzepte: ['mustersuche'],
        },
        {
          slug: 'a-muster-lesen',
          art: 'MEHRFACHAUSWAHL',
          titel: 'Welche Namen trifft das Muster?',
          aufgabenstellung:
            "Die Bedingung lautet WHERE Name LIKE 'B%t'. Welche der folgenden Namen erfüllt sie?",
          nutzlast: {
            optionen: ['Brandt', 'Bogert', 'Bernhardt', 'Albert', 'Bast'],
            richtig: [0, 1, 2, 4],
            aufloesung:
              'Das Muster verlangt: fängt mit B an, endet auf t, dazwischen beliebig viel – auch ' +
              'nichts. Albert fängt mit A an und fällt deshalb heraus, obwohl er auf t endet. ' +
              'Das Prozentzeichen steht für beliebig viele Zeichen, auch für null.',
          },
          hinweise: [
            'Lies das Muster von links nach rechts: erst B, dann beliebig viel, dann t.',
            'Einer der Namen scheitert nicht am Ende, sondern am Anfang.',
          ],
          schwierigkeit: 2,
          konzepte: ['mustersuche'],
        },
        {
          slug: 'a-null-sortierung',
          art: 'EINFACHAUSWAHL',
          titel: 'Wo landet NULL beim Sortieren?',
          aufgabenstellung:
            'Wo steht die Zeile von Elif Yilmaz – ohne Stadt – bei ' +
            '`SELECT Name, Stadt FROM Kunden ORDER BY Stadt`?',
          nutzlast: {
            optionen: [
              'Ganz oben, vor allen Städten',
              'Ganz unten, nach allen Städten',
              'An der Stelle, an der sie in der Tabelle steht',
              'Sie fällt aus dem Ergebnis heraus',
            ],
            richtig: 0,
            aufloesung:
              'SQL Server sortiert NULL bei aufsteigender Sortierung zuerst – „nichts" gilt als ' +
              'kleiner als jeder Wert. Anders als bei WHERE fällt die Zeile nicht heraus: ' +
              'ORDER BY wählt nichts aus, es ordnet nur.',
          },
          hinweise: [
            'ORDER BY entfernt keine Zeilen. Sie muss also irgendwo stehen.',
            'Gilt „kein Wert" beim Sortieren als sehr klein oder als sehr groß?',
          ],
          schwierigkeit: 3,
          konzepte: ['sortierung', 'null-bedeutung'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-verarbeitungsreihenfolge',
      titel: 'Die Reihenfolge, in der SQL Server arbeitet',
      leitfrage: 'Warum kennt WHERE meinen Alias aus dem SELECT nicht?',
      dauerMinuten: 18,
      datensatz: 'handwerk',
      konzepte: ['verarbeitungsreihenfolge', 'berechnete-spalten'],
      lernziele: [
        'Die logische Reihenfolge FROM, WHERE, SELECT, ORDER BY benennen',
        'Erklären, warum ein Alias im WHERE nicht verfügbar ist, im ORDER BY aber schon',
        'Im SELECT rechnen und das Ergebnis benennen',
      ],
      text: `
Eine Abfrage wird **nicht in der Reihenfolge abgearbeitet, in der man sie
schreibt.** Man schreibt SELECT zuerst; SQL Server macht es fast zuletzt. Die
logische Reihenfolge ist:

\`\`\`
FROM      Welche Tabelle?
WHERE     Welche Zeilen davon?
SELECT    Welche Spalten – und was daraus berechnet wird?
ORDER BY  In welcher Reihenfolge?
\`\`\`

Das klingt nach Theorie und erklärt auf einen Schlag mehrere Dinge, die vorher
willkürlich aussahen.

**Warum ein Alias im WHERE nicht geht.** Diese Abfrage bricht ab:

\`\`\`sql
SELECT Stundensatz * 8 AS Tagessatz
FROM Mitarbeitende
WHERE Tagessatz > 500;      -- Fehler 207
\`\`\`

Wenn WHERE ausgewertet wird, gibt es \`Tagessatz\` noch nicht – SELECT kommt
erst danach. Man wiederholt die Rechnung im WHERE:
\`WHERE Stundensatz * 8 > 500\`.

**Warum er im ORDER BY doch geht.** ORDER BY kommt nach SELECT. Zu diesem
Zeitpunkt gibt es den Alias – deshalb ist \`ORDER BY Tagessatz\` erlaubt.

**Rechnen im SELECT** verändert nichts in der Tabelle. Es entsteht eine Spalte,
die nur in diesem Ergebnis existiert:

\`\`\`sql
SELECT Bezeichnung, Menge * Einzelpreis AS Zeilensumme
FROM Positionen;
\`\`\`

Ohne \`AS\` hätte die Spalte im Ergebnis gar keinen Namen – SQL Server erfindet
keinen. In der Anzeige stünde dann eine Überschrift wie „Spalte1".
`.trim(),
      aufgaben: [
        {
          slug: 'a-reihenfolge-benennen',
          art: 'EINFACHAUSWAHL',
          titel: 'Was kommt zuerst?',
          aufgabenstellung:
            'In welcher Reihenfolge arbeitet SQL Server die Teile einer Abfrage logisch ab?',
          nutzlast: {
            optionen: [
              'FROM, WHERE, SELECT, ORDER BY',
              'SELECT, FROM, WHERE, ORDER BY',
              'WHERE, FROM, SELECT, ORDER BY',
              'SELECT, WHERE, FROM, ORDER BY',
            ],
            richtig: 0,
            aufloesung:
              'Erst die Tabelle, dann die Auswahl der Zeilen, dann die Spalten, zuletzt die ' +
              'Sortierung. Geschrieben wird es anders – abgearbeitet so.',
          },
          hinweise: [
            'Was muss feststehen, bevor man Zeilen auswählen kann?',
            'Sortieren lässt sich erst, wenn feststeht, was im Ergebnis steht.',
          ],
          schwierigkeit: 3,
          konzepte: ['verarbeitungsreihenfolge'],
        },
        {
          slug: 'a-alias-im-where',
          art: 'FEHLER_ERKLAEREN',
          titel: 'Ungültiger Spaltenname Tagessatz',
          aufgabenstellung:
            'Die Abfrage `SELECT Stundensatz * 8 AS Tagessatz FROM Mitarbeitende WHERE Tagessatz > 500` ' +
            "bricht mit „Invalid column name 'Tagessatz'\" ab, obwohl der Alias direkt darüber " +
            'steht. Erkläre in einem Satz, warum.',
          nutzlast: {
            erwarteteStichworte: ['WHERE', 'SELECT', 'vorher'],
            musterantwort:
              'WHERE wird vor SELECT ausgewertet – zu dem Zeitpunkt gibt es den Alias noch ' +
              'nicht. Die Rechnung muss im WHERE wiederholt werden.',
          },
          hinweise: [
            'Es liegt nicht am Tippfehler und nicht am Datentyp.',
            'Welcher Teil wird zuerst abgearbeitet, WHERE oder SELECT?',
          ],
          schwierigkeit: 4,
          konzepte: ['verarbeitungsreihenfolge'],
        },
        {
          slug: 'a-berechnete-spalte',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Die Summe je Position',
          aufgabenstellung:
            'Schreibe eine Abfrage, die aus Positionen die Bezeichnung und das Produkt aus Menge ' +
            'und Einzelpreis als „Zeilensumme" liefert.',
          startSql: 'SELECT Bezeichnung, \nFROM Positionen;',
          loesungSql: 'SELECT Bezeichnung, Menge * Einzelpreis AS Zeilensumme FROM Positionen;',
          loesungsErklaerung:
            'Die Rechnung steht im SELECT und verändert nichts in der Tabelle. Ohne AS hätte die ' +
            'Spalte im Ergebnis keinen Namen.',
          hinweise: [
            'Gerechnet wird mit dem Stern zwischen den beiden Spalten.',
            'Die neue Spalte braucht einen Namen – dafür gibt es AS.',
          ],
          schwierigkeit: 2,
          konzepte: ['berechnete-spalten', 'alias'],
        },
        {
          slug: 'a-rechnen-wirkung',
          art: 'EINFACHAUSWAHL',
          titel: 'Was passiert dabei mit der Tabelle?',
          aufgabenstellung:
            'Du führst SELECT Bezeichnung, Menge * Einzelpreis AS Zeilensumme FROM Positionen ' +
            'aus. Was steht danach in der Tabelle Positionen?',
          nutzlast: {
            optionen: [
              'Dasselbe wie vorher – die Spalte Zeilensumme gibt es nur im Ergebnis.',
              'Eine neue Spalte Zeilensumme, dauerhaft gespeichert.',
              'Eine neue Spalte, die beim nächsten Neustart wieder verschwindet.',
              'Nichts mehr – die Abfrage ersetzt den Inhalt.',
            ],
            richtig: 0,
            aufloesung:
              'Ein SELECT liest nur. Die berechnete Spalte entsteht für die Dauer dieses einen ' +
              'Ergebnisses und wird nirgends abgelegt. Um eine Spalte wirklich anzulegen, ' +
              'bräuchte es ALTER TABLE – das kommt in Modul 4.',
          },
          hinweise: [
            'Welches Wort steht am Anfang der Anweisung, und was tut es?',
            'Was müsste dastehen, wenn sich die Tabelle wirklich ändern soll?',
          ],
          schwierigkeit: 2,
          konzepte: ['berechnete-spalten'],
        },
        {
          slug: 'a-alias-im-order-by',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Nach der Rechnung sortieren',
          aufgabenstellung:
            'Erweitere die Abfrage aus der vorigen Aufgabe so, dass sie nach der Zeilensumme ' +
            'absteigend sortiert ist. Der Alias darf hier benutzt werden – überleg dir, warum.',
          startSql: 'SELECT Bezeichnung, Menge * Einzelpreis AS Zeilensumme\nFROM Positionen\n',
          loesungSql:
            'SELECT Bezeichnung, Menge * Einzelpreis AS Zeilensumme FROM Positionen ORDER BY Zeilensumme DESC;',
          loesungsErklaerung:
            'ORDER BY wird nach SELECT ausgewertet. Zu diesem Zeitpunkt gibt es den Alias – ' +
            'anders als im WHERE.',
          hinweise: [
            'Die Sortierung steht am Ende.',
            'An welcher Stelle der Verarbeitung ist der Alias schon bekannt?',
          ],
          schwierigkeit: 3,
          konzepte: ['verarbeitungsreihenfolge', 'sortierung'],
        },
      ],
    },
  ],
};
