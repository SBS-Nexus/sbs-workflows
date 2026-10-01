# Lernpfade — Produkt- und Engineering-Roadmap

Stand: 2026-10-01

## 1. Zielbild

Lernpfade ist eine gemeinsame Lernplattform für technische und sprachliche Kompetenzen.

Die einzelnen Lernpfade dürfen technisch getrennt bleiben, sollen für Lernende aber wie Module
derselben Anwendung wirken:

- PythonPfad
- SQLPfad
- Git & GitHub
- AIPfad
- später Vokabeln, TypeScript, Data & Analytics, Agenten & Automation und Security

Das langfristige Produktmodell ist:

```text
Lernpfade
  ├── gemeinsames Konto / Identität
  ├── gemeinsames Design- und Navigationssystem
  ├── gemeinsamer Fortschritt
  ├── gemeinsamer Wiederholungsmotor
  │
  ├── Python
  ├── SQL
  ├── Git & GitHub
  ├── AI
  ├── Vokabeln / Sprachen
  ├── TypeScript & Web Apps
  ├── Data & Analytics
  ├── Agenten & Automation
  └── Security
```

## 2. Produktprinzipien

### 2.1 Eine Plattform, Fachmodule statt Mini-Produkte

Ein neuer Lernpfad erfindet keine eigene Navigation, Statuslogik oder Designsprache.

Unterschiedlich bleiben nur Fachkomponenten, die fachlich unterschiedlich sein müssen:

- Python: Code-Editor und Programmausgabe
- SQL: Query-Editor, Tabellen, Ausführungsresultat
- Git: Commit-/Branch-/Diff-Visualisierung
- AI: Tokenizer, RAG-, Agenten- und Evaluations-Labs
- Sprachen: aktive Wort-/Satzabfrage und später Audio

### 2.2 Ein gemeinsames Lernmodell

Jeder Pfad folgt derselben Schleife:

**Verstehen → Anwenden → Verifizieren → Wiederholen**

### 2.3 Wiederholen ist Plattformfunktion

Spaced Repetition gehört langfristig nicht Python, SQL oder einem Vokabelkurs.

Ein gemeinsamer Review-Kern verwaltet:

- technische Konzepte
- Befehle
- Begriffe
- Abkürzungen
- Vokabeln
- Beispielsätze
- später Audio-/Ausspracheeinheiten

### 2.4 AI-Kompetenz bedeutet Verifikation

AI-Ausgaben werden nicht als Antwortquelle behandelt, sondern als prüfbare Arbeitsergebnisse.

Git, SQL, Python, Datenkompetenz, Tests und Security sind deshalb Teil derselben AI-Lernstrategie.

---

# 3. Aktueller Stand

## Phase 0 — Bestehende Fachprodukte

Status: **BESTEHEND**

- PythonPfad vorhanden
- SQLPfad vorhanden
- AIPfad vorhanden
- Git-/GitHub-Curriculum bereits in AIPfad vorhanden
- getrennte Deployments und getrennte Datenmodelle

## Phase 1 — Gemeinsame Plattformidentität

Status: **IMPLEMENTIERT IN PR #41**

Bereits umgesetzt:

- Dachmarke **Lernpfade**
- vorgeschalteter Next.js-Hub unter `lernpfade/`
- gemeinsame Plattformleiste in PythonPfad, SQLPfad und AIPfad
- gemeinsamer Produkt-/UI-Vertrag in `docs/LEARNING-PLATFORM.md`
- AIPfad-Shell an die gemeinsame Produktsprache angenähert
- Git & GitHub im Hub bereits als eigener Lernpfad sichtbar
- Roadmap weiterer Lernpfade im Hub
- Hub-CI
- Accessibility-Regressionsprüfung über AIPfad
- Python-/SQL-Preview-Builds über Vercel

Noch bewusst nicht enthalten:

- gemeinsames Konto
- gemeinsame Datenbank
- gemeinsamer Fortschritt
- produktive Hub-Domain
- vollständige gemeinsame Komponentenbibliothek

---

# 4. Aktiver Slice — gemeinsamer Review-Kern

## Phase 2 — Daily 5 / Review Core

Status: **IN UMSETZUNG**

Ziel:

Ein real nutzbarer pfadübergreifender Wiederholungsmechanismus, bevor Konten und Datenbanken
konsolidiert werden.

### 4.1 Vertical Slice

Muss enthalten:

- Route `/wiederholen` im Lernpfade-Hub
- maximal fünf fällige Karten pro Session
- aktive Erinnerung vor dem Aufdecken der Antwort
- drei Selbsteinschätzungen:
  - Nochmal
  - Unsicher
  - Sicher
- einfache Fälligkeitslogik
- technische Begriffe aus mehreren Domains
- lokale Persistenz im Browser
- kein externer AI-Aufruf
- kein Konto erforderlich
- direkter Einstieg aus PythonPfad, SQLPfad und AIPfad

### 4.2 Seed-Domains

Erste Karten:

- Python
- SQL
- Git
- GitHub
- AI
- erste Sprach-/Übersetzungskarte als Proof of Concept

### 4.3 Übergangsarchitektur

Version 1 speichert nur im Browser:

```text
ReviewState
  itemId
  dueAt
  intervalDays
  successes
  lastRating
```

Das ist bewusst ein Produkt-Prototyp und kein langfristiges Persistenzmodell.

### 4.4 Zielarchitektur

Später:

```text
ReviewItem
  id
  domain
  pathSlug?
  conceptSlug?
  prompt
  answer
  example?
  audio?
  source?
  createdAt

ReviewProgress
  userId
  reviewItemId
  dueAt
  interval
  ease
  repetitions
  lastResult
  lastReviewedAt
```

### 4.5 Gate für Phase 2

Phase 2 ist erst abgeschlossen, wenn:

- Hub Typecheck grün
- Hub Production Build grün
- AIPfad Format/Lint/Typecheck grün
- AIPfad Unit-/Integrationstests grün
- AIPfad Production Build grün
- AIPfad E2E/Accessibility grün
- PythonPfad Preview READY
- SQLPfad Preview READY
- kein Produktionsdeploy erfolgt
- kein existierendes Lerndatenmodell verändert wurde

---

# 5. Phase 3 — Gemeinsames Design System

Priorität: **P0 nach Review Core**

## Ziel

Die drei bestehenden Oberflächen sollen nicht nur eine gemeinsame Dachleiste besitzen, sondern
dieselben UI-Grundbausteine verwenden.

## Deliverables

### Design Tokens

Gemeinsam definieren:

- Schriftfamilien
- Textgrößen
- Abstände
- Radien
- Borders
- Elevation
- Fokuszustände
- Motion
- Statusfarben
- neutrale Oberflächen

Fachfarben bleiben als Akzent erhalten:

- Python: Indigo
- SQL: Petrol
- Git: Violett
- AI: Bernstein

### Gemeinsame Primitive

Kandidaten:

- Button
- ButtonLink
- Card
- Badge
- Callout
- ProgressBar
- EmptyState
- Skeleton
- Tabs
- Dialog
- Dropdown/Menu
- Breadcrumb
- PageHeader
- SectionHeading

## Technische Entscheidung

Nicht sofort die drei Apps in eine Next.js-App migrieren.

Zuerst:

1. gemeinsame Token-Spezifikation
2. gemeinsame API der UI-Primitives
3. Verhalten angleichen
4. danach entscheiden, ob ein internes Package sinnvoll ist

Ein Package wird erst eingeführt, wenn Vercel-Monorepo-Builds und lokale Installationen
zuverlässig damit arbeiten.

---

# 6. Phase 4 — Einheitliche Navigation und Informationsarchitektur

Priorität: **P0**

## Globale Ebene

Überall sichtbar:

- Lernpfade
- aktueller Pfad
- Daily 5
- Alle Pfade

## Fachpfad-Ebene

Soweit fachlich vorhanden:

- Überblick
- Lernen
- Üben oder Labs
- Projekte
- Wiederholen
- Fortschritt
- Profil

Nicht vorhandene Funktionen werden nicht als tote Navigation gezeigt.

## Mobile

Ziel:

- gleiche Prioritäten
- gleiche aktive Zustände
- gleiche Mindest-Touch-Flächen
- Bottom Navigation dort, wo sie den Kernworkflow verbessert

---

# 7. Phase 5 — Git & GitHub als vollwertiger Pfad

Priorität: **P0**

## Kurzfristig

