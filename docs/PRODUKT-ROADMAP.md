# Lernpfade: Roadmap zum fertigen Produkt

Stand 18.11.2026. Ziel des Auftraggebers: ein fertiges Produkt auf
Enterprise-SaaS-Niveau. Einladend gestaltet, mit sinnvoller Lernreihenfolge,
gleichermaßen nützlich für Einzelpersonen und für Unternehmen. Dieses Dokument
legt fest, in welcher Reihenfolge das passiert und woran jede Etappe als fertig
gilt.

## 1. Ausgangslage

**Was schon trägt**

- Vier Anwendungen laufen produktiv auf Railway:
  - Hub `lernpfade-hub-staging.up.railway.app`;
  - PythonPfad `www.pythonpfad.de`, SQLPfad `www.sqlpfad.de`, AIPfad `www.aipfad.de`;
  - je eigene PostgreSQL, CI mit Unit-, Integrations-, E2E- und
    Barrierefreiheitstests.
- Inhalte: Python 15 Lektionen / 61 Aufgaben, SQL 15 / 64, AI 37 Lektionen.
- PythonPfad hat bereits Organisationen, Kohorten und einen Lehrkraftbereich.
  Dazu kommen Wissenslandkarte, Schritt-für-Schritt-Ausführung und
  Editor-Vorschläge.
- Die Sicherheitsgrundlagen sind gelegt: Ratengrenzen (von außen geprüft), CSP,
  HSTS, Aufbewahrungslauf, Auditgrundlage (AIPfad E07).

**Was das Produkt heute unfertig wirken lässt**

