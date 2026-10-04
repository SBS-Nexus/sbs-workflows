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

Der **VokabelPfad** (seit LP-06 als lokaler MVP unter `/vokabeln`, siehe
Abschnitt 11) ist zugleich der Prototyp für einen gemeinsamen
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
- **VokabelPfad** (LP-06): eigener Hinweis mit Weg zu `/vokabeln`. Eigene
  Vokabeldaten erscheinen nicht unter LIVE oder DEMO und werden nie an eine
  Quelle gesendet.

### 10.9 Restrisiko

Eine XSS-Lücke im Hub könnte die Wiederholungsdaten der angemeldeten Person
über diese Routen lesen — nur lesen, nur diese Route, nur die eigene Person.
Das ist der Preis jeder CORS-Freigabe mit Anmeldedaten und der Grund, warum
sie auf genau eine Origin beschränkt und standardmäßig aus ist.

### 10.10 Danach

- **LP-05C** (Abschließen/Bewerten aus dem Hub) braucht eine eigene,
  schreibende Grenze je App (POST, CSRF, Idempotenz) — nicht eine Erweiterung
  dieser GET-Route.
- **LP-07** nutzt dasselbe Muster für Fortschritt (Abschnitt 12); scheitert die
  Same-Site-Voraussetzung, spricht das für LP-08 (gemeinsame Identität),
  nicht für das Teilen von Cookies.

## 11. VokabelPfad — lokaler MVP (LP-06)

Status: implementiert auf einem abhängigen PR der Integrationsbranch
`claude/lernpfade-unified-hub`. Nicht in `main`, nicht produktiv veröffentlicht.

### 11.1 Umfang

`/vokabeln` in der Hub-App: eigene Decks **Englisch ↔ Deutsch**, Karten mit
Begriff (Englisch), Übersetzung (Deutsch), optionalem Satzkontext und Tags,
beide Lernrichtungen, Daily Review, einfache Statistik, JSON-Import/-Export
und zwei redaktionelle Starterdecks. Technische Begriffe (Git, SQL, Python,
AI) nutzen dieselbe Kartenlogik als eigene lokale Sammlung — ohne Identität
oder Fortschritt der anderen Apps.

Das Modell trägt Sprachcodes (`sourceLanguage`, `targetLanguage`), damit
weitere Sprachpaare später ohne Formatbruch möglich sind. Angeboten und
validiert wird heute ausschließlich `en` → `de`.

### 11.2 Speicher und Versionierung

- **Technik:** IndexedDB, eigene Datenbank `lernpfade-vokabeln`
  (Object Store `daten`, ein Datensatz `zustand` mit dem serialisierten
  Zustand), getrennt vom Demo-Deck (`localStorage`,
  `lernpfade-review-state-v1`). Begründung: Nur eine IndexedDB-
  `readwrite`-Transaktion macht „Revision prüfen und schreiben" über alle
  Tabs derselben Origin atomar. Mit `localStorage` könnten zwei Tabs beide
  dieselbe Revision prüfen, bevor einer schreibt — der spätere Schreibvorgang
  würde den früheren still verwerfen.
- **Format:** `{ version: 1, revision, decks, cards, reviews, activity }`.
  Gelesen wird als `unknown` und vollständig geprüft (Version, erlaubte
  Felder, IDs, Referenzen, Zeitstempel, Ratings, endliche Zahlen, Grenzen).
- **Beschädigt / künftige Version:** wird angezeigt, nie automatisch
  überschrieben. Angeboten werden „Rohdaten sichern" (lokaler Download) und
  „VokabelPfad zurücksetzen" — nur nach Bestätigung, nur dieser Datensatz;
  Demo-Deck und andere Daten der Seite bleiben unberührt.
- **Schreiben:** Jede Änderung beruht auf einer Revision. Gespeichert wird nur,
  wenn im Speicher noch genau diese Revision liegt — geprüft und geschrieben
  in derselben `readwrite`-Transaktion (atomare Konfliktsperre); danach wird
  zurückgelesen. Ein Tab speichert immer nur einen Vorgang zugleich.
  „Speicher voll" und andere Fehler werden als Fehler gemeldet, der vorige
  Stand bleibt unverändert.
- **Tabs:** Nach jedem Speichern meldet ein Tab den neuen Stand über einen
  `BroadcastChannel` (`lernpfade-vokabeln`); andere Tabs sperren sich sofort
  mit einem Hinweis, bis der aktuelle Stand geladen wird. Die Meldung ist nur
  Komfort: Auch ohne sie (Kanal nicht verfügbar, Meldung verpasst) lehnt die
  Revisionsprüfung beim Schreiben einen veralteten Tab ab und sperrt ihn. Es
  gibt kein automatisches Zusammenführen.
