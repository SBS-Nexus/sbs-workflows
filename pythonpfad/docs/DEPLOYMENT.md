# Deployment

Hinweise für den Betrieb außerhalb der lokalen Entwicklung.

---

## 1. Voraussetzungen

| Baustein        | Anforderung                                   |
| --------------- | --------------------------------------------- |
| Laufzeit        | Node.js 22 LTS oder neuer                     |
| Datenbank       | PostgreSQL 16 oder neuer                      |
| Auslieferung    | ausschließlich über HTTPS                     |
| Arbeitsspeicher | mindestens 512 MB für den Anwendungsprozess   |
| Speicherplatz   | rund 100 MB für Anwendung und Python-Laufzeit |

Die Python-Laufzeit belegt rund 13 MB im Auslieferungsverzeichnis und wird
statisch ausgeliefert.

---

## 2. Build und Start

```bash
npm ci                 # reproduzierbare Installation aus package-lock.json
npm run db:deploy      # Migrationen anwenden
npm run build
npm run start          # Standardport 3000
```

`npm ci` führt automatisch `prisma generate` und den Pyodide-Abgleich aus
(`postinstall`). Beides muss vor dem Build passiert sein.

Ein Beispielprozess unter systemd:

```ini
[Unit]
Description=PythonPfad
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/pythonpfad
EnvironmentFile=/etc/pythonpfad/env
ExecStart=/usr/bin/node node_modules/.bin/next start --port 3000
Restart=on-failure
User=pythonpfad
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/pythonpfad/.next

[Install]
WantedBy=multi-user.target
```

---

## 3. Umgebung

Pflichtvariablen:

```bash
NODE_ENV=production
DATABASE_URL="postgresql://benutzer:passwort@host:5432/pythonpfad?schema=public"
AUTH_SECRET="<openssl rand -base64 48>"
APP_URL="https://lernen.example.org"
```

Optional:

```bash
ATTEMPT_RETENTION_DAYS="365"
AI_TUTOR_PROVIDER="rule-based"
AI_TUTOR_RATE_LIMIT_PER_HOUR="30"
```

`AUTH_SECRET` muss für die Produktion neu erzeugt werden. Ein Wechsel macht
alle bestehenden Sitzungen ungültig – Konten und Lernfortschritt bleiben
unberührt.

---

## 4. Reverse Proxy

Die Anwendung setzt ihre Sicherheits-Header selbst
(`next.config.ts`). Ein vorgelagerter Proxy sollte sie nicht überschreiben,
insbesondere nicht die Content Security Policy: `'wasm-unsafe-eval'` ist für
Pyodide notwendig.

Beispiel für nginx:

```nginx
location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}

# Die Python-Laufzeit ist unveränderlich versioniert.
location /pyodide/ {
    proxy_pass    http://127.0.0.1:3000;
    expires       1y;
    add_header    Cache-Control "public, immutable";
}
```

`X-Forwarded-For` wird für die Ratenbegrenzung ausgewertet. Ohne diesen Header
teilen sich alle Anfragen einen Zähler.

---

## 5. Datenbank

```bash
npm run db:deploy
```

Migrationen sind vorwärtsgerichtet und werden aus `prisma/migrations`
angewendet. `npm run db:migrate` ist ein Entwicklungsbefehl und gehört nicht in
die Produktion.

**Inhalte einspielen bzw. aktualisieren:**

```bash
npm run db:seed
```

Das Skript ist idempotent und schreibt ausschließlich Inhalte. Lernfortschritt
bestehender Konten bleibt erhalten. Es bricht ab, wenn die Inhaltsvalidierung
Fehler meldet.

Die Beispielkonten werden dabei **nicht** angelegt: Sie entstehen nur bei
`SEED_DEMO_USERS="true"`, und bei `NODE_ENV=production` wird dieser Schalter
grundsätzlich ignoriert. Das Skript darf daher auch für spätere
Inhaltsaktualisierungen laufen, ohne ein bekanntes Administratorkonto
wiederherzustellen.

