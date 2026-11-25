# E4.5 · Hub am gemeinsamen Konto, danach Aufräumen – Bauplan

Stand 24.11.2026. Gehört zu `docs/E4-KONTO-PLAN.md`, Abschnitt 7 (E4.5), und
löst L6 aus `docs/PRODUKT-ROADMAP.md`. Seit 24.11.2026 melden alle drei Apps
über das gemeinsame Konto an (`docs/E4-4-BAUPLAN.md`).

**Tor (aus dem Plan):** `/fortschritt` im Hub zeigt echte Daten der
angemeldeten Person.

## 1. Ausgangslage

- **Hub ohne Anmeldung:** Der Hub (`lernpfade/`) hat keine Konten, keine
  Datenbank und keine Geheimnisse.
- **Abruf im Browser scheitert:** `/wiederholen` und `/fortschritt` rufen die
  Plattformquellen der Apps aus dem Browser mit der Sitzung der jeweiligen
  App ab. Das klappt nur, wenn Hub und Apps dieselbe Website sind. Mit
  `*.up.railway.app` und vier verschiedenen Domains ist das nie der Fall,
  also zeigt der Hub „nicht angemeldet“.
- **Anpassungspunkt in den Apps:** Die Routen
  `/api/platform/{progress,review}-source` bekommen die Person über
  `resolveUserId()`. Der HTTP-Adapter verlangt keinen `Origin` und setzt CORS
  nur für den Hub. Ein Abruf von Server zu Server passt damit ohne Änderung
  am Adapter.

## 2. Zielbild

```
Browser ── www.lernpfade.net (Hub) ──Anmelden──▶ konto.lernpfade.net
                 │  Hub-Sitzung: verschlüsseltes Cookie (keine Datenbank)
                 │
                 └─ Server des Hubs ── GET /api/platform/progress-source ──▶ App
                                       Authorization: Bearer <Zugriffstoken>
                                       (App prüft das Token und ordnet über sub zu)
```

- **Hub als OIDC-Client:** Anwendung „Lernpfade-Hub“ im Projekt „Lernpfade“.
  Code-Flow mit PKCE wie in den Apps. Zugriffstoken im JWT-Format, damit die
  Apps sie selbst prüfen können.
- **Sitzung ohne Datenbank:** Ein verschlüsseltes Cookie (JWE, `dir` +
  `A256GCM`, Schlüssel `HUB_SESSION_SECRET`) hält `sub`, Anzeigenamen,
  Zugriffs- und Aktualisierungstoken. Der Browser kann es nicht lesen.
  `httpOnly`, `Secure`, `SameSite=Lax`, `__Host-`-Präfix.
- **Kurze Zugriffstoken, Aktualisierung über den Server:** Das Zugriffstoken
  gilt kurz. Läuft es ab, holt der Hub-Server mit dem Aktualisierungstoken
  ein neues. Hat sich die Person beim Konto abgemeldet, schlägt das fehl,
  und der Hub meldet ab. So endet der Zugriff des Hubs spätestens mit dem
  Ablauf des Zugriffstokens, auch ohne Rückkanal und ohne Datenbank.
- **Apps als geschützte Ressource:** Neues Vertragsmodul
  `zentral-zugriff.ts` in `docs/learning-auth/`. Hat eine Anfrage
  `Authorization: Bearer`, gilt nur das Token, ohne Rückfall auf ein Cookie.
  Die App prüft:
  - Signatur über die JWKS des Kontos, Aussteller und Ablauf;
  - `aud` enthält die Client-ID des Hubs, `client_id` ist die des Hubs;
  - dann ordnet sie über `sub` → `User.authSubject` zu.

  Ohne `AUTH_HUB_CLIENT_ID` ist der Weg aus.

- **Abruf von Server zu Server:** Der Hub-Server ruft die Quellen der Apps ab
  und gibt dem Browser nur das geprüfte Ergebnis. CORS und gleiche Website
  sind dafür nicht mehr nötig. Die Browser-Föderation (LP-05B/LP-07) wird
  durch diesen Weg ersetzt.

## 3. Etappen

