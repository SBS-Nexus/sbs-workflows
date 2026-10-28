# Lernpfade — Design System Contract

Stand: 2026-10-28

## Zweck

Dieser Vertrag definiert die gemeinsamen UI-Invarianten von PythonPfad,
SQLPfad, AIPfad und zukünftigen Lernpfaden.

Er ersetzt nicht die fachlichen Designs. Er legt fest, welche Teile der
Oberfläche sich wie **ein Produkt** verhalten müssen.

## 1. Plattform-Chrome

Die Dachleiste verwendet in allen Apps dieselben semantischen CSS-Tokens:

```css
--lp-platform-bg
--lp-platform-fg
--lp-platform-muted
--lp-platform-subtle
--lp-platform-hover
--lp-platform-border
```

Aktuelle Werte:

```text
background     #111827
foreground     #ffffff
muted          #d1d5db
subtle         #9ca3af
hover          #c7d2fe
border         #374151
```

Diese Werte dürfen nicht pro Fachpfad überschrieben werden. Die Fachfarbe
beginnt unterhalb der Plattformleiste.

Seit LP-03A teilen Dachleiste, App-Kopf, Hauptnavigation und ihre Menüs
außerdem die Shell-Tokens `--lp-shell-*` (Fläche, Text, Rand, Fokus, Radius,
Abstände, Menü-Elevation, Bewegung, Pfad-Akzent) und einen gemeinsamen
Navigationsvertrag. Werte, Matrix und Synchronisation:
`docs/learning-shell/README.md`.

## 2. Gemeinsame Ebenen

### Ebene A — Plattform

Immer gleich:

- Lernpfade Dachmarke
- Wechsel zurück zum Hub
- globale Wiederholung
- später globaler Fortschritt und Konto

### Ebene B — Lernpfad

Strukturell gleich, fachlich akzentuiert:

- Überblick
- Lernen
- Üben oder Labs
- Projekte
- Wiederholen
- Fortschritt
- Profil

### Ebene C — Fachwerkzeug

Bewusst unterschiedlich:

- Python Editor
- SQL Runner
- Git State / Branch Visualizer
- AI Tokenizer / RAG / Agent Lab
- Sprach-/Vokabelkarten

## 3. Semantische UI-Zustände

Diese Bedeutungen dürfen nicht je App neu erfunden werden:

| Zustand | Bedeutung |
|---|---|
| neutral | normale Information |
| info | erklärender Hinweis |
| success | erfolgreich abgeschlossen |
| warning | Aufmerksamkeit erforderlich |
| danger | Fehler / destruktive Aktion |
| due | Wiederholung ist fällig |
| in-progress | begonnen, noch nicht abgeschlossen |
| locked | fachlich noch nicht verfügbar |

Farbe ist nie das einzige Signal. Text und/oder Symbol müssen die Bedeutung
ebenfalls tragen.

Seit LP-03B ist diese Tabelle ausführbar: `docs/learning-feedback/`
(`learning-feedback.ts` mit genau diesen acht IDs, `learning-feedback.css`
mit den Tokens `--lp-feedback-*`), bytegleich in PythonPfad, SQLPfad, AIPfad
und im Hub. Die `Badge`-/`Callout`-Komponenten der Apps sind kleine Adapter
darauf; ältere Tonnamen bleiben gültig (`caution` → `warning`,
`alert` → `danger`). Gleiche Zustände zeigen in allen Lernpfaden dieselben
Farben — unabhängig vom Pfad-Akzent. Callouts sind statisch keine
Live-Region; `live` meldet höflich, auch `danger` ist kein `role="alert"`.
Details, Farbwerte und gemessene Kontraste: `docs/learning-feedback/README.md`.

## 4. Interaktionsvertrag

### Buttons

- Primary: genau eine primäre Handlung pro Entscheidungsbereich
- Secondary: alternative sichere Handlung
- Ghost: Navigation oder niedrige Priorität
- Danger: nur für destruktive Aktion

Seit LP-03C ist dieser Abschnitt ausführbar: `docs/learning-components/`
(`learning-components.ts`, `learning-components.css` mit den Tokens
`--lp-ui-*`), bytegleich in PythonPfad, SQLPfad, AIPfad und im Hub. Zu den
vier Absichten kommen `danger-secondary` (Einstieg in eine destruktive
Handlung, öffnet erst die Bestätigung) und `on-dark`/`on-dark-secondary`
(dunkle Kopfflächen). Größen `sm`/`md`/`lg` mit mindestens 36/44/52 px.

