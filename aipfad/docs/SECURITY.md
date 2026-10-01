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
  `prisma.user.delete()` entfernt die **nutzereigenen** Zeilen.
- **Seit E07 heißt das nicht mehr „sämtliche personenbezogenen Daten".**
  `AuditEvent` ist plattformeigen und trägt absichtlich keinen
  Fremdschlüssel auf `User`: Sein Akteursabdruck (`actorUserId`, eine
  Kennung, kein Name und keine Adresse) überdauert die Kontolöschung. Ohne
  diese Eigenschaft löschte eine Kontolöschung die Spur ihrer selbst.
  Solche Zeilen verschwinden allein über die Auditfrist
  (`AUDIT_RETENTION_DAYS`); einen fachlichen Löschpfad für eine einzelne
  Zeile gibt es nicht. Wer also nach einer Kontolöschung fragt, bekommt die
  genaue Antwort: nutzereigene Daten sind weg, der minimale Akteursabdruck
  bleibt bis zum Ablauf seiner Frist. Dieses Dokument trifft dazu keine
  rechtliche Einordnung.
- Personenbezug und Lebenszyklus sind **zwei Achsen**. `AuditEvent` ist
  zugleich plattformeigen (Lebenszyklus) und personenbezogen, sobald der
  Abdruck eine Person benennt. `AnalyticsEvent` bleibt anonym und wird
  **nicht** mit Personen in Beziehung gesetzt.
- Aufbewahrungsfristen werden seit E04A von einem geplanten Lauf ausgeführt,
  nicht mehr nur beschrieben. Einzelheiten unten unter "Geplante
  Aufbewahrung".

## Geplante Aufbewahrung (E04A)

Bis E04A gab es `applyRetentionPolicy()` in `server/auth/session.ts` — ohne
Aufrufer, bei `crons: []`. Die Frist war damit eine Absichtserklärung. Die
Funktion ist entfernt; ihre Löschbedingung lebt unverändert als Regel im
Aufbewahrungsrahmen weiter (`src/server/retention/`), und ein Zeitplan ruft
sie auf.

**Was läuft.** `vercel.json` trägt genau einen Eintrag:
`/api/cron/retention`, täglich `0 3 * * *`. Vercel-Zeitpläne laufen nach UTC.
Der genaue Zeitpunkt ist nicht zugesichert — die Plattform startet den Lauf
innerhalb des Zeitfensters, nicht auf die Sekunde.

**Was aufgeräumt wird.** Seit E07 laufen zwei Datenarten mit getrennten
Fristen. Für `Attempt` kommt die Frist aus `ATTEMPT_RETENTION_DAYS`
(Vorgabe 365); gelöscht wird, was `createdAt < jetzt − Frist` erfüllt.
**Frist 0 schaltet nur diese Attempt-Regel ab** — es heißt ausdrücklich
nicht "alles löschen, was älter als jetzt ist". Für `AuditEvent` kommt die
Frist aus dem verpflichtenden `AUDIT_RETENTION_DAYS` (ohne Vorgabewert,
größer als 0); gelöscht wird, was `occurredAt < jetzt − Frist` erfüllt.
Auf der jeweiligen Grenze bleibt eine Zeile stehen. Für Auditzeilen bedeutet
`0` ausdrücklich **nicht** "aus": Der Konfigurationsvertrag lehnt den Wert
ab und die Anwendung startet damit nicht. In `RETENTION_MODE=execute`
können beide Regeln ihre abgelaufenen Zeilen unwiderruflich löschen. Das
Protokoll unterscheidet bei der Attempt-Regel `skipped-disabled` von
"gelaufen, nichts gefunden".

Die Liste der Regeln steht an genau einer Stelle
(`src/server/retention/rules.ts`). Eine weitere Datenart meldet dort ihre
Regel an; ein zweiter Zeitplan ist dafür nicht nötig und wäre die eigentliche
Gefahr.

