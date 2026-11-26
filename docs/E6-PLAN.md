# E6 · Betrieb auf Produktniveau – Plan

Stand 26.11.2026. Gehört zu `docs/PRODUKT-ROADMAP.md`, Abschnitt E6 (L7).
E5.1–E5.3 sind live (`docs/E5-PLAN.md`); damit kommen Firmenkunden in Reichweite.
Für sie und für jede öffentliche deutsche Website fehlen noch Grundlagen des
Betriebs.

## 1. Ausgangslage (geprüft am 26.11.2026)

| Bereich               | Stand                                                                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rechtsseiten          | **Keine.** Weder Impressum noch Datenschutzerklärung im Hub oder in einer App. Für öffentliche Websites in Deutschland Pflicht (§ 5 DDG, Art. 13 DSGVO).                   |
| Erreichbarkeit        | `/api/health` in allen drei Apps; `/api/ready` (mit Datenbank) in AIPfad und PythonPfad, nicht in SQLPfad. Konto: Discovery und `/ui/v2/login/healthy`. Keine Überwachung. |
| Statusseite           | Keine.                                                                                                                                                                     |
| Fehlerberichte        | Nur strukturierte Protokolle bei Railway; keine Fehlererfassung mit Benachrichtigung.                                                                                      |
| Sicherungen           | Keine automatischen. Railway bietet sie erst ab Pro (Wechsel geplant zum 17.12.2026, `docs/E4-KONTO-PLAN.md`).                                                             |
| Aufbewahrung (AIPfad) | Täglicher Lauf seit 18.11.2026 im Trockenlauf (`RETENTION_MODE=dry-run`).                                                                                                  |

## 2. Etappen

| Etappe                          | Inhalt                                                                                                                                                                                                                                       | Braucht                                                                                                                                          | Tor                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **E6.1 Rechtsseiten**           | Impressum, Datenschutzerklärung und AVV-Vorlage zentral auf `www.lernpfade.net`; Verweise im Fuß des Hubs und aller Apps (Shell-Vertrag). Die Datenschutzerklärung beschreibt die echten Verarbeitungen (Abschnitt 3).                       | **Angaben zum Anbieter** (Abschnitt 4); vor dem Verkauf an Firmen eine Prüfung durch Rechtsberatung                                              | Seiten live, aus jeder Seite in einem Klick erreichbar; axe ohne Befund                 |
| **E6.2 Status und Überwachung** | `/status` und `/api/status` im Hub: Hub-Datenbank, Konto (API und Anmelde-App), drei Apps (Bereitschaft mit Datenbank), mit Antwortzeit, 30 s zwischengespeichert. `/api/ready` auch in SQLPfad. Externe Überwachung fragt `/api/status` ab. | Für die externe Überwachung ein Konto bei einem Dienst (Vorschlag: Better Stack oder UptimeRobot, kostenlose Stufe, Benachrichtigung per E-Mail) | Statusseite live; Ausfall einer App erscheint dort binnen 30 s; externer Alarm getestet |
| **E6.3 Fehlerberichte**         | Fehlererfassung für Hub und Apps mit EU-Datenhaltung (Vorschlag: Sentry, Region EU), personenbezogene Daten entfernt (kein Name, keine Adresse, keine Antworten).                                                                            | Konto beim Dienst und Auftragsverarbeitungsvertrag                                                                                               | Ein absichtlicher Testfehler erscheint mit Benachrichtigung                             |
| **E6.4 Sicherungen**            | Ab Railway Pro: täglich, wöchentlich und monatlich für `konto-db`, `lernpfade-db` und die drei App-Datenbanken; Wiederherstellung auf eine Kopie geprobt und dokumentiert.                                                                   | Wechsel auf Pro (geplant 17.12.2026)                                                                                                             | Probe-Wiederherstellung mit Zählung vorher und nachher                                  |
| **E6.5 Aufbewahrung im Ernst**  | Die Trockenläufe seit 18.11. auswerten; bei stimmigen Läufen `RETENTION_MODE=execute`.                                                                                                                                                       | **Freigabe**, weil danach Daten endgültig gelöscht werden                                                                                        | Erster Ernstlauf mit Protokoll; Zahlen wie im Trockenlauf                               |

## 3. Was die Datenschutzerklärung abbilden muss (E6.1)

Aus dem tatsächlichen Betrieb:

- **Hosting:** Railway (Region `europe-west4`, Niederlande) für Hub, Apps,
  Konto und Datenbanken. Railway ist ein US-Unternehmen; die Übermittlung
  stützt sich auf die Standardvertragsklauseln.
