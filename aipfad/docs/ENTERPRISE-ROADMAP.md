# Enterprise-Roadmap

Grundlage: `docs/ENTERPRISE-READINESS.md`, Stand
`b3454762a9c316a3aa4d78e9ed6216eb4da730fd`.

Eine Änderung je Zweck. Jede Änderung ist für sich prüfbar, für sich
auslieferbar und für sich zurücknehmbar — außer dort, wo das ausdrücklich
nicht geht; dann steht es da.

## Zwei Freigabeziele

`AIPFAD_ENTERPRISE_FOUNDATION_V1` deckt die 15 Fundamentblocker
(`ENT-B01`–`ENT-B15`). `AIPFAD_PAID_ENTERPRISE_GA` deckt zusätzlich die
sechs GA-Blocker (`ENT-G01`–`ENT-G06`). Kein Punkt steht in beiden.

### Tore für das Fundament

| Tor               | Kriterium                                                              | Beleg                       | Blocker            |
| ----------------- | ---------------------------------------------------------------------- | --------------------------- | ------------------ |
| PRODUKT           | Organisation, Mitgliedschaft und Rollen nutzbar                        | E2E je Rolle                | B01, B02           |
| SICHERHEIT        | `UNABHÄNGIGE_SICHERHEITSPRÜFUNG = BESTANDEN`                           | Prüfbericht                 | B07, B08           |
| DATEN             | Aufbewahrung läuft; Auskunft und Löschung bedienbar; Auditlog schreibt | Laufprotokoll + Integration | B03, B04, B05, B06 |
| MANDANTEN         | Fremde Organisationsdaten auf keinem Weg lesbar                        | Isolationssuite             | B01, B02           |
| AUTHENTIFIZIERUNG | Leerlauf-Ablauf, Sitzungsentzug, Passwort-Wiederherstellung            | Integration + E2E           | B09, B10           |
| AUTORISIERUNG     | Vollständige Matrix, Standard verweigert                               | tabellengetriebene Prüfung  | B02                |
| BETRIEB           | Wiederherstellung belegt; Runbooks; Konfiguration bricht früh ab       | Wiederherstellungsprotokoll | B11, B12, B13      |
| BEOBACHTBARKEIT   | Anfrage-Kennung auf allen Serverpfaden                                 | Prüfung                     | B14                |
| INHALTE           | Alle sieben Lab-Arten unter kanonischem Vertrag                        | `content:validate`          | B15                |
| BARRIEREFREIHEIT  | axe ohne serious/critical                                              | CI                          | —                  |
| TESTS             | Acht Tore grün; Isolations- und Migrationssuite vorhanden              | CI                          | —                  |
| DOKUMENTATION     | Kein Dokument behauptet eine unwirksame Maßnahme                       | Prüfliste                   | —                  |

**Das Produkttor verlangt bewusst keine Zuweisung und keine Kohorten.** Die
gehören zu GA. Die vorige Fassung forderte beides im V1-Tor und stufte es
zugleich als nicht-V1 ein — dieser Widerspruch ist damit aufgelöst.

### Zusätzliche Tore für GA

| Tor          | Kriterium                                           | Blocker |
| ------------ | --------------------------------------------------- | ------- |
| PRODUKT      | Kohorten, Zuweisung, Berichte nutzbar               | G01–G03 |
| IDENTITÄT    | OIDC gegen mindestens einen echten Anbieter erprobt | G04     |
| MANDANTEN    | Organisation samt Daten vollständig löschbar        | G05     |
| KAUFMÄNNISCH | SLO, Supportweg, Eskalation beschrieben und besetzt | G06     |

## Reihenfolge

Wahrheit in den Dokumenten zuerst, dann der Konfigurationsvertrag, dann die
unwirksamen Maßnahmen, dann Mandanten. Ein Mandantenmodell auf einer
Ratenbegrenzung zu bauen, die bei zwei Instanzen nicht hält, verschiebt nur
das Problem.

`E02` steht **vor** `E03`, und das ist eine Korrektur: Die vorige
Zusammenfassung empfahl E01 → E03 → E04 und ließ E02 stillschweigend aus.
E03 legt eine Tabelle an, E04A einen geplanten Lauf, E06 eine
Bereitstellungskennung — alle drei brauchen einen Konfigurationsvertrag, der
beim Start abbricht statt beim ersten Zugriff.

