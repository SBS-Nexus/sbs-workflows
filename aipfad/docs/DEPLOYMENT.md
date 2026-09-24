# Deployment

## Status dieser Ausbaustufe

Deployment-Konfiguration ist vorbereitet, aber **nicht produktiv
geschaltet**: keine Domain wurde gekauft, kein Vercel-Projekt mit
laufenden Kosten wurde angelegt. `aipfad/` ist als eigenständiges
Deployment-Ziel vorbereitet (eigenes `vercel.json`, eigene `.env`,
unabhängig von PythonPfad/SQLPfad).

## Lokale Einrichtung

```bash
cp .env.example .env        # DEPLOYMENT_ID lokal z. B. auf `lokal` lassen
docker compose up -d        # Postgres auf Port 5433 (nicht 5432 – Kollision mit pythonpfad vermeiden)
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Produktions-Build

```bash
npm run build
npm run start
```

`npm run verify` führt Typprüfung, Lint, Inhaltsvalidierung, Unit-Tests und Build in Folge aus
und ist das lokale Äquivalent des CI-Gates. Beim Start einer Node.js-Serverinstanz
führt `src/instrumentation.ts` den Konfigurationsvertrag aus, bevor Next.js
Anfragen annimmt.

## Umgebungsvariablen

Siehe `.env.example`. Notwendig: `DATABASE_URL` und `DEPLOYMENT_ID`.
`APP_URL` hat lokal den Standard `http://localhost:3000`; in Produktion muss
sie auf die echte HTTPS-Adresse gesetzt werden. Optional:
`ATTEMPT_RETENTION_DAYS`, `SEED_DEMO_USERS`.

`AUTH_SECRET` gehört nicht mehr zum Vertrag: AIPfad verwendet opake,
kryptografisch zufällige Sitzungstoken und speichert davon nur SHA-256-Hashes;
die frühere Variable wurde von keiner Codezeile verbraucht. Ein nicht
verwendetes Secret als Pflichtvariable vorzutäuschen wäre kein zusätzlicher
Schutz.

## Health/Readiness

- `/api/health` – liegt der Prozess überhaupt (kein Datenbankzugriff).
- `/api/ready` – prüft zusätzlich die Datenbankverbindung. Kein „200 OK,
  obwohl die Datenbank nicht erreichbar ist".

## Region

`vercel.json` setzt `fra1` (Frankfurt) – identisch mit PythonPfad/SQLPfad,
sinnvoll für eine DACH-Zielgruppe und für die Nähe zur Datenbank.

## Nächste Schritte für einen echten Produktivbetrieb

1. Vercel-Projekt für `aipfad/` als eigenständige App verknüpfen
   (Root-Verzeichnis `aipfad/`).
2. Managed-Postgres-Instanz bereitstellen (z. B. über den Vercel
   Marketplace) und `DATABASE_URL` setzen.
3. `DEPLOYMENT_ID` pro Release auf eine unveränderliche Build- oder
   Commit-Kennung setzen. Sie darf keine Zugangsdaten enthalten.
4. `APP_URL` auf die tatsächliche HTTPS-Domain setzen, sobald eine existiert
   (keine vorausgesetzt – siehe oben).
5. Der GitHub-Actions-Workflow für `aipfad/` existiert seit Ausbaustufe 2:
   `.github/workflows/aipfad-ci.yml`. Er führt acht Prüfschritte aus —
   Formatprüfung, Lint, Typecheck, Inhaltsvalidierung, Unit-, Integrations-
   und E2E-Tests sowie den Produktionsbuild — gegen eine echte
   PostgreSQL-Instanz im Lauf.