- **Hydration:** Server und erster Client-Render zeigen denselben
  Ladezustand; gelesen wird erst nach dem Mount.

### 11.3 Datenverlustgrenze

Die Daten liegen ausschließlich in diesem Browser auf diesem Gerät. Es gibt
kein Konto, keine Synchronisation und keine Sicherung durch Lernpfade. Löschen
der Browserdaten, privater Modus oder ein anderer Browser bedeuten: keine
Daten. Der Export sichert Inhalte, **keinen** Lernfortschritt. Das steht so
auch in der Oberfläche.

### 11.4 Karte, Abfrage, Richtungsschlüssel

- **Karte** = ein Vokabeleintrag. **Abfrage** = eine Lernrichtung einer Karte;
  jede Karte hat genau zwei.
- Review-Schlüssel je Abfrage: `<deckId>:<cardId>:<en-de|de-en>`. IDs sind
  Kleinbuchstaben/Ziffern/Bindestrich (1–64 Zeichen) ohne Doppelpunkt; der
  Schlüssel ist dadurch eindeutig zerlegbar. Titel, Text oder Position sind
  nie Identität.
- Begriff oder Übersetzung ändern: nach Bestätigung starten **beide**
  Richtungen der Karte neu. Satzkontext, Tags, Deckname: Fortschritt bleibt.
- Löschen entfernt Karten, Fortschritt und Tageszähler des gelöschten Inhalts.

### 11.5 Daily Review

- Auswahl: Englisch → Deutsch, Deutsch → Englisch oder beide; Decks wählbar.
- Aufgenommen werden nur neue oder fällige Abfragen; Reihenfolge nach
  Fälligkeit (neu = Anlagezeitpunkt), dann Schlüssel; höchstens 20.
- Die Warteschlange wird beim Start fest gebildet; jede Abfrage wird genau
  einmal bewertet. Doppelklicks planen und zählen nicht doppelt.
- Prompt zuerst; Antwort, Satzkontext und Tags erst nach dem Aufdecken.
- Scheduling unverändert über den gemeinsamen Review-Core; „Nochmal" = morgen.
- Abschluss: Ist für dieselbe Auswahl (Decks und Richtungen wie beim Start)
  noch etwas fällig — etwa weil die Session bei 20 gedeckelt war —, nennt der
  Abschluss die Zahl und bietet „Nächste Session starten" an. Erst wenn nichts
  mehr fällig ist, wird die nächste Fälligkeit genannt.
- Nichts fällig: ehrlicher Abschluss mit nächster Fälligkeit, keine
  Endlosschleife.

### 11.6 Statistik und Tageszählung

Karten, Abfragen (= Karten × 2), fällige Abfragen je Richtung, heute
abgegebene Bewertungen. „Heute" ist der Kalendertag in der Zeitzone des
Browsers (`Intl…resolvedOptions().timeZone`); gespeichert wird nur der
laufende Tag. Keine Lernminuten, keine Beherrschungsprozente.

**Zeitbasis der Oberfläche:** Statistik, Fälligkeiten je Deck, die
Auswahlzusammenfassung und der Startknopf rechnen mit einer gemeinsamen
Zeit (`actions.now`). Sie wird neu gesetzt, wenn sich Angezeigtes von selbst
ändern kann — zur nächsten Fälligkeit oder zum nächsten lokalen
Tagesbeginn (`nextChangeAt`, spätestens alle 15 Minuten) —, bei der Rückkehr
in den Tab (`visibilitychange`, `focus`, `pageshow`) und nach jedem
Speichern. Eine offene Übersicht wird damit ohne Reload und ohne
Auswahlwechsel aktuell. Die Aktualisierung schreibt nichts, startet keine
Session und ändert die Warteschlange einer laufenden Session nicht.

### 11.7 JSON-Format (Schema 1)

```json
{
  "format": "lernpfade-vokabeln",
  "schemaVersion": 1,
  "exportedAt": "2026-10-04T12:00:00.000Z",
  "progressIncluded": false,
  "hinweis": "Enthält nur Decks und Karten, keinen Lernfortschritt. …",
  "decks": [
    {
      "id": "beispiel-reisen",
      "name": "Beispiel: Reisen",
      "description": "optional",
      "sourceLanguage": "en",
      "targetLanguage": "de",
      "origin": { "kind": "self", "label": "Selbst erstellt" },
      "cards": [
        { "id": "beispiel-reisen-luggage", "term": "luggage", "translation": "Gepäck",
          "context": "optional", "tags": ["reisen"] }
      ]
    }
  ]
}
```