Stammt die Installation aus einer früheren Fassung, in der die Konten noch
bedingungslos angelegt wurden, einmalig prüfen:

```sql
SELECT email FROM users WHERE email IN ('lernende@example.org', 'admin@example.org');
DELETE FROM users WHERE email IN ('lernende@example.org', 'admin@example.org');
```

---

## 6. Wiederkehrende Aufgaben

### Aufbewahrungsfrist anwenden

`applyRetentionPolicy()` entfernt Abgaben, die älter als
`ATTEMPT_RETENTION_DAYS` sind. Als tägliche Aufgabe:

```bash
npx tsx -e "import('./src/server/auth/session').then(m => m.applyRetentionPolicy()).then(n => console.log(n, 'Versuche entfernt'))"
```

### Abgelaufene Sitzungen entfernen

Passiert automatisch bei jeder Anmeldung. Auf einer wenig genutzten Instanz
kann `pruneExpiredSessions()` zusätzlich täglich laufen.

### Sicherung

```bash
pg_dump --format=custom --file=pythonpfad-$(date +%F).dump "$DATABASE_URL"
```

Gesichert werden muss ausschließlich die Datenbank. Inhalte liegen im
Repository, die Python-Laufzeit entsteht beim Build.

---

## 7. Betriebsbeobachtung

| Was                          | Woran erkennbar                                                     |
| ---------------------------- | ------------------------------------------------------------------- |
| Anwendung erreichbar         | HTTP 200 auf `/`                                                    |
| Datenbank erreichbar         | `/anmelden` lädt ohne Fehler                                        |
| Python-Laufzeit ausgeliefert | `/pyodide/manifest.json` liefert JSON                               |
| Fehler                       | Server-Log; die Oberfläche zeigt nur eine Kennung, nie Einzelheiten |

Der Redaktionsbereich (`/admin`, nur für die Rolle ADMIN) zeigt den
Veröffentlichungsstand aller Inhalte, das Ergebnis der Inhaltsvalidierung und
die anonymen Produktereignisse.

---

## 8. Aktualisierung

```bash
git pull
npm ci
npm run db:deploy
npm run build
systemctl restart pythonpfad
```

Bei geänderten Inhalten zusätzlich `npm run db:seed`. Bei einer neuen
Pyodide-Version erledigt `npm ci` den Abgleich selbst; die geänderten
Dateinamen sorgen dafür, dass Browser die neue Fassung laden.

---

## 9. Checkliste vor dem ersten Produktivstart

- [ ] `AUTH_SECRET` neu erzeugt
- [ ] `APP_URL` auf die tatsächliche Domain gesetzt
- [ ] HTTPS aktiv, HTTP leitet weiter
- [ ] `SEED_DEMO_USERS` nicht gesetzt; keine Beispielkonten in der Datenbank
- [ ] Datenbankbenutzer mit minimalen Rechten
- [ ] Sicherung eingerichtet und einmal wiederhergestellt
- [ ] `X-Forwarded-For` wird durchgereicht
- [ ] Aufbewahrungsfrist mit der Datenschutzerklärung abgeglichen
- [ ] `npm run verify` läuft in der Auslieferungskette
- [ ] `npm audit` in der Auslieferungskette

---

## Nachtrag: Überwachung, Schalter und Prüfkette

### Endpunkte in die Überwachung aufnehmen

| Pfad          | Prüfung                      | Erwartung                           |
| ------------- | ---------------------------- | ----------------------------------- |
| `/api/health` | Prozess nimmt Anfragen an    | HTTP 200, `{"status":"ok"}`         |
| `/api/ready`  | Datenbank **und** Inhalte da | HTTP 200, `lessons` größer als null |

Für Kubernetes: `/api/health` als Liveness-Probe, `/api/ready` als
Readiness-Probe. Die Trennung ist wichtig – ein Neustart, nur weil die
Datenbank kurz nicht erreichbar war, verlängert den Ausfall.

