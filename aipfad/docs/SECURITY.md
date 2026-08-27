# Security

Übernommene Grundlage aus PythonPfad/SQLPfad (siehe dort `docs/SICHERHEIT.md`
bzw. `docs/SECURITY.md`), angepasst auf die Unterschiede dieser Ausbaustufe.

## Authentifizierung und Sitzungen

- Passwort-Hashing: scrypt (Node-Standardbibliothek, OWASP-Parameter
  N=2^16, r=8, p=1). Siehe `src/server/auth/password.ts`.
- Sitzungen: opake 32-Byte-Token, in der Datenbank liegt nur der
  SHA-256-Hash. Cookie `httpOnly`, `SameSite=Lax`, `Secure` sobald `APP_URL`
  auf `https` zeigt. Siehe `src/server/auth/session.ts`.
- CSRF: Double-Submit-Token zusätzlich zur Origin-Prüfung in `src/proxy.ts`
  und der eingebauten Server-Actions-Origin-Prüfung von Next.js.
- Ratenbegrenzung: gleitendes Fenster im Arbeitsspeicher
  (`src/server/security/rate-limit.ts`) für Login, Registrierung,
  Aufgaben-Abgabe und Lab-Interaktionen. Bei mehreren Instanzen muss dies
  gegen einen gemeinsamen Zähler getauscht werden (Schnittstelle bleibt
  gleich).

## Kein Live-KI-Aufruf in dieser Ausbaustufe

Anders als PythonPfads optionaler KI-Tutor macht AIPfad in dieser
Ausbaustufe **keinen** Aufruf an einen externen KI-Anbieter. Alle Übungen
und Labs (Terminal-Simulator, Tokenizer, Context-Window-Visualisierung,
Prompt-Repair) sind deterministisch und laufen vollständig gegen
statische, mitgelieferte Beispieldaten. Es gibt daher:

- keine API-Schlüssel in dieser Ausbaustufe,
- keine Datenübertragung an Dritte beim Bearbeiten von Übungen,
- keinen Kostenrahmen, der überschritten werden könnte.

Ein AI-Gateway für spätere Live-Funktionen ist ein dokumentierter nächster
Ausbauschritt (siehe `docs/LEHRPLAN.md`) und wird, wenn gebaut, serverseitig
zentralisiert, mit expliziter Einwilligung, Rate-Limits und Kostenbudget –
niemals mit einem API-Schlüssel im Client.

## Terminal-Simulator

Der Terminal-Simulator in Stufe 1 führt **keine echten Befehle aus**. Er ist
eine deterministische, vorab geskriptete Zustandsmaschine
(`TERMINAL_SIMULATION`-Nutzlast, siehe `src/domain/content/exercise-payload.ts`):
Jeder Schritt hat einen erwarteten Befehl und eine vordefinierte Ausgabe.
Es gibt keinen Weg, beliebige Zeichenketten an eine echte Shell zu senden.
Gefährliche Befehle (z. B. `rm`) sind in der Nutzlast explizit als
`dangerous: true` markiert und werden im UI entsprechend hervorgehoben.

## Eingabevalidierung

Jede Server-Action- und Route-Handler-Grenze validiert Eingaben mit Zod.
Formulardaten werden nie ungeprüft in eine Datenbankabfrage oder Antwort
übernommen.

## Sicherheits-Header

Strikte Content-Security-Policy ohne `unsafe-eval` in Produktion (siehe
`next.config.ts`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, eingeschränkte
`Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`. HSTS wird
in `src/proxy.ts` nur gesetzt, wenn `APP_URL` tatsächlich auf `https` zeigt.

## Datenschutz

- Personenbezogene Lerndaten (`Attempt`, `ConceptMastery`, `LessonProgress`
  usw.) und anonyme Produktanalyse (`AnalyticsEvent`) sind strikt getrennt;
  `AnalyticsEvent` hat keinen Fremdschlüssel auf `User`.
- Jeder Fremdschlüssel auf `User` hat `onDelete: Cascade` – ein einziges
  `prisma.user.delete()` entfernt sämtliche personenbezogenen Daten.
- Aufbewahrungsfrist für `Attempt`-Rohdaten konfigurierbar über
  `ATTEMPT_RETENTION_DAYS` (`src/server/auth/session.ts:applyRetentionPolicy`).

## Bekannte, akzeptierte Restrisiken dieser Ausbaustufe

- **`deepmerge-ts` (transitive Abhängigkeit von `prisma`/`@prisma/config`,
  Dev-Werkzeug):** `npm audit` meldet eine hohe Einstufung
  (Stack-Erschöpfung beim Zusammenführen rekursiver Objektgraphen,
  GHSA-ggr8-5vv4-36mx). Betroffen ist ausschließlich die Prisma-CLI
  (Migrations-/Codegenerierungs-Werkzeug), nicht der zur Laufzeit
  ausgelieferte `@prisma/client`. Ein Fix würde ein Downgrade auf
  Prisma 6.x erzwingen, was der bewussten Versionsübereinstimmung mit
  PythonPfad/SQLPfad (Prisma 7.9.1) widerspräche. `npm audit --omit=dev`
  meldet für die tatsächlich ausgelieferten Abhängigkeiten **keine**
  Funde.
- **In-Memory-Ratenbegrenzung:** wirkungslos bei horizontaler Skalierung
  auf mehrere Instanzen. Dokumentiert, Schnittstelle bleibt beim Wechsel
  auf einen gemeinsamen Zähler (z. B. Redis) gleich.

## Bei Verdacht auf eine Sicherheitslücke

Kein öffentliches Formular in dieser Ausbaustufe. Bitte über die im
Haupt-Repository hinterlegten Kontaktwege melden.
