# E4.3/E4.4 · PythonPfad und SQLPfad am gemeinsamen Konto – Bauplan

Stand 23.11.2026. Gehört zu `docs/E4-KONTO-PLAN.md`, Abschnitte 5 und 7.
Vorlage ist AIPfad (`docs/E4-2-BAUPLAN.md`), dort seit 23.11.2026 live.

**Tore (aus dem Plan):**

- E4.3: Probelauf-Bericht mit Anzahl Konten, Überschneidungen und Fehlern
  (Fehler = 0).
- E4.4: Fehlerrate bei Anmeldungen beobachtet; Rücknahme beschrieben und
  geprobt.

## 1. Reihenfolge

1. **Vertrag `docs/learning-auth/`** aus dem AIPfad-Code, mit Drift-Prüfung
   wie bei Shell, Komponenten und Tokens. AIPfad nutzt danach selbst die
   Kopien.
2. **PythonPfad und SQLPfad hinter dem Schalter** (`aus`): Schema, Umgebung,
   Routen, Hinweisseite, Abmelden. Dazu die Strecke gegen den echten ZITADEL
   für alle drei Apps.
3. **Einrichten und Ausrollen mit Schalter `aus`**: Anwendungen „PythonPfad“
   und „SQLPfad“ im Projekt „Lernpfade“.
4. **E4.3 Übernahme der Konten**: Ausfuhr, Zusammenfassen, Einfuhr in
   ZITADEL. Zuerst ein Probelauf auf Kopien, dann der echte Lauf. Die
   Hinweis-Mail an die Konten geht erst nach ausdrücklicher Freigabe von
   Text und Versand.
5. **Schalter `an`** je App nach Rundgang, zuerst SQLPfad, dann PythonPfad.

Warum die Übernahme vor dem Schalter kommt: Ohne sie fände eine Person, die
schon ein Konto hat, beim gemeinsamen Konto keines vor. Sie müsste sich neu
registrieren. Mit der Übernahme meldet sie sich mit dem bisherigen Passwort
an und bestätigt einmal ihre Adresse.

## 2. Vertrag `docs/learning-auth/`

Bytegleiche Kopien in jeder App. Geprüft wird mit
`scripts/check-learning-auth.mjs`, der in `lernpfade-ci.yml` läuft.

| Kanonisch                      | Kopie je App                                | Inhalt                                                  |
| ------------------------------ | ------------------------------------------- | ------------------------------------------------------- |
| `zentral-zustand.ts`           | `src/server/auth/zentral-zustand.ts`        | signierter Zustand, Rücksprungziele, verlorener Zustand |
| `zentral-identitaet.ts`        | `src/server/auth/zentral-identitaet.ts`     | Claims, Prüfung des Logout-Tokens                       |
| `zentral-konfiguration.ts`     | `src/server/auth/zentral-konfiguration.ts`  | Umgebungsfelder und ihre Prüfung (für `env.ts`)         |
| `zentral-protokoll.ts`         | `src/server/auth/zentral-protokoll.ts`      | eigene Protokollzeilen ohne Personendaten               |
| `zentral.ts`                   | `src/server/auth/zentral.ts`                | openid-client: Discovery, Start, Rückkehr, Abmelden     |
| `zentral-konto.ts`             | `src/server/auth/zentral-konto.ts`          | Kontoregeln                                             |
| `zentral-cookie.ts`            | `src/server/auth/zentral-cookie.ts`         | Zustandscookie                                          |
| `zentral-hinweise.ts`          | `src/server/auth/zentral-hinweise.ts`       | Texte der Hinweisseite                                  |
| `route-anmelden.ts`            | `src/app/auth/anmelden/route.ts`            | Start                                                   |
| `route-rueckkehr.ts`           | `src/app/auth/rueckkehr/route.ts`           | Rückkehr                                                |
| `route-abmelden-rueckkanal.ts` | `src/app/auth/abmelden-rueckkanal/route.ts` | Rückkanal-Abmeldung                                     |
| Tests (Einheiten, Integration) | `tests/unit/…`, `tests/integration/…`       | wie bei AIPfad                                          |

**App-eigen** bleibt `src/server/auth/zentral-app.ts`:

