# Enterprise-Readiness — Bestandsaufnahme

Stand: `b3454762a9c316a3aa4d78e9ed6216eb4da730fd` (main, nach PR #31).
Reine Lesebestandsaufnahme. Kein Quellcode wurde für dieses Dokument geändert.

## Wortschatz

Dieses Dokument verwendet sechs Zustände und keine Sammelurteile:

| Wort            | Bedeutung                                                      |
| --------------- | -------------------------------------------------------------- |
| `IMPLEMENTIERT` | Der Code existiert und wird im Betrieb erreicht.               |
| `VERIFIZIERT`   | Zusätzlich durch eine Prüfung gedeckt, die ohne ihn rot würde. |
| `DOKUMENTIERT`  | Beschrieben, aber nicht im Betrieb wirksam.                    |
| `GEPLANT`       | Vorgesehen, nichts davon existiert.                            |
| `AKZEPTIERT`    | Bekannt, bewusst hingenommen, mit Begründung.                  |
| `FEHLT`         | Nicht vorhanden und nicht vorbereitet.                         |

Die Wörter „sicher", „enterprise-ready", „DSGVO-konform" und
„produktionsreif" kommen als Gesamturteil nicht vor. Sie wären an diesem
Stand nicht belegbar.

## Kurzfassung

AIPfad ist eine technisch sorgfältig gebaute **Einzelnutzer-Lernanwendung**.
Die Lernmechanik, die Inhaltsprüfung, die Barrierefreiheitsprüfungen und die
Absicherung der wichtigsten Schreibpfade sind belastbar und durch Tests
gedeckt, die beim Entfernen der jeweiligen Regel rot werden.

Was fehlt, ist nicht Feinschliff, sondern eine ganze Schicht: **Es gibt kein
Mandantenmodell.** Kein `Organization`, kein `Membership`, keine Kohorte,
keine organisationsbezogene Rolle. Die Rollen-Aufzählung kennt `LEARNER` und
`ADMIN`; `requireAdmin()` hat im gesamten Anwendungscode **keinen einzigen
Aufrufer**, und es existiert keine Adminoberfläche. Aussagen über
Mandantentrennung sind an diesem Stand nicht möglich, weil es keine Mandanten
gibt — das ist kein Mangel in der Umsetzung, sondern eine noch nicht begonnene
Schicht.

Drei in `docs/SECURITY.md` beschriebene Maßnahmen sind nachgeprüft **nicht
wirksam**: die Aufbewahrungslöschung, das Double-Submit-CSRF-Verfahren und
(bei mehreren Instanzen) die Ratenbegrenzung.

## A — Produktvollständigkeit

| Bereich                  | Zustand         | Beleg                                                          |
| ------------------------ | --------------- | -------------------------------------------------------------- |
| Onboarding               | `VERIFIZIERT`   | `app/onboarding/`, Integrations- und E2E-Prüfungen             |
| Einstufung               | `VERIFIZIERT`   | `domain/placement/`, Grenzprüfungen beidseitig                 |
| Lernpfad                 | `IMPLEMENTIERT` | `services/path-service.ts` — ohne eigene Integrationsprüfungen |
| Lektionen/Übungen        | `VERIFIZIERT`   | 7 Interaktionsformen, `toPublicPayload()` entfernt Lösungen    |
| Labs                     | `IMPLEMENTIERT` | 7 `LabKind`, davon 3 mit kanonischem Konfigvertrag             |
| Wiederholung             | `IMPLEMENTIERT` | `domain/scheduling/`                                           |
| Fortschritt/Wissenskarte | `IMPLEMENTIERT` | `app/fortschritt/`, `app/wissenslandkarte/`                    |
| Glossar/Nachschlagen     | `IMPLEMENTIERT` | `app/glossar/`, `app/nachschlagen/`                            |
| Barrierefreiheit         | `VERIFIZIERT`   | 8 axe-Prüfungen, Fokusführung bis zum Ergebnisbildschirm       |
| **Adminbetrieb**         | **`FEHLT`**     | keine Route unter `app/`, `requireAdmin()` ohne Aufrufer       |
| **Inhaltslebenszyklus**  | `DOKUMENTIERT`  | `ContentStatus` existiert, keine Redaktionsoberfläche          |
| **Unternehmensabläufe**  | **`FEHLT`**     | kein Modell, keine Oberfläche                                  |

## B — Mandanten / Organisationen

**`FEHLT` — vollständig.** Kein `Organization`, `OrganizationMembership`,
`Cohort`, `CourseAssignment`. Alle Lerndaten hängen direkt an `User`.

Daraus folgt eine Aussage, die in keinem Dokument stehen darf: **Es gibt
keine Mandantentrennung, weder gute noch schlechte.** Was existiert, ist
konsequente Nutzertrennung — jede Abfrage der Lerndienste ist auf die
`userId` der Sitzung bezogen, und zwei unabhängige Sicherheitsprüfungen
haben dafür kein IDOR gefunden. Das ist die Grundlage, auf der ein
Mandantenmodell aufsetzen kann, aber es ist nicht dasselbe.

## C — Authentifizierung

| Punkt                     | Zustand         | Anmerkung                                                      |
| ------------------------- | --------------- | -------------------------------------------------------------- |
| Passwort-Hashing          | `VERIFIZIERT`   | scrypt, OWASP-Parameter, `timingSafeEqual`                     |
| Sitzungstoken             | `VERIFIZIERT`   | 32 Byte opak, nur SHA-256 in der Datenbank                     |
| Cookie-Flags              | `IMPLEMENTIERT` | `httpOnly`, `SameSite=Lax`, `Secure` bei `https`               |
| Absolute Gültigkeit       | `IMPLEMENTIERT` | 30 Tage (`SESSION_TTL_DAYS`)                                   |
| **Leerlauf-Gültigkeit**   | **`FEHLT`**     | `lastSeenAt` wird geführt, läuft aber nichts ab                |
| **Sitzungsentzug (alle)** | `DOKUMENTIERT`  | `destroyAllSessions()` — **kein Aufrufer**                     |
| Ratenbegrenzung Anmeldung | `AKZEPTIERT`    | wirksam je Instanz, siehe G                                    |
| **Passwortrichtlinie**    | `IMPLEMENTIERT` | Mindestlänge in Zod; keine Sperrliste, kein Kompromissabgleich |
| **Passwort zurücksetzen** | **`FEHLT`**     | kein Modell, keine Route, kein Mailversand                     |
| **E-Mail-Bestätigung**    | **`FEHLT`**     | keine Spalte, kein Ablauf                                      |
| **SSO / OIDC / SAML**     | **`FEHLT`**     | keine Abstraktion vorhanden                                    |
| **SCIM**                  | **`FEHLT`**     | —                                                              |
| **Kontolebenszyklus**     | **`FEHLT`**     | kein Sperren, kein Deaktivieren, kein Selbstlöschen            |

Nachgeprüft: `AUTH_SECRET` wird in `server/env.ts` erzwungen (mind. 32
Zeichen), aber **von keiner Zeile des Anwendungscodes verbraucht**. Sitzungen
nutzen Zufallstoken plus SHA-256, keinen HMAC. Die Variable ist heute eine
Startbedingung ohne Wirkung.

## D — Autorisierung

Die Autorisierungsmatrix des heutigen Stands ist kurz, weil es nur eine Achse
gibt:

| Ressource                  | LEARNER (eigen) | LEARNER (fremd) | ADMIN                |
| -------------------------- | --------------- | --------------- | -------------------- |
| Lernfortschritt, Versuche  | lesen/schreiben | **kein Zugang** | kein Sonderweg       |
| Einstufung                 | lesen/schreiben | **kein Zugang** | kein Sonderweg       |
| Inhalte (veröffentlicht)   | lesen           | lesen           | kein Sonderweg       |
| Inhalte (Entwurf)          | **kein Zugang** | **kein Zugang** | **keine Oberfläche** |
| Analysen, Export, Löschung | —               | —               | **FEHLT**            |

`ADMIN` ist heute ein Datenbankwert ohne Verhalten. Es gibt keine Aktion, die
ihn prüft.

## E — Datenschutz

| Punkt                               | Zustand            | Beleg                                                     |
| ----------------------------------- | ------------------ | --------------------------------------------------------- |
| Trennung Lerndaten / Produktanalyse | `IMPLEMENTIERT`    | `AnalyticsEvent` ohne Fremdschlüssel, Datum tagesgenau    |
| Kaskadenlöschung                    | `IMPLEMENTIERT`    | jeder Fremdschlüssel auf `User` mit `onDelete: Cascade`   |
| **Aufbewahrungslöschung**           | **`DOKUMENTIERT`** | `applyRetentionPolicy()` — **kein Aufrufer**, `crons: []` |
| **Auskunft / Datenexport**          | **`FEHLT`**        | keine Route, keine Oberfläche                             |
| **Löschung auf Betroffenenwunsch**  | **`FEHLT`**        | kein `prisma.user.delete()` im Anwendungscode             |
| **Verarbeitungsverzeichnis**        | **`FEHLT`**        | —                                                         |
| **Pseudonymisierung**               | **`FEHLT`**        | —                                                         |
| **Sicherung / Wiederherstellung**   | **`FEHLT`**        | `docs/DEPLOYMENT.md` hat keinen Abschnitt dazu            |

Die Aufbewahrungsfrist ist der schärfste Fall: `.env.example` setzt
`ATTEMPT_RETENTION_DAYS="365"`, `server/env.ts` validiert sie,
`session.ts:215` liest sie — und **niemand ruft die Funktion auf**.
`vercel.json` enthält `"crons": []`. Rohe Versuchsdaten werden damit
unbegrenzt aufbewahrt. `docs/SECURITY.md` benennt das bereits korrekt; dieses
Dokument bestätigt es unabhängig.

## F — Sicherheit

Bestätigt wirksam: Eingabevalidierung an jeder Grenze (Zod), Sicherheitskopf-
zeilen, keine Kommandoausführung (Git-Simulatoren und Terminal-Lab sind reine
Funktionen), genau ein `dangerouslySetInnerHTML` mit Konstante, kein Open
Redirect, Lockfile integritätsgesichert, `npm audit --omit=dev` **0 Funde**
(heute nachgemessen).

Nicht wirksam oder eingeschränkt:

| Punkt                              | Zustand         | Nachgeprüft                                            |
| ---------------------------------- | --------------- | ------------------------------------------------------ |
| Double-Submit-CSRF                 | `DOKUMENTIERT`  | `assertCsrf`/`getCsrfToken` — **0 Aufrufer**           |
| CSRF wirksam über                  | `IMPLEMENTIERT` | Origin-Prüfung + `SameSite=Lax` + Next-Server-Actions  |
| `script-src 'unsafe-inline'`       | `AKZEPTIERT`    | Themenflacker-Skript; Nonce vorgemerkt                 |
| Ratenbegrenzung                    | `AKZEPTIERT`    | `new Map()` im Modul → je Prozess                      |
| E-Mail-Enumeration (Registrierung) | `AKZEPTIERT`    | bewusst, mit Begründung                                |
| Actions auf Haupt-Tags gepinnt     | `AKZEPTIERT`    | `@v4`, nicht Commit-Hash; Lauf trägt keine Geheimnisse |
| Dev-Abhängigkeiten                 | `AKZEPTIERT`    | heute 4 hoch / 2 mittel, nur Werkzeugkette             |

Der dedizierte `claude-security`-Workflow ist nie gelaufen. `docs/SECURITY.md`
sagt das ausdrücklich. Ersatzprüfungen sind kein Ersatz für einen bestandenen
Sicherheitslauf.

## G — Ratenbegrenzung

`src/server/security/rate-limit.ts` hält die Zähler in einer modulweiten
`Map`. Auf einer einzelnen Instanz wirkt das; bei zwei Instanzen teilt sich
ein Angreifer die Zähler nicht, sondern bekommt zwei. Die Zielplattform
(Vercel, `fra1`) skaliert horizontal — die Maßnahme ist dort strukturell
unvollständig.

Drei Bauformen kommen infrage. Bewertet gegen den vorhandenen Stapel:

| Ansatz                    | Atomarität                     | Latenz    | Kosten             | Betriebsaufwand          | Verhalten bei Ausfall                 |
| ------------------------- | ------------------------------ | --------- | ------------------ | ------------------------ | ------------------------------------- |
| **PostgreSQL**            | über eine Anweisung erreichbar | +1 Umlauf | keine zusätzlichen | keine neue Infrastruktur | Datenbank weg = Anwendung ohnehin weg |
| Managed Redis/KV          | nativ                          | gering    | laufend            | neue Komponente          | Ausfall = Grundsatzentscheidung nötig |
| Plattformnativer Speicher | nativ                          | gering    | laufend            | Bindung an Anbieter      | dito                                  |

Empfehlung für V1: **PostgreSQL**. Es gibt bereits eine verwaltete Instanz,
die Anwendung ist ohne sie ohnehin nicht betriebsfähig, und die
Schnittstelle von `checkRateLimit()` bleibt unverändert. Keine Infrastruktur
ohne ausdrückliche Freigabe.

## H — Betrieb

| Punkt                           | Zustand         | Beleg                                                    |
| ------------------------------- | --------------- | -------------------------------------------------------- |
| `/api/health`                   | `IMPLEMENTIERT` | ohne Datenbankzugriff, bewusst                           |
| `/api/ready`                    | `IMPLEMENTIERT` | Datenbank + Inhaltsprüfung, keine Details in der Antwort |
| Migrationen                     | `IMPLEMENTIERT` | 3 Migrationen, `prisma migrate deploy`                   |
| Konfigurationsvertrag           | `IMPLEMENTIERT` | `server/env.ts` mit Zod                                  |
| **Start bricht früh ab**        | **`FEHLT`**     | `getEnv()` ist verzögert; keine `instrumentation.ts`     |
| Strukturierte Logs              | `IMPLEMENTIERT` | `observability/logger.ts` mit Anfrage-Kennung            |
| **Logs tatsächlich genutzt**    | **`FEHLT`**     | **genau eine Datei** nutzt den Logger (`api/ready`)      |
| **Fehlerberichte**              | **`FEHLT`**     | keine Anbindung                                          |
| **Metriken / Alarme / SLOs**    | **`FEHLT`**     | —                                                        |
| **Sicherung/Wiederherstellung** | **`FEHLT`**     | weder Verfahren noch Nachweis                            |
| **Rücknahme (Migration)**       | **`FEHLT`**     | keine Abwärtsstrategie beschrieben                       |
| **Runbooks / Incident**         | **`FEHLT`**     | —                                                        |
| **Geheimnisrotation**           | **`FEHLT`**     | —                                                        |

`docs/DEPLOYMENT.md` Punkt 5 ist überholt: Er empfiehlt, einen CI-Job
anzulegen, „sofern vorhanden" — der Workflow existiert seit Ausbaustufe 2.

## I — Datenbank und Konsistenz

Hier ist der Stand deutlich besser, als die übrigen Abschnitte vermuten
lassen. Nachgelesen und nachgemessen:

- **Aufgabenabgabe** (`exercise-service.ts`): `$transaction` mit
  `isolationLevel: 'Serializable'` und Wiederholung bei P2034. Der
  aufwendigste Schreibpfad ist der am besten abgesicherte.
- **Onboarding-Abschluss**: eine Transaktion, Sperre in der Bedingung des
  Schreibvorgangs (`updateMany` mit `onboardingCompleted: false`) statt
  Lesen-dann-Schreiben. Gegen zwei gleichzeitige Abschlüsse geprüft.
- **Lektionsbeginn** (`lesson-service.ts`): bedingtes `updateMany`, danach
  `create` mit Toleranz für P2002, abgesichert durch
  `@@unique([userId, lessonId])`. Kein Rennen.
- **`getOrCreatePath`** (`path-service.ts`): Suchen-dann-Anlegen ohne
  Transaktion und ohne eindeutigen Index auf `userId`. Heute nicht
  erreichbar, weil der einzige Aufrufer hinter `onboardingCompleted` liegt
  und der Onboarding-Abschluss den Pfad in derselben Transaktion anlegt.
  `VERIFIZIERT` ist das nicht — es ist `AKZEPTIERT` mit statischem Beleg.

Offen: keine Last- oder Nebenläufigkeitsprüfung jenseits gezielter
Zweier-Rennen.

## J — Beobachtbarkeit

Der Baukasten ist da und wird nicht benutzt. `logger.ts` bietet Stufen,
Anfrage-Kennung und gekürzte Nutzerkennung; genutzt wird er in **einer**
Route. Server Actions, Dienste und Fehlerpfade schreiben nichts. Es gibt
keine Bereitstellungskennung in den Logs und keine Metriken.

## K — Nachvollziehbarkeit

`AnalyticsEvent` ist bewusst anonym, ohne Fremdschlüssel, mit tagesgenauem
Datum. **Dieses Modell darf kein Auditlog werden** — genau das würde die
Trennung aufheben, die der Datenschutzabschnitt trägt.

Ein Auditlog für Unternehmensvorgänge (Rollenwechsel, Organisationseinstellungen,
Veröffentlichung, Export, Löschung, SSO-Konfiguration) **fehlt** und braucht
ein eigenes, nur anfügbares Modell.

## L — Inhaltsführung

| Punkt                          | Zustand         |
| ------------------------------ | --------------- |
| Kanonische Schemata            | `IMPLEMENTIERT` |
| Inhaltsprüfung in CI           | `VERIFIZIERT`   |
| Veröffentlichungsstatus        | `IMPLEMENTIERT` |
| Quellenpolitik                 | `DOKUMENTIERT`  |
| **Versionierung von Inhalten** | **`FEHLT`**     |
| **Redaktionelle Freigabe**     | **`FEHLT`**     |
| **Veralterungserkennung**      | **`FEHLT`**     |

Nachgeprüfte Lücke: `validateCourseGraph()` prüft Lab-Konfigurationen nur für
`MERGE_CONFLICT`, `BRANCH` und `GIT_STATE`. Für `TERMINAL`, `TOKENIZER`,
`CONTEXT_WINDOW` und `PROMPT_REPAIR` gibt es keinen kanonischen Vertrag —
vier der sieben Lab-Arten sind ungeprüft.

## M — Lehrplan

Umgesetzt: **0, 1, 2, 4, 5**. Offen: **3, 6–20** (16 Stufen).

**Widerspruch zur Annahme im Auftrag.** Der Auftrag führt Stufe 3 als Wurzel
der Abhängigkeitskette. `docs/LEHRPLAN.md` sagt das Gegenteil: „3 —
AI/ML/Deep-Learning-Grundlagen: Baut auf Stufe 4 auf, nicht umgekehrt".
Stufe 4 ist bereits gebaut. Stufe 3 ist damit **keine Voraussetzung**,
sondern Vertiefung — sie blockiert nichts.

Ebenso: Stufe 9 (Embeddings) ist laut LEHRPLAN in Stufe 4 der Grundidee nach
abgedeckt; offen ist die Tiefe, nicht die Voraussetzung.

Die tatsächlich bindende Kette ist:

```
6 HTTP/APIs → 7 AI-APIs → 8 Structured Outputs/Tool Calling
                                  ├→ 11 Agents → 12 MCP → 16 AI-Sicherheit
                                  └→ (9 Embeddings-Tiefe) → 10 RAG
2 Git/GitHub (fertig) → 13 AI-Coding → 14 CI/CD
10 + 11 → 15 Evaluationen
17 DACH-Governance  (unabhängig, primärquellenpflichtig)
18 Production AI    (setzt echtes Gateway + Betrieb voraus)
20 Enterprise AI    (setzt 17 + 18 voraus)
```

Stufe 6 ist der einzige echte Flaschenhals: Ohne sie hängen 7, 8, 10, 11, 12,
15 und 16.

## N — Live-KI

Heute bewusst keine. Die Entwurfsthemen für ein späteres Gateway sind in
`ENTERPRISE-ROADMAP.md` gesammelt; nichts davon ist begonnen, und nichts
davon sollte vor den Betriebsgrundlagen begonnen werden.

## O — Was „unternehmenstauglich" hier heißen müsste

| Fähigkeit                               | Einstufung                       |
| --------------------------------------- | -------------------------------- |
| Organisationen + Mitgliedschaft         | `ERFORDERLICH_FÜR_ENTERPRISE_V1` |
| Organisationsrollen + Autorisierung     | `ERFORDERLICH_FÜR_ENTERPRISE_V1` |
| Auditlog                                | `ERFORDERLICH_FÜR_ENTERPRISE_V1` |
| Aufbewahrung tatsächlich ausführen      | `ERFORDERLICH_FÜR_ENTERPRISE_V1` |
| Gemeinsame Ratenbegrenzung              | `ERFORDERLICH_FÜR_ENTERPRISE_V1` |
| Betriebsbeobachtbarkeit                 | `ERFORDERLICH_FÜR_ENTERPRISE_V1` |
| Sicherung + belegte Wiederherstellung   | `ERFORDERLICH_FÜR_ENTERPRISE_V1` |
| Auskunft/Löschung (Betroffenenrechte)   | `ERFORDERLICH_FÜR_ENTERPRISE_V1` |
| Kohorten + Zuweisung                    | `VOR_BEZAHLTEM_ENTERPRISE`       |
| Fortschrittsberichte für Führungskräfte | `VOR_BEZAHLTEM_ENTERPRISE`       |
| SSO (OIDC)                              | `VOR_BEZAHLTEM_ENTERPRISE`       |
| Mandantenlöschung                       | `VOR_BEZAHLTEM_ENTERPRISE`       |
| SCIM                                    | `NACH_V1`                        |
| SAML                                    | `NACH_V1`                        |
| Eigenes Content-Studio                  | `NACH_V1`                        |
| Rollenbasierte Tracks                   | `NICHT_NÖTIG` für V1             |
