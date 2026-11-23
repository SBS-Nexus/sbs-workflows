# E4.2 · AIPfad am gemeinsamen Konto – Bauplan

Stand 23.11.2026. Gehört zu `docs/E4-KONTO-PLAN.md`, Abschnitt 7. Grundlage ist
der laufende Identitätsdienst aus E4.1 (`docs/E4-1-BAUPLAN.md`).

**Tor (aus dem Plan):** CI grün einschließlich E2E gegen einen echten
ZITADEL; Rundgang auf der Live-Umgebung.

**Warum AIPfad zuerst:** Es hat keine Organisationsdaten, und heute gibt es
dort **kein einziges Konto** (Zählung aus E4.0). Eine Übernahme alter Konten
fällt weg; nach dem Tor kann AIPfad direkt umstellen.

## 1. Ablauf

```
Browser ──/anmelden──▶ AIPfad ──302 (Code + PKCE, state, nonce)──▶ konto.lernpfade.net
        ◀────────────── 302 /auth/rueckkehr?code&state ◀──────── (Anmeldung, ggf. Registrierung)
AIPfad: Code einlösen → ID-Token prüfen → Konto finden/verknüpfen/anlegen → eigene Sitzung
Abmelden: AIPfad-Sitzung löschen → end_session bei ZITADEL → zurück auf www.aipfad.de
Rückkanal: ZITADEL ──POST logout_token──▶ /auth/abmelden-rueckkanal → Sitzungen zur sid löschen
```

- **Die eigene Sitzung bleibt.** AIPfad behält sein Sitzungsverfahren (opakes
  Token, Hash in der Datenbank, 30 Tage). Neu ist nur, wer die Identität
  bestätigt.
- **Bibliothek:** `openid-client` 6.8.9 (MIT, Panva) für Discovery,
  Code-Flow mit PKCE und Token-Prüfung. Für den Rückkanal kommt `jose` 6.2.16
  dazu (Signatur gegen die JWKS von ZITADEL). Beide Versionen sind mindestens
  zwei Wochen alt, als Schutz vor Lieferketten-Angriffen über frische
  Veröffentlichungen.

## 2. Regeln für Konten

1. **Treffer über `sub`:** `User.authSubject = sub` → anmelden.
2. **Verknüpfen über bestätigte Adresse:** Gibt es kein `authSubject`, aber
   ein lokales Konto mit derselben E-Mail (ohne Groß-/Kleinschreibung) und
   ist `email_verified` wahr, wird es verknüpft: `authSubject` und
   `authLinkedAt` werden gesetzt. Ohne Bestätigung wird **nie** verknüpft
   (Plan, Abschnitt 5).
3. **Neu anlegen:** Gibt es kein Konto, entsteht eines mit Name und E-Mail aus
   dem Token und ohne lokales Passwort. Danach geht es ins Onboarding.
4. **Zweiter Faktor für Admins:** Für Rollen mit Adminrechten verlangt
   AIPfad `amr` mit `mfa`. Fehlt der zweite Faktor, geht die Person zurück zum
   Identitätsdienst, mit `acr_values` bzw. `prompt=login` und einem Hinweis.
5. Rollen bleiben in AIPfad. Der Identitätsdienst weiß, wer jemand ist, die
   App weiß, was er darf.

## 3. Umfang im Code (AIPfad)

