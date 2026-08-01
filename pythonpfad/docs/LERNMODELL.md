# Lernmodell

Wie PythonPfad entscheidet, was als beherrscht gilt, wann wiederholt wird und
wie viel Hilfe wann verfügbar ist. Alles hier Beschriebene ist im Code
umgesetzt, versioniert und durch Tests abgesichert.

| Baustein             | Ort im Code                                  | Version |
| -------------------- | -------------------------------------------- | ------- |
| Kompetenzberechnung  | `src/domain/mastery/mastery.ts`              | 1.0.0   |
| Wiederholungsplanung | `src/domain/scheduling/spaced-repetition.ts` | 1.0.0   |
| Hinweisleiter        | `src/domain/hints/hint-ladder.ts`            | 1.0.0   |
| Einstufung           | `src/domain/placement/placement.ts`          | 1.0.0   |
| Aufgabenbewertung    | `src/domain/grading/grade.ts`                | –       |

Jeder gespeicherte Kompetenzwert trägt die Version des Algorithmus, mit dem er
entstanden ist. Eine spätere Änderung entwertet alte Daten dadurch nicht
stillschweigend.

---

## 1. Aufbau einer Lektion

Jede Lektion folgt demselben Schema:

| Abschnitt       | Inhalt                                                                |
| --------------- | --------------------------------------------------------------------- |
| Lernziel        | konkret und überprüfbar formuliert, nie „du lernst X kennen“          |
| Alltagsproblem  | eine Situation, die das Konzept nötig macht                           |
| Mentales Modell | Analogie, die keine falschen technischen Vorstellungen erzeugt        |
| Beispiel        | vollständiges Programm mit Zeilenanmerkungen, Ausgabe und Nachvollzug |
| Stolperstellen  | typische Fehler mit Grund und Abhilfe                                 |
| Aufgaben        | in aufsteigender Selbstständigkeit                                    |
| Reflexion       | kurze Fragen; der Text wird nicht gespeichert                         |
| Wiederholung    | wird automatisch geplant                                              |

Ein Test prüft für jede Lektion, dass alle Lernziele mit „kannst“, „erkennst“
oder „weißt“ formuliert sind – „kennenlernen“ genügt nicht.

### Abbau der Hilfen

Jede Aufgabe hat eine Gerüst-Stufe von 1 bis 6:

| Stufe | Bedeutung                       | Faktor im Kompetenzmodell |
| ----- | ------------------------------- | ------------------------- |
| 1     | vollständig gelöstes Beispiel   | 0,30                      |
| 2     | Beispiel mit Erklärungen        | 0,50                      |
| 3     | Code mit einzelnen Lücken       | 0,75                      |
| 4     | Pseudocode oder Lösungsstruktur | 0,90                      |
| 5     | nur Aufgabenbeschreibung        | 1,00                      |
| 6     | Transfer ohne Hilfen            | 1,15                      |

Ein Test stellt sicher, dass **jede** Lektion mindestens eine Aufgabe mit
Stufe 4 oder höher enthält. Niemand soll eine Lektion abschließen können, ohne
irgendwann ohne Vorlage gearbeitet zu haben.

---

## 2. Kompetenzberechnung

### 2.1 Zustand je Konzept

| Feld                                        | Bedeutung                                                      |
| ------------------------------------------- | -------------------------------------------------------------- |
| `masteryScore`                              | 0–100, Orientierungswert                                       |
| `stability`                                 | Gedächtnisstabilität in Tagen                                  |
| `difficulty`                                | personenbezogene Schwierigkeit, 1,0–5,0                        |
| `successfulRetrievals` / `failedRetrievals` | Anzahl gelungener bzw. misslungener Abrufe                     |
| `transferSuccesses`                         | bestandene Transferaufgaben – Kernbeleg für echtes Verständnis |

### 2.2 Was in eine Veränderung einfließt

- **Korrektheit** – bestanden, teilweise, nicht bestanden
- **Eigenständigkeit** – je genutztem Hinweis 18 % weniger Zugewinn, mindestens
  25 % bleiben
- **Gerüst-Stufe** – siehe Tabelle oben
- **Aufgabenschwierigkeit** – 1 bis 5
- **Konzeptgewicht** – das erstgenannte Konzept einer Aufgabe zählt voll,
  weitere zur Hälfte
