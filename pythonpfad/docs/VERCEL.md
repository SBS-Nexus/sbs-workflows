# Betrieb auf Vercel unter pythonpfad.de

Diese Anleitung beschreibt den Weg von diesem Repository zu einer erreichbaren
Installation unter `https://pythonpfad.de`. Die Domain bleibt bei Strato, dort
wird nur der DNS-Eintrag geändert.

Ergänzt [DOMAIN.md](./DOMAIN.md) (Domainbestellung, Weg A und C) und
[DEPLOYMENT.md](./DEPLOYMENT.md) (Betrieb auf eigenem Server).

---

## Was Vercel nicht mitbringt

Vercel führt den Anwendungsprozess aus, aber **keine Datenbank**. PythonPfad
braucht PostgreSQL 16 oder neuer. Die Datenbank wird deshalb separat angelegt
und über `DATABASE_URL` eingebunden.

Empfohlen: **Neon**, Region `eu-central-1` (Frankfurt). Der kostenlose Tarif
reicht für den Anfang deutlich aus. Alternativ Supabase oder eine verwaltete
Datenbank bei einem deutschen Anbieter.

> **Wichtig:** Auf Vercel läuft die Anwendung in kurzlebigen Prozessen. Jeder
> davon öffnet eine eigene Datenbankverbindung. Deshalb muss die **gepoolte**
> Verbindungszeichenfolge eingetragen werden – bei Neon die mit `-pooler` im
> Hostnamen. Mit der direkten Verbindung gehen der Datenbank unter Last die
> Verbindungen aus, und zwar genau dann, wenn viele Leute gleichzeitig üben.

---

## 1. Datenbank anlegen

