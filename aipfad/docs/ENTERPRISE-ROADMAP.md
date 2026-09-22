# Enterprise-Roadmap

Grundlage: `docs/ENTERPRISE-READINESS.md`, Stand
`b3454762a9c316a3aa4d78e9ed6216eb4da730fd`.

Eine Änderung je Zweck. Jede Änderung ist für sich prüfbar, für sich
auslieferbar und für sich zurücknehmbar.

## Freigabeziel AIPFAD_ENTERPRISE_V1

| Tor               | Kriterium                                                                  | Beleg                               | Schwere       |
| ----------------- | -------------------------------------------------------------------------- | ----------------------------------- | ------------- |
| PRODUKT           | Organisation, Mitgliedschaft, Rollen, Zuweisung nutzbar                    | E2E je Rolle                        | Blocker       |
| SICHERHEIT        | Kein offener kritischer/hoher Fund; `claude-security` tatsächlich gelaufen | Laufprotokoll                       | Blocker       |
| DATEN             | Aufbewahrung läuft planmäßig; Auskunft und Löschung bedienbar              | Integrationsprüfung + Laufprotokoll | Blocker       |
| MANDANTEN         | Fremde Organisationsdaten sind auf keinem Weg lesbar                       | Isolationssuite                     | Blocker       |
| AUTHENTIFIZIERUNG | Leerlauf-Ablauf, Sitzungsentzug, Passwort-Zurücksetzen                     | Integration + E2E                   | Blocker       |
| AUTORISIERUNG     | Vollständige Matrix, Standard verweigert                                   | Tabellengetriebene Prüfung          | Blocker       |
| BETRIEB           | Sicherung belegt wiederhergestellt; Runbooks vorhanden                     | Wiederherstellungsprotokoll         | Blocker       |
| BEOBACHTBARKEIT   | Strukturierte Logs auf allen Serverpfaden, Anfrage-Kennung durchgehend     | Stichprobe + Prüfung                | Blocker       |
| INHALTE           | Alle sieben Lab-Arten unter kanonischem Vertrag                            | `content:validate`                  | Blocker       |
| BARRIEREFREIHEIT  | axe ohne serious/critical auf allen Hauptseiten                            | CI                                  | Blocker       |
| LEISTUNG          | Budget eingehalten                                                         | `npm run perf`                      | Nicht-Blocker |
| TESTS             | Alle acht Tore grün; Isolations- und Migrationssuite vorhanden             | CI                                  | Blocker       |
| DOKUMENTATION     | Kein Dokument behauptet eine unwirksame Maßnahme                           | Prüfliste                           | Blocker       |
| AUSLIEFERUNG      | Rücknahme erprobt, nicht nur beschrieben                                   | Protokoll                           | Blocker       |

## Reihenfolge

Die Reihenfolge weicht bewusst vom Vorschlag im Auftrag ab: **Wahrheit in den
Dokumenten zuerst, dann die drei unwirksamen Maßnahmen, dann Mandanten.**
Ein Mandantenmodell auf einer Ratenbegrenzung zu bauen, die bei zwei
Instanzen nicht hält, verschiebt nur das Problem.

---

### PR-E01 — Dokumenten- und Invariantenschulden

**WARUM** Mehrere Dokumente beschreiben Maßnahmen, die es so nicht gibt. Das
ist die teuerste Sorte Schuld: Sie führt zu falschen Entscheidungen.
**UMFANG** Zwölf Quellenpräfixe; `DEPLOYMENT.md` Punkt 5 (CI existiert);
`TERMINAL`/`TOKENIZER`/`CONTEXT_WINDOW`/`PROMPT_REPAIR` als kanonische
Verträge in `validateCourseGraph()`; `CommandReference`-Beispielprüfung;
eigene Integrationsprüfungen für `path-service`.
**NICHT-UMFANG** Kein Verhalten, kein Schema.
**SCHEMA** keins. **RÜCKNAHME** trivial.
**TESTS** `content:validate` wird rot, wenn eine Lab-Konfiguration fehlt.
**FERTIG** Kein Verweis im Baum löst ins Leere; vier bisher ungeprüfte
Lab-Arten sind geprüft.

### PR-E02 — Konfigurationsvertrag

**WARUM** `getEnv()` ist verzögert; ein fehlendes `AUTH_SECRET` fällt erst
beim ersten Zugriff auf. `AUTH_SECRET` wird zudem von nichts verbraucht.
**UMFANG** `instrumentation.ts`, die `getEnv()` beim Start erzwingt;
Entscheidung über `AUTH_SECRET` — entweder verbrauchen (Sitzungs-HMAC) oder
aus dem Vertrag entfernen; Bereitstellungskennung als Variable.
**NICHT-UMFANG** keine neuen Abhängigkeiten.
**SICHERHEIT** Entfernen einer erzwungenen Variablen nur zusammen mit
`DEPLOYMENT.md`.
**RÜCKNAHME** Datei entfernen. **TESTS** Start ohne Variable schlägt fehl.