- **Abstand zur letzten Übung** – ab einem Tag gilt es als verzögerter Abruf
- **Fehlerart** – Schreibweise wird deutlich schwächer gewichtet als Konzept
- **Selbsteinschätzung** – siehe 2.4

**Nicht** eingerechnet: Bearbeitungsgeschwindigkeit. Gründliches Nachdenken ist
erwünscht, nicht Tempo.

### 2.3 Die Regeln

| Situation                         | Wirkung                                           |
| --------------------------------- | ------------------------------------------------- |
| vollständig eigenständig gelöst   | starke Erhöhung (Grundwert 18 Punkte, moduliert)  |
| gelöst nach kleinem Hinweis       | moderate Erhöhung                                 |
| gelöst nach Teilcode              | geringe Erhöhung                                  |
| teilweise richtig                 | 35 % des Zugewinns                                |
| Transferaufgabe bestanden         | Faktor 1,45 zusätzlich                            |
| verzögerte Wiederholung bestanden | Faktor 1,25 zusätzlich; Stabilität wächst stärker |
| **Musterlösung angesehen**        | **kein Zugewinn; Deckelung bei 59**               |
| Syntax- oder Einrückungsfehler    | −2 Punkte                                         |
| Konzept- oder Logikfehler         | −7 Punkte                                         |
| derselbe Fehlertyp erneut         | zusätzlich −4 Punkte                              |
| sicher gefühlt, aber falsch       | zusätzlich −2 Punkte                              |
| unsicher gefühlt, aber richtig    | kein Abzug; Stabilität × 0,75 (frühere Festigung) |

**Abnehmender Ertrag.** Der Zugewinn wird mit `(100 − Stand)/100 + 0,15`
skaliert. Von 20 auf 40 geht es schneller als von 85 auf 95.

**Deckelung nach gesehener Lösung.** Wer die Musterlösung ansieht, bekommt
keinen Zugewinn, und ein bereits höherer Wert wird auf 59 gedeckelt – also
unter „grundsätzlich anwendbar“. Anschließend folgt eine ähnliche Aufgabe ohne
Vorlage. Eine gesehene Lösung zählt ausdrücklich nicht als gemeisterte
Aufgabe.

### 2.4 Metakognition

Vor ausgewählten Aufgaben schätzt die lernende Person ihre Sicherheit ein
(unsicher · eher unsicher · eher sicher · sehr sicher). Daraus entstehen zwei
Wirkungen:

1. **Hohe Sicherheit bei falscher Antwort** → zusätzlicher Abzug und frühere
   Wiederholung. Solche Stellen werden sonst übersehen.
2. **Geringe Sicherheit bei richtiger Antwort** → kein Abzug, aber verkürzte
   Stabilität. Das Vertrauen soll nachziehen können.

Das Dashboard vergleicht Durchschnittssicherheit und tatsächliche Trefferquote
und formuliert behutsam: bei Überschätzung ein konkreter Vorschlag zur
Selbstprüfung, bei Unterschätzung eine Ermutigung, bei guter Übereinstimmung
eine Bestätigung. Unter fünf Datenpunkten wird ausdrücklich keine Aussage
gemacht.

### 2.5 Bänder statt Zahlen

| Wert   | Band                    | Was das bedeutet                              |
| ------ | ----------------------- | --------------------------------------------- |
| 0–39   | Noch neu                | wenig Gelegenheit zum eigenständigen Anwenden |
| 40–59  | Im Aufbau               | mit Hilfen ja, ohne Vorlage wackelig          |
| 60–79  | Grundsätzlich anwendbar | in bekannten Situationen einsetzbar           |
| 80–89  | Sicher                  | auch ohne Vorlage und in wechselnden Aufgaben |
| 90–100 | Nachhaltig beherrscht   | Abruf gelingt auch nach längeren Pausen       |

Nach außen wird das Band kommuniziert, nicht die Nachkommastelle. Ein Wert von
82 ist keine objektive Messung menschlicher Fähigkeit, und die Oberfläche
stellt ihn auch nicht so dar – sie schreibt ausdrücklich „Orientierungswert,
keine Messung“ dazu.

**Freischaltgrenze.** Für zentrale Voraussetzungen gilt ein Wert von 70 als
erfüllt (`meetsPrerequisite`).

