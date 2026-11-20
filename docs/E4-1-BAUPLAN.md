# E4.1 · Identitätsdienst – Bauplan

Stand 20.11.2026. Gehört zu `docs/E4-KONTO-PLAN.md`, Abschnitt 7. Alle
Entscheidungen aus Abschnitt 9 sind gefallen. Dieses Dokument legt fest, wie
ZITADEL in Betrieb geht.

**Tor (aus dem Plan):**

- Die Sicherheits-Checkliste (Abschnitt 4) ist erfüllt.
- axe auf allen Kontoseiten ist ohne Befund.
- Der Rundgang Registrieren → Bestätigen → Zurücksetzen → Abmelden ist
  gelaufen.

Bis E4.2 hängt keine App am Dienst. Die Apps bleiben unverändert, und ein
Fehlversuch lässt sich durch Löschen der vier Dienste vollständig zurücknehmen.

## 1. Aufbau

```
                 konto.lernpfade.net  (HTTPS, Railway-Zertifikat)
                          │
                    konto-proxy  (Caddy, öffentlich)
                 ┌────────┴──────────────────────────┐
     /  und  /ui/v2/login/*                   alles andere
                 ▼                                   ▼
          konto-login                           konto
          (Anmelde-App, privat)  ── API ──▶     (ZITADEL v4.20.5, privat, h2c)
                                                     │
                                                konto-db
                                                (Postgres 17, Laufwerk, Sicherung)
```

- **Ein Host für alles.** Anmelde-App und Dienst laufen unter derselben Domain.
  Das braucht WebAuthn: Passkeys sind an `konto.lernpfade.net` gebunden und
  funktionieren nur, wenn auch die Anmeldeseite dort liegt. Railway kennt kein
  Routing nach Pfaden, deshalb steht ein kleiner Caddy davor (so auch in den
  Vorlagen von ZITADEL, dort mit Traefik).
- **Privat:** `konto`, `konto-login` und `konto-db` haben keine öffentliche
  Adresse. Sie sprechen über das private Railway-Netz.
- Projekt `sbs-lernpfade-staging`, dort laufen auch die Apps. Region
  `europe-west4`.
- Der Proxy liegt im Repository (`konto/proxy/`, Caddyfile und Dockerfile),
  damit Änderungen durch die Prüfung gehen. ZITADEL und die Anmelde-App laufen
  zunächst als feste Images (`ghcr.io/zitadel/zitadel:v4.20.5`,
  `ghcr.io/zitadel/zitadel-login:v4.20.5`, jeweils mit Digest).

## 2. Einrichtung ohne Geheimnis im Protokoll

E4.0 hat gezeigt: Der Startweg von ZITADEL schreibt Zugangsschlüssel ins
Protokoll oder in eine Datei, die Railway nicht mit einem zweiten Dienst teilen
kann. Deshalb:

- **System-Nutzer für die Einrichtung.** Ich erzeuge lokal ein Schlüsselpaar.
  Nur der öffentliche Schlüssel kommt in die Konfiguration
  (`ZITADEL_SYSTEMAPIUSERS`). Mit dem privaten Schlüssel richtet ein Skript den
  Dienst über die API ein. Danach wird der öffentliche Schlüssel wieder
  entfernt und der private gelöscht. Für spätere Einrichtungen (etwa die Clients
  in E4.2) gibt es jedes Mal ein neues Paar.
- **Masterkey und Cookie-Geheimnis** erzeuge ich lokal und übergebe sie als
  Datei an Railway (`--variables @datei`). Der Masterkey gehört zusätzlich in
  die Sicherung: Ohne ihn sind die verschlüsselten Daten in der Datenbank nicht
  lesbar. Wo er sicher liegt, entscheidest du (Passwortmanager).
- **Zugang der Anmelde-App:** Das Skript legt den Maschinennutzer
  `login-client` mit der Rolle `IAM_LOGIN_CLIENT` an, erzeugt seinen Token und
  übergibt ihn als Datei an Railway. Im Protokoll erscheint nur der Statuscode.
