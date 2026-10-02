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
npm run test       # Review-Domäne: Scheduler, Adapter, Föderation, Abruf
npm run typecheck
npm run build
```

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