Tragende Knöpfe haben eine **taktile Unterkante**, die beim Drücken um 2 px
einsinkt — der Zustand „gedrückt" ist an der Geometrie erkennbar, nicht nur
an einer Farbe, und bleibt unter „Bewegung reduzieren" erhalten. Gesperrt ist
flach (eigene graue Fläche, keine Kante), nicht bloß durchscheinend. Primär
trägt den Pfad-Akzent (`data-lp-app` am `<html>`), Gefahr die Statusfarbe
aus LP-03B. Beschriftung in der Produktschrift, Satzschreibung, keine
Großbuchstaben.

### Cards

Eine Card ist entweder:

1. Information oder
2. vollständig klickbares Ziel.

Keine Card mit mehreren konkurrierenden Click-Zonen ohne fachlichen Grund.

Seit LP-03C: `Card` (Information) und `CardLink` (die ganze Karte ist der
Link, mit derselben taktilen Unterkante wie ein Knopf). Betonung `accent`
(nächster Schritt) oder `danger` (destruktiver Bereich) nur zusätzlich zum
Text. Fläche und Rand nehmen eine Bereichsfarbe leicht an; sie kommt über
`--lp-ui-area`, das PythonPfad und SQLPfad aus der Modulfarbe setzen.

### Progress

Fortschritt zeigt immer:

- numerischen Wert
- verständliche Beschriftung
- keine reine Farbcodierung

Seit LP-03C kommt der Balken aus dem Komponentenvertrag: kräftige, runde
Spur (12 px), `aria-valuetext` „3 von 10" bzw. „62 %", abgerundete Prozente
(99,6 % sind nicht fertig), und ungültige Daten ergeben einen leeren Balken,
nie einen vollen. Ein abgeschlossener Balken bekommt einmal einen
Lichtstreif — nicht unter „Bewegung reduzieren".

