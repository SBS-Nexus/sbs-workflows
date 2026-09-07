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

## Sicherheitsprüfung zu PR #29

### Durchgeführte Prüfungen

Der dedizierte `claude-security`-Workflow **konnte nicht ausgeführt
werden**: Die dafür nötige Workflow-Fähigkeit von Claude Code stand in der
Sitzung nicht zur Verfügung. Das ist ausdrücklich **kein** bestandener
Sicherheitstest und darf nicht als solcher dargestellt werden.

> dedicated claude-security workflow could not execute because the required
> Claude Code workflow capability was unavailable in this session.

Ersatzweise wurden zwei unabhängige, getrennt aufgesetzte Prüfungen über
`aipfad/` und `.github/workflows/aipfad-ci.yml` durchgeführt:

1. **Auth, Authorisierung, Missbrauch, Datenschutz** — 0 kritisch, 0 hoch.
2. **Web, Daten, Lieferkette** — 0 kritisch, 0 hoch.

Ausdrücklich gegengeprüft und ohne Fund: kein IDOR über `LessonProgress`,
`Attempt`, `HintReveal`, `LabAttempt`, `ConceptMastery`, `ReviewQueueItem`
(jede Abfrage ist auf die Sitzungs-`userId` bezogen); kein Mass Assignment;
unveröffentlichte Inhalte sind auf keinem Pfad erreichbar; `toPublicPayload()`
entfernt die Lösungsdaten aller sieben Interaktionsformen; Hinweistexte
verlassen die öffentliche Aufgabe nicht; genau ein `dangerouslySetInnerHTML`
mit einer Konstanten; kein Open Redirect; scrypt mit OWASP-Parametern und
`timingSafeEqual`; Sitzungstoken nur als SHA-256-Hash gespeichert; Lockfile
vollständig integritätsgesichert.

### Einstufung der mittleren Funde

| Fund                                                                                       | Einstufung                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ratengrenzen über ein client-gesetztes `x-forwarded-for` umgehbar                          | **BEHOBEN** — zuerst die Plattform-Kopfzeile, sonst der rechte Eintrag der Kette.                                                                                                                                                                                 |
| Anmeldegrenze nur je (IP, E-Mail), ein Konto über viele Herkünften beliebig oft angreifbar | **BEHOBEN** — zusätzliche kontobezogene Grenze ohne IP-Anteil.                                                                                                                                                                                                    |
| Rechenaufwand von scrypt vor der Authentifizierung als Verstärkungsfläche                  | **AKZEPTIERT MIT BEGRÜNDUNG** — die Grenzen greifen davor, und auf der Zielplattform ist die Herkunft nicht fälschbar. Vollständig entschärft erst mit dem gemeinsamen Zähler unten; bis dahin ist der Aufwand je Anfrage begrenzt und die Kosten sind gedeckelt. |
| Ratenbegrenzung im Prozessspeicher, hält nicht über Instanzen                              | **AKZEPTIERT MIT BEGRÜNDUNG** — bereits oben als Restrisiko geführt. Vor dem öffentlichen Start wird auf einen gemeinsamen Zähler gewechselt; die Schnittstelle bleibt gleich.                                                                                    |
| `script-src` erlaubt `'unsafe-inline'`                                                     | **AKZEPTIERT MIT BEGRÜNDUNG** — Kompromiss des App Routers für das Skript gegen das Themen-Flackern. Es existiert keine Injektionsstelle: genau ein `dangerouslySetInnerHTML`, und das mit einer Konstanten. Umstellung auf ein Nonce ist vorgemerkt.             |

Es bleibt kein mittlerer Fund ohne Einstufung.

Die niedrigen Funde sind dokumentiert und angenommen: unter anderem die
Existenzauskunft bei der Registrierung, die auf Haupt-Versionen statt auf
Commit-Hashes gepinnten GitHub-Actions (der Lauf trägt keine Geheimnisse),
`legacy-peer-deps`, das vorbereitete, aber nicht angebundene
Double-Submit-Verfahren und die ebenfalls nicht angebundene
Aufbewahrungsfrist — beide sind oben als solche gekennzeichnet.

## Git-Simulatoren (Ausbaustufe 2)

Die drei Git-Simulatoren unter `src/domain/git/` sind **reine Funktionen über
einem übergebenen Zustand**. Sie führen kein echtes Git aus, öffnen keine
Shell, greifen auf kein Dateisystem zu und sprechen kein Netz an. Ein
eingegebener Befehl wird zerlegt und mit einer festen Liste umgesetzter
Unterbefehle verglichen; alles andere wird abgelehnt. Damit gibt es keine
Command Injection, weil es keinen Interpreter gibt, in den etwas
hineingereicht werden könnte.

Nicht umgesetzte Schalter werden ausdrücklich abgelehnt statt übergangen
(`src/domain/git/schalter.ts`). Das ist zunächst eine didaktische
Entscheidung — ein still anderes Ergebnis lehrt etwas Falsches —, hat aber
denselben Effekt wie eine Erlaubnisliste: Was nicht ausdrücklich vorgesehen
ist, passiert nicht.

Es werden **keine GitHub-Zugangsdaten** verarbeitet, gespeichert oder
abgefragt. Das GitHub-Kapitel erklärt den Ablauf; es verbindet sich mit
keinem realen Repository, und es gibt keinen Schreibpfad nach außen.

Mechanisch über den gesamten Stage-2-Code geprüft und ohne Fund: kein
`child_process`, kein `exec`/`spawn`, kein Dateisystemzugriff, kein
`eval`/`new Function`, kein Netzwerkaufruf, kein `dangerouslySetInnerHTML`,
keine neue Abhängigkeit.

### Bewusst geänderte Grenze: Registrierungen je IP-Adresse

`registerPerIp` wurde von 15 auf 60 Anmeldungen je Stunde angehoben. Hinter
einer öffentlichen IP-Adresse steckt oft ein ganzes Netz — eine Schulklasse,
ein Büro, ein Café. Bei fünfzehn Anmeldungen je Stunde hätte der erste
Kurstag reguläre Nutzung blockiert, und ein fälschlich ausgesperrter Kurs
ist hier der größere Schaden. Gegen massenhafte Kontoerstellung bleibt die
Grenze wirksam; die Begrenzung je Konto und je Anmeldeversuch ist
unverändert.

## Bei Verdacht auf eine Sicherheitslücke

Kein öffentliches Formular in dieser Ausbaustufe. Bitte über die im
Haupt-Repository hinterlegten Kontaktwege melden.
