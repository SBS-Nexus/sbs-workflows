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

## 10. Föderierte Wiederholungsquellen (LP-05B)

```text
Python source ─┐
SQL source ────┼──> Lernpfade federation ──> /wiederholen
AIPfad source ─┘

Source applications remain systems of record.
Lernpfade remains read-only in LP-05B.
```

### 10.1 Besitz der Daten

PythonPfad, SQLPfad und AIPfad bleiben die **Systeme der Wahrheit** für ihren
Lern- und Planungsstand. Lernpfade ist eine Aggregationsschicht: Es liest,
prüft, ordnet und zeigt an. Es gibt **keine** gemeinsame Review- oder
Nutzerdatenbank, **kein** SSO, **keine** geteilten Cookies, **keine**
Migration und **kein** Zurückschreiben. Abschließen, Bewerten und Umplanen
geschieht ausschließlich in der jeweiligen App.

### 10.2 Kanonische Identität

| Quelle | `sourceKind` | `sourceItemId` | Planungswahrheit |
|---|---|---|---|
| `python` | `exercise` | Aufgaben-ID | `ReviewQueueItem → Exercise` |
| `ai` | `exercise` | Aufgaben-ID | `ReviewQueueItem → Exercise` |
| `sql` | `concept` | Konzept-ID | `ConceptMastery.nextReviewAt` |

Schlüssel: `<source>:<sourceKind>:<sourceItemId>` — etwa `python:exercise:abc`,
`sql:concept:abc`, `ai:exercise:abc`. Gleiche Roh-IDs kollidieren dadurch nie.

**SQL bleibt konzeptbasiert.** Die Übungsaufgabe, die SQLPfad mit seiner
bestehenden, deterministischen Auswahl (`waehleAufgabenZuKonzepten`) zu einem
fälligen Konzept wählt, wird nur als Darstellungsangabe (`practice`)
mitgeliefert. Eine SQL-Antwort mit `exercise`-Identität wird vom Hub
abgewiesen, nicht umgedeutet; zwei Konzepte auf derselben Aufgabe bleiben
zwei Einträge. `ReviewQueueItem` wird in SQLPfad weiterhin nicht gefüllt.

### 10.3 Transport — und warum dieser

Die Apps sind getrennte Bereitstellungen mit eigener Datenbank und eigener
Sitzung (host-only, `httpOnly`, `SameSite=Lax`). Der Hub hat weder Konten noch
Datenbank noch Geheimnisse.

- **Direkte serverseitige Zusammensetzung** scheidet aus: Sie bräuchte
  Datenbankzugriff des Hubs auf drei Apps (gemeinsame Datenhaltung).
- **Hub-Server ruft Apps auf** scheidet aus: Der Hub-Server besitzt keine
  Sitzung der Person in der App. Sie zu beschaffen hieße SSO oder
  Cookie-Teilen — beides ausdrücklich nicht Teil von LP-05B.
- **Gewählt:** Der **Browser** ruft vom Hub aus je App eine enge Route
  `GET /api/platform/review-source?limit=N` mit `credentials: 'include'`
  auf. Das Cookie der App bleibt bei der App; der Hub liest es nie. Damit der
  Hub die Antwort lesen kann, gibt jede App CORS für **genau eine**
  konfigurierte Origin frei (`PLATFORM_HUB_ORIGIN`, Vorgabe leer = aus). Ein
  einfacher GET ohne eigene Kopfzeilen braucht keinen Preflight.

**Voraussetzung:** Browser schicken `SameSite=Lax`-Cookies nur bei
*same-site*-Anfragen. Hub und Apps müssen also unter derselben
registrierbaren Domain laufen (etwa `lernpfade.example.de` und
`python.lernpfade.example.de`). Unter `*.vercel.app` — einer Public-Suffix-
Domain — sind sie *cross-site*: Die Apps antworten dann mit 401, und der Hub
zeigt „nicht angemeldet". Lokal sind `localhost`-Ports same-site. Die
Domain-/DNS-Entscheidung ist ein eigener Schritt und **nicht** Teil von
LP-05B; die Cookie-Attribute werden dafür nicht gelockert.

