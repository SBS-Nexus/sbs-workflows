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

| Tor               | Kriterium                                                                                                                                                        | Beleg                                   | Blocker            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------ |
| PRODUKT           | Organisation, Mitgliedschaft und Rollen nutzbar                                                                                                                  | E2E je Rolle                            | B01, B02           |
| SICHERHEIT        | `UNABHÄNGIGE_SICHERHEITSPRÜFUNG = BESTANDEN`; Ratenzähler nachweislich über zwei unabhängige Verbindungen geteilt                                                | Prüfbericht + Nebenläufigkeitsprotokoll | B07, B08           |
| DATEN             | Aufbewahrung läuft; Auskunft und Löschung bedienbar; jeder zu diesem Zeitpunkt als prüfpflichtig eingestufte Vorgang schreibt sein Ereignis (Verzeichnis in E07) | Laufprotokoll + Integration             | B03, B04, B05, B06 |
| MANDANTEN         | Fremde Organisationsdaten auf keinem Weg lesbar                                                                                                                  | Isolationssuite                         | B01, B02           |
| AUTHENTIFIZIERUNG | Leerlauf-Ablauf, Sitzungsentzug, Passwort-Wiederherstellung                                                                                                      | Integration + E2E                       | B09, B10           |
| AUTORISIERUNG     | Vollständige Matrix, Standard verweigert                                                                                                                         | tabellengetriebene Prüfung              | B02                |
| BETRIEB           | Wiederherstellung belegt; Runbooks; Konfiguration bricht früh ab                                                                                                 | Wiederherstellungsprotokoll             | B11, B12, B13      |
| BEOBACHTBARKEIT   | Anfrage-Kennung auf allen Serverpfaden                                                                                                                           | Prüfung                                 | B14                |
| INHALTE           | Alle sieben Lab-Arten unter kanonischem Vertrag                                                                                                                  | `content:validate`                      | B15                |
| BARRIEREFREIHEIT  | axe ohne serious/critical                                                                                                                                        | CI                                      | —                  |
| TESTS             | Alle acht Prüfschritte aus `.github/workflows/aipfad-ci.yml` grün; Isolations- und Migrationssuite vorhanden                                                     | CI                                      | —                  |
| DOKUMENTATION     | Kein Dokument behauptet eine unwirksame Maßnahme                                                                                                                 | Prüfliste                               | —                  |

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
| `src/server/env.ts:6`           | „schlägt der Start fehl"                               | erst beim ersten Zugriff (siehe E02) |

**NICHT-UMFANG** Kein ausführbarer Code. Kommentare sind kein Verhalten — sie
ändern nichts, was eine Prüfung sehen könnte, und gehören deshalb hierher und
nicht in E01B.
**SCHEMA** keins. **RÜCKNAHME** trivial.
**FERTIG** Kein Verweis im Baum löst ins Leere, **und** kein Kommentar
behauptet eine Maßnahme, die es nicht gibt. Das Tor DOKUMENTATION wird
entsprechend auf „Dokument oder Kommentar" gelesen.

### E01B — Kanonische Inhaltsverträge · `ENT-B15`

**WARUM** `validateCourseGraph()` prüft Lab-Konfigurationen nur für
`MERGE_CONFLICT`, `BRANCH` und `GIT_STATE`. Vier von sieben Arten sind **nicht durch die Inhaltsprüfung beim Bauen
gedeckt** — sie haben heute nur ein Schema in der Maske, das erst beim
Anzeigen greift. „Ungeprüft" wäre falsch; die Bestandsaufnahme sagt das
unter L bereits richtig.
**UMFANG** Verträge für `TERMINAL`, `TOKENIZER`, `CONTEXT_WINDOW`,
`PROMPT_REPAIR`; Einbindung in `validateCourseGraph()`.
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

### E01D — CommandReference-Beispiele

**WARUM** Eigener Inhaltstyp mit eigenem Validator; in E01B wäre er ein
Fremdkörper, den dessen Fertigkriterium nicht abdeckt.
**UMFANG** Vertrag, der Beispiele gegen die beschriebenen Befehle hält.
**VERHALTEN** Ändert Verhalten wie E01B: Bisher durchgelassene Inhalte fallen
künftig durch.
**TESTS** Ein absichtlich widersprüchliches Beispiel wird rot.

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