Beide Antworten tragen `Cache-Control: no-store`. Ein zwischengespeichertes
Lebenszeichen wäre schlimmer als keines.

### Funktionsschalter

Vier Bereiche lassen sich ohne neue Fassung abschalten:

```bash
FEATURE_AUSFUEHRUNGS_VISUALISIERER="false"   # Zeitleiste abschalten
FEATURE_WISSENSLANDKARTE="false"             # Konzeptgraph und Prognose
FEATURE_ORGANISATIONEN="false"               # nur Einzelkonten
FEATURE_EDITOR_VORSCHLAEGE="false"           # Vorschlagsliste im Editor
```

Wirksam nach einem Neustart. Gelesen werden nur die ausdrücklichen Werte
`true` und `false`; alles andere führt zum Standard, nicht zu zufälligem
Verhalten. Ohne jede gesetzte Variable funktioniert die Anwendung vollständig.

Abgeschaltete Bereiche werden nicht nur ausgeblendet: Die Wissenslandkarte wird
gar nicht erst berechnet, und die Organisationsseiten antworten wie nicht
vorhanden.

### Protokolle einsammeln

Ausgabe ist eine JSON-Zeile je Ereignis auf stdout, Fehler auf stderr. Felder:
`ts`, `level`, `message`, dazu `requestId` und je nach Ereignis `durationMs`.
Personenbezogene Felder werden vor dem Schreiben entfernt.

Wer eine Fehlerüberwachung anbindet, sollte prüfen, dass sie nicht zusätzlich
Anfragekörper mitschickt – die Sperrliste greift nur für die eigenen
Protokollzeilen.

### Prüfkette

`.github/workflows/pythonpfad.yml` läuft bei jeder Änderung unterhalb von
`pythonpfad/` und deckt die vollständige Kette ab: Migrationen, Seeding,
Typecheck, Lint, Formatprüfung, Vitest, Prüfung aller Musterlösungen gegen ihre
eigenen Tests, Prüfung der Ausführungsaufzeichnung gegen das echte Gerüst,
Produktionsbuild und Playwright. Bei einem Fehlschlag wird der Playwright-Bericht
sieben Tage lang aufbewahrt.

Vor dem Ausrollen genügt lokal:

```bash
npm run verify        # Typecheck, Lint, Tests, Build
npm run test:e2e      # gegen den Produktionsbuild
npm run perf          # Leistungsbudget, braucht einen laufenden Server
python3 scripts/verify_tracer.py
```

Zum Leistungsbudget: `perf-budget.json` legt fest, wie viel JavaScript und CSS
eine Seite beim ersten Aufruf höchstens laden darf. Gemessen wird nicht ein
Manifest, sondern was der Browser tatsächlich über die Leitung holt
(`encodedBodySize`, also komprimiert). Der wichtigste Fall, den das abfängt:
Der Code-Editor oder die Python-Laufzeit landen über einen Umweg im Bündel der
Startseite – beide sind ein Vielfaches der Grenzen und fielen sonst erst in der
Ladezeit der Nutzenden auf.

Der Server muss dafür laufen:

```bash
npm run build && npm run start &
npm run perf
```

Wer eine Grenze anhebt, begründet das im Commit. Mit `npm run perf -- --schreibe`
lassen sich die Grenzen an den gemessenen Stand anpassen – das ist zum Einrichten
gedacht, nicht zum Wegdrücken einer Warnung.

### Nach dem Ausrollen einer neuen Fassung

Der Service Worker trägt eine Versionskennung im Namen seines Speichers. Wird
sie in `public/sw.js` erhöht, räumt die Anwendung beim nächsten Besuch alle
älteren Speicher ab. Das ist nötig, wenn sich die Struktur der
zwischengespeicherten Bausteine ändert – bei einer gewöhnlichen Aktualisierung
nicht, weil Next.js seine Dateinamen ohnehin mit einer Prüfsumme versieht.