**Trockenlauf zuerst.** `RETENTION_MODE` kennt `dry-run` und `execute` und
hat keinen dritten, unklaren Wert. Vorgabe ist `dry-run`: Eine Bereitstellung,
die den Modus vergisst, zählt nur. Beide Modi rechnen dieselbe Grenze — der
Trockenlauf zeigt also, was der Ernstfall täte, und nicht etwas Ähnliches.
Der Weg von Trockenlauf zu Ernstfall steht in docs/DEPLOYMENT.md.

**Zugang.** Die Route ist nur mit dem Kopfzeilenwert
`Authorization: Bearer <CRON_SECRET>` benutzbar; so ruft Vercel geplante
Läufe auf. Geprüft wird VOR jedem Datenbankzugriff. Fehlt die Kopfzeile, ist
sie falsch, oder ist gar kein Geheimnis gesetzt, antwortet die Route mit 401
und rührt nichts an. `CRON_SECRET` ist seit E04A Teil der beim Start
geprüften Konfiguration (mindestens 16 Zeichen): Eine Instanz, die ohne
Geheimnis startet, hätte entweder eine offene Route oder einen wirkungslosen
Zeitplan — beides still.

**Mehrfachausführung.** Zwei Läufe hintereinander oder gleichzeitig sind
unschädlich. Das trägt die Löschbedingung selbst, nicht eine Sperre: Was weg
ist, erfüllt die Bedingung nicht mehr. Ein zweiter Lauf meldet
`deletedCount: 0` und Erfolg. Die Plattform sichert weder genau eine
Zustellung noch Überschneidungsfreiheit zu; darauf verlässt sich hier nichts.

**Wenn eine Regel scheitert.** Die übrigen laufen weiter, und was vorher
gelöscht wurde, bleibt gelöscht. Es gibt bewusst keine gemeinsame
Transaktion über alle Regeln: Die Fristen verschiedener Datenarten haben
nichts miteinander zu tun, und eine kaputte Regel dürfte nicht dafür sorgen,
dass auf Dauer gar nichts mehr aufgeräumt wird. Der Lauf meldet dann
`partial-failure`, und die Route antwortet mit 500 — sonst zeigte die
Aufrufübersicht ein grünes Häkchen. Vercel wiederholt einen
fehlgeschlagenen geplanten Aufruf nicht automatisch; die Wiederholung ist
der nächste planmäßige Lauf, der die liegengebliebenen Daten mit erfasst.

**Was protokolliert wird.** Zahlen, keine Inhalte: Lauf-Kennung, Modus,
Regel-Kennung, Frist, Kandidaten- und Löschzahl, Dauer, Status, im
Fehlerfall nur die Fehlerart. Keine Adressen, keine Nutzerkennungen, keine
Antwortinhalte, kein Geheimnis, keine Datenbankmeldung — eine solche kann
Verbindungsangaben oder Feldinhalte enthalten. Eine Zeile je Regel und eine
Zusammenfassung je Lauf, nie eine Zeile je gelöschtem Datensatz. Dasselbe
gilt für die Antwort der Route: Sie nennt Zahlen, nicht wessen Daten
betroffen waren.

**Grenze dieser Ausbaustufe.** Das hier ist ein technischer
Aufbewahrungsmechanismus. Seit E07 laufen darin **zwei** Datenarten:
`ATTEMPT_RETENTION` und `AUDIT_RETENTION`. Datenauskunft (E04B) und
Kontolöschung auf Verlangen (E04C) fehlen weiterhin; ENT-B04 und ENT-B05
sind offen. Aus E04A folgt keine Aussage über rechtliche Anforderungen.

## Auditgrundlage (E07)

Seit E07 gibt es `AuditEvent`. E07 liefert ausdrücklich nur die
**Grundlage**: Modell, Dienst, Verzeichnis der Vorgangsbezeichnungen,
Schwärzungsregel, Aufbewahrung. Es gibt zum Zeitpunkt dieser Auslieferung
**null** fachliche Ereigniserzeuger, und das ist kein Versäumnis: Jeder
prüfpflichtige Vorgang bringt seinen Erzeuger in derselben Änderung mit, in
der er selbst entsteht (E04B den Export, E04C die Kontolöschung, E08B die
Organisationsvorgänge). Hier steht deshalb **nicht**, dass fachliche
Vorgänge protokolliert werden — heute wird keiner protokolliert, weil es
keinen gibt.