1. Konto bei [neon.com](https://neon.com) anlegen.
2. Neues Projekt, Region **Europe (Frankfurt)**, PostgreSQL 16 oder neuer.
3. Verbindungszeichenfolge kopieren – die **Pooled connection**.

Sie sieht so aus:

```
postgresql://BENUTZER:PASSWORT@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

---

## 2. Projekt bei Vercel anlegen

Im Vercel-Konto: **Add New → Project → Import Git Repository →
`SBS-Nexus/sbs-workflows`**.

Danach im Einrichtungsdialog:

| Einstellung        | Wert                   |
| ------------------ | ---------------------- |
| **Root Directory** | `pythonpfad`           |
| Framework Preset   | Next.js (wird erkannt) |
| Build Command      | leer lassen (Standard) |
| Install Command    | leer lassen (Standard) |

**Root Directory ist der Punkt, an dem es sonst scheitert.** Die Anwendung liegt
im Unterverzeichnis `pythonpfad`, nicht im Wurzelverzeichnis des Repositories.

Die Region steht bereits in `vercel.json` auf `fra1` (Frankfurt) – die
Anwendung läuft damit in derselben Region wie die Datenbank. Das spart bei jeder
Anfrage eine Atlantiküberquerung und hält die Verarbeitung personenbezogener
Daten in der EU.

---

## 3. Umgebungsvariablen

Unter **Settings → Environment Variables**, jeweils für **Production**:

| Name                     | Wert                                    |
| ------------------------ | --------------------------------------- |
| `DATABASE_URL`           | die gepoolte Zeichenfolge aus Schritt 1 |
| `AUTH_SECRET`            | frisch erzeugen, siehe unten            |
| `APP_URL`                | `https://pythonpfad.de`                 |
| `ATTEMPT_RETENTION_DAYS` | `365`                                   |
| `SEED_DEMO_USERS`        | `false`                                 |

`AUTH_SECRET` erzeugen mit:

```bash
openssl rand -base64 48
```

Der Schlüssel darf nirgends sonst auftauchen – nicht im Repository, nicht in
einer Notiz, nicht in einem Chat. Wer ihn hat, kann Sitzungen fälschen.

`SEED_DEMO_USERS` steht hier ausdrücklich auf `false`. Das Seeding ignoriert den
Schalter in Produktion ohnehin, aber doppelt hält besser: Die Beispielkonten
haben Passwörter, die im Repository stehen.

`APP_URL` ist nicht kosmetisch. Daran hängen drei Dinge: das `Secure`-Kennzeichen
der Sitzungs-Cookies, die `Strict-Transport-Security`-Kopfzeile aus
`src/proxy.ts` und die kanonischen Adressen in `sitemap.xml`, `robots.txt` und
den Vorschaubildern. Steht dort die falsche Adresse, funktioniert die Anmeldung
scheinbar, aber die Cookies sind unsicher.

---

## 4. Migrationen einspielen

Vercel führt beim Bauen **keine** Datenbankmigrationen aus – bewusst, denn ein
Build, der nebenbei das Schema ändert, ist bei einem Rückbau nicht mehr
umkehrbar.

Einmalig vom eigenen Rechner aus – hier mit der **direkten**, nicht der
gepoolten Verbindungszeichenfolge:

```bash
cd pythonpfad
DATABASE_URL="postgresql://…ohne -pooler…" npm run db:deploy   # Schema anlegen
DATABASE_URL="postgresql://…ohne -pooler…" npm run db:seed     # Inhalte einspielen
```

> **Hier gilt das Gegenteil von Abschnitt 3.** Die Anwendung braucht die
> gepoolte Verbindung, Migrationen brauchen die direkte. Der Pooler arbeitet im
> Transaktionsmodus und reicht die Sperren auf Sitzungsebene nicht durch, die
> `prisma migrate` setzt. Über die gepoolte Adresse bleibt die Migration
> hängen oder bricht mit einer Meldung ab, die nicht nach ihrer Ursache
> aussieht. Bei Neon ist die direkte Adresse dieselbe ohne `-pooler` im
> Hostnamen.

`db:deploy` wendet nur vorhandene Migrationen an und erzeugt keine neuen. Das
ist der richtige Befehl für Produktion; `db:migrate` ist es nicht.

Bei späteren Schemaänderungen läuft derselbe `db:deploy` vor dem Ausrollen.

---

## 5. Domain verbinden

In Vercel unter **Settings → Domains** `pythonpfad.de` hinzufügen, danach
`www.pythonpfad.de` mit Weiterleitung auf die Hauptdomain.

Vercel zeigt daraufhin die einzutragenden DNS-Werte an. **Nur diese Anzeige ist
maßgeblich.** Zur Einordnung, was dort ungefähr steht – so sah es bei der
Einrichtung von `pythonpfad.de` aus:

| Typ     | Name  | Wert                                   |
| ------- | ----- | -------------------------------------- |
| `A`     | `@`   | `216.150.1.1`                          |
| `CNAME` | `www` | `7d02643914618aa2.vercel-dns-016.com.` |

Beide Werte sind ausdrücklich **nicht** zum Abschreiben gedacht: Vercel hat die
frühere Sammeladresse `76.76.21.21` abgelöst, und der `CNAME` enthält eine
Kennung, die zu genau diesem Projekt gehört. Ein anderes Projekt bekommt eine
andere. Wer hier abschreibt statt abzulesen, baut sich einen Fehler, der erst
Wochen später auffällt.

Einzutragen bei Strato: **Kundenlogin → Domainverwaltung → pythonpfad.de →
DNS-Einstellungen**.

Zu beachten:

- Der vorhandene Eintrag auf Stratos Parkseite muss **weg**. Zwei `A`-Einträge
  nebeneinander führen dazu, dass jeder zweite Aufruf auf der Parkseite landet –
  ein Fehlerbild, das aussieht wie ein sporadischer Ausfall.
- Auch der `AAAA`-Eintrag (IPv6) muss entfernt werden. Steht er weiter auf
  Strato, bevorzugen moderne Browser ihn und sehen nie die neue Seite.
- Der Punkt am Ende von `cname.vercel-dns.com.` gehört dazu.
- Ein `CNAME` auf `@` ist nicht erlaubt; die Hauptdomain braucht den `A`-Eintrag.

Bis die Änderung überall greift, vergeht bis zu eine Stunde. Das TLS-Zertifikat
stellt Vercel danach automatisch aus und erneuert es selbstständig.

Aktueller Stand vor der Umstellung (Strato-Parkseite):

```
$ getent hosts pythonpfad.de
2a01:238:20a:202:1067::   pythonpfad.de
```

---

## 6. Prüfen

```bash
curl -sI https://pythonpfad.de | grep -i "strict-transport\|content-security"
curl -s  https://pythonpfad.de/api/health
curl -s  https://pythonpfad.de/robots.txt
```

Erwartet:

- `Strict-Transport-Security: max-age=…` ist vorhanden. Fehlt die Kopfzeile,
  steht `APP_URL` nicht auf der `https`-Adresse.
- `/api/health` antwortet mit `{"status":"ok",…}`. Antwortet es mit einem
  Fehler, stimmt `DATABASE_URL` nicht oder die Migrationen fehlen.
- `robots.txt` nennt `https://pythonpfad.de/sitemap.xml` und nicht `localhost`.

Danach einmal von Hand: registrieren, Einstufung durchlaufen, eine Lektion
öffnen, Code ausführen. Der letzte Schritt prüft nebenbei, ob die
Python-Laufzeit ausgeliefert wird – rund 13 MB unter `/pyodide`, die beim ersten
Aufruf geladen und danach ein Jahr im Browser zwischengespeichert werden.

---

## 7. Wenn der Bau scheitert

### `ENOENT: no such file or directory, open '…/.env'`

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

Tritt die Meldung bei `migrate` oder `db seed` auf, ist sie dagegen richtig:
Dort wird die Datenbank wirklich gebraucht.

### Der Bau läuft, aber jede Seite meldet einen Fehler

Dann fehlen die Migrationen. Schritt 4 nachholen. `/api/health` sagt es genauer
als die Fehlerseite.

---

## 8. Was danach automatisch läuft

Ist das Projekt einmal mit dem Repository verbunden, baut Vercel bei jedem Push
auf `main` neu und schaltet die neue Fassung live. Pull Requests bekommen
automatisch eine eigene Vorschau-Adresse.

Für Vorschau-Bereitstellungen sollte eine **eigene** `DATABASE_URL` hinterlegt
werden, die auf eine Testdatenbank zeigt. Sonst schreibt jede Vorschau in die
Produktionsdaten.
