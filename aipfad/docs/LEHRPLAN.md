# Lehrplan

Vollständiges Zielbild von AIPfad (20 Stufen) und ehrlicher Stand dieser
ersten Implementierungsrunde. Qualität vor Quantität: diese Runde baut vier
Stufen zu voller Tiefe (echte Lektionen, Aufgaben, Labs, Tests), statt alle
20 oberflächlich anzureißen.

## Gebaut in dieser Ausbaustufe

| Stufe | Titel                              | Umfang                                                                                                                                                              |
| ----- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Orientierung                       | 3 Lektionen, Placement-Instrument (im Onboarding eingehängt)                                                                                                        |
| 1     | Technischer Arbeitsplatz (kompakt) | 3 Lektionen, Terminal-Simulator-Übung + eigenständiges Terminal-Lab                                                                                                 |
| 4     | LLM-Grundlagen                     | 4 Lektionen (Tokens/Tokenisierung, Embeddings/Aufmerksamkeit, Training/Inferenz/Kontextfenster, Nachrichtenrollen/Halluzination), Tokenizer-Lab, Kontextfenster-Lab |
| 5     | Prompting-Grundlagen               | 3 Lektionen (Ziel/Kontext, Constraints/Beispiele, Zerlegung/Iteration), Prompt-Reparatur-Lab                                                                        |

**Zusammen:** 13 Lektionen, 17 Aufgaben über 8 Aufgabentypen der Achse
`ExerciseType` (SINGLE_CHOICE, MULTIPLE_CHOICE, ORDERING, FILL_IN,
SCENARIO_DECISION, TERMINAL_SIMULATION, PROMPT_REPAIR, TRANSFER), 4 Labs,
17 Konzepte, 1 Kurs. Die Zahl nannte vorher sechs und zählte acht auf; die
Interaktionsform (`payload.kind`) ist zudem eine andere Achse als der
didaktische Aufgabentyp. Vollständige Infrastruktur: Auth, Mastery/Scheduling/Hints,
Content-Validator, Pfad, Bibliothek, Übungslauf, Wiederholung, Fortschritt,
Wissenslandkarte, Nachschlagen, Glossar, Setup-Center.

## Bewusst nicht gebaut (mit Begründung)