---

# Fundament

### E01A — Wahrheit in den Dokumenten

**WARUM** Mehrere Dokumente beschreiben Maßnahmen, die es so nicht gibt.
**UMFANG** Zwölf Quellenpräfixe; `DEPLOYMENT.md` Punkt 5 (der CI-Workflow
existiert seit Ausbaustufe 2); jede weitere nachgewiesene Abweichung
zwischen Text und Code.
**NICHT-UMFANG** kein ausführbarer Code, keine Prüfungsänderung.
**SCHEMA** keins. **RÜCKNAHME** trivial.
**TESTS** keine neuen; `format:check` und `content:validate` bleiben grün.
**FERTIG** Kein Verweis im Baum löst ins Leere.

### E01B — Kanonische Inhaltsverträge · `ENT-B15`

**WARUM** `validateCourseGraph()` prüft Lab-Konfigurationen nur für
`MERGE_CONFLICT`, `BRANCH` und `GIT_STATE`. Vier von sieben Arten sind
ungeprüft.
**UMFANG** Verträge für `TERMINAL`, `TOKENIZER`, `CONTEXT_WINDOW`,
`PROMPT_REPAIR`; Einbindung in `validateCourseGraph()`;
`CommandReference`-Beispielvertrag.
**VERHALTEN** **Dies ändert Verhalten.** Inhalte, die bisher durch die
Prüfung kamen, fallen künftig durch. Das ist der Zweck, und es ist der
Grund, warum diese Änderung von E01A getrennt ist.
**RÜCKNAHME** Verträge entfernen; bereits abgelehnte Inhalte gelten dann
wieder als gültig.
**TESTS** Je Art eine absichtlich fehlerhafte Konfiguration, die rot wird.
**FERTIG** Sieben von sieben Arten geprüft.

### E01C — Pfaddienst absichern

**WARUM** `path-service` hat keine eigenen Integrationsprüfungen;
`getOrCreatePath` sucht und legt dann an, ohne Transaktion und ohne
eindeutigen Index.
**UMFANG** Integrationsabdeckung; Nebenläufigkeit und Idempotenz, soweit
erreichbar.
**NICHT-UMFANG** **keine** Umbauten am Produktionscode, solange keine
Prüfung einen echten Fehler zeigt. Heute ist der Zweig statisch
unerreichbar (siehe Bestandsaufnahme I).
**FERTIG** Entweder ist die Unerreichbarkeit durch eine Prüfung belegt, oder
ein echter Fehler ist gezeigt — und dann erst behoben.

### E02 — Konfigurationsvertrag · `ENT-B13`

**WARUM** `getEnv()` läuft verzögert; ein fehlendes `AUTH_SECRET` fällt erst
beim ersten Zugriff auf. `AUTH_SECRET` wird zudem von keiner Zeile
verbraucht.
**UMFANG** `instrumentation.ts`, die `getEnv()` beim Start erzwingt;
Entscheidung über `AUTH_SECRET` — verbrauchen oder aus dem Vertrag entfernen,
kein drittes Ergebnis; Bereitstellungskennung als Variable.
**SICHERHEIT** Eine erzwungene Variable zu entfernen ist eine
Betriebsänderung und gehört zusammen mit `DEPLOYMENT.md` ausgeliefert.
**TESTS** Start ohne Variable schlägt fehl, mit verständlicher Meldung.

### E03 — Gemeinsame Ratenbegrenzung · `ENT-B07`

**WARUM** `new Map()` je Prozess auf einer waagerecht skalierenden Plattform.
**UMFANG** PostgreSQL-gestützter Zähler hinter der **unveränderten**
Schnittstelle `checkRateLimit()`/`enforceRateLimit()`.
**NICHT-UMFANG** kein Redis, keine neue Infrastruktur.
**SCHEMA** eine Tabelle. **MIGRATION** additiv.
**RÜCKNAHME** Umschalter zurück auf den Speicherzähler; Tabelle bleibt liegen.

