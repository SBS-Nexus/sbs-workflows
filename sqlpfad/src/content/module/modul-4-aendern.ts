import type { Modul } from '../typen';

/**
 * Modul 4 – Ändern und Struktur.
 *
 * Bis hierher konnte nichts kaputtgehen: Ein falsches SELECT liefert ein
 * falsches Ergebnis und sonst nichts. Ab jetzt hinterlassen Anweisungen
 * Spuren, und das verändert, was eine Lektion leisten muss.
 *
 * Drei Entscheidungen stecken darin:
 *
 * Das **vergessene WHERE** bekommt eine eigene Aufgabe und wird nicht als
 * Warnhinweis in einem Absatz abgelegt. `UPDATE Kunden SET Stadt = 'Mannheim'`
 * ist syntaktisch einwandfrei; die Datenbank fragt nicht nach und meldet
 * nichts. Wer das einmal bewusst durchdacht hat, macht danach die Probe.
 *
 * **Transaktionen kommen vor DDL**, nicht danach. Sie sind das Werkzeug, das
 * den Umgang mit Änderungen erträglich macht – wer sie kennt, kann in der
 * Sandbox ausprobieren, ohne etwas zu verlieren.
 *
 * Und es gibt **keine Aufgabe, die zum Löschen ohne Bedingung anleitet**, auch
 * nicht als abschreckendes Beispiel zum Nachmachen. Die Fehleraufgaben lassen
 * den Fehler lesen und erklären, nicht ausführen.
 */