- **Konto:** eigener ZITADEL-Betrieb (`konto.lernpfade.net`). Es speichert
  Name, E-Mail-Adresse und Anmeldemerkmale (Passwort-Hash, Passkey, zweiter
  Faktor).
- **E-Mail-Versand:** Scaleway Transactional Email (Frankreich), für
  Bestätigungen und das Zurücksetzen von Passwörtern.
- **Domains und DNS:** Strato.
- **Lernstand:** bleibt je App. Der Hub speichert nur Organisationen,
  Mitgliedschaften, Einwilligungen, Lernpläne und das Prüfprotokoll, keinen
  Lernstand.
- **Cookies:**
  - Nur technisch notwendige: Sitzung je App, die verschlüsselte
    Hub-Sitzung und der kurzlebige Anmeldezustand.
  - Keine Analyse, keine Werbung, keine eingebundenen Dritten.
- **Löschfristen:** Aufbewahrungslauf (E6.5), Löschen des Kontos, Austritt
  aus Organisationen.
- **Rechte der Betroffenen,** Ansprechpartner und Beschwerderecht.

## 4. Braucht deine Angaben (E6.1)

Für Impressum und Datenschutzerklärung:

1. **Anbieter:** Firma oder Name und Rechtsform.
2. **Anschrift:** ladungsfähig, kein Postfach.
3. **Vertretung:** vertretungsberechtigte Person(en), etwa die
   Geschäftsführung.
4. **Kontakt:** E-Mail und Telefon (oder ein anderer schneller Weg).
5. **Register:** Registergericht und -nummer, falls eingetragen.
6. **Steuern:** USt-IdNr., falls vorhanden.
7. **Inhalte:** verantwortliche Person nach § 18 Abs. 2 MStV, mit
   Anschrift.
8. **Datenschutz:** Datenschutzbeauftragte(r), falls bestellt; sonst die
   Kontaktadresse für Datenschutzanfragen.

Ohne diese Angaben schalte ich keine Rechtsseiten mit Platzhaltern frei.

## 5. Entscheidungen

Getroffen nach dem Maßstab „Board eines Enterprise-SaaS“:

1. **Rechtsseiten zentral:** Sie liegen auf `www.lernpfade.net` (eine
   Quelle). Die Apps verweisen im Fuß dorthin, über den Shell-Vertrag in
   allen Apps gleich.
2. **Statusseite im Hub, Alarm von außen:** Die Statusseite misst von innen.
   Der Alarm kommt von einem unabhängigen Dienst, damit er auch dann
   auslöst, wenn Railway selbst gestört ist.
3. **Statusseite ohne Interna:** Sie zeigt Dienst, Zustand und Antwortzeit,
   keine Fehlermeldungen, Adressen oder Versionen.
4. **Sicherungen über Railway Pro statt Eigenbau:** Die eingebauten
   Sicherungen samt Wiederherstellung sind verlässlicher als ein eigener
   Dump-Job. Bis zum 17.12. bleibt das Risiko bewusst offen (wenige Konten,
   Testphase).
5. **Fehlerberichte: Sentry in der EU, aber ohne Sentry-SDK (E6.3):**
   - **Warum kein SDK:** Das SDK sammelt in Version 11 ohne eigene
     Einstellungen alles, auch Kopfzeilen, Inhalte und IP-Adressen. Im
     Browser spräche es Sentry direkt an.
   - **Eigener Kern** (`docs/learning-fehlerbericht/`): eine Liste dessen,
     was hinausgehen darf, statt einer Sperrliste. Er bereinigt vor dem
     Versand.
   - **Browserfehler** gehen über die eigene Route, damit Sentry keine
     IP-Adressen der Nutzenden sieht.
   - **Nur EU:** Ziele außerhalb von `*.ingest.de.sentry.io` lehnt der Kern
     ab.
   - **Kein Bündler-Eingriff, keine Abhängigkeit**, keine Leistungs- oder
     Sitzungsdaten.
   - **Preis:** keine Quelltextkarten; Browserstapel bleiben minifiziert.
     Meldung, Routenmuster und `digest` reichen zum Finden. Quelltextkarten
     kommen erst, wenn ein Fall es braucht (dann mit Upload-Token durch dich).
   - **Vertrag:** Der Auftragsverarbeitungsvertrag (DPA) von Sentry gilt
     nicht automatisch. Er wird in der Organisation angenommen (Settings →
     Legal & Compliance). Ohne ihn verbieten die Sentry-Bedingungen
     personenbezogene Daten.

## 6. Stand

**26.11.2026, E6.3 gebaut** (Zweig `claude/e6-3-fehlerberichte-20261126`):

