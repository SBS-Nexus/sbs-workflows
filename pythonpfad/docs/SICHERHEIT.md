# Sicherheitsnotizen

Was geschützt wird, wie – und wo die Grenzen dieser Version liegen.

---

## 1. Was schützenswert ist

| Gut                          | Warum                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Zugangsdaten                 | Wiederverwendete Passwörter gefährden andere Dienste                                           |
| Sitzungen                    | Übernahme bedeutet vollen Zugriff auf ein Konto                                                |
| Lerndaten                    | Fortschritt, eingereichter Code, Fehlermuster – persönlich, wenn auch nicht besonders sensibel |
| Musterlösungen und Testfälle | Ihre Preisgabe entwertet den Lerneffekt                                                        |
| Der Server selbst            | Nutzercode darf ihn unter keinen Umständen erreichen                                           |

---

## 2. Bedrohungsmodell und Maßnahmen

### 2.1 Ausführung fremden Codes

**Die wichtigste Aussage: Auf dem Server wird zu keinem Zeitpunkt von Nutzenden
eingegebener Python-Code ausgeführt.**

Die Ausführung findet vollständig im Browser statt – Pyodide in einem Web
Worker. Der Worker hat keinen Zugriff auf DOM, Cookies oder `localStorage`. Für
die lernende Person bedeutet das: Ein Programm kann höchstens den eigenen
Browser-Tab beschäftigen, und dagegen wirkt das Zeitlimit.

- Zeitlimit: 8 Sekunden beim freien Ausführen, 15 Sekunden bei Testläufen.
- Abbruch per `terminate()` statt kooperativer Unterbrechung – das wirkt auch
  bei `while True: pass`.
- Nach jedem Abbruch wird die Laufzeit neu gestartet; es bleibt kein Zustand
  zurück.

### 2.2 Zugangsdaten

- **scrypt** (N = 2^16, r = 8, p = 1, 64-Byte-Schlüssel) aus der
  Node-Standardbibliothek. Die Parameter stehen im Hash und lassen sich später
  erhöhen, ohne bestehende Konten zu entwerten.
- Zufälliges Salz je Passwort, Vergleich mit `timingSafeEqual`.
- Passwortprüfung nach **Länge** (mindestens 10 Zeichen) statt nach
  Zeichenklassen. Regeln wie „mindestens ein Sonderzeichen“ führen
  erfahrungsgemäß zu vorhersehbaren Passwörtern. Zusätzlich abgelehnt werden
  bekannte Passwörter, reine Zeichenwiederholungen und Passwörter, die die
  eigene E-Mail-Adresse enthalten.
- **Kein Rückschluss auf vorhandene Konten:** Auch bei unbekannter Adresse wird
  ein Hash geprüft, damit sich an der Antwortzeit nichts ablesen lässt. Die
  Fehlermeldung lautet in beiden Fällen gleich.

### 2.3 Sitzungen

- 32 zufällige Bytes, opak (ohne Inhalt).
- In der Datenbank liegt nur der SHA-256-Hash. Ein Datenbankleck gibt damit
  keine übernehmbaren Sitzungen preis.
- Cookie: `httpOnly`, `SameSite=Lax`, in Produktion `secure`, Laufzeit 30 Tage.
- Abgelaufene Sitzungen werden bei jeder Anmeldung entfernt.
- Beim Löschen des Kontos verschwinden alle Sitzungen (`onDelete: Cascade`).

### 2.4 CSRF

Drei sich ergänzende Schichten:

1. Next.js prüft bei Server Actions den Origin gegen den Host.
2. `src/proxy.ts` lehnt jede schreibende Anfrage mit fremdem Origin ab.
3. Ein Double-Submit-Token (`assertCsrf`) steht für Route Handler bereit.

### 2.5 Zugriffsschutz

Zweistufig und bewusst nicht allein auf die vorgelagerte Prüfung verlassend:

- `src/proxy.ts` leitet ohne Sitzungscookie auf die Anmeldung um – das spart
  unnötige Seitenaufrufe.
- **Die eigentliche Prüfung** erfolgt in jedem Server-Aufruf über
  `requireUser()` bzw. `requireAdmin()` gegen die Datenbank. Ein gefälschtes
  Cookie kommt an der ersten Stufe vorbei und scheitert an der zweiten.

### 2.6 Content Security Policy

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self';
worker-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

`'wasm-unsafe-eval'` ist für Pyodide notwendig. Klassisches `'unsafe-eval'`
ist **nicht** erlaubt. Weil die Python-Laufzeit selbst gehostet wird, bleibt
`script-src 'self'` – es muss kein CDN freigeschaltet werden.

