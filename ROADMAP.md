# Lernpfade — Roadmap

Stand: 2026-10-28\
Repository: `SBS-Nexus/sbs-workflows`

## Leitbild

Lernpfade ist **eine Lernplattform mit mehreren Fachpfaden**.

Die Plattform soll sich für Lernende wie ein Produkt anfühlen, auch wenn
PythonPfad, SQLPfad und AIPfad zunächst technisch getrennte Next.js-
Anwendungen bleiben.

Das Ziel ist nicht, drei funktionierende Anwendungen möglichst schnell in
eine gemeinsame Datenbank zu verschieben. Das Ziel ist zuerst ein gemeinsames
Produktmodell:

```text
Verstehen → Anwenden → Verifizieren → Wiederholen
```

Darauf bauen Navigation, Fortschritt, Wiederholung, Vokabeln, Projekte und
später pfadübergreifende Identität auf.

---

# 0. Aktueller Stand

## Bereits vorhanden

### PythonPfad
- interaktive Python-Lernanwendung
- Übungen, Projekte und Wiederholung
- gespeicherter Fortschritt
- Browser-Codeausführung
- bestehende Produktions-/Preview-Infrastruktur

### SQLPfad
- interaktive SQL-Lernanwendung
- Übungen gegen isolierte SQL-Umgebung
- Projekte und Wiederholung
- gespeicherter Fortschritt
- bestehende Produktions-/Preview-Infrastruktur

### AIPfad
- AI-Lernanwendung
- technische Grundlagen
- Git- und GitHub-Module
- LLM- und Prompting-Grundlagen
- Labs, Wissenslandkarte und Wiederholung
- Git & GitHub ist fachlich bereits vorhanden, aber technisch noch kein
  eigener Deployable

## Plattform-Slice LP-01 — umgesetzt in PR #41

Status: **IMPLEMENTIERT / VALIDIERUNG GRÜN / NOCH NICHT GEMERGT**

- neue vorgeschaltete Next.js-App `lernpfade/`
- Dachmarke **Lernpfade**
- Kernpfade Python, SQL, Git & GitHub
- AIPfad und zukünftige Pfade sichtbar
- gemeinsame Dachleiste in PythonPfad, SQLPfad und AIPfad
- AIPfad-Shell an die gemeinsame Produktsprache angenähert
- `docs/LEARNING-PLATFORM.md` als Produktvertrag
- eigener Lernpfade-CI-Workflow
- Python-/SQL-Vercel-Previews
- Accessibility-Regression der Dachleiste gefunden und behoben

Validierung des letzten vollständig geprüften LP-01-Heads (historischer
Nachweis zum Zeitpunkt von LP-01; die Preview-Angaben gelten nicht für spätere
Stände — seit Oktober 2026 melden die Vercel-Previews von PythonPfad und
SQLPfad „Account is blocked.“, Ursache nicht belegt; das ist kein bestandenes
Preview-Gate):

- Lernpfade Hub CI: PASS
- AIPfad Format/Lint/Typecheck/Content: PASS
- AIPfad Unit: 500
- AIPfad Integration: 108
- AIPfad E2E/Accessibility: 37
- PythonPfad Preview: READY
- SQLPfad Preview: READY

---

# 1. Architekturprinzipien

Diese Regeln gelten für alle folgenden Slices.

## 1.1 Ein Produkt, getrennte Runtime-Grenzen

Kurzfristig:

```text
Lernpfade Hub
  ├── PythonPfad
  ├── SQLPfad
  ├── Git & GitHub → derzeit AIPfad
  └── AIPfad
```

Keine Big-Bang-Migration der drei Anwendungen.

## 1.2 UI vor Identitätskonsolidierung

Reihenfolge:

1. gemeinsame Produktsprache
2. gemeinsame Informationsarchitektur
3. gemeinsames Review-/Vokabelmodell
4. gemeinsames Progress-Modell
5. erst danach SSO / Account-Konsolidierung evaluieren

## 1.3 Fachkomponenten bleiben fachlich

Gemeinsam:
- Shell
- Navigation
- Status
- Buttons
- Cards
- Progress
- Feedback
- Empty/Error States

Fachspezifisch:
- Python Editor
- SQL Runner
- Git State Visualizer
- Tokenizer/RAG/Agent Labs

## 1.4 Keine stillen Datenmigrationen

Jeder Slice mit persistenten Nutzerdaten braucht:

- explizites Datenmodell
- Migrationsplan
- Rollback-/Forward-only-Entscheidung
- Datenlebenszyklus
- AuthZ-Grenze
- Audit-/Privacy-Bewertung

---

# 2. Delivery-Roadmap

## LP-02 — Shared Daily Review / Vokabel-Core

Status: **IN ARBEIT in PR #41**

### Ziel

Ein gemeinsamer Wiederholungsmotor soll beweisen, dass Vokabeln und technische
Konzepte dieselbe Lernmechanik verwenden können.

### Implementierung

`lernpfade/src/domain/review/`

