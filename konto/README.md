# konto – Identitätsdienst der Lernpfade

Ein Konto für alle Pfade (Roadmap E4). Bauplan und Begründungen:
`docs/E4-1-BAUPLAN.md`, Gesamtplan: `docs/E4-KONTO-PLAN.md`.

## Dienste (Railway, Projekt `sbs-lernpfade-staging`)

| Dienst        | Quelle                                           | Erreichbar                                           |
| ------------- | ------------------------------------------------ | ---------------------------------------------------- |
| `konto-proxy` | `konto/proxy/` (Caddy, Dockerfile)               | öffentlich: `konto.lernpfade.net`                    |
| `konto`       | `ghcr.io/zitadel/zitadel:v4.20.5` (Digest)       | privat, Port 8080 (h2c)                              |
| `konto-login` | `ghcr.io/zitadel/zitadel-login:v4.20.5` (Digest) | privat, Port 3000                                    |
| `konto-mail`  | `konto/mail/` (Node 22, ohne Abhängigkeiten)     | öffentlich (Railway-Adresse), nur signierte Anfragen |
| `konto-db`    | `ghcr.io/railwayapp-templates/postgres-ssl:17`   | privat, Laufwerk mit Sicherung                       |

## Geheimnisse

| Variable                        | Dienst        | Herkunft                                                                     |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `ZITADEL_MASTERKEY`             | `konto`       | lokal erzeugt; Kopie im Passwortmanager (ohne ihn ist die Datenbank wertlos) |
| `ZITADEL_SESSION_COOKIE_SECRET` | `konto-login` | lokal erzeugt                                                                |
| `ZITADEL_SERVICE_USER_TOKEN`    | `konto-login` | `einrichten.mjs` (Token von `login-client`)                                  |
| `ZITADEL_SIGNING_KEY`           | `konto-mail`  | `einrichten.mjs` (Signaturschlüssel des Mailanbieters)                       |
| `SCW_SECRET_KEY`                | `konto-mail`  | trägt die Inhaberin selbst ein (Scaleway-IAM-Anwendung, nur Mailversand)     |

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
3. Die JSON-Dateien aus `<ordner>` als Variablen an die genannten Dienste
   übergeben, danach löschen.
4. `ZITADEL_SYSTEMAPIUSERS` wieder entfernen, `konto` neu starten, den privaten
   Schlüssel löschen.

Das Skript ist wiederholbar: Was schon so eingestellt ist, meldet es als „schon so“.

## Fristen

- **Token der Anmelde-App:** läuft zwei Jahre nach der Einrichtung ab (Datum
  gibt das Skript aus). Rechtzeitig mit `--login-token-erneuern` ersetzen, den
  alten danach in der Konsole beim Nutzer `login-client` löschen. Läuft er ab,
  kann sich niemand mehr anmelden.

## Sicherung und Rücknahme

- Das Laufwerk von `konto-db` wird von Railway täglich und wöchentlich gesichert.
  Eine Wiederherstellung braucht zusätzlich den Masterkey.
- Bis E4.2 hängt keine App am Dienst. Zurücknehmen heißt: die fünf Dienste und
  das Laufwerk löschen, die DNS-Einträge für `konto` bei Strato entfernen.
