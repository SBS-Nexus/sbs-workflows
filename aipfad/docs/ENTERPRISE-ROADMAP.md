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

| Tor               | Kriterium                                                                                                                   | Beleg                                   | Blocker            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------ |
| PRODUKT           | Organisation, Mitgliedschaft und Rollen nutzbar                                                                             | E2E je Rolle                            | B01, B02           |
| SICHERHEIT        | `UNABHÄNGIGE_SICHERHEITSPRÜFUNG = BESTANDEN`; Ratenzähler nachweislich über zwei unabhängige Verbindungen geteilt           | Prüfbericht + Nebenläufigkeitsprotokoll | B07, B08           |
| DATEN             | Aufbewahrung läuft; Auskunft und Löschung bedienbar; Auditlog nimmt jeden zu diesem Zeitpunkt vorhandenen Vorgang auf (E07) | Laufprotokoll + Integration             | B03, B04, B05, B06 |
| MANDANTEN         | Fremde Organisationsdaten auf keinem Weg lesbar                                                                             | Isolationssuite                         | B01, B02           |
| AUTHENTIFIZIERUNG | Leerlauf-Ablauf, Sitzungsentzug, Passwort-Wiederherstellung                                                                 | Integration + E2E                       | B09, B10           |
| AUTORISIERUNG     | Vollständige Matrix, Standard verweigert                                                                                    | tabellengetriebene Prüfung              | B02                |
| BETRIEB           | Wiederherstellung belegt; Runbooks; Konfiguration bricht früh ab                                                            | Wiederherstellungsprotokoll             | B11, B12, B13      |
| BEOBACHTBARKEIT   | Anfrage-Kennung auf allen Serverpfaden                                                                                      | Prüfung                                 | B14                |
| INHALTE           | Alle sieben Lab-Arten unter kanonischem Vertrag                                                                             | `content:validate`                      | B15                |
| BARRIEREFREIHEIT  | axe ohne serious/critical                                                                                                   | CI                                      | —                  |
| TESTS             | Acht Tore grün; Isolations- und Migrationssuite vorhanden                                                                   | CI                                      | —                  |
| DOKUMENTATION     | Kein Dokument behauptet eine unwirksame Maßnahme                                                                            | Prüfliste                               | —                  |

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

### E01A — Wahrheit in Dokumenten und Kommentaren

**WARUM** Mehrere Dokumente **und vier Quellkommentare** beschreiben
Maßnahmen, die es so nicht gibt.

**UMFANG — Dokumente**

- Zwölf Quellenangaben ohne `pythonpfad/`-Präfix (`LEHRPLAN.md:61`).
- Vier Verweise auf Dokumente, die es im Baum überhaupt nicht gibt:
  `setup-commands.ts:7` (`spec §44/§45`), `orientierung.ts:6` (`Plan §11`),
  `app-header.tsx:28` (`plan §9`), `LEHRPLAN.md:45` (`Spec §55`).
