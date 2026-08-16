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
14. [Was diese Fassung noch nicht kann](#14-was-diese-fassung-noch-nicht-kann)

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

- **Node.js 22** oder neuer
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
npm run db:generate   # Prisma-Client erzeugen
npm run db:migrate    # Schema anlegen oder fortschreiben
npm run db:seed       # Lehrplan einspielen
```

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
npm install
cp .env.example .env          # AUTH_SECRET eintragen
npm run sql:up
npm run db:generate
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

## 14. Was diese Fassung noch nicht kann

Damit dieses Dokument nicht mehr verspricht als der Code hält:

- **Der Runner-Dienst** als eigener Prozess samt Schnittstelle fehlt.
  Domänenlogik, Motor und Rücksetzstrategie stehen; `src/server/sql/mssql-motor.ts`
  ist nach der Treiberdokumentation geschrieben und **gegen keinen laufenden
  SQL Server gelaufen**. Bis die Integrationstests einmal grün waren, gilt er
  als unbewiesen – das steht auch im Kopf der Datei.
- **Die Lizenzfrage** für den Produktionsbetrieb ist offen
  ([docs/SQL-RUNNER.md](docs/SQL-RUNNER.md), Abschnitt 6). Bis sie entschieden
  ist, bleibt `FEATURE_SQL_RUNNER` aus.
- **Die Wiederholungsplanung nach Intervallen** ist im Datenmodell vorgesehen,
  die Rechnung dahinter gibt es nicht. Solange richtet sich das Wiederholen
  nach dem, was nachweislich vorliegt: was zuletzt nicht saß. Ein erfundenes
  „in 3 Tagen wieder" wäre eine Zahl mit dem Anschein von Wissenschaft und
  nichts dahinter.
- **Kompetenzwerte je Konzept** werden nicht als Zahl fortgeschrieben. Die
  Wissenslandkarte auf dem Überblick leitet den Stand bei jedem Aufruf aus den
  Versuchen ab und zeigt ein Wort statt einer Prozentzahl; `ConceptMastery`
  bleibt ungenutzt, bis es ein Gedächtnismodell gibt, das seine Felder füllen
  kann.
- **Ein KI-Tutor** ist nicht enthalten.
- **Organisationen und Kohorten** stehen im Datenmodell, haben aber keine
  Oberfläche.

---

## Weitere Dokumentation

- [docs/SQL-RUNNER.md](docs/SQL-RUNNER.md) – warum SQL eine andere Architektur
  braucht als Python, die zwei Datenebenen, das Berechtigungsmodell,
  Ressourcengrenzen, die offene Lizenzfrage, der Ablauf der Integrationstests
