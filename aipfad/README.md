# AIPfad

Interaktive Lernplattform für AI-Kompetenz — Deutsch, DACH-Zielgruppe.
Geschwisterprojekt von `pythonpfad/` und `sqlpfad/` in diesem Repository,
als eigenständige Next.js-Anwendung.

> **AI verstehen. Werkzeuge beherrschen. Systeme bauen.**

## Diese Ausbaustufe

Volles Zielbild in [`docs/LEHRPLAN.md`](docs/LEHRPLAN.md) — 20 Stufen, 35–50
Lektionen. Diese erste Ausbaustufe baut die Grundlagen zu voller Tiefe statt
den gesamten Umfang oberflächlich:

- **Stufe 0 — Orientierung**: was AIPfad ist, was AI kann/nicht kann, wie
  Fortschritt gemessen wird.
- **Stufe 1 — Technischer Arbeitsplatz** (kompakt): Pfade, Terminal,
  Umgebungsvariablen.
- **Stufe 4 — LLM-Grundlagen**: Tokens, Embeddings, Aufmerksamkeit,
  Training/Inferenz, Kontextfenster, Nachrichtenrollen, Halluzination.
- **Stufe 5 — Prompting-Grundlagen**: Ziel, Kontext, Constraints, Zerlegung,
  Iteration.

13 Lektionen, 17 Aufgaben (6 Interaktionsformen), 4 Labs (Terminal,
Tokenizer, Kontextfenster, Prompt-Reparatur), 17 Konzepte im
Voraussetzungsgraphen. Alles deterministisch — **kein Aufruf an einen
externen AI-Anbieter** in dieser Ausbaustufe (siehe
[`docs/CONTENT-POLICY.md`](docs/CONTENT-POLICY.md)).

## Schnellstart

```bash
cp .env.example .env        # AUTH_SECRET setzen: openssl rand -base64 48
docker compose up -d        # Postgres auf Port 5433
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Demo-Konto nach dem Seeding (nur lokale Entwicklung):
`demo@aipfad.de` / `demo-passwort-lokal`

Details: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Architektur

`domain/` (reine Fachlogik) ← `server/` (Persistenz, Server Actions) ←
`app/`+`components/` (Darstellung). Details und Begründung:
[`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md).

Design-Entscheidungen (Typografie, Farbsystem, Signatur-Element
Wissenslandkarte): [`DESIGN.md`](DESIGN.md).

## Lernmodell

Deterministisches, versioniertes Kompetenzmodell (kein maschinelles
Lernen) — Bänder statt Prozentzahlen, individuelle Wiederholungsplanung,
progressive Hinweisleiter. Details: [`docs/LERNMODELL.md`](docs/LERNMODELL.md).

## Tests

```bash
npm run test:unit          # Domainlogik, keine I/O
npm run test:integration   # Auth + Datenbank (braucht laufendes Postgres)
npm run test:e2e           # Playwright
npm run verify              # typecheck + lint + unit + build
```

Details und aktueller Stand: [`docs/TESTING.md`](docs/TESTING.md).

## Was diese Ausbaustufe bewusst nicht enthält

Git/GitHub, ML/DL-Grundlagen, HTTP/APIs, RAG, Agents, MCP, AI-Coding,
Evals, AI-Sicherheit als eigene Stufe, DACH-Governance/EU-AI-Act,
Organisationen/Kohorten, Live-AI-Gateway, vollständiges Admin-Content-Studio.
Vollständig aufgelistet mit Begründung in
[`docs/LEHRPLAN.md`](docs/LEHRPLAN.md).
