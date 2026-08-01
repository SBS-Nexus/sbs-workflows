# Datenschutz

Welche Daten PythonPfad verarbeitet, wozu, wie lange – und wie sie sich
einsehen und löschen lassen. Dieses Dokument beschreibt die technische
Umsetzung; eine rechtliche Datenschutzerklärung ersetzt es nicht.

---

## 1. Grundsätze

**Datensparsamkeit.** Erhoben wird, was für das Lernen nötig ist. Es gibt kein
Alter, kein Geschlecht, keinen Wohnort, keinen Beruf, keine Telefonnummer.

**Trennung.** Personenbezogener Lernfortschritt und anonyme Produktanalyse
liegen in getrennten Tabellen. Die Analysetabelle hat bewusst keinen
Fremdschlüssel auf das Konto – eine Zuordnung ist technisch nicht möglich, und
ein Integrationstest prüft, dass die Tabelle keine Nutzerspalte enthält.

**Nachvollziehbarkeit.** Die Profilseite listet auf, was gespeichert wird und
was nicht.

---

## 2. Welche Daten wozu

### 2.1 Konto

| Feld              | Zweck                                                    |
| ----------------- | -------------------------------------------------------- |
| Name              | Ansprache in der Oberfläche                              |
| E-Mail-Adresse    | Anmeldung, eindeutige Kennung                            |
| Passwort-Hash     | Anmeldung; das Passwort selbst wird nirgends gespeichert |
| Sprache, Zeitzone | Datumsformate                                            |
| Rolle             | Zugang zum Redaktionsbereich                             |

### 2.2 Onboarding

Erfahrungsstand, Lernziel, Zeitbudget, Tempo, Selbsteinschätzung. Alles
Selbstauskünfte; sie steuern ausschließlich die Zusammenstellung des Lernpfads
und lassen sich jederzeit im Profil ändern.

### 2.3 Lernverlauf

| Daten                                  | Zweck                                                        |
| -------------------------------------- | ------------------------------------------------------------ |
| Abgaben samt eingereichtem Code        | Bewertung, Fehleranalyse, Wiederauffinden des eigenen Stands |
| Ergebnis und Fehlerart                 | Fehlermuster im Dashboard, Gewichtung im Kompetenzmodell     |
| Genutzte Hinweise                      | Eigenständigkeit im Kompetenzmodell                          |
| Bearbeitungsdauer                      | nur Anzeige; **kein** Einfluss auf die Bewertung             |
| Selbsteinschätzung                     | Vergleich von Gefühl und Ergebnis                            |
| Kompetenzstand je Konzept              | Wiederholungsplanung, Dashboard                              |
| Lektionsfortschritt und Zwischenstände | Fortsetzen auf einem anderen Gerät                           |
| Projektdateien und Reflexion           | Abnahme des Projekts                                         |
| Lernsitzungen                          | Anzeige der aktiven Lernzeit                                 |

### 2.4 Tutor

Gespeichert wird die **Antwort** des Lerncoachs, der genutzte Modus und der
Anbieter. **Nicht** gespeichert wird die Frage und nicht der Code, auf den sie
sich bezog. Der Verlauf bleibt dadurch nachvollziehbar, ohne Lösungen zu
horten.

### 2.5 Anonyme Produktanalyse

Ereignisse wie „Lektion abgeschlossen“, „Hinweis aufgedeckt“, „Aufgabe
bestanden“ – mit Inhalts-Slug, optionalem Messwert und **auf den Tag
gerundetem** Datum. Ohne Konto-ID, ohne IP-Adresse, ohne Sitzungskennung.

Damit lässt sich beantworten: An welcher Lektion brechen Menschen ab? Welche
Aufgabe braucht auffällig viele Hinweise? Nicht beantwortbar ist: Wer war das?

### 2.6 Was nicht erhoben wird

- Reflexionstexte aus Lektionen (nur gezählt, nie im Klartext gespeichert)
- Fragen an den Lerncoach
- Werbekennungen, Tracking-Pixel, Cookies von Dritten
- IP-Adressen über die technisch notwendige Verarbeitung hinaus

---

## 3. Cookies