| Stufe/Bereich                         | Warum noch nicht                                                                                                                                                                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 — Git & GitHub                      | **In Ausbaustufe 2 umgesetzt.** Zwei Module (Git-Grundlagen, Zusammenarbeit) mit 13 Lektionen und drei Labs: Git-State, Branch, Merge-Konflikt. Siehe unten "Stand der Umsetzung".                                                              |
| 3 — AI/ML/Deep-Learning-Grundlagen    | Baut auf Stufe 4 auf, nicht umgekehrt — folgt sinnvoll danach.                                                                                                                                                                                  |
| 6 — HTTP & APIs                       | Voraussetzung für Stufe 7 (AI-APIs), noch nicht erreicht.                                                                                                                                                                                       |
| 7 — AI-APIs & SDKs                    | Würde Provider-Beispielcode brauchen, aktuell gegen offizielle Doku zu verifizieren — bewusst zurückgestellt statt aus dem Gedächtnis erfunden.                                                                                                 |
| 8 — Structured Outputs & Tool Calling | Baut auf Stufe 7 auf.                                                                                                                                                                                                                           |
| 9 — Embeddings (volle Tiefe)          | **In LP-10A umgesetzt** (siehe unten "Stand der Umsetzung: Stufe 9"). RAG bleibt bewusst Stufe 10.                                                                                                                                              |
| 10 — RAG                              | **In LP-10B umgesetzt** (siehe unten "Stand der Umsetzung: Stufe 10"). Didaktische Pipeline ohne Modell, Embedding-API oder Vektordatenbank.                                                                                                    |
| 11 — Agents                           | Baut auf Tool Calling (Stufe 8) auf.                                                                                                                                                                                                            |
| 12 — MCP                              | Baut auf Agents auf.                                                                                                                                                                                                                            |
| 13 — AI-Coding                        | Baut auf Git/GitHub (Stufe 2) auf — ergibt ohne diese keinen Sinn.                                                                                                                                                                              |
| 14 — CI/CD                            | Baut auf GitHub (Stufe 2) auf.                                                                                                                                                                                                                  |
| 15 — Evaluationen                     | Sinnvoll erst mit Agents/RAG als Prüfgegenstand.                                                                                                                                                                                                |
| 16 — AI-Sicherheit (eigene Stufe)     | Sicherheitsprinzipien sind in dieser Runde bereits in `docs/SECURITY.md` und in der Terminal-Lektion (gefährliche Befehle) verankert; eine eigene Stufe mit Prompt-Injection-Lab folgt, sobald Agents/MCP existieren, auf die sie sich bezieht. |
| 17 — DACH AI-Governance               | Explizit als volatil/rechtlich heikel markiert — braucht Primärquellen-Recherche zum jeweiligen Ausführungszeitpunkt, nicht aus dem Training erfunden.                                                                                          |
| 18 — Production AI/LLMOps             | Baut auf einem funktionierenden AI-Gateway auf (siehe unten).                                                                                                                                                                                   |
| 19 — Advanced                         | Ausdrücklich optional, kein Anfänger-Kern.                                                                                                                                                                                                      |
| 20 — Enterprise AI                    | Baut auf Governance (17) auf.                                                                                                                                                                                                                   |
| Organisationen/Kohorten               | Bewusst gestaffelt: ohne Unternehmenseinsatz gibt es nichts zu verwalten. Siehe `docs/ENTERPRISE-ROADMAP.md` (E08, E08B, E11A–C).                                                                                                               |
| Live-AI-Gateway/Playground            | Bewusst kein Live-Aufruf in Runde 1 (siehe `docs/CONTENT-POLICY.md`) — vermeidet Kosten, Secrets und Datenübertragung, bis eine dedizierte Gateway-Architektur (Provider-Abstraktion, Rate-Limits, Kostenbudget, Einwilligung) ansteht.         |
| Vollständiges Admin-Content-Studio    | Nur Lesebereich/Validator vorbereitet (`domain/content/schema.ts#validateCourseGraph`); Bearbeitungsformulare sind ein späterer Schritt.                                                                                                        |
| Rollenbasierte Tracks                 | Setzt mehr Inhalt über mehrere Stufen voraus, um sinnvoll zu filtern.                                                                                                                                                                           |
| Projekte/Capstone                     | `Project`/`ProjectSubmission` sind bewusst nicht modelliert — ergeben erst ab mehreren Modulen Sinn.                                                                                                                                            |
| Nicht-macOS Setup-Center              | Diese Runde deckt macOS ab (Entwicklungsumgebung); Windows/Linux folgen.                                                                                                                                                                        |
| PWA                                   | Nicht übernommen — noch keine Offline-relevante Funktion in dieser Ausbaustufe.                                                                                                                                                                 |

## Nächste sinnvolle Ausbauschritte (Reihenfolge nach Nutzen)

1. ~~**Placement ins Onboarding einhängen.**~~ **Erledigt.** Der Ablauf in
   `app/onboarding/` führt durch Einstellungen, die freiwillige Einstufung
   und speichert beides in einem Schritt. Offen bleibt daraus die feinere
   Markierung je Lektion: `evaluatePlacement()` berechnet
   `demonstratedConceptSlugs`, gespeichert wird das noch nicht — dafür
   bräuchte es eine eigene Spalte oder Tabelle.
2. ~~**Zwölf Quellenangaben brauchen das Präfix `pythonpfad/`.**~~
   **Erledigt in E01A.** Die übernommenen Kommentare verweisen jetzt
   ausdrücklich auf `pythonpfad/docs/…`; auch Fundstellen, deren
   Abschnittsnummer in AIPfad zufällig existiert, zeigen damit nicht mehr auf
   das falsche Thema.

3. ~~**Stufe 2 (Git & GitHub).**~~ **Erledigt in Ausbaustufe 2.** Größter fachlicher Hebel: Voraussetzung für
   AI-Coding, CI/CD und einen Großteil der praktischen Übungen.
4. **Stufen 3, 6–9** — die Infrastruktur (Content-Modell, Mastery,
   Übungstypen) trägt das bereits vollständig, es fehlt nur der Inhalt.
5. **AI-Sicherheit als eigene Stufe**, sobald Agents/MCP existieren.
6. **Governance/EU-AI-Act**, mit dediziertem Primärquellen-Rechercheschritt
   zum jeweiligen Umsetzungszeitpunkt.