**Abnahmekriterien** — ohne diese gilt die Änderung als unfertig:

- Zählen und Prüfen in **einer** atomaren Anweisung oder Transaktion.
- Nachweis über **zwei unabhängige Datenbankverbindungen**, nicht in einem Prozess.
- Beschränkte Schlüsselmenge; kein unbegrenztes Tabellenwachstum.
- Ablauf und Aufräumen festgelegt und ausgeführt.
- Index, der zur Abfrage passt.
- Verhalten bei nicht erreichbarer Datenbank **ausdrücklich entschieden**
  (sperren oder durchlassen) und geprüft.
- Gemessener Zusatzaufwand je Anfrage, dokumentiert.
- Keine E-Mail-Adresse und keine IP länger gespeichert, als der Zähler sie
  braucht.

### E04A — Aufbewahrung ausführen · `ENT-B03`

**WARUM** `applyRetentionPolicy()` hat keinen Aufrufer; `crons: []`.
**UMFANG** Geschützte Route und Cron-Eintrag; **Trockenlauf zuerst**;
Laufprotokoll; Idempotenz; festgelegtes Verhalten bei Teilfehlern.
**SICHERHEIT** Route nur mit geheimem Kopfzeilenwert.
**RÜCKNAHME** Cron leeren. Bereits gelöschte Daten kommen nicht zurück —
deshalb der Trockenlauf.
**TESTS** Zu alter Datensatz verschwindet, jüngerer bleibt; zweiter Lauf
ändert nichts.

### E04B — Datenauskunft · `ENT-B04`

**UMFANG** Selbstexport für die angemeldete Person; vollständiges
Verzeichnis der personenbezogenen Daten; festes Ausgabeschema.
**NICHT-UMFANG** **Keine** `AnalyticsEvent`-Zeilen. Sie sind ohne
Personenbezug erhoben; sie einer Person zuzuordnen wäre genau die
Verknüpfung, die das Modell vermeidet.
**SICHERHEIT** Nur die eigene Sitzung, niemals eine Kennung aus der Eingabe.
**TESTS** Export enthält jede Tabelle mit Personenbezug; Gegenprüfung gegen
das Schema, damit eine neue Tabelle nicht stillschweigend fehlt.

### E04C — Kontolöschung · `ENT-B05`

**UMFANG** Bestätigter, destruktiver Ablauf mit erneuter Anmeldung als
Grenze; Kaskadenprüfung; Auditeintrag.
**RÜCKNAHME** **Keine.** Diese Änderung ist im Betrieb nicht rücknehmbar;
zurücknehmen lässt sich nur der Zugang zur Funktion, nicht ihre Wirkung.
Wiederherstellung ist ausschließlich über eine Sicherung möglich — was E10
zur Voraussetzung für den produktiven Einsatz dieser Funktion macht.
**TESTS** Nach der Löschung ist in keiner Tabelle eine Zeile der Person
übrig; der Auditeintrag überlebt sie.

### E05A — Sitzungslebenszyklus · `ENT-B09`

**UMFANG** Leerlauf-Ablauf über das vorhandene `lastSeenAt`;
`destroyAllSessions()` an eine Oberfläche binden.
**TESTS** Sitzung nach Leerlauf ungültig; „überall abmelden" beendet
nachweislich alle Sitzungen, nicht nur die aktuelle.

### E05B — Kontowiederherstellung · `ENT-B10`

**WARUM** Das Fundamenttor verlangt Passwort-Wiederherstellung; bisher gab
es dafür keine Änderung im Programm.
**UMFANG** Anforderung; kurzlebiges, einmal verwendbares Merkzeichen; **nur
als Hash gespeichert**; Ablauf; Schutz gegen Wiedereinspielen; **neutrale
Antwort**, damit die Anforderung nicht verrät, welche Adressen existieren;
Passworttausch; **alle Sitzungen beenden** nach erfolgreichem Tausch.
**ZUSTELLUNG** Wenn noch kein Anbieter gewählt ist, wird **nur die
Schnittstelle** festgelegt (`sendeMail(empfaenger, vorlage, daten)`), mit
einer Umsetzung fürs Protokoll in der Entwicklung. Kein Anbieter wird in
diesem Programm erfunden.
**ABHÄNGIGKEIT** Die offene Entscheidung zur E-Mail-Bestätigung (siehe
Bestandsaufnahme O) ist **vorher** zu treffen — beide teilen sich diese
Grenze.
**TESTS** Merkzeichen wirkt genau einmal; abgelaufenes wird abgewiesen;
Antwort ist für bekannte und unbekannte Adressen gleich; nach dem Tausch ist
jede alte Sitzung ungültig.