Der Lauf trägt eine **Menge von Aufbewahrungsregeln**, je Datenart mit eigener
Frist und eigener Variable; `ATTEMPT_RETENTION_DAYS` ist die erste. Spätere
Änderungen melden ihre Frist hier an, statt einen zweiten Lauf zu bauen — E07
tut genau das für die Auditzeilen. Heute löscht `applyRetentionPolicy()` eine
einzige Tabelle nach einer einzigen Variablen (`session.ts:214`); der Rahmen
ist also neue Arbeit und gehört in diesen Umfang, nicht bloß in die
Beschreibung von E07.
**SICHERHEIT** Route nur mit geheimem Kopfzeilenwert.
**RÜCKNAHME** Cron leeren. Bereits gelöschte Daten kommen nicht zurück —
deshalb der Trockenlauf.
**TESTS** Zu alter Datensatz verschwindet, jüngerer bleibt; zweiter Lauf
ändert nichts; eine zweite angemeldete Regel läuft, ohne die erste zu
berühren.

### E04B — Datenauskunft · `ENT-B04`

**UMFANG** Selbstexport für die angemeldete Person; vollständiges
Verzeichnis der personenbezogenen Daten; festes Ausgabeschema.
**PERSONENBEZUG IST EINE ZWEITE ACHSE.** Der Lebenszyklus sagt, wann etwas
verschwindet; er sagt **nicht**, ob Personenbezug darin steckt. Beides sind
verschiedene Fragen, und der Export hängt an der zweiten:

| Klassifizierung                  | Bedeutung                                   | Heute darin                                                                           |
| -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `PERSONENBEZOGEN`                | gehört in den Selbstexport                  | die nutzereigenen Modelle; `AuditEvent`, soweit ein Akteursabdruck die Person benennt |
| `ANONYM`                         | kein Bezug herstellbar, gehört nicht hinein | `AnalyticsEvent`                                                                      |
| `BETRIEBLICH_OHNE_PERSONENBEZUG` | Technik, kein Bezug                         | Inhalte, betrieblicher Zustand                                                        |

`AuditEvent` zeigt, warum eine Achse nicht reicht: Es ist **plattformeigen**
(überdauert Konto und Organisation) und zugleich **personenbezogen**, sobald
der Abdruck eine Person benennt. Ein Export, der nur den Fremdschlüsseln auf
`User` folgt, übersieht es — genau dort hat `AuditEvent` keinen.

**UMFANG (Ergänzung)** Der Export enthält deshalb auch die `AuditEvent`-Zeilen,
deren Akteursabdruck die anfragende Person benennt.

**NICHT-UMFANG** **Keine** `AnalyticsEvent`-Zeilen. Sie sind ohne
Personenbezug erhoben; sie einer Person zuzuordnen — etwa über zeitliche
Nähe — wäre genau die Verknüpfung, die das Modell vermeidet.
**SICHERHEIT** Nur die eigene Sitzung, niemals eine Kennung aus der Eingabe.
**AUDIT** Ein gelungener Export schreibt `PERSONAL_DATA_EXPORTED` (Modell aus
E07). Wer die Daten einer Person herausgibt, hinterlässt eine Spur — das ist
der Sinn des Verzeichnisses.
**RÜCKNAHME** Die Fähigkeit ja, die geschriebenen Auditzeilen nicht.
**TESTS** Der Export enthält jedes als `PERSONENBEZOGEN` geführte Modell,
`AuditEvent` eingeschlossen. Die Gegenprüfung läuft gegen das
**Klassifizierungsverzeichnis**, nicht gegen die Fremdschlüssel: Ein neues
dauerhaftes Modell muss entweder erklären, wie es im Selbstexport vorkommt,
oder warum es nicht hineingehört — sonst schlägt die Vollständigkeitsprüfung
fehl. Der Vorgang schreibt sein Ereignis.

### E04C — Kontolöschung · `ENT-B05`

**UMFANG** Bestätigter, destruktiver Ablauf mit erneuter Anmeldung als
Grenze; Kaskadenprüfung.
**AUDIT** Schreibt `ACCOUNT_DELETED` (Modell aus E07). Der Eintrag überdauert das Konto ausdrücklich; dafür steht der
Akteursbezug ohne Kaskade.
**RÜCKNAHME** **Keine.** Diese Änderung ist im Betrieb nicht rücknehmbar;
zurücknehmen lässt sich nur der Zugang zur Funktion, nicht ihre Wirkung.
Wiederherstellung ist ausschließlich über eine Sicherung möglich — was E10
zur Voraussetzung für den produktiven Einsatz dieser Funktion macht.
**WAS GELÖSCHT WIRD — UND WAS NICHT.** Die vorige Fassung sagte in einem
Satz, es bleibe „in keiner Tabelle eine Zeile der Person" und „der
Auditeintrag überlebt sie". Beides zugleich geht nicht: Der Eintrag trägt eine
Akteurskennung, ist also eine Zeile über die Person.

