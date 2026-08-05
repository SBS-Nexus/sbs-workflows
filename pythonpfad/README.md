# PythonPfad

**Python verstehen. Selbst schreiben. Wirklich anwenden.**

Eine interaktive Lernplattform, mit der deutschsprachige Erwachsene ohne
Programmiererfahrung Python nachhaltig lernen. Kein Videokurs, keine Sammlung
von Textlektionen: Python läuft direkt im Browser, Aufgaben werden automatisch
bewertet, und der Wiederholungsplan richtet sich nach dem tatsächlichen
Lernverlauf.

---

## Inhalt

1. [Produktüberblick](#1-produktüberblick)
2. [Voraussetzungen](#2-voraussetzungen)
3. [Installation](#3-installation)
4. [Umgebungsvariablen](#4-umgebungsvariablen)
5. [Datenbank starten](#5-datenbank-starten)
6. [Migrationen](#6-migrationen)
7. [Seed-Daten](#7-seed-daten)
8. [Entwicklungsserver](#8-entwicklungsserver)
9. [Tests](#9-tests)
10. [Produktionsbuild](#10-produktionsbuild)
11. [Architektur](#11-architektur)
12. [Python-Codeausführung](#12-python-codeausführung)
13. [KI-Tutor-Konfiguration](#13-ki-tutor-konfiguration)
14. [Datenschutz- und Sicherheitsgrenzen](#14-datenschutz--und-sicherheitsgrenzen)
15. [Organisationen und Kohorten](#15-organisationen-und-kohorten)
16. [Installation als App und Offlinebetrieb](#16-installation-als-app-und-offlinebetrieb)
17. [Betrieb und Überwachung](#17-betrieb-und-überwachung)

---

## 1. Produktüberblick

PythonPfad führt vom ersten Begriff bis zu Schleifen und kleinen eigenen
Programmen. Der Aufbau folgt einem ausgearbeiteten Lernmodell
(→ [docs/LERNMODELL.md](docs/LERNMODELL.md)), nicht dem üblichen
Kapitelschema.

### Was in dieser Version bereitsteht

| Bereich                     | Umfang                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Module                      | 4 (Digitale Grundlagen, Erste Python-Schritte, Entscheidungen, Schleifen)                                                       |
| Lektionen                   | 15, vollständig ausformuliert                                                                                                   |
| Interaktive Aufgaben        | 61                                                                                                                              |
| Interaktionsformen          | 8 (Einfach-/Mehrfachauswahl, freie Erklärung, Ausgabe vorhersagen, Zeilen ordnen, Code ergänzen, Fehler finden, Code schreiben) |
| Didaktische Aufgabentypen   | 12, darunter Transfer, Refactoring, Fehlererklärung und Lösungsvergleich                                                        |
| Konzepte im Kompetenzmodell | 33                                                                                                                              |
| Wiederholungssets           | 3 (mit Interleaving über Module hinweg)                                                                                         |
| Projekte                    | 4, davon 3 Mini-Projekte und 1 Debugging-Labor                                                                                  |
| Vokabular im Editor         | 37 Python-Bausteine mit deutscher Erklärung und Beispiel                                                                        |
| Meilensteine                | 10, ausnahmslos an Fähigkeiten gekoppelt                                                                                        |

### Wie eine Lektion aufgebaut ist

Jede Lektion folgt demselben Schema: konkretes Lernziel → Alltagsproblem →
mentales Modell → durchgerechnetes Beispiel mit Zeilenanmerkungen und
Schritt-für-Schritt-Nachvollzug → typische Stolperstellen → Aufgaben mit
abnehmender Hilfestellung → Reflexion → automatische Wiederholungsplanung.

### Kernfunktionen

- **Python im Browser.** Pyodide in einem Web Worker. Kein Nutzercode auf dem
  Server, keine Installation, Endlosschleifen jederzeit stoppbar.
- **Ausführung Schritt für Schritt.** Jede Zeile, jede Variable, jede Ausgabe
  zum Zeitpunkt der Ausführung – mit Zeitleiste, Wiederholungszähler an
  Schleifenzeilen und Kennzeichnung der nie ausgeführten Zeilen. Damit wird
  beobachtbar, was das mentale Modell der ersten Lektion behauptet.
- **Progressive Hinweisleiter.** Fünf Stufen von der Denkfrage bis zur
  Erklärung. Die Musterlösung wird erst nach mehreren eigenen Versuchen
  freigegeben – und danach folgt eine ähnliche Aufgabe ohne Vorlage.
- **Fehler als Lernmaterial.** Jede Python-Fehlermeldung wird auf Deutsch
  erklärt: Bedeutung, wahrscheinliche Ursachen, Suchstrategie, Selbstprüfung.
  Keine fertige Lösung.
- **Nachvollziehbares Kompetenzmodell.** Deterministisch, versioniert,
  konfigurierbar, vollständig getestet. Jede Veränderung wird der lernenden
  Person im Klartext begründet.
- **Wiederholung zum richtigen Zeitpunkt.** Intervallleiter (Lerneinheit → 1 →
  3 → 7 → 14 → 30 Tage), individuell angepasst an Eigenständigkeit,
  Fehlerart, Sicherheit und Transferleistung.
- **Metakognition.** Selbsteinschätzung vor und nach Aufgaben; das Dashboard
  vergleicht Gefühl und Ergebnis – behutsam formuliert.
- **Lerncoach mit Leitplanken.** Standardmäßig regelbasiert und offline. Ein
  externer KI-Anbieter ist optional und nur mit ausdrücklicher Einwilligung.
- **Editor-Hilfen.** Die Fehlerzeile wird im Editor selbst markiert, nicht nur
  im Traceback genannt. Strg + Leertaste schlägt Python-Bausteine mit deutscher
  Erklärung vor – ausschließlich solche, die im Kurs vorkommen.
- **Wissenslandkarte.** Der Konzeptgraph als Ebenen von links nach rechts:
  Was links steht, ist Voraussetzung für das rechts daneben. Dazu eine
  Behaltensprognose nach der Vergessenskurve.
- **Lernrhythmus ohne Dunkelmuster.** Tagesziel, Lerntage der letzten 30 Tage
  und Meilensteine, die an Fähigkeiten hängen statt an Regelmäßigkeit.
- **Befehlspalette.** Strg/Cmd + K findet Lektionen, Projekte und Funktionen;
  die unscharfe Suche kommt mit deutschen Schreibweisen zurecht.
- **Organisationen und Kohorten.** Für Schule, Volkshochschule oder Team.
  Lehrkräfte sehen Summenwerte; namentlich erscheint nur, wer ausdrücklich
  zustimmt.
- **Installierbar und teiloffline.** Die Python-Laufzeit liegt nach dem ersten
  Besuch auf dem Gerät. Persönliche Seiten werden absichtlich nicht
  zwischengespeichert.

### Was bewusst fehlt

Keine Punktesammelmechanik, keine Verlustmechaniken, keine Ranglisten, keine
Drucknachrichten. Eine unterbrochene Lernserie wird neutral dargestellt.

---

## 2. Voraussetzungen

| Werkzeug         | Version                                     | Anmerkung                                                   |
| ---------------- | ------------------------------------------- | ----------------------------------------------------------- |
| Node.js          | 22 LTS oder neuer                           | `node --version`                                            |
| npm              | 10 oder neuer                               | liegt Node bei                                              |
| Docker + Compose | aktuell                                     | nur für die Datenbank; alternativ ein lokales PostgreSQL 16 |
| Browser          | aktueller Chrome, Firefox, Safari oder Edge | benötigt WebAssembly                                        |

Für die End-to-End-Tests wird zusätzlich ein Chromium benötigt
(`npx playwright install chromium`).

---

## 3. Installation

```bash
git clone <repository-url>
cd pythonpfad
npm install
```

`npm install` erledigt anschließend automatisch zwei Schritte:

1. `prisma generate` erzeugt den typisierten Datenbank-Client.
2. `tsx scripts/sync-pyodide.ts` kopiert die Python-Laufzeit (rund 13 MB) nach
   `public/pyodide`. Dadurch wird kein CDN kontaktiert – siehe
   [Abschnitt 12](#12-python-codeausführung).

---

## 4. Umgebungsvariablen

```bash
cp .env.example .env
```

Danach in `.env` mindestens `AUTH_SECRET` ersetzen:

```bash
openssl rand -base64 48
```

| Variable                       | Pflicht                     | Bedeutung                                                                 |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`                 | ja                          | PostgreSQL-Verbindung der Anwendung                                       |
| `TEST_DATABASE_URL`            | für Tests                   | eigene Datenbank für Integrationstests                                    |
| `AUTH_SECRET`                  | ja                          | mindestens 32 Zeichen; sichert Sitzungen                                  |
| `APP_URL`                      | ja                          | öffentliche Basis-URL                                                     |
| `ATTEMPT_RETENTION_DAYS`       | nein                        | Aufbewahrungsfrist für Versuchsdaten (Standard 365, `0` = keine Löschung) |
| `SEED_DEMO_USERS`              | nein                        | `true` legt beim Seeding die Beispielkonten an; in Produktion wirkungslos |
| `AI_TUTOR_PROVIDER`            | nein                        | `rule-based` (Standard), `anthropic` oder `openai-compatible`             |
| `AI_TUTOR_API_KEY`             | nur bei externem Anbieter   | niemals mit `NEXT_PUBLIC_` präfixen                                       |
| `AI_TUTOR_MODEL`               | nur bei externem Anbieter   | Modellbezeichnung                                                         |
| `AI_TUTOR_BASE_URL`            | nur bei `openai-compatible` | Endpunkt                                                                  |
| `AI_TUTOR_RATE_LIMIT_PER_HOUR` | nein                        | Tutor-Anfragen je Person und Stunde                                       |

Die Konfiguration wird beim Start mit Zod geprüft (`src/server/env.ts`). Fehlt
etwas, bricht die Anwendung mit einer verständlichen Meldung ab statt später
mit einem schwer zuzuordnenden Laufzeitfehler.

### Funktionsschalter

Vier Bereiche lassen sich ohne neue Fassung abschalten. Ohne gesetzte Variable
gilt jeweils der Standard; nur die ausdrücklichen Werte `true` und `false`
werden gelesen, alles andere führt zum Standard.

| Variable                             | Standard | Wirkung                                                    |
| ------------------------------------ | -------- | ---------------------------------------------------------- |
| `FEATURE_AUSFUEHRUNGS_VISUALISIERER` | an       | Schaltfläche „Schritt für Schritt" in Editor und Lektion   |
| `FEATURE_WISSENSLANDKARTE`           | an       | Konzeptgraph und Behaltensprognose im Fortschrittsbereich  |
| `FEATURE_ORGANISATIONEN`             | an       | Organisationen, Kohorten, Lehrkraftbereich und Einladungen |
| `FEATURE_EDITOR_VORSCHLAEGE`         | an       | Vorschlagsliste im Code-Editor (Strg + Leertaste)          |

Die Schalter liegen bewusst in Umgebungsvariablen und nicht in der Datenbank:
Ein Schalter, der selbst von der Datenbank abhängt, hilft genau dann nicht,
wenn man ihn am dringendsten braucht.

---

## 5. Datenbank starten

```bash
docker compose up -d
```

Damit läuft PostgreSQL 16 auf Port 5432. Beim ersten Start legt der Container
zusätzlich die Testdatenbank `pythonpfad_test` an
(`docker/initdb/01-test-database.sql`).

**Ohne Docker:** Ein lokales PostgreSQL 16 genügt. Lege die beiden Datenbanken
`pythonpfad` und `pythonpfad_test` an und passe `DATABASE_URL` sowie
`TEST_DATABASE_URL` entsprechend an.

```bash
# Beispiel für eine lokale Installation
createdb pythonpfad
createdb pythonpfad_test
```

---

## 6. Migrationen

```bash
npm run db:migrate      # Entwicklung: Migration erzeugen und anwenden
npm run db:deploy       # Produktion: vorhandene Migrationen anwenden
npm run db:reset        # Datenbank leeren und neu aufbauen (löscht alle Daten)
```

Das Schema liegt in `prisma/schema.prisma`, die Verbindungszeichenfolge in
`prisma.config.ts`. Seit Prisma 7 steht die URL nicht mehr im Schema.

---

## 7. Seed-Daten

```bash
npm run db:seed
```

Das Skript prüft zuerst sämtliche Inhalte (Konzeptgraph, Testbarkeit,
Hinweisleitern, Platzhaltertexte) und bricht bei Fehlern ab. Danach legt es
Kurs, Module, Lektionen, Aufgaben, Wiederholungssets und Projekte an. Es ist
idempotent: Mehrfaches Ausführen ändert nichts am Ergebnis, und bestehender
Lernfortschritt bleibt erhalten.

### Beispielkonten für die lokale Entwicklung

Die Beispielkonten werden **nur** angelegt, wenn `SEED_DEMO_USERS="true"` gesetzt
ist (in `.env.example` für die lokale Entwicklung voreingestellt). In Produktion
wird der Schalter grundsätzlich ignoriert – ihre Passwörter stehen schließlich in
diesem Repository.

| E-Mail                 | Passwort             | Rolle                                |
| ---------------------- | -------------------- | ------------------------------------ |
| `lernende@example.org` | `LernenMachtSpass24` | LEARNER, Onboarding bereits erledigt |
| `admin@example.org`    | `AdminZugangLokal24` | ADMIN, Zugang zum Redaktionsbereich  |

Ohne den Schalter meldet das Skript `Beispielkonten übersprungen` und legt
ausschließlich Inhalte an. So kann `db:seed` gefahrlos auch für spätere
Inhaltsaktualisierungen laufen, ohne ein bekanntes Administratorkonto
wiederherzustellen.

---

## 8. Entwicklungsserver

```bash
npm run dev
```

→ <http://localhost:3000>

### Vollständiger Ablauf von null

Der kurze Weg – zwei Befehle:

```bash
npm install
npm run einrichten
npm run dev
```

`npm run einrichten` erledigt alles dazwischen: Es prüft die Node-Fassung,
legt die `.env` aus der Vorlage an, erzeugt einen zufälligen `AUTH_SECRET`,
startet die Datenbank über Docker (falls vorhanden und noch nicht laufend),
wendet die Migrationen an und lädt die Beispieldaten. Eine bestehende `.env`
wird nie überschrieben.

Findet es keine Datenbank und kein Docker, beschreibt es beide Auswege, statt
mit einer Verbindungsfehlermeldung abzubrechen.

Von Hand geht es weiterhin genauso:

```bash
cp .env.example .env          # AUTH_SECRET ersetzen
npm install
docker compose up -d
npm run db:deploy
npm run db:seed
npm run dev
```

### Unter Windows

Es gilt derselbe Ablauf; drei Dinge unterscheiden sich:

- **PowerShell statt Eingabeaufforderung.** In der klassischen
  Eingabeaufforderung (`cmd`) fehlen einige der hier genannten Befehle.
- **`openssl` gibt es nicht.** Deshalb erzeugt `npm run einrichten` den
  Schlüssel selbst – von Hand ginge es mit
  `[Convert]::ToBase64String((1..48 | %{Get-Random -Max 256}))`.
- **Nach der Node-Installation ein neues Fenster öffnen.** Ein bereits
  geöffnetes Terminal kennt den neuen Pfad nicht und meldet weiterhin
  „node wird nicht erkannt".

Ohne Docker Desktop reicht ein normal installiertes PostgreSQL 16. Beim
Installieren wird ein Passwort für den Benutzer `postgres` vergeben; danach
zwei Datenbanken anlegen (`pythonpfad`, `pythonpfad_test`) und in der `.env`
`DATABASE_URL` und `TEST_DATABASE_URL` auf diesen Benutzer und dieses Passwort
umstellen.

---

## 9. Tests

```bash
npm run test              # Unit- und Integrationstests
npm run test:unit         # nur Domainlogik, ohne Datenbank
npm run test:integration  # gegen die Testdatenbank
npm run test:e2e          # Playwright gegen den Produktionsbuild
npm run verify            # Typecheck + Lint + Tests + Build
```

**Stand dieser Version:** 335 Vitest-Tests (280 Unit, 55 Integration) und
45 Playwright-Tests laufen durch; Typecheck, Lint, Formatprüfung und Build
sind fehlerfrei. Dazu kommen zwei Prüfskripte, die Python wirklich ausführen:
54 Testfälle aller Musterlösungen und 32 Zusicherungen der schrittweisen
Aufzeichnung.

### Was geprüft wird

- **Unit:** Kompetenzberechnung, Wiederholungsintervalle, Aufgabenbewertung für
  alle acht Interaktionsformen, Hinweisleiter, deutsche Fehlererklärungen,
  Inhaltsvalidierung, Passwort-Hashing, Ratenbegrenzung, Pfadaufbau,
  Einstufung, Tutor-Leitplanken, Aufbereitung der Ausführungsaufzeichnung,
  unscharfe Suche mit deutscher Faltung, Kursvokabular, Lernrhythmus und
  Meilensteine, Konzeptgraph und Behaltensprognose, Berechtigungen und
  Kohortenauswertung, Funktionsschalter und Protokollierung.
- **Sprachprüfungen als Tests:** Mehrere Tests prüfen ausschließlich
  Formulierungen – dass keine Verlustsprache, keine künstliche Dringlichkeit
  und keine Beschämung auftaucht, und zwar in allen Zuständen einschließlich
  „nach langer Pause". Was im Produktkonzept steht, soll nicht bei der nächsten
  Textänderung stillschweigend wegfallen.
- **Integration:** echte Datenbankabfragen – Abgabe speichern, Kompetenz
  fortschreiben, Wiederholung planen, Lektion abschließen, Projekt abnehmen,
  Sitzungen, Aufbewahrungsfristen, vollständige Kontolöschung.
- **End-to-End:** die zehn geforderten Abläufe von der Registrierung bis zum
  Fortsetzen auf einem anderen Gerät, dazu Abbruch einer Endlosschleife,
  stufenweise Hinweisfreigabe, Datenexport, Kontolöschung und mobile
  Nutzbarkeit.

### Musterlösungen gegen ihre eigenen Tests prüfen

Ein eigenes Skript führt jede hinterlegte Musterlösung gegen ihre Testfälle
aus – mit derselben Semantik wie das Browser-Testgerüst:

```bash
npx tsx scripts/dump-code-exercises.ts > /tmp/aufgaben.json
python3 scripts/verify_solutions.py /tmp/aufgaben.json scripts/project-reference-solutions.json
```

Aktueller Stand: 54 Testfälle, keine Abweichung.

---

## 10. Produktionsbuild

```bash
npm run build
npm run start
```

Vor dem Start müssen `DATABASE_URL`, `AUTH_SECRET` und `APP_URL` gesetzt sein
und die Migrationen angewendet werden (`npm run db:deploy`).
Deployment-Hinweise stehen in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 11. Architektur

```
pythonpfad/
├── prisma/            Datenmodell, Migrationen, Seed-Skript
├── public/pyodide/    selbst gehostete Python-Laufzeit (erzeugt)
├── scripts/           Pyodide-Sync, Prüfung der Musterlösungen
├── src/
│   ├── app/           Next.js App Router (Seiten, Layouts)
│   ├── components/    UI-Bausteine, Editor, Aufgabenformen, Tutor
│   ├── content/       redaktionelle Inhalte als typisierte Module
│   ├── domain/        Fachlogik ohne Framework: Kompetenz, Wiederholung,
│   │                  Bewertung, Hinweise, Fehler, Pfad, Einstufung, Tutor
│   ├── lib/runner/    Python-Runner samt Abstraktion und Web Worker
│   └── server/        Datenbank, Auth, Dienste, Server Actions, Sicherheit
├── tests/             Unit- und Integrationstests
└── e2e/               Playwright
```

**Schichtung.** `domain/` enthält reine Funktionen ohne Datenbank-, Netzwerk-
oder React-Bezug und ist vollständig ohne Infrastruktur testbar. `server/`
verbindet diese Logik mit Persistenz und Berechtigungen. `app/` und
`components/` enthalten keine Geschäftslogik und keine fest eingebauten
Lerninhalte.

Die wichtigsten Entscheidungen samt Begründung stehen in
[docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md), das Lernmodell in
[docs/LERNMODELL.md](docs/LERNMODELL.md).

### Technologie

Next.js 16 (App Router) · React 19 · TypeScript 6 im Strict Mode ·
Tailwind CSS 4 · PostgreSQL 16 · Prisma 7 · Zod 4 · CodeMirror 6 ·
Pyodide 314 (Python 3.14) · Vitest 4 · Playwright 1.62

---

## 12. Python-Codeausführung

Python läuft **vollständig im Browser der lernenden Person** – über Pyodide in
einem Web Worker. Auf dem Server wird zu keinem Zeitpunkt Nutzercode
ausgeführt.

### Aufbau

- Die Laufzeit liegt selbst gehostet unter `public/pyodide`. Es wird kein CDN
  angesprochen, damit keine Nutzungsmuster an Dritte abfließen und die Content
  Security Policy streng bleiben kann.
- Jeder Testfall läuft in einem frischen Namensraum. Zwischen Testfällen wird
  kein Zustand übertragen.
- `input()` wird durch eine vorbereitete Liste ersetzt. Beim freien Ausführen
  verhält es sich wie ein Terminal, beim Prüfen bleibt es unsichtbar – sonst
  hinge das Testergebnis am gewählten Fragetext.
- Die Ausgabe wird während des Laufs fortlaufend gemeldet. Bei einem Abbruch
  bleibt daher erhalten, was bis dahin ausgegeben wurde.

### Abbruch von Endlosschleifen

Es gibt ein hartes Zeitlimit (8 Sekunden beim freien Ausführen, 15 Sekunden bei
Testläufen). Läuft es ab oder wird „Stopp“ gedrückt, wird der Worker mit
`terminate()` beendet und neu gestartet. Das ist bewusst die grobe Variante:
Sie wirkt garantiert, auch bei `while True: pass`, wo eine kooperative
Unterbrechung nichts ausrichtet.

### Bekannte Grenzen (werden im UI benannt)

- `input()` liest aus einer vorher gefüllten Liste, nicht aus einem echten
  Terminal.
- Kein Netzwerkzugriff und kein Zugriff auf Dateien des Rechners.
- Nur die Standardbibliothek und die von Pyodide mitgelieferten Pakete.
- Beim ersten Start werden rund 13 MB geladen; danach kommt alles aus dem
  Browser-Cache.

### Runner-Abstraktion

Die Anwendung spricht ausschließlich gegen das Interface `PythonRunner`
(`src/lib/runner/types.ts`). Ein späterer `ContainerRunner` gegen einen
isolierten Sandbox-Dienst lässt sich ohne Änderung an UI oder Domainlogik
ergänzen – siehe [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

---

## 13. KI-Tutor-Konfiguration

Der Lerncoach läuft **standardmäßig regelbasiert** und vollständig auf dem
eigenen Server. Er nutzt die Aufgabenstellung, die Konzeptbeschreibungen, den
Kompetenzstand und die deutsche Fehlererklärung. Ohne jede Konfiguration ist er
voll funktionsfähig.

### Optional: externer Anbieter

```bash
AI_TUTOR_PROVIDER="anthropic"        # oder "openai-compatible"
AI_TUTOR_API_KEY="sk-..."
AI_TUTOR_MODEL="claude-sonnet-5"
AI_TUTOR_BASE_URL=""                 # nur bei "openai-compatible"
```

Zusätzlich muss die lernende Person unter **Profil** ausdrücklich zustimmen.
Ohne beides wird kein externer Dienst kontaktiert. Ist kein Anbieter
eingerichtet, erscheint die Einwilligungsfrage gar nicht erst.

### Was übermittelt wird

Ausschließlich: Modus der Anfrage, Aufgabentitel, Aufgabenstellung,
Konzeptbeschreibungen, Anzahl bisheriger Versuche, der Code im Editor und die
Fehlermeldung. **Nicht** übermittelt werden Name, E-Mail-Adresse, Konto-ID,
Lernhistorie und die hinterlegte Musterlösung.

### Leitplanken

Jede Antwort – auch die eines externen Anbieters – wird geprüft
(`checkTutorGuardrails`). Verworfen wird eine Antwort, die

- die hinterlegte Musterlösung im Wortlaut enthält,
- mehr als vier Codezeilen zeigt, bevor die Hinweisleiter durchlaufen ist,
- unbelegte Gewissheit behauptet („garantiert“, „zu 100 %“),
- oder für eine Zwischenfrage zu lang ist.

In diesen Fällen wird die regelbasierte Antwort ausgeliefert, und das UI weist
darauf hin. Fällt der externe Dienst aus, unterbricht das den Lernfluss nicht.

---

## 14. Datenschutz- und Sicherheitsgrenzen

Ausführlich in [docs/SICHERHEIT.md](docs/SICHERHEIT.md) und
[docs/DATENSCHUTZ.md](docs/DATENSCHUTZ.md).

### Umgesetzt

- **Passwörter:** scrypt (N=2^16, r=8, p=1) aus der Node-Standardbibliothek,
  Parameter im Hash hinterlegt. Prüfung nach Länge statt nach Zeichenklassen.
- **Sitzungen:** opake Zufallstoken; in der Datenbank liegt nur deren
  SHA-256-Hash. Cookies sind `httpOnly`, `SameSite=Lax` und in Produktion
  `secure`.
- **CSRF:** Server Actions prüfen Origin gegen Host (Next.js), zusätzlich ein
  Double-Submit-Token und eine Herkunftsprüfung in `src/proxy.ts`.
- **Content Security Policy:** streng; `'wasm-unsafe-eval'` ausschließlich für
  Pyodide, klassisches `unsafe-eval` ist nicht erlaubt. Dazu `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Ratenbegrenzung** für Anmeldung, Registrierung, Abgaben, Tutor und Export.
- **Eingabevalidierung** mit Zod an jeder Server-Action-Grenze.
- **Datensparsamkeit:** Reflexionstexte und Tutor-Fragen werden nicht
  gespeichert. Produktanalyse liegt in einer eigenen Tabelle ohne jeden
  Nutzerbezug.
- **Auskunft und Löschung:** vollständiger JSON-Export und sofortige,
  kaskadierende Kontolöschung – beide im Profil, beide durch Tests abgedeckt.
- **Aufbewahrungsfrist** für Versuchsdaten, konfigurierbar.

### Bewusste Grenzen dieser Version

- **Der Browser ist keine Vertrauensgrenze.** Auswahl-, Text-, Parsons-,
  Lücken- und Fehlersuchaufgaben werden vollständig serverseitig bewertet; die
  richtigen Antworten verlassen den Server nie. Bei Code-Aufgaben führt der
  Browser die Tests aus und meldet das Ergebnis. Wer will, kann dieses Ergebnis
  manipulieren. Für eine Lernumgebung ohne Zeugnisfunktion ist das vertretbar –
  betrogen wird dabei niemand außer der eigene Lernfortschritt. Die
  Runner-Abstraktion ist genau dafür da, das später mit einem
  Container-Sandbox-Dienst zu schließen.
- **Versteckte Tests** werden beim Absenden an den Browser ausgeliefert und
  sind dort einsehbar. Sie erschweren das Anpassen an einen einzelnen Testfall,
  sie verhindern es nicht.
- **Ratenbegrenzung im Arbeitsspeicher.** Für eine Instanz ausreichend; bei
  mehreren Instanzen muss ein gemeinsamer Zähler eingesetzt werden. Die
  Schnittstelle bleibt dabei gleich.
- **Keine E-Mail-Bestätigung und kein Passwort-Zurücksetzen.** Beides braucht
  einen Mailversand und ist in dieser Version nicht enthalten.

---

---

## 15. Organisationen und Kohorten

Für Schule, Volkshochschule, Weiterbildung oder Team. Wer die Anwendung
ausschließlich mit Einzelkonten betreibt, schaltet den Bereich über
`FEATURE_ORGANISATIONEN="false"` ab.

### Rollen

| Rolle                  | Darf                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| Inhaberin oder Inhaber | Organisation verwalten, Kohorten anlegen, einladen, Prüfprotokoll einsehen |
| Lehrkraft              | Kohorten anlegen, einladen, Kohortenstand einsehen                         |
| Lernende Person        | in Kohorten lernen; sieht ausschließlich die eigenen Daten                 |

Die Rolle gilt je Organisation und ist von der globalen Kontorolle getrennt:
Wer in einer Schule Lehrkraft ist, ist deswegen weder Administrator der
Anwendung noch Lehrkraft anderswo.

### Was eine Lehrkraft sieht

- **Summenwerte:** Median der abgeschlossenen Lektionen und gelösten Aufgaben,
  Anteil der zuletzt Aktiven, und vor allem die Konzepte, an denen die Gruppe
  hängt.
- **Erst ab drei Mitgliedern.** Bei weniger wären es keine Summenwerte mehr,
  sondern Aussagen über einzelne Menschen.
- **Namentlich nur mit Einwilligung.** Der Standard ist aus, die Einstellung
  steht im Profil der lernenden Person neben Export und Löschung, und der
  Widerruf wirkt sofort.
- **Nie:** einzelne Versuche, Bearbeitungszeiten, Fehlermeldungen oder
  eingereichter Code. Dafür gibt es keine Funktion – auch nicht mit
  Einwilligung. Eine Lehrkraft sieht den Stand, nicht den Weg dorthin.

### Einladungen

Einladungslinks tragen ein zufälliges Token; in der Datenbank liegt nur dessen
SHA-256-Hash. Der Link wird genau einmal angezeigt, gilt vierzehn Tage und
lässt sich wahlweise an eine E-Mail-Adresse und an eine Kohorte binden.
Unbekannte, abgelaufene und bereits eingelöste Token bekommen dieselbe
Antwort – eine Unterscheidung verriete, ob ein geratenes Token je gültig war.

Eingelöst wird erst auf Knopfdruck, nicht schon beim Öffnen des Links.
Sonst würden Link-Vorschauen in Messengern die Einladung im Vorbeigehen
verbrauchen.

---

## 16. Installation als App und Offlinebetrieb

Die Anwendung lässt sich über das Browsermenü als App installieren
(`manifest.webmanifest`). Der Service Worker legt dabei bewusst nur einen Teil
ab:

| Wird zwischengespeichert            | Wird nicht zwischengespeichert            |
| ----------------------------------- | ----------------------------------------- |
| Python-Laufzeit unter `/pyodide`    | jede HTML-Seite des angemeldeten Bereichs |
| statische Bausteine `/_next/static` | alle Antworten außer GET                  |
| Offlineseite und Symbol             | alles von fremden Ursprüngen              |

Der Grund für die zweite Spalte: Diese Seiten enthalten Lernstand, Namen und
Kohortenzugehörigkeit. Im Browser-Cache blieben sie auch nach dem Abmelden und
auf geteilten Geräten liegen. Lektionen offline lesen zu können wiegt das nicht
auf.

Was bleibt, ist der eigentliche Gewinn: Wer die Laufzeit einmal geladen hat,
kann im Editor auch ohne Verbindung Python ausführen und wartet beim nächsten
Besuch nicht erneut auf rund 13 MB. Ohne Verbindung erscheint eine eigene
Seite, die erklärt, was geht und was nicht – und zuerst die Frage beantwortet,
ob etwas verloren gegangen ist.

In der Entwicklung wird der Service Worker abgemeldet statt angemeldet. Sonst
liefert er nach jeder Änderung veraltete Bausteine aus.

---

## 17. Betrieb und Überwachung

### Endpunkte

| Pfad          | Zweck                                                          |
| ------------- | -------------------------------------------------------------- |
| `/api/health` | Lebenszeichen des Prozesses, ohne Datenbankzugriff             |
| `/api/ready`  | Bereitschaft: Datenbank erreichbar **und** Inhalte eingespielt |

Die Trennung ist beabsichtigt. Ein Neustart, nur weil die Datenbank kurz nicht
erreichbar war, macht die Lage schlimmer statt besser – der Prozess selbst ist
gesund. Deshalb prüft die Lebenszeichen-Abfrage nichts weiter.

`/api/ready` nennt in der Antwort weder Verbindungszeichenfolge noch Hostname
noch Datenbankmeldung. Der Endpunkt ist von außen erreichbar, und eine
hilfreiche Fehlermeldung wäre dort vor allem für Fremde hilfreich. Der Grund
steht im Protokoll.

### Protokolle

Eine JSON-Zeile je Ereignis, mit Zeitstempel, Stufe und Anfragekennung. Eine
Sperrliste entfernt E-Mail-Adressen, Passwörter, Token, eingereichten Code und
Namen, falls sie versehentlich mitgegeben werden. Die Nutzerkennung bleibt
gekürzt erhalten – ohne sie wäre das Protokoll für die Fehlersuche wertlos.

### Prüfkette

`.github/workflows/pythonpfad.yml` läuft bei jeder Änderung unterhalb von
`pythonpfad/`: PostgreSQL als Dienst, Migrationen, Seeding, dann Typecheck,
Lint, Formatprüfung, Vitest, Prüfung aller Musterlösungen, Prüfung der
Ausführungsaufzeichnung, Produktionsbuild und Playwright.

---

## Weitere Dokumentation

| Dokument                                   | Inhalt                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Architekturentscheidungen mit Begründung, Datenmodell, Risiken     |
| [docs/LERNMODELL.md](docs/LERNMODELL.md)   | Kompetenzberechnung, Wiederholungsplanung, Hinweisleiter im Detail |
| [docs/SICHERHEIT.md](docs/SICHERHEIT.md)   | Bedrohungsmodell, Maßnahmen, offene Punkte                         |
| [docs/DATENSCHUTZ.md](docs/DATENSCHUTZ.md) | Welche Daten wozu, Aufbewahrung, Auskunft, Löschung                |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)   | Betrieb, Umgebung, Wartungsaufgaben                                |