### E05C — Anfragegrenze · `ENT-B08`

**UMFANG** Zwei Entscheidungen, jede mit Begründung:

1. **Double-Submit-CSRF**: anbinden **oder** ersatzlos entfernen. Das
   Entfernen ist der wahrscheinlichere richtige Weg — Origin-Prüfung,
   `SameSite=Lax` und die Server-Actions-Prüfung von Next.js sind der
   beabsichtigte Entwurf, und ungenutzter Sicherheitscode täuscht Schutz
   vor. Kein zusätzliches Verfahren ohne Bedrohungsmodell-Begründung.
2. **CSP**: Nonce statt `unsafe-inline`.

**NICHT-UMFANG** Die E-Mail-Auskunft bei der Registrierung bleibt bewusst
angenommen.
**TESTS** Seite funktioniert ohne `unsafe-inline`; die getroffene
CSRF-Entscheidung ist durch eine Prüfung belegt.

### E06 — Beobachtbarkeit · `ENT-B14`

**UMFANG** Anfrage-Kennung durchgängig; Logs in allen Server Actions und
Diensten; Fehlerpfade mit Fehlerart statt Fehlertext; Bereitstellungskennung.
**SICHERHEIT** Keine Geheimnisse, keine Antworten von Lernenden, keine
vollständigen Kennungen.
**TESTS** Eine Prüfung, die rot wird, wenn ein Serverpfad ohne Kennung
protokolliert.

### E07 — Auditgrundlage · `ENT-B06`

**UMFANG** `AuditEvent` mit Akteur, Organisation, Vorgang, Ziel, Zeit und
Metadaten. Schreibpunkte kommen mit E08/E09.
**NICHT-UMFANG** `AnalyticsEvent` wird **nicht** umgewidmet.

**Was „nur anfügbar" in V1 heißt — und was nicht:**

- Die Anwendungsschnittstelle bietet **nur Anlegen und Lesen**.
- Es gibt **keinen** Änderungs- oder Löschpfad in der Anwendung.
- Der Akteursbezug ist **absichtlich** so gehalten, dass er eine
  Kontolöschung überdauert: gespeichert wird eine Kennung, kein
  Fremdschlüssel mit Kaskade. Sonst löschte E04C die Spur ihrer selbst.
- Metadaten unterliegen einer festen Schwärzungsregel; keine
  Lernendenantworten, keine Geheimnisse.
- Für Auditzeilen gilt eine **eigene** Aufbewahrungsfrist, getrennt von
  `ATTEMPT_RETENTION_DAYS`.

**Ausdrücklich nicht behauptet:** Dies ist **keine** Manipulationssicherheit
auf Datenbankebene. Wer Schreibrechte auf der Datenbank hat, kann Zeilen
ändern. Unveränderlichkeit im Datenbankrecht (eigene Rolle, `REVOKE`,
Anfügeauslöser) ist eine **spätere** Entwurfsentscheidung und in V1 nicht
enthalten.

### E08 — Organisationen · `ENT-B01`

**UMFANG** `Organization`, `OrganizationMembership`. Bestandsnutzende bleiben
**ohne** Organisation gültig.
**NICHT-UMFANG** kein `tenantId` an Lerntabellen.
**MIGRATION** rein additiv, keine Rückfüllung.
**TESTS** Migration auf einer Kopie mit Bestandsdaten; niemand verliert
Zugang.

### E09 — Autorisierung und Isolation · `ENT-B02`

**UMFANG** Rollen und **eine** zentrale Prüfstelle; Standard verweigert;
`requireAdmin()` bekommt endlich Aufrufer.
**SICHERHEIT** Organisationszugehörigkeit nie aus der Eingabe.