**Nur Anfügen und Lesen — auf Ebene der Anwendungsschnittstelle.**
`src/server/audit/service.ts` bietet der Anwendung genau zwei Fähigkeiten:
Anfügen und Lesen. Es gibt kein Ändern, kein Löschen und kein
Prisma-Delegate nach außen. Das ist eine Eigenschaft der **Schnittstelle**.

Anfügen gibt es in zwei Formen über **denselben** Schreibweg — dieselbe
Prüfung der Vorgangsbezeichnung, dieselbe Schwärzung, dieselben
Größengrenzen, derselbe serverseitige Zeitpunkt:

- `appendAuditEvent(eingabe)` schreibt über den globalen Client.
- `appendAuditEventInTransaction(tx, eingabe)` schreibt über die Transaktion
  des Aufrufers und öffnet selbst keine. Ein fachlicher Vorgang, dessen Spur
  nicht ohne ihn bestehen darf — E04C löscht ein Konto und schreibt
  `ACCOUNT_DELETED` —, übergibt sein `tx` aus `prisma.$transaction`; Vorgang
  und Spur werden dann gemeinsam festgeschrieben oder gemeinsam verworfen.
  Der Parameter ist bewusst schmal (`AuditAppendTransaction`: als
  Schreibfähigkeit nur `auditEvent.create`). Der globale Prisma-Client ist
  zusätzlich negativ ausgeschlossen: Er besitzt `$connect`, ein
  interaktiver `Prisma.TransactionClient` nicht. Das hält den falschen
  Client beim Typecheck ab — aber **nur, wenn `prisma` direkt übergeben
  wird**. Eine Hilfsfunktion mit `db: Prisma.TransactionClient` (das übliche
  Muster hier) nimmt den globalen Client typkorrekt an, weil jener Typ
  `$connect` gar nicht kennt; die Information geht beim Aufrufer verloren.
  Deshalb wird dieselbe Eigenschaft zur Laufzeit geprüft — auch gegen einen
  Cast, ein fehlendes oder ein falsches `tx` (etwa eine Kennung oder der
  Kontext des Aufrufers statt seines `tx` — verlangt wird ein
  `auditEvent.create`). Die
  Laufzeitprüfung schlägt laut fehl, kann aber fachliche Schreibvorgänge nicht
  zurücknehmen, die vorher außerhalb einer Transaktion liefen. **Empfehlung
  für Erzeuger:** im Transaktionsrumpf zuerst anfügen, dann ändern. Beides wird
  ohnehin gemeinsam festgeschrieben; ein falscher Client scheitert dann aber,
  bevor irgendein fachlicher Schreibvorgang stattfand. Zur Laufzeit wird außerdem eine Hülle um
  das Delegate des globalen Clients (`{ auditEvent: prisma.auditEvent }`)
  abgewiesen — sie hat kein `$connect` und erfüllt den Typ ohne Cast.
  **Diese Grenze fängt Versehen, keinen Vorsatz.** Eine eigens gebaute
  Weiterleitung (`{ auditEvent: { create: (a) => prisma.auditEvent.create(a) } }`)
  oder das Delegate eines zweiten, eigens erzeugten `PrismaClient` kommt
  durch; das lässt sich zur Laufzeit nicht allgemein erkennen. Es ist aber
  auch keine neue Fähigkeit: Wer so baut, könnte ebenso direkt
  `prisma.auditEvent.create` aufrufen — dieselbe Grenze wie „nur anfügbar"
  oben, eine Eigenschaft der Schnittstelle, keine Durchsetzung. Scheitert die
  Prüfung der Auditeingabe, rollt das auch den fachlichen Vorgang zurück.