- `ReviewItem`
- `ReviewState`
- `ReviewRating`
- deterministischer Scheduler
- gemischtes Demo-Deck:
  - Sprache
  - Python
  - SQL
  - Git
  - AI
- Unit-Tests für Scheduling-Invarianten

`/wiederholen`

- aktive Abrufkarte
- Antwort erst nach eigenem Recall sichtbar
- Bewertungen:
  - Nochmal
  - Schwer
  - Gut
  - Leicht
- lokaler Zustand in `localStorage`
- keine Übertragung an einen Server

### Warum LocalStorage zuerst

Dieser Slice validiert UX und Lernmechanik.

Er entscheidet ausdrücklich **noch nicht**:

- gemeinsames Nutzerkonto
- zentrale Review-Datenbank
- Migration bestehender ReviewQueue-Tabellen
- Cross-App SSO

### Exit-Kriterien

- Scheduler deterministisch getestet
- invalid persistierter Zustand fail-closed
- Typecheck PASS
- Unit Tests PASS
- Production Build PASS
- Tastaturbedienung möglich
- keine Lerndaten verlassen den Browser

---

## LP-03 — Design System Contract

Status: **VERTRAG VOLLSTÄNDIG UMGESETZT — Grundlage in PR #41; LP-03A (Shell und Navigation, PR #58) und LP-03B (Statusanzeigen: Badges, Callouts, PR #59) in die Integrationsbranch `claude/lernpfade-unified-hub` übernommen; LP-03C (Button, Card, ProgressBar, EmptyState, ErrorState) als eigener PR gegen die Integrationsbranch, noch nicht übernommen. NICHT IN `main`, NICHT PRODUKTIV VERÖFFENTLICHT**

Priorität: **P0**

### Ziel

Python, SQL, Git/AIPfad sollen nicht nur dieselbe Dachleiste, sondern dieselben
Produktprimitive verwenden.

### Artefakte

```text
docs/
  LEARNING-DESIGN-SYSTEM.md
  learning-shell/            ← LP-03A: kanonischer Shell-Vertrag
    README.md
    learning-shell.css       (Tokens --lp-shell-*, Shell-Bausteine)
    learning-shell.ts        (Navigationsvertrag, Aktivzustand, Hub-Ziele)
    learning-shell.test.ts
    learning-platform-bar.tsx
    shell-menu.tsx
  learning-feedback/         ← LP-03B: Statusvertrag (Badges, Callouts)
    README.md
    learning-feedback.css    (Tokens --lp-feedback-*, Badge/Callout)
    learning-feedback.ts     (acht Zustände, Aliasse, Standardtitel, Live-Regel)
    learning-feedback.test.ts
  learning-components/       ← LP-03C: Button, Card, ProgressBar, Empty-/ErrorState
    README.md
    learning-components.css  (Tokens --lp-ui-*, Pfad-Akzent über data-lp-app,
                              taktile Unterkante, Hell/Dunkel, forced-colors)
    learning-components.ts   (Varianten, Größen, Kartenarten, Fortschritt,
                              Leer- und Fehlerzustände)
    learning-components.test.ts (inkl. aus dem CSS nachgerechneter Kontraste)

<app>/src/styles/learning-shell.css   ┐ bytegleiche Kopien je App,
<app>/src/lib/learning-shell.ts       ┘ geprüft von scripts/check-learning-shell.mjs
<app>/src/styles/learning-feedback.css ┐ bytegleich in Python/SQL/AI und Hub,
<app>/src/lib/learning-feedback.ts     ┘ geprüft von scripts/check-learning-feedback.mjs
<app>/src/styles/learning-components.css ┐ bytegleich in Python/SQL/AI und Hub,
<app>/src/lib/learning-components.ts     ┘ geprüft von scripts/check-learning-components.mjs
```

Die früher hier genannten Dateien `lernpfade/src/design/tokens.ts`,
`status.ts` und `navigation.ts` wurden nie angelegt. Der Shell-Teil des
Vertrags liegt seit LP-03A in `docs/learning-shell/` (siehe dortiges README),
der Statusvertrag für Badges und Callouts seit LP-03B in
`docs/learning-feedback/`, Button, Card, ProgressBar, EmptyState und
ErrorState seit LP-03C in `docs/learning-components/`. `ReviewCard` bleibt
eine Fachkomponente des Hubs (Recall-Ablauf), kein Plattformbaustein.

#### LP-03C — Aktionen, Flächen und Zustände

- **Button:** sieben Varianten (`primary`, `secondary`, `ghost`, `danger`,
  `danger-secondary`, `on-dark`, `on-dark-secondary`), drei Größen; tragende
  Knöpfe mit taktiler Unterkante, die beim Drücken einsinkt; gesperrt flach;
  Pfad-Akzent über `data-lp-app` am `<html>` (Python Blau, SQL Petrol, AIPfad
  Bernstein — jeweils die bisherige Primärfarbe —, Hub Indigo).
- **Card / CardLink:** Information oder ganze Karte als Ziel; Bereichsfarbe
  über `--lp-ui-area` (Modulfarben in Python/SQL); Betonung `accent`/`danger`.
  SQL-Lektionskarten und AIPfad-Labs sind jetzt `CardLink`.
