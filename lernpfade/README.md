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

Auf Railway: Projekt `sbs-lernpfade-staging`, Umgebung `staging`, Service
`lernpfade-hub`. Keine Datenbank, keine Secrets, keine Nutzerkonten. Vercel wird
für den Hub nicht mehr verwendet (`vercel.json` am 18.11.2026 entfernt).

- Quelle `SBS-Nexus/sbs-workflows`, Root Directory `/lernpfade`, Builder
  Railpack, Build `npm run build`, Start `npm run start -- --hostname 0.0.0.0`.
- **Kein automatischer Deploy:** Es gibt keinen Branch-Trigger. Ausgerollt wird
  gezielt ein Commit, über „Deploy" im Dashboard oder per
  `railway api 'mutation { serviceInstanceDeployV2(serviceId: "…", environmentId: "…", commitSha: "<sha>") }'`.
  Zurücknehmen heißt, den vorherigen Commit genauso erneut auszurollen.
- Adresse `https://lernpfade-hub-staging.up.railway.app`. Der Schlafmodus ist an;
  der erste Aufruf nach einer Pause weckt den Dienst.
- `NEXT_PUBLIC_*` wirken beim Bauen. Nach einer Änderung neu ausrollen.
- `*.up.railway.app` ist wie `*.vercel.app` ein Public Suffix. Hub und Apps sind
  unter diesen Adressen nie same-site; Live-Wiederholungen und Fortschritt
  brauchen eine gemeinsame eigene Domain (siehe unten).

## Learning OS (Startseite und Lernansichten)

Seit LO-UI-001 tragen `/`, `/vokabeln`, `/wiederholen` und `/fortschritt` das
Learning-OS-Design der geprüften Studie `/design-preview` (PR #77): dunkle
Editorial-Flächen, eigener Wissensorbit (SVG/CSS), Signal-Lime/Mint, helle
Papierflächen für die Arbeit.

- Eine Umsetzung für `/` und `/design-preview`: `src/components/learning-os/`.
  Die Studie bleibt bis zur Freigabe als `noindex`-Referenz erhalten.
- Eine Kopfzeile für alle Routen (`src/components/site-header.tsx`).
- Designsystem in `src/styles/learning-os.css`; die gemeinsamen Verträge
  (`learning-components.css`, `learning-feedback.css`) bleiben bytegleich.
- Pfadziele und Status nur aus `src/lib/catalog.ts`; ohne konfigurierte
  Adresse kein Link, sondern „Noch nicht verbunden".
- Keine externen Fonts, CDNs, Tracker oder Fremdanfragen; keine erfundenen
  Fortschrittswerte.

Entscheidungen, Gates und bekannte Grenzen:
`docs/LEARNING-OS-DESIGN-20261116.md`, Abschnitt 8.

Die frühere Startseiten-Hero „Liquid Sculpture" ist mit LO-UI-001 entfernt
(Code, Bilder, Tests); ihre Dokumentation bleibt als Archiv in
`docs/LIQUID-HERO.md`.

## Anmeldung über das gemeinsame Konto (E4.5b)

Der Hub meldet über konto.lernpfade.net an, wie PythonPfad, SQLPfad und
AIPfad. Er hat keine Datenbank. Die Sitzung liegt deshalb verschlüsselt im
Cookie (JWE, `dir` + `A256GCM`, `__Host-`, `httpOnly`), und der Browser kann
sie nicht lesen.

- Routen:
  - `/auth/anmelden` (Start, `?ziel=`) und `/auth/rueckkehr`;
  - `/auth/abmelden` (POST, weiter zum Abmelden beim Konto);
  - `/auth/status` für die Kopfzeile, damit die Seiten statisch bleiben.
- Code-Flow mit PKCE, `state` und `nonce`. Der signierte Anmeldezustand ist
  eine bytegleiche Kopie aus dem Anmeldevertrag
  (`src/server/konto/zentral-zustand.ts`, Drift-Check).
- Das Zugriffstoken ist ein JWT, gilt 15 Minuten und wird über das
  Aktualisierungstoken erneuert. Ab E4.5c ruft der Hub damit von seinem Server
  aus die Plattformquellen der Apps ab.
- Ohne die fünf Werte aus `.env.example` bleibt alles wie bisher.
- Strecke gegen echten ZITADEL: `playwright.konto.config.ts`
  (`e2e-konto/hub-anmeldung.spec.ts`), in der CI als Job „Anmeldung im Hub
  gegen echten ZITADEL“.

## Organisationen (E5.1)

Eine Organisation für alle Lernpfade (`docs/E5-PLAN.md`). Der Hub bekommt
dafür eine eigene Postgres-Datenbank (`DATABASE_URL`, Prisma 7.10.1). Ohne sie
gibt es die Seiten nicht, und alles bleibt wie bisher.

- **Seiten:**
  - `/organisation`: eigene Mitgliedschaften und eine neue Organisation
    anlegen.
  - `/organisation/[kuerzel]`: Plätze, Einladen, Mitglieder, Name und
    Prüfprotokoll.
  - `/einladung/[token]`: Beitritt.
- **Rollen:** Admin, Lehrkraft, Lernend. Nur Lernende belegen einen Platz;
  die Testphase hat 10. Admin und Lehrkraft brauchen den zweiten Faktor
  (`amr` enthält `mfa`). Fehlt er, führt die Seite zur Einrichtung beim Konto
  und zur frischen Anmeldung (`/auth/anmelden?bestaetigen=1`).
- **Einladungen:**
  - Gespeichert wird nur der SHA-256-Hash des Tokens.
  - Gültig 14 Tage; ein offener Link für bis zu 500 Personen oder, an eine
    bestätigte Adresse gebunden, genau einmal.
  - Beitritte sperren die Organisation in der Transaktion, damit Plätze nie
    überbucht werden.
- **Teams (E5.2):** `/organisation/[kuerzel]/teams/[team]` für Admin und
  Lehrkraft.
  - Einladungen optional direkt in ein Team.
  - Die Einwilligung „Stand namentlich zeigen“ gilt je Team und ändert nur
    die Person selbst (`src/server/organisation/teams.ts`).
- **Rechte** prüft der Dienst (`src/server/organisation/dienst.ts`), nicht die
  Seite. Die Regeln stehen rein in `src/domain/organisation/regeln.ts`.
- **Prüfprotokoll:** wer wann was verwaltet hat, nie Lernverhalten.
- **Tests:**
  - Einheiten (`npm run test`);
  - Integration gegen Postgres (`TEST_DATABASE_URL=… npm run test:integration`
    nach `npm run db:deploy`), auch mit gleichzeitigen Beitritten;
  - Strecke gegen echten ZITADEL (`e2e-konto/hub-organisation.spec.ts`) mit
    einem Testkonto mit Authenticator-App.
- `prisma` (CLI) steht unter `dependencies`, nicht `devDependencies`: Railway
  baut den Hub mit `NODE_ENV=production` und installiert dann nur die
  Abhängigkeiten zur Laufzeit. `prisma generate` (postinstall) und die
  Migration vor dem Start (`npm run db:deploy`) brauchen die CLI.
- `effect` ist per `overrides` auf 3.22.4 gesetzt. Prisma pinnt 3.20.0, das
  vom Advisory GHSA-7589-6fvf-x4pw betroffen ist.

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
  registrierbare Domain). Unter Plattform-Adressen wie `*.up.railway.app` oder
  `*.vercel.app` (Public Suffix) zeigt der Hub „nicht angemeldet".