Beim Lesen gilt: **Ein Filter fehlt, oder er ist gültig.** Ein gesetzter
Akteurs- oder Organisationsfilter muss eine Zeichenkette sein; eine leere
Zeichenkette ist gültig und findet nichts. Ein gesetzter Vorgangsfilter muss
eine **bekannte** Vorgangsbezeichnung sein: Ein falsch geschriebener
(`ACCOUNT_DELETE`) fände sonst nichts, und ein leeres Ergebnis hieße für die
prüfende Person „kein solcher Vorgang" — ein falsches Negativ. Ein gesetzter Schlüssel mit
anderem Wert — `undefined` aus `session?.userId`, ein Prisma-Operator wie
`{ not: 'x' }` aus einem Anfragekörper — wirft einen `TypeError`, statt als
„kein Filter" zu gelten und die Abfrage auf fremde Zeilen auszuweiten. Die
Abfrage muss ein **einfaches Objekt** sein: Bei einer Klasseninstanz lägen
Getter auf dem Prototyp, wo keine Schlüsselprüfung sie sieht, und ein falsch
geschriebener (`actorId`) fiele still weg — typkorrekt. Jeder eigene Schlüssel,
auch ein nicht aufzählbarer, muss auf der Positivliste stehen; ein unbekannter
(`actorId`, `targetId`) wird abgewiesen. Eine gesetzte Zeitgrenze muss ein
gültiges `Date` zwischen den Jahren 1 und 9999 sein, und ein Fenster aus beiden
Grenzen darf nicht leer oder vertauscht sein — es fände nichts, und „nichts"
hieße „kein Vorgang im Zeitraum"; gelesen wird ihr innerer
Zeitwert, nicht ein überschreibbares `getTime`. Ein Kennungsfilter darf kein
Zeichen enthalten, das PostgreSQL nicht speichern kann (Nullzeichen, einzelnes
Ersatzzeichen) — ein `%00` aus einer Adresse ließe sonst Prisma mit absolutem
Quellpfad scheitern — und ist wie beim Schreiben höchstens 200 Zeichen lang;
ein längerer kann nichts finden und wäre nur Last. Jeder Wert wird genau einmal gelesen, damit ein
Getter nicht beim zweiten Zugriff etwas anderes liefert als geprüft, und über
„vorhanden" entscheidet die geprüfte Schlüsselliste, nicht eine zweite Frage an
das Objekt. Die Form wird geprüft, bevor irgendein Wert gelesen wird. Die Meldung nennt
nur das Feld, nie den Wert; ein fremder Wert, der keine Zeichenkette ist,
erscheint nur als seine Art (`(object)`), nie über `String()` — ebenso ein
Symbolschlüssel, dessen Beschreibung fremder Text ist. Fremder Text in einer
Meldung — auch die Kennung einer an der Anwendung vorbei geschriebenen Zeile —
ist gekürzt, einzeilig (C0- und C1-Steuerzeichen sowie U+2028/U+2029 ersetzt;
ein Umbruch täuschte sonst eine eigene Logzeile vor) und speicherbar (kein beim
Kürzen halbiertes Ersatzpaar). Die Abfrage
selbst ist **Pflicht**: `readAuditEvents(undefined)` — etwa
`readAuditEvents(bauAbfrage(sitzung))` ohne Sitzung — wird abgewiesen, statt
über einen Vorgabewert zu einer Abfrage über alle Akteure zu werden. Wer
ungefiltert lesen will, schreibt `{}` ausdrücklich; ein solcher Aufruf liest
über Akteure hinweg, und diese Grenze zieht die spätere Route.

