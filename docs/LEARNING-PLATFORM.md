# Lernpfade — gemeinsamer Produkt- und UI-Vertrag

## 1. Produktmodell

**Lernpfade** ist die Dachmarke. Ein Lernpfad ist ein Fachmodul derselben
Plattform, kein eigenständiges Produkt mit eigener Bedienlogik.

Heute:

- PythonPfad
- SQLPfad
- Git & GitHub (fachlich bereits vorhanden, technisch derzeit in AIPfad)
- AIPfad (im Ausbau)

Die Anwendungen dürfen technisch getrennt deployt werden. Für Lernende müssen
sie trotzdem wie eine Anwendung wirken.

## 2. Was überall gleich bleibt

Jeder Pfad verwendet dieselbe Produktsprache:

1. **Dachleiste:** `Lernpfade / <Pfad>`, Rücksprung zur gemeinsamen Homepage.
2. **Bereiche:** Überblick, Lernen, Üben/Labs, Projekte, Wiederholen,
   Fortschritt, Profil — nur vorhandene Fähigkeiten werden gezeigt.
3. **Statusbegriffe:** Verfügbar, In Ausbau, Geplant, Erledigt, Fällig.
4. **Interaktion:** gleiche Button-Hierarchie, aktive Navigation, Cards,
   Badges, Callouts, Empty States und Fortschrittsanzeigen.
5. **Typografie:** sachliche Sans-Schrift für Produkt-UI; Monospace nur dort,
   wo der Fachinhalt sie fachlich braucht.
6. **Form:** dieselbe Radius-, Abstands- und Border-Logik.
7. **Accessibility:** sichtbarer Fokus, keine Information nur über Farbe,
   Zoom nicht sperren, Reduced Motion respektieren.
8. **Mobile:** dieselben Prioritäten und möglichst dieselbe Navigationslogik.

Fachfarbe ist ein Akzent, keine eigene Produktsprache.

## 3. Was unterschiedlich bleiben darf

Homogenität bedeutet nicht, Fachwerkzeuge künstlich gleich aussehen zu lassen.

- Python braucht Code-Editor und Laufzeitausgabe.
- SQL braucht Query-Editor, Tabellen und Ausführungsplan.
- Git braucht Zustands-, Branch- und Commit-Visualisierung.
- AI braucht Tokenizer, Kontext-/RAG-/Agenten-Labs.

Diese Komponenten folgen gemeinsamen Hüllen, Statusmustern und Feedbackregeln,
dürfen intern aber fachlich optimal gestaltet sein.

## 4. Gemeinsames Lernmodell

Jeder Pfad folgt derselben Schleife:

**Verstehen → Anwenden → Verifizieren → Wiederholen**

- Verstehen: kurze Erklärung, mentales Modell, Beispiel.
- Anwenden: aktive Aufgabe oder Lab.
- Verifizieren: Ergebnis und Begründung prüfen; bei AI ausdrücklich
  Modellantworten nicht blind übernehmen.
- Wiederholen: fällige Konzepte später erneut aktiv abrufen.

Das ist wichtiger als identische Kursstrukturen.

## 5. Pfadübergreifender Wiederholungsmotor

Der geplante **VokabelPfad** ist zugleich der Prototyp für einen gemeinsamen
Spaced-Repetition-Layer.

Eine Wiederholungseinheit kann zu einem Fachpfad gehören oder global sein:

- klassische Fremdsprachen-Vokabel
- Fachbegriff und Definition
- Befehl und Wirkung
- Konzept und Gegenbeispiel
- Abkürzung und Bedeutung

Beispiele:

- `embedding` → numerische Repräsentation von Bedeutung
- `git fetch` → Remote-Zustand holen, Arbeitsbaum nicht verändern
- `LEFT JOIN` → alle Zeilen der linken Tabelle erhalten
- `retrieval` → Abruf / Wiederauffinden
- englische, spanische oder französische Vokabeln

### Späteres Datenmodell

Nicht in diesem UI-Slice implementieren, aber als Ziel:

```text
ReviewItem
  id
  domain            # language | python | sql | git | ai | ...
  pathSlug?
  conceptSlug?
  prompt
  answer
  example?
  audio?
  dueAt
  interval
  ease
  repetitions
  lastResult
```

Der Wiederholungsmotor gehört langfristig der Plattform, nicht einem einzelnen
Pfad.

## 6. Priorisierte Erweiterungen

### P0 — AIPfad

Bereits vorhanden und strategischer Kern:

- LLM-Grundlagen
- Prompting
- Embeddings / RAG
- Tool Calling
- Agents
- MCP
- Evaluation
- AI Security
- Governance

### P1 — VokabelPfad / gemeinsames Wiederholen

Hoher Wiederverwendungshebel: Sprache und technische Begriffe nutzen dieselbe
Lernmechanik. Kleine Sessions eignen sich als täglicher Rückkehrpunkt der
gesamten Plattform.

### P1 — TypeScript & Web Apps

Sinnvolle Ergänzung zu Python, Git und AI:

- TypeScript
- React
- Next.js
- APIs
- Tests
- sichere Server-/Client-Grenzen

Ziel ist nicht Frontend-Design als Selbstzweck, sondern robuste AI-fähige
Anwendungen.

### P1 — Data & Analytics

Brücke von Python + SQL zu AI:

- pandas / tabellarische Daten
- Datenqualität
- Statistik-Grundlagen
- Visualisierung
- Feature-/Dataset-Denken
- reproduzierbare Analyse

### P2 — Agenten & Automation

Erst nach AI- und API-Grundlagen als eigener Praxispfad:

- Tool Calling
- Workflow-Design
- Agent State
- Fehler- und Retry-Modelle
- Evals
- Human Approval
- Observability und Kosten

### P2 — Security für AI- und Websysteme

- Authentifizierung / Autorisierung
- OAuth / OIDC
- Secrets
- Injection
- Datenzugriffe und Least Privilege
- Supply Chain
- Agent-/Tool-Sicherheit

## 7. Was bewusst kein eigener Pfad werden sollte

Kleine Themen werden zunächst Module statt neue Produkte:

- einzelne AI-Anbieter
- Prompt-Sammlungen
- einzelne Frameworks
- einzelne Datenbanken
- einzelne No-Code-Tools

Ein neuer Pfad braucht ein dauerhaftes mentales Modell, genügend Tiefe und
einen eigenen Kompetenzfortschritt.

## 8. Technische Zielarchitektur

Kurzfristig bleiben die Apps getrennte Next.js-Anwendungen. Das senkt das
Migrationsrisiko und lässt bestehende Deployments intakt.

```text
Lernpfade Hub
  ├── PythonPfad
  ├── SQLPfad
  ├── Git & GitHub  -> heute AIPfad-Gitmodule
  ├── AIPfad
  └── zukünftige Pfade
```

Gemeinsam werden zunächst Design- und Informationsarchitektur, später erst
Identität und Fortschritt.

Reihenfolge:

1. gemeinsame Homepage + Dachleiste
2. gemeinsame Navigation / UI-Kontrakte
3. gemeinsame Design Tokens / Primitive
4. pfadübergreifender Wiederholungsmotor
5. Entscheidung über gemeinsames Konto / SSO und Progress Aggregation

Nicht gleichzeitig die drei bestehenden Datenmodelle zusammenlegen. UI-
Homogenisierung und Identitätskonsolidierung sind zwei getrennte
Architekturentscheidungen.

## 9. Akzeptanzkriterien für neue Pfade

Ein neuer Lernpfad ist erst plattformreif, wenn:

- er über die gemeinsame Homepage erreichbar ist,
- die Dachleiste und gemeinsame Bereichsbegriffe verwendet,
- seine fachlichen Komponenten die gemeinsamen UI-Zustände benutzen,
- Fortschritt und Wiederholung klar modelliert sind,
- Mobil- und Tastaturbedienung geprüft sind,
- ein Fachakzent existiert, ohne ein neues UI-System zu erfinden.