### PR-E03 — Gemeinsame Ratenbegrenzung

**WARUM** `new Map()` je Prozess; die Zielplattform skaliert horizontal.
**UMFANG** PostgreSQL-gestützter Zähler hinter der **unveränderten**
Schnittstelle `checkRateLimit()`/`enforceRateLimit()`.
**NICHT-UMFANG** kein Redis, keine neue Infrastruktur.
**SCHEMA** eine Tabelle `rate_limit_bucket`. **MIGRATION** additiv.
**RÜCKNAHME** Umschalter auf die Speicherfassung; Tabelle bleibt liegen.
**TESTS** Nebenläufigkeit über zwei Verbindungen; Verhalten bei
Datenbankausfall ausdrücklich festgelegt und geprüft.
**FERTIG** Zwei gleichzeitige Prozesse teilen sich einen Zähler, nachgewiesen.

### PR-E04 — Aufbewahrung und Datenlebenszyklus

**WARUM** `applyRetentionPolicy()` hat keinen Aufrufer; `crons: []`. Die Frist
ist heute eine Absichtserklärung.
**UMFANG** Geschützte Route + `vercel.json`-Cron; Auskunft (Export der
eigenen Daten); Löschung auf Betroffenenwunsch über `prisma.user.delete()`;
Laufprotokoll.
**SICHERHEIT** Cron-Route nur mit geheimem Kopfzeilenwert; Export nur für die
eigene Sitzung.
**SCHEMA** optional `RetentionRun` für den Nachweis.
**RÜCKNAHME** Cron leeren; Löschung ist **nicht** rücknehmbar — deshalb
Trockenlauf-Modus zuerst.
**TESTS** Datensatz älter als die Frist verschwindet; jüngerer bleibt;
Export enthält alles Personenbezogene; Löschung räumt kaskadiert ab.

### PR-E05 — Sicherheitsgrenzen

**WARUM** Drei bekannte Punkte, jeder für sich klein.
**UMFANG** Double-Submit-CSRF anbinden **oder** ersatzlos entfernen (kein
drittes Ergebnis); Nonce statt `unsafe-inline`; Leerlauf-Ablauf über
`lastSeenAt`; `destroyAllSessions()` anbinden.
**NICHT-UMFANG** E-Mail-Enumeration bleibt akzeptiert.
**RÜCKNAHME** je Teil einzeln.
**TESTS** Anfrage ohne gültiges Doppel-Token wird abgewiesen; Sitzung nach
Leerlauf ungültig; CSP ohne `unsafe-inline` und Seite funktioniert.

### PR-E06 — Betriebsbeobachtbarkeit

**WARUM** Der Logger existiert und wird in genau einer Datei benutzt.
**UMFANG** Anfrage-Kennung durchgängig; Logs in allen Server Actions und
Diensten; Fehlerpfade mit Typ statt Text; Bereitstellungskennung.
**SICHERHEIT** Keine Geheimnisse, keine Lernendenantworten, keine
vollständigen Kennungen.
**TESTS** Eine Prüfung, die fehlschlägt, wenn ein Serverpfad ohne Kennung
protokolliert.

### PR-E07 — Auditlog

**WARUM** Unternehmensvorgänge brauchen Nachvollziehbarkeit;
`AnalyticsEvent` darf dafür **nicht** umgewidmet werden.
**UMFANG** Nur anfügbares `AuditEvent` (Akteur, Organisation, Vorgang,
Ziel, Zeit, Metadaten); Schreibpunkte erst mit PR-E08/E09.
**SCHEMA** neue Tabelle, kein Bezug zu `AnalyticsEvent`.
**TESTS** Kein Änderungs- oder Löschpfad auf `AuditEvent`.

### PR-E08 — Organisationen

**WARUM** Grundlage für alles Unternehmensbezogene.
**UMFANG** `Organization`, `OrganizationMembership`; Bestandsnutzende bleiben
**ohne** Organisation gültig (Selbstlernende).
**NICHT-UMFANG** kein `tenantId` an Lerntabellen.
**MIGRATION** rein additiv, keine Rückfüllung.
**RÜCKNAHME** Tabellen bleiben ungenutzt liegen.
**TESTS** Migration auf einer Kopie mit Bestandsdaten; niemand verliert
Zugang.

### PR-E09 — Organisationsautorisierung

**WARUM** Ohne sie ist PR-E08 nur Datenhaltung.
**UMFANG** Rollen `LEARNER`, `ORG_MANAGER`, `ORG_ADMIN`, `PLATFORM_ADMIN`;
eine zentrale Prüfstelle; Standard verweigert; `requireAdmin()` bekommt
endlich Aufrufer.
**SICHERHEIT** Organisationszugehörigkeit **nie** aus der Eingabe.
**TESTS** Tabellengetriebene Matrix über alle Rollen und Ressourcen; eine
Isolationssuite, die fremden Zugriff in jeder Kombination versucht.

