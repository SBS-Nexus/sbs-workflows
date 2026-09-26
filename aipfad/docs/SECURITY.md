# Security

Übernommene Grundlage aus PythonPfad (siehe `pythonpfad/docs/SICHERHEIT.md`),
ergänzt um die für AIPfad relevanten Unterschiede dieser Ausbaustufe.

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
- Ratenbegrenzung: gleitendes Fenster in PostgreSQL
  (`src/server/security/rate-limit.ts`, Tabelle `rate_limit_buckets`) für
  Login, Registrierung, Aufgaben-Abgabe und Lab-Interaktionen. Der Zähler ist
  damit über alle Serverinstanzen hinweg GEMEINSAM (E03). Vorher lag er in
  einer `Map` je Prozess: Bei mehreren Instanzen zählte jede für sich, und
  die tatsächlich mögliche Anzahl Versuche war das Limit mal der Anzahl
  Instanzen. Einzelheiten unten unter "Gemeinsame Ratenbegrenzung".
  **Zwei Grenzen pro Aktion**, nicht nur eine: Die feinere Grenze schlüsselt
  nach IP **und** E-Mail-Adresse (`login`/`register`) — das begrenzt Versuche
  gegen ein einzelnes Konto wirksam, aber jede neue Adresse eröffnet einen
  frischen Zähler. Ohne eine zusätzliche, gröbere Grenze ließe sich von
  derselben IP aus unbegrenzt durch viele Adressen rotieren (Credential
  Stuffing mit geleakten Zugangsdaten; Massen-Enumeration, welche Adressen
  registriert sind). Deshalb erzwingt `enforcePerIpLimit()` zusätzlich eine
  reine IP-Grenze (`loginPerIp`: 30/15 Min., `registerPerIp`: 60/Std.) —
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

## Gemeinsame Ratenbegrenzung (E03)

Der Zähler liegt in PostgreSQL, Tabelle `rate_limit_buckets`, eine Zeile je
Grenzenschlüssel. Kein Redis, kein zusätzlicher Dienst: Die Datenbank wird zur
Laufzeit ohnehin gebraucht.

**Was gespeichert wird.** Drei Spalten, mehr nicht: `keyHash`, `hits`,
`expiresAt`. Der Grenzenschlüssel selbst — er enthält je nach Grenze eine
IP-Adresse, eine E-Mail-Adresse oder eine Nutzerkennung — geht ausschließlich
als SHA-256-Digest hinein. **Es wird keine IP-Adresse und keine E-Mail-Adresse
im Klartext gespeichert**, und es gibt keinen Fremdschlüssel auf `User`.

Das ist ein **pseudonymisierter Nachschlageschlüssel, nicht Anonymisierung**:
Wer die Tabelle lesen kann und eine bestimmte Adresse vermutet, kann den
Digest nachrechnen und den Verdacht bestätigen. Der Digest ist ungeschlüsselt
(kein HMAC), weil der Zweck Datensparsamkeit beim Nachschlagen ist und nicht
Geheimhaltung gegenüber jemandem, der bereits Lesezugriff auf die Datenbank
hat; ein zusätzliches Geheimnis müsste verwaltet und gedreht werden, ohne an
dieser Lage etwas zu ändern.

**Wie lange.** `expiresAt` ist der jüngste GEZÄHLTE Versuch plus Fensterbreite
— der Zeitpunkt, ab dem die Zeile nichts mehr abweisen kann. Ein abgewiesener
Versuch wird nicht gezählt und verlängert die Aufbewahrung deshalb auch nicht.
Abgelaufene Zeilen werden tatsächlich entfernt, nicht nur als entfernbar
markiert: Je hundertster Anfrage läuft ein auf fünfhundert Zeilen gedeckeltes
Aufräumen über den Index auf `expiresAt`. Längste Fensterbreite im System:
eine Stunde.