- **ProgressBar:** sprechbarer Wert „x von y", ungültige Daten → leerer
  Balken, Abschluss mit einmaligem Lichtstreif; die beiden nativen
  `<progress>` im Hub sind ersetzt.
- **EmptyState:** `start`/`done`/`filtered`, `regular`/`compact`; „nichts
  fällig" ist überall ein erledigter Stand (`done`), kein Mangel.
- **ErrorState:** Fehler- und 404-Seite in allen vier Apps; SQLPfad und Hub
  zeigten vorher die englische Next.js-Vorgabe.
- **Prüfung:** Vertragstest (Logik und aus dem CSS nachgerechnete Kontraste
  für jeden Pfad hell/dunkel), Drift-Check in der CI, Browser-Suite
  `komponenten.spec.ts` je App an echten Seiten.
- **Im selben PR, eigene Commits:** Randfarben-Fix für PythonPfad/SQLPfad (siehe
  Abschnitt 6) und PythonPfads Lernpfad-Stationen in derselben taktilen Sprache —
  die nächste Station ist hervorgehoben („Start“/„Weiter“, `aria-current="step"`),
  das Dauer-Schweben entfällt.
- Einzelheiten: `docs/learning-components/README.md`.

Langfristig optional:

```text
packages/
  learning-ui/
```

Aber erst, wenn die getrennten Vercel-Root-Verzeichnisse sicher mit einem
gemeinsamen Package betrieben werden können.

### Verbindliche Token-Gruppen

- Surface / Text / Border
- Focus
- Radius
- Spacing
- Elevation
- Motion
- Status:
  - neutral
  - info
  - success
  - warning
  - danger
- Path Accent:
  - Python
  - SQL
  - Git
  - AI
  - Language

### Komponentenvertrag

- PlatformBar
- AppHeader
- PrimaryNav
- Button
- Card
- Badge
- Callout
- ProgressBar
- EmptyState
- ErrorState
- ReviewCard

### Nicht-Ziel

Kein pixelidentisches Fachinterface.

### Gates

- Visual regression / screenshots
- axe
- keyboard navigation
- mobile viewport
- reduced motion
- no layout shift from shared chrome

---

## LP-04 — Gemeinsame Informationsarchitektur

Status: **IMPLEMENTIERT IN PR #41**

Priorität: **P0**

### Ziel

Die gleichen Begriffe müssen in jedem Pfad dasselbe bedeuten.

### Primärnavigation

```text
Überblick
Lernen
Üben / Labs
Projekte
Wiederholen
Fortschritt
Profil
```

Nur Fähigkeiten, die tatsächlich existieren, werden angezeigt.

### Aufgaben

- PythonPfad Navigation gegen Vertrag prüfen
- SQLPfad Navigation gegen Vertrag prüfen
- AIPfad Navigation fertig angleichen
- Mobile Navigation vereinheitlichen
- Account-/Theme-Aktionen an denselben Ort
- aktive Zustände und Badge-Zähler angleichen

### Exit

Ein Nutzer kann zwischen den Pfaden wechseln, ohne ein neues Navigationsmodell
lernen zu müssen.

---

## LP-05 — Review Adapter für bestehende Apps

Status: **LP-05A ADAPTER CONTRACT IMPLEMENTIERT IN PR #41; LP-05B FÖDERIERTE, SCHREIBGESCHÜTZTE QUELLEN ABGESCHLOSSEN UND IN DIE INTEGRATIONSBRANCH `claude/lernpfade-unified-hub` ÜBERNOMMEN (PR #47) — NOCH NICHT IN `main`, NICHT PRODUKTIV AKTIVIERT; LIVE-BETRIEB SETZT SAME-SITE-DOMAINS VORAUS**

Priorität: **P0**

### Ziel

Bestehende Python-/SQL-/AI-Wiederholungsdaten sollen später in den gemeinsamen
Review-Core einspeisen können, ohne ihre Datenmodelle sofort zu ersetzen.

### Architektur

```text
Python ReviewQueue ─┐
SQL ReviewQueue ────┼──> Review Adapter Contract ──> Lernpfade Review
AIPfad ReviewQueue ─┘
Language Items ────────────────────────────────┘
```

### Adapter Contract

Minimal:

```ts
type ReviewSourceItem = {
  source: 'python' | 'sql' | 'git' | 'ai' | 'language'
  sourceItemId: string
  conceptId?: string
  prompt: string
  answer: string
  dueAt: Date
}
```

### Sicherheitsregel

Keine App darf fremde Nutzerdaten anhand einer vom Browser gelieferten
`userId` abrufen.

Scope immer aus der authentifizierten Session ableiten.

### Exit

- ein Fixture pro bestehender App kann verlustfrei in das gemeinsame
  Review-Format gemappt werden
- keine Datenmigration nötig
- Duplicate-Key-Strategie dokumentiert

### LP-05B — Föderierte, schreibgeschützte Wiederholungsquellen