**Progress Cards (LP-07, `/fortschritt`):** eine Karte je Pfad mit fester
Reihenfolge (Python, SQL, AI, Vokabeln). Jede Kennzahl ist ein Paar aus
Beschriftung und Wert (`dl`), quellspezifische Bedeutungen stehen als Text
darunter („Gefestigt heißt in PythonPfad …", „SQLPfad nimmt Projekte nicht
fachlich ab."). Ein Balken erscheint nur für den Lektionsfortschritt und nur
zusammen mit „x von y"; es gibt kein Gesamtprozent über Pfade.

Zustand einer Quelle immer als Text, nie als leere Karte oder 0:

| Zustand | Darstellung |
|---|---|
| angemeldet, geprüft | `LIVE · <App>` und Kennzahlen; echte 0 nur hier |
| nicht angemeldet | Callout `info` „Nicht angemeldet" und Weg „In <App> anmelden" |
| nicht erreichbar / ungültig | Callout `warning` „Nicht erreichbar"; andere Pfade bleiben |
| nicht verbunden | Callout `neutral` „Nicht verbunden", Weg „In <App> öffnen" |
| lädt | Callout `neutral` „Wird geladen" (höflich angesagt), ohne Zahlen |

Seit LP-03B kommen diese Hinweise aus dem gemeinsamen Statusvertrag
(`docs/learning-feedback/README.md`, Zuordnung dort).

### Leer- und Fehlerzustände

Ein leerer Bereich sagt eines von drei Dingen, und die Gestaltung
unterscheidet sie (LP-03C): `start` — hier ist noch nichts, `done` — gerade
nichts zu tun, weil alles erledigt ist (Erfolgston, kein Mangel), `filtered`
— die Auswahl trifft nichts. Größe `regular` für einen eigenen Bereich,
`compact` für einen Hinweis im Panel. Leerzustände sind keine Live-Region.

Fehler- und 404-Seiten aller Apps zeigen denselben `ErrorState`
(`unexpected`, `not-found`, `unavailable`). Eine fehlende Seite ist kein
Fehler der Person und trägt deshalb den Hinweiston. Technische Details
erscheinen nie; eine Kennung für die Fehlersuche nur, wenn sie wie eine
Kennung aussieht.

### Wiederholung

Eine Review-Karte trennt strikt:

1. Prompt
2. aktive Erinnerung
3. Antwort aufdecken
4. Selbstbewertung
5. nächste Fälligkeit

Die Antwort darf nicht vor dem Recall sichtbar sein.

Herkunft einer Review-Karte ist immer als Text sichtbar, nie nur über Farbe:

| Kennzeichnung | Bedeutung |
|---|---|
| `LIVE · <App>` | echte fällige Einträge einer App, nur Anzeige (LP-05B) |
| `DEMO · <Bereich>` | lokales Beispiel-Deck, ändert keine App |
| `EIGENES DECK · <Richtung>` | persönliche VokabelPfad-Karte, nur in diesem Browser (LP-06) |
| `LOKAL · nur in diesem Browser` | VokabelPfad-Stand auf `/fortschritt`, nie an eine App gesendet (LP-07) |

Destruktive Aktionen (Deck/Karte löschen, VokabelPfad zurücksetzen) nutzen
den Danger-Button und einen modalen Dialog, der Umfang und betroffenen
Lernfortschritt benennt; der Fokus startet auf „Abbrechen".

## 5. Accessibility

Pflicht:

- WCAG 2.2 AA für normalen Text
- sichtbarer Fokus
- Zoom nicht sperren
- Reduced Motion
- Tastaturbedienung
- keine reine Farbsemantik
- mobile Touch-Ziele
- axe/E2E für gemeinsame Shell

Der Plattform-Chrome wird in AIPfad bereits durch die bestehende axe-Suite
regressionsgeprüft.

## 6. Typography

Plattform- und Produkt-UI:

- Sans
- klare Hierarchie
- keine Monospace-Pflicht

Monospace ist Fachtypografie für:

- Code
- SQL
- Terminal
- Tokens
- strukturierte technische Daten

AIPfad darf in Fachinhalten technisch bleiben; die globale Navigation folgt
demselben Produktstil wie die übrigen Pfade.

## 7. Motion

Gemeinsame Regel:

- Bewegung erklärt Zustand oder Hierarchie
- keine dauerhafte dekorative Bewegung
- keine Gamification durch Wackeln/Bouncing
- Reduced Motion schaltet nicht essentielle Animation ab
- Shell (Dachleiste, Kopf, Navigation, Menüs): 120 ms / 200 ms, unter
  „Bewegung reduzieren“ (System oder Konto) 0,01 ms; Fachanimationen behalten
  ihre eigenen Zeiten
- Komponenten (LP-03C): Einsinken 90 ms, Farbwechsel 140 ms, Füllung eines
  Fortschrittsbalkens 480 ms, ein einmaliger Lichtstreif beim Abschluss;
  unter „Bewegung reduzieren“ 0,01 ms und kein Lichtstreif — der gedrückte
  Zustand bleibt sichtbar

## 8. Responsive Contract

Desktop und Mobil teilen dieselben Begriffe und Prioritäten.

Mobil:

- globale Dachleiste bleibt sichtbar
- Kernnavigation ist mit Daumen erreichbar
- keine horizontal notwendige Desktop-Navigation ohne Alternative
- Shell-Breakpoints (LP-03A): unter 640 px untere Leiste plus Menü für
  Sitzung und Zusatzziele; 640–1279 px Navigation in eigener, umbrechender
  Zeile; ab 1280 px in der Kopfzeile — nie versteckt seitlich scrollend
- Review-Ratings bleiben ohne horizontales Scrollen bedienbar

## 9. Implementierungsstrategie

Heute sind die Apps getrennte Vercel-Roots. Deshalb werden gemeinsame Tokens
zunächst als **identischer semantischer Vertrag** in den drei Apps gehalten.

Nicht sofort ein Shared-NPM-Package erzwingen.

Ein echtes `packages/learning-ui` wird erst eingeführt, wenn:

1. Vercel-Monorepo-Builds aus allen Root Directories verifiziert sind,
2. lokale Entwicklung nicht komplizierter wird,
3. Versionierung/Breaking Changes geregelt sind,
4. kein Fachpfad unnötig sein Bundle vergrößert.

Bis dahin gilt: gemeinsame Semantik, kleine bewusst synchronisierte
Plattformkomponenten, automatisierte Regressionen. Umgesetzt in drei
Verträgen mit je kanonischen Dateien, bytegleichen Kopien und eigenem
Drift-Check in der CI:

| Vertrag                          | Ordner                     | Drift-Check                                |
| -------------------------------- | -------------------------- | ------------------------------------------ |
| Shell und Navigation (LP-03A)    | `docs/learning-shell/`     | `node scripts/check-learning-shell.mjs`    |
| Badges und Callouts (LP-03B)     | `docs/learning-feedback/`  | `node scripts/check-learning-feedback.mjs` |
| Button, Card, ProgressBar, Empty-/ErrorState (LP-03C) | `docs/learning-components/` | `node scripts/check-learning-components.mjs` |

## 10. Review-Regel für neue UI

Eine neue globale UI-Komponente darf nur eingeführt werden, wenn geklärt ist:

- Plattform oder Fachkomponente?
- existiert bereits ein Muster?
- semantischer Status?
- Tastaturzustand?
- mobile Darstellung?
- Dark Mode?
- Reduced Motion?
- axe-/Kontrastprüfung?
- gehört sie in einen Pfad oder in Lernpfade?

Wenn sie plattformweit ist, muss der Vertrag hier aktualisiert werden.
