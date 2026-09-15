# Lehrplan

Vollständiges Zielbild von AIPfad (20 Stufen) und ehrlicher Stand dieser
ersten Implementierungsrunde. Qualität vor Quantität: diese Runde baut vier
Stufen zu voller Tiefe (echte Lektionen, Aufgaben, Labs, Tests), statt alle
20 oberflächlich anzureißen.

## Gebaut in dieser Ausbaustufe

| Stufe | Titel                              | Umfang                                                                                                                                                              |
| ----- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Orientierung                       | 3 Lektionen, Placement-Instrument (Logik fertig, noch nicht ins Onboarding eingehängt)                                                                              |
| 1     | Technischer Arbeitsplatz (kompakt) | 3 Lektionen, Terminal-Simulator-Übung + eigenständiges Terminal-Lab                                                                                                 |
| 4     | LLM-Grundlagen                     | 4 Lektionen (Tokens/Tokenisierung, Embeddings/Aufmerksamkeit, Training/Inferenz/Kontextfenster, Nachrichtenrollen/Halluzination), Tokenizer-Lab, Kontextfenster-Lab |
| 5     | Prompting-Grundlagen               | 3 Lektionen (Ziel/Kontext, Constraints/Beispiele, Zerlegung/Iteration), Prompt-Reparatur-Lab                                                                        |

**Zusammen:** 13 Lektionen, 17 Aufgaben über 6 Interaktionsformen
(SINGLE_CHOICE, MULTIPLE_CHOICE, ORDERING, FILL_IN, SCENARIO_DECISION,
TERMINAL_SIMULATION, PROMPT_REPAIR, TRANSFER), 4 Labs, 17 Konzepte, 1
Kurs. Vollständige Infrastruktur: Auth, Mastery/Scheduling/Hints,
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
| 9 — Embeddings (volle Tiefe)          | Diese Runde deckt die Grundidee in Stufe 4 ab; Vektor-Suche/Ähnlichkeitsmaße im Detail folgen hier.                                                                                                                                             |
| 10 — RAG                              | Baut auf Stufe 9 auf.                                                                                                                                                                                                                           |
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
| Organisationen/Kohorten               | Spec markiert dies ausdrücklich als optional/gestaffelt (§55).                                                                                                                                                                                  |
| Live-AI-Gateway/Playground            | Bewusst kein Live-Aufruf in Runde 1 (siehe `docs/CONTENT-POLICY.md`) — vermeidet Kosten, Secrets und Datenübertragung, bis eine dedizierte Gateway-Architektur (Provider-Abstraktion, Rate-Limits, Kostenbudget, Einwilligung) ansteht.         |
| Vollständiges Admin-Content-Studio    | Nur Lesebereich/Validator vorbereitet (`domain/content/schema.ts#validateCourseGraph`); Bearbeitungsformulare sind ein späterer Schritt.                                                                                                        |
| Rollenbasierte Tracks                 | Setzt mehr Inhalt über mehrere Stufen voraus, um sinnvoll zu filtern.                                                                                                                                                                           |
| Projekte/Capstone                     | `Project`/`ProjectSubmission` sind bewusst nicht modelliert — ergeben erst ab mehreren Modulen Sinn.                                                                                                                                            |
| Nicht-macOS Setup-Center              | Diese Runde deckt macOS ab (Entwicklungsumgebung); Windows/Linux folgen.                                                                                                                                                                        |
| PWA                                   | Nicht übernommen — noch keine Offline-relevante Funktion in dieser Ausbaustufe.                                                                                                                                                                 |

## Nächste sinnvolle Ausbauschritte (Reihenfolge nach Nutzen)

1. **Placement ins Onboarding einhängen.** Die Logik und die 8 Fragen
   existieren bereits (`domain/placement/placement.ts`,
   `content/placement.ts`) und sind unit-getestet — es fehlt nur die
   UI-Anbindung in `app/onboarding/`.
2. ~~**Stufe 2 (Git & GitHub).**~~ **Erledigt in Ausbaustufe 2.** Größter fachlicher Hebel: Voraussetzung für
   AI-Coding, CI/CD und einen Großteil der praktischen Übungen.
3. **Stufen 3, 6–9** — die Infrastruktur (Content-Modell, Mastery,
   Übungstypen) trägt das bereits vollständig, es fehlt nur der Inhalt.
4. **AI-Sicherheit als eigene Stufe**, sobald Agents/MCP existieren.
5. **Governance/EU-AI-Act**, mit dediziertem Primärquellen-Rechercheschritt
   zum jeweiligen Umsetzungszeitpunkt.
6. **Organisationen/Kohorten**, wenn ein Unternehmenseinsatz ansteht.

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
