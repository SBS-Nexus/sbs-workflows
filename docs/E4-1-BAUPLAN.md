# E4.1 · Identitätsdienst – Bauplan

Stand 20.11.2026. Gehört zu `docs/E4-KONTO-PLAN.md`, Abschnitt 7. Alle
Entscheidungen aus Abschnitt 9 sind gefallen. Dieses Dokument legt fest, wie
ZITADEL in Betrieb geht.

**Tor (aus dem Plan):**

- Die Sicherheits-Checkliste (Abschnitt 4) ist erfüllt.
- axe auf allen Kontoseiten ist ohne Befund.
- Der Rundgang Registrieren → Bestätigen → Zurücksetzen → Abmelden ist
  gelaufen.

> **Stand 21.11.2026 (E4.1a):**
>
> - Alle fünf Dienste laufen auf Railway. Die Einrichtung per Skript lief ohne
>   Fehler; ein zweiter Lauf ändert nichts.
> - Einrichtungs-Nutzer und Startpasswort sind entfernt, lokale Geheimnisse
>   gelöscht.
> - Von außen geprüft:
>   - Discovery mit Aussteller `https://konto.lernpfade.net`, PKCE S256,
>     Rückkanal-Abmeldung,
>   - deutsche Anmeldeseite, `/` leitet dorthin weiter,
>   - `/debug/*` gesperrt, HSTS, `nosniff`, `Referrer-Policy`,
>   - `konto-mail` lehnt unsignierte Anfragen ab.
> - `konto.lernpfade.net` ist seit 21.11.2026 live (CNAME und `_railway-verify.konto`
>   bei Strato, Let's-Encrypt-Zertifikat über Railway).
> - Scaleway: IAM-Anwendung `lernpfade-konto-mail` mit der Richtlinie
>   `lernpfade-konto-mail-versand`, nur `TransactionalEmailEmailApiCreate` im
>   Projekt `lernpfade` (kein SMTP, keine Domain-Einstellungen).
> - **Mailversand geprüft am 22.11.2026:** „Passwort vergessen“ für das
>   Admin-Konto → ZITADEL schickt signiert an `konto-mail` → Scaleway nimmt die
>   Mail an (Status 200, 210 ms). Eine unsignierte Anfrage wird abgelehnt (401).
> - **Rundgang, erster Teil (22.11.2026):** Die Inhaberin hat über „Passwort
>   vergessen“ mit dem Code aus der Mail ihr Admin-Passwort gesetzt. Offen sind
>   noch Registrieren und Bestätigen mit einem neuen Konto sowie Abmelden.
> - **Offen:**
>   - der Wechsel auf Railway Pro zum **17.12.2026** (Beginn des nächsten
>     Abrechnungszeitraums, ohne anteiligen Aufpreis; Abschnitt 7), danach
>     Sicherungen einschalten und eine Wiederherstellung proben.

Bis E4.2 hängt keine App am Dienst. Die Apps bleiben unverändert, und ein
Fehlversuch lässt sich durch Löschen der fünf Dienste vollständig zurücknehmen.

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
                                                     │            │ Mail (HTTPS, signiert)
                                                konto-db          ▼
                                                (Postgres 17,   konto-mail ──▶ Scaleway TEM
                                                 Laufwerk,      (öffentlich,   (HTTPS-API)
                                                 Sicherung)      nur signiert)
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
- Proxy und Mail-Dienst liegen im Repository (`konto/proxy/`, `konto/mail/`),
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
  lesbar. Du kopierst ihn aus der Railway-Variable `ZITADEL_MASTERKEY` in deinen
  Passwortmanager.
- **Zugang der Anmelde-App:** Das Skript legt den Maschinennutzer
  `login-client` mit der Rolle `IAM_LOGIN_CLIENT` an, erzeugt seinen Token und
  übergibt ihn als Datei an Railway. Im Protokoll erscheint nur der Statuscode.
- **Erste Admin-Person:** wird beim ersten Start mit deiner E-Mail angelegt.
  Das Startpasswort ist zufällig, wird nirgends gespeichert und muss geändert
  werden. Du setzt dein eigenes Passwort über „Passwort vergessen“. Dafür muss
  der Mailversand schon laufen.

## 3. Mailversand

**Nicht per SMTP.** Railway sperrt ausgehendes SMTP im Tarif Hobby (Ports 25,
465, 587, 2525). Der Wechsel auf Pro hätte den Grundpreis von 5 auf 20 USD im
Monat gehoben. Stattdessen:

- ZITADEL gibt Mails an einen **HTTP-Anbieter** ab. Es schickt dabei keine
  fertige Mail, sondern die Teile: Empfänger, Betreff, Text mit Code, Link.
- **`konto-mail`** (`konto/mail/`, Node ohne Abhängigkeiten) baut daraus die
  Mail im Learning-OS-Design, als HTML und als Text. Verschickt wird sie über
  die HTTPS-API von Scaleway TEM, Absender `konto@lernpfade.net`, Name
  „Lernpfade“.
- **Öffentlich, aber nur signiert.** ZITADEL ruft keine privaten Adressen auf.
  Seine Sperrliste enthält `fc00::/7`, dort liegt das private Railway-Netz, und
  diese Sperre soll bleiben. Deshalb hat `konto-mail` eine Railway-Adresse und
  nimmt nur Anfragen an, die so beschaffen sind:
  - mit gültiger Signatur von ZITADEL (`ZITADEL-Signature`, HMAC-SHA256,
    höchstens 5 Minuten alt),
  - jede Signatur nur einmal,
  - höchstens 60 Mails pro Minute.

  Adressen und Codes kommen nie ins Protokoll.

- **Der Scaleway-Schlüssel kommt von dir.** Du legst in Scaleway eine
  IAM-Anwendung an, nur mit dem Recht, Mails zu senden, und trägst ihren
  Secret Key selbst als Railway-Variable `SCW_SECRET_KEY` beim Dienst
  `konto-mail` ein. Den Signaturschlüssel erzeugt ZITADEL; das Skript übergibt
  ihn per Datei an Railway.
- Mailtexte auf Deutsch und Englisch (`konto/einrichtung/texte.mjs`). Die
  mitgelieferten Texte sprechen von „Zitadel“ und werden ersetzt.

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

1. **E4.1a Dienst steht** – DNS `konto`, die fünf Dienste, Sicherung, Einrichtung
   per Skript, Mail. Prüfung von außen: OIDC-Discovery, Anmeldeseite,
   Sicherheitskopfzeilen, Mail an dich kommt an. Die Anmelde-App ist noch das
   unveränderte Image von ZITADEL, mit unseren Farben aus den
   Markeneinstellungen.
2. **E4.1b Anmeldeseite in unserer Marke – in zwei Stufen** (entschieden am
   22.11.2026):
   - **Stufe 1, erledigt am 22.11.2026: Texte und Marke per Konfiguration.**
     - Alle 322 deutschen Texte im Du-Ton
       (`konto/einrichtung/anmeldetexte.de.json`, über
       `SetHostedLoginTranslation`); im Englischen sind nur die Stellen mit
       „Zitadel“ ersetzt.
     - Logo hell und dunkel aus der Learning-OS-Marke mit eingebettetem IBM
       Plex, Icon, IBM Plex als Schrift (`konto/einrichtung/marke.mjs`, über
       die Assets-API).
     - Live geprüft, hell und dunkel, Desktop und mobil. Die Anmelde-App hält
       Einstellungen bis zu 60 Minuten im Speicher; nach einer Änderung
       `konto-login` neu starten.
   - **Stufe 2, vor E4.4: eigener Bau.** Learning-OS-Aufbau statt der Karte
     von ZITADEL und NFKC-Normalisierung des Passworts (nötig für übernommene
     Konten mit Sonderformen wie Ligaturen, siehe E4.0).
     - Die Anmelde-App hängt an den internen Paketen `@zitadel/client` und
       `@zitadel/proto`. Auf npm liegt davon nur 1.3.1.
     - Ein eigener Bau heißt daher: ZITADEL-Quelltext beim Tag holen, unsere
       Änderungen darüberlegen und das Monorepo mit `buf generate` bauen.
     - Bekannter Fehler in der Vorlage: Die Auswahl „Passkey / Passwort“ trägt
       den unsichtbaren Screenreader-Text „Server size“. Er ist fest
       eingebaut und lässt sich über Texte nicht ändern; der eigene Bau
       behebt ihn.
     - Weitere Befunde in der Vorlage, am 22.11.2026 live gesehen:
       - Das Eingabefeld der E-Mail-Adresse hat für Screenreader keinen Namen.
       - Die Knöpfe für das Farbschema heißen fest „Switch to light mode“ usw.
       - Die E-Mail-Adresse steht als `loginName` in der URL der Passwortseite
         und landet damit in Protokollen und Verläufen.

3. **E4.1c Tor** – Checkliste abhaken, axe auf allen Kontoseiten, Rundgang.
   - Den Rundgang mit echter Registrierung machst du auf `konto.lernpfade.net`.
     Ich darf dort keine Konten mit Passwort anlegen.
   - Automatisch läuft derselbe Rundgang ab E4.2 in der CI gegen einen
     ZITADEL-Container.

   **axe-Lauf am 22.11.2026** (`konto/pruefung/axe.mjs`, WCAG 2.2 A/AA, sieben
   Seiten × hell/dunkel × Desktop/mobil = 28 Ansichten): jede Ansicht mit
   Befund, vier Regeln, alle „serious“, alle aus der Vorlage von ZITADEL:

   | Regel                | Wo                            | Ursache                                                                                      |
   | -------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
   | `html-has-lang`      | alle Seiten                   | `<html>` ohne `lang` im Layout der Anmelde-App                                               |
   | `autocomplete-valid` | Registrierung, Passwortseiten | `firstname`/`lastname` statt `given-name`/`family-name`, `password` statt `current-password` |
   | `link-name`          | Passwort, Zurücksetzen        | Pfeil-Link zum Kontowechsel ohne Text (nur SVG)                                              |
   | `color-contrast`     | Bestätigen (hell)             | gelber Hinweiskasten mit festen Farben, 2,56:1                                               |

   Über Texte oder Markeneinstellungen ist keiner davon zu beheben. Das Tor
   bleibt offen, bis der eigene Bau (Stufe 2) sie behebt.

## 6. Was du beiträgst

- ~~Freigabe der DNS-Einträge bei Strato für `konto.lernpfade.net`~~ – erteilt
  am 20.11.2026.
- ~~Die E-Mail der ersten Admin-Person~~ – `ki@sbsdeutschland.de`.
- Den Scaleway-API-Schlüssel als Railway-Variable (Abschnitt 3).
- Den Masterkey in deinem Passwortmanager ablegen (aus der Railway-Variable
  `ZITADEL_MASTERKEY`).
- Den Rundgang (Abschnitt 5, Schritt 3).

## 7. Kosten

Nach Verbrauch bei Railway, gemessen in E4.0:

| Dienst       | Arbeitsspeicher | Kosten im Monat                   |
| ------------ | --------------- | --------------------------------- |
| konto        | ca. 0,3 GB      | ca. 3 USD                         |
| konto-db     | ca. 0,16 GB     | ca. 1,5–2 USD                     |
| konto-login  | ca. 0,2–0,3 GB  | ca. 2–3 USD                       |
| konto-proxy  | ca. 0,03 GB     | unter 0,5 USD                     |
| konto-mail   | ca. 0,04 GB     | unter 0,5 USD                     |
| Sicherungen  | –               | wenige Cent (Speicher nach Größe) |
| **Zusammen** |                 | **ca. 7–12 USD**                  |

Dazu kommt der Mailversand: 300 Mails im Monat frei, danach 0,25 € je 1.000.

**Sicherung – entschieden am 21.11.2026: Railway Pro.** Railway sichert
Laufwerke nach Zeitplan nur im Tarif Pro (Antwort der API: „Manual backups and
backup schedules are only available for Pro workspaces“). Das betrifft auch die
Datenbanken der Apps (E6).

Gemessen am 21.11.2026 liegt der Verbrauch des Workspace bei rund 25 USD im
Monat. Davon entfallen etwa 12 USD auf den SQL Server und etwa 8 USD auf ein
anderes Projekt im selben Workspace. Die fünf konto-Dienste kommen im Leerlauf
auf rund 5,6 USD dazu, zusammen also rund 31 USD. Hobby (5 USD, darin 5 USD
Verbrauch) und Pro (20 USD, darin 20 USD Verbrauch) kosten damit gleich viel.
Die Preise je Einheit sind in beiden Tarifen gleich. Pro wird erst teurer, wenn
der Verbrauch unter 20 USD fällt.

| Weg                          | Kosten                                         | Aufwand                                                                                                         |
| ---------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Railway Pro** (gewählt)    | wie heute, mindestens 20 USD im Monat          | Sicherungen aller Laufwerke nach Zeitplan; dazu 30 statt 7 Tage Protokolle                                      |
| Eigene Sicherung (verworfen) | wenige Cent (Scaleway Object Storage in Paris) | Dienst mit `pg_dump` nach Zeitplan, verschlüsselt, weiterer Scaleway-Schlüssel, Wiederherstellung selbst proben |

**Zeitpunkt: 17.12.2026.** Der Abrechnungszeitraum läuft vom 17. bis 17. eines
Monats. Ein Wechsel mitten im Zeitraum wird nach Auskunft von Railway-Mitarbeitern
anteilig berechnet (am 22.11. rund 12,50 USD), die offizielle Doku sagt dazu
nichts Genaues. Die Inhaberin will jetzt nichts zahlen, deshalb erst zum
Zeitraumwechsel. Bis dahin hat `konto-db` keine Sicherung; dort liegt nur das
Admin-Konto.

Nach dem Wechsel: Sicherungen täglich, wöchentlich und monatlich für `konto-db`
und die drei App-Datenbanken; einmal eine Wiederherstellung von `konto-db`
proben, solange dort nur das Admin-Konto liegt.

## 8. Rücknahme

Bis E4.2 nutzt keine App den Dienst. Zurück heißt: die fünf Dienste und das
Laufwerk löschen, die DNS-Einträge für `konto` entfernen. Es gehen keine
Lerndaten verloren.

## Quellen

- Docker-Compose-Vorlagen von ZITADEL v4.20.5 (`deploy/compose/`): Anmelde-App
  unter `/ui/v2/login`, `LOGINV2_BASEURI`, `CUSTOM_REQUEST_HEADERS`.
- `cmd/defaults.yaml` v4.20.5: `SystemAPIUsers` mit `KeyData`,
  `DefaultInstance.SMTPConfiguration`, Passwort-Hasher.
- `internal/api/oidc/amr.go` v4.20.5: Abbildung der Faktoren auf `amr`.
- https://zitadel.com/docs/self-hosting/manage/login-client