### PR-E10 — Kohorten, Zuweisung, Berichte

**UMFANG** `Cohort`, `CohortMembership`, `CourseAssignment`;
Führungskraft-Sicht mit ausdrücklicher Sichtbarkeitsgrenze.
**SICHERHEIT** Führungskräfte sehen Fortschritt, **nicht** einzelne
Antworten — diese Grenze gehört in die Prüfung, nicht nur in die Oberfläche.

### PR-E11 — Unternehmensidentität

**UMFANG** Zuerst nur die Architektur und eine Anbieterabstraktion; OIDC als
erste Umsetzung; SAML und SCIM ausdrücklich später.

### PR-E12 — Sicherung, Wiederherstellung, Runbooks

**WARUM** Heute gibt es weder Verfahren noch Nachweis.
**UMFANG** Sicherungsplan; **belegte** Wiederherstellung in eine
Wegwerfdatenbank; Rücknahmegrenzen für Migrationen; Runbooks.
**FERTIG** Ein Wiederherstellungsprotokoll mit Datum liegt vor. Ohne Nachweis
gilt das Tor als offen.

### PR-E13 … PR-E23 — Lehrplan

Gruppiert nach Abhängigkeit, nicht nach Nummer:

| Gruppe | Inhalt                          | Hängt an                   |
| ------ | ------------------------------- | -------------------------- |
| C1     | 6 HTTP & APIs                   | — (Flaschenhals)           |
| C2     | 7 AI-APIs & SDKs                | C1                         |
| C3     | 8 Structured Outputs/Tools      | C2                         |
| C4     | 9 Embeddings-Tiefe, 10 RAG      | C3                         |
| C5     | 11 Agents, 12 MCP               | C3                         |
| C6     | 13 AI-Coding, 14 CI/CD          | Stufe 2 (fertig)           |
| C7     | 15 Evaluationen                 | C4, C5                     |
| C8     | 16 AI-Sicherheit                | C5                         |
| C9     | 17 DACH-Governance              | — (primärquellenpflichtig) |
| C10    | 18 Production AI/LLMOps         | Gateway + PR-E06/E12       |
| C11    | 3 AI/ML-Vertiefung, 19 Advanced | — (optional)               |
| C12    | 20 Enterprise AI                | C9, C10                    |

C6 und C9 lassen sich sofort beginnen; C6 hängt nur an der bereits fertigen
Stufe 2. Jede Gruppe braucht Konzepte, Lektionen, Aufgaben,
Transferaufgaben, Quellen, Inhaltsprüfung, Tests und Barrierefreiheit.

### Letzte Änderung — Freigabekandidat

Kein neuer Inhalt. Nur: alle Tore nachweisen, Dokumente gegen die Wirklichkeit
prüfen, Abnahmesuite vollständig grün.

## Vorgeschlagenes Datenmodell (nicht migriert)

```
Organization(id, slug, name, createdAt, settings Json)
OrganizationMembership(id, organizationId, userId, role, createdAt)
  @@unique([organizationId, userId])
Cohort(id, organizationId, name, createdAt)
CohortMembership(id, cohortId, userId)  @@unique([cohortId, userId])
CourseAssignment(id, organizationId, cohortId?, courseId, dueAt?)
AuditEvent(id, organizationId?, actorUserId?, action, targetType,
           targetId?, metadata Json, occurredAt)   // nur anfügbar
```

**Eigentum.** Lerndaten (`Attempt`, `ConceptMastery`, `LessonProgress`,
`LearningPath`, `ReviewQueueItem`) bleiben **nutzereigen**. Die Organisation
erhält Sicht über die Mitgliedschaft, nicht über Eigentum. Das vermeidet
`tenantId` an jeder Tabelle und hält die Löschung auf Betroffenenwunsch
einfach.

**Bestand.** Heutige Nutzende bleiben ohne Organisation gültig. Keine
Rückfüllung, kein Pflichtfeld.

## Abnahmesuite

FUNKTIONAL · SICHERHEIT · AUTORISIERUNG (Matrix, Standard verweigert) ·
MANDANTENISOLATION (jede Rolle gegen jede fremde Ressource) · MIGRATION
(auf Bestandskopie) · NEBENLÄUFIGKEIT · AUFBEWAHRUNG (Frist wirkt
nachweislich) · AUSKUNFT/LÖSCHUNG · BARRIEREFREIHEIT (axe) · LEISTUNG ·
FEHLEREINSPEISUNG (Datenbank weg, Zähler weg) · SICHERUNG/WIEDERHERSTELLUNG
(belegt) · E2E · INHALTSPRÜFUNG · ABHÄNGIGKEITSPRÜFUNG
(`--omit=dev` ohne Fund).

Bestanden heißt: Jede Suite ist grün **und** für jede neue Regel ist gezeigt,
dass ihr Entfernen eine bestimmte Prüfung rot macht.
