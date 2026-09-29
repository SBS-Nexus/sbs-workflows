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

Siehe `.env.example`. Notwendig: `DATABASE_URL`, `DEPLOYMENT_ID` und seit
E04A `CRON_SECRET`. `APP_URL` hat lokal den Standard `http://localhost:3000`;
in Produktion muss sie auf die echte HTTPS-Adresse gesetzt werden. Optional:
`ATTEMPT_RETENTION_DAYS`, `RETENTION_MODE` (Vorgabe `dry-run`),
`SEED_DEMO_USERS`.

`CRON_SECRET` ist Pflicht, weil die Anwendung seit E04A einen Zeitplan hat,
der eine Route mit Löschwirkung aufruft. Ohne Geheimnis wäre entweder die
Route offen oder der Zeitplan wirkungslos — beides still. Mindestens 16
Zeichen; einen Wert erzeugt etwa `openssl rand -base64 32`. `.env.example`
enthält nur einen Platzhalter.

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

## Aufbewahrung in Betrieb nehmen (E04A)

Der geplante Lauf löscht Daten unwiderruflich. Deshalb diese Reihenfolge, und
nicht die kürzere.

**Noch nicht durchgeführt:** Für AIPfad existiert derzeit kein aktives
Vercel-Projekt. Die Schritte unten sind die vorgesehene Einführung, keine
Beschreibung eines erfolgten Vorgangs. In dieser Ausbaustufe wurde keine
Vercel-Einstellung angelegt oder geändert und kein echtes Geheimnis erzeugt.

1. `CRON_SECRET` in der Bereitstellungsumgebung setzen — eigener, zufälliger
   Wert, mindestens 16 Zeichen, nicht der Platzhalter aus `.env.example`.
2. `RETENTION_MODE=dry-run` setzen.
3. Bereitstellen.
4. Den nächsten planmäßigen Lauf abwarten oder die Route einmal von Hand mit
   dem Geheimnis aufrufen, und das Protokoll ansehen
   (`retention_run_completed`).
5. Die gemeldeten Kandidatenzahlen prüfen: Passen sie zur Erwartung? Eine
   unerwartet hohe Zahl ist der Grund, warum dieser Schritt vor dem nächsten
   steht.
6. Erst dann `RETENTION_MODE=execute` setzen — ausdrücklich, nicht nebenbei.
7. Erneut bereitstellen.
8. Den nächsten Lauf prüfen: Status `success`, Löschzahlen plausibel.
9. Weiter beobachten. Ein Lauf mit `partial-failure` oder `failed` antwortet
   mit 500 und ist in der Aufrufübersicht sichtbar.

**Zeitplan.** `vercel.json` enthält genau einen Eintrag:
`/api/cron/retention`, `0 3 * * *`. Vercel-Zeitpläne laufen nach **UTC**. Der
Zeitpunkt ist nicht auf die Sekunde zugesichert. Vercel wiederholt einen
fehlgeschlagenen Aufruf nicht automatisch — die Wiederholung ist der nächste
planmäßige Lauf, der die liegengebliebenen Daten mit erfasst.

**Rücknahme.** Zum Anhalten `RETENTION_MODE=dry-run` setzen **und erneut
bereitstellen** — genau wie in Schritt 6 und 7 oben. Die Umgebungsvariable
allein wirkt nicht: Sie greift erst in einer neuen Bereitstellung, und
`getEnv()` hält das geprüfte Ergebnis zusätzlich je Prozess fest, sodass eine
bereits laufende, warme Instanz ihren alten Modus behält. Danach zählt der
Lauf weiter und löscht nichts. Dauerhaft abschalten heißt, den Eintrag aus
`crons` zu entfernen oder eine frühere `vercel.json` bereitzustellen.

Soll sofort nichts mehr gelöscht werden und ist die Zeit für eine
Bereitstellung zu knapp, hilft keine der Konfigurationsvariablen:
`ATTEMPT_RETENTION_DAYS=0` ist dieselbe Variable mit derselben Bedingung, und
den Eintrag aus `crons` zu entfernen heißt, `vercel.json` zu ändern — also
wieder eine Bereitstellung. Ohne neue Bereitstellung wirkt nur, das Projekt
in der Vercel-Oberfläche anzuhalten; das verhindert zugleich jeden anderen
Aufruf der Anwendung.

Was eine Rücknahme NICHT leistet: Bereits gelöschte Zeilen kommen dadurch
nicht zurück. Weder ein Code-Rückbau noch das Umschalten auf `dry-run` stellt
Daten wieder her. Dafür bräuchte es eine Sicherung; eine solche gibt es in
dieser Ausbaustufe nicht, und ihr Aufbau gehört zu E10. Genau deshalb steht
der Trockenlauf vor dem Ernstfall.

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