- `origin.kind`: `self` | `starter` | `import`; `label` ist die angezeigte
  Herkunft. Importierte Decks zeigen „Importiert · Herkunft laut Datei: …".
- Import: Dateigröße vor dem Lesen prüfen → vollständige Prüfung → Vorschau
  (Decks, Karten, Sprache, Herkunft) → Übernahme nur nach Bestätigung,
  atomar. Unbekannte Felder, Prototyp-Schlüssel, doppelte IDs, unbekannte
  Versionen, `progressIncluded: true` und Grenzüberschreitungen werden
  abgelehnt. Bereits vorhandene IDs ⇒ Ablehnung mit Erklärung, kein
  Duplikat, kein überschriebener Fortschritt.
- Export: **kompaktes** JSON plus Zeilenende, für ein Deck und für alle Decks
  über denselben Weg (`prepareExport`). Gemessen werden die UTF-8-Bytes der
  tatsächlich heruntergeladenen Datei. Läge sie über 2 MiB, wird keine Datei
  erzeugt und kein Erfolg gemeldet, sondern erklärt, warum — bei „Alle Decks
  exportieren" mit dem Hinweis, die Decks einzeln zu exportieren. Nie gekürzt.
- Roundtrip-Garantie: Damit jedes Deck einzeln exportier- und wieder
  importierbar bleibt, darf kein Deck größer werden als eine Exportdatei
  (≤ 2 MiB) — gemessen auch in der Form, die der Import speichert
  (`deckRoundtripBytes`): Der Import setzt die Herkunft auf `import`, ein
  selbst erstelltes Deck wird als Export dadurch 2 Bytes größer. Karte
  anlegen/bearbeiten, Deck bearbeiten und Import prüfen das und lehnen sonst
  mit Erklärung ab. Der Export entscheidet ebenso: Ein gespeicherter Bestand
  genau an der Grenze, dessen Import scheitern würde, wird nicht exportiert;
  die Meldung nennt die fehlenden Bytes (z. B. Deckname um 2 Zeichen
  kürzen). Ein Deck, das diese Grenze schon
  überschreitet (nur aus Daten außerhalb dieser Version denkbar), bleibt
  lesbar und lernbar, wird aber nicht exportiert; es zu sichern verlangte ein
  mehrteiliges Exportformat (neue Schema-Version) — das ist nicht Teil von
  LP-06. Die Importgrenze von 2 MiB bleibt unverändert.
- Inhalte werden nur als Text gerendert. Beispieldatei:
  `lernpfade/public/vokabeln/beispiel-import.json`.

### 11.8 Grenzen

| Grenze | Wert |
|---|---|
| Importdatei | 2 MiB |
| Exportdatei / ein Deck als Exportdatei | 2 MiB (UTF-8, kompakt) |
| Decks | 50 |
| Karten insgesamt | 1.000 (auch über mehrere Importe und manuelle Eingabe) |
| Deckname / Beschreibung / Herkunft | 80 / 300 / 120 Zeichen |
| Begriff / Übersetzung / Satzkontext | 200 / 200 / 500 Zeichen |
| Tags je Karte / Taglänge | 10 / 32 Zeichen |
| Abfragen je Session | 20 |

Zeichen = Unicode-Zeichen (Code Points). Texte sind einzeilig; Steuerzeichen
werden abgelehnt.

### 11.9 Tests

```bash
cd lernpfade
npm run test       # Unit: Review-Core, Föderation, VokabelPfad (Domäne + Speicher)
npm run typecheck
npm run build
npm run test:e2e   # Playwright gegen Produktionsbuild: Desktop, 375 px, 200 % Zoom, axe
```

Die E2E-Tests beantworten die LP-05B-Quellen mit `page.route`-**Mocks**; sie
belegen das Verhalten des Hubs, nicht das der echten Apps.

## 12. Plattformfortschritt — read-only Federation (LP-07)

Stand: implementiert auf dem abhängigen Branch `claude/lernpfade-lp07-progress`
(PR gegen `claude/lernpfade-unified-hub`); **nicht** in `main`, **nicht**
produktiv aktiviert. Architekturentscheidung: **Option A — Aggregation über
die bestehenden Apps.**

