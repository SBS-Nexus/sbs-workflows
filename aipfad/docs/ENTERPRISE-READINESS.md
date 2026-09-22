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

## Blockerregister

Eine Liste, eine Zählung. Jeder Blocker hat eine feste Kennung, **genau eine**
Hauptdomäne und eine zuständige Änderung. Die Domänenzahlen sind
Hauptdomänen-Zahlen und summieren sich deshalb exakt auf die Gesamtzahl —
es gibt keine Mehrfachzählung.

### Fundament (AIPFAD_ENTERPRISE_FOUNDATION_V1)

| ID      | Titel                                                                                  | Hauptdomäne       | Zustand                         | Änderung         |
| ------- | -------------------------------------------------------------------------------------- | ----------------- | ------------------------------- | ---------------- |
| ENT-B01 | Kein `Organization`/`OrganizationMembership`, keine Verwaltung dafür                   | MANDANTEN         | `FEHLT`                         | E08, E08B        |
| ENT-B02 | Keine Organisationsautorisierung; `ADMIN` ohne Durchsetzung                            | AUTORISIERUNG     | `FEHLT`                         | E09A–C           |
| ENT-B03 | Aufbewahrungslöschung läuft nie                                                        | DATEN             | `DOKUMENTIERT`                  | E04A             |
| ENT-B04 | Keine Datenauskunft (Selbstexport)                                                     | DATEN             | `FEHLT`                         | E04B             |
| ENT-B05 | Keine Löschung auf Betroffenenwunsch                                                   | DATEN             | `FEHLT`                         | E04C             |
| ENT-B06 | Kein Auditlog für Unternehmensvorgänge                                                 | DATEN             | `FEHLT`                         | E07              |
| ENT-B07 | Ratenbegrenzung nur je Prozess                                                         | SICHERHEIT        | `AKZEPTIERT`                    | E03              |
| ENT-B08 | Ungenutztes CSRF-Verfahren (`DOKUMENTIERT`); `unsafe-inline` in der CSP (`AKZEPTIERT`) | SICHERHEIT        | gemischt                        | E05C, E05D, E05E |
| ENT-B09 | Kein Leerlauf-Ablauf; Sitzungsentzug ohne Aufrufer                                     | AUTHENTIFIZIERUNG | `DOKUMENTIERT`                  | E05A             |
| ENT-B10 | Keine Passwort-Wiederherstellung                                                       | AUTHENTIFIZIERUNG | `FEHLT`                         | E05B             |
| ENT-B11 | Keine belegte Wiederherstellung aus einer Sicherung                                    | BETRIEB           | `FEHLT`                         | E10              |
| ENT-B12 | Keine Runbooks, keine Migrations-Rücknahmestrategie                                    | BETRIEB           | `FEHLT`                         | E10              |
| ENT-B13 | Konfiguration bricht nicht früh ab; `AUTH_SECRET` ungenutzt                            | BETRIEB           | `IMPLEMENTIERT` (unvollständig) | E02              |
| ENT-B14 | Logger existiert, wird in genau einer Datei benutzt                                    | BEOBACHTBARKEIT   | `IMPLEMENTIERT` (ungenutzt)     | E06              |
| ENT-B15 | 4 von 7 Lab-Arten ohne kanonischen Vertrag                                             | INHALTE           | `FEHLT`                         | E01B             |

Vier Zeilen bündeln zwei Befunde derselben Domäne (`ENT-B08`, `ENT-B09`,
`ENT-B12`, `ENT-B13`). Das ist Absicht und die Konvention lautet: **eine Zeile je
abgrenzbarem Befund**. Die Änderungen sind teils feiner geschnitten
(`ENT-B08` auf E05C/D/E), teils gröber (`ENT-B11` und `ENT-B12` beide auf E10). `ENT-B08` bis `B10` verteilen sich auf E05A bis E05E.

**FUNDAMENT_BLOCKER = 15**