Gelöscht werden das Konto und jedes **nutzereigene** Modell.
**Organisationseigene** Zeilen richten sich nach ihrer eigenen Beziehung —
eine Mitgliedschaft endet mit dem Konto, die Organisation selbst nicht.
**Plattformeigene** Zeilen bleiben: `AuditEvent` behält den minimalen
Akteursabdruck, den die Prüfregel verlangt, und verfällt allein über seine
eigene Frist aus E07.

Deshalb steht hier **nicht** „alle personenbezogenen Daten sind gelöscht".
Das wäre eine stärkere Aussage, als der Ablauf einlöst, und dieses Dokument
trifft keine rechtliche Einordnung — es beschreibt das technische Verhalten.

**TESTS** Die Nutzerzeile ist fort; jedes nutzereigene Modell hat keine Zeile
dieser Person mehr; organisationseigene Zeilen sind nach ihrer eigenen
Beziehung behandelt; die Auditzeilen, die überdauern sollen, sind da; ihre
Felder entsprechen der Sparsamkeitsregel aus E07.

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

**SCHEMA** keins in diesem Schritt. `AuthSession.csrfSecret` ist
`String NOT NULL` (`schema.prisma:217`) und wird bei jeder Anmeldung
geschrieben; die Spalte **bleibt** hier stehen und wird nur nicht mehr
gelesen.
**RÜCKNAHME** vollständig.
**NICHT-UMFANG** Das Entfernen der Spalte. Das ist eine
expand/migrate/contract-Wanderung und damit dieselbe Form wie beim
Rollenwert — sie steht als E05E. Sie hier mitzuführen hieße, die Regel, die
E09A–C begründet, für dieselbe Sache zu brechen.
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

### E05E — `csrfSecret`-Spalte entfernen · `ENT-B08` (Teil 3)

**WARUM** Erst nachdem E05C in Produktion nachweislich nichts mehr liest.
**UMFANG** Spalte nullbar machen, dann entfernen.
**RÜCKNAHME** **Keine** ohne Datenverlust — wie E09C. Deshalb eigener
Schritt statt Anhängsel.
**TESTS** Kein Pfad liest das Feld mehr; Migration gegen eine befüllte Kopie.

### E06 — Beobachtbarkeit · `ENT-B14`

**UMFANG** Anfrage-Kennung durchgängig; Logs in allen Server Actions und
Diensten; Fehlerpfade mit Fehlerart statt Fehlertext; Bereitstellungskennung.
**SICHERHEIT** Keine Geheimnisse, keine Antworten von Lernenden, keine
vollständigen Kennungen.
**TESTS** Eine Prüfung, die rot wird, wenn ein Serverpfad ohne Kennung
protokolliert.

### E07 — Auditgrundlage · `ENT-B06`

**UMFANG** Die Grundlage, nicht die Ereignisse: `AuditEvent` als Modell, eine
Anwendungsschnittstelle mit ausschließlich Anlegen und Lesen, die feste
Gestalt der Vorgangsbezeichnungen und Metadaten, die Schwärzungsregel, die
Abbildsemantik für Akteur und Organisation, der Aufbewahrungsvertrag und die
Prüfungen des Dienstes selbst.

**KEINE ERZEUGER BEI AUSLIEFERUNG.** Zum Zeitpunkt von E07 gibt es **null**
fachliche Ereigniserzeuger, und das ist richtig so. Die vorige Fassung sagte,
E07 bringe „alle Schreibpunkte, die es zu seiner Auslieferung gibt — heute
genau einer: die Kontolöschung aus E04C" und ordnete E07 zugleich **vor**
E04C ein. Zu diesem Zeitpunkt ist die Menge leer; das genannte Mitglied kann
ihr nicht angehören. Der Ring war kleiner als der davor, aber es war einer.

**REGEL FÜR ALLE SPÄTEREN ÄNDERUNGEN.** Wer einen prüfpflichtigen Vorgang
einführt, bringt dessen Ereigniserzeuger **in derselben Änderung** mit. Nicht
E07 liefert sie nach, und keine Änderung verweist sie an eine andere:

**Verzeichnis der prüfpflichtigen Vorgänge.** Diese Liste ist maßgeblich und
sagt zugleich, was das Tor DATEN meint. Die Namen sind Planungsbezeichnungen;
die Umsetzung darf sie schärfen, ohne die Zusage zu ändern.

Fundament:

| Vorgang                            | Eigentümer |
| ---------------------------------- | ---------- |
| `PERSONAL_DATA_EXPORTED`           | E04B       |
| `ACCOUNT_DELETED`                  | E04C       |
| `ORGANIZATION_CREATED`             | E08B       |
| `ORGANIZATION_UPDATED`             | E08B       |
| `ORGANIZATION_MEMBER_ADDED`        | E08B       |
| `ORGANIZATION_MEMBER_REMOVED`      | E08B       |
| `ORGANIZATION_MEMBER_ROLE_CHANGED` | E08B       |
| `PLATFORM_ROLE_MIGRATED`           | E09B       |

Bezahlter Einsatz:

| Vorgang                      | Eigentümer |
| ---------------------------- | ---------- |
| `COHORT_CREATED`             | E11A       |
| `COHORT_UPDATED`             | E11A       |
| `COHORT_DELETED`             | E11A       |
| `COURSE_ASSIGNMENT_CREATED`  | E11B       |
| `COURSE_ASSIGNMENT_REMOVED`  | E11B       |
| `OIDC_CONFIGURATION_CHANGED` | E12        |
| `ORGANIZATION_SUSPENDED`     | E13A       |
| `ORGANIZATION_REACTIVATED`   | E13A       |
| `ORGANIZATION_DELETED`       | E13B       |

Hier steht **kein** Vorgang, den kein Punkt liefert. Die vorige Fassung
führte E04B, E11A und E12 gar nicht auf, obwohl die Bestandsaufnahme Export
und SSO-Konfiguration ausdrücklich als prüfpflichtig nennt.

**SCHEMA** eine Tabelle, additiv. **RÜCKNAHME** Tabelle bleibt ungenutzt
liegen; geschriebene Zeilen gehen nicht verloren.

**AUFBEWAHRUNG — Reihenfolge ausdrücklich.** E04A baut den geplanten Lauf als
**Rahmen** mit je Datenart eigener Frist. E07 **meldet die Auditfrist in
diesen Rahmen an**; vorher gibt es die Tabelle nicht, auf der ein Durchgang
arbeiten könnte. E04A kann also nicht behaupten, Auditzeilen zu löschen,
solange E07 nicht da ist — und E07 hat trotzdem einen Ausführenden, statt
einer Frist ohne Lauf, wie `ENT-B03` sie festhält.

**REIHENFOLGE** E07 vor E04C. E04C kann keine Zeile schreiben, deren Tabelle
es noch nicht gibt; E07 kann dafür bei seiner Auslieferung leer bleiben.
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

**UMFANG** `Organization`, `OrganizationMembership` samt der **eigenen**
Aufzählung `OrganizationRole` (zunächst nur `ORG_ADMIN`). Bestandsnutzende
bleiben **ohne** Organisation gültig.

Die Mitgliedsrolle ist bewusst eine andere Aufzählung als `Role` am `User`:
Die eine sagt, was jemand auf der Plattform ist, die andere, was jemand in
einer bestimmten Organisation ist. Sie hier anzulegen hält E08B unabhängig
von der Rollenwanderung in E09B — sonst müsste E08B eine Rolle setzen, die
es zu seinem Zeitpunkt noch nicht gibt.
**NICHT-UMFANG** kein `tenantId` an Lerntabellen.
**MIGRATION** rein additiv, keine Rückfüllung.
**TESTS** Migration auf einer Kopie mit Bestandsdaten; niemand verliert
Zugang.

### E08B — Organisation und Mitglieder verwalten · `ENT-B01` (Teil 2)

**WARUM** E08 legt zwei Tabellen an und sonst nichts. Ohne eine Stelle, an
der eine Organisation entsteht und Mitglieder hinzukommen, ist das Modell
unbenutzbar — und die beiden Fundamenttore PRODUKT („nutzbar", „E2E je
Rolle") und MANDANTEN („Isolationssuite") wären nicht erfüllbar: Es gäbe
keinen organisationsbezogenen Lesepfad, den eine Isolationsprüfung angreifen
könnte. Die vorige Fassung führte „Adminbetrieb" und „Unternehmensabläufe"
in der Bestandsaufnahme als `FEHLT`, gab ihnen aber weder Kennung noch
Änderung; damit verlangte kein Blocker, was das Tor voraussetzt.

**UMFANG** Organisation anlegen; Organisation bearbeiten (Name,
Einstellungen); Mitglied hinzufügen und entfernen; Mitgliederliste; Rolle
innerhalb der Organisation setzen.