Status: **ABGESCHLOSSEN — über PR #47 in die Integrationsbranch `claude/lernpfade-unified-hub` übernommen; noch nicht in `main`, nicht in Produktion aktiviert**

```text
Python source ─┐
SQL source ────┼──> Lernpfade federation ──> /wiederholen
AIPfad source ─┘

Source applications remain systems of record.
Lernpfade remains read-only in LP-05B.
```

- **Systeme der Wahrheit** bleiben PythonPfad, SQLPfad und AIPfad. Lernpfade
  sammelt nur ein; kein gemeinsames Review- oder Nutzerkonto, kein SSO, keine
  Migration, kein Zurückschreiben.
- **Identität:** Python = Aufgabe, AIPfad = Aufgabe, SQL = **Konzept**
  (`ConceptMastery.nextReviewAt`); die gewählte SQL-Aufgabe ist nur
  Darstellung. Kanonischer Schlüssel `<source>:<sourceKind>:<sourceItemId>`.
- **Transport:** Je App eine enge Route `GET /api/platform/review-source`.
  Der Browser ruft sie vom Hub aus mit der **eigenen** Sitzung der App auf;
  die App leitet die Person serverseitig aus ihrer Sitzung ab. Der Hub-Server
  sieht kein Cookie und keine Kennung. CORS nur für genau eine konfigurierte
  Hub-Origin (`PLATFORM_HUB_ORIGIN`, Vorgabe leer = aus).
- **Obergrenzen:** je Quelle höchstens 25 (Hub fragt 10 an), global 25;
  Kürzung wird gemeldet. Ordnung: `dueAt` aufsteigend, dann Schlüssel.
- **Teilausfall:** Eine ausgefallene oder ungültige Quelle wird isoliert und
  sichtbar gemeldet; fehlende Anmeldung heißt „nicht angemeldet", nie „nichts
  fällig".
- **Voraussetzung für Live-Daten:** Hub und Apps müssen *same-site* sein
  (gemeinsame registrierbare Domain), sonst schickt der Browser das
  `SameSite=Lax`-Sitzungscookie nicht mit. Unter `*.vercel.app` (Public
  Suffix) ist das nicht der Fall. Domain-/DNS-Umstellung ist **nicht** Teil
  von LP-05B.
- Einzelheiten: `docs/LEARNING-PLATFORM.md`, Abschnitt 10.

### Folgen für LP-05C / LP-07

- **LP-05C (Rückschreiben/Abschließen):** braucht eine eigene, schreibende
  Grenze je App (POST, CSRF, Idempotenz, Origin-Prüfung). Nicht durch
  Erweitern dieser GET-Route.
- **LP-07 (Plattformfortschritt):** kann dasselbe Muster nutzen (Option A:
  Aggregation über APIs der Apps) — mit derselben Same-Site-Voraussetzung.
  Scheitert diese, ist das ein Argument für LP-08 (gemeinsame Identität),
  nicht für das Teilen von Cookies über eine Parent-Domain.

---

## LP-06 — VokabelPfad MVP

Status: **LOKALER MVP ABGESCHLOSSEN — über PR #55 in die Integrationsbranch `claude/lernpfade-unified-hub` übernommen; NICHT IN `main`, NICHT PRODUKTIV VERÖFFENTLICHT**

Priorität: **P1**

### Ziel

Der erste neue Lernpfad nutzt den gemeinsamen Review-Core statt eine vierte
eigene Lernlogik zu bauen.

### MVP

- eigene Decks
- Fremdsprache → Deutsch
- Deutsch → Fremdsprache
- Satzkontext
- optionale Aussprache später
- Tags
- Import über strukturierte Datei
- Daily Review
- Lernstatistik

### Startsprachen

Nicht alle gleichzeitig.

Empfohlene Reihenfolge:

1. Englisch
2. Spanisch
3. Französisch
4. Italienisch

### Technische Begriffe

Dieselbe Engine darf auch Decks enthalten wie:

- AI Core Vocabulary
- Git Commands
- SQL Terms
- Python Concepts

### Später

- Audio
- Cloze
- Beispielsatzgenerierung
- AI Feedback
- personalisierte Schwierigkeit

AI-generierte Inhalte müssen prüfbar bleiben; die Quelle eines Imports muss
sichtbar sein.

### Umsetzung (LP-06)

Lebt in der vorhandenen Hub-App unter `lernpfade/` → **`/vokabeln`**. Kein
viertes Deployable, kein Backend.

- **Umfang:** eigene Decks Englisch ↔ Deutsch; Karten mit Begriff,
  Übersetzung, optionalem Satzkontext und Tags; anlegen, bearbeiten, löschen,
  nach Tags filtern; beide Lernrichtungen; Daily Review; einfache Statistik;
  JSON-Import/-Export; zwei redaktionelle Starterdecks (Englisch Alltag,
  technische Fachbegriffe) — erst nach ausdrücklicher Übernahme gespeichert.
- **Scheduling:** unverändert der gemeinsame Review-Core
  (`initialReviewState`, `isDue`, `scheduleReview`). Auch „Nochmal" plant
  einen Tag; es gibt keine Wiederholung innerhalb derselben Session.