- Name des Zustandscookies (`<app>_anmeldung`).
- Startseite nach der Anmeldung (`/pfad` bzw. `/fortschritt`).
- Dazu die Hinweisseite `/auth/fehler` (eigene Bausteine, gemeinsame Texte),
  die Seiten `/anmelden` und `/registrieren` und das Abmelden in
  `auth-actions.ts`.

Gemeinsame Voraussetzungen, die alle drei Apps schon erfüllen:

- `@/server/env` (`getEnv()`), `@/server/site` (`siteUrl`, `absoluteUrl`,
  `isSecureDeployment`), `@/server/db/prisma`, `@/generated/prisma/client`.
- Die Sitzungsfunktionen in `@/server/auth/session`.

SQLPfad hat kein Protokollmodul. Deshalb bringt der Vertrag sein eigenes mit
(`zentral-protokoll.ts`): JSON-Zeilen mit `message`, ohne Adresse, Name oder
Token.

## 3. Besonderheiten der beiden Apps

- **Einladungen (PythonPfad):** `/einladung/<token>` liegt hinter dem
  Layout-Schutz, der ohne Ziel zu `/anmelden` leitet. `/einladung` und
  `/organisation` kommen in die geschützten Pfade des Proxys, der das Ziel
  mitgibt. Wer eingeladen wird und noch kein Konto hat, registriert sich
  beim Konto und landet danach wieder auf der Einladung.
- **Passwort ändern (SQLPfad):** Für Konten aus dem gemeinsamen Konto gibt es
  in SQLPfad kein Passwort. Die Profilseite verweist dann auf das
  Lernpfade-Konto, `aenderePasswort` lehnt ab.
- **Konto löschen:**
  - SQLPfad verlangt heute das Passwort. Ohne lokales Passwort gilt dieselbe
    Bestätigung wie in PythonPfad: das Wort LÖSCHEN.
  - Gelöscht wird nur das Konto in der App. Das gemeinsame Konto bleibt, wie
    in `E4-KONTO-PLAN.md` Abschnitt 6.
- **Startseite** nach der Anmeldung: `/fortschritt`, neue Konten
  `/onboarding`, wie bisher.

## 4. Übernahme der Konten (E4.3)

Werkzeug `konto/uebernahme/`, läuft als befristeter Job im privaten
Railway-Netz.

1. **Ausfuhr** je App: E-Mail (kleingeschrieben, getrimmt), Name,
   scrypt-Hash, letzte Aktivität. Keine Lerndaten.
2. **Zusammenfassen** nach Adresse. Bei mehreren Apps gilt der Hash des
   zuletzt aktiven Kontos.
3. **Einfuhr** in ZITADEL:
   - Je Adresse ein Konto, E-Mail _unbestätigt_.
   - Der Hash wird umgeschrieben zu `$scrypt$ln=16,r=8,p=1$<salt>$<hash>`
     (E4.0 belegt).
   - Schon vorhandene Adressen werden übersprungen und gezählt.
4. Das Protokoll enthält nur Zahlen: Konten je App, Überschneidungen,
   eingeführt, übersprungen, Fehler.
5. Erst ein Probelauf gegen den Test-ZITADEL aus `konto/pruefung/e2e` mit
   Kopien. Dann der echte Lauf.

Nach der Einfuhr meldet sich jede Person mit ihrem bisherigen Passwort an.
Die Anmelde-App verlangt einmal die Bestätigung der Adresse
(`EMAIL_VERIFICATION=true`). Danach verbindet die App das lokale Konto über
die bestätigte Adresse.

## 5. Rücknahme

- Je App `FEATURE_ZENTRALE_ANMELDUNG=aus` und neu starten. Die eigenen
  Formulare gelten wieder, die Passwort-Hashes bleiben bis E4.5.
- Konten, die erst über das gemeinsame Konto entstanden sind, haben kein
  lokales Passwort. Sie kommen erst nach dem erneuten Einschalten wieder an
  ihren Lernstand.
- Die Rücknahme wird vor dem Einschalten einmal geprobt: an, abmelden, aus,
  eigene Anmeldung, wieder an.

## 6. Stand

**24.11.2026, Schritte 1 und 2 umgesetzt** (Zweig
`claude/e4-4-python-sql-anbindung-20261123`):

- Vertrag `docs/learning-auth/` mit 17 Dateien und README; Drift-Prüfung
  `scripts/check-learning-auth.mjs` als Job „Anmeldevertrag (Drift-Check)“.
  AIPfad nutzt selbst die Kopien.
