# Deployment

## Status dieser Ausbaustufe

Deployment-Konfiguration ist vorbereitet, aber **nicht produktiv
geschaltet**: keine Domain wurde gekauft, kein Vercel-Projekt mit
laufenden Kosten wurde angelegt. `aipfad/` ist als eigenständiges
Deployment-Ziel vorbereitet (eigenes `vercel.json`, eigene `.env`,
unabhängig von PythonPfad/SQLPfad).

## Lokale Einrichtung

```bash
cp .env.example .env        # AUTH_SECRET mit `openssl rand -base64 48` setzen
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

`npm run verify` führt Typprüfung, Lint, Unit-Tests und Build in Folge aus
und ist das lokale Äquivalent des CI-Gates.

## Umgebungsvariablen

Siehe `.env.example`. Notwendig: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`.
Optional: `ATTEMPT_RETENTION_DAYS`, `SEED_DEMO_USERS`.

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
3. `AUTH_SECRET` produktiv erzeugen und als Secret hinterlegen, nie ins
   Repository.
4. `APP_URL` auf die tatsächliche Domain setzen, sobald eine existiert
   (keine vorausgesetzt – siehe oben).
5. GitHub-Actions-Workflow (`../.github/workflows/`, sofern vorhanden)
   um einen `aipfad`-spezifischen Job ergänzen, der `npm run verify` in
   `aipfad/` ausführt, bevor ein Preview-Deployment entsteht.