- **Identität:** stabile Deck-/Karten-IDs; je Lernrichtung ein eigener
  Wiederholungszustand `<deckId>:<cardId>:<en-de|de-en>`.
- **Speicher:** nur in diesem Browser, eigene versionierte IndexedDB
  `lernpfade-vokabeln`, getrennt vom Demo-Schlüssel. Atomare
  Konfliktsperre zwischen Tabs (Revisionsprüfung und Schreiben in einer
  Transaktion). Kein Konto, keine Synchronisation; Löschen der Browserdaten
  entfernt die Daten.
- **Grenzen:** Import ≤ 2 MiB, ≤ 50 Decks, ≤ 1.000 Karten insgesamt,
  Textlimits je Feld, ≤ 20 Abfragen je Session. Jede Exportdatei — und damit
  jedes Deck — bleibt ≤ 2 MiB und so wieder importierbar.
- **Nicht enthalten:** weitere Sprachen in der UI, Audio/Aussprache,
  KI-Generierung, Cloud-Sync, Plattformfortschritt (LP-07), SSO (LP-08),
  Übernahme von Identität oder Fortschritt aus den anderen Apps.
- Vertrag und Einzelheiten: `docs/LEARNING-PLATFORM.md`, Abschnitt 11.

Gates: Hub-Typecheck, 106 Unit-Tests (Review-Core, Föderation, VokabelPfad),
Produktionsbuild und Playwright-E2E gegen den Produktionsbuild (Desktop,
375 px, 200 % Zoom, axe) — alle im Workflow `Lernpfade Hub`.

---

## LP-07 — Plattformweiter Fortschritt

Status: **IMPLEMENTIERT — über PR #57 in die Integrationsbranch `claude/lernpfade-unified-hub` übernommen; NICHT IN `main`, NICHT PRODUKTIV AKTIVIERT; LIVE-BETRIEB SETZT SAME-SITE-DOMAINS VORAUS**

Priorität: **P1**

### Ziel

Der Hub soll nicht nur Links auf Apps zeigen, sondern einen echten
Gesamtfortschritt.

### Modell

Nicht einfach Prozentwerte der Apps addieren.

Benötigt:

- Path Enrollment
- Path Progress Summary
- Concepts mastered
- Review backlog
- Recent activity
- Projects completed

### Beispiel

```text
Heute
  12 Min gelernt
  8 Reviews erledigt

Python        42 %
SQL           28 %
Git & GitHub  61 %
AI            15 %

Fällig
  4 Python
  2 SQL
  7 Vokabeln
```

### Entscheidungspunkt

Hier muss entschieden werden:

A. Aggregation über APIs der bestehenden Apps  
oder  
B. gemeinsame Identity-/Progress-Datenbank

**Default: zuerst A.**

**Entschieden für LP-07: A — read-only Federation über die bestehenden Apps.**
Kein gemeinsames Konto, keine gemeinsame Fortschrittsdatenbank, kein SSO,
keine Cookie-Freigabe, keine Migration, kein Zurückschreiben.

### Umsetzung (LP-07)

```text
Python Progress ─┐
SQL Progress ────┼──> Browser im Lernpfade-Hub ──> /fortschritt
AIPfad Progress ─┘
VokabelPfad local IndexedDB ────────────────┘
```

- Je App eine eigene Route `GET /api/platform/progress-source` (nicht
  `review-source` erweitert): nur GET, keine Abfrageparameter, Person allein
  aus der eigenen Sitzung, CORS nur für `PLATFORM_HUB_ORIGIN`,
  `private, no-store`, nur Aggregate (Schema 1, streng geprüft).
- Quellspezifische Semantik statt Vereinheitlichung: Python/AIPfad
  „gefestigt" über ihre Voraussetzungsschwelle (ohne Rohwert), SQL „sitzt"
  über dieselbe Ableitung wie seine Wissenslandkarte (kein Prozentmodell);
  Projekte „abgenommen" (Python), „abgegeben" (SQL), „keine" (AIPfad).
- Hub `/fortschritt`: Karten je Pfad mit Lektionsfortschritt, fälligen
  Wiederholungen, Konzeptbelegen, Projektstatus und letzter Aktivität, dazu
  VokabelPfad **lokal**. Je Quelle eigener Zustand (angemeldet, nicht
  angemeldet, nicht erreichbar, nicht verbunden), eigene Zeitgrenze.
- **Kein** Gesamtprozent, kein Mastery-Score, kein Ranking, keine Lernzeit.
  Einzige Summe „Fällig insgesamt", nur wenn alle verbundenen Quellen
  geantwortet haben.
- Freischaltung: `PROGRESS_FEDERATION_SOURCES` (Vorgabe leer = aus), getrennt
  von LP-05B; in diesem Slice kein Produktionswert.
- Einzelheiten: `docs/LEARNING-PLATFORM.md`, Abschnitt 12.

Das Beispiel oben (Prozent je Pfad, Lernminuten) bleibt bewusst **nicht**
umgesetzt: Prozentwerte der Apps messen Verschiedenes, und Lernzeit braucht
erst eine gemeinsame Tages-, Zeitzonen- und Sitzungssemantik.