7. **Organisationen/Kohorten**, wenn ein Unternehmenseinsatz ansteht.

## Stand der Umsetzung: Ausbaustufe 2 (Git & GitHub)

Umgesetzt sind zwei Module mit dreizehn Lektionen:

**Git — die Grundlagen** (7 Lektionen): warum Versionsverwaltung, die drei
Orte einer Datei, Commits schreiben, Diff und Verlauf lesen, Branches als
Zeiger, Fast-Forward gegen Merge-Commit, Merge-Konflikte auflösen.

**Git & GitHub — zusammenarbeiten** (6 Lektionen): Repositories an zwei
Orten, `fetch` ist nicht `pull`, GitHub ist nicht Git, der Weg eines Pull
Requests, Durchsicht und automatische Prüfungen, sicher zurück zu einem
guten Stand.

Drei deterministische Labs ohne echte Shell und ohne echtes Git:
`git-state-lab` (die drei Orte im Zusammenspiel), `branch-lab` (Commit-Graph,
Verzweigen, beide Merge-Arten) und `merge-conflict-lab` (Marker lesen, Stelle
für Stelle entscheiden, auflösen → vormerken → committen).

Die Befehlsreferenz im Nachschlagebereich deckt Git und die GitHub CLI ab;
jeder Eintrag nennt Wirkbereich, Gefährdungsstufe, Reversibilität und
Netzwerkbedarf.

### Bewusst noch nicht enthalten

`git rebase`, `cherry-pick`, `bisect`, `stash` und `tag` sind in der
Befehlsreferenz erklärt, aber nicht als eigene Lektionen ausgearbeitet — sie
gehören didaktisch hinter einen sicheren Umgang mit den Grundlagen. Ebenso
GitHub-Themen wie Branch Protection, CODEOWNERS, Secrets, Environments,
Deployments und Dependabot: Sie sind im Lernstoff eingeordnet, aber nicht
vertieft. Das ist Stoff für eine spätere Stufe, nicht ein Versehen.

## Stand der Umsetzung: Stufe 9 (LP-10A, Embeddings & semantische Suche)

Ein Modul mit vier Lektionen und dreizehn bewertbaren Aufgaben, angehängt
an das Ende des Kurses (die Reihenfolge bestehender Module bleibt
unverändert). Es setzt die Grundidee aus Stufe 4 voraus und wiederholt sie
nicht:

1. **Vektoren und Embeddings** — Text als Zahlenvektor, Dimensionen,
   Token- gegen Text-Embedding, Grenzen und Fehlerquellen.
2. **Ähnlichkeit berechnen** — Skalarprodukt, Vektorlänge,
   Kosinusähnlichkeit von Hand; warum Ähnlichkeit keine Wahrheit ist.
3. **Semantisches Retrieval** — Ablauf, Top-k, Schwelle, Schlüsselwort-
   gegen semantische Suche, Umgang mit fehlenden Treffern.
4. **Retrieval richtig beurteilen** — Relevanz gegen Ähnlichkeit, False
   Positives/Negatives, Precision und Recall, Chunking, Wahl eines anderen
   Verfahrens.

Neun neue Konzepte hängen über `embedding` am bestehenden Graphen. Dazu das
Lab **„Semantische Suche verstehen"** (`SEMANTIC_RETRIEVAL`, additive
Migration `20261107120000_semantic_retrieval_lab`): Anfrage und Suchbestand
wählen, didaktische Beispielvektoren ansehen, Kosinusähnlichkeit samt
Rechenweg, Rangliste, Top-k von 1 bis 5, Schwelle, Treffer mit Quelltext,
ein bewusst irreführender Treffer und zwei inhaltliche Entscheidungen, ohne
die sich das Lab nicht abschließen lässt. Die Mathematik liegt rein in
`src/domain/retrieval/`.

### Bewusst noch nicht enthalten

Kein vollständiges RAG, keine echte Embedding-API, keine Vektordatenbank,
keine LLM-Generierung, keine Modellnamen, Preise oder API-Parameter.
Hybride Suche und Re-Ranking sind als Begriff angerissen (Lektion 4), nicht
als eigenes Verfahren ausgearbeitet.

## Stand der Umsetzung: Stufe 10 (LP-10B, RAG – Wissen mit Quellen nutzen)