**Rollenwanderung — ausdrücklich, nicht stillschweigend.** Heute gibt es
`Role { LEARNER, ADMIN }`. `ADMIN` hat keinen Aufrufer und damit keine
Wirkung. Vorgeschlagen:

| Heute     | Künftig          | Behandlung                                          |
| --------- | ---------------- | --------------------------------------------------- |
| `LEARNER` | `LEARNER`        | unverändert                                         |
| `ADMIN`   | `PLATFORM_ADMIN` | Datenwanderung im selben Schritt wie die Aufzählung |
| —         | `ORG_ADMIN`      | neu, nur über Mitgliedschaft                        |
| —         | `ORG_MANAGER`    | neu, nur über Mitgliedschaft                        |

`PLATFORM_ADMIN` steht am `User`, die beiden Organisationsrollen an der
`OrganizationMembership` — eine Person kann in einer Organisation leiten und
in einer anderen lernen.

**SCHEMA** Aufzählung erweitern, dann Daten wandern, dann alten Wert
entfernen — drei Schritte, nicht einer.
**RÜCKNAHME** Nach dem Entfernen des alten Aufzählungswerts ist die Rücknahme
**nicht** mehr ohne Datenverlust möglich. Deshalb bleibt `ADMIN` bis zum
Abschluss der Umstellung bestehen.
**TESTS** Migration gegen eine **befüllte** Kopie; jeder bisherige
`ADMIN`-Datensatz ist danach `PLATFORM_ADMIN`; tabellengetriebene Matrix über
alle Rollen und Ressourcen; Isolationssuite, die fremden Zugriff in jeder
Kombination versucht.

### E10 — Sicherung, Wiederherstellung, Runbooks · `ENT-B11`, `ENT-B12`

**WARUM** Weder Verfahren noch Nachweis. Voraussetzung für den produktiven
Einsatz von E04C.
**UMFANG** Sicherungsplan; **belegte** Wiederherstellung in eine
Wegwerfdatenbank; Rücknahmegrenzen für Migrationen; Runbooks.
**FERTIG** Ein Wiederherstellungsprotokoll mit Datum liegt vor. Ohne Nachweis
bleibt das Tor offen.

---

# Bezahlter Einsatz

### E11 — Kohorten, Zuweisung, Berichte · `ENT-G01`, `ENT-G02`, `ENT-G03`

**SICHERHEIT** Führungskräfte sehen Fortschritt, **nicht** einzelne
Antworten. Diese Grenze gehört in eine Prüfung, nicht nur in die Oberfläche.

### E12 — OIDC · `ENT-G04`

Anbieterabstraktion, dann OIDC. SAML und SCIM bleiben `NACH_GA`.

### E13 — Organisationslebenszyklus · `ENT-G05`

Anlegen, Stilllegen, Löschen samt Daten. **Nicht rücknehmbar**, mit denselben
Auflagen wie E04C.

### E14 — Kaufmännische Betriebsbereitschaft · `ENT-G06`

SLO, Supportweg, Eskalation, Ansprechbarkeit.

### ERC — Freigabekandidat

Kein neuer Inhalt. Alle Tore nachweisen, Dokumente gegen die Wirklichkeit
prüfen, Abnahmesuite grün.

---

# Lehrplan — eigener Arbeitsstrang

Getrennt vom Plattformstrang und nicht auf dessen kritischem Pfad.

| Gruppe | Inhalt                          | Didaktisch abhängig von |
| ------ | ------------------------------- | ----------------------- |
| C1     | 6 HTTP & APIs                   | —                       |
| C2     | 7 AI-APIs & SDKs                | C1                      |
| C3     | 8 Structured Outputs/Tools      | C2                      |
| C4     | 9 Embeddings-Tiefe, 10 RAG      | Stufe 4 (fertig)        |
| C5     | 11 Agents, 12 MCP               | C3                      |
| C6     | 13 AI-Coding, 14 CI/CD          | Stufe 2 (fertig)        |
| C7     | 15 Evaluationen                 | C4, C5                  |
| C8     | 16 AI-Sicherheit                | C5                      |
| C9     | 17 DACH-Governance              | —                       |
| C10    | 18 Production AI/LLMOps         | C9 + echtes Gateway     |
| C11    | 3 AI/ML-Vertiefung, 19 Advanced | Stufe 4 (fertig)        |
| C12    | 20 Enterprise AI                | C9, C10                 |