| Hauptdomäne       | Zahl   |
| ----------------- | ------ |
| DATEN             | 4      |
| BETRIEB           | 3      |
| SICHERHEIT        | 2      |
| AUTHENTIFIZIERUNG | 2      |
| MANDANTEN         | 1      |
| AUTORISIERUNG     | 1      |
| BEOBACHTBARKEIT   | 1      |
| INHALTE           | 1      |
| LEHRPLAN          | 0      |
| SONSTIGE          | 0      |
| **Summe**         | **15** |

Die vorige Fassung nannte 14 bei einer Domänensumme von 15. Die Ursache war
kein Tippfehler: Das Auditlog war als Anforderung geführt, aber nicht als
eigener Blocker gezählt. Es ist jetzt `ENT-B06` und DATEN steht auf 4.

### Zusätzlich für den bezahlten Einsatz (AIPFAD_PAID_ENTERPRISE_GA)

| ID      | Titel                                             | Hauptdomäne       | Änderung |
| ------- | ------------------------------------------------- | ----------------- | -------- |
| ENT-G01 | Kohorten und Kohortenmitgliedschaft               | MANDANTEN         | E11A     |
| ENT-G02 | Kurszuweisung                                     | MANDANTEN         | E11B     |
| ENT-G03 | Führungskraft-Sicht mit Sichtbarkeitsgrenze       | AUTORISIERUNG     | E11C     |
| ENT-G04 | OIDC-Anmeldung                                    | AUTHENTIFIZIERUNG | E12      |
| ENT-G05 | Organisationslebenszyklus samt Löschung           | MANDANTEN         | E13A–B   |
| ENT-G06 | Kaufmännische Betriebsbereitschaft (SLO, Support) | BETRIEB           | E14      |

**GA_ZUSATZBLOCKER = 6**

SCIM und SAML sind **nicht** enthalten; sie bleiben `NACH_GA`, solange kein
Kunde sie vertraglich fordert.

## A — Produktvollständigkeit

| Bereich                  | Zustand         | Beleg                                                          |
| ------------------------ | --------------- | -------------------------------------------------------------- |
| Onboarding               | `VERIFIZIERT`   | `app/onboarding/`, Integrations- und E2E-Prüfungen             |
| Einstufung               | `VERIFIZIERT`   | `domain/placement/`, Grenzprüfungen beidseitig                 |
| Lernpfad                 | `IMPLEMENTIERT` | `services/path-service.ts` — ohne eigene Integrationsprüfungen |
| Lektionen/Übungen        | `VERIFIZIERT`   | 10 Interaktionsformen, `toPublicPayload()` entfernt Lösungen   |
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