| Teil                         | Inhalt                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema                       | `User.authSubject String? @unique`, `User.authLinkedAt DateTime?`, `User.passwordHash` wird optional; `AuthSession.oidcSid String?` mit Index           |
| `src/server/auth/zentral.ts` | Konfiguration (Discovery, gecacht), Start-URL bauen, Rückkehr einlösen, Abmelde-URL, Rückkanal-Token prüfen                                             |
| Zustand des Ablaufs          | `state`, `nonce`, `code_verifier` und Rücksprungziel in einem httpOnly-Cookie, HMAC-signiert, 10 Minuten gültig                                         |
| Routen                       | `/auth/anmelden` (Start), `/auth/rueckkehr` (Rückkehr), `/auth/abmelden-rueckkanal` (POST), Abmelden über `logoutAction`                                |
| Schalter                     | `FEATURE_ZENTRALE_ANMELDUNG`: `aus` (Standard) oder `an`. Bei `an` leiten `/anmelden` und `/registrieren` weiter, die Registrierung mit `prompt=create` |
| Umgebung                     | `AUTH_ISSUER=https://konto.lernpfade.net`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET` (Railway-Geheimwert), `AUTH_STATE_SECRET`                             |
| Rücksprungziele              | nur relative Pfade derselben App (kein offener Redirect)                                                                                                |

Der Code ist von Anfang an als gemeinsamer Vertrag gebaut. Für E4.4 wandert er
nach `docs/learning-auth/` und als bytegleiche Kopie in PythonPfad und
SQLPfad, mit Drift-Prüfung wie bei den anderen Verträgen.

## 4. ZITADEL

- Projekt „Lernpfade“, darin die Anwendung „AIPfad“: Web, Code-Flow, PKCE
  und Client-Secret.
  - Weiterleitung: `https://www.aipfad.de/auth/rueckkehr`.
  - Nach dem Abmelden: `https://www.aipfad.de/`.
  - Rückkanal: `https://www.aipfad.de/auth/abmelden-rueckkanal`.
  - E-Mail und Name stehen im ID-Token.
- Instanz-Funktion „Back-Channel Logout“ einschalten.
- Eingerichtet wird mit `konto/einrichtung/einrichten.mjs`, über den
  befristeten System-Nutzer. Das Client-Secret geht als Datei an Railway.

## 5. Tests

- **Einheiten:** signierter Zustand (gültig, verändert, abgelaufen),
  Rücksprungziele, Kontoregeln (Treffer, Verknüpfen nur bestätigt, Anlegen),
  Rückkanal-Token (gültig, falscher Aussteller, falsche Zielgruppe, fehlendes
  Ereignis, mit Nonce, abgelaufen).
- **E2E in der CI gegen echten ZITADEL:**
  - ZITADEL v4.20.5, Postgres und Anmelde-App laufen per Docker Compose im
    Workflow.
  - Ein Einrichtungsschritt legt die OIDC-Anwendung und einen Test-Nutzer an.
  - Playwright spielt durch: Anmelden über den Identitätsdienst → zurück in
    AIPfad → Onboarding → Abmelden → wieder abgemeldet.
  - Die Rückkanal-Abmeldung wird geprüft.

## 6. Reihenfolge

1. Schema und Modul `zentral.ts` mit Einheitentests.
2. Routen, Schalter und Abmelden.
3. ZITADEL-Anwendung einrichten; AIPfad mit Schalter `aus` ausrollen.
4. E2E-Strecke in der CI.
5. Rundgang live mit Schalter `an`, danach bleibt er an. AIPfad hat keine
   Altkonten.

## 7. Hinweis

Im Haupt-Checkout läuft parallel die Arbeit an AIPfad E07 (Audit-Grundlage,
Zweig `claude/aipfad-e07-audit-foundation`). Sie berührt ebenfalls
`prisma/schema.prisma`. Die Migrationen beider Zweige müssen beim Merge
zusammengeführt werden.

## 8. Stand

**23.11.2026, Schritte 1 und 2 umgesetzt** (Zweig
`claude/e4-2-aipfad-anbindung-20261123`):

- Schema und Migration `20261123120000_zentrale_anmeldung`, rein additiv bis
  auf das jetzt optionale `passwordHash`. Gegen echtes Postgres angewendet;
  `prisma migrate diff` zeigt keine Abweichung zum Schema.
- Module unter `aipfad/src/server/auth/`:
  - `zentral.ts`: Discovery, Start, Rückkehr, Abmelde-Adresse, Rückkanal.
  - `zentral-zustand.ts`: signierter Zustand und Rücksprungziele.
  - `zentral-identitaet.ts`: Claims und Prüfung des Logout-Tokens.
  - `zentral-konto.ts`: Kontoregeln.
  - `zentral-cookie.ts`.
