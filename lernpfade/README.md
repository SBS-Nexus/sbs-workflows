# Lernpfade

Vorgeschaltete gemeinsame Homepage für die Lernprodukte im Repository.

## Ziel

Die einzelnen Lernanwendungen bleiben technisch unabhängig, sollen für
Lernende aber wie Module einer Plattform wirken. Dieser Hub übernimmt:

- gemeinsame Dachmarke **Lernpfade**
- Auswahl der verfügbaren Lernpfade
- sichtbare Roadmap künftiger Pfade
- ein gemeinsames Lernmodell
- Einstieg für einen späteren pfadübergreifenden Wiederholungs-/Vokabelmotor

## Lokaler Start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Die Ziel-URLs werden über `NEXT_PUBLIC_*_URL` gesetzt. Solange Git & GitHub
noch in AIPfad lebt, kann `NEXT_PUBLIC_GITPFAD_URL` auf dieselbe Deployment-
Adresse zeigen wie `NEXT_PUBLIC_AIPFAD_URL`.

## Deployment

Als eigenes Vercel-Projekt mit Root Directory `lernpfade/`. Keine Datenbank,
keine Secrets, keine Nutzerkonten. Region: Frankfurt (`fra1`).

## Wiederholen: Live-Quellen (LP-05B)

`/wiederholen` zeigt fällige Wiederholungen aus PythonPfad, SQLPfad und AIPfad
— **schreibgeschützt**. Die Apps bleiben die Systeme der Wahrheit; bewertet und
geplant wird dort. Der Hub ruft je App `GET /api/platform/review-source` aus
dem Browser mit der eigenen Sitzung der App auf; er selbst sieht weder Cookie
noch Nutzerkennung.

- Opt-in: `NEXT_PUBLIC_REVIEW_FEDERATION_SOURCES=python,sql,ai` plus die
  jeweilige `NEXT_PUBLIC_*_URL`.
- Jede App gibt CORS nur für `PLATFORM_HUB_ORIGIN` frei (Vorgabe: aus).
- Live-Daten setzen voraus, dass Hub und Apps same-site sind (gemeinsame
  registrierbare Domain). Unter `*.vercel.app` zeigt der Hub „nicht
  angemeldet".
- Ohne Freischaltung bleibt es beim klar markierten Demo-Deck
  (**DEMO · Beispiel**), dessen Bewertungen nur lokal im Browser bleiben.

Architektur und Begründung: `docs/LEARNING-PLATFORM.md`, Abschnitt 10.

```bash
npm run test       # Review-Domäne: Scheduler, Adapter, Föderation, Abruf + VokabelPfad
npm run typecheck
npm run build
```

## Fortschritt: Plattformfortschritt (LP-07)

`/fortschritt` zeigt deinen Stand in PythonPfad, SQLPfad und AIPfad sowie
deinen lokalen VokabelPfad — **schreibgeschützt**, ohne gemeinsames Konto. Der
Browser ruft je App `GET /api/platform/progress-source` mit der eigenen Sitzung
der App auf (keine Abfrageparameter, nur Aggregate, Schema 1 streng geprüft);
VokabelPfad wird lokal aus IndexedDB gelesen.

- Opt-in: `PROGRESS_FEDERATION_SOURCES=python,sql,ai` (zur Laufzeit gelesen,
  Vorgabe leer = aus) plus die jeweilige `NEXT_PUBLIC_*_URL`. Getrennt von
  der Freischaltung für `/wiederholen`.
- Kein Gesamtprozent, kein Mastery-Score, keine Lernzeit. „Fällig insgesamt"
  nur, wenn alle verbundenen Quellen geantwortet haben.
- Eine offene Seite bleibt aktuell: Vokabeln an Fälligkeit/Tageswechsel und
  nach Speichern in einem anderen Tab, Quellen bei Rückkehr in den Tab
  (höchstens einmal pro Minute).
- Dieselbe Same-Site-Voraussetzung wie LP-05B; unter `*.vercel.app` zeigt der
  Hub „nicht angemeldet".
- Domäne: `src/domain/progress/`, Oberfläche: `src/components/progress/`,
  Route `src/app/fortschritt/`. Vertrag und Semantik:
  `docs/LEARNING-PLATFORM.md`, Abschnitt 12.

## VokabelPfad (LP-06, lokaler MVP)

`/vokabeln`: eigene Decks Englisch ↔ Deutsch, Karten mit Satzkontext und Tags,
beide Lernrichtungen, Daily Review, Statistik, JSON-Import/-Export und zwei
Starterdecks. Gespeichert wird **nur in diesem Browser** (IndexedDB,
Datenbank `lernpfade-vokabeln`; Revisionsprüfung und Schreiben atomar in einer
Transaktion, damit kein Tab einen anderen still überschreibt) — kein Konto,
keine Synchronisation.
Geplant wird mit dem gemeinsamen Review-Core (`src/domain/review/scheduler.ts`).
Exporte sind kompaktes JSON und werden nur erzeugt, wenn sie wieder
importierbar sind (≤ 2 MiB); kein Deck darf darüber hinauswachsen. Statistik
und Fälligkeiten folgen der Uhr auch bei offener Seite (nächste Fälligkeit,
Tageswechsel, Rückkehr in den Tab).

- Domäne und Speicher: `src/domain/vocabulary/` (rein, ohne Browser testbar)
- Oberfläche: `src/components/vocabulary/`, Route `src/app/vokabeln/`
- Beispiel-Import: `public/vokabeln/beispiel-import.json`
- Vertrag, Formate, Grenzen: `docs/LEARNING-PLATFORM.md`, Abschnitt 11

```bash
npm run test       # Unit-Tests (Review-Core, Föderation, VokabelPfad)
npm run test:e2e   # Playwright gegen den Produktionsbuild, ohne Retries
```

`npm run test:e2e` baut selbst (`next build`) und startet `next start` auf
Port 3210. Für die LP-05B-Regression zeigen die Live-Quellen dabei auf lokale
Adressen, die die Tests per `page.route` als **Mocks** beantworten. Lokal
wird ein vorhandenes Chromium unter `PLAYWRIGHT_CHROMIUM_PATH` bzw.
`/opt/pw-browsers/chromium` genutzt, sonst `npx playwright install chromium`.

Abhängigkeiten: Der Hub hat weiterhin kein eingechecktes Lockfile. Die
Testwerkzeuge sind exakt gepinnt (`@playwright/test` 1.62.1,
`@axe-core/playwright` 4.13.0, wie in AIPfad); `overrides` legt
`playwright-core` auf 1.62.1 fest, damit nicht zwei Versionen nebeneinander
installiert werden.

## UI-Kontrakt für die drei Apps

Der Hub definiert die Produktsprache, die in PythonPfad, SQLPfad und AIPfad
schrittweise vereinheitlicht wird:

1. gleiche Dachnavigation und Plattformwechsel
2. gleiche Typografie und Abstands-/Radius-Skala
3. gleiche Button-, Card-, Badge- und Fortschrittsmuster
4. Fachfarbe nur als Akzent; Struktur und Interaktion bleiben gleich
5. gleiche Begriffe für Lernen, Üben, Projekte, Wiederholen, Fortschritt
6. pfadübergreifend dieselbe Logik für Status, Empty States und Fehler

Die Inhaltsdarstellung darf fachlich unterschiedlich bleiben. Ein SQL-Editor
soll kein Python-Editor-Mock sein; Homogenität heißt gemeinsames Produktmodell,
nicht identische Fachkomponenten.