| Punkt                     | Zustand         | Anmerkung                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passwort-Hashing          | `IMPLEMENTIERT` | scrypt, OWASP-Parameter, `timingSafeEqual`; gedeckt ist nur, dass nicht im Klartext gespeichert wird — Parameterwahl und Vergleichsverfahren sind ungeprüft                                                                                                                                                                                                                                         |
| Sitzungstoken             | `IMPLEMENTIERT` | 32 Byte opak, nur SHA-256 — keine Prüfung deckt die Speicherform: die Hash-Funktion durch die Identität zu ersetzen ließe jede Suite grün                                                                                                                                                                                                                                                           |
| Cookie-Flags              | `IMPLEMENTIERT` | `httpOnly`, `SameSite=Lax`, `Secure` bei `https`                                                                                                                                                                                                                                                                                                                                                    |
| Absolute Gültigkeit       | `IMPLEMENTIERT` | 30 Tage (`SESSION_TTL_DAYS`)                                                                                                                                                                                                                                                                                                                                                                        |
| **Leerlauf-Gültigkeit**   | **`FEHLT`**     | `lastSeenAt` wird geführt, läuft aber nichts ab                                                                                                                                                                                                                                                                                                                                                     |
| **Sitzungsentzug (alle)** | `DOKUMENTIERT`  | `destroyAllSessions()` — **kein Aufrufer**                                                                                                                                                                                                                                                                                                                                                          |
| Ratenbegrenzung Anmeldung | `AKZEPTIERT`    | wirksam je Instanz, siehe G                                                                                                                                                                                                                                                                                                                                                                         |
| **Passwortrichtlinie**    | `IMPLEMENTIERT` | Mindestlänge 10, Höchstlänge 200, Sperrliste häufiger Passwörter (13 Einträge), Prüfung, ob der lokale Teil der E-Mail-Adresse (ab drei Zeichen) im Passwort enthalten ist, Ablehnung eines einzelnen wiederholten Zeichens — `auth/password.ts:94`, aufgerufen bei jeder Registrierung (`auth-actions.ts:133`). Kein Abgleich gegen bekannte Leaks. **Keine Prüfung deckt eine dieser Regeln ab.** |
| **Passwort zurücksetzen** | **`FEHLT`**     | kein Modell, keine Route, kein Mailversand                                                                                                                                                                                                                                                                                                                                                          |
| **E-Mail-Bestätigung**    | **`FEHLT`**     | keine Spalte, kein Ablauf                                                                                                                                                                                                                                                                                                                                                                           |
| **SSO / OIDC / SAML**     | **`FEHLT`**     | keine Abstraktion vorhanden                                                                                                                                                                                                                                                                                                                                                                         |
| **SCIM**                  | **`FEHLT`**     | —                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Kontolebenszyklus**     | **`FEHLT`**     | kein Sperren, kein Deaktivieren, kein Selbstlöschen                                                                                                                                                                                                                                                                                                                                                 |

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
(gemessen am 22.09.2026 gegen das Lockfile dieses Commits).

Nicht wirksam oder eingeschränkt:

| Punkt                              | Zustand                         | Nachgeprüft                                                                                            |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Double-Submit-CSRF                 | `DOKUMENTIERT`                  | `assertCsrf`/`getCsrfToken` — **0 Aufrufer**                                                           |
| CSRF wirksam über                  | `IMPLEMENTIERT` (eingeschränkt) | `SameSite=Lax` + Next-Server-Actions; Herkunftsprüfung greift nur bei gesetztem `Origin` (siehe unten) |
| `script-src 'unsafe-inline'`       | `AKZEPTIERT`                    | Themenflacker-Skript; Nonce vorgemerkt                                                                 |
| Ratenbegrenzung                    | `AKZEPTIERT`                    | `new Map()` im Modul → je Prozess                                                                      |
| E-Mail-Enumeration (Registrierung) | `AKZEPTIERT`                    | bewusst, mit Begründung                                                                                |
| Actions auf Haupt-Tags gepinnt     | `AKZEPTIERT`                    | `@v4`, nicht Commit-Hash; Lauf trägt keine Geheimnisse                                                 |
| Dev-Abhängigkeiten                 | `AKZEPTIERT`                    | heute 4 hoch / 2 mittel, nur Werkzeugkette                                                             |

**Zur Herkunftsprüfung, weil eine Empfehlung darauf ruht.** `src/proxy.ts:43`
prüft `if (origin && host)`. Fehlt die Kopfzeile `Origin`, wird der Vergleich
**übersprungen** und die Anfrage läuft weiter — die Prüfung hängt also daran,
dass die andere Seite sie mitschickt. Das ist kein Fehler im engeren Sinn
(Browser setzen `Origin` bei seitenfremden Schreibzugriffen), aber es ist
schwächer als „Origin-Prüfung" nahelegt. Wichtig ist es, weil E05C empfiehlt,
die verbliebene CSRF-Schicht zu entfernen, und diese Empfehlung sich auf die
Stärke genau dieser Prüfung stützt. Tragend sind dort `SameSite=Lax` und die
Server-Actions-Prüfung von Next.js; die Herkunftsprüfung kommt hinzu, wenn
eine Herkunft da ist. Die Empfehlung bleibt vertretbar — ihre Begründung
steht jetzt richtig da.

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