- Routen `/auth/anmelden`, `/auth/rueckkehr` und `/auth/abmelden-rueckkanal`,
  dazu die Hinweisseite `/auth/fehler` mit acht Gründen.
  - `/anmelden` und `/registrieren` leiten mit Schalter weiter.
  - Das Abmelden geht über das gemeinsame Konto.
  - Geschützte Seiten merken sich das Ziel (`?ziel=`).
- Abweichung vom Plan: Für das Abmelden ohne Rückfrage speichert die Sitzung
  das ID-Token als `id_token_hint` (`AuthSession.oidcIdToken`).
- `oauth4webapi` ist per `overrides` auf 3.8.8 festgelegt. 3.8.9 war beim
  Einbau erst drei Tage alt, die Zwei-Wochen-Regel gilt auch für transitive
  Pakete.
- Tests:
  - Einheiten: 28 neue, dazu 7 zur Konfiguration.
  - Integration: 9 Kontoregeln und Rückkanal gegen echtes Postgres.
  - E2E: deaktivierte Routen, Ziel, Hinweisseite mit axe hell und dunkel.

Gemergt als PR #98 (`80a34aa`).

**23.11.2026, Schritt 3 live:**

- `einrichten.mjs --anwendungen` hat das Projekt „Lernpfade“ und die
  Anwendung „AIPfad“ angelegt (Client-ID `400919885422606183`).
  - Die Rückkanal-Abmeldung der Instanz war schon an.
  - „Login V2 erforderlich“ ist unverändert an.
  - Der befristete System-Nutzer ist wieder entfernt, sein Schlüssel gelöscht.
- AIPfad läuft auf `80a34aa` mit allen vier `AUTH_*`-Werten und Schalter
  `aus`. Client-Secret und Zustandsschlüssel gingen nur als Datei an
  Railway; die Dateien sind gelöscht.
- Die Anmelde-App verlangt jetzt eine bestätigte Adresse, bevor eine
  Anmeldung abgeschlossen wird (`EMAIL_VERIFICATION=true`, auch auf dem
  Probedienst).
- Live geprüft im Browser:
  - `/auth/anmelden` führt zur Anmeldeseite des Kontos („Willkommen
    zurück“), mit PKCE, `state`, `nonce` und `ui_locales=de`.
  - `?modus=registrieren` führt zu „Konto erstellen“.
  - Das Zustandscookie ist `__Host-`, `Secure`, `HttpOnly` und
    `SameSite=Lax`.
  - Eine Rückkehr ohne Zustand landet auf der Hinweisseite.
  - `/anmelden` zeigt weiter das eigene Formular.
  - Der Rückkanal lehnt ungültige Token mit 400 ab.

**23.11.2026, Schritt 4:** Strecke gegen einen echten ZITADEL
(`.github/workflows/aipfad-konto-e2e.yml`, `konto/pruefung/e2e/`,
`aipfad/e2e-konto/`).

- Vier Abläufe, lokal zweimal hintereinander grün (Einzelheiten in
  `aipfad/docs/TESTING.md`): Anmelden mit Onboarding und Abmelden,
  Rückkanal-Abmeldung, Bestätigungspflicht, Registrierung.
- Die Strecke hat zwei Fehler gefunden, die live gewesen wären:
  - Die Abmelde-Adresse kam ohne Schrägstrich, darum lehnte ZITADEL das
    Abmelden ab. Behoben in `zentral.ts`.
  - Auf Seiten mit bekannter Organisation zeigte die Anmeldung eingebaute
    Texte in Sie-Form. Behoben durch Texte auch auf Organisationsebene
    (`einrichten.mjs`); auf konto.lernpfade.net nachzuziehen.

Offen ist Schritt 5: Rundgang mit einer echten Adresse, danach Schalter `an`.
