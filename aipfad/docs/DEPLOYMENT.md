# Deployment

## Status dieser Ausbaustufe

Deployment-Konfiguration ist vorbereitet, aber **nicht produktiv
geschaltet**. Es gibt keine Domain und noch keinen Railway-Service für
AIPfad. Zielplattform ist Railway, wie für den Lernpfade-Hub. Bis zum
18.11.2026 war Vercel vorgesehen; `vercel.json` ist seitdem entfernt.
`aipfad/` bleibt ein eigenständiges Deployment-Ziel, mit eigener Datenbank
und eigener Konfiguration, unabhängig von PythonPfad und SQLPfad.

Reihenfolge, Gates und offene Entscheidungen für den Umzug stehen im
Umzugsplan ([PR #81](https://github.com/SBS-Nexus/sbs-workflows/pull/81),
`docs/RAILWAY-UMZUG-FACHAPPS.md`). Die Schritte unten sind die vorgesehene
Einführung, keine Beschreibung eines erfolgten Vorgangs.

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

- `/api/health` – liegt der Prozess überhaupt (kein Datenbankzugriff). Das
  ist der Healthcheck von Railway beim Ausrollen.
- `/api/ready` – prüft zusätzlich die Datenbankverbindung. Kein „200 OK,
  obwohl die Datenbank nicht erreichbar ist".

## Betrieb auf Railway

Im Railway-Projekt kommen drei Services dazu:

| Service            | Quelle                                                | Aufgabe                                  |
| ------------------ | ----------------------------------------------------- | ---------------------------------------- |
| `aipfad-db`        | Railway PostgreSQL, EU-Region                         | Datenbank, nur über das private Netz     |
| `aipfad`           | dieses Repository, Root Directory `/aipfad`, Railpack | die Anwendung                            |
| `aipfad-retention` | Image `curlimages/curl`, feste Version samt Digest    | ruft den Aufbewahrungslauf auf und endet |

Einstellungen des Service `aipfad`:

| Einstellung      | Wert                                           |
| ---------------- | ---------------------------------------------- |
| Build Command    | leer lassen (Vorgabe `npm run build`)          |
| Pre-Deploy       | `sh -c "npm run db:deploy && npm run db:seed"` |
| Start Command    | `npm run start -- --hostname 0.0.0.0`          |
| Healthcheck Path | `/api/health`                                  |
| Branch-Trigger   | keiner; ausgerollt wird gezielt ein Commit     |

Variablen: `DATABASE_URL` als Referenz `${{aipfad-db.DATABASE_URL}}`,
`APP_URL`, `CRON_SECRET` (neu erzeugt), `RETENTION_MODE=dry-run` und
`DEPLOYMENT_ID`. Für `DEPLOYMENT_ID` ist die Referenz
`${{RAILWAY_GIT_COMMIT_SHA}}` vorgesehen. Sie ist unveränderlich je
Bereitstellung und enthält keine Zugangsdaten. Ob der Konfigurationsvertrag
den Wert annimmt, prüft der erste Start.

Das Pre-Deploy läuft zwischen Build und Start, im privaten Netz. Scheitert es,
wird nicht ausgerollt, und die bisherige Bereitstellung läuft weiter.
`RAILPACK_PRUNE_DEPS` bleibt ungesetzt, weil `prisma` und `tsx` in den
`devDependencies` stehen und dort gebraucht werden.

Ausgerollt und zurückgenommen wird wie beim Hub: gezielt einen Commit per
„Deploy" oder `railway api 'mutation { serviceInstanceDeployV2(…) }'`, zurück
mit dem vorigen Commit. Eingespielte Migrationen bleiben dabei eingespielt.

## Aufbewahrung in Betrieb nehmen (E04A)

Der geplante Lauf löscht Daten unwiderruflich. Deshalb diese Reihenfolge, und
nicht die kürzere.

**Noch nicht durchgeführt:** Für AIPfad existiert derzeit kein Railway-Service.
In dieser Ausbaustufe wurde keine Einstellung angelegt oder geändert und kein
echtes Geheimnis erzeugt.

1. `CRON_SECRET` im Service `aipfad` setzen — eigener, zufälliger Wert,
   mindestens 16 Zeichen, nicht der Platzhalter aus `.env.example`.
2. `RETENTION_MODE=dry-run` setzen.
3. Bereitstellen.
4. Den Cron-Service `aipfad-retention` anlegen (unten) und den ersten Lauf
   einmal von Hand auslösen. Das Protokoll von `aipfad` ansehen
   (`retention_run_completed`).
5. Die gemeldeten Kandidatenzahlen prüfen: Passen sie zur Erwartung? Eine
   unerwartet hohe Zahl ist der Grund, warum dieser Schritt vor dem nächsten
   steht. Mehrere planmäßige Läufe abwarten.
6. Erst dann `RETENTION_MODE=execute` setzen — ausdrücklich, nicht nebenbei.
7. Railway rollt nach dem Speichern neu aus. Das ist nötig: `getEnv()` hält das
   geprüfte Ergebnis je Prozess fest, sodass eine laufende Instanz ihren alten
   Modus behalten würde.
8. Den nächsten Lauf prüfen: Status `success`, Löschzahlen plausibel.
9. Weiter beobachten. Ein Lauf mit `partial-failure` oder `failed` antwortet
   mit 500; der Cron-Service endet dann mit einem Fehler, und Railway zeigt
   den Lauf als fehlgeschlagen.

**Zeitplan.** Der Service `aipfad-retention` hat den Cron Schedule
`0 3 * * *`. Railway rechnet in **UTC**, und die Minute ist nicht zugesichert.
Läuft der vorige Lauf noch, überspringt Railway den neuen. Variablen:

- `CRON_SECRET=${{aipfad.CRON_SECRET}}`
- `RETENTION_URL=https://${{aipfad.RAILWAY_PUBLIC_DOMAIN}}/api/cron/retention`
  (mit eigener Domain deren Adresse)

Start Command:

```sh
sh -c 'exec curl --fail-with-body -sS --max-time 300 --retry 3 --retry-delay 20 --retry-connrefused -H "Authorization: Bearer $CRON_SECRET" "$RETENTION_URL"'
```

Der Aufruf geht über die öffentliche Adresse: Sie weckt einen schlafenden
Service zuverlässig, und das Geheimnis reist per TLS. Der erste Aufruf nach
einer Pause kann mit 502 antworten, während AIPfad startet. `--retry`
wiederholt dann. Das ist erlaubt, weil der Lauf mehrfach ausführbar ist.
Scheitern alle Versuche, ist die Wiederholung der nächste planmäßige Lauf, der
die liegengebliebenen Daten mit erfasst.

**Rücknahme.** Zum Anhalten `RETENTION_MODE=dry-run` setzen; Railway rollt neu
aus, danach zählt der Lauf weiter und löscht nichts. **Sofort und ohne neue
Bereitstellung von AIPfad** hilft, den Cron Schedule von `aipfad-retention`
zu leeren oder den Service zu entfernen. Dann ruft niemand mehr die Route auf,
und die Anwendung selbst läuft unverändert weiter. Auf Vercel ging das nur
über eine neue Bereitstellung oder das Anhalten des ganzen Projekts.

`ATTEMPT_RETENTION_DAYS=0` schaltet die Regel ab, wirkt aber ebenfalls erst
mit der neuen Bereitstellung.

Was eine Rücknahme NICHT leistet: Bereits gelöschte Zeilen kommen dadurch
nicht zurück. Weder ein Code-Rückbau noch das Umschalten auf `dry-run` stellt
Daten wieder her. Dafür bräuchte es eine Sicherung; eine solche gibt es in
dieser Ausbaustufe nicht, und ihr Aufbau gehört zu E10. Genau deshalb steht
der Trockenlauf vor dem Ernstfall.

## Nächste Schritte für einen echten Produktivbetrieb

1. Die drei Railway-Services oben anlegen (Umzugsplan, Phase 2).
2. Datenbanksicherungen einschalten, bevor echte Konten entstehen und bevor
   `RETENTION_MODE=execute` gesetzt wird (E10).
3. `APP_URL` auf die tatsächliche HTTPS-Domain setzen, sobald eine existiert.
   Für Live-Daten im Lernpfade-Hub muss sie unter derselben registrierbaren
   Domain liegen wie der Hub; `*.up.railway.app` ist ein Public Suffix.
4. Der GitHub-Actions-Workflow für `aipfad/` existiert seit Ausbaustufe 2:
   `.github/workflows/aipfad-ci.yml`. Er führt acht Prüfschritte aus —
   Formatprüfung, Lint, Typecheck, Inhaltsvalidierung, Unit-, Integrations-
   und E2E-Tests sowie den Produktionsbuild — gegen eine echte
   PostgreSQL-Instanz im Lauf.