„Nur anfügbar" heißt dabei **Anwendungsschnittstelle**, nicht
Datenbankrecht: Wer auf der Datenbank schreiben darf, kann Zeilen ändern. Die
genaue Abgrenzung steht in `ENTERPRISE-ROADMAP.md` unter E07.

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
`CONTEXT_WINDOW` und `PROMPT_REPAIR` gibt es keinen kanonischen Vertrag.
Ungeprüft sind sie damit nicht: Alle vier haben ein Zod-Schema in der Maske, das beim Anzeigen greift (`terminal-lab.tsx:9`, `tokenizer-lab.tsx:8`, `context-window-lab.tsx:8`, `labs/[slug]/page.tsx:17`). Der Unterschied ist der Zeitpunkt — ein Fehler fällt erst auf, wenn jemand das Lab im Browser öffnet, nicht beim Bauen. `schema.ts:369` sagt das über sich selbst bereits genauer, als die vorige Fassung dieses Dokuments es tat.

## M — Lehrplan

Umgesetzt: **0, 1, 2, 4, 5**. Offen: **3, 6–20** (16 Stufen).

### Zwei Arten von Abhängigkeit, die nicht vermischt werden dürfen

- **Didaktische Abhängigkeit** — Stufe Y ist ohne Stufe X nicht verständlich.
  Nur diese steht in `docs/LEHRPLAN.md` und nur sie bestimmt die
  Reihenfolge des Lernens.
- **Umsetzungsabhängigkeit** — Stufe Y braucht für ihre Übungen eine
  technische Grundlage (etwa ein Live-Gateway). Das ist eine
  Architekturentscheidung, keine Aussage über den Lehrstoff, und sie kann
  durch deterministische Übungen umgangen werden.

### Was LEHRPLAN.md wörtlich hergibt

| Aussage im Dokument                            | Art        |
| ---------------------------------------------- | ---------- |
| 6 ist „Voraussetzung für Stufe 7"              | didaktisch |
| 8 „baut auf Stufe 7 auf"                       | didaktisch |
| 10 „baut auf Stufe 9 auf"                      | didaktisch |
| 11 „baut auf Tool Calling (Stufe 8) auf"       | didaktisch |
| 12 „baut auf Agents auf"                       | didaktisch |
| 13 und 14 bauen auf Stufe 2 auf                | didaktisch |
| 15 „sinnvoll erst mit Agents/RAG"              | didaktisch |
| 16 folgt, „sobald Agents/MCP existieren"       | didaktisch |
| 20 „baut auf Governance (17) auf"              | didaktisch |
| 9: Grundidee steckt in Stufe 4, hier die Tiefe | didaktisch |

### Drei Korrekturen an der vorigen Fassung

**Stufe 3 ist keine Wurzel.** LEHRPLAN sagt: „Baut auf Stufe 4 auf, nicht
umgekehrt". Stufe 4 ist gebaut. Stufe 3 ist Vertiefung und blockiert nichts.

**Stufe 6 gilt nicht für Stufe 10.** Die vorige Fassung schrieb, ohne Stufe 6
hingen „7, 8, 10, 11, 12, 15 und 16". Für 10 stimmt das nicht: LEHRPLAN
führt 10 auf 9 zurück und 9 auf die in Stufe 4 gelegte Grundidee — **nirgends
auf 8**. Die Kette 8 → 9 → 10 steht so nicht im Dokument; sie war meine
Hinzufügung.

**Drei weitere erfundene Kanten.** Die vorige Fassung zeichnete
`13 → 14`, `17 → 18` und `20 → 17 + 18`. LEHRPLAN führt 13 und 14 beide auf
Stufe 2 zurück (Geschwister, keine Kette), 18 allein auf „ein funktionierendes
AI-Gateway" — nicht auf 17 — und 20 allein auf „Governance (17)". Ich hatte
die Sorgfalt der 8→9→10-Korrektur auf **eine** Kante angewandt und den Rest
des Graphen stehen lassen.