---

## 3. Wiederholungsplanung

### 3.1 Basisleiter

`[0, 1, 3, 7, 14, 30]` Tage – Index ist die Anzahl bisheriger erfolgreicher
Wiederholungen. Die Leiter ist der Ausgangspunkt, nicht das Ergebnis.

### 3.2 Individuelle Anpassung

| Einflussfaktor                      | Wirkung auf das Intervall |
| ----------------------------------- | ------------------------- |
| ohne Hinweise gelöst                | × 1,15                    |
| mit kleiner Hilfe gelöst            | × 0,85                    |
| mit deutlicher Hilfe (≥ 3 Hinweise) | × 0,60                    |
| Stabilität                          | × 0,6 bis 2,2             |
| personenbezogene Schwierigkeit      | × 0,6 bis 1,6             |
| Kompetenzwert ≥ 90                  | × 1,30                    |
| Kompetenzwert < 60                  | × 0,70                    |
| mindestens zwei Transfererfolge     | × 1,15                    |
| unsicher trotz richtiger Lösung     | × 0,70                    |

Obergrenze 120 Tage.

### 3.3 Nach einem Misserfolg

- **Konzept- oder Logikfehler:** zurück auf Stufe 0, Wiederholung noch in
  derselben Lerneinheit.
- **Reiner Syntax- oder Einrückungsfehler:** nur eine Stufe zurück,
  Wiederholung am nächsten Tag. Ein vergessener Doppelpunkt ist kein
  Verständnisproblem.

Jede geplante Wiederholung trägt eine Begründung im Klartext, die im
Wiederholungscenter angezeigt wird – etwa: „Nächste Wiederholung in 7 Tagen
(ohne Hinweise gelöst, Konzept sitzt zuverlässig).“

### 3.4 Interleaving

Beim Zusammenstellen einer Wiederholungsrunde gelten drei Regeln:

1. Überfällige Aufgaben zuerst, danach die mit dem niedrigsten Kompetenzstand.
2. Aufgaben zum selben Konzept stehen nicht direkt hintereinander.
3. **Anfängerschutz:** Solange weniger als drei verschiedene Konzepte
   eingeführt sind, wird nicht gemischt. In den ersten Lektionen wäre das nur
   Überforderung.

Höchstens zwölf Aufgaben je Runde – auch nach einer längeren Pause.

Zusätzlich gibt es drei kuratierte Wiederholungssets, die ausdrücklich über
Module hinweg mischen. Sie werden erst nach einem zeitlichen Abstand
freigegeben (1, 3 und 7 Tage nach Abschluss der jeweiligen Lektionen): Ein
Abruf am selben Tag misst vor allem das Kurzzeitgedächtnis.

---

## 4. Hinweisleiter

| Stufe | Art                                                             | Ab wann verfügbar        |
| ----- | --------------------------------------------------------------- | ------------------------ |
| 1     | Denkimpuls – eine Frage, die zum nächsten eigenen Schritt führt | sofort                   |
| 2     | Konzept-Hinweis – Erinnerung an das Prinzip                     | nach 1 eigenem Versuch   |
| 3     | Struktur – Lösungsweg als Pseudocode, ohne Python               | nach 1 eigenem Versuch   |
| 4     | Teilcode – nur der kritische Ausschnitt                         | nach 2 eigenen Versuchen |
| 5     | Vollständige Erklärung                                          | nach 3 eigenen Versuchen |

Zusätzlich müssen die Stufen der Reihe nach genommen werden. **Nicht
freigegebene Hinweise verlassen den Server gar nicht erst** – der Browser kennt
nur Stufe, Art und Sperrbegründung.

Die Musterlösung wird erst freigegeben, wenn die Leiter vollständig durchlaufen
und mindestens drei eigene Versuche unternommen wurden. Danach greift die
Deckelung aus Abschnitt 2.3, und es folgt eine ähnliche Aufgabe ohne Vorlage.

Sperrbegründungen sind ermutigend statt abweisend formuliert: „Versuche es
zuerst noch einmal selbst. Danach wird dieser Hinweis frei.“

---

## 5. Rückmeldung bei Fehlern

Eine Python-Fehlermeldung wird nie nur angezeigt. `explainPythonError()`
liefert zu jedem Fehlertyp:

1. **Bedeutung** in verständlichem Deutsch
2. **Wahrscheinliche Ursachen** – als Möglichkeiten, nicht als Diagnose
3. **Suchstrategie** – konkrete nächste Schritte
4. **Selbstprüfungsfrage**

Abgedeckt sind unter anderem `SyntaxError`, `IndentationError`, `TabError`,
`NameError`, `UnboundLocalError`, `TypeError`, `IndexError`, `KeyError`,
`ValueError`, `AttributeError`, `ZeroDivisionError`, `ModuleNotFoundError`,
`RecursionError`, die Zeitüberschreitung und die runnereigene Meldung bei
fehlenden Eingaben. Für unbekannte Typen greift eine brauchbare
Rückfallerklärung, die zum Lesen des Tracebacks von unten nach oben anleitet.

### Anforderungen an jede Rückmeldung

Feedback ist konkret, kurz, verständlich und handlungsorientiert. Ein Test
stellt sicher, dass keine Floskeln wie „Leider falsch“ oder „Versuche es noch
einmal“ vorkommen.

Beispiele aus der Umsetzung:

- Ausgabe vorhersagen: „Bis Zeile 1 stimmt die Vorhersage. Ab Zeile 2 weicht
  sie ab. Gehe den Code ab dieser Stelle Schritt für Schritt durch und notiere
  die Werte der beteiligten Variablen.“
- Parsons: „Die Reihenfolge stimmt, die Einrückung noch nicht. Überlege bei
  jeder Zeile: Soll sie in jedem Durchlauf ausgeführt werden oder nur einmal
  danach?“
- Mehrfachauswahl: „Eine zutreffende Aussage fehlt noch.“ – ohne zu verraten,
  welche.

---

## 6. Abschluss einer Lektion

Eine Lektion gilt als abgeschlossen, wenn **jede** ihrer Aufgaben mindestens
einmal bestanden wurde. Durchklicken genügt nicht, und eine angesehene
Musterlösung zählt nicht als Bestehen. Wer zu früh abschließen will, bekommt
die Zahl der offenen Aufgaben genannt.

---

## 7. Einstufung und Lernpfad

### Einstufung

Acht Fragen, kein Zeitlimit, aufsteigend von „logisches Denken ohne jeden
Fachbegriff“ bis „Python lesen“. Zu jeder Frage gehört „Weiß ich noch nicht“
als gleichwertige Antwort – sie wird nicht schlechter bewertet als ein falscher
Rateversuch.

Ergebnis: ein Wert von 0–100 sowie eine Liste plausibel belegter Konzepte. Ein
Konzept gilt nur dann als gezeigt, wenn **alle** zugehörigen Fragen richtig
beantwortet wurden – eine einzelne richtige Antwort kann geraten sein.

### Pfadaufbau

**Grundregel: Es wird nie eine Lektion übersprungen.** Die Einstufung kann
Lektionen höchstens als „wahrscheinlich bekannt“ markieren – sie bleiben im
Pfad und werden als kurze Auffrischung angeboten (40 % der veranschlagten
Zeit). Das verhindert Lücken, auf die später aufgebaut wird.

Das Zeitbudget und das gewünschte Tempo (0,75 / 1,0 / 1,35) ergeben eine
Schätzung der Lerntage. Der Pfad wird der lernenden Person im Klartext
begründet.

### Nächster Schritt

Priorität: fällige Wiederholungen → begonnene Lektion → nächste offene
Lektion → Projekte. Festigen vor Erweitern.

---

## 8. Was bewusst nicht getan wird

- **Keine Punktesammelmechanik.** Fortschritt wird sichtbar gemacht, nicht in
  eine Währung übersetzt.
- **Keine Verlustmechanik.** Nichts verfällt, nichts geht verloren.
- **Keine Beschämung bei Unterbrechungen.** Eine Serie von null Tagen liest
  sich als „Heute noch nichts geübt. Das ist völlig in Ordnung – auch zehn
  Minuten zählen.“
- **Keine Ranglisten und keine künstliche Dringlichkeit.**
- **Keine scheinwissenschaftliche Genauigkeit.** Bänder statt Nachkommastellen,
  mit ausdrücklichem Hinweis auf die Grenzen der Aussage.