Einschränkung, die dazugehört: Der Zähler für "jede hundertste Anfrage" ist
Modulzustand JE PROZESS, nicht global. Auf einer Plattform, die Instanzen
häufig neu startet, kann eine Instanz sterben, bevor sie hundert Anfragen
gesehen hat — sie räumt dann nie auf. Die Aufräumrate wächst also mit der Last
je Instanz, nicht mit der Last insgesamt. Harmlos für die Durchsetzung
(abgelaufene Zeilen weisen nichts mehr ab) und für die Abfragekosten (der
Zugriff geht über den Primärschlüssel), aber es heißt, dass die Tabelle in
einem solchen Betrieb länger belegt bleiben kann als die eine Stunde
Fensterbreite. Ein regelmäßiger Lauf wäre die Lösung, ist aber neue
Infrastruktur und damit nicht im Umfang von E03.

**Atomarität.** Prüfen und Zählen bilden eine Transaktion mit Zeilensperre
(`SELECT … FOR UPDATE`, davor ein `INSERT … ON CONFLICT DO NOTHING`, damit
auch der allererste Zugriff auf einen Schlüssel serialisiert ist). Zwei
gleichzeitige Anfragen auf denselben Schlüssel können nicht beide freie
Kapazität sehen. Nachgewiesen in `tests/integration/rate-limit.test.ts`, und
zwar über **zwei getrennte Serverprozesse** mit je eigenem Verbindungspool —
nicht über zwei Aufrufe in einem Prozess.

Ein Sonderfall ist eigens behandelt: Räumt ein Aufräumlauf die Zeile genau
zwischen Anlegen und Sperren weg, sperrt `FOR UPDATE` nichts mehr. Dann wird
neu angesetzt statt auf dem leeren Stand entschieden — sonst bliebe bei zwei
gleichzeitigen Anläufen ein Versuch ungezählt. Dieser Zweig ist nicht
verlässlich abgedeckt: Ein Test trifft ihn, aber nur je nach Lauf (siehe
docs/TESTING.md). Reicht der Neu-Ansatz nicht aus, wird abgewiesen, nie
durchgelassen.

**Verhalten bei nicht erreichbarer Datenbank: FAIL CLOSED.** Ist die Grenze
nicht prüfbar, wird abgewiesen (`RateLimitUnavailableError`), nicht
durchgelassen. Einheitlich für alle Grenzen. Für Anmeldung und Registrierung
ist das der Kern der Sache: Durchlassen hieße, bei einem Datenbankausfall
genau den Schutz abzuschalten, der Credential Stuffing begrenzt — der Ausfall
wäre damit das Zeitfenster für den Angriff. Für `submitAttempt`, `hintReveal`
und `labAttempt` gilt dieselbe Regel ohne Nachteil: Alle drei greifen
unmittelbar danach selbst auf die Datenbank zu und scheitern ohne sie ohnehin.
Der Datenbankfehler wird protokolliert (nur Fehlerart und Code, nie der
Schlüssel) und nicht still verschluckt. Geprüft mit einem echten Prozess gegen
eine unerreichbare Adresse.

Die Kehrseite, offen benannt: Sperren und Zeilensperre zusammen können einen
Ansturm verstärken. Viele gleichzeitige Anfragen auf DENSELBEN Schlüssel
werden serialisiert und belegen dabei Verbindungen aus dem Pool; laufen
Transaktionen in ihre Zeitgrenze, werden sie abgewiesen — und das kann auch
Anfragen auf ganz andere Schlüssel treffen, die keine Verbindung mehr
bekommen. Das ist die bewusst gewählte Richtung (abweisen statt durchlassen),
aber es ist kein kostenloser Schutz.

**Zusatzaufwand je Anfrage.** Gemessen mit `npm run perf:rate-limit`, 300
Messungen je Füllstand nach 50 Aufwärmläufen, PostgreSQL 14.21 auf demselben
Rechner (Loopback). Angegeben sind Spannen über **sechs** Läufe aus zwei
getrennten Sitzungen, nicht die Zahlen eines einzelnen: Die Streuung zwischen
Läufen ist auf einem Entwicklungsrechner erheblich, und eine einzelne Zahl
täuscht Genauigkeit vor, die die Messung nicht hergibt. Eine erste Fassung
dieser Tabelle nannte Spannen aus nur drei Läufen; eine Nachmessung fiel auf
beiden Seiten aus ihnen heraus, weshalb hier jetzt alle sechs stehen.