Dieselbe Regel gilt beim **Anfügen**: `actorUserId`, `organizationId` und
`targetId` fehlen, oder sie sind gültige Zeichenketten. Ein gesetztes
`undefined` — `actorUserId: session?.userId` nach einer gescheiterten
Sitzungssuche — wird abgewiesen, statt still als „kein Akteur" geschrieben zu
werden; sonst verlöre gerade die Spur einer Kontolöschung ihre Zuordnung. Auch
die Eingabe muss ein einfaches Objekt mit bekannten Feldern sein: Ein
unbekanntes (`actorId` statt `actorUserId`, etwa aus einem Spread, den
TypeScript nicht meldet) wird abgewiesen, statt still zu entfallen und dieselbe
Zuordnung zu kosten. Über „vorhanden" entscheidet auch hier die geprüfte
Schlüsselliste, nie ein geerbter Wert; eine fehlende Vorgangsbezeichnung heißt
„fehlt". Die Vorgangsbezeichnung wird genau einmal gelesen: Geprüft und
geschrieben wird derselbe Wert. Fehlt `metadata`, ist es `{}`; ist es gesetzt,
muss es ein **einfaches** Objekt sein — `metadata: diff ?? null` wird
abgewiesen, statt still als leere Tatsachen geschrieben zu werden, ebenso ein
nicht aufzählbarer oder Symbolschlüssel, den die Schwärzung nicht sähe, und ebenso
eine `Map` oder Klasseninstanz, die die Schwärzung auf `{}` reduzierte. Diese
Formregel gilt **rekursiv**: Auch verschachtelte Objekte und Objekte in Arrays
müssen einfache Objekte mit ausschließlich aufzählbaren Zeichenkettenschlüsseln
sein. `Date`, `Map`, Klasseninstanzen sowie unsichtbare oder Symbolschlüssel
werden dort fail-closed abgewiesen, statt als `{}` oder verkürzte Tatsachen in
der Auditspur zu landen. Weder Kennungsfelder noch Metadaten (Schlüssel wie Werte, auch verschachtelt) dürfen
Zeichen enthalten, die PostgreSQL nicht speichern kann; der Dienst meldet das
Feld selbst, statt die Datenbank mit Quellpfad scheitern und im
Transaktionspfad den fachlichen Vorgang ohne Begründung zurückrollen zu lassen.

Beim Lesen gespeicherter Zeilen fällt nicht nur eine unbekannte
Vorgangsbezeichnung auf, sondern auch Metadaten, die kein Objekt sind — beides
kann nur an der Anwendung vorbei entstehen.

Daneben gibt es `appendAuditEventMitZeitpunktFuerTests`, das ausdrücklich
benannte Anfügen mit gewähltem Zeitpunkt. Es existiert nur für die
Aufbewahrungsprüfungen und hat im Anwendungscode nichts zu suchen.

**Ausdrücklich nicht zugesichert: Manipulationssicherheit auf
Datenbankebene.** Es gibt keine eigene Datenbankrolle, kein `REVOKE`, keinen
Anfügeauslöser und keinen manipulationsgeschützten Speicher. Wer
Schreibrechte auf der Datenbank hat, kann Auditzeilen ändern oder löschen.
Wer „nur anfügbar" liest, muss „in der Anwendung" mitlesen.

**Abbildsemantik.** `actorUserId` und `organizationId` sind Kennungen ohne
Fremdschlüssel. Sie überdauern eine Kontolöschung beziehungsweise eine
künftige Organisationslöschung — genau dafür gibt es sie. Gespeichert wird
**nur** die Kennung: kein Name, keine Adresse, kein lesbares Etikett. Für
die belegten Zwecke (E04B ordnet Zeilen der angemeldeten Person zu, E04C und
E13B überdauern eine Löschung) genügt die Kennung; ein lesbares Etikett wäre
zusätzlicher Personenbezug ohne gezeigten Bedarf.