Zusätzlich gesetzt: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (Kamera, Mikrofon, Standort abgeschaltet),
`Cross-Origin-Opener-Policy: same-origin`.

### 2.7 Ratenbegrenzung

| Vorgang        | Grenze                                |
| -------------- | ------------------------------------- |
| Anmeldung      | 10 Versuche je 15 Minuten und Adresse |
| Registrierung  | 5 je Stunde                           |
| Aufgabenabgabe | 240 je Stunde                         |
| Tutor-Anfrage  | 30 je Stunde (konfigurierbar)         |
| Datenexport    | 5 je Stunde                           |

Gleitendes Fenster, Schlüssel aus IP-Adresse und Kennung.

### 2.8 Eingabevalidierung

Jede Server Action prüft ihre Eingaben mit Zod, bevor irgendetwas geschieht.
Längen sind überall begrenzt: eingereichter Code auf 20 000 Zeichen,
Reflexionen auf 4 000, Projektdateien auf 60 000. Datenbankschreibvorgänge
laufen ausschließlich über Prisma – parametrisiert, ohne zusammengesetztes SQL.

### 2.9 XSS

React maskiert Textinhalte selbstständig. `dangerouslySetInnerHTML` wird an
genau einer Stelle verwendet: für das kurze Inline-Skript zum Farbschema in
`app/layout.tsx`, dessen Inhalt fest im Quelltext steht. Eingereichter Code
wird ausschließlich als Text in `<pre>`-Elementen und im Editor dargestellt,
nie als HTML.

### 2.10 Geheimnisse

`src/server/env.ts` ist mit `server-only` markiert und kann dadurch nicht
versehentlich in ein Client-Bundle geraten. Kein Geheimnis trägt ein
`NEXT_PUBLIC_`-Präfix. Fehlerausgaben an die Nutzeroberfläche enthalten keine
technischen Einzelheiten; im Fehlerfall wird nur eine Kennung angezeigt, die
sich im Server-Log wiederfinden lässt.

---

## 3. Bewusste Grenzen dieser Version

### 3.1 Der Browser ist keine Vertrauensgrenze

**Vollständig serverseitig bewertet** werden Einfachauswahl, Mehrfachauswahl,
freie Erklärung, Ausgabe vorhersagen, Zeilen ordnen, Code ergänzen und Fehler
finden. Die richtigen Antworten verlassen den Server nie – ein Unit-Test prüft
das für jede der 61 Aufgaben einzeln.

**Bei Code-Aufgaben** führt der Browser die Tests aus und meldet das Ergebnis
zurück. Wer will, kann diese Meldung manipulieren.

Was dagegen spricht, es dabei zu belassen – und warum es trotzdem vertretbar
ist:

- Es gibt keine Zeugnisfunktion. Wer sich selbst etwas vormacht, schadet
  ausschließlich dem eigenen Lernfortschritt.
- Die Quelltextregeln (`sourceChecks`) werden serverseitig nachgeprüft. Wer
  `print(100)` einreicht, wo eine Berechnung verlangt ist, fällt auf – auch bei
  gemeldeten grünen Tests. Ein Integrationstest deckt genau diesen Fall ab.
- Gemeldete Ergebnisse zu unbekannten Test-IDs werden verworfen, und eine
  Abgabe mit weniger Ergebnissen als Tests gilt nie als bestanden.
- Die Runner-Abstraktion existiert genau dafür: Ein `ContainerRunner` gegen
  einen isolierten Sandbox-Dienst schließt die Lücke, ohne dass UI oder
  Domainlogik sich ändern.

### 3.2 Versteckte Tests

Sie werden erst beim Absenden ausgeliefert, nicht schon beim Laden der Aufgabe.
Das erschwert das gezielte Anpassen an einen einzelnen Testfall, verhindert es
aber nicht. Mit einem serverseitigen Runner entfiele diese Grenze.

### 3.3 Ratenbegrenzung im Arbeitsspeicher

Für eine Instanz ausreichend. Bei mehreren Instanzen muss der Speicher gegen
einen gemeinsamen Zähler getauscht werden; die Schnittstelle in
`src/server/security/rate-limit.ts` bleibt dabei gleich.

### 3.4 Nicht enthalten

- E-Mail-Bestätigung und Passwort-Zurücksetzen (beides braucht Mailversand)
- Zwei-Faktor-Authentifizierung
- Sperre nach wiederholten Fehlversuchen über die Ratenbegrenzung hinaus
- Audit-Protokoll für Adminzugriffe

