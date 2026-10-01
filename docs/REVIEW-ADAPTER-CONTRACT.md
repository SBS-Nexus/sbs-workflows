# Lernpfade — Review Adapter Contract

Stand: 2026-10-01  
Contract Version: `1`

## Zweck

PythonPfad, SQLPfad, AIPfad und VokabelPfad planen Wiederholungen nicht auf
derselben fachlichen Einheit.

Der Adaptervertrag vereinheitlicht deshalb **nicht die Scheduler**.

Er beschreibt nur, wie ein bereits serverseitig autorisierter Quellpfad eine
fällige Wiederholung an Lernpfade übergeben darf.

## 1. Aktuelle Quellmodelle

### PythonPfad

Planung auf Aufgabenebene:

```text
ReviewQueueItem
  exerciseId
  dueAt
  repetition
  reason
```

Der Scheduler berücksichtigt zusätzlich Kompetenz, Hinweise, Fehlerart,
Transfer und Selbsteinschätzung.

### AIPfad

Ebenfalls Aufgabenebene:

```text
ReviewQueueItem
  exerciseId
  dueAt
  repetition
  reason
```

Die fachliche Scheduling-Logik ist PythonPfad ähnlich.

### SQLPfad

SQLPfad ist bewusst anders.

Die Fälligkeit lebt in:

```text
ConceptMastery.nextReviewAt
```

Erst danach wird zu einem fälligen Konzept eine passende Aufgabe gewählt.

`ReviewQueueItem` ist im SQLPfad **nicht** die Quelle der Wahrheit.

Deshalb muss der gemeinsame Vertrag Concept-ID und ausgewählte Activity-ID
getrennt erhalten.

### VokabelPfad

Geplant:

```text
Term
  id
  prompt
  answer
  dueAt
```

Die fachliche Einheit ist ein Begriff bzw. eine Karte.

---

## 2. Gemeinsamer Transportvertrag

Datei:

`lernpfade/src/domain/review/source-contract.ts`

Kernfelder:

```text
contractVersion
source
sourceUnit
sourceItemId
pathSlug
conceptId?
activityId?
prompt
answer?
dueAt
repetition
reason?
launchPath?
```

### source

Erlaubt:

- `python`
- `sql`
- `git`
- `ai`
- `language`

### sourceUnit

Erlaubt:

- `exercise`
- `concept`
- `term`

## 3. Stabile Identität

Ein globaler Schlüssel wird aus drei Werten gebildet:

```text
<source>:<sourceUnit>:<sourceItemId>
```

Beispiel:

```text
python:exercise:abc123
sql:concept:left-join
language:term:en:retrieval
```

IDs verschiedener Quellsysteme dürfen dadurch kollidieren, ohne dass
Lernpfade sie verwechselt.

## 4. SQL-Sonderfall

SQL wird nicht auf eine künstliche Exercise-Queue reduziert.

Beispiel:

```text
source        = sql
sourceUnit    = concept
sourceItemId  = left-join
conceptId     = left-join
activityId    = exercise:left-join-orders
```

Damit bleiben zwei Wahrheiten erhalten:

1. **Warum ist etwas fällig?** → das Konzept
2. **Woran wird es jetzt geprüft?** → die ausgewählte Aufgabe

Eine spätere andere Aufgabenauswahl ändert nicht die Identität der
Wiederholung.

## 5. Sicherheitsinvarianten

### Kein userId-Feld

Der Vertrag erlaubt absichtlich **kein** `userId`.

Ein Quellpfad muss die Person aus seiner serverseitig validierten Sitzung
ableiten.

Falsch:

```text
GET /api/reviews?userId=<Wert aus Browser>
```

Ziel:

```text
Session → serverseitige Subject-ID → scoped query → ReviewSourceItem[]
```

Der Parser verwirft unbekannte Felder. Ein versehentlich hinzugefügtes
`userId` schlägt deshalb fail-closed fehl.

### Keine externen Launch-URLs

`launchPath` ist nur ein anwendungsrelativer Pfad.

Erlaubt:

```text
/wiederholen/foo
/ueben?konzept=left-join
```

Nicht erlaubt:

```text
https://example.com
//example.com
```

Die Basis-URL des Quellpfads stammt später aus serverseitiger
Plattformkonfiguration, nicht aus dem Adapter-Payload.

### Canonical UTC

`dueAt` muss eine kanonische UTC-ISO-Zeit sein:

```text
2026-10-02T08:00:00.000Z
```

Datumsstrings ohne eindeutige Zeitzone werden abgelehnt.

### Plain Object / Allow-list

Adapterobjekte:

- müssen Plain Objects sein
- dürfen nur bekannte eigene String-Keys besitzen
- unbekannte Felder werden abgelehnt
- Contract Version muss exakt unterstützt sein

Damit wird Schema-Drift sichtbar statt still geschluckt.

## 6. Was LP-05A ausdrücklich noch nicht tut

- keine Live-API zwischen Apps
- kein SSO
- keine Cookie-Federation
- kein CORS-Setup
- keine zentrale Review-Datenbank
- keine Migration bestehender Review-Daten
- kein Schreiben zurück in die Quellsysteme
- keine zentrale Scheduler-Entscheidung

LP-05A definiert nur die Grenze.

## 7. Nächster Schritt: LP-05B

Erst nach diesem Contract:

1. pro App ein serverseitiger Adapter
2. ausschließlich session-scoped
3. read-only
4. Fixture- und Integrationstests
5. Hub kann fällige Summaries aggregieren
6. Launch führt zunächst zurück in die jeweilige Quell-App

Noch **kein** zentraler Abschluss einer Review aus dem Hub.

Damit bleibt jedes Quellsystem bis zur späteren SSO-/Writeback-Entscheidung
Owner seiner Lerndaten.

## 8. Späterer Writeback

Ein zentraler Review-Flow würde zusätzlich brauchen:

- gemeinsame Identität
- idempotente Completion-ID
- Source-Version / optimistic concurrency
- Retry-Regeln
- Audit Trail
- Konfliktstrategie
- Offline-/Partial-Failure-Verhalten

Das ist nicht Teil von LP-05A oder LP-05B.