Das Bearbeiten fehlte hier, während E07 und dieser Punkt bereits einen
Erzeuger für die geänderte Organisation führten — ein Ereignis ohne Vorgang,
das nach dem eigenen Fertigkriterium (je Vorgang gelingt der Vorgang und das
Ereignis liegt vor) gar nicht prüfbar wäre. Der Name des Punktes sagt
verwalten; Bearbeiten gehört dazu. Hier entstehen zugleich die ersten
wirklichen Aufrufer der Prüfstelle aus E09A.
**NICHT-UMFANG** Kohorten, Zuweisung, Berichte — alles GA (E11A–C).
**SICHERHEIT** Jede Ansicht ist organisationsbezogen; die Zugehörigkeit
kommt aus der Mitgliedschaft, nie aus der Eingabe.
**ABHÄNGIGKEIT** Nach E08 (Modell samt `OrganizationRole`) und E09A
(Prüfstelle); steht deshalb im Ablauf hinter beiden, obwohl die Nummer es
anders nahelegt. **Nicht** nach E09B: Die Rollenwanderung betrifft `Role` am
`User`, nicht die Mitgliedsrolle.
**AUDIT** Jeder verändernde Vorgang hier bringt seinen eigenen
Ereigniserzeuger mit (Modell aus E07): Organisation angelegt, Organisation
geändert, Mitglied hinzugefügt, Mitglied entfernt, Rolle gesetzt. E08 kann das
nicht tragen — dort gibt es nur Tabellen und keine Vorgänge.

**RÜCKNAHME** Die Fähigkeit lässt sich zurücknehmen; die **Geschichte nicht**.
Es entstehen Zeilen in den beiden neuen Tabellen **und** anfügende
Auditzeilen, und die bleiben nach der Rücknahme stehen — sie unterliegen
allein der Aufbewahrungsfrist aus E07. Die vorige Fassung sagte „es entstehen
nur Zeilen in den beiden neuen Tabellen"; das schloss gerade die Zeilen aus,
die das Fundamenttor DATEN verlangt.

**TESTS** Je Vorgang: Der Vorgang gelingt, das erwartete Ereignis liegt vor,
es trägt die vorgesehenen Abbildfelder, und es enthält weder eine
Lernendenantwort noch ein Geheimnis.
**TESTS (Zugang)** E2E je Rolle; Isolationssuite, die aus einer Organisation
heraus jede Ressource einer fremden zu lesen versucht.

### E09A — Prüfstelle und Standardverweigerung · `ENT-B02` (Teil 1)

**UMFANG** **Eine** zentrale Autorisierungsprüfung; Standard verweigert;
`requireAdmin()` bekommt Aufrufer.

**Zwei Achsen, nicht eine.** „Rollen bleiben vorerst `LEARNER`/`ADMIN`" wäre
missverständlich und stand so in der vorigen Fassung: Gemeint ist allein
`User.role` — der bleibt bis E09B bei `LEARNER`/`ADMIN`. Die Prüfstelle muss
aber von Anfang an **beides** auswerten:

1. die Plattformrolle am `User` (`LEARNER`/`ADMIN`, ab E09B `PLATFORM_ADMIN`),
2. die Organisationsrolle an der `OrganizationMembership`
   (`OrganizationRole.ORG_ADMIN`, angelegt in E08).

E08 landet vor E09A; die zweite Achse existiert also bereits, wenn die
Prüfstelle gebaut wird. Eine Prüfstelle, die nur `User.role` kennt, könnte
E08B gar nicht tragen — dort wird eine Organisationsrolle gesetzt und
ausgewertet.

**Standard verweigert**, und die Organisation wird aus der maßgeblichen
Mitgliedschaft beziehungsweise der Ressource aufgelöst — **nie** aus einer
Angabe der aufrufenden Seite. `ORG_MANAGER` kommt hier nicht vor; die Rolle
entsteht mit E11C, wo sie Verhalten bekommt.
**SICHERHEIT** Organisationszugehörigkeit nie aus der Eingabe.
**SCHEMA** keins. **RÜCKNAHME** vollständig.
**TESTS** Tabellengetriebene Matrix über alle heutigen Rollen und Ressourcen.

### E09B — Rollen erweitern und Daten wandern · `ENT-B02` (Teil 2)

**UMFANG** `Role` um `PLATFORM_ADMIN` erweitern; vorhandene `ADMIN`-Zeilen
darauf wandern. `ORG_ADMIN` gehört nicht hierher — es steht an der
Mitgliedschaft und kommt mit E08. `ADMIN`
**bleibt** bestehen.