| #   | Lücke                                                                                                    | Wirkung                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| L1  | SQLPfad führt keine Abfragen aus; der Übungsserver ist gebaut, aber abgeschaltet (Lizenzfrage)           | Der Kern des Fachs fehlt; ein Warnkasten dominiert jede Seite.                                                          |
| L2  | Drei getrennte Konten: Jede App hat eigene Registrierung und Anmeldung                                   | Wer zwei Pfade lernt, registriert sich zweimal; kein gemeinsamer Fortschritt, keine Firmenverwaltung über Pfade hinweg. |
| L3  | Vier verschiedene Gestaltungen (Hub: Learning OS, SQL: Türkis, Python: Violett-Verlauf, AI: Mono/Orange) | Wirkt wie vier Produkte, nicht wie eine Plattform.                                                                      |
| L4  | Keine pfadübergreifende Lernreihenfolge                                                                  | Einsteiger wissen nicht, womit sie anfangen sollen.                                                                     |
| L5  | Firmenfunktionen nur in PythonPfad, ohne Plätze, Berichte oder Abrechnung                                | Für Unternehmen nicht kaufbar.                                                                                          |
| L6  | Hub ohne eigene Domain; Föderation (Live-Wiederholungen, Fortschritt) dadurch aus                        | `/wiederholen` und `/fortschritt` zeigen keine echten Daten.                                                            |
| L7  | Betrieb: keine Sicherungen, kein Monitoring, keine Rechtsseiten auf Produktniveau                        | Kein Vertrieb an Unternehmen möglich (AVV, Verfügbarkeit).                                                              |
| L8  | Einzelne Platzhaltertexte („Hier siehst du künftig …")                                                   | Wirkt unfertig.                                                                                                         |

## 2. Etappen

Jede Etappe endet mit grüner CI, Barrierefreiheitsprüfung (axe), Aufnahmen für
Desktop und Mobil und einem Abnahmerundgang auf der Live-Domain.

### E1 · Fertig wirken (sofort, ohne Kosten)

- Platzhaltertexte ersetzen (L8). Leere Zustände sagen, was als Nächstes zu
  tun ist, und verlinken es.
- Startseite des Hubs: empfohlene Reihenfolge der Pfade mit Begründung (L4).
  - Für Einsteiger: Python → SQL → AI.
  - Git & GitHub begleitet ab der ersten Woche.
  - Für Fachbereiche: SQL → AI.
- Jede App verlinkt zurück zum Hub und zu den anderen Pfaden.

**Fertig, wenn:** keine Platzhaltertexte mehr vorkommen, jeder leere Zustand
einen nächsten Schritt hat und die Reihenfolge auf `/` steht.

**Stand 19.11.2026:** Die Reihenfolge steht auf `/` als eigener Abschnitt
„Womit du anfängst" (`03 / DEIN EINSTIEG`): Weg A Python → SQL → AI mit Git &
GitHub ab der ersten Woche, Weg B SQL → AI, je mit Begründung pro Schritt und
Startlink aus dem Katalog. Danach die übrigen Punkte: Jeder leere Zustand in
den vier Apps hat einen nächsten Schritt mit Link (Organisation, Üben,
Projekte, Wiederholen, Fortschritt, Nachschlagen, VokabelPfad); die
Dachleiste verweist neben dem Hub auf die anderen Fach-Apps („Andere
Lernpfade“). Platzhaltertexte der Art „Hier siehst du künftig …“ kommen nicht
mehr vor; die Inhaltsprüfung der Apps lehnt sie in veröffentlichten Lektionen
ab. Damit ist E1 im Code erledigt; die Abnahme auf den Live-Domains folgt nach
dem Ausrollen.

### E2 · SQL wirklich ausführen (L1)

Der Runner (`sqlpfad/runner/`) und die Sandbox-Rechte sind gebaut und laufen in
der CI gegen einen echten SQL Server. Für den Betrieb vorgesehen:

- **SQL Server Express** als eigener Railway-Service, privates Netz,
  `MSSQL_PID=Express`. Express darf kostenlos produktiv genutzt werden; seine
  Grenzen sind 10 GB je Datenbank und 1,4 GB Puffer, für Übungsdaten genug.
- Runner als eigener Service, nur im privaten Netz erreichbar, Token aus
  Railway.
- `FEATURE_SQL_RUNNER=true` erst nach der Sicherheitsabnahme: Isolation je
  Sandbox, Zeit- und Zeilengrenzen, Abbruch.

**Stand 19.11.2026:** SQL Server Express und Runner laufen, die Sicherheitsabnahme ist grün, `FEATURE_SQL_RUNNER=true`. Offen ist der Rundgang angemeldet.

**Fertig, wenn:** eine Übung auf `www.sqlpfad.de` eine echte Abfrage ausführt,
Ergebnis und Fehlermeldung verständlich zeigt und der Warnkasten verschwunden
ist.

**Braucht eine Entscheidung:** SQL Server braucht mindestens 2 GB
Arbeitsspeicher. Je nach Railway-Tarif kostet das laufend Geld
(Größenordnung 10–25 USD/Monat).

### E3 · Ein Design für alle (L3)

- Das Learning OS des Hubs (Tokens, Kopfzeile, Typografie, dunkle
  Editorialflächen, helle Arbeitsflächen) wird gemeinsames Paket, wie schon die
  Verträge `learning-components`, `learning-feedback` und `learning-shell`.
- Der Fachakzent bleibt je App (Python Indigo, SQL Türkis, AI Amber).
  Struktur, Abstände, Komponenten und Bewegung sind gleich.
- Reihenfolge: SQLPfad → PythonPfad → AIPfad.

**Fertig, wenn:** die Drift-Prüfung das gemeinsame Paket in allen Apps
bytegleich findet und eine Person zwischen den Apps keinen Stilbruch sieht.

**Stand 19.11.2026:** Alle drei Apps stehen auf den Farben des Learning OS
(Grundskala Papier bis Tinte, Plattformleiste, Hero auf Tinte mit einem
Lichtkegel im Fachakzent, Akzentzeile in Serifen-Kursive). SQLPfad seit #86,
PythonPfad und AIPfad im Folgeschritt; AIPfad behält Plex Mono als
Auszeichnungsschrift und Bernstein (siehe `aipfad/DESIGN.md`). Danach die
gedeckte, plattformweite Modulpalette (`docs/LEARNING-DESIGN-SYSTEM.md`,
Ebene B). Danach der Token-Vertrag `docs/learning-tokens/`: eine bytegleiche
Datei in Hub und allen Apps, auf die Apps, Shell, Komponenten und Statusvertrag
verweisen; die gemeinsamen Komponenten stehen damit auch im dunklen Schema auf
der Tinte statt auf Blaugrau. Zuletzt die gemeinsame Schrift: IBM Plex auch
im Hub, Dateien und Stapel im Token-Vertrag.

### E4 · Ein Konto für alles (L2)

- Zentrale Anmeldung (OpenID Connect) für Hub und alle Apps. Bestehende Konten
  werden über die E-Mail-Adresse zusammengeführt, mit Bestätigung.
- Danach Fortschritt und Wiederholungen pfadübergreifend im Hub, unabhängig von
  Domain-Grenzen. Das löst auch L6.

**Entschieden:** eigener Identitätsdienst (Daten bleiben in der EU).
**Plan:** `docs/E4-KONTO-PLAN.md`, mit ZITADEL als Dienst, Keycloak als
Rückfall, Zusammenführung nur über bestätigte E-Mail-Adressen und Etappen
E4.0–E4.5. **E4.0 erledigt** (`docs/E4-0-MACHBARKEIT.md`): ZITADEL erfüllt alle
Tore, die Anmelde-App ist MIT, App-Hashes werden übernommen, und heute gibt es
2 Konten. Gemessen ca. 7–12 USD im Monat.

**Alle Entscheidungen vor E4.1 sind gefallen (Stand 20.11.2026):**

- Domain `lernpfade.net` (Inklusiv-Domain bei Strato, 0 €), Anmeldung unter
  `konto.lernpfade.net`.
- Mailversand über Scaleway TEM (Paris), eingerichtet und für `lernpfade.net`
  verifiziert.
- Zweiter Faktor freiwillig für Lernende, Pflicht für Admin- und
  Organisationsrechte.

**Nächster Schritt:** E4.1, der Betrieb von ZITADEL und der Anmelde-App auf
Railway.

### E5 · Für Unternehmen (L5)

Aufbauend auf den Organisationen von PythonPfad, für alle Pfade:

- Organisationen mit Plätzen, Einladungen per Link oder Domain und Rollen
  (Admin, Lehrkraft, Lernende);
- Teamübersicht: Fortschritt je Person und Pfad, fällige Wiederholungen,
  CSV-Export. Nur Aggregate und keine Lernzeitüberwachung ohne Zustimmung;
- Lernpläne: Pfade und Reihenfolge je Team vorgeben, mit Fälligkeiten;
- später SSO (SAML/OIDC) für größere Kunden.

**Fertig, wenn:** ein Unternehmen ein Team einlädt, einen Lernplan vergibt und
den Stand ohne Support sieht.

Plan und Etappen: `docs/E5-PLAN.md` (seit 25.11.2026).

### E6 · Betrieb auf Produktniveau (L7)

- Tägliche Datenbanksicherungen mit geprüfter Wiederherstellung.
- Erreichbarkeitsüberwachung, Fehlerberichte und eine Statusseite.
- Rechtsseiten: Impressum, Datenschutz und AVV-Vorlage für Unternehmen.
- Aufbewahrungslauf von Trockenlauf auf Ernstfall, nach geprüften Läufen.

Plan und Etappen: `docs/E6-PLAN.md` (seit 26.11.2026). Live seit
26.11.2026: Rechtsseiten (E6.1), Statusseite und externer Alarm über Better
Stack (E6.2).

### E7 · Kaufen und abrechnen

- Preisseite (Einzelperson, Team, Unternehmen), Testzeitraum, Abrechnung über
  einen Zahlungsanbieter, Rechnungen mit Umsatzsteuer.
- **Braucht eine Entscheidung:** Preismodell und Anbieter.

## 3. Reihenfolge und Abhängigkeiten

```
E1 ─┬─ E3 ──┐
    ├─ E2   ├─ E5 ── E7
    └─ E4 ──┘
E6 läuft ab E2 begleitend mit
```

E1 beginnt sofort. E2 und E4 hängen an Entscheidungen. E3 läuft parallel,
weil es keine Entscheidung braucht.

## 4. Grundsätze

- Keine erfundenen Zahlen in der Oberfläche, keine Dark Patterns, keine
  Lernzeitüberwachung ohne Zustimmung.
- Jede Etappe als eigener PR mit Tests. UI-Tests werden nie über Retries oder
  längere Timeouts grün gemacht.
- Kosten, Verträge und personenbezogene Daten entscheidet der Auftraggeber
  ausdrücklich.