- `DEPLOYMENT.md` Punkt 5 („sofern vorhanden" — der CI-Workflow existiert).
- `SECURITY.md:145` nennt „aller **sieben** Interaktionsformen"; es sind
  zehn. Dieselbe veraltete Zahl war über `docs/` bereits in die erste Fassung
  dieser Bestandsaufnahme gewandert.
- `LEHRPLAN.md:17` nennt „17 Aufgaben über **6** Interaktionsformen" und
  zählt danach acht Namen auf.

**UMFANG — Kommentare im Quelltext.** Vier Kommentare behaupten das Gegenteil
dessen, was der Code tut:

| Stelle                          | Behauptung                                             | Wirklichkeit                         |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| `src/proxy.ts:7`                | Prüfung „über `requireUser()`/`requireAdmin()`"        | `requireAdmin()` hat keinen Aufrufer |
| `src/proxy.ts:10`               | „zweite Verteidigungslinie neben dem CSRF-Token"       | es gibt keine Token-Prüfung          |
| `src/server/auth/session.ts:21` | „für Formulare wird ein Double-Submit-Token verwendet" | wird es nicht                        |
| `src/server/env.ts:5`           | „schlägt der Start fehl"                               | erst beim ersten Zugriff (siehe E02) |

**NICHT-UMFANG** Kein ausführbarer Code. Kommentare sind kein Verhalten — sie
ändern nichts, was eine Prüfung sehen könnte, und gehören deshalb hierher und
nicht in E01B.
**SCHEMA** keins. **RÜCKNAHME** trivial.
**FERTIG** Kein Verweis im Baum löst ins Leere, **und** kein Kommentar
behauptet eine Maßnahme, die es nicht gibt. Das Tor DOKUMENTATION wird
entsprechend auf „Dokument oder Kommentar" gelesen.

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
**ABLAGE** Die vier neuen Verträge gehören als gemeinsame Module nach
`src/domain/labs/`, wie `git-state-config.ts` es vormacht: eine Quelle, zwei
Aufrufer (Maske und Validator). Die heutigen Schemata in den Masken
(`terminal-lab.tsx:9` und drei weitere) werden dadurch **ersetzt**, nicht
verdoppelt.
**NICHT-UMFANG** Der `CommandReference`-Beispielvertrag gehört nicht hierher
— anderer Inhaltstyp, eigener Validator (`schema.ts:408`). Er steht als E01D.
**FERTIG** Sieben von sieben Lab-Arten unter einem kanonischen Vertrag.

### E01D — CommandReference-Beispiele

**WARUM** Eigener Inhaltstyp mit eigenem Validator; in E01B wäre er ein
Fremdkörper, den dessen Fertigkriterium nicht abdeckt.
**UMFANG** Vertrag, der Beispiele gegen die beschriebenen Befehle hält.
**VERHALTEN** Ändert Verhalten wie E01B: Bisher durchgelassene Inhalte fallen
künftig durch.
**TESTS** Ein absichtlich widersprüchliches Beispiel wird rot.

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

### E05C — CSRF-Entscheidung · `ENT-B08` (Teil 1)

**UMFANG** Das vorbereitete Double-Submit-Verfahren anbinden **oder**
ersatzlos entfernen. Kein drittes Ergebnis.

Das Entfernen ist der wahrscheinlichere richtige Weg: `SameSite=Lax` und die
Server-Actions-Prüfung von Next.js sind der beabsichtigte Entwurf, und
ungenutzter Sicherheitscode täuscht Schutz vor. Die Herkunftsprüfung in
`proxy.ts` zählt dabei **eingeschränkt** mit — sie greift nur, wenn die
Anfrage eine Herkunft mitschickt (siehe Bestandsaufnahme F). Kein
zusätzliches Verfahren ohne Bedrohungsmodell-Begründung.

**SCHEMA** `AuthSession.csrfSecret` ist `String NOT NULL` und wird bei jeder
Anmeldung geschrieben; ein Entfernen ist eine **Schemaänderung**, keine
Aufräumarbeit.
**MIGRATION** Spalte erst nullbar machen, dann nicht mehr schreiben, dann
entfernen — drei Schritte.
**RÜCKNAHME** Bis zum Entfernen der Spalte vollständig. Danach nur durch
Neuanlegen; bestehende Sitzungen tragen dann keinen Wert mehr.
**TESTS** Die getroffene Entscheidung ist belegt — bei „anbinden" durch eine
abgewiesene Anfrage ohne gültiges Doppel-Token, bei „entfernen" dadurch, dass
kein Pfad das Feld mehr liest.

### E05D — CSP ohne `unsafe-inline` · `ENT-B08` (Teil 2)

**UMFANG** Nonce statt `unsafe-inline` in `script-src`.
**NICHT-UMFANG** Nichts an Sitzungen oder CSRF.
**RISIKO** Das Themen-Skript in `layout.tsx` läuft inline; ein falscher Nonce
macht die Seite weiß. Anderes Teilsystem, andere Sprengweite als E05C —
deshalb getrennt.
**SCHEMA** keins. **RÜCKNAHME** Kopfzeile zurücksetzen, sofort wirksam.
**TESTS** Seite funktioniert ohne `unsafe-inline`; keine Konsolenfehler.

### E06 — Beobachtbarkeit · `ENT-B14`

**UMFANG** Anfrage-Kennung durchgängig; Logs in allen Server Actions und
Diensten; Fehlerpfade mit Fehlerart statt Fehlertext; Bereitstellungskennung.
**SICHERHEIT** Keine Geheimnisse, keine Antworten von Lernenden, keine
vollständigen Kennungen.
**TESTS** Eine Prüfung, die rot wird, wenn ein Serverpfad ohne Kennung
protokolliert.

### E07 — Auditgrundlage · `ENT-B06`

**UMFANG** `AuditEvent` samt **allen Schreibpunkten, die es zum Zeitpunkt
seiner Auslieferung gibt** — heute ist das genau einer: die Kontolöschung aus
E04C. Jede spätere Änderung bringt ihre eigenen Schreibpunkte mit und ändert
das Modell nicht (E08: Organisation angelegt/geändert; E09: Rollenwechsel;
E11: Zuweisung; E13: Organisation gelöscht).

**REIHENFOLGE** E07 steht deshalb **vor** E04C, nicht danach. Die vorige
Fassung verwies die Schreibpunkte auf E08/E09, die keine nannten, während
E04C bereits einen Auditeintrag verlangte und E07 sich zur Begründung auf
ebendiesen Eintrag berief — ein Ring. E04C kann keine Zeile schreiben, deren
Tabelle es noch nicht gibt.
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
  `ATTEMPT_RETENTION_DAYS`. Das ist der **einzige** Löschweg, und er ist
  keine Ausnahme vom Satz darüber, sondern dessen Grenze: „kein Änderungs-
  oder Löschpfad" meint den **fachlichen** Betrieb — keine Aktion, kein
  Formular, keine Route räumt einzelne Zeilen weg. Der Aufbewahrungslauf
  löscht ausschließlich nach Alter, nie nach Inhalt, und er kann keine
  einzelne Spur entfernen. Ohne diese Grenze stünden zwei Sätze
  nebeneinander, die sich widersprächen.

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

### E09A — Prüfstelle und Standardverweigerung · `ENT-B02` (Teil 1)

**UMFANG** **Eine** zentrale Autorisierungsprüfung; Standard verweigert;
`requireAdmin()` bekommt Aufrufer. Rollen bleiben vorerst `LEARNER`/`ADMIN`.
**SICHERHEIT** Organisationszugehörigkeit nie aus der Eingabe.
**SCHEMA** keins. **RÜCKNAHME** vollständig.
**TESTS** Tabellengetriebene Matrix über alle heutigen Rollen und Ressourcen.

### E09B — Rollen erweitern und Daten wandern · `ENT-B02` (Teil 2)

**UMFANG** Aufzählung um `PLATFORM_ADMIN`, `ORG_ADMIN`, `ORG_MANAGER`
erweitern; vorhandene `ADMIN`-Zeilen auf `PLATFORM_ADMIN` wandern. `ADMIN`
**bleibt** bestehen.

| Heute     | Künftig          | Behandlung                       |
| --------- | ---------------- | -------------------------------- |
| `LEARNER` | `LEARNER`        | unverändert                      |
| `ADMIN`   | `PLATFORM_ADMIN` | Datenwanderung in diesem Schritt |
| —         | `ORG_ADMIN`      | neu, nur über die Mitgliedschaft |
| —         | `ORG_MANAGER`    | neu, nur über die Mitgliedschaft |

`PLATFORM_ADMIN` steht am `User`, die beiden Organisationsrollen an der
`OrganizationMembership` — eine Person kann in einer Organisation leiten und
in einer anderen lernen.
**RÜCKNAHME** vollständig, solange `ADMIN` noch existiert. Genau dafür bleibt
der Wert stehen.
**TESTS** Migration gegen eine **befüllte** Kopie; jede bisherige
`ADMIN`-Zeile ist danach `PLATFORM_ADMIN`.

### E09C — Alten Rollenwert entfernen · `ENT-B02` (Teil 3)

**UMFANG** `ADMIN` aus der Aufzählung entfernen, nachdem E09B in Produktion
nachweislich gewandert ist.
**RÜCKNAHME** **Keine** ohne Datenverlust. Dies ist der Grund, warum die
Wanderung überhaupt in drei Schritte zerfällt: Eine
expand/migrate/contract-Wanderung ist ihrer Natur nach nicht ein
auslieferbares, rücknehmbares Stück. Die vorige Fassung führte sie als eine
Änderung und widersprach damit der eigenen Regel im Vorspann.
**TESTS** Kein Datensatz trägt mehr den alten Wert; Isolationssuite, die
fremden Zugriff in jeder Rollenkombination versucht.

### E10 — Sicherung, Wiederherstellung, Runbooks · `ENT-B11`, `ENT-B12`

**WARUM** Weder Verfahren noch Nachweis. Voraussetzung für den produktiven
Einsatz von E04C.
**UMFANG** Sicherungsplan; **belegte** Wiederherstellung in eine
Wegwerfdatenbank; Rücknahmegrenzen für Migrationen; Runbooks.
**FERTIG** Ein Wiederherstellungsprotokoll mit Datum liegt vor. Ohne Nachweis
bleibt das Tor offen.

### ERC-F — Abschluss des Fundaments

**WARUM** Mehrere Fundamenttore verlangen **erzeugte Belege**, nicht nur
grüne Prüfungen: Wiederherstellungsprotokoll, Prüfbericht,
Nebenläufigkeitsprotokoll, Laufprotokoll der Aufbewahrung, Isolationssuite.
Ohne einen eigenen Punkt hätte das Fundament niemanden, der sie einsammelt
und das Ziel für erreicht erklärt. Die vorige Fassung hatte nur einen
Freigabekandidaten, und der stand unter „Bezahlter Einsatz".
**UMFANG** Kein neuer Inhalt. Alle zwölf Fundamenttore nachweisen, Dokumente
gegen die Wirklichkeit prüfen, Abnahmesuite grün.
**FERTIG** `AIPFAD_ENTERPRISE_FOUNDATION_V1` ist erreicht oder es steht da,
welches Tor offen ist und warum.

---

# Bezahlter Einsatz

### E11A — Kohorten · `ENT-G01`

**UMFANG** `Cohort`, `CohortMembership`; Verwaltung innerhalb einer
Organisation.
**SCHEMA** zwei Tabellen, additiv. **RÜCKNAHME** vollständig, solange keine
Zuweisung daran hängt.
**TESTS** Eine Kohorte einer fremden Organisation ist nicht sichtbar.

### E11B — Kurszuweisung · `ENT-G02`

**UMFANG** `CourseAssignment` je Organisation oder Kohorte, mit Frist.
**NICHT-UMFANG** verändert **nicht**, welche Lektionen im Pfad stehen — eine
Zuweisung ordnet ein, sie kürzt nicht. Das ist dieselbe Regel, die für die
Einstufung gilt.
**TESTS** Eine Zuweisung ändert die Menge der Lektionen nachweislich nicht.

### E11C — Berichte für Führungskräfte · `ENT-G03`

**UMFANG** Fortschrittssicht je Kohorte.
**SICHERHEIT** Führungskräfte sehen **Fortschritt**, nicht einzelne
Antworten. Diese Grenze gehört in eine Prüfung, nicht nur in die Oberfläche.
**TESTS** Eine Prüfung, die rot wird, wenn eine Antwort in der
Führungskraft-Sicht auftaucht.

### E12 — OIDC · `ENT-G04`

Anbieterabstraktion, dann OIDC. SAML und SCIM bleiben `NACH_GA`.

### E13A — Organisation anlegen und stilllegen · `ENT-G05` (Teil 1)

**UMFANG** Anlegen, Stilllegen, Wiederaufnehmen. Eine stillgelegte
Organisation verliert den Zugang, behält die Daten.
**RÜCKNAHME** vollständig — das ist der Zweck der Stilllegung.

### E13B — Organisation löschen · `ENT-G05` (Teil 2)

**WARUM** Der destruktivste Vorgang des Programms; er verdient mehr als einen
Satz.
**UMFANG** Bestätigter Ablauf mit erneuter Anmeldung als Grenze;
**Trockenlauf zuerst**, der auflistet, was fallen würde; Auditeintrag, der die
Organisation überdauert.

**Was „samt Daten" heißt — und was nicht.** Das Datenmodell hält Lerndaten
**nutzereigen**; die Organisation sieht über die Mitgliedschaft, sie besitzt
nicht. Gelöscht werden deshalb `Organization`, `OrganizationMembership`,
`Cohort`, `CohortMembership` und `CourseAssignment`. **Nicht** gelöscht werden
`Attempt`, `ConceptMastery`, `LessonProgress`, `LearningPath` und
`ReviewQueueItem` der Mitglieder: Sie gehören den Personen, die nach dem Ende
der Organisation weiterlernen können. Wer sein Konto löschen will, nimmt
E04C. Ohne diese Festlegung bliebe offen, was das Löschen einer Organisation
löscht, die nichts besitzt.

**RÜCKNAHME** **Keine**, mit denselben Auflagen wie E04C: E10 ist
betriebliche Voraussetzung, Wiederherstellung geht allein über eine Sicherung.
**TESTS** Trockenlauf listet genau die fünf Tabellen; nach der Löschung ist
keine Lerndatenzeile eines Mitglieds verschwunden; der Auditeintrag steht noch.

### E14 — Kaufmännische Betriebsbereitschaft · `ENT-G06`

SLO, Supportweg, Eskalation, Ansprechbarkeit.

### ERC-GA — Abschluss des bezahlten Einsatzes

Kein neuer Inhalt. Die vier GA-Tore nachweisen, dazu die Fundamenttore
erneut, weil sie nicht verfallen dürfen.

---

# Lehrplan — eigener Arbeitsstrang

Getrennt vom Plattformstrang und nicht auf dessen kritischem Pfad.

| Gruppe | Inhalt                     | Didaktisch abhängig von  |
| ------ | -------------------------- | ------------------------ |
| C1     | 6 HTTP & APIs              | —                        |
| C2     | 7 AI-APIs & SDKs           | C1                       |
| C3     | 8 Structured Outputs/Tools | C2                       |
| C4     | 9 Embeddings-Tiefe, 10 RAG | Stufe 4 (fertig)         |
| C5     | 11 Agents, 12 MCP          | C3                       |
| C6     | 13 AI-Coding, 14 CI/CD     | Stufe 2 (fertig)         |
| C7     | 15 Evaluationen            | C4, C5                   |
| C8     | 16 AI-Sicherheit           | C5                       |
| C9     | 17 DACH-Governance         | —                        |
| C10    | 18 Production AI/LLMOps    | — (Umsetzung: Gateway)   |
| C11    | 3 AI/ML-Vertiefung         | Stufe 4 (fertig)         |
| C12    | 20 Enterprise AI           | C9                       |
| C13    | 19 Advanced                | — (LEHRPLAN nennt keine) |

**Sofort beginnbar: C1, C4, C6, C9, C11** — ihre Voraussetzungen sind
entweder gebaut oder es gibt keine. Die vorige Fassung führte C4 unter C3;
das war falsch, siehe Bestandsaufnahme M.

Für Stufe 17 gilt die Quellenpflicht aus `docs/CONTENT-POLICY.md`: aktuelle
Primärquellen zum Umsetzungszeitpunkt, kein Abschreiben von Rechtstexten,
keine erfundenen Fundstellen, und **FAKT**, **AUSLEGUNG** und
**HANDLUNGSEMPFEHLUNG** getrennt ausgewiesen.

---

# Plattformweites

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

Aus den Überschriften und Tabellen dieses Dokuments gezählt, nicht
fortgeschrieben. Die Zahlen sind gegenüber der vorigen Fassung gestiegen,
weil vier Änderungen nach ihrem Zweck aufgeteilt wurden (E01, E05C, E09,
E11, E13) und zwei Abschlusspunkte entstanden sind — nicht, weil Arbeit
hinzugekommen wäre.

| Größe                      | Wert | Herkunft                                                      |
| -------------------------- | ---- | ------------------------------------------------------------- |
| Fundamentblocker           | 15   | `ENT-B01`–`ENT-B15`                                           |
| GA-Zusatzblocker           | 6    | `ENT-G01`–`ENT-G06`                                           |
| Fundamentänderungen        | 21   | E01A–D, E02, E03, E04A–C, E05A–D, E06–E08, E09A–C, E10, ERC-F |
| GA-Änderungen              | 8    | E11A–C, E12, E13A–B, E14, ERC-GA                              |
| Plattformänderungen gesamt | 29   | 21 + 8                                                        |
| Lehrplangruppen            | 13   | C1–C13                                                        |
| Programmpunkte insgesamt   | 42   | 29 + 13                                                       |

Einundzwanzig Fundamentänderungen decken fünfzehn Blocker: `E10` schließt
zwei (`ENT-B11`, `ENT-B12`); `ENT-B02` und `ENT-B08` brauchen je mehrere
Schritte (E09A–C, E05C+E05D); und `E01A`, `E01C`, `E01D` sowie `ERC-F`
schließen keinen Blocker, sondern beseitigen Schulden, belegen eine Annahme
oder sammeln Belege ein.