Richtig ist: Stufe 6 ist didaktische Voraussetzung für **7, 8, 11, 12 und 16**
und über 11 auch für 15. Die Strecke **9 → 10 ist sofort beginnbar**, weil ihre
Voraussetzung (Stufe 4) fertig ist.

```
6 HTTP/APIs → 7 AI-APIs → 8 Tool Calling → 11 Agents → 12 MCP → 16 AI-Sicherheit
                                                  └→ 15 Evaluationen ←┐
4 LLM-Grundlagen (fertig) → 9 Embeddings-Tiefe → 10 RAG ──────────────┘
2 Git/GitHub (fertig) → 13 AI-Coding
2 Git/GitHub (fertig) → 14 CI/CD
17 DACH-Governance   (unabhängig, primärquellenpflichtig)
18 Production AI     → Umsetzungsabhängigkeit: Gateway + Betrieb
20 Enterprise AI     → 17
```

### Umsetzungsabhängigkeiten, getrennt geführt

| Stufe | Umsetzungsabhängigkeit                    | Vermeidbar?                                       |
| ----- | ----------------------------------------- | ------------------------------------------------- |
| 7, 8  | Anbieter-Beispielcode gegen Primärquellen | ja — lesende Beispiele statt Live-Aufrufe         |
| 10    | Vektorsuche für ein praktisches Lab       | ja — deterministischer Korpus, kein Live-Anbieter |
| 11,12 | Werkzeugausführung                        | ja — simuliert, wie die Git-Labs                  |
| 18    | echtes Gateway und echter Betrieb         | **nein** — das ist der Gegenstand der Stufe       |

Nur Stufe 18 hat eine Umsetzungsabhängigkeit, die sich nicht wegentwerfen
lässt. Alle übrigen lassen sich deterministisch bauen, so wie es die
Git-Simulatoren in Stufe 2 bereits vormachen.

## N — Live-KI

Heute bewusst keine. Die Entwurfsthemen für ein späteres Gateway sind in
`ENTERPRISE-ROADMAP.md` gesammelt; nichts davon ist begonnen, und nichts
davon sollte vor den Betriebsgrundlagen begonnen werden.

## O — Zwei Meilensteine, nicht einer

Die vorige Fassung vermischte „Enterprise V1" mit „vor bezahltem Einsatz".
Daraus entstand ein Widerspruch: Das Produkttor verlangte Zuweisung, die
Einstufung führte Zuweisung zugleich als nicht-V1. Deshalb zwei getrennte
Ziele. Eine Fähigkeit steht in genau einer Spalte.

### AIPFAD_ENTERPRISE_FOUNDATION_V1

Technisch tragfähige Grundlage für den Einsatz in einer Organisation — noch
kein verkaufsfähiges Produkt.

| Fähigkeit                              | Blocker          |
| -------------------------------------- | ---------------- |
| Organisationen + Mitgliedschaft        | ENT-B01          |
| Organisationsautorisierung + Isolation | ENT-B02          |
| Auditereignisse                        | ENT-B06          |
| Aufbewahrung läuft tatsächlich         | ENT-B03          |
| Auskunft (Export)                      | ENT-B04          |
| Löschung auf Betroffenenwunsch         | ENT-B05          |
| Gemeinsame Ratenbegrenzung             | ENT-B07          |
| Sitzungslebenszyklus                   | ENT-B09          |
| Passwort-Wiederherstellung             | ENT-B10          |
| Betriebsbeobachtbarkeit                | ENT-B14          |
| Belegte Wiederherstellung + Runbooks   | ENT-B11, ENT-B12 |
| Kanonische Inhaltsverträge             | ENT-B15          |
| Konfigurationsvertrag                  | ENT-B13          |
| Anfragegrenze (CSRF-Entscheidung, CSP) | ENT-B08          |

