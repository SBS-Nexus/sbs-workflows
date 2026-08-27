# Architektur

Entscheidungsprotokoll nach dem Muster von PythonPfad/SQLPfad: was wurde
gewählt, was war die Alternative, warum diese Wahl.

## 1. Schichtung

```
app/  components/        Darstellung und Interaktion – keine Geschäftslogik
        │
server/                  Persistenz, Berechtigungen, Server Actions, Dienste
        │
domain/                  Reine Fachlogik – kein Framework, keine Datenbank
```

**Regel:** `domain/` importiert nichts aus `server/`, `app/` oder
`components/`. Jede Funktion dort ist rein und ohne Infrastruktur testbar —
deshalb laufen 64 Unit-Tests in unter einer Sekunde. `server/services/`
lädt Zustand über Prisma, ruft die reinen Funktionen aus `domain/` auf und
speichert das Ergebnis (siehe z. B. `server/services/exercise-service.ts`:
lädt Exercise + ConceptMastery, ruft `gradeSubmission()` und
`updateMastery()` auf, schreibt `Attempt`/`ConceptMastery`/`ReviewQueueItem`).

## 2. Entscheidungen im Einzelnen — direkt aus PythonPfad/SQLPfad übernommen

Diese Muster sind wörtlich oder nahezu wörtlich übernommen, mit
dokumentierter Begründung in den Ursprungsprojekten
(`pythonpfad/docs/ARCHITEKTUR.md`):

- **Sitzungsverwaltung ohne Auth.js** (`server/auth/session.ts`): scrypt-Hashing,
  opake Sitzungstoken, nur SHA-256-Hash in der Datenbank, CSRF-Double-Submit.
- **Inhalte als typisierte TypeScript-Module** (`domain/content/schema.ts`,
  `content/`): Draft/Content-Zod-Schemata, `validateCourseGraph()` prüft
  Beziehungen, die ein Schema allein nicht abdeckt.
- **Bewertung ausschließlich serverseitig** (`domain/grading/grade.ts`):
  `toPublicPayload()` entfernt jede Lösungsangabe, bevor eine Aufgabe den
  Server verlässt.
- **Kompetenzmodell: deterministisch statt gelernt** (`domain/mastery/mastery.ts`):
  jede Regel im Klartext, versioniert, mit Begründungstext je Änderung.
- **Keine Komponentenbibliothek** (`components/ui/primitives.tsx`): rund ein
  Dutzend Bausteine, semantisches HTML, sichtbarer Fokus.

## 3. Bewusste Abweichungen von PythonPfad/SQLPfad

| Bereich                 | PythonPfad/SQLPfad                                                        | AIPfad                                                                                                                        | Warum                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Design-Sprache          | Indigo-getönte Neutraltöne, Modulfarben-Palette, "lebendig und zugewandt" | Warme Papier-/Tinten-Neutraltöne, ein Markenakzent (Bernstein) + ein zweckgebundener Akzent (Stahlblau, nur Wissenslandkarte) | Eigene, ruhigere Stimme in derselben Produktfamilie — siehe [`../DESIGN.md`](../DESIGN.md)                         |
| Auszeichnungsschrift    | IBM Plex Sans für Überschriften, Plex Mono nur für Code                   | IBM Plex Mono auch für Überschriften/Navigation                                                                               | Der Lerninhalt selbst ist monospace-nativ (Tokens, Terminal, JSON)                                                 |
| Ausführungs-Engine      | Pyodide (Python im Browser) bzw. SQL-Server-Sandbox                       | Keine — alle Aufgaben sind Auswahl/Reihenfolge/Lückentext/Szenario/Terminal-Simulation/Prompt-Reparatur                       | Diese Ausbaustufe braucht keine Code-Ausführung; spart ~13 MB Laufzeit-Payload                                     |
| `ErrorCategory`         | SYNTAX/INDENTATION/NAME/… (laufzeitbezogen)                               | SURFACE/INCOMPLETE/MISCONCEPTION                                                                                              | Ohne Code-Ausführung gibt es keine Laufzeitfehler — die Kategorien beschreiben stattdessen die Art des Denkfehlers |
| KI-Tutor                | Optionaler externer Anbieter, mit Einwilligung                            | Keiner in dieser Ausbaustufe                                                                                                  | Vermeidet jede Datenübertragung/Kosten in der ersten Ausbaustufe — siehe [`SECURITY.md`](SECURITY.md)              |
| Organisationen/Kohorten | Vollständig modelliert                                                    | Nicht modelliert                                                                                                              | Spec markiert dies ausdrücklich als optional/gestaffelt — siehe [`LEHRPLAN.md`](LEHRPLAN.md)                       |

## 4. Datenmodell

Vollständig in `prisma/schema.prisma`. Leitgedanken (identisch zu
PythonPfad/SQLPfad): Inhalt (`Course`/`CourseModule`/`Lesson`/`Exercise`/
`Concept`/`Lab`) und Lernverlauf (`Attempt`/`ConceptMastery`/
`LessonProgress`/`ReviewQueueItem`/`LabAttempt`) sind strikt getrennt.
`AnalyticsEvent` hat keinen Fremdschlüssel auf `User`. Jeder
nutzerbezogene Fremdschlüssel hat `onDelete: Cascade`.

**Neu gegenüber PythonPfad:** `Lab`/`LabAttempt` (spec §14/§47 — deckt
interaktive, deterministische Visualisierungen/Simulationen ab, die kein
Übungsformat im klassischen Sinn sind).

## 5. Wissenslandkarte / Context Graph

`components/context-graph.tsx`. Ebenenzerlegung des gerichteten,
kreisfreien Konzeptgraphen (Ebene 0 = keine Voraussetzung, jede weitere
Ebene = eine über der spätesten Voraussetzung), identischer Algorithmus wie
PythonPfads Wissenslandkarte. Bewusst kein kräftebasiertes Layout — das
ordnet bei jedem Aufruf leicht anders an. Kanten liegen als SVG-Linien
unter echten `<a>`-Knoten (Tastatur-/AT-Zugriff nativ, Namen als Text im
Dokument statt als SVG-Beschriftung).

## 6. Nächste sinnvolle Ausbauschritte

Siehe [`LEHRPLAN.md`](LEHRPLAN.md) für den vollständigen Umfang. Fachlich
naheliegend als Nächstes: Stufe 2 (Git & GitHub, in der Spec als "extrem
wichtig" markiert), Placement-Instrument ins Onboarding einhängen
(`content/placement.ts` ist bereits vorhanden, aber noch nicht in
`app/onboarding/` verdrahtet), Organisationen/Kohorten, Live-AI-Gateway.