- Dazugekommen gegenüber AIPfad:
  - Eigenes Protokollmodul.
  - Konfigurationsfelder für `env.ts`.
  - Gemeinsame Hinweistexte.
  - Frische Anmeldung über `?bestaetigen=1`; die Anmeldezeit kommt aus dem
    ID-Token.
  - Die Adresse zum Passwortändern beim Konto.
  - Der Browser-Ablauf als Vertragstest mit kleinem App-Adapter
    (`e2e-konto/app.ts`).
- PythonPfad und SQLPfad hinter `FEATURE_ZENTRALE_ANMELDUNG` (`aus`): Schema
  und Migration `20261124090000_zentrale_anmeldung`, Umgebung, Sitzungen,
  Routen, Hinweisseite, `/anmelden`, `/registrieren`, Abmelden, Proxy mit
  Ziel.
- PythonPfad: `/einladung` und `/organisation` sind geschützte Pfade mit Ziel.
- SQLPfad, für Konten ohne lokales Passwort oder mit Schalter `an`:
  - Das Passwort wird im Lernpfade-Konto geändert.
  - Vor dem Löschen steht eine frische Anmeldung beim Konto, höchstens zehn
    Minuten alt.
- Die CI-Strecke gegen den echten ZITADEL läuft jetzt für alle drei Apps
  (`.github/workflows/konto-e2e.yml`, Matrix). `einrichten.mjs` kennt die
  Anwendungen „PythonPfad“ und „SQLPfad“.
- Lokal geprüft:
  - Alle drei Apps: Typen, Lint, Format, Unit-Tests (AIPfad 955,
    PythonPfad 515, SQLPfad 777) und der Drift-Check.
  - Integrationstests gegen echtes Postgres: PythonPfad 74, SQLPfad 22.
  - Den Browser-Lauf gegen den Test-ZITADEL für PythonPfad und SQLPfad habe
    ich nicht lokal laufen lassen: Die Platte lief beim Bauen voll. Die CI
    deckt ihn ab.

Gemergt als PR #101 (`1d50805`).

**24.11.2026, Schritt 3 live:**

- In ZITADEL gibt es die Anwendungen „PythonPfad“ (Client-ID
  `400949556767919273`) und „SQLPfad“ (`400949556969311401`). Der befristete
  System-Nutzer ist wieder entfernt.
- Alle drei Apps laufen auf `1d50805`: AIPfad mit Schalter `an`, PythonPfad
  und SQLPfad mit allen `AUTH_*`-Werten und Schalter `aus`.
- Live geprüft im Browser, ohne Fehler:
  - AIPfad leitet Anmelden, Registrieren und geschützte Seiten zum Konto.
  - PythonPfad und SQLPfad zeigen weiter die eigenen Formulare.
    Geschützte Seiten und Einladungen geben das Ziel mit.
  - `/auth/anmelden` führt in allen drei Apps schon zum Konto (Anmelden und
    Registrieren).
  - Der Rückkanal lehnt ungültige Token ab, und eine Rückkehr ohne Zustand
    startet neu.

**Schritt 4, Werkzeug (E4.3):** `konto/uebernahme/`.

- `umwandeln.mjs` mit Unit-Tests: Hash umschreiben, nach Adresse
  zusammenfassen (zuletzt aktiv gewinnt), Namen aufteilen.
- `uebernahme.mjs` hat zwei Modi: `probe` (zählen und prüfen) und `einfuhr`
  (unbestätigte Adresse, ohne Mail). Es gibt nur Zahlen aus, und ein zweiter
  Lauf ändert nichts.
- `konto/pruefung/uebernahme-pruefung.mjs` probt gegen einen echten
  Test-ZITADEL mit erfundenen Konten im App-Format. Neuestes Passwort meldet
  an, das ältere nicht; die Adresse bleibt unbestätigt; Konten ohne lokales
  Passwort werden nicht angelegt; NFKC.
- Die Probe läuft in der CI als Job „Kontoübernahme gegen echten ZITADEL“.

Offen:

- Probelauf auf den echten Daten (nur zählen, im privaten Railway-Netz),
  dann die Einfuhr.
- Die Hinweis-Mail erst nach Freigabe von Text und Versand.
- Schritt 5: Schalter `an`.