- **Erste Admin-Person:** wird beim ersten Start mit deiner E-Mail angelegt.
  Das Startpasswort ist zufällig, wird nirgends gespeichert und muss geändert
  werden. Du setzt dein eigenes Passwort über „Passwort vergessen“. Dafür muss
  der Mailversand schon laufen.

## 3. Mailversand

- SMTP über Scaleway TEM:
  - Server `smtp.tem.scaleway.com:465` mit TLS.
  - Benutzer ist die Projekt-ID.
  - Absender `konto@lernpfade.net`, Name „Lernpfade“.
- **Das Passwort ist ein API-Schlüssel, den du erzeugst.** Dafür legst du in
  Scaleway eine IAM-Anwendung an, nur mit dem Recht „Transactional Email“.
  Den Schlüssel trägst du selbst als Railway-Variable
  `ZITADEL_DEFAULTINSTANCE_SMTPCONFIGURATION_SMTP_PASSWORD` beim Dienst `konto`
  ein, **bevor** ZITADEL zum ersten Mal startet. ZITADEL übernimmt die
  Mail-Einstellung nur beim Anlegen der Instanz.
- Mailtexte auf Deutsch. Die mitgelieferten Texte sprechen von „Zitadel“ und
  werden durch eigene ersetzt.

## 4. Sicherheits-Checkliste (Einstellungen)

| Bereich        | Einstellung                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passwörter     | mindestens 12 Zeichen, keine Pflicht für Sonderzeichen oder Ziffern (Länge schützt besser als Regeln); neue Passwörter mit argon2id; scrypt nur zum Prüfen übernommener Hashes, beim ersten Anmelden wird neu gehasht                                                                                                                                      |
| Sperren        | Keine Dauersperre nach falschen Passwörtern: Bei ZITADEL kann sie nur ein Admin lösen, und Fremde könnten so Konten sperren. Stattdessen begrenzt der Proxy die Anmeldeversuche je IP. Nach 5 falschen Codes beim zweiten Faktor wird gesperrt, denn wer so weit kommt, kennt das Passwort schon. Ob das Zurücksetzen die Sperre löst, prüfe ich in E4.1a. |
| Unbekannte     | „Benutzername unbekannt“ wird nicht verraten (`ignoreUnknownUsernames`)                                                                                                                                                                                                                                                                                    |
| Registrierung  | offen für alle, E-Mail muss per Code bestätigt werden                                                                                                                                                                                                                                                                                                      |
| Zweiter Faktor | TOTP-App und Passkeys/Sicherheitsschlüssel; **kein SMS**. Erzwungen nur für Admin- und Organisationsrechte, und zwar in den Apps (Claim `amr` enthält `mfa`, geprüft im Quelltext von v4.20.5, `internal/api/oidc/amr.go`)                                                                                                                                 |
| Externe Konten | aus (kein Google/Microsoft-Login in E4.1)                                                                                                                                                                                                                                                                                                                  |
| Sitzungen      | App-Sitzungen bleiben 30 Tage wie heute. ZITADEL fragt das Passwort spätestens nach 10 Tagen neu ab, den zweiten Faktor nach 18 Stunden (Standardwerte). Die Apps verlangen für Admin-Bereiche eine frische Prüfung (`max_age`, ab E4.2).                                                                                                                  |
| Sprache        | Deutsch als Standard, Englisch zusätzlich                                                                                                                                                                                                                                                                                                                  |
| Transport      | HSTS mit `includeSubDomains`, nur HTTPS; Postgres nur im privaten Netz                                                                                                                                                                                                                                                                                     |
| Konsole        | ZITADEL-Konsole nur für Admins; der Einrichtungs-Nutzer ist nach der Einrichtung entfernt                                                                                                                                                                                                                                                                  |
| Sicherung      | Railway-Sicherung des Datenbank-Laufwerks täglich und wöchentlich; eine Wiederherstellung wird einmal geprobt                                                                                                                                                                                                                                              |
| Rechtliches    | Links zu Datenschutz und Impressum auf den Kontoseiten (Inhalte kommen mit E6)                                                                                                                                                                                                                                                                             |