**Sofort beginnbar: C1, C4, C6, C9, C11** — ihre Voraussetzungen sind
entweder gebaut oder es gibt keine. Die vorige Fassung führte C4 unter C3;
das war falsch, siehe Bestandsaufnahme M.

Für Stufe 17 gilt die Quellenpflicht aus `docs/CONTENT-POLICY.md`: aktuelle
Primärquellen zum Umsetzungszeitpunkt, kein Abschreiben von Rechtstexten,
keine erfundenen Fundstellen, und **FAKT**, **AUSLEGUNG** und
**HANDLUNGSEMPFEHLUNG** getrennt ausgewiesen.

## Vorgeschlagenes Datenmodell (nicht migriert)

```
Organization(id, slug, name, createdAt, settings Json)
OrganizationMembership(id, organizationId, userId, role, createdAt)
  @@unique([organizationId, userId])
Cohort(id, organizationId, name, createdAt)
CohortMembership(id, cohortId, userId)  @@unique([cohortId, userId])
CourseAssignment(id, organizationId, cohortId?, courseId, dueAt?)
AuditEvent(id, organizationId?, actorUserId?, actorLabel, action,
           targetType, targetId?, metadata Json, occurredAt)
```

`actorUserId` ist bewusst **ohne** Kaskade; `actorLabel` hält den Bezug fest,
wenn das Konto später gelöscht wird.

**Eigentum.** Lerndaten (`Attempt`, `ConceptMastery`, `LessonProgress`,
`LearningPath`, `ReviewQueueItem`) bleiben **nutzereigen**. Die Organisation
sieht über die Mitgliedschaft, sie besitzt nicht. Das vermeidet `tenantId` an
jeder Tabelle und hält die Löschung auf Betroffenenwunsch einfach.

## Abnahmesuite

FUNKTIONAL · SICHERHEIT · AUTORISIERUNG (Matrix, Standard verweigert) ·
MANDANTENISOLATION (jede Rolle gegen jede fremde Ressource) · MIGRATION (auf
befüllter Bestandskopie) · NEBENLÄUFIGKEIT · AUFBEWAHRUNG · AUSKUNFT/LÖSCHUNG
· BARRIEREFREIHEIT · LEISTUNG · FEHLEREINSPEISUNG (Datenbank weg, Zähler weg)
· SICHERUNG/WIEDERHERSTELLUNG (belegt) · E2E · INHALTSPRÜFUNG ·
ABHÄNGIGKEITSPRÜFUNG (`--omit=dev` ohne Fund).

Bestanden heißt: Jede Suite ist grün **und** für jede neue Regel ist gezeigt,
dass ihr Entfernen eine bestimmte Prüfung rot macht.

## Zählwerk

Aus dem Dokument selbst gezählt, nicht fortgeschrieben.

| Größe                      | Wert | Herkunft                                        |
| -------------------------- | ---- | ----------------------------------------------- |
| Fundamentblocker           | 15   | `ENT-B01`–`ENT-B15`                             |
| GA-Zusatzblocker           | 6    | `ENT-G01`–`ENT-G06`                             |
| Plattformänderungen gesamt | 21   | 16 Fundament + 4 GA + 1 Freigabekandidat        |
| davon Fundament            | 16   | E01A/B/C, E02, E03, E04A/B/C, E05A/B/C, E06–E10 |
| davon bezahlter Einsatz    | 4    | E11–E14                                         |
| davon Freigabekandidat     | 1    | ERC                                             |
| Lehrplangruppen            | 12   | C1–C12                                          |
| Programmpunkte insgesamt   | 33   | 21 + 12                                         |

Sechzehn Fundamentänderungen decken fünfzehn Blocker: `E10` schließt zwei
(`ENT-B11`, `ENT-B12`), und `E01A` sowie `E01C` schließen keinen Blocker,
sondern beseitigen Schulden beziehungsweise belegen eine Annahme.