| Heute     | Künftig          | Behandlung                           |
| --------- | ---------------- | ------------------------------------ |
| `LEARNER` | `LEARNER`        | unverändert                          |
| `ADMIN`   | `PLATFORM_ADMIN` | Datenwanderung in diesem Schritt     |
| —         | `ORG_ADMIN`      | nicht hier — `OrganizationRole`, E08 |

`ORG_MANAGER` kommt bewusst **nicht** hier, sondern mit E11C: Die Rolle
steuert allein Berichte, und die sind GA. Sie im Fundament einzuführen hieße,
eine Rolle ohne jedes Verhalten auszuliefern — genau der Zustand, den die
Bestandsaufnahme an `ADMIN` bemängelt.

`PLATFORM_ADMIN` steht am `User`, `ORG_ADMIN` an der
`OrganizationMembership` — eine Person kann in einer Organisation leiten und
in einer anderen lernen.
**AUDIT** Bringt seinen Erzeuger mit (Modell aus E07): Rollenwanderung je
Datensatz.
**RÜCKNAHME** Die Fähigkeit vollständig, solange `ADMIN` noch existiert —
genau dafür bleibt der Wert stehen. Die **Geschichte nicht**: Geschriebene
Auditzeilen bleiben stehen und verfallen allein über die Frist aus E07.
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
**SCHEMA** zwei Tabellen, additiv.
**AUDIT** Jede Veränderung an einer Kohorte schreibt ihr Ereignis (Modell aus
E07): `COHORT_CREATED`, `COHORT_UPDATED`, `COHORT_DELETED`.
**RÜCKNAHME** Die Fähigkeit vollständig, solange keine Zuweisung daran hängt —
die **Geschichte nicht**: Geschriebene Auditzeilen bleiben stehen und
verfallen allein über die Frist aus E07.
**TESTS** Eine Kohorte einer fremden Organisation ist nicht sichtbar; je
Vorgang liegt das erwartete Ereignis vor.

### E11B — Kurszuweisung · `ENT-G02`

**UMFANG** `CourseAssignment` je Organisation oder Kohorte, mit Frist.
**NICHT-UMFANG** verändert **nicht**, welche Lektionen im Pfad stehen — eine
Zuweisung ordnet ein, sie kürzt nicht. Das ist dieselbe Regel, die für die
Einstufung gilt.
**AUDIT** Bringt seinen Erzeuger mit (Modell aus E07): Zuweisung erteilt,
Zuweisung entzogen.
**RÜCKNAHME** Die Fähigkeit ja, die geschriebenen Auditzeilen nicht.
**TESTS** Eine Zuweisung ändert die Menge der Lektionen nachweislich nicht;
je Vorgang liegt das erwartete Ereignis vor.

### E11C — Berichte für Führungskräfte · `ENT-G03`

**UMFANG** Fortschrittssicht je Kohorte; führt zugleich die Rolle
`ORG_MANAGER` ein — hier bekommt sie ihr erstes Verhalten.
**SICHERHEIT** Führungskräfte sehen **Fortschritt**, nicht einzelne
Antworten. Diese Grenze gehört in eine Prüfung, nicht nur in die Oberfläche.
**TESTS** Eine Prüfung, die rot wird, wenn eine Antwort in der
Führungskraft-Sicht auftaucht.

### E12 — OIDC · `ENT-G04`

**UMFANG** Anbieterabstraktion, dann OIDC. SAML und SCIM bleiben `NACH_GA`.
**AUDIT** Jede Änderung an der Anmeldekonfiguration schreibt
`OIDC_CONFIGURATION_CHANGED` (Modell aus E07). Wer bestimmt, wodurch sich
jemand ausweist, verändert die Sicherheitsgrenze der ganzen Organisation.
**RÜCKNAHME** Die Konfiguration lässt sich zurücknehmen; die Auditzeilen
darüber nicht.

### E13A — Organisation stilllegen und wiederaufnehmen · `ENT-G05` (Teil 1)

**UMFANG** Stilllegen, Wiederaufnehmen. Das **Anlegen** liefert bereits E08B
im Fundament; es hier zu wiederholen verstieße gegen „kein Punkt steht in
beiden Spalten“. Eine stillgelegte
Organisation verliert den Zugang, behält die Daten.
**AUDIT** Bringt seinen Erzeuger mit (Modell aus E07): Organisation
stillgelegt, Organisation wiederaufgenommen.
**RÜCKNAHME** Die Stilllegung ist vollständig umkehrbar — das ist ihr Zweck.
Die Auditzeilen darüber sind es nicht; sie bleiben und verfallen allein über
die Frist aus E07.