- **Kern und Kopien:** Kern, Serveranschluss (`onRequestError`), Route
  `POST /api/fehlerbericht` und Browserteil (`instrumentation-client.ts`,
  Fehlergrenzen) liegen bytegleich in Hub, PythonPfad, SQLPfad und AIPfad.
  `scripts/check-learning-fehlerbericht.mjs` erzwingt das und lässt kein
  `@sentry/*` zu.
- **Tests:**
  - 17 Einheiten zum Kern: Bereinigung, Stapel, EU-Ziel, Drossel, Senden,
    Empfang.
  - 2 Browsertests: Ein Browserfehler geht ohne Cookies an die eigene Route;
    fremde Herkunft wird abgewiesen.
- **Rechtstexte:** Datenschutzhinweise (Abschnitte 3 und 9) und AVV
  (Maßnahmen, Unterauftragsverarbeiter) nennen Sentry. Live erst nach
  Freigabe.
- **Offen:**
  - Konto bei Sentry (EU) und das DPA, beides durch dich.
  - Vier Projekte in Sentry, `SENTRY_DSN` je Dienst bei Railway.
  - Ein absichtlicher Testfehler mit Benachrichtigung (Tor).

**26.11.2026, E6.1 und E6.2 live:**

- E6.1 (#115): Impressum, Datenschutzhinweise und AVV-Vorlage auf
  `www.lernpfade.net`, Verweise im Fuß des Hubs und aller drei Apps.
- E6.2 (#114): Statusseite live. Seit 26.11.2026 außerdem ein **externer
  Alarm über Better Stack** (kostenlose Stufe, Team `t642688`):

  | Monitor             | Adresse                                                        | Schlägt an bei                                |
  | ------------------- | -------------------------------------------------------------- | --------------------------------------------- |
  | Lernpfade Plattform | `https://www.lernpfade.net/api/status`                         | Hub nicht erreichbar oder 503 (Konto gestört) |
  | Lernpfade-Konto     | `https://konto.lernpfade.net/.well-known/openid-configuration` | Konto-API nicht erreichbar                    |
  | AIPfad              | `https://www.aipfad.de/api/ready`                              | App oder ihre Datenbank nicht bereit          |
  | PythonPfad          | `https://www.pythonpfad.de/api/ready`                          | App oder ihre Datenbank nicht bereit          |
  | SQLPfad             | `https://www.sqlpfad.de/api/ready`                             | App, Datenbank oder Inhalte nicht bereit      |
  - Prüfung alle 3 Minuten (Grenze der kostenlosen Stufe) aus Europa,
    Nordamerika, Asien und Australien.
  - Bestätigungszeit 1 Minute, damit ein kurzer Neustart keinen Alarm
    auslöst. Erholung nach 3 Minuten.
  - Alarm per E-Mail an das Konto bei Better Stack; keine Anrufe oder SMS
    (bräuchten eine Telefonnummer und den Bezahltarif).
  - Testalarm am 26.11.2026 um 13:05 ausgelöst und im Postfach
    angekommen („New test incident started“). Damit ist das Tor von E6.2
    erfüllt.
  - Nicht in der kostenlosen Stufe: Warnung vor ablaufenden Zertifikaten.
    Railway erneuert sie selbst; ein Ausfall fiele über die Monitore auf.
  - Die Anfragen von Better Stack enthalten keine personenbezogenen Daten.
    Deshalb ist Better Stack kein Unterauftragsverarbeiter im Sinne der
    AVV.

- Offen: E6.3, E6.4 und E6.5 nach Abschnitt 2.

**26.11.2026, E6.2 gebaut** (Zweig `claude/e6-betrieb-20261126`):

- `/status` und `/api/status` im Hub.
  - Geprüft werden das Konto (API und Anmeldeseite, kritisch), die drei Apps
    (`/api/ready`) und die Hub-Datenbank, parallel mit 5 s Frist und 30 s
    Zwischenspeicher.
  - 503 nur bei einer Störung eines kritischen Dienstes.
  - Keine Interna in der Antwort.
- SQLPfad hat jetzt `/api/ready` (Datenbank und Inhalte), wie PythonPfad und
  AIPfad.
- „Status“ im Fuß der Startseite.
- Tests: 5 Einheiten; 3 Browsertests (Ausfall einzelner Pfade, API, Fuß) mit
  axe und 375 px.
- Offen: externer Alarm (Konto bei Better Stack oder UptimeRobot, durch dich)
  sowie E6.1, E6.3, E6.4 und E6.5 nach Abschnitt 2.