- Ohne Freischaltung bleibt es beim klar markierten Demo-Deck
  (**DEMO · Beispiel**), dessen Bewertungen nur lokal im Browser bleiben.

Mit dem gemeinsamen Konto (E4.5c) gilt derselbe Weg wie bei `/fortschritt`
(unten): Der Browser fragt einmal `/api/hub/wiederholen`, der Hub-Server holt
jede Quelle mit seinem Zugriffstoken (`limit` wie bisher `perSource`).
Geprüft und sortiert wird im Browser wie bisher.

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
- Dieselbe Same-Site-Voraussetzung wie LP-05B; unter Plattform-Adressen wie
  `*.up.railway.app` (Public Suffix) zeigt der Hub „nicht angemeldet".
- Domäne: `src/domain/progress/`, Oberfläche: `src/components/progress/`,
  Route `src/app/fortschritt/`. Vertrag und Semantik:
  `docs/LEARNING-PLATFORM.md`, Abschnitt 12.

### Mit dem gemeinsamen Konto (E4.5c)

Ist man im Hub angemeldet, holt der Hub-Server den Fortschritt selbst. Der
Browser fragt einmal `/api/hub/fortschritt` (gleiche Herkunft). Der Server
ruft jede App mit konfigurierter Adresse mit seinem Zugriffstoken ab
(`Authorization: Bearer`, von den Apps geprüft) und reicht Status und
Antwort je Quelle durch.

- Ein einziger Abruf, weil das Aktualisieren des Zugriffstokens nur einmal
  gleichzeitig laufen darf.
- Die Freischaltung `PROGRESS_FEDERATION_SOURCES` und dieselbe Website sind
  dafür nicht nötig.
- Kennt eine App die Person noch nicht, zeigt der Hub den Hinweis „… kennt
  dein Lernpfade-Konto noch nicht“ und den Weg dorthin. Ein Klick meldet
  dort ohne Passwort an und verbindet das Konto.
- Ist das Konto eingerichtet, ersetzt dieser Weg den Browserabruf (LP-05B,
  LP-07) ganz. Nicht angemeldet bieten `/fortschritt` und `/wiederholen` die
  Anmeldung an, statt aus dem Browser „nicht angemeldet“ einzusammeln.
- Lehnt das Konto das Aktualisieren ab (abgemeldet), endet die Sitzung im
  Hub, und die Seite bietet „Erneut anmelden“. Ist das Konto nur nicht
  erreichbar, bleibt die Sitzung; die Quellen gelten dann als nicht
  erreichbar.
- Gemeinsamer Ablauf beider Sammelrouten: `src/server/konto/hub-quellen.ts`,
  Abruf der Quellen: `src/server/konto/quellen.ts`. Je Abruf eine
  Protokollzeile „Quellen über den Hub“ mit Route, Dauer und Status je
  Quelle, ohne Kennung der Person.

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
