# Security

Übernommene Grundlage aus PythonPfad/SQLPfad (siehe dort `docs/SICHERHEIT.md`
bzw. `docs/SECURITY.md`), angepasst auf die Unterschiede dieser Ausbaustufe.

## Authentifizierung und Sitzungen

- Passwort-Hashing: scrypt (Node-Standardbibliothek, OWASP-Parameter
  N=2^16, r=8, p=1). Siehe `src/server/auth/password.ts`.
- Sitzungen: opake 32-Byte-Token, in der Datenbank liegt nur der
  SHA-256-Hash. Cookie `httpOnly`, `SameSite=Lax`, `Secure` sobald `APP_URL`
  auf `https` zeigt. Siehe `src/server/auth/session.ts`.
- CSRF: Origin-Prüfung in `src/proxy.ts` samt der eingebauten Herkunftsprüfung
  von Next.js für Server Actions, dazu `SameSite=Lax` auf dem Sitzungscookie —
  Letzteres verhindert, dass bei einer seitenfremden POST-Anfrage überhaupt
  eine Sitzung mitgeschickt wird. Das in `src/server/auth/session.ts`
  vorbereitete Double-Submit-Verfahren (`assertCsrf`, `AuthSession.csrfSecret`)
  ist derzeit NICHT aktiv: es wird von keiner Server Action aufgerufen. Es ist
  für eine spätere Ausbaustufe angelegt und darf bis dahin nicht als
  wirksame Maßnahme gezählt werden (Sicherheitsprüfung zu PR #29).
  und der eingebauten Server-Actions-Origin-Prüfung von Next.js.
- Ratenbegrenzung: gleitendes Fenster im Arbeitsspeicher
  (`src/server/security/rate-limit.ts`) für Login, Registrierung,
  Aufgaben-Abgabe und Lab-Interaktionen. Bei mehreren Instanzen muss dies
  gegen einen gemeinsamen Zähler getauscht werden (Schnittstelle bleibt
  gleich).
  **Zwei Grenzen pro Aktion**, nicht nur eine: Die feinere Grenze schlüsselt
  nach IP **und** E-Mail-Adresse (`login`/`register`) — das begrenzt Versuche
  gegen ein einzelnes Konto wirksam, aber jede neue Adresse eröffnet einen
  frischen Zähler. Ohne eine zusätzliche, gröbere Grenze ließe sich von
  derselben IP aus unbegrenzt durch viele Adressen rotieren (Credential
  Stuffing mit geleakten Zugangsdaten; Massen-Enumeration, welche Adressen
  registriert sind). Deshalb erzwingt `enforcePerIpLimit()` zusätzlich eine
  reine IP-Grenze (`loginPerIp`: 30/15 Min., `registerPerIp`: 15/Std.) —
  beide Grenzen gelten gemeinsam, keine ersetzt die andere.
- **Bekannter, akzeptierter Kompromiss — E-Mail-Enumeration bei der
  Registrierung:** `registerAction()` antwortet mit "Für diese Adresse gibt
  es bereits ein Konto" statt einer neutralen Meldung. Das verrät technisch,
  welche Adressen registriert sind. Bewusst übernommen aus
  PythonPfad/SQLPfad (dort derselbe Kompromiss, dieselbe Meldung) statt
  eigens für AIPfad abgeschwächt: Der Nutzen für Nutzende, die aus Versehen
  ein zweites Konto anlegen wollen, wiegt in einer Lernplattform ohne
  sensible Kontoinhalte höher als das Enumerationsrisiko, und die neue
  IP-Grenze oben deckelt zumindest das Ausmaß eines automatisierten
  Massenabgleichs. Bei der **Anmeldung** gibt es diesen Kompromiss
  ausdrücklich nicht: `loginAction()` prüft immer einen Passwort-Hash, auch
  bei unbekannter Adresse, und meldet in beiden Fällen dieselbe neutrale
  Meldung ("E-Mail-Adresse oder Passwort stimmen nicht") — dort ist die
  Zeit- und Antwortgleichheit bewusst vollständig durchgehalten.

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
  ACHTUNG: Die Funktion ist vorhanden, wird aber in dieser Ausbaustufe von
  nichts aufgerufen — `vercel.json` enthält keinen Cron-Eintrag. Die Löschung
  findet also derzeit NICHT statt; die Frist ist bis zur Anbindung eines
  geplanten Laufs eine Absichtserklärung, keine wirksame Maßnahme
  (Sicherheitsprüfung zu PR #29).

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