```text
Python Progress ─┐
SQL Progress ────┼──> Browser im Lernpfade-Hub ──> /fortschritt
AIPfad Progress ─┘
VokabelPfad local IndexedDB ────────────────┘

Die drei Apps bleiben Systeme der Wahrheit.
Der Hub liest, validiert, normalisiert und zeigt nur an.
```

### 12.1 Datenbesitz

PythonPfad, SQLPfad und AIPfad bleiben die **Systeme der Wahrheit** für ihren
Lernstand; VokabelPfad bleibt lokal im Browser. Der Hub besitzt keine
Fortschrittsdaten: kein gemeinsames Konto, keine gemeinsame
Fortschrittsdatenbank, kein SSO, keine Cookie-Freigabe über eine
Parent-Domain, keine Datenmigration, kein Zurückschreiben. Die bestehenden
Fortschrittsseiten der Apps bleiben unverändert; LP-07 liest ihre Wahrheiten,
es ersetzt sie nicht.

### 12.2 Transport, Autorisierung, Cache

Je App eine **eigene** Route `GET /api/platform/progress-source` — bewusst
nicht eine Erweiterung von `review-source` (Abschnitt 10). Sonst gilt alles
aus 10.3–10.5:

```text
request → Origin/CORS prüfen → Sitzung der App prüfen
        → userId ausschließlich serverseitig ableiten
        → nur aggregierte eigene Daten lesen → versionierte Antwort
```

- Der **Browser** ruft jede App mit deren eigener Sitzung auf
  (`credentials: 'include'`); der Hub-Server sieht weder Cookie noch Kennung.
- Die Route nimmt **keinen** Abfrageparameter an; jeder — insbesondere
  `userId`, E-Mail oder Konto-ID — wird mit 400 abgewiesen. Ohne Sitzung 401.
  Nur GET; andere Methoden 405.
- CORS nur für genau `PLATFORM_HUB_ORIGIN` (dieselbe Einstellung wie LP-05B,
  Vorgabe leer = aus). `Cache-Control: private, no-store, max-age=0`,
  `Vary: Origin, Cookie`, `force-dynamic`. Fehler ohne Meldung, Stack oder
  Datenbankdetail.
- `src/server/platform/progress-source-http.ts` ist in allen drei Apps
  wortgleich.
- **Freischaltung im Hub:** `PROGRESS_FEDERATION_SOURCES=python,sql,ai`
  (Vorgabe leer = aus), getrennt von `NEXT_PUBLIC_REVIEW_FEDERATION_SOURCES`,
  plus die vorhandenen `NEXT_PUBLIC_*_URL`. Der Schalter wird zur Laufzeit
  auf dem Server gelesen (`/fortschritt` ist dynamisch gerendert, enthält
  serverseitig aber keine personenbezogenen Daten); Umschalten braucht keinen
  neuen Build. In diesem Slice wird **kein** Produktionswert gesetzt.

### 12.3 Progress-Contract — Schema 1

```ts
type PlatformProgressSourceV1 = {
  schemaVersion: 1
  source: 'python' | 'sql' | 'ai'
  generatedAt: string                     // ISO-8601 UTC
  participation: { hasActivity: boolean }
  lessons: { completed: number; total: number }
  reviews: { due: number }
  concepts: {
    observed: number
    ready: number
    criterion: 'prerequisite-ready' | 'all-assessable-tasks-last-passed'
  }
  activity: { lastActiveAt: string | null }
  projects:
    | { kind: 'accepted'; done: number; total: number }
    | { kind: 'submitted'; done: number; total: number }
    | { kind: 'unsupported' }
}
```

Der Hub (`lernpfade/src/domain/progress/contract.ts`) prüft geschlossen:
genau diese Felder auf jeder Ebene (unbekannte → ungültig), Version 1 (sonst
ungültig, nie still interpretiert), `source` = angefragte Quelle, endliche
nichtnegative Ganzzahlen bis 1 000 000, `completed ≤ total`,
`ready ≤ observed`, `done ≤ total`, echte ISO-Zeitpunkte, und die
**quellspezifische Semantik**: `criterion` und `projects.kind` sind je Quelle
fest (siehe 12.4); eine Quelle, die eine fremde Semantik meldet, ist ungültig.
`hasActivity: false` neben vorhandenen Belegen ist widersprüchlich und
ungültig. Eine ungültige Antwort macht nur diese Quelle „nicht erreichbar".