| Etappe                      | Inhalt                                                                                                                                                                                             | Tor                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **E4.5a Apps nehmen Token** | `zentral-zugriff.ts` im Vertrag; die Plattformquellen der drei Apps nehmen ein Zugriffstoken des Hubs an. Unit- und Integrationstests, Strecke gegen echten ZITADEL (Token holen, Quelle abrufen). | CI grün; ohne `AUTH_HUB_CLIENT_ID` unverändert                                  |
| **E4.5b Hub meldet an**     | Anwendung „Lernpfade-Hub“, Hub-Sitzung im verschlüsselten Cookie, Anmelden, Abmelden, Aktualisieren. Anzeige „angemeldet als …“ im Kopf. Domain `www.lernpfade.net` für den Hub.                   | Rundgang: anmelden im Hub ohne erneute Passworteingabe nach einer App, abmelden |
| **E4.5c Echte Daten**       | `/fortschritt` und `/wiederholen` holen die Quellen über den Hub-Server mit Token; die Browser-Föderation entfällt.                                                                                | **`/fortschritt` zeigt echte Daten der angemeldeten Person** (Tor des Plans)    |
| **E4.5d Aufräumen**         | Nach der Frist (Vorschlag: 3 Monate stabil, also frühestens 24.02.2027): Passwort-Hashes aus den Apps löschen, eigene Anmelde- und Registrierungsformulare und den Schalter entfernen.             | eigener Bauplan mit Sicherung vorher; Löschen der Hashes nur nach Freigabe      |

## 4. Entscheidungen

- **Kurze Zugriffstoken statt Widerruf:** Ohne Datenbank kann der Hub keine
  Sitzungen sperren. Dafür ist das Zugriffstoken kurzlebig, und der
  Hub-Server muss regelmäßig aktualisieren. Für die Apps ändert das nichts:
  Sie nutzen nur das ID-Token.
- **Nur der Hub darf lesen:** Die Apps nehmen ausschließlich Token mit der
  Client-ID des Hubs an. Ein Token, das eine App für sich bekommen hat, öffnet
  bei einer anderen App nichts.
- **Weiter nur lesend:** Die Plattformquellen bleiben schreibgeschützt und
  liefern nur Zusammenfassungen. Am Vertrag (Schema 1) ändert sich nichts.
- **Domain des Hubs:** `www.lernpfade.net`, Apex leitet weiter. DNS bei
  Strato, eigene Domain bei Railway wie bei `konto.lernpfade.net`.

## 5. Offene Punkte

- Lebensdauer des Zugriffstokens: Die Einstellung bei ZITADEL gilt für die
  ganze Instanz. Vorschlag: 15 Minuten. Die Aktualisierungstoken laufen nach
  Leerlauf ab; Werte festlegen in E4.5b.
- Hinweis im Hub, wenn eine App ein Konto noch nicht verbunden hat: Die
  Person war dort noch nie über das gemeinsame Konto angemeldet. Die App
  antwortet dann wie „nicht angemeldet“, und der Hub verlinkt auf die App.

## 6. Stand

**24.11.2026, E4.5a umgesetzt** (Zweig `claude/e4-5-hub-client-20261124`):

- Vertrag:
  - `zentral-zugriff.ts`, `pruefeHubToken()` in `zentral-identitaet.ts`,
    `oeffentlicheSchluessel()` in `zentral.ts`;
  - `AUTH_HUB_CLIENT_ID` in `zentral-konfiguration.ts`. Gesetzt verlangt der
    Wert auch die übrigen `AUTH_*`-Werte.
  - Insgesamt 18 Dateien.
- Die sechs Plattformrouten der drei Apps nehmen mit `Authorization: Bearer`
  nur das Token des Hubs, sonst wie bisher die Sitzung. Der Drift-Check prüft
  das.
- `anwendungen.mjs`: Anwendung „Lernpfade-Hub“ mit JWT-Zugriffstoken,
  Aktualisieren und ohne Rückkanal. Die Teststrecke registriert sie auf
  `http://127.0.0.1:3210`.
- Tests:
  - Einheiten zu Token des Hubs, Token einer App, fremder Zielgruppe,
    fehlender `client_id`, fremdem Aussteller, fehlendem `sub`, abgelaufenem
    und fremd signiertem Token, und für den Fall ohne eingerichteten Hub.
  - Strecke gegen echten ZITADEL je App: ein echtes Token des Hubs öffnet die
    Fortschrittsquelle (200, Schema 1). Ohne Token, mit verfälschtem Token und
    mit `Basic` gibt es 401.

Ohne `AUTH_HUB_CLIENT_ID` ändert sich in den Apps nichts. Gesetzt wird der
Wert in E4.5b, sobald die Anwendung des Hubs eingerichtet ist.