| Cookie               | Inhalt              | Eigenschaften                                              | Zweck                                |
| -------------------- | ------------------- | ---------------------------------------------------------- | ------------------------------------ |
| `pythonpfad_session` | opakes Zufallstoken | `httpOnly`, `SameSite=Lax`, `secure` (Produktion), 30 Tage | Anmeldung                            |
| `pythonpfad_csrf`    | Zufallswert         | für JavaScript lesbar, sonst wie oben                      | Schutz vor Anfragen fremder Herkunft |

Zusätzlich liegt im `localStorage` die Farbschema-Auswahl. Beides ist technisch
notwendig; es gibt keine Analyse- oder Werbe-Cookies.

---

## 4. Aufbewahrung

| Daten                     | Frist                                                    |
| ------------------------- | -------------------------------------------------------- |
| Konto und Kompetenzstand  | bis zur Löschung durch die Person                        |
| Abgaben (`Attempt`)       | `ATTEMPT_RETENTION_DAYS`, Standard 365 Tage              |
| Sitzungen                 | 30 Tage; abgelaufene werden bei jeder Anmeldung entfernt |
| Anonyme Analyseereignisse | unbegrenzt (kein Personenbezug)                          |

`applyRetentionPolicy()` setzt die Frist um. Der Aufruf lässt sich als
regelmäßige Aufgabe einplanen (siehe [DEPLOYMENT.md](DEPLOYMENT.md)).

---

## 5. Auskunft und Löschung

### Datenexport

**Profil → Daten herunterladen.** Es entsteht eine JSON-Datei mit Profil,
Lernfortschritt, allen Abgaben samt eingereichtem Code, Kompetenzstand,
Projekten, Lernsitzungen, geplanten Wiederholungen und Tutor-Antworten. Die
Datei wird im Browser erzeugt und nirgends zwischengespeichert.

### Konto löschen

**Profil → Konto löschen**, mit Bestätigung durch Eingabe des Wortes
`LÖSCHEN`. Die Löschung wirkt sofort und vollständig: Alle nutzerbezogenen
Beziehungen sind `onDelete: Cascade`, sodass ein einziger Aufruf sämtliche
Daten entfernt – Abgaben, Kompetenzstand, Lektionsfortschritt, Wiederholungen,
Projekte, Lernsitzungen, Tutor-Antworten, Lernpfade und Sitzungen.

Ein Integrationstest prüft nach der Löschung jede dieser Tabellen einzeln auf
null verbleibende Einträge, ein End-to-End-Test den gesamten Ablauf
einschließlich der anschließend fehlschlagenden Anmeldung.

Die anonymen Analyseereignisse bleiben bestehen. Sie enthalten keinen
Personenbezug und lassen sich der gelöschten Person nicht zuordnen.

---

## 6. Externer KI-Anbieter

**Standardmäßig wird kein externer Dienst kontaktiert.** Der Lerncoach arbeitet
regelbasiert auf dem eigenen Server.

Eine Übermittlung findet nur statt, wenn **beides** zutrifft:

1. Ein Anbieter ist über `AI_TUTOR_PROVIDER` und `AI_TUTOR_API_KEY`
   eingerichtet.
2. Die lernende Person hat im Profil ausdrücklich zugestimmt.

Ist kein Anbieter eingerichtet, erscheint die Einwilligungsfrage gar nicht
erst – stattdessen der Hinweis, dass es nichts gibt, dem zuzustimmen wäre.

### Was übermittelt wird

Modus der Anfrage, Aufgabentitel, Aufgabenstellung, Konzeptbeschreibungen,
Anzahl bisheriger Versuche, der Code im Editor, die Fehlermeldung.

### Was nicht übermittelt wird

Name, E-Mail-Adresse, Konto-ID, Lernhistorie, Kompetenzwerte, die hinterlegte
Musterlösung.

Die Einwilligung lässt sich jederzeit zurücknehmen. Der Lerncoach funktioniert
danach unverändert weiter – regelbasiert.

---

## 7. Datenverarbeitung im Browser

Der geschriebene Python-Code wird **im Browser** ausgeführt. Er wird für die
Bewertung an den eigenen Server übermittelt und dort als Teil der Abgabe
gespeichert, aber an keinen Dritten weitergegeben. Die Python-Laufzeit liegt
selbst gehostet vor; es wird kein CDN kontaktiert, sodass auch kein Dritter
erfährt, wer die Anwendung nutzt.