Ein Modul mit vier Lektionen und dreizehn bewertbaren Aufgaben, angehängt
hinter Stufe 9. Es setzt Kosinusähnlichkeit, Ranking und Top-k voraus und
wiederholt sie nicht:

1. **Von Dokumenten zu Chunks** — Aufbereitung, Chunk-Größe, Overlap,
   Trennstellen, Metadaten und Quellen, Kontextverlust.
2. **Retrieval für RAG** — Pipeline, Top-k, Relevanz gegen Ranking-Score,
   Quellenidentifikation.
3. **Kontext und belegte Antworten** — Kontextbudget, Auswahl und
   Reihenfolge, Quellenbelege, „nicht genügend Informationen".
4. **RAG-Fehler erkennen** — erfundene Quellen, veraltete und
   widersprüchliche Dokumente, unvollständige Antworten, zerschnittene
   Belege, Retrieval- gegen Antwortqualität, Evaluation.

Acht neue Konzepte hängen über `chunking` an Stufe 9 und über
`halluzination` an Stufe 4. Dazu das **RAG-Pipeline-Lab** (`RAG_PIPELINE`,
additive Migration `20261108120000_rag_pipeline_lab`).

### Was echt und was simuliert ist

| Baustein                                   | Stand                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Chunking nach Sätzen mit Größe und Overlap | echte, deterministische Rechnung (`domain/rag/chunking.ts`)                                 |
| Ranking und Top-k                          | echte Rechnung, unverändert aus LP-10A (`domain/retrieval/`)                                |
| Kontextauswahl unter Budget                | echte Rechnung (`domain/rag/kontext.ts`)                                                    |
| Belegprüfung und Evaluation                | echte Rechnung gegen redaktionelle Belegverweise (`domain/rag/antwort.ts`, `evaluation.ts`) |
| Satzvektoren                               | **simuliert**: didaktische Beispielvektoren, kein Embedding-Modell                          |
| Chunk-Vektor                               | **vereinfacht**: Summe der Satzvektoren                                                     |
| Kontextbudget                              | **simuliert**: Wort-Einheiten, keine Tokens eines Modells                                   |
| Antwort                                    | **simuliert**: vorgegebene Aussagen mit verknüpften Belegen, keine generierte Antwort       |

### Bewusste didaktische Vereinfachungen

Chunks bestehen aus ganzen Sätzen. Ein Beleg zählt nur, wenn alle Sätze
seiner Belegsgruppe im selben Chunk stehen — zwei getrennte Chunks werden
nicht zusammengelesen. Das Budget überspringt einen zu großen Chunk und lässt
kleinere nachrücken. Widerspruch und Veraltung sind redaktionell markiert,
nicht erkannt.

### Offen für einen produktiven Einsatz

Echte Embeddings und ein Vektorindex, ein Modellaufruf mit Belegpflicht,
Zugriffsrechte je Dokument, automatische Versionierung des Bestands, eine
Evaluationsmenge aus echten Fragen und ein Schutz gegen Anweisungen in
Dokumenttexten (Prompt Injection) gehören nicht zu diesem Lernmodul.

## LP-11A – Structured Outputs und Tool Calling (Offline-Grundlagen)

**Stand:** Für den isolierten Draft-Slice implementiert, noch nicht vollständig freigegeben. Die Stufen 6 (HTTP & APIs) und 7 (AI-APIs) sind weiterhin offen. Dieser Abschnitt ist deshalb **nicht** die vollständige Umsetzung der Lehrplanstufe 8 und erfüllt nicht deren API-Voraussetzungen.

Das Modul enthält drei einführende Lektionen zu JSON-Ausgabeverträgen, Tool-Aufruf-Vorschlägen sowie der Vertrauensgrenze von Tool-Ergebnissen. Das interaktive Vertragslabor validiert Beispiel-JSON und erlaubte, ausschließlich lesende Werkzeugaufrufe; es führt **keine** echte Funktion aus. Es nutzt die bestehende Lab-Persistenz und ein zusätzliches Prisma-Enum `TOOL_CALLING`, dessen additive Migration vor einer späteren produktiven Bereitstellung notwendig wäre. Alle Ergebnisse sind deterministisch. Die reguläre Behandlung von Authentifizierung, Berechtigung, Fehlern und Kosten einer realen Provider-Integration bleibt für die Stufen 6/7 und einen späteren praktischen Stufe-8-Slice offen.
