# Betrieb auf Railway

Diese Anleitung beschreibt den Weg von diesem Repository zu einer erreichbaren
Installation auf Railway. Sie ersetzt die frühere Anleitung für Vercel; die
Vercel-Konfiguration (`vercel.json`) ist seit dem 18.11.2026 entfernt.

**Stand 18.11.2026: Staging läuft** unter
`https://pythonpfad-staging.up.railway.app`, eingerichtet genau wie unten
beschrieben. Es gibt noch keine eigene Domain und keine Sicherungen. Ergebnisse
der Gates und offene Entscheidungen stehen im Umzugsplan
`docs/RAILWAY-UMZUG-FACHAPPS.md` im Wurzelverzeichnis des Repositories.

Ergänzt [DOMAIN.md](./DOMAIN.md) (Domain bei Strato, Weg A und C) und
[DEPLOYMENT.md](./DEPLOYMENT.md) (Betrieb auf eigenem Server).

---

## Was Railway mitbringt

Railway führt den Anwendungsprozess **dauerhaft** aus, nicht in kurzlebigen
Funktionen. PostgreSQL läuft als eigener Service im selben Projekt und ist nur
über das private Netz erreichbar.

Daraus folgen zwei Unterschiede zur früheren Vercel-Anleitung:

- **Kein Pooler nötig.** Ein langlebiger Prozess hält einen kleinen eigenen
  Verbindungspool. Anwendung und Migration nutzen dieselbe
  `DATABASE_URL`; die Regel „App gepoolt, Migration direkt" entfällt.
- **Zur Bauzeit gibt es kein privates Netz.** Der Build erreicht die
  Datenbank nicht. Das ist richtig so: `next build` braucht sie nicht (siehe
  Abschnitt 8).

---

## 1. Datenbank anlegen

Im Railway-Projekt: **New → Database → PostgreSQL**. Den Service
`pythonpfad-db` nennen und dieselbe EU-Region wählen wie für die Anwendung.
Railway legt die Verbindungsangaben als Variablen des Datenbank-Service an.

---

## 2. Service anlegen

**New → GitHub Repo → `SBS-Nexus/sbs-workflows`**, Service `pythonpfad`.
Danach unter **Settings**:

| Einstellung      | Wert                                           |
| ---------------- | ---------------------------------------------- |
| Root Directory   | `/pythonpfad`                                  |
| Builder          | Railpack                                       |
| Build Command    | leer lassen (Vorgabe `npm run build`)          |
| Pre-Deploy       | `sh -c "npm run db:deploy && npm run db:seed"` |
| Start Command    | `npm run start -- --hostname 0.0.0.0`          |
| Healthcheck Path | `/api/health`                                  |
| Branch-Trigger   | keiner, ausgerollt wird gezielt (Abschnitt 5)  |
| Region           | EU, dieselbe wie die Datenbank                 |

**Root Directory ist der Punkt, an dem es sonst scheitert.** Die Anwendung liegt
im Unterverzeichnis `pythonpfad`, nicht im Wurzelverzeichnis des Repositories.

Railpack nimmt die Node-Version aus `engines` (22 oder neuer). Beim Installieren
läuft `postinstall` und kopiert die Python-Laufzeit (Pyodide, rund 13 MB) nach
`public/pyodide`. `RAILPACK_PRUNE_DEPS` bleibt ungesetzt: `prisma` und `tsx`
stehen in den `devDependencies` und werden im Pre-Deploy gebraucht.

Ohne `--hostname 0.0.0.0` lauscht `next start` nicht auf der Adresse, über die
Railway die Anfragen zustellt. Den Port setzt Railway über `PORT`, und
`next start` liest ihn von selbst.

---

## 3. Variablen

Unter **Variables** des Service `pythonpfad`:

| Name                           | Wert                                             |
| ------------------------------ | ------------------------------------------------ |
| `DATABASE_URL`                 | Referenz `${{pythonpfad-db.DATABASE_URL}}`       |
| `AUTH_SECRET`                  | frisch erzeugen, siehe unten                     |
| `APP_URL`                      | die `https`-Adresse, unter der Besucher ankommen |
| `ATTEMPT_RETENTION_DAYS`       | `365`                                            |
| `SEED_DEMO_USERS`              | `false`                                          |
| `NEXT_PUBLIC_LEARNING_HUB_URL` | Adresse des Lernpfade-Hubs                       |
| `PLATFORM_HUB_ORIGIN`          | erst mit gemeinsamer Domain (Abschnitt 6)        |

