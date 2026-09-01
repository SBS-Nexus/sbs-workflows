# Lernmodell

Wie AIPfad entscheidet, was als beherrscht gilt und wann wiederholt wird.
Direkt aus PythonPfad/SQLPfad übernommen (siehe dortige
`docs/LERNMODELL.md`), an einer Stelle bewusst angepasst: keine
Code-Ausführung, daher eine andere Fehlerkategorisierung.

| Baustein             | Ort im Code                                  | Version |
| -------------------- | -------------------------------------------- | ------- |
| Kompetenzberechnung  | `src/domain/mastery/mastery.ts`              | 1.0.0   |
| Wiederholungsplanung | `src/domain/scheduling/spaced-repetition.ts` | 1.0.0   |
| Hinweisleiter        | `src/domain/hints/hint-ladder.ts`            | 1.0.0   |
| Einstufung           | `src/domain/placement/placement.ts`          | 1.0.0   |
| Aufgabenbewertung    | `src/domain/grading/grade.ts`                | –       |

Jeder gespeicherte Kompetenzwert trägt die Version des Algorithmus, mit dem
er entstanden ist.

## 1. Kompetenzberechnung

### Zustand je Konzept

`masteryScore` (0–100, Orientierungswert), `stability` (Gedächtnisstabilität
in Tagen), `difficulty` (personenbezogen, 1,0–5,0), `successfulRetrievals`,
`failedRetrievals`, `transferSuccesses`.

### Was einfließt

Korrektheit (PASSED/PARTIAL/FAILED/SOLUTION_REVEALED) × Eigenständigkeit
(je Hinweis 18 % weniger Zugewinn, mindestens 25 % bleiben) ×
Gerüst-Stufen-Faktor (1→0,30 … 6→1,15) × Aufgabenschwierigkeit ×
Konzeptgewicht × abnehmender Ertrag (`(100−Stand)/100 + 0,15`) ×
Transferbonus (×1,45) × Bonus für verzögerten Abruf (×1,25).

**Nicht** eingerechnet: Bearbeitungsgeschwindigkeit.

### Fehlerarten (Unterschied zu PythonPfad)

PythonPfad kategorisiert Laufzeitfehler (SyntaxError, IndentationError, …) —
diese Ausbaustufe führt keinen Code aus, also gibt es keine. Stattdessen:

| Kategorie       | Bedeutung                                 | Abzug                                         |
| --------------- | ----------------------------------------- | --------------------------------------------- |
| `SURFACE`       | Detail übersehen, kein Verständnisproblem | −2                                            |
| `MISCONCEPTION` | grundlegendes Fehlverständnis             | −7 (+4 bei Wiederholung desselben Fehlertyps) |
| `INCOMPLETE`    | teilweise richtig                         | 35 % des möglichen Zugewinns                  |

### Musterlösung angesehen

Kein Zugewinn, bestehender Wert wird auf 59 gedeckelt — unter
"grundsätzlich anwendbar". Zählt ausdrücklich nicht als Beherrschung.

### Bänder statt Zahlen

| Wert   | Band                    | Bedeutung                                     |
| ------ | ----------------------- | --------------------------------------------- |
| 0–39   | Noch neu                | wenig Gelegenheit zum eigenständigen Anwenden |
| 40–59  | Im Aufbau               | mit Hilfen ja, ohne Vorlage wackelig          |
| 60–79  | Grundsätzlich anwendbar | in bekannten Situationen einsetzbar           |
| 80–89  | Sicher                  | auch ohne Vorlage und in wechselnden Aufgaben |
| 90–100 | Nachhaltig beherrscht   | Abruf gelingt auch nach Pausen                |

Freischaltgrenze für Voraussetzungen: 70 (`meetsPrerequisite`).

### Metakognition

Vor ausgewählten Aufgaben wird die eigene Sicherheit erfasst (unsicher …
sehr sicher). Hohe Sicherheit bei falscher Antwort → zusätzlicher Abzug und
frühere Wiederholung. Geringe Sicherheit bei richtiger Antwort → kein
Abzug, aber verkürzte Stabilität.

## 2. Wiederholungsplanung

Basisleiter `[0, 1, 3, 7, 14, 30]` Tage, individuell gestreckt/gestaucht
über Stabilität (×0,6–2,2), personenbezogene Schwierigkeit (×0,6–1,6),
Kompetenzwert (≥90 → ×1,30, <60 → ×0,70), Transfererfolge (≥2 → ×1,15),
Unsicherheit trotz richtiger Lösung (×0,70). Obergrenze 120 Tage.

Nach Misserfolg: `MISCONCEPTION` → zurück auf Stufe 0, Wiederholung noch in
derselben Sitzung möglich. `SURFACE` → nur eine Stufe zurück, Wiederholung
am nächsten Tag.

**Nicht modelliert in dieser Ausbaustufe:** kuratierte, modulübergreifende
Wiederholungssets (`ReviewSet` aus PythonPfad) — lohnt sich erst ab
deutlich mehr Modulen. `/wiederholen` plant und zeigt einzelne fällige
Aufgaben (höchstens 12 je Runde, überfällige zuerst).

## 3. Hinweisleiter

5 Stufen: Denkimpuls (sofort) → Konzept-Hinweis (nach 1 Versuch) → Struktur
(nach 1 Versuch) → Teilcode/Teillösung (nach 2 Versuchen) → vollständige
Erklärung (nach 3 Versuchen). Nicht freigegebene Hinweise verlassen den
Server nicht — der Client kennt nur Stufe, Art und Sperrbegründung.

## 4. Einstufung (Placement)

`content/placement.ts`: 8 Fragen, aufsteigend von logischem Denken ohne
Fachbegriff bis zu AI-Konzepten. "Weiß ich nicht" ist immer gleichwertig zu
einer falschen Antwort. Ergebnis: 0–100 sowie Konzepte, die _plausibel_
schon sitzen (nur wenn **alle** zugehörigen Fragen richtig beantwortet
wurden). **Aktueller Stand:** Die Domainlogik und die Fragen sind fertig
und unit-getestet, aber noch nicht in `app/onboarding/` eingehängt — das
Onboarding führt derzeit direkt zum Pfad. Nächster sinnvoller Schritt, in
[`LEHRPLAN.md`](LEHRPLAN.md) vermerkt.

## 5. Was bewusst nicht getan wird

Keine Punktesammelmechanik, keine Verlustmechanik, keine Ranglisten, keine
scheinwissenschaftliche Genauigkeit (Bänder statt Nachkommastellen). Eine
Pause kostet keinen Fortschritt.