| Füllstand der Zeile                       | p50          | p95        |
| ----------------------------------------- | ------------ | ---------- |
| 10 (ausgereizte Anmeldegrenze)            | 0,65–1,05 ms | 0,9–2,1 ms |
| 240 (`submitAttempt`, ungünstigster Fall) | 2,95–3,9 ms  | 4,2–4,9 ms |

Das ist eine **Untergrenze und keine Produktionslatenz**: Netzstrecke und
Poolverhalten der Zielplattform kommen hinzu. Vorher lag der Zähler im
Arbeitsspeicher, sein Aufwand war gegenüber jedem Datenbankzugriff
vernachlässigbar — die gemessene Dauer IST deshalb der Zusatzaufwand.

**Rücknahme.** Das Schema ist additiv. Wird der Code zurückgenommen, darf die
Tabelle stehen bleiben; sie stört niemanden und enthält nach einer Stunde
nichts Wirksames mehr. Eine Down-Migration ist dafür nicht nötig, und es gibt
bewusst keinen Laufzeitschalter zurück auf den Speicherzähler: Ein zweiter,
dauerhaft mitgeführter Betriebsmodus wäre mehr Fläche als die Rücknahme wert,
und ein Zurücknehmen des Commits ist in diesem Repository der übliche Weg.

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

Ein Eintrag stand hier und ist mit E03 erledigt: Die Ratenbegrenzung lag im
Prozessspeicher und war bei horizontaler Skalierung wirkungslos. Sie liegt
jetzt in PostgreSQL und wird instanzübergreifend durchgesetzt (siehe unten).

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
entfernt die Lösungsdaten aller zehn Interaktionsformen (`payload.kind`,
nicht zu verwechseln mit der didaktischen Achse `ExerciseType`); Hinweistexte
verlassen die öffentliche Aufgabe nicht; genau ein `dangerouslySetInnerHTML`
mit einer Konstanten; kein Open Redirect; scrypt mit OWASP-Parametern und
`timingSafeEqual`; Sitzungstoken nur als SHA-256-Hash gespeichert; Lockfile
vollständig integritätsgesichert.

### Einstufung der mittleren Funde

| Fund                                                                                       | Einstufung                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ratengrenzen über ein client-gesetztes `x-forwarded-for` umgehbar                          | **BEHOBEN** — zuerst die Plattform-Kopfzeile, sonst der rechte Eintrag der Kette.                                                                                                                                                                              |
| Anmeldegrenze nur je (IP, E-Mail), ein Konto über viele Herkünften beliebig oft angreifbar | **BEHOBEN** — zusätzliche kontobezogene Grenze ohne IP-Anteil.                                                                                                                                                                                                 |
| Rechenaufwand von scrypt vor der Authentifizierung als Verstärkungsfläche                  | **BEHOBEN** — die Grenzen greifen davor, auf der Zielplattform ist die Herkunft nicht fälschbar, und seit E03 zählt der gemeinsame Zähler über alle Instanzen hinweg. Damit ist der Aufwand je Herkunft und Konto tatsächlich gedeckelt, nicht nur je Instanz. |
| Ratenbegrenzung im Prozessspeicher, hält nicht über Instanzen                              | **BEHOBEN** (E03) — der Zähler liegt in PostgreSQL (`rate_limit_buckets`), Prüfen und Zählen bilden eine Transaktion mit Zeilensperre. Nachgewiesen über zwei getrennte Serverprozesse in `tests/integration/rate-limit.test.ts`.                              |
| `script-src` erlaubt `'unsafe-inline'`                                                     | **AKZEPTIERT MIT BEGRÜNDUNG** — Kompromiss des App Routers für das Skript gegen das Themen-Flackern. Es existiert keine Injektionsstelle: genau ein `dangerouslySetInnerHTML`, und das mit einer Konstanten. Umstellung auf ein Nonce ist vorgemerkt.          |

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