---

## 4. Vor dem Produktivbetrieb

- [ ] `AUTH_SECRET` mit `openssl rand -base64 48` neu erzeugen
- [ ] `SEED_DEMO_USERS` nicht gesetzt (in Produktion ohnehin wirkungslos); bei
      Installationen aus früheren Fassungen die Beispielkonten
      `lernende@example.org` und `admin@example.org` einmalig entfernen
- [ ] Ausschließlich HTTPS ausliefern (`secure`-Cookies greifen nur dort)
- [ ] `APP_URL` auf die tatsächliche Domain setzen
- [ ] Datenbankzugang mit eigenem Benutzer und minimalen Rechten
- [ ] Regelmäßige Sicherung der Datenbank einrichten
- [ ] `ATTEMPT_RETENTION_DAYS` mit der eigenen Datenschutzerklärung abgleichen
- [ ] Bei externem KI-Anbieter: Auftragsverarbeitung klären, bevor der
      Schlüssel gesetzt wird
- [ ] `npm audit` in die Auslieferungskette aufnehmen

---

## 5. Sicherheitslücke melden

Bitte nicht über ein öffentliches Ticket, sondern direkt an die im Repository
hinterlegte Kontaktadresse. Hilfreich sind: betroffene Version, Schritte zur
Nachstellung und die vermutete Auswirkung.

---

## Nachtrag: Organisationen, Einladungen und Betrieb

### Einladungen

- Token aus 32 zufälligen Bytes, in der Datenbank ausschließlich als
  SHA-256-Hash. Ein Datenbankleck gibt keine einlösbaren Einladungen preis.
- Gültigkeit vierzehn Tage, einmalige Einlösung, optionale Bindung an eine
  E-Mail-Adresse.
- Unbekannte, abgelaufene und bereits eingelöste Token bekommen dieselbe
  Antwort. Eine Unterscheidung verriete, ob ein geratenes Token je gültig war.
- Der Link wird genau einmal angezeigt und lässt sich später nicht erneut
  hervorholen – er steht nirgends im Klartext.
- Eingelöst wird erst auf Knopfdruck. Sonst würden Link-Vorschauen in
  Messengern die Einladung im Vorbeigehen verbrauchen.

### Rollentrennung

- Eine Lehrkraft kann niemanden zur Inhaberin machen. Sonst ließe sich die
  Verwaltungsberechtigung über den Umweg einer Einladung erlangen.
- Das Prüfprotokoll bleibt der Inhaberin vorbehalten.
- Eine bestehende Rolle wird beim Einlösen einer Einladung nicht herabgestuft.
- Eine fremde Organisation antwortet wie nicht vorhanden. Wer nicht dazugehört,
  soll nicht erfahren, ob es sie gibt.

### Server Actions

Jede Aktion prüft die Mitgliedschaft und die Rolle neu. Die Einwilligung zur
namentlichen Anzeige lässt sich nur für die eigene Mitgliedschaft setzen – ohne
diese Prüfung ließe sich über eine fremde Kennung die Einwilligung einer
anderen Person setzen.

### Zwischenspeicher im Browser

Der Service Worker legt keine einzige HTML-Seite des angemeldeten Bereichs ab.
Diese Seiten enthalten Lernstand, Namen und Kohortenzugehörigkeit; im
Browser-Cache blieben sie auch nach dem Abmelden und auf geteilten Geräten
liegen. Ebenfalls nicht zwischengespeichert wird alles außer GET.

### Protokolle

Eine Sperrliste entfernt E-Mail-Adressen, Passwörter, Token, eingereichten Code
und Namen aus Protokollzeilen, auch wenn sie versehentlich mitgegeben werden.
Sie ist die letzte Verteidigungslinie und ersetzt nicht das Nachdenken an der
Aufrufstelle.

### Betriebsendpunkte

`/api/ready` ist von außen erreichbar und nennt deshalb weder
Verbindungszeichenfolge noch Hostname noch Datenbankmeldung. Der Grund eines
Fehlschlags steht im Protokoll, nicht in der Antwort.

### Prüfliste vor dem Ausrollen (Ergänzung)

- [ ] `FEATURE_*`-Schalter bewusst gesetzt oder bewusst weggelassen
- [ ] `/api/health` und `/api/ready` in die Überwachung aufgenommen
- [ ] Protokollziel eingerichtet und geprüft, dass keine personenbezogenen
      Felder ankommen
- [ ] Bei Einsatz in einer Einrichtung: Einwilligungstext im Profil mit der
      dortigen Datenschutzerklärung abgeglichen
