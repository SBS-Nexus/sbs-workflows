# SQLPfad als Lernpfade-Wiederholungsquelle (LP-05B)

`GET /api/platform/review-source?limit=N` ist eine **schreibgeschützte**
Quelle für den Lernpfade-Hub (`/wiederholen`). SQLPfad bleibt das System der
Wahrheit; geplant, abgeschlossen und umgeplant wird ausschließlich hier.
Architektur und Begründung: `docs/LEARNING-PLATFORM.md` (Repository-Wurzel),
Abschnitt 10.

- **Identität:** das **Konzept** (`sourceKind=concept`, `sourceItemId=<conceptId>`). Geplant wird in SQLPfad je Konzept (`ConceptMastery.nextReviewAt`, SM-2), nicht je Aufgabe. Die Übungsaufgabe, die die bestehende Auswahl `waehleAufgabenZuKonzepten` wählt, geht nur als Darstellungsangabe (`practice`) mit hinaus; zwei Konzepte auf derselben Aufgabe bleiben zwei Einträge. `ReviewQueueItem` wird weiterhin nicht gefüllt.
- **Umfang allein aus der Sitzung:** Die Route liest die angemeldete Person
  über `getCurrentUser()` aus der eigenen Sitzung. Eine `userId` aus der
  Anfrage gibt es nicht; jeder Abfrageparameter außer `limit` wird mit 400
  abgewiesen. Ohne Sitzung: 401. Kein Admin-Durchgriff.
- **Gelesen wird:** nur eigene Konzepte mit `nextReviewAt <= jetzt`, geordnet nach Fälligkeit und Konzept-ID. Ein fälliges Konzept ohne veröffentlichte Übungsaufgabe wird ausgelassen — wie auf der eigenen Wiederholungsseite. Diese Bedingung steht in der Abfrage selbst (vor der Obergrenze), damit nicht übbare Konzepte die übbaren nicht verdrängen; `nextDueAt` zählt ebenfalls nur übbare Konzepte.
- **Keine Musterlösung:** Die Antwortseite ist die öffentliche
  Konzepterklärung (`Concept.description`) — nie Lösung, Lösungsnotizen,
  Hinweise oder Tests.
- **Nur lesend:** keine Abschluss-, Planungs- oder Schreibfunktion. Die
  einzige Schreibwirkung ist die bestehende Sitzungspflege in
  `getCurrentUser()` (abgelaufene Sitzung löschen, `lastSeenAt`), wie bei
  jedem Seitenaufruf.
- **Grenzen:** `limit` ganze Zahl 1–25 (Vorgabe 10), sonst 400. Die Antwort
  meldet `truncated`, wenn weitere fällige Einträge existieren.
- **Cache:** `Cache-Control: private, no-store, max-age=0`, `Vary: Origin,
Cookie`, Route `force-dynamic`. Personenbezogene Antworten landen in keinem
  geteilten Zwischenspeicher.
- **CORS:** nur für genau die Origin in `PLATFORM_HUB_ORIGIN`
  (`Access-Control-Allow-Credentials: true`). Vorgabe leer = keine Freigabe.
  Keine Wildcard, keine Liste, `http` nur für `localhost`; ein ungültiger
  Wert lässt `getEnv()` scheitern. Kein `OPTIONS`-Handler: Der einfache GET
  braucht keinen Preflight.
- **Fehler:** 401 `unauthenticated`, 400 `invalid_request`, 500
  `unavailable` — ohne Meldung, Stack oder Datenbankdetail. Protokolliert wird
  nur Ereignisname und Fehlerart.
- **Tests:** `npm run test:integration` prüft den Leser und die Route gegen eine echte PostgreSQL-Plattformdatenbank (`TEST_DATABASE_URL`).
- **Same-Site-Voraussetzung:** Das Sitzungscookie bleibt unverändert
  host-only, `httpOnly`, `SameSite=Lax`. Der Browser schickt es nur mit, wenn
  Hub und App same-site sind (gemeinsame registrierbare Domain). Unter
  `*.vercel.app` ist das nicht der Fall; dort antwortet die Route dem Hub mit 401. Die Cookie-Attribute werden dafür ausdrücklich nicht gelockert.
- **Restrisiko:** Eine XSS-Lücke in der freigegebenen Hub-Origin könnte über
  diese Route die Wiederholungsdaten der angemeldeten Person lesen — nur
  lesen, nur diese Route. Deshalb genau eine Origin und Vorgabe aus.
- `src/server/platform/review-source-http.ts` ist in PythonPfad, SQLPfad und
  AIPfad wortgleich (getrennte Bereitstellungen, kein gemeinsames Paket).

## Fortschrittsquelle (LP-07)

`GET /api/platform/progress-source` ist eine eigene, **schreibgeschützte**
Quelle für `/fortschritt` im Lernpfade-Hub. Architektur und Vertrag:
`docs/LEARNING-PLATFORM.md` (Repository-Wurzel), Abschnitt 12.

- **Konzepte ohne Prozentwert:** dieselbe Ableitung wie die
  Wissenslandkarte (`bewerteKonzept` über das letzte eigene Ergebnis jeder
  veröffentlichten Aufgabe bekannter Art). „Beobachtet" = beurteilbare
  Konzepte mit mindestens einer bearbeiteten Aufgabe (`angefangen`,
  `wackelig`, `sitzt`), „bereit" = nur `sitzt`
  (`criterion = "all-assessable-tasks-last-passed"`).
  `ConceptMastery.masteryScore` wird weder gelesen noch weitergegeben.
- **Wiederholungen:** fällige, übbare Konzepte über
  `ConceptMastery.nextReviewAt` — dieselbe Bedingung wie die
  Wiederholungsquelle.
- **Lektionen:** veröffentlichte Lektionen wie im eigenen Überblick; Zähler
  und Nenner meinen denselben Bestand.
- **Projekte:** `kind = "submitted"` — veröffentlichte Projekte mit Abgabe im
  Status `SUBMITTED`. SQLPfad nimmt Abgaben nicht fachlich ab; der Hub sagt
  „abgegeben", nie „abgenommen".
- **Letzte Aktivität:** der späteste Versuch, Lernsitzungseintrag
  (`haltAktivitaetFest`) oder Lektionsabschluss.
- **Umfang allein aus der Sitzung:** `getCurrentUser()` der eigenen Sitzung.
  Die Route nimmt **keinen** Abfrageparameter an; jeder — insbesondere eine
  `userId` — wird mit 400 abgewiesen. Ohne Sitzung: 401. Nur GET.
- **Datensparsam:** nur Zähler, feste Aufzählungswerte und ein Zeitstempel —
  keine Namen, Kennungen, Titel, Inhalte, Antworten oder Rohwerte eines
  Kompetenzmodells.
- **Transport, Cache, CORS, Fehler, Same-Site:** wie die
  Wiederholungsquelle (`PLATFORM_HUB_ORIGIN`, Vorgabe leer = aus;
  `private, no-store, max-age=0`; `Vary: Origin, Cookie`; 401/400/500 ohne
  Details). Die Cookie-Attribute werden nicht gelockert.
- **Nur lesend:** keine Sitzungsfortschreibung, kein Kompetenz- oder
  Planungsupdate. Die Integrationstests prüfen das gegen echte Zeilen.
- `src/server/platform/progress-source-http.ts` ist in PythonPfad, SQLPfad und
  AIPfad wortgleich.