### E13B — Organisation löschen · `ENT-G05` (Teil 2)

**WARUM** Der destruktivste Vorgang des Programms; er verdient mehr als einen
Satz.
**UMFANG** Bestätigter Ablauf mit erneuter Anmeldung als Grenze;
**Trockenlauf zuerst**, der auflistet, was fallen würde.
**AUDIT** Schreibt `ORGANIZATION_DELETED` (Modell aus E07). Der Eintrag
überdauert die Organisation; dafür steht der Organisationsbezug ohne Kaskade,
mit `organizationLabel` als lesbarem Rest.

**Was „samt Daten" heißt — und was nicht.** Maßgeblich ist die
**Eigentumsklasse**, nicht das Vorhandensein eines Fremdschlüssels.

Gelöscht werden die **organisationseigenen** Modelle: `Organization`,
`OrganizationMembership`, `Cohort`, `CohortMembership`, `CourseAssignment`.
Dass `OrganizationMembership` und `CohortMembership` auf `User` verweisen,
ändert daran nichts — sie beschreiben eine Zugehörigkeit zur Organisation und
enden mit ihr.

Nicht gelöscht werden die **nutzereigenen** Modelle und das Konto selbst —
sie gehören den Personen, die nach dem Ende der Organisation weiterlernen.

Ebenfalls nicht gelöscht werden die **plattformeigenen** Modelle. Sie folgen
weder dem Konto noch der Organisation, sondern je eigener Regel: `AuditEvent`
seiner Aufbewahrungsfrist aus E07 — gerade der Eintrag über diese Löschung
soll sie ja überdauern —, `AnalyticsEvent` seiner eigenen, die Inhalte gar
keiner.

**Warum nicht am Fremdschlüssel entlang.** Die vorige Fassung wollte die
Prüfung künftigssicher machen und schrieb: Sie liest die nutzerbezogenen
Modelle aus dem Schema. Das wäre falsch geworden, sobald E08 und E11A
`OrganizationMembership` und `CohortMembership` anlegen — beide verweisen auf
`User` und müssten nach dieser Regel überleben, obwohl sie mit der
Organisation fallen sollen. Ein Merkmal, das beide Klassen tragen, kann sie
nicht trennen.

Wer sein Konto löschen will, nimmt E04C; dort fällt die nutzereigene Menge
**absichtlich**.

**RÜCKNAHME** **Keine**, mit denselben Auflagen wie E04C: E10 ist
betriebliche Voraussetzung, Wiederherstellung geht allein über eine Sicherung.
**TESTS** Trockenlauf listet genau die organisationseigenen Modelle. Nach der
Löschung stehen Konto, jedes nutzereigene und jedes plattformeigene Modell
unverändert — letztere, sofern nicht ihre eigene Regel etwas anderes sagt.

Die Prüfung stützt sich dabei **nicht** auf eine von Hand gepflegte Liste,
sondern auf das **Lebenszyklusverzeichnis**: die ausdrückliche Zuordnung jedes
Modells zu `NUTZEREIGEN`, `ORGANISATIONSEIGEN` oder `PLATTFORMEIGEN`. Die
Prüfung liest das Verzeichnis und verlangt, dass jedes dauerhafte Modell
**genau eine** Klasse trägt — ein neues ohne Zuordnung lässt sie scheitern.

Das schließt beide Fehler aus: Lerndaten verschwinden nicht nebenbei, und eine
Mitgliedschaft überlebt nicht bloß deshalb, weil sie auf `User` verweist.

Nicht zu verwechseln mit E04C: Dort kaskadiert dieselbe Menge **absichtlich**
weg, weil die Person es verlangt.

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

**Sofort beginnbar: C1, C4, C6, C9, C11, C13** — ihre Voraussetzungen sind
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
AuditEvent(id, organizationId?, organizationLabel, actorUserId?, actorLabel,
           action, targetType, targetId?, metadata Json, occurredAt)