### 10.4 Autorisierung

```text
request → Sitzung der App prüfen → userId serverseitig ableiten
        → nur deren Daten lesen → normalisieren → antworten
```

Keine Route nimmt eine `userId` an. Jeder Abfrageparameter außer `limit` wird
mit 400 abgewiesen. Kein Admin-Durchgriff, kein Kontowechsel.

### 10.5 Cache, Grenzen, Fehler

- Antworten: `Cache-Control: private, no-store, max-age=0`,
  `Vary: Origin, Cookie`, Route `force-dynamic` — nie in einem geteilten
  Cache, nie vorberechnet.
- `limit`: ganze Zahl 1–25, Vorgabe 10; alles andere → 400. Der Hub fragt 10
  je Quelle an und zeigt global höchstens 25 (`REVIEW_FEDERATION_LIMITS`).
  Liefert eine Quelle mehr als angefragt, wird ihre Antwort verworfen.
  Kürzung wird je Quelle und global gemeldet.
- Ordnung: `dueAt` aufsteigend, Gleichstand nach kanonischem Schlüssel —
  deterministisch, unabhängig von der Reihenfolge der Antworten.
- Fehlercodes: 401 `unauthenticated`, 400 `invalid_request`, 500
  `unavailable`. Keine Meldungen, Stacks oder Datenbankdetails.

### 10.6 Teilausfall

Jede Quelle hat einen eigenen Zustand: `ok`, `unauthenticated`,
`unavailable`, `not_configured`. Eine ausgefallene, zu langsame (5 s) oder
vertragswidrige Quelle wird isoliert; die übrigen bleiben nutzbar. Die
Oberfläche zeigt etwa „SQL derzeit nicht verfügbar. Andere Wiederholungen
bleiben nutzbar." Fehlende Anmeldung wird nie zu „nichts fällig"
heruntergestuft.

### 10.7 Inhalte und Veröffentlichung

- Nur eigene, fällige, nicht abgeschlossene Einträge.
- Nur veröffentlichte Inhalte: AIPfad mit seinem Prädikat
  `veroeffentlichteAufgabe` (ganze Kette), PythonPfad mit der ganzen Kette
  Aufgabe → Lektion → Modul → Kurs, SQLPfad mit derselben Auswahl wie seine
  Wiederholungsseite.
- **Keine Musterlösung:** Die Antwortseite einer Karte ist die öffentliche
  Konzepterklärung (`Concept.description`), nie `solution`, `solutionSql`,
  `solutionNotes`, Hinweise oder Tests. Die Musterlösung bleibt hinter der
  Hinweisleiter der App.

### 10.8 `/wiederholen` im Hub

- **LIVE · Python / SQL / AI**: echte fällige Einträge, nur Anzeige, mit Weg
  zurück in die App („In PythonPfad wiederholen"). Keine Bewertungsknöpfe.
- **DEMO · Beispiel**: das lokale Demo-Deck; seine Bewertungen bleiben im
  Browser und ändern ausdrücklich keine App.
- Live-Quellen sind opt-in: `NEXT_PUBLIC_REVIEW_FEDERATION_SOURCES=python,sql,ai`
  plus die vorhandenen `NEXT_PUBLIC_*_URL`. Ohne beides bleibt es beim Demo.

### 10.9 Restrisiko

Eine XSS-Lücke im Hub könnte die Wiederholungsdaten der angemeldeten Person
über diese Routen lesen — nur lesen, nur diese Route, nur die eigene Person.
Das ist der Preis jeder CORS-Freigabe mit Anmeldedaten und der Grund, warum
sie auf genau eine Origin beschränkt und standardmäßig aus ist.

### 10.10 Danach

- **LP-05C** (Abschließen/Bewerten aus dem Hub) braucht eine eigene,
  schreibende Grenze je App (POST, CSRF, Idempotenz) — nicht eine Erweiterung
  dieser GET-Route.
- **LP-07** kann dasselbe Muster für Fortschritt nutzen; scheitert die
  Same-Site-Voraussetzung, spricht das für LP-08 (gemeinsame Identität),
  nicht für das Teilen von Cookies.
