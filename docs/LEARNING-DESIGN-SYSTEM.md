# Lernpfade — Design System Contract

Stand: 2026-10-01

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

## 4. Interaktionsvertrag

### Buttons

- Primary: genau eine primäre Handlung pro Entscheidungsbereich
- Secondary: alternative sichere Handlung
- Ghost: Navigation oder niedrige Priorität
- Danger: nur für destruktive Aktion

### Cards

Eine Card ist entweder:

1. Information oder
2. vollständig klickbares Ziel.

Keine Card mit mehreren konkurrierenden Click-Zonen ohne fachlichen Grund.

### Progress

Fortschritt zeigt immer:

- numerischen Wert
- verständliche Beschriftung
- keine reine Farbcodierung

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
| nicht angemeldet | Hinweis mit Akzent „Info" und Weg „In <App> anmelden" |
| nicht erreichbar / ungültig | Hinweis mit Akzent „Warnung"; andere Pfade bleiben |
| nicht verbunden | neutraler Hinweis, Weg „In <App> öffnen" |
| lädt | Statuszeile „… wird geladen", ohne Zahlen |

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

## 8. Responsive Contract

Desktop und Mobil teilen dieselben Begriffe und Prioritäten.

Mobil:

- globale Dachleiste bleibt sichtbar
- Kernnavigation ist mit Daumen erreichbar
- keine horizontal notwendige Desktop-Navigation ohne Alternative
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
Plattformkomponenten, automatisierte Regressionen.

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