`AUTH_SECRET` erzeugen mit:

```bash
openssl rand -base64 48
```

Die Konfigurationsprüfung verlangt mindestens 32 Zeichen. Derzeit liest keine
Codezeile den Wert darüber hinaus. Er wird trotzdem wie ein Geheimnis behandelt:
nicht im Repository, nicht in einer Notiz, nicht in einem Chat.

`SEED_DEMO_USERS` steht hier ausdrücklich auf `false`. Das Seeding ignoriert den
Schalter in Produktion ohnehin, aber doppelt hält besser: Die Beispielkonten
haben Passwörter, die im Repository stehen.

`APP_URL` ist nicht kosmetisch. Daran hängen drei Dinge: das `Secure`-Kennzeichen
der Sitzungs-Cookies, die `Strict-Transport-Security`-Kopfzeile aus
`src/proxy.ts` und die kanonischen Adressen in `sitemap.xml`, `robots.txt` und
den Vorschaubildern. Steht dort die falsche Adresse, funktioniert die Anmeldung
scheinbar, aber die Cookies sind unsicher. `APP_URL` gehört deshalb zur
Betriebsumgebung, nicht zum Übersetzungsvorgang. Deshalb werden diese Dateien
zur Laufzeit erzeugt.

Gespeicherte Variablen rollt Railway mit einer neuen Bereitstellung aus.
`NEXT_PUBLIC_*` wirkt beim Bauen und braucht diese neue Bereitstellung
zwingend.

---

## 4. Migrationen und Inhalte

Das Pre-Deploy-Kommando aus Abschnitt 2 läuft bei jeder Bereitstellung:

- **zwischen Build und Start**, in einem eigenen Container,
- **im privaten Netz**, mit den Variablen des Service,
- **ohne Wiederholung**: Scheitert es, wird nicht ausgerollt, und die bisherige
  Bereitstellung läuft weiter. Damit geht kein Code live, dessen Schema fehlt.

`db:deploy` spielt nur eingecheckte Migrationen ein und erzeugt keine neuen. Das
ist der richtige Befehl für Produktion; `db:migrate` ist es nicht.

`db:seed` gleicht die Lerninhalte mit dem Repository ab (`upsert`). Beispielkonten
legt es nur bei ausdrücklichem `SEED_DEMO_USERS=true` an.

> **Früher galt hier: Migrationen von Hand, nie im Build.** Der Grund bleibt
> richtig: Eine eingespielte Migration nimmt kein Rückbau des Codes zurück, egal
> wer sie eingespielt hat. Neu ist nur der Zeitpunkt: Railway spielt sie vor dem
> Start ein und bricht bei einem Fehler ab, statt nebenbei im Build. Migrationen
> sind deshalb weiter nur vorwärts gedacht und müssen zum vorigen Code passen.

---

## 5. Ausrollen und zurücknehmen

Es gibt keinen Branch-Trigger, genau wie beim Hub. Ausgerollt wird gezielt ein
Commit, über „Deploy" im Dashboard oder per API:

```bash
railway api 'mutation { serviceInstanceDeployV2(serviceId: "…", environmentId: "…", commitSha: "<sha>") }'
```

**Zurücknehmen** heißt, den vorigen Commit genauso erneut auszurollen.
Migrationen bleiben dabei eingespielt (Abschnitt 4).

---

## 6. Domain verbinden

Unter **Settings → Networking → Custom Domain** die Adresse eintragen. Railway
nennt daraufhin einen `CNAME` und einen `TXT`-Eintrag zur Bestätigung. **Nur
diese Anzeige ist maßgeblich**; die Werte gehören zu genau diesem Service.

- Railway vergibt **keine feste IP-Adresse**. Einen `A`-Eintrag gibt es nicht.
- Die Domain ohne Subdomain (`@`) geht nur bei einem DNS-Anbieter mit
  CNAME-Flattening oder `ALIAS`. Strato bietet das nicht (DOMAIN.md,
  Abschnitt 3). Also entweder eine Subdomain nehmen oder die Nameserver zu einem
  Anbieter mit Flattening verlegen, etwa Cloudflare.
- Live-Wiederholungen und Fortschritt im Hub brauchen eine **gemeinsame**
  registrierbare Domain für Hub und App. `*.up.railway.app` ist ein Public
  Suffix; dort sind Hub und App nie same-site.
- Den vorhandenen Eintrag auf Stratos Parkseite entfernen, auch den
  `AAAA`-Eintrag. Sonst landet ein Teil der Aufrufe weiter auf der Parkseite.