### 12.4 Quellspezifische Semantik — bewusst nicht vereinheitlicht

| | PythonPfad | SQLPfad | AIPfad |
|---|---|---|---|
| Lektionen | Lektion, Modul, Kurs veröffentlicht; `LessonProgress.state = COMPLETED` — Zähler und Nenner derselbe Bestand | veröffentlichte Lektionen wie im eigenen Überblick; Zähler auf denselben Bestand begrenzt | `veroeffentlichteLektion` für Zähler und Nenner, wie `/fortschritt` der App |
| Wiederholungen fällig | eigene, offene, fällige `ReviewQueueItem` veröffentlichter Aufgaben — dieselbe Wahrheit wie die Wiederholungsquelle | fällige, übbare Konzepte über `ConceptMastery.nextReviewAt` — dieselbe Bedingung wie die Wiederholungsquelle (je Konzept gezählt) | wie PythonPfad, mit `veroeffentlichteAufgabe` |
| Konzepte beobachtet | eigene `ConceptMastery`-Belege (entstehen nur durch Bearbeitung), Wert 0–100 gültig | beurteilbare Konzepte mit mindestens einer bearbeiteten Aufgabe (Stand `angefangen`, `wackelig`, `sitzt`) | wie PythonPfad |
| Konzepte bereit | `meetsPrerequisite` (Voraussetzungsschwelle der App) — `prerequisite-ready` | nur Stand `sitzt` = alle beurteilbaren Aufgaben zuletzt gelöst — `all-assessable-tasks-last-passed` | `meetsPrerequisite` — `prerequisite-ready` |
| Projekte | `accepted`: veröffentlichte Projekte mit Abgabe `ACCEPTED` | `submitted`: veröffentlichte Projekte mit Abgabe `SUBMITTED` | `unsupported` |
| Letzte Aktivität | spätester Versuch, Lernsitzungseintrag oder Lektionsabschluss | spätester Versuch, Lernsitzungseintrag (`haltAktivitaetFest`) oder Lektionsabschluss | spätester Aufgabenversuch, Lab-Eintrag oder Lektionsabschluss |

**SQL ist kein Prozentmodell.** SQLPfad leitet den Konzeptstand bei jedem
Aufruf aus den letzten eigenen Ergebnissen ab (`bewerteKonzept`, dieselbe
Ableitung wie seine Wissenslandkarte) und nennt ein Wort, keine Zahl.
`ConceptMastery.masteryScore` schreibt SQLPfad nicht; er wird weder gelesen
noch weitergegeben und nie als Kompetenz- oder Cross-App-Metrik genutzt.
Python und AIPfad haben ein Kompetenzmodell mit Wert 0–100; der **Rohwert
verlässt die App nicht** — nur die Zahl der Konzepte über der
Voraussetzungsschwelle der jeweiligen App. „Gefestigt" (Python/AI) und
„sitzt" (SQL) sind verschiedene Kriterien und werden im Hub mit ihrer
eigenen Bedeutung beschriftet, nicht verrechnet.

**Projekte:** PythonPfad nimmt Abgaben ab (`ACCEPTED`) — angezeigt als
„abgenommen". SQLPfad markiert eine Abgabe nie automatisch als abgenommen —
angezeigt als „abgegeben", mit dem Hinweis, dass SQLPfad nicht fachlich
abnimmt. AIPfad hat keine Projektwahrheit — angezeigt als „AIPfad hat keine
Projekte", nie als „0 von 0".

**Aktivität:** nur ein ehrlicher letzter Zeitpunkt je Pfad. **Keine** Lernzeit
und keine Tageswerte über Pfade hinweg, solange Tages-, Zeitzonen- und
Sitzungssemantik der Apps nicht vereinheitlicht sind. Bloßes Öffnen einer
Seite ist keine Aktivität.

### 12.5 Privacy-Minimierung

Die Antwort enthält nur Zähler, feste Aufzählungswerte und Zeitstempel —
keine Namen, E-Mails, Nutzer- oder Sitzungskennungen, keine Lektions- oder
Konzepttitel, keine Prompts, Antworten, Code, SQL oder Projektinhalte, keine
Rohwerte. Der strenge Feldabgleich im Hub lässt keinen Platz für zusätzliche
Felder. Protokolliert wird je App nur Ereignisname und Fehlerart, nie eine
Antwort.

### 12.6 Teilausfall und Gesamtwerte

