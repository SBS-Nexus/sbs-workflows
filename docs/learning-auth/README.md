# Anmeldevertrag — Anmeldung über das gemeinsame Konto (E4.2, E4.4)

PythonPfad, SQLPfad und AIPfad melden über das gemeinsame Konto
(konto.lernpfade.net, ZITADEL) an. Das Konto bestätigt, wer jemand ist.
Sitzung, Rollen und Lernstand bleiben in jeder App. Pläne:
`docs/E4-2-BAUPLAN.md` und `docs/E4-4-BAUPLAN.md`.

## Ablage und Synchronisation

Wie bei Shell, Komponenten und Tokens: kein gemeinsames Paket, sondern
**bytegleiche Kopien**. Kanonisch ist dieser Ordner.

| Kanonisch (`docs/learning-auth/`)        | Kopie je App                                   |
| ---------------------------------------- | ---------------------------------------------- |
| `zentral-zustand.ts`                     | `src/server/auth/zentral-zustand.ts`           |
| `zentral-identitaet.ts`                  | `src/server/auth/zentral-identitaet.ts`        |
| `zentral-konfiguration.ts`               | `src/server/auth/zentral-konfiguration.ts`     |
| `zentral-protokoll.ts`                   | `src/server/auth/zentral-protokoll.ts`         |
| `zentral.ts`                             | `src/server/auth/zentral.ts`                   |
| `zentral-konto.ts`                       | `src/server/auth/zentral-konto.ts`             |
| `zentral-cookie.ts`                      | `src/server/auth/zentral-cookie.ts`            |
| `zentral-hinweise.ts`                    | `src/server/auth/zentral-hinweise.ts`          |
| `zentral-zugriff.ts`                     | `src/server/auth/zentral-zugriff.ts`           |
| `route-anmelden.ts`                      | `src/app/auth/anmelden/route.ts`               |
| `route-rueckkehr.ts`                     | `src/app/auth/rueckkehr/route.ts`              |
| `route-abmelden-rueckkanal.ts`           | `src/app/auth/abmelden-rueckkanal/route.ts`    |
| `zentral-zustand.test.ts`                | `tests/unit/zentral-zustand.test.ts`           |
| `zentral-identitaet.test.ts`             | `tests/unit/zentral-identitaet.test.ts`        |
| `zentral-konfiguration.test.ts`          | `tests/unit/zentral-konfiguration.test.ts`     |
| `zentrale-anmeldung.integration.test.ts` | `tests/integration/zentrale-anmeldung.test.ts` |
| `e2e-konto.ts`                           | `e2e-konto/konto.ts`                           |
| `e2e-zentrale-anmeldung.spec.ts`         | `e2e-konto/zentrale-anmeldung.spec.ts`         |

Geändert wird nur hier. Danach in alle drei Apps kopieren und prüfen:

```bash
node scripts/check-learning-auth.mjs
```

Der Check läuft in `.github/workflows/lernpfade-ci.yml` als eigener Job. Er
scheitert, wenn:

- eine Kopie fehlt oder abweicht,
- ein Adapter fehlt,
- `env.ts` die Felder nicht aufnimmt,
- `/auth/fehler` die Texte nicht nutzt,
- das Schema ohne die Verknüpfungsfelder ist,
- oder `openid-client`, `jose` und die Festlegung von `oauth4webapi`
  zwischen den Apps abweichen.

## App-eigen

- `src/server/auth/zentral-app.ts`: `ANMELDE_COOKIE` (`<app>_anmeldung`)
  und `STARTSEITE` nach der Anmeldung.
- `src/server/env.ts`: nimmt `...zentraleAnmeldungFelder` auf und prüft mit
  `pruefeZentraleAnmeldung`.
- `src/server/auth/session.ts`:
  - `createSession(userId, zentral?)`,
  - `destroySession()` mit Rückgabe `{ zentral, idToken }`,
  - `destroyZentraleSitzungen()`.
- `src/app/auth/fehler/page.tsx`: eigene Bausteine, Texte aus
  `zentral-hinweise.ts`.
- `/anmelden`, `/registrieren`, `logoutAction`, der Proxy mit `?ziel=`.
- `e2e-konto/app.ts`: Startseite, Cookie-Name, Onboarding, wo „Abmelden“
  steht. Dazu `playwright.konto.config.ts`.

## Was der Vertrag regelt

Die Sicherheitsbegründung steht in `aipfad/docs/SECURITY.md`, Abschnitt
„Anmeldung über das gemeinsame Konto“. Kurz:

- Code-Flow mit PKCE, `state` und `nonce`.
- Signierter Zustand, 30 Minuten gültig. Geht er verloren, startet die
  Anmeldung einmal selbst neu.
- Rücksprungziele nur relativ.
- Verbunden oder angelegt wird nur mit bestätigter Adresse.
- Adminrechte nur mit zweitem Faktor.
- Abmelden über `end_session`, Rückkanal-Abmeldung nach Back-Channel
  Logout 1.0.
- `?bestaetigen=1` verlangt eine frische Anmeldung beim Konto. Wann sie war,
  liest `anmeldezeitAus()` aus dem gespeicherten ID-Token; SQLPfad nutzt das
  vor dem Löschen eines Kontos.
- Plattformquellen (E4.5, `docs/E4-5-BAUPLAN.md`): Mit
  `Authorization: Bearer` nehmen `/api/platform/{progress,review}-source` nur
  ein Zugriffstoken des Hubs an (`zentral-zugriff.ts`, `pruefeHubToken()`).
  Geprüft werden Signatur, Aussteller, Ablauf, Zielgruppe und `client_id` =
  `AUTH_HUB_CLIENT_ID`. Ohne diesen Wert ist der Weg aus.