**Metadaten.** Ein Objekt mit knappen betrieblichen Tatsachen — etwa
`previousRole`, `newRole`, `reasonCode`, `source`. Ausdrücklich **kein**
Dokumentenspeicher, keine Anfrageinhalte, keine Lernendenantworten, keine
Profilabbilder, keine Geheimnisse. Vor dem Schreiben läuft eine feste,
**rekursive** Schwärzungsregel (`src/server/audit/redaction.ts`) über die
Felder `email`, `name`, `password`, `passwordHash`, `token`, `tokenHash`,
`csrfSecret`, `authorization`, `cookie`, `secret`, `apiKey`,
`submittedAnswer`, `solutionNotes` sowie die deutsche Schreibweise
`passwort` — vierzehn Namen, ohne Rücksicht auf Groß- und Kleinschreibung,
auch in verschachtelten Objekten und in Objekten innerhalb von Arrays.

**Verglichen wird der ganze Feldname, nicht ein Namensbestandteil.**
`userEmail`, `accessToken`, `emailAddress`, `user_email` und `api_key` werden
deshalb **nicht** geschwärzt. Das ist Absicht: Eine Teilstringsuche träfe auch
harmlose Namen — `name` steckt in `hostname`, `filename`, `courseName` — und
gäbe eine Sicherheit vor, die sie nicht hat. Wer einen Ereigniserzeuger
schreibt, kann sich also nicht darauf verlassen, dass eine ungünstig benannte
Kopie abgefangen wird. Der Wert wird durch `[entfernt]` ersetzt; der ursprüngliche Wert
wird weder zurückgegeben noch protokolliert noch in eine Fehlermeldung
aufgenommen. Die Regel ist die zweite Verteidigungslinie: `metadata: {
...requestBody }` bleibt falsch, auch wenn sie darin etwas schwärzt.

Sie ist bewusst **nicht** die Regel des Loggers. Der Logger schwärzt nur die
oberste Ebene, was für flache Logfelder genügt; Metadaten sind JSON und
dürfen verschachtelt sein.

**Aufbewahrung.** `AUDIT_RETENTION_DAYS` ist **Pflicht**, ohne Vorgabewert
und strikt größer als 0. Für Auditzeilen ist die altersbasierte Aufbewahrung
der **einzige** Löschweg; eine 0 hieße im Rahmen „abgeschaltet" und damit
„nie löschen" — eine Aufbewahrungsentscheidung, die niemand getroffen hätte.
Der Wert in `.env.example` ist ein technischer Beispielwert und **keine**
rechtliche Empfehlung. Die Regel läuft im Rahmen aus E04A mit, über
denselben Cron und denselben Lauf; ein zweiter Zeitplan entsteht nicht.

**Die Frist allein löscht noch nichts.** Sie ist notwendig, nicht
hinreichend: Der Rahmen löscht nur bei `RETENTION_MODE=execute`, und die
Vorgabe ist `dry-run`. Eine Bereitstellung, die den Modus nie umstellt,
zählt Auditzeilen dauerhaft nur — sie behält sie also, obwohl eine Frist
gesetzt ist. Das ist für eine unwiderrufliche Löschung die richtige Vorgabe,
aber wer die Frist für wirksam hält, ohne den Modus zu prüfen, irrt.

**Kein Ersatz für Logs.** Auditzeilen sind nicht der Logstrom und umgekehrt.
Es wird nichts automatisch aus dem Logger in `AuditEvent` gespiegelt: andere
Zwecke, andere Aufbewahrung.

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
markiert: JEDE abgeschlossene Entscheidung entfernt bis zu zwei abgelaufene
Zeilen über den Index auf `expiresAt`. Längste Fensterbreite im System: eine
Stunde.

**Was damit beschränkt ist, und was nicht.** Drei Aussagen, die auseinander
gehalten gehören:

- **Je Zeile:** Eine Zeile trägt höchstens so viele Zeitpunkte, wie die Grenze
  dieses Schlüssels erlaubt — derzeit höchstens 240 (`submitAttempt`). Das ist
  eine Schranke JE SCHLÜSSEL, keine Schranke für die Tabelle.
- **Lebende Zeilen:** Eine Zeile je unterschiedlichem Schlüssel, der im
  laufenden Fenster vorkam. Wie viele das sind, hängt am tatsächlichen
  Verkehr; eine feste Obergrenze gibt es dafür nicht und kann es nicht geben.