## 5. Schritte

1. **E4.1a Dienst steht** – DNS `konto`, die vier Dienste, Sicherung, Einrichtung
   per Skript, Mail. Prüfung von außen: OIDC-Discovery, Anmeldeseite,
   Sicherheitskopfzeilen, Mail an dich kommt an. Die Anmelde-App ist noch das
   unveränderte Image von ZITADEL, mit unseren Farben und IBM Plex aus den
   Markeneinstellungen.
2. **E4.1b Eigene Anmelde-App** – Abzweig von `apps/login` (v4.20.5, MIT) als
   `konto/login/`:
   - Learning-OS-Gestaltung über den Token-Vertrag und IBM Plex,
   - deutsche Texte in unserem Ton,
   - NFKC-Normalisierung des Passworts vor dem Absenden (nötig für übernommene
     Konten, siehe E4.0).

   Ersetzt das Image im Dienst `konto-login`.

3. **E4.1c Tor** – Checkliste abhaken, axe auf allen Kontoseiten, Rundgang.
   - Den Rundgang mit echter Registrierung machst du auf `konto.lernpfade.net`.
     Ich darf dort keine Konten mit Passwort anlegen.
   - Automatisch läuft derselbe Rundgang ab E4.2 in der CI gegen einen
     ZITADEL-Container.

## 6. Was du beiträgst

- Freigabe der DNS-Einträge bei Strato für `konto.lernpfade.net`: einen CNAME
  auf Railway und einen TXT-Eintrag zur Bestätigung (`_railway-verify.konto`).
- Die E-Mail der ersten Admin-Person.
- Den Scaleway-API-Schlüssel als Railway-Variable (Abschnitt 3).
- Den Masterkey in deinem Passwortmanager ablegen. Ich lege ihn dir dafür in
  eine geschützte Datei und lösche sie danach.
- Den Rundgang (Abschnitt 5, Schritt 3).

## 7. Kosten

Nach Verbrauch bei Railway, gemessen in E4.0:

| Dienst       | Arbeitsspeicher | Kosten im Monat                   |
| ------------ | --------------- | --------------------------------- |
| konto        | ca. 0,3 GB      | ca. 3 USD                         |
| konto-db     | ca. 0,16 GB     | ca. 1,5–2 USD                     |
| konto-login  | ca. 0,2–0,3 GB  | ca. 2–3 USD                       |
| konto-proxy  | ca. 0,03 GB     | unter 0,5 USD                     |
| Sicherungen  | –               | wenige Cent (Speicher nach Größe) |
| **Zusammen** |                 | **ca. 7–12 USD**                  |

Dazu kommt der Mailversand: 300 Mails im Monat frei, danach 0,25 € je 1.000.

## 8. Rücknahme

Bis E4.2 nutzt keine App den Dienst. Zurück heißt: die vier Dienste und das
Laufwerk löschen, die DNS-Einträge für `konto` entfernen. Es gehen keine
Lerndaten verloren.

## Quellen

- Docker-Compose-Vorlagen von ZITADEL v4.20.5 (`deploy/compose/`): Anmelde-App
  unter `/ui/v2/login`, `LOGINV2_BASEURI`, `CUSTOM_REQUEST_HEADERS`.
- `cmd/defaults.yaml` v4.20.5: `SystemAPIUsers` mit `KeyData`,
  `DefaultInstance.SMTPConfiguration`, Passwort-Hasher.
- `internal/api/oidc/amr.go` v4.20.5: Abbildung der Faktoren auf `amr`.
- https://zitadel.com/docs/self-hosting/manage/login-client
