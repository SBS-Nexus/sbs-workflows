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

### Wie eine Lektion aufgebaut ist

Jede Lektion folgt demselben Schema: konkretes Lernziel → Alltagsproblem →
mentales Modell → durchgerechnetes Beispiel mit Zeilenanmerkungen und
Schritt-für-Schritt-Nachvollzug → typische Stolperstellen → Aufgaben mit
abnehmender Hilfestellung → Reflexion → automatische Wiederholungsplanung.

### Kernfunktionen

- **Python im Browser.** Pyodide in einem Web Worker. Kein Nutzercode auf dem
  Server, keine Installation, Endlosschleifen jederzeit stoppbar.
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

```bash
cp .env.example .env          # AUTH_SECRET ersetzen
npm install
docker compose up -d
npm run db:deploy
npm run db:seed
npm run dev
```

---

## 9. Tests

```bash
npm run test              # Unit- und Integrationstests
npm run test:unit         # nur Domainlogik, ohne Datenbank
npm run test:integration  # gegen die Testdatenbank
npm run test:e2e          # Playwright gegen den Produktionsbuild
npm run verify            # Typecheck + Lint + Tests + Build
```

**Stand dieser Version:** 174 Vitest-Tests (140 Unit, 34 Integration) und
8 Playwright-Tests laufen durch; Typecheck, Lint und Build sind fehlerfrei.

### Was geprüft wird

- **Unit:** Kompetenzberechnung, Wiederholungsintervalle, Aufgabenbewertung für
  alle acht Interaktionsformen, Hinweisleiter, deutsche Fehlererklärungen,
  Inhaltsvalidierung, Passwort-Hashing, Ratenbegrenzung, Pfadaufbau,
  Einstufung, Tutor-Leitplanken.
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

## Weitere Dokumentation

| Dokument                                   | Inhalt                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Architekturentscheidungen mit Begründung, Datenmodell, Risiken     |
| [docs/LERNMODELL.md](docs/LERNMODELL.md)   | Kompetenzberechnung, Wiederholungsplanung, Hinweisleiter im Detail |
| [docs/SICHERHEIT.md](docs/SICHERHEIT.md)   | Bedrohungsmodell, Maßnahmen, offene Punkte                         |
| [docs/DATENSCHUTZ.md](docs/DATENSCHUTZ.md) | Welche Daten wozu, Aufbewahrung, Auskunft, Löschung                |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)   | Betrieb, Umgebung, Wartungsaufgaben                                |