- **Abgelaufene Zeilen:** Eine Entscheidung legt höchstens EINE neue Zeile an
  und räumt bis zu ZWEI abgelaufene weg. "Bis zu zwei" ist nicht dasselbe wie
  "zwei" — ob die Abfuhr die Zufuhr wirklich übersteigt, hängt daran, dass
  gleichzeitige Läufe nicht dieselben Zeilen greifen; siehe den Absatz zur
  Auswahl unten. Gemessen gilt es: zwanzig gleichzeitige Entscheidungen
  entfernen vierzig Zeilen. Bleibt der Verkehr ganz aus, bleiben Zeilen
  liegen — dann entstehen aber auch keine neuen.

Entscheidend ist, dass das Aufräumen an der einzelnen Entscheidung hängt und
nicht an einem prozesslokalen Zähler. Eine frühere Fassung räumte nur jede
hundertste Anfrage auf, gezählt im Arbeitsspeicher des Prozesses: Eine
Instanz, die vorher endete, räumte NIE auf, und auf einer Plattform mit
kurzlebigen Instanzen wuchs die Tabelle dadurch unbegrenzt — das
Abnahmekriterium "kein unbegrenztes Tabellenwachstum" war damit nicht
erfüllt. Nachgestellt vor der Änderung: drei Prozesse mit je 99 Entscheidungen
entfernten von zwanzig abgelaufenen Zeilen keine einzige. Seit der Umstellung
räumt bereits die ERSTE Anfrage eines frisch gestarteten Prozesses mit; ein
Integrationstest hält das fest und schlägt unter der alten Fassung fehl.

Weil nun jede Entscheidung aufräumt, treffen viele Läufe gleichzeitig auf
dieselben ältesten Zeilen. Ohne ZEILENSPERRE in der Auswahl bricht die Abfuhr
dabei ein: Einer löscht, die übrigen finden die Zeilen beim Wiederprüfen
verschwunden und löschen nichts. Gemessen gegen einen Rückstand von hundert
Zeilen, zwanzig gleichzeitige Entscheidungen, ideal wären vierzig — ohne
Sperrklausel wurden in drei Läufen 32, 10 und 12 Zeilen entfernt, bei zwanzig
neu angelegten. Die Zufuhr kann die Abfuhr damit übersteigen, und die
Abnahmebedingung war NICHT erfüllt.

Die Auswahl steht deshalb in einer `MATERIALIZED`-CTE mit
`FOR UPDATE SKIP LOCKED`. Was welcher Teil beiträgt, ist getrennt gemessen:

- **Die Sperrklausel** stellt die Abfuhr wieder her. Das leistet bereits ein
  einfaches `FOR UPDATE` (drei Läufe, je vierzig von vierzig). Eine frühere
  Fassung dieses Abschnitts schrieb diese Wirkung `SKIP LOCKED` zu — das war
  eine Fehlzuschreibung und ist hiermit richtiggestellt.
- **`SKIP LOCKED`** verhindert, dass ein Aufräumlauf hinter einer gerade
  gehaltenen Zeile wartet, statt zur nächsten freien zu greifen.
- **`MATERIALIZED`** pinnt die begrenzte Auswahl auf eine einmal
  materialisierte Menge, bevor das `DELETE` darauf zugreift, sodass die
  Deckelung nicht von einer möglichen Mehrfachauswertung der Unterabfrage
  abhängt. Die belastbaren Messungen der aktuellen Form sind: Bei fünf
  abgelaufenen Zeilen und `LIMIT 2` werden genau zwei entfernt; zwanzig
  gleichzeitige Entscheidungen entfernen vierzig Zeilen, fünfzig entfernen
  hundert. Ein Integrationstest hält fest, dass bei n gleichzeitigen
  Entscheidungen mindestens n abgelaufene Zeilen verschwinden. Eine frühere
  Behauptung, die nicht-materialisierte Form lösche reproduzierbar fünf von fünf
  Zeilen, wurde in unabhängigen Prüfungen nicht bestätigt und ist deshalb nicht
  mehr Teil der Begründung.

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
Transaktionen in eine Zeitgrenze, werden sie abgewiesen — und das kann auch
Anfragen auf ganz andere Schlüssel treffen, die keine Verbindung mehr
bekommen. Das ist die bewusst gewählte Richtung (abweisen statt durchlassen),
aber es ist kein kostenloser Schutz.