export const MODUL_4: Modul = {
  slug: 'modul-aendern-und-struktur',
  titel: 'Ändern und Struktur',
  beschreibung:
    'Daten einfügen, ändern und löschen – sicher, nachvollziehbar und mit der Möglichkeit, ' +
    'es zurückzunehmen. Und Tabellen selbst anlegen.',

  lektionen: [
    // -----------------------------------------------------------------
    {
      slug: 'lektion-zeilen-aendern',
      titel: 'Zeilen hinzufügen, ändern, löschen',
      leitfrage: 'Eine neue Kundin ruft an – wie kommt sie in die Datenbank?',
      dauerMinuten: 20,
      datensatz: 'handwerk',
      konzepte: ['einfuegen', 'aendern-mit-where', 'loeschen'],
      lernziele: [
        'Mit INSERT eine Zeile hinzufügen und dabei die Spalten benennen',
        'Mit UPDATE gezielt ändern und die Bedingung vorher als SELECT prüfen',
        'Erklären, was ein UPDATE oder DELETE ohne WHERE anrichtet',
      ],
      text: `
Drei Anweisungen verändern Daten. Sie sehen harmlos aus und sind es nicht.

**Einfügen:**

\`\`\`sql
INSERT INTO Kunden (KundeId, Name, Stadt, Telefon, KundeSeit)
VALUES (9, 'Reiter GmbH', 'Speyer', NULL, '2024-03-01');
\`\`\`

Die Spaltenliste in Klammern ist freiwillig – und trotzdem Pflicht. Ohne sie
gilt die Reihenfolge der Tabelle. Kommt morgen eine Spalte dazu oder wandert
eine, schreibt dieselbe Anweisung Werte in die falschen Spalten, ohne dass
jemand etwas merkt.

**Ändern:**

\`\`\`sql
UPDATE Kunden SET Telefon = '06232 44112' WHERE KundeId = 3;
\`\`\`

**Löschen:**

\`\`\`sql
DELETE FROM Positionen WHERE PositionId = 26;
\`\`\`

Und jetzt der Satz, um den es in dieser Lektion eigentlich geht: **Das WHERE
ist nicht optional, sondern die ganze Anweisung.** Wer es weglässt, ändert
oder löscht *jede* Zeile der Tabelle. Das ist kein Fehler, den SQL Server
meldet – es ist genau das, was dasteht, und er führt es aus. In der Sandbox
kostet das einen Klick auf „Zurücksetzen". Auf einem echten System kostet es
den Abend.

Deshalb die Probe, jedes Mal:

\`\`\`sql
SELECT * FROM Kunden WHERE KundeId = 3;
\`\`\`

Erst wenn dieses SELECT genau die Zeilen zeigt, die verändert werden sollen,
wird aus dem SELECT ein UPDATE oder DELETE. Das ist keine Ängstlichkeit,
sondern die übliche Arbeitsweise von Leuten, die das beruflich tun.
`.trim(),
      aufgaben: [
        {
          slug: 'a-insert-spalten',
          art: 'EINFACHAUSWAHL',
          titel: 'Warum die Spalten in Klammern?',
          aufgabenstellung:
            'Beide Schreibweisen fügen heute dieselbe Zeile ein. Warum ist die mit der ' +
            'Spaltenliste trotzdem die richtige?',
          nutzlast: {
            optionen: [
              'Weil sie auch dann noch stimmt, wenn sich die Tabelle später ändert.',
              'Weil sie schneller ausgeführt wird.',
              'Weil ohne Spaltenliste ein Syntaxfehler entsteht.',
              'Weil nur so NULL-Werte erlaubt sind.',
            ],
            richtig: 0,
            aufloesung:
              'Ohne Spaltenliste zählt die Reihenfolge der Tabelle. Kommt eine Spalte dazu oder ' +
              'wandert eine, landen die Werte woanders – fehlerfrei und falsch. Schneller ist ' +
              'weder das eine noch das andere.',
          },
          hinweise: [
            'Denk an übermorgen, nicht an heute.',
            'Was passiert, wenn jemand der Tabelle eine Spalte hinzufügt?',
          ],
          schwierigkeit: 3,
          konzepte: ['einfuegen'],
        },
        {
          slug: 'a-insert-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Die neue Kundin eintragen',
          aufgabenstellung:
            'Trage die Firma „Reiter GmbH" aus Speyer als Kundin mit der Nummer 9 ein. Eine ' +
            'Telefonnummer hat sie nicht hinterlassen, Kundin ist sie seit dem 1. März 2024.',
          erlaubteKlassen: ['SELECT', 'DML'],
          startSql: 'INSERT INTO Kunden (KundeId, Name, Stadt, Telefon, KundeSeit)\n',
          loesungSql:
            "INSERT INTO Kunden (KundeId, Name, Stadt, Telefon, KundeSeit) VALUES (9, 'Reiter GmbH', 'Speyer', NULL, '2024-03-01');",
          loesungsErklaerung:
            'Für die fehlende Telefonnummer steht NULL und keine leere Zeichenfolge: Sie hat ' +
            'keine hinterlassen, sie hat nicht eine leere. Das Datum wird als Zeichenfolge im ' +
            'Format Jahr-Monat-Tag geschrieben – so ist es unabhängig von Spracheinstellungen ' +
            'eindeutig.',
          hinweise: [
            'Die Werte stehen in derselben Reihenfolge wie die Spalten davor.',
            'Für „keine Telefonnummer" gibt es einen eigenen Wert – keine leere Zeichenfolge.',
            'Datumsangaben schreibt man als Zeichenfolge, Jahr zuerst.',
          ],
          schwierigkeit: 3,
          konzepte: ['einfuegen', 'datentyp'],
        },
        {
          slug: 'a-update-ohne-where',
          art: 'FEHLER_FINDEN',
          titel: 'Was diese Anweisung wirklich tut',
          aufgabenstellung:
            'Jemand wollte den Ort von Kundin Nummer 4 auf Mannheim setzen und hat geschrieben: ' +
            "UPDATE Kunden SET Stadt = 'Mannheim'; – Was fehlt, und was passiert ohne diesen " +
            'Teil? Schreibe die Anweisung richtig.',
          erlaubteKlassen: ['SELECT', 'DML'],
          loesungSql: "UPDATE Kunden SET Stadt = 'Mannheim' WHERE KundeId = 4;",
          loesungsErklaerung:
            'Ohne WHERE gilt die Änderung für alle acht Zeilen. SQL Server fragt nicht nach: ' +
            'Die Anweisung ist gültig, sie tut genau das, was dasteht. Genau deshalb liest man ' +
            'die Bedingung vorher einmal als SELECT.',
          hinweise: [
            'Zähl nach, für wie viele Zeilen die Anweisung so gilt.',
            'Der fehlende Teil beantwortet die Frage „für welche Zeilen?".',
            'Kundin Nummer 4 erkennt man an ihrer KundeId.',
          ],
          schwierigkeit: 3,
          konzepte: ['aendern-mit-where'],
        },
        {
          slug: 'a-delete-probe',
          art: 'FREITEXT',
          titel: 'Die Probe vor dem Löschen',
          aufgabenstellung:
            'Du sollst alle Positionen eines bestimmten Auftrags löschen. Welche Abfrage ' +
            'schreibst du davor, und woran erkennst du an ihrem Ergebnis, dass die Bedingung ' +
            'stimmt?',
          nutzlast: {
            musterantwort:
              'Dieselbe Bedingung zuerst als SELECT: SELECT * FROM Positionen WHERE AuftragId = 5. ' +
              'Das Ergebnis zeigt genau die Zeilen, die das DELETE treffen würde. Stimmt die ' +
              'Anzahl mit dem überein, was ich erwarte, und gehören alle gezeigten Zeilen ' +
              'wirklich zu diesem Auftrag, dann ist die Bedingung richtig. Kommen zu viele ' +
              'Zeilen oder gar alle, ist etwas an der Bedingung falsch – und ich merke es, ' +
              'bevor etwas weg ist.',
          },
          hinweise: [
            'Die Bedingung bleibt gleich, nur das Wort davor ändert sich.',
            'Was liest du an der Zeilenzahl ab?',
          ],
          schwierigkeit: 3,
          konzepte: ['loeschen', 'aendern-mit-where'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-alles-oder-nichts',
      titel: 'Alles oder nichts',
      leitfrage: 'Was passiert, wenn die zweite von zwei Änderungen scheitert?',
      dauerMinuten: 18,
      datensatz: 'handwerk',
      konzepte: ['transaktion', 'zuruecknehmen'],
      lernziele: [
        'Mehrere Änderungen als eine Einheit ausführen',
        'Eine Änderung mit ROLLBACK zurücknehmen und mit COMMIT festschreiben',
        'Erklären, warum eine offene Transaktion ein Problem ist',
      ],
      text: `
Zwei Anweisungen gehören zusammen: Der Auftrag wird einem anderen
Mitarbeiter zugeteilt, und die alte Zuteilung wird entfernt. Läuft die erste
durch und die zweite nicht, steht der Auftrag doppelt zugeteilt in der
Datenbank – ein Zustand, den es fachlich nicht geben darf.

Eine **Transaktion** klammert beides zusammen:

\`\`\`sql
BEGIN TRANSACTION;
UPDATE Auftraege SET MitarbeiterId = 2 WHERE AuftragId = 5;
COMMIT TRANSACTION;
\`\`\`

Zwischen \`BEGIN\` und \`COMMIT\` sind die Änderungen für alle anderen nicht
sichtbar. Erst \`COMMIT\` macht sie endgültig. Und wenn etwas nicht stimmt:

\`\`\`sql
ROLLBACK TRANSACTION;
\`\`\`

Dann ist es, als wäre nichts geschehen. Kein „rückgängig machen" im Sinne
einer zweiten, entgegengesetzten Anweisung – es hat schlicht nie
stattgefunden.

**Das macht Transaktionen zum Übungswerkzeug.** Wer sich bei einem UPDATE
unsicher ist, öffnet eine Transaktion, führt es aus, sieht sich das Ergebnis
mit einem SELECT an und nimmt es mit ROLLBACK zurück, wenn es nicht stimmt.
Das ist die Art, wie erfahrene Leute mit fremden Datenbanken umgehen.

**Der eine Haken:** Eine Transaktion, die weder COMMIT noch ROLLBACK bekommt,
bleibt offen. Sie hält Sperren auf den geänderten Zeilen, und andere warten –
manchmal, bis jemand nach der Ursache sucht. Wer \`BEGIN TRANSACTION\`
schreibt, schreibt das Ende gleich mit.
`.trim(),
      aufgaben: [
        {
          slug: 'a-transaktion-warum',
          art: 'EINFACHAUSWAHL',
          titel: 'Wozu die Klammer?',
          aufgabenstellung:
            'Zwei UPDATE-Anweisungen gehören fachlich zusammen. Was gewinnt man, wenn man sie in ' +
            'eine Transaktion setzt?',
          nutzlast: {
            optionen: [
              'Entweder beide wirken oder keine – einen Zustand dazwischen gibt es nicht.',
              'Sie laufen schneller, weil die Datenbank nur einmal schreibt.',
              'Sie werden automatisch auf Fehler geprüft, bevor sie ausgeführt werden.',
              'Sie lassen sich später jederzeit rückgängig machen.',
            ],
            richtig: 0,
            aufloesung:
              'Die Transaktion garantiert, dass es keinen halben Zustand gibt. Sie prüft nichts ' +
              'vorab, und nach dem COMMIT ist nichts mehr zurückzunehmen – ROLLBACK wirkt nur ' +
              'innerhalb der offenen Transaktion.',
          },
          hinweise: [
            'Der entscheidende Fall ist: Die erste Anweisung läuft, die zweite scheitert.',
            'Was darf es danach nicht geben?',
          ],
          schwierigkeit: 3,
          konzepte: ['transaktion'],
        },
        {
          slug: 'a-transaktion-reihenfolge',
          art: 'REIHENFOLGE',
          titel: 'Erst ansehen, dann entscheiden',
          aufgabenstellung:
            'Bring die Anweisungen in die Reihenfolge, in der man eine Änderung ausprobiert, ' +
            'ohne sie zu behalten.',
          nutzlast: {
            optionen: [
              'BEGIN TRANSACTION;',
              'UPDATE Auftraege SET MitarbeiterId = 2 WHERE AuftragId = 5;',
              'SELECT MitarbeiterId FROM Auftraege WHERE AuftragId = 5;',
              'ROLLBACK TRANSACTION;',
            ],
            richtig: [0, 1, 2, 3],
            aufloesung:
              'Das SELECT steht zwischen Änderung und ROLLBACK – nur dort sieht man, was die ' +
              'Änderung bewirkt hätte. Danach nimmt ROLLBACK sie zurück, und die Datenbank ist ' +
              'wieder wie vorher.',
          },
          hinweise: [
            'Wo muss das SELECT stehen, damit es die geänderten Werte sieht?',
            'Nach dem Zurücknehmen wäre nichts mehr zu sehen.',
          ],
          schwierigkeit: 3,
          konzepte: ['transaktion', 'zuruecknehmen'],
        },
        {
          slug: 'a-rollback-schreiben',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Ausprobieren und zurücknehmen',
          aufgabenstellung:
            'Teile Auftrag 5 dem Mitarbeiter mit der Nummer 2 zu, sieh dir das Ergebnis an und ' +
            'nimm die Änderung anschließend wieder zurück.',
          erlaubteKlassen: ['SELECT', 'DML', 'TRANSAKTION'],
          startSql: 'BEGIN TRANSACTION;\n',
          loesungSql:
            'BEGIN TRANSACTION; UPDATE Auftraege SET MitarbeiterId = 2 WHERE AuftragId = 5; SELECT MitarbeiterId FROM Auftraege WHERE AuftragId = 5; ROLLBACK TRANSACTION;',
          loesungsErklaerung:
            'Innerhalb der Transaktion zeigt das SELECT den geänderten Wert – nur dieser ' +
            'Verbindung. ROLLBACK nimmt die Änderung zurück; danach steht dort wieder, was ' +
            'vorher dort stand. Nichts davon war je für jemand anderen sichtbar.',
          hinweise: [
            'Vier Anweisungen, jede mit Semikolon abgeschlossen.',
            'Das SELECT gehört zwischen die Änderung und das Ende.',
            'Zurücknehmen heißt ROLLBACK, festschreiben hieße COMMIT.',
          ],
          schwierigkeit: 4,
          konzepte: ['transaktion', 'zuruecknehmen'],
        },
        {
          slug: 'a-transaktion-offen',
          art: 'FREITEXT',
          titel: 'Vergessenes Ende',
          aufgabenstellung:
            'Jemand schreibt BEGIN TRANSACTION und ein UPDATE, geht dann in die Mittagspause ' +
            'und lässt das Fenster offen. Was ist in dieser Zeit der Zustand der Datenbank für ' +
            'alle anderen?',
          nutzlast: {
            musterantwort:
              'Die Änderung ist noch nicht endgültig und für andere nicht sichtbar – sie sehen ' +
              'die alten Werte. Die Transaktion ist aber offen und hält Sperren auf den ' +
              'geänderten Zeilen. Wer dieselben Zeilen ändern will, wartet, bis die Sperre ' +
              'freigegeben wird; das kann eine ganze Anwendung zum Stehen bringen. Erst COMMIT ' +
              'oder ROLLBACK beendet den Zustand.',
          },
          hinweise: [
            'Zwei Dinge sind zu trennen: Was sehen die anderen, und was können sie tun?',
            'Was hält die Transaktion, solange sie offen ist?',
          ],
          schwierigkeit: 4,
          konzepte: ['zuruecknehmen', 'transaktion'],
        },
      ],
    },

    // -----------------------------------------------------------------
    {
      slug: 'lektion-struktur-anlegen',
      titel: 'Die Struktur selbst',
      leitfrage:
        'Wie entsteht eigentlich eine Tabelle – und wer sorgt dafür, dass nur ' +
        'Sinnvolles darin landet?',
      dauerMinuten: 22,
      datensatz: 'handwerk',
      konzepte: ['tabelle-anlegen', 'datentyp', 'einschraenkung'],
      lernziele: [
        'Eine Tabelle mit passenden Datentypen anlegen',
        'Primärschlüssel, Fremdschlüssel und CHECK als Regeln der Datenbank einsetzen',
        'Eine bestehende Tabelle um eine Spalte erweitern, ohne die vorhandenen Zeilen zu brechen',
      ],
      text: `
Eine Tabelle ist keine leere Fläche, die alles annimmt. Sie ist die
Beschreibung dessen, was in ihr stehen darf:

\`\`\`sql
CREATE TABLE Termine (
  TerminId  int      NOT NULL CONSTRAINT PK_Termine PRIMARY KEY,
  AuftragId int      NOT NULL CONSTRAINT FK_Termine_Auftraege
                              FOREIGN KEY REFERENCES Auftraege(AuftragId),
  Beginn    datetime2 NOT NULL,
  Dauer     int      NOT NULL CONSTRAINT CK_Termine_Dauer CHECK (Dauer > 0)
);
\`\`\`

**Der Datentyp** entscheidet, was hineinpasst und wie sortiert und gerechnet
wird. \`Dauer\` als \`int\` lässt sich addieren; stünde dort \`nvarchar\`, käme
beim Sortieren „10" vor „9", und niemand fände den Grund. Für Geldbeträge
\`decimal\` und nicht \`float\`: Letzteres rundet auf eine Weise, die bei
Rechnungen auffällt.

**Die Einschränkungen** sind Regeln, die die Datenbank selbst durchsetzt:

- \`NOT NULL\` – hier muss ein Wert stehen.
- \`PRIMARY KEY\` – diese Spalte identifiziert die Zeile eindeutig.
- \`FOREIGN KEY … REFERENCES\` – hier darf nur eine Nummer stehen, die es
  drüben wirklich gibt. Ein Termin zu einem nicht existierenden Auftrag ist
  damit unmöglich, nicht bloß unerwünscht.
- \`CHECK\` – eine eigene Bedingung. Eine Dauer von null Minuten ergibt keinen
  Sinn, also lässt die Datenbank sie nicht zu.

Der Unterschied zu einer Prüfung in der Anwendung ist der entscheidende Punkt:
Die Anwendung prüft, wenn jemand über sie geht. Die Datenbank prüft **immer** –
auch bei einem Import, einem Skript oder einer zweiten Anwendung, an die
niemand mehr gedacht hat.

**Eine Spalte nachträglich hinzufügen** geht mit \`ALTER TABLE\`. Nur: In der
Tabelle stehen schon Zeilen. Eine neue Spalte mit \`NOT NULL\` und ohne
Vorgabewert wäre für sie unerfüllbar, und SQL Server lehnt die Änderung ab.
Entweder die Spalte darf NULL sein, oder sie bekommt einen \`DEFAULT\`.
`.trim(),
      aufgaben: [
        {
          slug: 'a-datentyp-waehlen',
          art: 'EINFACHAUSWAHL',
          titel: 'Welcher Typ für den Betrag?',
          aufgabenstellung:
            'Eine neue Spalte soll Rechnungsbeträge in Euro aufnehmen. Welcher Datentyp ist der ' +
            'richtige?',
          nutzlast: {
            optionen: ['decimal(10,2)', 'float', 'nvarchar(20)', 'int'],
            richtig: 0,
            aufloesung:
              'decimal speichert den Betrag genau, mit fester Nachkommastelle. float rundet ' +
              'binär und weicht bei Summen ab. Als Text ließe sich nicht rechnen und falsch ' +
              'sortieren, und int hätte keine Cent.',
          },
          hinweise: [
            'Zwei der Antworten könnten rechnen – aber nur eine rechnet genau.',
            'Was passiert bei Geldbeträgen mit Rundungsfehlern, wenn man tausend davon addiert?',
          ],
          schwierigkeit: 3,
          konzepte: ['datentyp'],
        },
        {
          slug: 'a-alter-vor-anlegen',
          art: 'EINFACHAUSWAHL',
          titel: 'Warum lehnt SQL Server das ab?',
          aufgabenstellung:
            'Die Tabelle Kunden hat acht Zeilen. Jemand schreibt ALTER TABLE Kunden ADD ' +
            'Kundennummer nvarchar(20) NOT NULL; und bekommt eine Fehlermeldung. Woran liegt es?',
          nutzlast: {
            optionen: [
              'Für die acht vorhandenen Zeilen gäbe es keinen Wert – und NULL ist nicht erlaubt.',
              'nvarchar(20) ist für eine Kundennummer zu kurz.',
              'Eine Tabelle mit Daten darf gar nicht mehr geändert werden.',
              'ALTER TABLE kennt das Wort ADD nicht.',
            ],
            richtig: 0,
            aufloesung:
              'Die Regel und die vorhandenen Daten widersprechen sich: NOT NULL verlangt einen ' +
              'Wert, den es für die acht Zeilen nicht gibt. Zwei Wege führen heraus – die Spalte ' +
              'NULL erlauben oder ihr einen DEFAULT mitgeben. Eine Tabelle mit Daten lässt sich ' +
              'sehr wohl ändern, nur eben nicht widersprüchlich.',
          },
          hinweise: [
            'Was stünde in der neuen Spalte bei den acht Zeilen, die es schon gibt?',
            'Die Meldung kommt von einer der Angaben in der Zeile – welcher?',
          ],
          schwierigkeit: 3,
          konzepte: ['tabelle-anlegen', 'einschraenkung'],
        },
        {
          slug: 'a-einschraenkungen-waehlen',
          art: 'MEHRFACHAUSWAHL',
          titel: 'Was gehört an diese Tabelle?',
          aufgabenstellung:
            'Für eine Tabelle Termine gilt: Jeder Termin gehört zu genau einem vorhandenen ' +
            'Auftrag, hat eine eindeutige Nummer und eine Dauer größer null. Welche ' +
            'Einschränkungen setzen das durch?',
          nutzlast: {
            optionen: [
              'PRIMARY KEY auf der Terminnummer',
              'FOREIGN KEY auf die Auftragsnummer',
              'CHECK auf die Dauer',
              'ORDER BY auf den Beginn',
            ],
            richtig: [0, 1, 2],
            aufloesung:
              'Die ersten drei sind Regeln, die die Datenbank bei jedem Schreibvorgang prüft. ' +
              'ORDER BY ist keine Einschränkung, sondern gehört zu einer Abfrage – eine Tabelle ' +
              'hat keine eingebaute Reihenfolge.',
          },
          hinweise: [
            'Drei der vier haben mit dem Schreiben zu tun, eine mit dem Lesen.',
            'Eine Tabelle hat keine Reihenfolge – die entsteht erst in der Abfrage.',
          ],
          schwierigkeit: 4,
          konzepte: ['einschraenkung'],
        },
        {
          slug: 'a-tabelle-anlegen',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Die Tabelle Termine anlegen',
          aufgabenstellung:
            'Lege eine Tabelle Termine an: eine eindeutige Nummer, die Auftragsnummer als ' +
            'Verweis auf Auftraege, ein Beginn und eine Dauer, die größer als null sein muss.',
          erlaubteKlassen: ['DDL'],
          startSql: 'CREATE TABLE Termine (\n',
          loesungSql:
            'CREATE TABLE Termine (TerminId int NOT NULL CONSTRAINT PK_Termine PRIMARY KEY, AuftragId int NOT NULL CONSTRAINT FK_Termine_Auftraege FOREIGN KEY REFERENCES Auftraege(AuftragId), Beginn datetime2 NOT NULL, Dauer int NOT NULL CONSTRAINT CK_Termine_Dauer CHECK (Dauer > 0));',
          loesungsErklaerung:
            'Jede Einschränkung bekommt einen eigenen Namen. Das ist keine Förmlichkeit: Wird ' +
            'sie später verletzt, nennt die Fehlermeldung diesen Namen – und CK_Termine_Dauer ' +
            'sagt einem sofort, worum es geht, während ein automatisch vergebenes ' +
            'CK__Termine__3B75D760 nichts sagt.',
          hinweise: [
            'Jede Spalte bekommt einen Namen, einen Typ und die Angabe, ob NULL erlaubt ist.',
            'Die Verweisregel heißt FOREIGN KEY REFERENCES und nennt Tabelle und Spalte.',
            'Für „größer als null" gibt es CHECK mit einer Bedingung in Klammern.',
            'Benenne die Einschränkungen selbst, mit CONSTRAINT vor der Regel.',
          ],
          schwierigkeit: 4,
          konzepte: ['tabelle-anlegen', 'einschraenkung', 'datentyp'],
        },
        {
          slug: 'a-spalte-hinzufuegen',
          art: 'ABFRAGE_SCHREIBEN',
          titel: 'Eine Spalte zu vorhandenen Zeilen',
          aufgabenstellung:
            'Die Tabelle Kunden soll eine Kundennummer als Text bekommen, höchstens 20 Zeichen. ' +
            'In der Tabelle stehen schon acht Zeilen. Schreibe die Anweisung so, dass sie ' +
            'durchläuft.',
          erlaubteKlassen: ['DDL'],
          loesungSql: 'ALTER TABLE Kunden ADD Kundennummer nvarchar(20) NULL;',
          loesungsErklaerung:
            'Die Spalte muss NULL erlauben. Mit NOT NULL und ohne Vorgabewert müsste SQL Server ' +
            'für die acht vorhandenen Zeilen einen Wert erfinden – das lehnt er ab. Die ' +
            'Alternative wäre NOT NULL zusammen mit einem DEFAULT.',
          hinweise: [
            'Die vorhandenen acht Zeilen haben noch keinen Wert für die neue Spalte.',
            'Was müsste dort stehen, wenn die Spalte NOT NULL wäre?',
            'Es gibt zwei Wege: NULL erlauben oder einen Vorgabewert mitgeben.',
          ],
          schwierigkeit: 4,
          konzepte: ['tabelle-anlegen', 'einschraenkung'],
        },
      ],
    },
  ],
};