---

## LP-08 — Gemeinsame Identität / SSO

Priorität: **P1, aber erst nach LP-07-Entscheidung**

### Ziel

Ein Login für alle Lernpfade.

### Optionen

1. zentrale Auth-App / OIDC
2. gemeinsamer Auth Provider
3. gemeinsame Plattformdatenbank
4. signierte Session Federation

### Mindestanforderungen

- serverseitige Sessionprüfung
- eindeutige Subject-ID
- CSRF-Schutz
- SameSite-/Domain-Cookie-Entscheidung
- Account-Löschung über alle Pfade
- Export über alle Pfade
- Audit Trail
- Tenant-/Organization-Modell nur bei echtem Bedarf

### Nicht tun

Cookies zwischen Apps einfach über eine Parent-Domain teilen, ohne
zentralisierten Session-Lifecycle zu definieren.

---

## LP-09 — Git & GitHub als eigener Pfad

Priorität: **P1**

### Ziel

Fachlich existiert der Stoff schon.

Erst auslagern, wenn es einen klaren Produktvorteil gibt.

### Vor Auslagerung

- eigener Einstieg im Hub
- Git-spezifische Landingpage
- Module:
  - Versionsverwaltung
  - Status / Staging
  - Commits
  - Branches
  - Merge
  - Remotes
  - Pull Requests
  - Reviews
  - CI
  - Recovery
  - AI-assisted Git workflow

### Entscheidung

Wenn Git stark mit AI-Coding gekoppelt bleibt, kann es dauerhaft ein
eigenständiger Pfad innerhalb derselben AIPfad-Runtime sein.

Ein eigenes Deployment ist kein Produktziel an sich.

---

## LP-10 — AIPfad Ausbau

Priorität: **P1 / strategischer Kern**

### Reihenfolge

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
11. Security
12. Governance
13. Observability / Kosten

### Leitregel

Keine Anbieter-Schulung als Fundament.

Claude, OpenAI, Gemini, Mistral etc. sind Beispiele innerhalb stabilerer
Konzepte.

---

## LP-11 — Data & Analytics

Priorität: **P1**

### Warum

Python + SQL + Data bilden die technische Grundlage für:

- RAG
- Evals
- AI Product Analytics
- Datenqualität
- Dataset Engineering

### Inhalte

- pandas
- Tabellen- und Datentypen
- Missing Data
- Joins
- Statistik-Grundlagen
- Visualisierung
- Datenqualität
- reproduzierbare Analysen
- einfache Experimente

---

## LP-12 — TypeScript & AI Web Apps

Priorität: **P1**

### Inhalte

- TypeScript
- React
- Next.js
- Server / Client
- APIs
- Schemas
- Validation
- Testing
- Streaming
- AI SDK Patterns
- Security Boundaries

### Ziel

Nicht „Frontend lernen“, sondern robuste AI-fähige Anwendungen bauen.

---

## LP-13 — Agenten & Automation

Priorität: **P2**

### Voraussetzung

AIPfad Tool Calling + API-Grundlagen müssen zuerst sitzen.

### Inhalte

- Tool Contracts
- State
- Retry
- Idempotency
- Human Approval
- Evals
- Observability
- Kosten
- Scheduling
- MCP
- Workflow Engines

---

## LP-14 — SecurityPfad

Priorität: **P2**

### Inhalte

- AuthN / AuthZ
- Sessions
- OAuth/OIDC
- Secrets
- CSRF
- Injection
- SSRF
- Least Privilege
- Supply Chain
- API Security
- Agent Tool Security
- Prompt Injection / Indirect Injection
- Auditability

---

# 3. Plattform-Roadmap nach Releases

## Release A — „Eine Marke“

Enthält:

- LP-01
- LP-02

Ergebnis:

- gemeinsame Homepage
- gemeinsame Dachleiste
- erster globaler Review-Prototyp

## Release B — „Eine Bedienlogik“

Enthält:

- LP-03
- LP-04

Ergebnis:

- gleiches UI-System
- gleiche Navigation
- gleiche Status-/Progress-Sprache

## Release C — „Ein Lernsystem“

Enthält:

- LP-05
- LP-06
- LP-07

Ergebnis:

- gemeinsames Review-Format
- VokabelPfad
- Plattformfortschritt

## Release D — „Ein Konto“

Enthält:

- LP-08

Nur umsetzen, wenn die vorherigen Releases zeigen, dass die Plattform
tatsächlich gemeinsam genutzt wird.

## Release E — „AI Learning Stack“

Enthält priorisiert:

- LP-09
- LP-10
- LP-11
- LP-12

Danach:

- LP-13
- LP-14

---

# 4. Definition of Done für jeden Slice

Ein Slice ist nicht fertig, nur weil die UI sichtbar ist.

Pflicht:

- Scope dokumentiert
- keine unbeabsichtigte Datenmigration
- Typecheck
- Lint/Format, sofern App vorhanden
- Unit Tests für Domänenlogik
- Integration Tests bei Persistenz
- Production Build
- Accessibility
- mobile Darstellung
- Error/Empty State
- keine toten Links
- README/Dokumentation aktualisiert
- Exact-Head-CI grün
- Preview geprüft
- kein automatischer Production Merge

Bei sicherheitsrelevanten Slices zusätzlich:

- AuthZ Review
- Datenlebenszyklus
- Threat Boundary
- Secret Handling
- Audit-/Privacy-Auswirkung

---

# 5. Was nicht auf die Roadmap gehört

Nicht als eigener Lernpfad bauen:

- einzelne Modelle
- einzelne AI-Anbieter
- einzelne Prompt-Sammlungen
- einzelne JavaScript-Frameworks
- einzelne Datenbanken
- einzelne No-Code-Anbieter

Solche Themen sind Module oder Beispiele.

Ein eigener Pfad braucht:

1. dauerhaftes mentales Modell
2. genügend Lerntiefe
3. messbaren Kompetenzfortschritt
4. eigene praktische Aufgaben
5. langfristige Relevanz

---

# 6. Stand der Integrationsbranch und nächste Schritte

Die Slices nach LP-01 liegen auf der Integrationsbranch
`claude/lernpfade-unified-hub` (PR #41, **noch nicht** nach `main` gemergt,
nicht produktiv):

- LP-05A Review Adapter Contract — in PR #41
- LP-05B föderierte, schreibgeschützte Wiederholungsquellen — PR #47,
  übernommen
- LP-06 VokabelPfad lokaler MVP — PR #55, übernommen
- LP-07 Plattformfortschritt (read-only Federation) — PR #57, übernommen
- LP-03A gemeinsame Shell-Tokens und Navigationsvertrag — PR #58, übernommen
  (Vertrag: `docs/learning-shell/README.md`)
- LP-03B gemeinsame Statusanzeigen (Badges, Callouts) und Quellzustände auf
  `/fortschritt` — PR #59, übernommen (Vertrag:
  `docs/learning-feedback/README.md`)
- Liquid Sculpture Hero für die Hub-Startseite — PR #60 (mit der nativen
  200-%-Chromium-Zoomprüfung aus PR #61), übernommen; Bildrechte offen (siehe
  `lernpfade/THIRD_PARTY_NOTICES.md`)
- LP-03C Button, Card, ProgressBar, EmptyState und ErrorState — eigener PR
  gegen die Integrationsbranch, **noch nicht übernommen** (Vertrag:
  `docs/learning-components/README.md`)

Übernommen heißt: in der Integrationsbranch, **nicht** in `main` und nicht
produktiv veröffentlicht. PR #41 bleibt offen; das ist keine Startfreigabe.
Prüfstand 26.10.2026: Integrations-Head `95fa1f794145358aafe3ff079dfddea186042490`;
Lernpfade Hub CI `40386028098` und AIPfad CI `40386027993` erfolgreich.

Offen und jeweils eine eigene Entscheidung:

1. Merge von PR #41 nach `main` **nur nach separater Release- und
   Deployment-Prüfung**. GitHub-Deployments zeigen eine Produktionskopplung
   für PythonPfad und SQLPfad. Der derzeitige Vercel-Status „Account is blocked“
   darf nicht als dauerhaft deaktivierter Rollout-Schutz behandelt werden.
2. Nutzungsrechte an den beiden Referenzbildern der Liquid Sculpture Hero
   vor jeder Produktivveröffentlichung bestätigen oder die Bilder ersetzen
   (`lernpfade/THIRD_PARTY_NOTICES.md`, Rechtestand offen).
3. Domain-/DNS-Entscheidung für same-site Hub und Apps — Voraussetzung für
   Live-Daten aus LP-05B und LP-07; ohne sie zeigen beide „nicht angemeldet".
4. LP-05C (Abschließen aus dem Hub) und LP-08 (gemeinsame Identität) erst nach
   dieser Domain-Entscheidung.

Nicht blockierende technische Nacharbeiten aus dem Integrationsreview:
- `lernpfade/tsconfig.json`: Next-16-generierte Einstellung gegenprüfen und
  bewusst einchecken, statt bei jedem Build einen schmutzigen Arbeitsbaum zu erzeugen.
- Flaky E2E beim Ausblenden des Touch-Hinweises auf überlastetem Software-Renderer
  (`lernpfade/e2e/liquid-hero-mobil.spec.ts`): CSS-Visibility-Übergang entkoppeln,
  ohne Assertions/Timeouts zu schwächen; danach gezielt und vollständig testen.
- Reproduzierbarkeit: fehlendes Hub-Lockfile separat priorisieren; Bytegleichheit der
  HTTP-Quelladapter wird derzeit nicht durch ein eigenes Gate erzwungen.