```

**Sparsamkeit des Abdrucks — von der Umsetzung festzulegen.** Weil diese
Zeilen Konto- und Organisationslöschung überdauern, legt E07 bei der Umsetzung
fest: welche Akteurskennung bleibt, ob ein lesbarer Name überhaupt nötig ist,
dass eine E-Mail-Adresse ohne ausdrückliche Begründung **nicht** hineingehört,
welche Organisationsfelder bleiben, dass weder Lernendenantworten noch
Geheimnisse hineinkommen, und welche Frist gilt. Die unten genannten Felder
sind **Entwurfsbegriffe**; die Umsetzung wählt die kleinste Menge, die die
Prüfregel trägt. Dieses Dokument trifft dazu keine rechtliche Einordnung und
behauptet keine Anonymisierung, die es nicht gibt.

`actorUserId` **und** `organizationId` stehen bewusst **ohne** Kaskade;
`actorLabel` und `organizationLabel` halten den Bezug fest, wenn Konto oder
Organisation später gelöscht werden. Jede andere Beziehung auf `User` im
heutigen Schema kaskadiert — ohne diesen ausdrücklichen Satz entstünde die
Spur nach dem Hausmuster und verschwände mit dem, was sie belegen soll.
E13B verlangt genau das in seiner Prüfung.

**Lebenszyklus — drei Klassen, ausdrücklich geführt.**

Zwei Klassen genügten nicht. `AuditEvent` soll Konto- **und**
Organisationslöschung überdauern; es kann also weder das eine noch das andere
sein. Dasselbe gilt für die Inhalte (`Course`, `Lesson`, `Exercise`,
`Concept`, `Lab` …), für `AnalyticsEvent` und für betrieblichen Zustand wie
die Zählertabelle aus E03.

| Klasse               | Lebenszyklus                                  | Heute darin                                                                                                                                                                     |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NUTZEREIGEN`        | folgt dem Konto                               | `User` selbst, `AuthSession`, `LearningPath`, `Attempt`, `ConceptMastery`, `LessonProgress`, `LearningSession`, `ReviewQueueItem`, `MilestoneAward`, `LabAttempt`, `HintReveal` |
| `ORGANISATIONSEIGEN` | folgt der Organisation                        | `Organization`, `OrganizationMembership`, `Cohort`, `CohortMembership`, `CourseAssignment`                                                                                      |
| `PLATTFORMEIGEN`     | unabhängig von beiden, eigene Regel je Modell | `AuditEvent` (eigene Aufbewahrungsfrist), `AnalyticsEvent`, Inhalte, betrieblicher Zustand                                                                                      |

Die Klasse wird **erklärt**, nicht abgeleitet — weder aus `userId` noch aus
`organizationId` noch aus irgendeinem Fremdschlüssel. `OrganizationMembership`
verweist auf `User` und ist organisationseigen; `AuditEvent` trägt eine
Akteurskennung und ist plattformeigen. Kein Merkmal des Schemas trennt die
drei.

**Vertrag.** Jedes dauerhafte Modell, das für Löschung oder Aufbewahrung
zählt, trägt **genau eine** dieser Klassen. Es gibt **keinen Standardwert**.
Ein neues Modell ohne Klasse lässt die Lebenszyklusprüfung scheitern, statt
stillschweigend irgendwo einsortiert zu werden. Die Organisation
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
fortgeschrieben. Die Zahlen sind gegenüber der ersten Fassung gestiegen, weil
Änderungen nach ihrem Zweck aufgeteilt wurden (E01, E05, E09, E11, E13) und
weil zwei Lücken einen eigenen Punkt bekommen haben — E08B für die
Organisationsverwaltung und E05E für die unumkehrbare Spaltenentfernung.
Nicht, weil Arbeit hinzugekommen wäre.

| Größe                      | Wert | Herkunft                                                                  |
| -------------------------- | ---- | ------------------------------------------------------------------------- |
| Fundamentblocker           | 15   | `ENT-B01`–`ENT-B15`                                                       |
| GA-Zusatzblocker           | 6    | `ENT-G01`–`ENT-G06`                                                       |
| Fundamentänderungen        | 23   | E01A–D, E02, E03, E04A–C, E05A–E, E06, E07, E08, E08B, E09A–C, E10, ERC-F |
| GA-Änderungen              | 8    | E11A–C, E12, E13A–B, E14, ERC-GA                                          |
| Plattformänderungen gesamt | 31   | 23 + 8                                                                    |
| Lehrplangruppen            | 13   | C1–C13                                                                    |
| Programmpunkte insgesamt   | 44   | 31 + 13                                                                   |

Dreiundzwanzig Fundamentänderungen decken fünfzehn Blocker: `E10` schließt
zwei (`ENT-B11`, `ENT-B12`); `ENT-B01`, `ENT-B02` und `ENT-B08` brauchen je
mehrere Schritte (E08+E08B, E09A–C, E05C+E05D+E05E); und `E01A`, `E01C`,
`E01D` sowie `ERC-F` schließen keinen Blocker, sondern beseitigen Schulden,
belegen eine Annahme oder sammeln Belege ein.
