# konto – Identitätsdienst der Lernpfade

Ein Konto für alle Pfade (Roadmap E4). Bauplan und Begründungen:
`docs/E4-1-BAUPLAN.md`, Gesamtplan: `docs/E4-KONTO-PLAN.md`.

## Dienste (Railway, Projekt `sbs-lernpfade-staging`)

| Dienst        | Quelle                                             | Erreichbar                                           |
| ------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `konto-proxy` | `konto/proxy/` (Caddy, Dockerfile)                 | öffentlich: `konto.lernpfade.net`                    |
| `konto`       | `ghcr.io/zitadel/zitadel:v4.20.5` (Digest)         | privat, Port 8080 (h2c)                              |
| `konto-login` | `konto/login/` (ZITADEL Login v4.20.5 mit Patches) | privat, Port 3000                                    |
| `konto-mail`  | `konto/mail/` (Node 22, ohne Abhängigkeiten)       | öffentlich (Railway-Adresse), nur signierte Anfragen |
| `konto-db`    | `ghcr.io/railwayapp-templates/postgres-ssl:17`     | privat, Laufwerk mit Sicherung                       |

## Geheimnisse

| Variable                        | Dienst        | Herkunft                                                                     |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `ZITADEL_MASTERKEY`             | `konto`       | lokal erzeugt; Kopie im Passwortmanager (ohne ihn ist die Datenbank wertlos) |
| `ZITADEL_SESSION_COOKIE_SECRET` | `konto-login` | lokal erzeugt                                                                |
| `ZITADEL_SERVICE_USER_TOKEN`    | `konto-login` | `einrichten.mjs` (Token von `login-client`)                                  |
| `ZITADEL_SIGNING_KEY`           | `konto-mail`  | `einrichten.mjs` (Signaturschlüssel des Mailanbieters)                       |
| `SCW_SECRET_KEY`                | `konto-mail`  | trägt die Inhaberin selbst ein (Scaleway-IAM-Anwendung, nur Mailversand)     |
| `AUTH_CLIENT_SECRET`            | `aipfad`      | `einrichten.mjs --anwendungen` (Anwendung „AIPfad“ im Projekt „Lernpfade“)   |
| `AUTH_STATE_SECRET`             | `aipfad`      | lokal erzeugt (signiert den Anmeldezustand, E4.2)                            |

Geheimnisse gehen nur als Datei an Railway (`railway api … --variables @datei`)
und nie durch Protokolle oder die Kommandozeile.

## Einrichtung und spätere Änderungen

Für jede Einrichtung gibt es einen befristeten System-Nutzer:

1. Lokal ein Schlüsselpaar erzeugen (RSA 2048). Den öffentlichen Schlüssel als
   `ZITADEL_SYSTEMAPIUSERS` beim Dienst `konto` setzen, zum Beispiel
   `{"einrichtung":{"KeyData":"<Base64 des PEM>","Memberships":[{"MemberType":"System","Roles":["SYSTEM_OWNER","IAM_OWNER","ORG_OWNER"]}]}}`,
   dann `konto` neu starten.
2. `node konto/einrichtung/einrichten.mjs --basis https://konto.lernpfade.net --schluessel <pem> --mail-endpunkt https://<konto-mail>/ --ausgabe <ordner>`
   - `--nur-pruefen` testet nur den Zugang.
   - `--login-token-erneuern` erzeugt einen neuen Token für die Anmelde-App.
   - `--mail-neu` legt den Mailanbieter neu an und erneuert damit den
     Signaturschlüssel.
   - `--anwendungen` richtet das Projekt „Lernpfade“ mit den Anwendungen aus
     `einrichtung/anwendungen.mjs` ein und schaltet die Rückkanal-Abmeldung
     ein. Zugangsdaten entstehen nur beim Anlegen oder mit
     `--secret-erneuern <schluessel>`. `--anwendung-basis aipfad=<adresse>`
     richtet eine Anwendung auf eine andere Adresse aus (CI-Strecke).
3. Die JSON-Dateien aus `<ordner>` als Variablen an die genannten Dienste
   übergeben, danach löschen.
4. `ZITADEL_SYSTEMAPIUSERS` wieder entfernen, `konto` neu starten, den privaten
   Schlüssel löschen.

Das Skript ist wiederholbar: Was schon so eingestellt ist, meldet es als „schon so“.

## Einstellungen der Anmelde-App

- `EMAIL_VERIFICATION=true` bei `konto-login` und `konto-login-probe`: Wer
  seine Adresse noch nicht bestätigt hat, kommt vor dem Abschluss der
  Anmeldung auf die Bestätigungsseite. Die Apps verbinden ohnehin nur
  bestätigte Adressen (E4.2); so bleibt niemand auf halbem Weg hängen.

## Fristen

- **Token der Anmelde-App:** läuft zwei Jahre nach der Einrichtung ab (Datum
  gibt das Skript aus). Rechtzeitig mit `--login-token-erneuern` ersetzen, den
  alten danach in der Konsole beim Nutzer `login-client` löschen. Läuft er ab,
  kann sich niemand mehr anmelden.

## Sicherung und Rücknahme

- Sicherungen des Laufwerks von `konto-db` gibt es bei Railway erst im
  Pro-Tarif. Der Wechsel ist für den 17.12.2026 geplant, danach täglich,
  wöchentlich und monatlich. Eine Wiederherstellung braucht zusätzlich den
  Masterkey.
- Seit E4.2 kann AIPfad über den Dienst anmelden. Zurücknehmen heißt dort
  zuerst `FEATURE_ZENTRALE_ANMELDUNG=aus`: Die eigenen Formulare gelten dann
  wieder. Konten, die nur über das gemeinsame Konto entstanden sind, haben
  kein eigenes Passwort; sie können sich erst wieder anmelden, wenn der Schalter zurück auf `an` steht.