**Zusatzaufwand je Anfrage.** Nachzurechnen mit:

```bash
DATABASE_URL=… npm run perf:rate-limit
```

300 Messungen je Füllstand nach 50 nicht gewerteten Aufwärmläufen.

Hier steht bewusst **ein datierter Bezugslauf** und keine Spanne. Zweimal
wurde versucht, die Streuung als Spanne zu fassen — erst über drei Läufe, dann
über sechs — und beide Male fiel eine unabhängige Nachmessung heraus, die
zweite sogar nach oben UND nach unten (p95 bei Füllstand 240: 5,07 ms in einer
Prüfung, 3,26 ms in einer anderen, gegen eine angegebene Spanne von 4,2–4,9
ms). Eine Spanne von einem Entwicklungsrechner behauptet eine Stabilität, die
diese Messung nicht hat. Deshalb: eine Momentaufnahme mit Datum, und wer eine
Zahl braucht, führt den Befehl selbst aus.

Bezugslauf vom 28.09.2026, PostgreSQL 14.21, Node 22.23.2, darwin/arm64,
Datenbank auf demselben Rechner (Loopback), 300 Messungen je Füllstand nach 50
nicht gewerteten Aufwärmläufen:

| Füllstand der Zeile                       | p50     | p95     | max     |
| ----------------------------------------- | ------- | ------- | ------- |
| 0 (neue Zeile)                            | 0,87 ms | 1,71 ms | 2,08 ms |
| 10 (ausgereizte Anmeldegrenze)            | 0,83 ms | 1,31 ms | 2,43 ms |
| 120 (`labAttempt`, `hintReveal`)          | 2,60 ms | 4,17 ms | 7,20 ms |
| 240 (`submitAttempt`, ungünstigster Fall) | 3,84 ms | 4,84 ms | 5,63 ms |

Diese Zahlen gelten für die Fassung, in der JEDE Entscheidung aufräumt. Das
Aufräumen liegt damit in der gemessenen Strecke — nicht mehr bei jeder
hundertsten Anfrage, sondern bei jeder. Die vorherigen Zahlen sind dadurch
hinfällig und stehen hier nicht mehr.

Was die `max`-Spalte zeigt, und warum hier bewusst KEINE Spanne steht: Einzelne
Messungen springen nach oben — 7,20 ms gegen einen Median von 2,60 ms im
selben Lauf, und in anderen Läufen deutlich weiter (beobachtet wurden schon
99 ms bei einem Median von 1,5 ms). Woran das im Einzelfall liegt, sagt die
Messung nicht; ein Entwicklungsrechner unter anderer Last ist eine
mögliche, aber nicht belegte Erklärung. Eine Ursache für einzelne Ausschläge
wird aus diesen Messwerten ausdrücklich nicht abgeleitet. Zweimal wurde hier versucht,
die Streuung als Spanne zu fassen, und beide Male fiel eine unabhängige
Nachmessung heraus; ein dritter Versuch, sie als Satz statt als Tabelle zu
schreiben ("über alle bisher beobachteten Läufe … zwischen X und Y"), wurde
ebenfalls binnen einer Prüfung widerlegt. Eine Spanne von diesem Rechner
behauptet eine Stabilität, die die Messung nicht hat. Deshalb steht hier eine
datierte Momentaufnahme, und wer eine Zahl braucht, führt den Befehl selbst
aus und bekommt seine eigene.

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
jetzt in PostgreSQL und wird instanzübergreifend durchgesetzt (siehe oben).

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
