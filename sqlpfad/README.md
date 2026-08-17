# SQLPfad

**SQL verstehen. Abfragen schreiben. Daten wirklich nutzen.**

Eine interaktive Lernplattform, mit der deutschsprachige Erwachsene ohne
Vorkenntnisse SQL lernen – T-SQL auf Microsoft SQL Server. Kein Videokurs und
keine Sammlung von Textlektionen: Jede Lektion beginnt mit einer Frage an
echte Daten, die Tabellen stehen daneben, und das Ergebnis wird erst
vorhergesagt und dann geprüft.

Schwesteranwendung von [PythonPfad](../pythonpfad) – gleiche Produktfamilie,
gleiches Lernmodell, gleiche Gestaltung, andere Sprache und deshalb eine
grundlegend andere Architektur der Codeausführung.

---

## Inhalt

1. [Produktüberblick](#1-produktüberblick)
2. [Voraussetzungen](#2-voraussetzungen)
3. [Installation](#3-installation)
4. [Umgebungsvariablen](#4-umgebungsvariablen)
5. [Datenbank starten](#5-datenbank-starten)
6. [Migrationen und Seed](#6-migrationen-und-seed)
7. [Entwicklungsserver](#7-entwicklungsserver)
8. [Tests](#8-tests)
9. [Produktionsbuild](#9-produktionsbuild)
10. [Architektur](#10-architektur)
11. [SQL-Ausführung](#11-sql-ausführung)
12. [Inhalte pflegen](#12-inhalte-pflegen)
13. [Sicherheitsgrenzen](#13-sicherheitsgrenzen)
14. [Auslieferung auf Vercel](#14-auslieferung-auf-vercel)
15. [Was diese Fassung noch nicht kann](#15-was-diese-fassung-noch-nicht-kann)
16. [Wiederholen](#16-wiederholen)
17. [Redaktionsbereich](#17-redaktionsbereich)
18. [Eigene Domain über Strato](#18-eigene-domain-über-strato)

---

## 1. Produktüberblick

### Der Lehrplan

Vier Module, 15 Lektionen, 64 Aufgaben, 31 Konzepte, 4 Projekte.

| Modul                      | Lektionen | Worum es geht                                               |
| -------------------------- | --------- | ----------------------------------------------------------- |
| 1 Tabellen und Daten       | 4         | Tabelle, Zeile, Spalte, Datentypen, NULL, Schlüssel         |
| 2 Abfragen                 | 4         | SELECT, WHERE, Sortieren, Ausdrücke, Textsuche              |
| 3 Verbinden und Gruppieren | 4         | INNER und LEFT JOIN, Aggregate, GROUP BY, HAVING            |
| 4 Ändern und Struktur      | 3         | INSERT, UPDATE, DELETE, Transaktionen, DDL, Einschränkungen |

Alle Inhalte liegen als versionierte TypeScript-Dateien unter `src/content`.
Die Datenbank ist die Kopie, nicht die Quelle – siehe
[Inhalte pflegen](#12-inhalte-pflegen).

### Wie eine Lektion aufgebaut ist

1. **Eine Leitfrage** an die Daten, kein Syntaxthema. „Welcher Auftrag gehört
   zu welcher Kundin – wenn dort nur eine Nummer steht?"
2. **Der Erklärtext**, links, mit den Tabellen des Übungsdatensatzes rechts
   daneben im Schema-Explorer.
3. **Vier Aufgaben** verschiedener Art: erkennen, vorhersagen, ergänzen,
   selbst schreiben, einen Fehler erklären.

### Aufgabenarten

| Art                                                  | Bewertung                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Einfach-/Mehrfachauswahl                             | vollständig, ohne Datenbank                                  |
| Reihenfolge                                          | vollständig, ohne Datenbank                                  |
| Ergebnis vorhersagen                                 | Zeilenzahl geprüft, danach das echte Ergebnis daneben        |
| Freitext, Fehler erklären                            | kein maschinelles Urteil – Musterantwort zum Selbstvergleich |
| Abfrage schreiben, ergänzen, Fehler finden, Transfer | Policy geprüft; das Ergebnis braucht den Übungsserver        |

Warum ein Teil davon absichtlich **nicht** maschinell bewertet wird, steht in
[SQL-Ausführung](#11-sql-ausführung).

### Was es bewusst nicht gibt

Keine Punkte, keine Ranglisten, keine Serien, die reißen können, keine
Druckmeldungen. Eine leere Wiederholungsseite ist kein Rückstand und sagt das
auch. Wer aufhört, verliert nichts.

Die Lernzeit wird gemessen, aber nicht als Ziel gesetzt: Sie zählt **ab der
letzten Aktivität**, nicht ab dem Seitenaufruf, und eine offen liegende Seite
zählt nicht mit. Wer eine Lektion öffnet und drei Stunden später wiederkommt,
hat nicht drei Stunden gelernt.

---

## 2. Voraussetzungen

- **Node.js 22** oder neuer. Nicht nur eine Empfehlung: `tedious` (der
  SQL-Server-Treiber) und mehrere Prisma-Pakete verlangen es ausdrücklich.
  Unter Node 20 meldet `npm install` das als `EBADENGINE` und macht trotzdem
  weiter — die Folgen zeigen sich dann an anderer Stelle.
- **Docker** für die Plattformdatenbank (PostgreSQL 16) und – optional – für
  einen SQL Server zum Ausführen der Integrationstests
- Für die Oberfläche wird **kein** SQL Server gebraucht. Ohne ihn sind alle
  Seiten bedienbar; die Anwendung sagt an den betroffenen Stellen, dass
  Abfragen nicht ausgeführt werden.

---

## 3. Installation

```bash
git clone <repository>
cd sqlpfad
npm install
cp .env.example .env
```

Danach `.env` ausfüllen – mindestens `AUTH_SECRET`.

---

## 4. Umgebungsvariablen

Alle Werte werden beim Start gegen `src/server/env.ts` geprüft. Fehlt etwas
oder ist es unplausibel, bricht die Anwendung mit einer verständlichen Meldung
ab, statt später mit einem schwer zuzuordnenden Laufzeitfehler.

| Variable                 | Pflicht | Bedeutung                                              |
| ------------------------ | ------- | ------------------------------------------------------ |
| `DATABASE_URL`           | ja      | PostgreSQL – Konten, Fortschritt, Inhalte              |
| `AUTH_SECRET`            | ja      | Sitzungsschlüssel, mindestens 32 Zeichen               |
| `APP_URL`                | ja      | Adresse dieser Installation, ohne Schrägstrich am Ende |
| `FEATURE_SQL_RUNNER`     | nein    | Schalter für die SQL-Ausführung, Standard `false`      |
| `SQL_RUNNER_URL`         | nein    | Adresse des Runner-Dienstes                            |
| `SQL_RUNNER_TOKEN`       | nein    | Token für den Runner-Dienst                            |
| `SQL_ZEITLIMIT_MS`       | nein    | Zeitlimit je Abfrage, Standard `5000`                  |
| `SQL_MAX_ZEILEN`         | nein    | Zeilen je Ergebnis, Standard `500`                     |
| `SQL_MAX_ANWEISUNGEN`    | nein    | Anweisungen je Ausführung, Standard `10`               |
| `ATTEMPT_RETENTION_DAYS` | nein    | Aufbewahrung der Versuche in Tagen, Standard `365`     |

`AUTH_SECRET` immer neu erzeugen und **niemals** aus einer Anleitung, einem
Chatverlauf oder einem anderen Projekt übernehmen:

```bash
openssl rand -base64 48
```

Die echte `.env` ist in `.gitignore` eingetragen und gehört niemals ins
Repository.

---

## 5. Datenbank starten

```bash
npm run sql:up      # PostgreSQL auf 127.0.0.1:5433
npm run sql:down    # wieder anhalten
```

Der Port 5433 statt 5432 ist Absicht: Eine bereits laufende lokale PostgreSQL
soll nicht verdrängt werden.

---

## 6. Migrationen und Seed

```bash
npm run db:migrate    # Schema anlegen oder fortschreiben
npm run db:seed       # Lehrplan einspielen
```

Der Prisma-Client entsteht schon bei `npm install` (`postinstall`). Wer ihn
zwischendurch neu braucht — etwa nach einer Schemaänderung —, ruft
`npm run db:generate` auf.

Die Reihenfolge ist nicht beliebig: `migrate` kommt ohne den Client aus, `seed`
nicht. Ohne den erzeugten Client bricht der Seed mit
`Cannot find module './src/generated/prisma/client'` ab — und zwar erst,
nachdem die Migration bereits gelaufen ist.

Der Seed ist **idempotent**: Zweimal ausgeführt ergibt er denselben Stand wie
einmal. Wer stattdessen bei jedem Lauf neu anlegt, verliert beim zweiten Mal
den Fortschritt aller Lernenden – die Versuche hängen an den Aufgaben-IDs.

Er prüft den Lehrplan, **bevor** er schreibt, und bricht bei Befunden ab. Ein
Lehrplan mit Fehlern gehört nicht in die Datenbank; dort fiele er erst auf,
wenn eine Lernende darüber stolpert.

Der Seed legt **keine Konten** an. Ein Demo-Konto mit bekanntem Passwort, das
versehentlich in einer erreichbaren Umgebung landet, ist eine offene Tür. Für
die lokale Entwicklung:

```bash
npm run konto
```

Das Skript erzeugt ein Konto mit einer zufälligen Passphrase und zeigt sie
einmal an. Sie wird nirgends protokolliert.

---

## 7. Entwicklungsserver

```bash
npm run dev
```

Vollständiger Ablauf von null:

```bash
npm install                   # erzeugt dabei den Prisma-Client
cp .env.example .env          # AUTH_SECRET eintragen
npm run sql:up
npm run db:migrate
npm run db:seed
npm run konto                 # nur lokal
npm run dev
```

---

## 8. Tests

```bash
npm run test:unit    # Domänenlogik, Inhalte, Kontraste
npm run test:sql     # T-SQL-Semantik gegen einen echten SQL Server
npm run test:e2e     # der ganze Weg im Produktionsbuild
npm run verify       # typecheck + lint + unit + build
```

### Was die Unit-Tests prüfen

- **Bewertung** – dass „alles ankreuzen" nicht als richtig durchgeht, dass
  eine leere Abgabe nicht als Fehlversuch zählt, dass die Musterantwort nicht
  herausgegeben wird, bevor etwas dasteht
- **Auswahl** – welche Aufgabe als Nächstes drankommt, ohne Zufall und deshalb
  überhaupt prüfbar
- **Inhalte** – dass jede Musterlösung durch die Policy ihrer eigenen Aufgabe
  kommt, dass kein Hinweis die Lösung im Wortlaut nennt, dass keine
  Musterlösung eine Tabelle oder Spalte nennt, die es nicht gibt
- **Kontraste** – die Farbpaare der Oberfläche gegen WCAG 2.2 AA, hell und
  dunkel

Jede dieser Prüfungen hat eine **Gegenprobe**: einen Test, der den Fehler
absichtlich einbaut. Ein Prüfer, der nie etwas meldet, ist von einem, der
nichts prüft, nicht zu unterscheiden.

### Die SQL-Integrationstests

`tests/sql/` ist der einzige Ort, an dem sich T-SQL-Semantik nachweisen lässt.
Ohne Zugangsdaten werden diese Tests **übersprungen, nicht bestanden** – ein
grüner Lauf ohne Server wäre eine Auskunft, die nichts wert ist, und sie käme
genau dann, wenn man sich auf sie verlässt. Der Ablauf steht in
[docs/SQL-RUNNER.md](docs/SQL-RUNNER.md), Abschnitt 8.

---

## 9. Produktionsbuild

```bash
npm run build
npm run start
```

Die E2E-Tests laufen gegen den Produktionsbuild, nicht gegen `dev`. Wer sie
nach einer Änderung ausführt, muss vorher neu bauen.

---

## 10. Architektur

```
src/
  app/            Next.js App Router – Seiten und Layouts
  components/     Oberfläche, nach Bereichen sortiert
  content/        Der Lehrplan als versionierte Daten + Validator
  domain/         Fachlogik ohne Datenbank, Netz und React
  server/         Alles, was Datenbank oder Sitzung braucht
prisma/           Datenmodell, Migrationen, Seed
docs/             SQL-RUNNER.md – die Architekturentscheidungen zur Ausführung
e2e/              Playwright
tests/            Vitest (unit, sql)
```

Die Trennlinie liegt bei `domain/`: Was dort steht, kennt weder Prisma noch
React und lässt sich deshalb vollständig prüfen. Die Bewertung einer Aufgabe,
die Auswahl der nächsten Aufgabe, die Statement-Policy, der Resultset-Vergleich
und die Fehlererklärungen liegen alle dort.

### Technologie

Next.js 16 (App Router), React 19, TypeScript 6 im strict-Modus mit
`noUncheckedIndexedAccess`, Tailwind CSS 4, Prisma 7 mit PostgreSQL 16,
CodeMirror 6 für den Editor, Vitest und Playwright.

---

## 11. SQL-Ausführung

Der ausführliche Text steht in [docs/SQL-RUNNER.md](docs/SQL-RUNNER.md). Die
drei Punkte, die man kennen muss:

**Zwei strikt getrennte Datenebenen.** Lernende führen SQL **niemals** gegen
die Plattformdatenbank aus. Konten, Fortschritt und Inhalte liegen in
PostgreSQL; geübt wird in einer eigenen SQL-Server-Sandbox je Konto. Diese
Trennung ist eine zentrale Sicherheitsgrenze und keine Aufräumfrage.

**Die Sicherheitsgrenze ist das Berechtigungsmodell**, nicht die Textprüfung.
`statement-policy.ts` entscheidet, wann die Anwendung etwas _erklärt_ statt es
auszuführen – sie ist Didaktik und Tiefenstaffelung. SQL lässt sich beliebig
verschleiern; eine Zeichenkettenanalyse gewinnt dieses Rennen nie.

**Ohne Runner wird nichts erfunden.** Ist `FEATURE_SQL_RUNNER` aus oder kein
Dienst erreichbar, sagt die Anwendung das – deutlich, an der Stelle, an der es
auffällt, und ohne Ersatzweg, der ein Ergebnis herbeirechnet. Eine
geschriebene Abfrage bekommt dann „geprüft, aber nicht ausgeführt". Es wird
nicht behauptet, sie sei richtig, weil sie richtig aussieht.

Was trotzdem geht: Auswahl, Mehrfachauswahl, Reihenfolge und die Vorhersage
der Zeilenzahl werden vollständig bewertet, ohne dass eine einzige Anweisung
läuft. Das ist keine Notlösung – wer vorhersagt, bevor er ausführt, lernt mehr
als wer ausführt und danach schaut, was herauskam.

---

## 12. Inhalte pflegen

Inhalte stehen in `src/content` und nicht in der Datenbank. Damit ist jede
Änderung am Lehrplan ein Commit mit Verlauf, Begründung und der Möglichkeit,
sie zurückzunehmen.

```
src/content/
  typen.ts             Die Form einer Lektion, Aufgabe, eines Projekts
  konzepte.ts          Die Konzeptliste
  module/              Ein Modul je Datei
  uebungsdaten/        Der Übungsdatensatz „Handwerksbetrieb"
  validator.ts         Die Prüfung, die der Seed und die Tests ausführen
  index.ts             Der Lehrplan an einer Stelle
```

Ablauf einer Inhaltsänderung:

```bash
npm run test:unit     # der Validator läuft als Test
npm run db:seed       # einspielen
```

Der Validator meldet unter anderem: eine Musterlösung, die die eigene Policy
der Aufgabe verletzt; einen Hinweis, der die Lösung im Wortlaut nennt; ein
erwartetes Ergebnis mit schiefer Zeilenbreite; ein Konzept ohne eine einzige
Aufgabe; einen doppelten Slug.

---

## 13. Sicherheitsgrenzen

- **Keine Secrets im Repository**, in Commit-Nachrichten, in PR-Texten, im
  Client-Bundle oder in Seed-Daten. Zugangsdaten aus einem Chatverlauf oder
  einer Anleitung werden nicht übernommen, sondern neu erzeugt.
- **Der Seed legt keine Konten an.**
- **Sitzungen** werden serverseitig geführt; das Abmelden löscht sie dort und
  nicht nur im Browser.
- **Anmeldefehler nennen keine Einzelheiten.** „E-Mail-Adresse oder Passwort
  stimmen nicht" für beide Fälle – eine freundlichere Meldung verriete,
  welche Adressen ein Konto haben.
- **Die richtige Antwort verlässt den Server nicht.** Die Lektionsseite setzt
  die Ansicht einer Aufgabe Feld für Feld zusammen, statt die Datenbankzeile
  durchzureichen; ein E2E-Test liest den Quelltext der Seite und prüft das.

---

## 14. Auslieferung auf Vercel

Die Anwendung läuft auf Vercel – mit **einer Einschränkung, die aus der
Architektur folgt und nicht behoben werden kann**: Abfragen ausführen geht
dort nicht.

### Was auf Vercel funktioniert

Registrierung, Anmeldung, Einstieg, der gesamte Lehrplan mit allen Lektionen,
die Aufgaben mit Auswahl, Mehrfachauswahl, Reihenfolge, Zeilenzahl-Vorhersage
und Freitext, die Hinweisleiter, die Musterlösungen, die Projekte, der
Fortschritt, die Wissenslandkarte, die Lernzeit und das gesamte Profil samt
Passwortänderung und Kontolöschung.

### Was auf Vercel nicht funktioniert

**Eigene Abfragen ausführen.** Ein SQL Server lässt sich nicht in einer
Serverless-Funktion betreiben – die Begründung steht in
[docs/SQL-RUNNER.md](docs/SQL-RUNNER.md), Abschnitt 3. `FEATURE_SQL_RUNNER`
bleibt deshalb auf `false`, und die Anwendung sagt an jeder betroffenen Stelle,
dass die Ausführung abgeschaltet ist. Sie erfindet kein Ergebnis.

Wer die Ausführung will, braucht zusätzlich einen Runner-Dienst auf einem
Server, der lange laufen darf, und einen SQL Server dahinter. Vercel bleibt
dann für die Anwendung zuständig und spricht den Runner über HTTPS an.

### Voraussetzungen

- **Eine PostgreSQL-Datenbank außerhalb von Vercel** (Neon, Supabase, o. ä.).
  Für `DATABASE_URL` den **gepoolten** Endpunkt nehmen: Jede Serverless-Instanz
  öffnet einen eigenen Pool, und ohne Pooler sind die Verbindungen der Datenbank
  schneller aufgebraucht, als man zusehen kann.
- Node 22 oder neuer (steht in `engines`).

### Schritte

1. Repository in Vercel importieren, **Root Directory auf `sqlpfad` setzen** –
   das Repository enthält zwei Anwendungen.
2. Umgebungsvariablen setzen: `DATABASE_URL`, `AUTH_SECRET` (neu erzeugen, siehe
   Abschnitt 4), `APP_URL` auf die spätere Adresse ohne Schrägstrich am Ende.

   **Vor dem ersten Deployment, nicht danach.** Alle drei werden schon beim
   Übersetzen gebraucht: Next wertet `generateMetadata` aus, und die
   Umgebungsprüfung aus `src/server/env.ts` läuft dabei mit. Fehlt eine, bricht
   der Build ab – mit einer verständlichen Meldung, aber er bricht ab. Eine
   Verbindung zur Datenbank stellt der Build dagegen nicht her; die Adresse muss
   nur formal gültig sein.

3. Einmalig gegen dieselbe Datenbank – **von der eigenen Maschine aus, nicht im
   Build**:

   ```bash
   git pull                                 # sonst fehlen neue Migrationen
   npm install                              # erzeugt dabei den Prisma-Client
   DATABASE_URL="…" npx prisma migrate deploy
   DATABASE_URL="…" npm run db:seed
   ```

   Das `git pull` steht aus einem Grund an erster Stelle: `migrate deploy`
   spielt ein, was **im Arbeitsverzeichnis** liegt, nicht was im Repository
   steht. Ein veralteter Klon meldet zufrieden `No pending migrations to
apply` – und die Anwendung bricht danach an der fehlenden Spalte ab. Die
   Zeile darüber, wie viele Migrationen gefunden wurden, ist die einzige
   Stelle, an der man das vorher sieht.

   Die Zeichenfolge gehört in **Anführungszeichen**. Sie enthält `&`; ohne
   Quotes schickt die Shell den Befehl in den Hintergrund und schneidet ab dem
   ersten `&` alles ab.

   `pg` warnt beim Verbinden, dass `sslmode=require` derzeit wie
   `verify-full` behandelt wird und sich das in Version 9 ändert. Das ist eine
   Vorwarnung, kein Fehler – die Verbindung ist heute die **strengere** von
   beiden. Wer sie festnageln will, schreibt `sslmode=verify-full`.

   Für Migration und Seed die **direkte** Verbindungszeichenfolge nehmen, nicht
   die gepoolte: `prisma migrate` nimmt Advisory Locks, und der Pooler arbeitet
   im Transaction-Mode und reicht sie nicht durch.

   Denselben Befehl braucht es **erneut**, sobald eine neue Migration
   dazukommt – auch bei einer bereits laufenden Installation. Zuletzt betraf
   das `20260817185213_wiederholungsplanung_sm2`; die Migration fügt der
   Tabelle `concept_mastery` eine Spalte mit Standardwert hinzu und ist damit
   auf vorhandenen Daten gefahrlos.

4. Deployen.

Der Build erzeugt den Prisma-Client selbst (`prisma generate && next build`);
`src/generated/` ist nicht eingecheckt, und ohne diesen Schritt bricht der Build
eines frischen Klons ab.

**Migrationen laufen bewusst nicht im Build.** Ein Deployment, das nebenbei das
Schema der Produktionsdatenbank ändert, tut das auch dann, wenn man nur einen
Tippfehler im Text korrigieren wollte. Ein eigener, bewusster Schritt ist
umständlicher und genau deshalb richtig.

---

## 15. Was diese Fassung noch nicht kann

Damit dieses Dokument nicht mehr verspricht als der Code hält:

- **Der Runner-Dienst** als eigener Prozess samt Schnittstelle fehlt.
  Domänenlogik, Motor und Rücksetzstrategie stehen; `src/server/sql/mssql-motor.ts`
  ist nach der Treiberdokumentation geschrieben und **gegen keinen laufenden
  SQL Server gelaufen**. Bis die Integrationstests einmal grün waren, gilt er
  als unbewiesen – das steht auch im Kopf der Datei.
- **Die Lizenzfrage** für den Produktionsbetrieb ist offen
  ([docs/SQL-RUNNER.md](docs/SQL-RUNNER.md), Abschnitt 6). Bis sie entschieden
  ist, bleibt `FEATURE_SQL_RUNNER` aus.
- **Ein an unseren Lernenden angepasstes Gedächtnismodell.** Die
  Wiederholungsplanung läuft nach SM-2 mit den Konstanten aus der
  Veröffentlichung – siehe [Wiederholen](#16-wiederholen). Nichts daran ist an
  den Daten dieser Anwendung nachjustiert, und die Intervalle sind an Vokabeln
  erprobt, nicht an SQL.
- **Eine Behaltenswahrscheinlichkeit** wird nirgends angezeigt. SM-2 rechnet
  keine; sie zu ergänzen hieße, eine Zahl zu erfinden.
- **Kompetenzwerte je Konzept** werden nicht als Zahl fortgeschrieben. Die
  Wissenslandkarte leitet den Stand bei jedem Aufruf aus den Versuchen ab und
  zeigt ein Wort statt einer Prozentzahl; `ConceptMastery.masteryScore` bleibt
  ungeschrieben. Die übrigen Felder derselben Tabelle führt die
  Wiederholungsplanung – aber ausschließlich für die Terminfrage, nicht als
  Note.
- **`ReviewQueueItem` bleibt leer.** Eine ausmaterialisierte Warteschlange
  neben `ConceptMastery.nextReviewAt` wäre eine zweite Liste derselben
  Wahrheit, und die zweite ist irgendwann die falsche.
- **Ein KI-Tutor** ist nicht enthalten.
- **Organisationen und Kohorten** stehen im Datenmodell, haben aber keine
  Oberfläche.

---

## 16. Wiederholen

Die Wiederholungsseite zeigt, was **heute ansteht** – berechnet, nicht
geschätzt.

### Das Verfahren

Umgesetzt ist **SM-2** (Piotr Woźniak, 1987/1990) mit den Konstanten aus der
Veröffentlichung: Startleichtigkeit 2,5, Untergrenze 1,3, Stufenfolge
1 Tag → 6 Tage → Intervall mal Leichtigkeit. Der Code steht in
`src/domain/wiederholung/sm2.ts`, kennt weder Datenbank noch React und ist in
`tests/unit/sm2.test.ts` gegen die veröffentlichten Zahlen geprüft – nicht
gegen das, was der Code gerade tut.

**Warum nicht FSRS**, obwohl es das bessere Verfahren ist: FSRS rechnet mit
siebzehn Parametern, die an einem Wiederholungsprotokoll trainiert werden. Ein
solches Protokoll gibt es hier nicht. Die vortrainierten Standardwerte zu
übernehmen hieße, das Gedächtnis fremder Lernender auf unsere anzuwenden und
das Ergebnis als Messung auszugeben.

### Die eine Stelle, an der eine eigene Entscheidung steckt

SM-2 fragt die Lernende nach jeder Wiederholung nach einer Güte von 0 bis 5.
Das tun wir nicht – das wären fünf zusätzliche Klicks je Lektion. Die Güte
wird aus dem abgeleitet, was ohnehin anfällt:

| Ergebnis                  | Güte | Folge                                       |
| ------------------------- | ---- | ------------------------------------------- |
| gelöst, ohne Hinweis      | 5    | Intervall wächst am schnellsten             |
| gelöst, ein Hinweis       | 4    | Leichtigkeit bleibt unverändert             |
| gelöst, ab zwei Hinweisen | 3    | Intervall wächst, Leichtigkeit sinkt        |
| teilweise                 | 2    | gilt als Fehlschlag                         |
| daneben                   | 1    | gilt als Fehlschlag                         |
| Lösung angesehen          | 0    | gilt als Fehlschlag, steht sofort wieder an |

Das ist eine **Ersetzung**, keine Umsetzung des Originals, und sie ist als
solche im Kopf von `sm2.ts` vermerkt.

Die angesehene Lösung als 0 zu werten ist keine Strafe: Wer sie gelesen hat,
weiß danach nicht, ob er sie allein gefunden hätte – und genau das soll die
nächste Begegnung klären.

### Geplant wird je Konzept

Vergessen wird ein Konzept, nicht eine Aufgabennummer. Ein Versuch zahlt
deshalb auf alle Konzepte seiner Aufgabe ein; gezeigt wird je fälligem Konzept
**eine** Aufgabe, und zwar die am längsten nicht bearbeitete. Dass diese eine
Liste vollständig ist, hängt an einer Zusicherung des Validators: Jede Aufgabe
hat mindestens ein Konzept, sonst wird der Lehrplan nicht eingespielt.

`ExerciseConcept.weight` wertet der Planer ausdrücklich **nicht** aus – SM-2
kennt keine Gewichte, und eines einzuführen hieße, das Verfahren um eine Zutat
ohne Begründung zu erweitern.

### Was es nicht behauptet

SM-2 kennt nur die Abfolge der eigenen Ergebnisse. Es weiß nicht, ob zwei
Konzepte verwandt sind, und es lernt nichts aus dem Verhalten anderer. Es ist
ein nachvollziehbarer Vorschlag, wann sich Wiederholen lohnt – keine
Vorhersage, wann etwas vergessen wird. Die Oberfläche sagt das an dieser
Stelle auch so.

Eine leere Wiederholungsseite bleibt kein Rückstand. Wer nichts offen hat,
bekommt das gesagt und keinen Aufholbedarf angezeigt.

---

## 17. Redaktionsbereich

`/admin`, nur für Konten mit der Rolle `ADMIN`.

### Wofür er da ist

Inhalte werden als versionierte Dateien gepflegt und über den Seed in die
Datenbank gespielt. Damit gibt es zwei Stände derselben Sache, und die Seite
beantwortet die eine Frage, die sich sonst niemand stellt: **Stimmen sie noch
überein?**

Ein Lehrplan, der in den Dateien eine Aufgabe mehr hat als in der Datenbank,
sieht in der Anwendung völlig unauffällig aus – die Aufgabe fehlt eben. Wer sie
sucht, sucht sie im Inhaltsverzeichnis und nicht im Seed-Protokoll.

Gezeigt werden: das Ergebnis desselben Validators, den auch der Seed ausführt;
der Abgleich Dateien gegen Datenbank je Inhaltsart; der
Veröffentlichungsstand aller Module und Lektionen; zwei Nutzungszahlen.

### Was dort bewusst nicht steht

**Keine personenbezogenen Daten.** Zählungen ja, Namen und Adressen nein, keine
Versuchsverläufe einzelner Lernender. Ein Adminbereich, der beim Öffnen zeigt,
wer was wann falsch gemacht hat, macht aus einer Lernplattform eine
Überwachungsanlage – und ob eine Lektion schlecht geschrieben ist, erkennt man
auch ohne Namen. Ein E2E-Test hält das fest: Er liest den Quelltext der Seite
und prüft, dass weder die Adresse noch der Name des angemeldeten Kontos darin
vorkommen.

**Kein Bearbeiten.** Inhalte werden im Repository geändert. Eine Änderung über
die Oberfläche hätte keinen Verlauf, keine Begründung und keinen Weg zurück –
und beim nächsten Seed wäre sie wieder weg.

### Die Rolle vergeben

Über die Oberfläche geht das nicht, und das ist Absicht: Der Adminbereich prüft
Rollen, vergibt sie aber nicht. Sonst gäbe es keinen Weg, das erste Konto mit
vollem Zugriff sicher zu erzeugen.

```bash
npm run konto -- --email=name@beispiel.de --name="Vor Nachname" --rolle=admin
```

Bei einer verwalteten Datenbank die **direkte** Verbindungszeichenfolge
voranstellen, nicht die gepoolte. Das Skript erzeugt eine Passphrase und zeigt
sie genau einmal an – auf dem Rechner, auf dem es läuft. Ein Passwort, das
jemand anders auswählt und übermittelt, ist ab der Übermittlung keins mehr.

Wer angemeldet ist, aber keine Adminrolle hat, wird auf den Überblick
umgeleitet – nicht auf eine Fehlerseite. Er hat sich verlaufen, und das ist
kein Fehler.

---

## 18. Eigene Domain über Strato

Beispiel: `sqlpfad.de`, registriert bei Strato, ausgeliefert von Vercel.

### Im Code ist nichts zu ändern

Die Domain steht an **einer** Stelle: `APP_URL`. `src/server/site.ts` ist die
einzige Datei, die sie liest, und alles Weitere – kanonische Verweise,
`sitemap.xml`, `robots.txt`, die Vorschaubilder geteilter Links, das
`Secure`-Merkmal der Sitzungscookies und ob `Strict-Transport-Security` gesetzt
wird – leitet sich daraus ab. Ein Umzug ist eine Zeile, kein
Suchen-und-Ersetzen.

### Reihenfolge

Sie ist nicht beliebig, und der häufigste Fehler ist, `APP_URL` zuerst zu
ändern: Zwischen Umstellung und funktionierendem Zertifikat verweist die Seite
dann auf eine Adresse, die noch nicht antwortet.

1. **In Vercel** unter Settings → Domains `sqlpfad.de` **und**
   `www.sqlpfad.de` hinzufügen. Vercel nennt daraufhin die nötigen
   DNS-Einträge und prüft sie fortlaufend.

2. **Bei Strato** unter Domainverwaltung → DNS-Verwaltung eintragen. Die
   üblichen Werte:

   | Typ     | Name  | Wert                                    |
   | ------- | ----- | --------------------------------------- |
   | `A`     | `@`   | `76.76.21.21`                           |
   | `CNAME` | `www` | der Wert, den Vercel im Dashboard nennt |

   **Den CNAME-Wert aus dem Dashboard abschreiben, nicht von hier.** Vercel
   vergibt inzwischen projektbezogene Ziele (`cname.vercel-dns.com`,
   `cname.vercel-dns-0.com`, …); welches für dieses Projekt gilt, steht nur
   dort. Die A-Adresse für die Wurzel ist dagegen seit Jahren dieselbe.

   Ein `CNAME` auf der Wurzel (`@`) geht **nicht** – das verbietet nicht
   Strato, sondern das DNS selbst.

   Strato legt für neue Domains eine Weiterleitung auf eine Parkseite an. Die
   muss weg, sonst gewinnt sie gegen die eigenen Einträge.

3. **Warten.** Bis die Einträge greifen, vergeht bei Strato erfahrungsgemäß
   eine Viertelstunde bis mehrere Stunden. Vercel stellt das Zertifikat
   selbstständig aus, sobald die Prüfung durchgeht; in der Domainliste steht
   dann _Valid Configuration_.

4. **Eine der beiden Adressen zur Hauptadresse machen.** In Vercel lässt sich
   `www.sqlpfad.de` auf `sqlpfad.de` umleiten (oder umgekehrt). Ohne diese
   Festlegung ist die Anwendung unter zwei Adressen erreichbar, und
   Suchmaschinen sehen zwei Websites mit identischem Inhalt.

5. **Erst jetzt** `APP_URL` auf `https://sqlpfad.de` setzen – ohne
   Schrägstrich am Ende – und **neu deployen**. Die Startseite wird beim Bauen
   vorgerendert; ohne neuen Build stünde in ihrem `canonical` weiter die
   `vercel.app`-Adresse.

### Die vier Dateien, die niemand aufruft

`robots.txt`, `sitemap.xml`, `manifest.webmanifest` und das Vorschaubild unter
`/opengraph-image` werden alle **zur Laufzeit erzeugt**, nicht beim
Übersetzen. Der Grund steht im Kopf von `src/app/robots.ts`: Würden sie beim
Bauen festgeschrieben, stünde nach einem Build ohne die richtige `APP_URL` eine
Adresse darin, die es nicht gibt – und die Datei sähe trotzdem gültig aus.

Sie haben eine unangenehme Gemeinsamkeit: Niemand ruft sie auf. Ein Fehler
darin fällt keiner Lernenden auf, sondern Suchmaschinen und Messengern, und die
sagen nichts. `e2e/domain-grundlage.spec.ts` prüft deshalb nicht nur den
Statuscode, sondern die Adressen darin – und dass die im Manifest genannten
Symbole tatsächlich ausgeliefert werden.

Das Verzeichnis führt bewusst nur drei Adressen: Startseite, Anmelden,
Registrieren. Die fünfzehn Lektionen gehören nicht hinein, solange sie hinter
der Anmeldung liegen.

### Was sich damit von selbst ändert

`isSecureDeployment()` liefert unter `https://` wahr. Damit setzt die
Anwendung `Strict-Transport-Security` und markiert Sitzungscookies als
`Secure`. Unter `http://localhost` unterbleibt beides – HSTS dort zu setzen
würde den eigenen Rechner für Monate auf HTTPS festnageln, auch für andere
Projekte auf demselben Port.

---

## Weitere Dokumentation

- [docs/SQL-RUNNER.md](docs/SQL-RUNNER.md) – warum SQL eine andere Architektur
  braucht als Python, die zwei Datenebenen, das Berechtigungsmodell,
  Ressourcengrenzen, die offene Lizenzfrage, der Ablauf der Integrationstests
