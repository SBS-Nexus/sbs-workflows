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