Reihenfolge: erst die Domain eintragen und warten, bis Railway das Zertifikat
ausgestellt hat. **Dann** `APP_URL` umstellen. Umgekehrt verweist die Seite
zwischendurch auf eine Adresse, die noch nicht antwortet.

---

## 7. Prüfen

```bash
curl -sI https://<adresse> | grep -i "strict-transport\|content-security"
curl -s  https://<adresse>/api/health
curl -s  https://<adresse>/api/ready
curl -s  https://<adresse>/robots.txt
```

Erwartet:

- `Strict-Transport-Security: max-age=…` ist vorhanden. Fehlt die Kopfzeile,
  steht `APP_URL` nicht auf der `https`-Adresse.
- `/api/health` antwortet mit `{"status":"ok",…}`. Es fragt bewusst nicht die
  Datenbank ab, es sagt nur, dass der Prozess läuft.
- `/api/ready` antwortet mit 200. Antwortet es mit einem Fehler, stimmt
  `DATABASE_URL` nicht, die Migrationen fehlen, oder der Seed ist nicht gelaufen
  (`no-content`).
- `robots.txt` nennt `https://<adresse>/sitemap.xml` und nicht `localhost`.

Von außen, ohne etwas zu ändern, prüft das SQLPfad-Skript dieselbe Fehlerklasse
für jede Adresse:
`cd ../sqlpfad && npm run auslieferung:pruefen -- https://<adresse>`.

Danach einmal von Hand: registrieren, Einstufung durchlaufen, eine Lektion
öffnen, Code ausführen. Der letzte Schritt prüft nebenbei, ob die
Python-Laufzeit ausgeliefert wird – rund 13 MB unter `/pyodide`, die beim ersten
Aufruf geladen und danach ein Jahr im Browser zwischengespeichert werden.

Zuletzt die Ratengrenze: Fehlversuche bei der Anmeldung mit jeweils anderen
Werten in `X-Real-IP`, `X-Forwarded-For` und `X-Vercel-Forwarded-For`
müssen alle im selben Zähler landen. Die Regel steht in
`src/server/security/client-ip.ts`.

---

## 8. Wenn der Bau scheitert

### `ENOENT: no such file or directory, open '…/.env'`

So sah die Meldung auf Vercel aus:

```
Failed to load config file "/vercel/path0/pythonpfad" as a TypeScript/JavaScript
module. Error: ENOENT: no such file or directory, open '/vercel/path0/pythonpfad/.env'
```

Die Meldung nennt die Konfigurationsdatei, die Ursache steht aber erst am
Zeilenende: Es fehlt die `.env`. In einer Bereitstellungsumgebung gibt es sie
nie – die Werte stehen dort bereits in `process.env`.

Behoben in `prisma.config.ts` und vier weiteren Stellen: `.env` wird nur noch
geladen, wenn sie vorhanden ist. `tests/unit/konfiguration-ohne-env.test.ts`
hält das fest. Tritt die Meldung erneut auf, ist irgendwo ein ungeprüftes
`process.loadEnvFile` dazugekommen – das `?.` davor genügt **nicht**, es
schützt nur gegen alte Node-Fassungen, nicht gegen die fehlende Datei.

### `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`

`prisma generate` braucht keine Datenbank, wertet aber `prisma.config.ts`
vollständig aus. Steht die Verbindungszeichenfolge dort fest verdrahtet, bricht
schon das Erzeugen des Clients ab. Ebenfalls behoben; die Angabe ist jetzt
davon abhängig, ob die Variable gesetzt ist.

Tritt die Meldung im Pre-Deploy auf (`migrate` oder `db seed`), ist sie dagegen
richtig: Dort wird die Datenbank wirklich gebraucht. Dann fehlt die Referenz in
`DATABASE_URL`.

### Der Build versucht, die Datenbank zu erreichen

Zur Bauzeit gibt es kein privates Netz, also scheitert jeder Verbindungsversuch.
Ursache ist dann eine Seite, die beim Vorrendern Daten liest. Datenbanknahe
Seiten sind `force-dynamic`. Fehlt das an einer neuen Seite, gehört es dort
hin; die Datenbank im Build erreichbar zu machen, ist keine Lösung.

### Der Bau läuft, aber jede Seite meldet einen Fehler

Dann fehlen Migrationen oder Inhalte, und das Pre-Deploy ist nicht gelaufen
oder nicht eingetragen. `/api/ready` sagt es genauer als die Fehlerseite.