- **Python-/SQL-Gates — erledigt im LP-03C-PR (eigene Commits):** Der
  PythonPfad-Workflow lag unter `pythonpfad/.github/workflows/` und ist dort **nie
  gelaufen** (GitHub erkennt Workflows nur im Wurzelverzeichnis); SQLPfad hatte
  keinen. Jetzt `.github/workflows/pythonpfad-ci.yml` (PostgreSQL, Migrationen,
  Typecheck, Lint, Format, Vitest, Musterlösungen, Ausführungsaufzeichnung, Build,
  Playwright) und `.github/workflows/sqlpfad-ci.yml` mit zwei Jobs: dieselbe Kette
  für SQLPfad und **„SQL-Motor gegen SQL Server"** (Developer-Edition 2025, auf CU10
  festgelegt). Der erste echte Lauf von `tests/sql/` fand einen Fehler, den keine
  Attrappe gezeigt hätte: Der Motor verwarf **jedes** SELECT-Ergebnis (Treiber
  liefert die Spalten bei `batch()` an der Ergebnismenge). Behoben, dazu neue Tests
  der Sandbox-Berechtigungsgrenze (`tests/sql/berechtigung.integration.test.ts`)
  mit Gegenprobe. Nicht produktiv wirksam, solange `FEATURE_SQL_RUNNER` aus ist.
- **SQLPfad: Schreibaufgaben am Ergebnis bewerten — im selben PR (eigene Commits):**
  Auch mit eingeschaltetem Runner bekam jede Schreibaufgabe „noch nicht
  eingeschaltet"; der Vergleich lag fertig in der Fachschicht, war aber nicht
  angeschlossen. Jetzt „Stimmt" / „Noch nicht" mit Abweichungen / übersetzter
  Serverfehler, Versuch mit Fehlerart im Verlauf (`src/domain/aufgabe/ausfuehrung.ts`).
  Vorher geprüft: jede lesende Musterlösung gegen die echten Übungsdaten
  (`tests/sql/musterloesungen.integration.test.ts`) — fand ein falsches erwartetes
  Ergebnis (`a-having-schreiben`) und sechs Aufgaben ohne eines; beides behoben.
  Datumswerte nach dem Weg durch JSON zurückgewandelt (vorher zeigte `/abfrage`
  `…T00:00:00.000Z`). Neue E2E-Suite mit eingeschaltetem Übungsserver
  (`npm run test:e2e:uebungsserver`) im CI-Job „SQL Server – Motor, Musterlösungen,
  Ende zu Ende". Offen: Bewertung von Änderungsaufgaben (DML/DDL) und der Betrieb
  des Runner-Dienstes; die Lizenzfrage bleibt eine eigene Entscheidung.
- Befund aus LP-03C, **im selben PR behoben** (eigener Commit): In PythonPfad und
  SQLPfad stand `* { border-color: var(--border) }` ungeschichtet in `globals.css`
  und überstimmte damit **jede** Tailwind-Randfarbe — im Browser gemessen blieben
  u. a. die Richtig/Falsch-Ränder der Python-Übungen, der Fehlerrand im Editor und
  die Modulleisten in SQLPfad grau. Die Regel steht jetzt in `@layer base`;
  Regressionsprüfungen in `komponenten.spec.ts` werden ohne den Fix rot.
- Befund aus LP-03C (vorbestehend), **im selben PR behoben** (eigene Commits): Im
  dunklen Schema waren die SQL-Schlüsselwörter im SQLPfad-Editor kaum lesbar —
  CodeMirrors Vorgabefarben für helle Flächen, gemessen `SELECT` 1,61:1. Jetzt
  Hervorhebung über die Farbmarken (`.tok-*`), nachgerechnet im Unit-Test und im
  Browser (`abfrage.spec.ts`, ≥ 4,5:1 hell und dunkel); der Editor hat zudem einen
  zugänglichen Namen, axe prüft `/abfrage` jetzt ganz. Die „versetzten
  Zeilennummern" waren **kein** Fehler im Betrieb: CodeMirror misst einen Editor
  erst, wenn er sichtbar wird; Ganzseiten-Bildschirmfotos zeigten Editoren
  außerhalb des Bildschirms ungemessen. Im Browser nach dem Scrollen gemessen
  liegen Nummern und Zeilen exakt gleich; der neue Test hält das fest.
- Dabei gefunden und behoben: Das ausdrücklich gewählte Dunkelschema in SQLPfad trug
  als `--accent-soft` noch Navy statt Petrol (Systemschema). Ein Test vergleicht
  jetzt beide Dunkelblöcke Marke für Marke.

---

# 7. Erfolgsmetriken

Technik allein reicht nicht.

Später messen:

- Anteil Nutzer mit mehr als einem aktiven Pfad
- Weekly Learners
- Daily Review Completion
- Review Retention D1 / D7 / D30
- Sessions pro Woche
- abgeschlossene Projekte
- Wechsel zwischen Pfaden
- Zeit bis erste aktive Aufgabe
- Abbruch vor erster Aufgabe
- Anteil „Wissen“ vs. „Anwenden“
- Wiederholungs-Backlog
- Rückkehr durch fällige Reviews

Keine Vanity-Metrik als Primärziel.

Die zentrale Frage lautet:

> Lernen Menschen mit Lernpfade regelmäßig, aktiv und pfadübergreifend genug,
> dass ihr Wissen nachweisbar stabiler wird?
