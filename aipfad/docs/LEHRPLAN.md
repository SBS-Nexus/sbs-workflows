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
2. **Zwölf Quellenangaben brauchen das Präfix `pythonpfad/`.** Die
   Kommentare wurden aus PythonPfad übernommen und behielten dessen
   Abschnittsnummern, während der Pfad `docs/…` auf die hiesigen,
   anders nummerierten Dokumente zeigt. Betroffen: `fortschritt/page.tsx`
   (§2.5), `wiederholen/page.tsx` (§3.4), `auth/password.ts` und
   `auth/session.ts` (§2.2), `exercise-service.ts` (§4),
   `exercise-runner.tsx` (§2.6 und §4), `grade.ts` (§2.7),
   `spaced-repetition.ts` (§3), `exercise-payload.ts` (§2.6),
   `schema.ts` (§2.1), `hint-ladder.ts` (§4). Elf davon lösen sich mit
   `pythonpfad/` davor auf; `exercise-runner.tsx` (§2.6) nennt gar keinen
   Pfad und braucht `pythonpfad/docs/` — im Wurzelverzeichnis dort liegen
   nur DESIGN.md und README.md. `icon.tsx` macht es bereits richtig. Die heimtückischen
   sind die, deren Nummer es hier AUCH gibt — `hint-ladder.ts` schickt
   einen Leser auf §4, wo statt der Hinweisleiter die Einstufung steht.
   Nicht in der Einstufungs-Änderung mitgelaufen, weil es elf Dateien
   betrifft, die damit nichts zu tun haben.

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