Git-Inhalte bleiben technisch in AIPfad, erhalten aber:

- eigene Route `/git`
- eigene Landing-/Curriculum-Seite
- direkten Hub-Einstieg
- eigenen Fortschrittskontext innerhalb des bestehenden Inhaltsmodells

## Späterer Entscheidungspunkt

Nur auslagern, wenn mindestens einer dieser Gründe eintritt:

- eigenes Release-/Deployment-Tempo
- stark wachsendes Git-Curriculum
- andere Zielgruppe als AIPfad
- eigene Übungen/Labs benötigen eine eigene Runtime
- separates Produkt-/SEO-Ziel

Bis dahin keine künstliche vierte Codebasis erzeugen.

---

# 8. Phase 6 — Gemeinsamer Fortschritt

Priorität: **P1**

## Ziel

Ein Dashboard zeigt Fortschritt über alle Lernpfade.

Beispiel:

```text
Gesamtfortschritt

Python        42 %
SQL           68 %
Git & GitHub  31 %
AI            19 %

Heute
- 5 Wiederholungen
- 1 SQL-Lektion
- Git Branching fortsetzen
```

## Zuerst nur Aggregation

Die bestehenden Fachsysteme bleiben zunächst Source of Truth.

Ein Plattform-Layer aggregiert:

- abgeschlossene Lektionen
- laufende Lektion
- fällige Reviews
- Projekte
- letzte Aktivität

## Noch keine harte Datenmigration

Kein Big-Bang-Zusammenlegen der drei Datenbanken.

---

# 9. Phase 7 — Gemeinsame Identität / SSO

Priorität: **P1**

Erst nach stabilem gemeinsamen Produktmodell.

## Zu entscheiden

Option A:

- zentraler Identity Provider
- getrennte Fach-Datenbanken
- gemeinsame stabile User-ID

Option B:

- zentrale Plattformdatenbank für Konto/Identität
- Fachsysteme referenzieren Plattform-User-ID

## Muss vor Umsetzung geklärt sein

- Session-Domain-Strategie
- CSRF
- Cookie Scope
- Account Deletion
- Export
- Audit Trail
- Organisationen
- Rollen
- Datenschutz und Retention

---

# 10. Phase 8 — VokabelPfad

Priorität: **P1**

Der Review Core wird zum echten Sprachlernprodukt erweitert.

## MVP

- eigene Vokabelsets
- Sprache wählen
- Wort → Übersetzung
- Übersetzung → Wort
- Satzkontext
- Markierung unsicher/sicher
- Spaced Repetition
- Import einfacher CSV-Listen
- Lernstatistik

## Danach

- Audio
- Aussprache
- Cloze-Deletions
- Sätze statt Einzelwörter
- thematische Decks
- CEFR-orientierte Inhalte
- persönliche Listen

## Plattformnutzen

Dieselbe Engine bleibt für technische Inhalte verwendbar.

---

# 11. Phase 9 — AIPfad Ausbau

Priorität: **P0/P1 fortlaufend**

Empfohlene Reihenfolge:

1. LLM-Grundlagen
2. Prompting
3. Embeddings
4. Retrieval
5. RAG
6. Tool Calling
7. Agents
8. MCP
9. Evals
10. AI Coding
11. AI Security
12. Governance
13. Kosten / Latenz / Observability
14. Multi-Model-Systeme

Jedes Modul braucht:

- mentales Modell
- aktive Aufgabe
- Verifikation
- Review Items
- mindestens ein realistisches Praxisbeispiel

---

# 12. Phase 10 — TypeScript & Web Apps

Priorität: **P1**

Warum:

Python + SQL + Git + AI reichen für Prototypen, aber produktive AI-Anwendungen benötigen
robuste Web- und API-Kompetenz.

Curriculum:

- JavaScript-Grundlagen
- TypeScript
- Datenstrukturen und Typen
- HTTP / REST
- React
- Next.js
- Server/Client-Grenzen
- API Routes / Server Actions
- Validierung
- Fehlerbehandlung
- Testing
- Deployment

---

# 13. Phase 11 — Data & Analytics

Priorität: **P1**

Brücke zwischen Python, SQL und AI.

Curriculum:

- tabellarische Daten
- pandas
- Datenqualität
- Nullwerte
- Duplikate
- Joins
- Verteilungen
- Statistik-Grundlagen
- Visualisierung
- reproduzierbare Analyse
- Dataset-Grain
- Leakage
- Train/Test-Denken
- Evaluation-Datasets

---

# 14. Phase 12 — Agenten & Automation

Priorität: **P2**

Erst nach soliden AI-, Git-, API- und Security-Grundlagen.

Curriculum:

- Tool Calling
- Agent Loop
- State
- Planning
- Retries
- Idempotenz
- Timeouts
- Human Approval
- Evals
- Audit Trail
- Kosten
- Observability
- MCP
- Multi-Agent-Orchestrierung

---

# 15. Phase 13 — SecurityPfad

Priorität: **P2**

Curriculum:

- Authentifizierung
- Autorisierung
- Sessions
- OAuth 2.0
- OIDC
- Secrets
- Hashing
- CSRF
- XSS
- Injection
- SSRF
- Least Privilege
- Supply Chain
- sichere AI-Tools
- Prompt Injection
- Agentenberechtigungen
- Datenexfiltration
- Auditability

---

# 16. Reihenfolge der nächsten Engineering-Slices

## Slice L01 — Unified Hub

Status: Implementiert in PR #41.

## Slice L02 — Review Core

Status: Aktiv.

Deliverables:

- Git-Landing
- Daily 5
- Browserpersistenz
- Plattformleiste → Daily 5
- diese Roadmap

## Slice L03 — UI Contract

- gemeinsame Token-Namen
- Button/Card/Badge/Progress API angleichen
- visuelle Regressionen dokumentieren
- Mobile Navigation angleichen

## Slice L04 — Review Model v2

- ReviewItem-Schema
- ReviewProgress-Schema
- Migration aus lokalem Browserzustand optional
- serverseitige Fälligkeit
- Account-Bindung

## Slice L05 — Progress Aggregator

- API-Kontrakt pro Pfad
- Gesamtfortschritt im Hub
- letzte Aktivität
- nächster Schritt

## Slice L06 — Shared Identity ADR

Nur Architekturentscheidung, noch keine Migration.

Ergebnis:

- gewählte Identity-Topologie
- Session-Modell
- Domain-/Cookie-Strategie
- Account Lifecycle
- Sicherheitsreview

## Slice L07 — VokabelPfad MVP

Auf Review Model v2 aufbauen.

## Slice L08 — AIPfad RAG / Agents

Parallel fachlich weiterentwickeln.

---

# 17. Definition of Done für Plattform-Slices

Jeder Slice muss vor Merge mindestens erfüllen:

- Scope dokumentiert
- keine versteckten Cross-App-Abhängigkeiten
- Format grün
- Lint grün
- Typecheck grün
- relevante Unit-Tests grün
- relevante Integrationstests grün
- Production Build grün
- E2E grün, wenn UI betroffen
- Accessibility ohne serious/critical Verstöße
- Preview-Deployments grün
- keine unbeabsichtigte Produktionsmutation
- Dokumentation auf aktuellem Stand

---

# 18. Was ausdrücklich vermieden wird

- Big-Bang-Rewrite aller drei Lernapps
- sofortige gemeinsame Datenbank nur für UI-Konsistenz
- neue App für jedes kleine Thema
- AI-generierte Antworten ohne prüfbare Lernlogik
- Gamification vor Lernwirksamkeit
- Feature-Parität um jeden Preis
- tote Navigation
- unterschiedliche Begriffe für denselben Plattformzustand
- UI-Abweichungen ohne fachliche Begründung

---

# 19. Nächste Zielmarke

Die nächste große Produktmarke ist erreicht, wenn ein Nutzer:

1. die Lernpfade-Homepage öffnet,
2. Python, SQL, Git oder AI als Pfad auswählt,
3. überall dieselbe Plattformidentität erkennt,
4. aus jedem Pfad Daily 5 öffnen kann,
5. fünf gemischte Konzepte wiederholt,
6. anschließend in seinen Fachpfad zurückkehrt,
7. ohne eine neue Bedienlogik lernen zu müssen.

Ab diesem Punkt ist Lernpfade nicht mehr nur eine Sammlung ähnlicher Apps, sondern ein echtes
gemeinsames Lernprodukt.