### AIPFAD_PAID_ENTERPRISE_GA

Zusätzlich, und erst danach:

| Fähigkeit                               | Blocker |
| --------------------------------------- | ------- |
| Kohortenverwaltung                      | ENT-G01 |
| Kurszuweisung                           | ENT-G02 |
| Berichte für Führungskräfte             | ENT-G03 |
| OIDC-Anmeldung                          | ENT-G04 |
| Organisationslebenszyklus samt Löschung | ENT-G05 |
| Kaufmännische Betriebsbereitschaft      | ENT-G06 |

### Weder noch

| Fähigkeit              | Einstufung    | Grund                                       |
| ---------------------- | ------------- | ------------------------------------------- |
| SCIM                   | `NACH_GA`     | erst bei vertraglicher Forderung            |
| SAML                   | `NACH_GA`     | dito; OIDC deckt den Regelfall              |
| E-Mail-Bestätigung     | **offen**     | siehe Entscheidung unten                    |
| Eigenes Content-Studio | `NACH_GA`     | Validator und Leseansicht genügen bis dahin |
| Rollenbasierte Tracks  | `NICHT_NÖTIG` | setzt mehr Inhalt voraus                    |

### Offene Entscheidung: E-Mail-Bestätigung

Bewusst **nicht** stillschweigend in die Passwort-Wiederherstellung gebündelt.
Drei Wege, einer ist zu wählen:

- `FUNDAMENT_ERFORDERLICH` — wenn Organisationen Einladungen per E-Mail
  verschicken sollen; dann ist die Adresse ein Vertrauensanker.
- `GA_ERFORDERLICH` — wenn Einladungen erst mit Kohorten kommen.
- `AUFGESCHOBEN` — solange es nur Selbstregistrierung gibt und die Adresse
  bloß Anmeldename ist.

Heute trifft der dritte Fall zu. Die Entscheidung gehört getroffen, bevor
E05B gebaut wird, weil beide dieselbe Zustellgrenze brauchen.

### Prüflücke, ausdrücklich ohne eigenen Programmpunkt

Drei Regelwerke sind umgesetzt, aber von keiner Prüfung gedeckt: die
Speicherform des Sitzungstokens, die scrypt-Parameter samt
`timingSafeEqual` und die Passwortrichtlinie. Jede ließe sich entfernen,
ohne dass eine Suite rot würde.

Das erzeugt **keinen** neuen Blocker und **keinen** neuen Programmpunkt. Kein
Freigabetor verlangt diese Belege, und einen Punkt dafür zu erfinden hieße,
die Zahlen ohne Notwendigkeit wachsen zu lassen. Es steht hier, damit die
`IMPLEMENTIERT`-Einstufungen im Abschnitt C lesbar bleiben: Sie sind nicht
Nachlässigkeit, sondern die genaue Auskunft darüber, was heute belegt ist.

## P — Sicherheitstor ohne Werkzeugbindung

Die vorige Fassung machte die Freigabe davon abhängig, dass der
`claude-security`-Workflow „tatsächlich gelaufen" ist. Das bindet die
Produktionsreife an die Verfügbarkeit eines Werkzeugs, das in früheren
Sitzungen bereits nicht verfügbar war. Ersetzt durch ein sachliches Tor:

**`UNABHÄNGIGE_SICHERHEITSPRÜFUNG = BESTANDEN`**, belegt durch:

- eine Bedrohungsmodell-Durchsicht,
- eine Prüfung von Authentifizierung und Autorisierung,
- eine Abhängigkeits- und Laufzeitprüfung,
- `kritisch = 0`, `hoch = 0`,
- jeden mittleren Fund entweder behoben oder mit Verantwortlichem und
  Begründung angenommen.

`claude-security` ist das bevorzugte Mittel, wenn es läuft. Es ist nicht das
Kriterium.