- Jede Quelle wird für sich geladen und angezeigt (eigene Zeitgrenze 5 s);
  eine langsame oder ausgefallene Quelle blockiert weder die anderen noch die
  lokalen Vokabeln. Die Reihenfolge der Karten ist fest.
- Zustände je Quelle: `ok`, `unauthenticated`, `unavailable`,
  `not_configured`. „Nicht angemeldet", „nicht verbunden", „nicht erreichbar"
  und eine unbekannte Vertragsversion sind **nie** „0 Fortschritt". Eine
  echte 0 erscheint nur nach erfolgreicher Anmeldung und Prüfung.
- **Kein** globaler Mastery-Score, **kein** gewichtetes Gesamtprozent, kein
  Ranking, keine Lernminuten, kein „eingeschrieben" (es gibt keine zentrale
  Enrollment-Wahrheit). Das Lektionsverhältnis je Pfad heißt
  „Lektionsfortschritt", nicht Kompetenz.
- Die einzige Summe, **„Fällig insgesamt"**, zählt fällige Wiederholungen der
  Apps und fällige Vokabelabfragen, je Quelle ausgewiesen. Fehlt eine
  verbundene Quelle oder sind die lokalen Vokabeln unlesbar, gibt es **keine**
  Gesamtzahl, sondern den Hinweis, was fehlt.

### 12.7 VokabelPfad lokal

- Gelesen wird die bestehende IndexedDB über denselben Adapter wie
  `/vokabeln`; ausgewertet mit derselben Statistik (`vocabStats`): Karten,
  Decks, fällig je Richtung, heute bewertet. Kein Upload, kein neuer
  Endpunkt, kein Konto. Kennzeichnung: **LOKAL · nur in diesem Browser**.
  Gelesen wird nur; gibt es noch keine VokabelPfad-Datenbank, legt der
  Browser beim Öffnen — wie auf `/vokabeln` — die leere Struktur an, ohne
  Daten.
- Beschädigte, künftige oder gesperrte Speicherstände bleiben ein sichtbarer
  Fehler mit Weg zu `/vokabeln` — nie 0.
- Das DEMO-Deck aus `/wiederholen` (`localStorage`) zählt weder zum Vokabel-
  noch zum Plattformfortschritt.

### 12.8 Same-Site-Grenze und Previews

Wie 10.3: Ohne gemeinsame registrierbare Domain schickt der Browser das
`SameSite=Lax`-Sitzungscookie nicht mit. Unter `*.vercel.app` (Public Suffix)
antworten die Apps dem Hub deshalb mit 401, und `/fortschritt` zeigt „nicht
angemeldet". Die Cookie-Attribute werden nicht gelockert; Domain-/DNS-Arbeit
ist nicht Teil von LP-07. Previews der Apps belegen die Routen, nicht den
föderierten Browserablauf.

### 12.9 Restrisiko

Wie 10.9: Eine XSS-Lücke in der freigegebenen Hub-Origin könnte die
Fortschrittsaggregate der angemeldeten Person lesen — nur lesen, nur diese
Zahlen. Die Antwort enthält bewusst keine Inhalte.

### 12.10 Bewusste Nicht-Ziele

Kein SSO (LP-08), keine gemeinsame Identität, keine gemeinsame
Fortschrittsdatenbank, keine Prisma-Migration, kein Zurückschreiben oder
Abschließen aus dem Hub (LP-05C), keine Lernzeit-Aggregation, keine
Produktionsaktivierung, keine Domain-/DNS-Änderung.

### 12.11 Tests

- Je App: Vertrag und HTTP-Grenze ohne Datenbank
  (`tests/unit/platform-progress-source-http.test.ts`) und Leser plus Route
  gegen eine echte PostgreSQL-Datenbank
  (`tests/integration/platform-progress-source.test.ts`): nur eigene Daten,
  Veröffentlichung, Zähler/Nenner, Review-Gleichheit mit der
  Wiederholungsquelle, Konzept- und Projektsemantik, letzte Aktivität,
  keine Schreibwirkung, 401/400, CORS, Cache.
- Hub: `src/domain/progress/*.test.ts` (Vertrag, Abruf, Teilausfall,
  Summenregel, Reihenfolgeunabhängigkeit, Vokabeln lokal) und
  `e2e/fortschritt.spec.ts` gegen den Produktionsbuild — die Quellen sind dort
  ausdrücklich `page.route`-**Mocks**. Für „nicht verbunden" startet Playwright
  einen zweiten Prozess desselben Builds ohne Freischaltung.
