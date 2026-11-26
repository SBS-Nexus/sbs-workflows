# Fehlerbericht — Fehler an Sentry (EU) ohne Personendaten (E6.3)

Hub, PythonPfad, SQLPfad und AIPfad melden Fehler an Sentry. Sentry speichert
sie in der EU (Frankfurt). Plan und Entscheidungen: `docs/E6-PLAN.md`
(Abschnitt E6.3).

## Grundsatz

Es geht nur hinaus, was der Kern ausdrücklich erlaubt:

| Im Bericht                                                        | Nie im Bericht                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Fehlerart, bereinigte Meldung (höchstens 500 Zeichen)             | Namen, E-Mail-Adressen, Kontokennungen, IP-Adressen         |
| Aufrufstapel: Datei (ohne Herkunft und Abfrage), Funktion, Zeile  | Cookies, Kopfzeilen, Anfrage- und Antwortinhalte            |
| Routenmuster (`/einladung/[token]`) oder Pfad mit `:id` (Browser) | Abfrageteile von Adressen, Tokens, Schlüssel, Zugangsdaten  |
| Methode, Art (`render`, `route`, `action`, `proxy`, `browser`)    | Lerninhalte, Antworten, eingereichter Code                  |
| `digest` (die „Referenz“ der Fehlerseite), Version, Umgebung      | Breadcrumbs, Sitzungen, Leistungsdaten, Bildschirmaufnahmen |

- **Bereinigung:** Vor dem Versand werden ersetzt:
  - E-Mail-Adressen, JWTs und UUIDs,
  - IPv4- und IPv6-Adressen,
  - Kennungen ab 20 Zeichen mit Ziffer und Zahlenfolgen ab sechs Ziffern,
  - Zugangsdaten in Adressen und Abfrageteile,
  - zitierte Werte mit Leerzeichen oder über 32 Zeichen.
- **Browser:** Der Browser spricht nie mit Sentry. Fehler gehen ohne Cookies
  an die eigene Route `POST /api/fehlerbericht`. Der Server prüft dort
  Herkunft, Typ, Größe (16 KB) und Schema, bereinigt den Bericht und gibt ihn
  weiter. Sentry sieht deshalb keine IP-Adressen der Nutzenden, und die
  Datenschutzhinweise („keine eingebundenen Inhalte Dritter“) bleiben wahr.
- **Nur EU:** `SENTRY_DSN` muss auf `*.ingest.de.sentry.io` zeigen. Eine
  andere Adresse wird abgelehnt und einmal im Protokoll gemeldet
  (`fehlerbericht_dsn_ungueltig`).
- **Drossel:**
  - Server: höchstens 30 Berichte je Minute und Instanz.
  - Browser: höchstens 20 Berichte je Minute auf dem Server, im Browser fünf
    je Seitenaufruf.
  - Derselbe Fehler geht nur einmal je Minute hinaus.
- **Nie störend:** Ist Sentry nicht erreichbar, gibt es eine Warnzeile
  (`fehlerbericht_nicht_gesendet`), aber keinen Fehler. Die Frist beträgt
  3 s.
- **Ohne `SENTRY_DSN`** geht nichts hinaus. Das gilt lokal, in Tests und
  in der CI.
- **Steuerfehler** von Next (Weiterleitung, 404, dynamische Nutzung) sind
  keine Fehler und werden nicht gemeldet.
- **Kein Sentry-SDK:** Das SDK sammelt in Version 11 ohne eigene
  Einstellungen auch Kopfzeilen, Inhalte und IP-Adressen. Der eigene Kern
  braucht keinen Bündler-Eingriff und hängt nicht an wöchentlichen
  SDK-Versionen. Der Drift-Check lässt kein `@sentry/*` zu.

## Ablage und Synchronisation

Wie beim Anmeldevertrag gibt es kein gemeinsames Paket, sondern
**bytegleiche Kopien**. Kanonisch ist dieser Ordner.

| Kanonisch (`docs/learning-fehlerbericht/`) | Kopie in `lernpfade/`, `pythonpfad/`, `sqlpfad/`, `aipfad/` |
| ------------------------------------------ | ----------------------------------------------------------- |
| `fehlerbericht.ts` (Kern, ohne Importe)    | `src/server/fehlerbericht/fehlerbericht.ts`                 |
| `fehlerbericht-server.ts`                  | `src/server/fehlerbericht/fehlerbericht-server.ts`          |
| `anfragefehler.ts`                         | `src/server/fehlerbericht/anfragefehler.ts`                 |
| `route-fehlerbericht.ts`                   | `src/app/api/fehlerbericht/route.ts`                        |
| `fehlerbericht-browser.ts`                 | `src/lib/fehlerbericht-browser.ts`                          |
| `instrumentation-client.ts`                | `src/instrumentation-client.ts`                             |

Was jede App selbst trägt:

- **`src/instrumentation.ts`:** bleibt App-eigen (AIPfad prüft dort die
  Umgebung). Sie muss weiterreichen:
  `export { onRequestError } from '@/server/fehlerbericht/anfragefehler';`
- **`src/app/error.tsx`:** ruft im Effekt `meldeBrowserfehler(error)` auf.
  Fehler mit `digest` hat der Server schon gemeldet.

Geändert wird nur hier. Danach in alle vier Projekte kopieren und prüfen:

```bash
node scripts/check-learning-fehlerbericht.mjs
```

```bash
node --experimental-strip-types --test docs/learning-fehlerbericht/*.test.ts
```

Beides läuft in `.github/workflows/lernpfade-ci.yml` im Job `fehlerbericht`.

## Betrieb

| Variable                 | Wert                                                                       |
| ------------------------ | -------------------------------------------------------------------------- |
| `SENTRY_DSN`             | DSN des Sentry-Projekts des Dienstes (`https://…@….ingest.de.sentry.io/…`) |
| `SENTRY_ENVIRONMENT`     | optional, Voreinstellung `production`                                      |
| `RAILWAY_GIT_COMMIT_SHA` | setzt Railway; die ersten 12 Zeichen werden zur Version (`release`)        |

Je Dienst gibt es ein eigenes Sentry-Projekt: `lernpfade`, `pythonpfad`,
`sqlpfad`, `aipfad`. Die DSN ist laut Sentry kein Geheimnis; sie steht
trotzdem nur in den Railway-Variablen und nie im Browser.
