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
Ebene B). Offen: eine gemeinsame Schrift und die geteilte Token-Datei mit
Drift-Prüfung, die auch die Flächen der gemeinsamen Komponenten im dunklen
Schema auf die Tinte bringt (sie tragen dort noch ein Blaugrau).

### E4 · Ein Konto für alles (L2)

- Zentrale Anmeldung (OpenID Connect) für Hub und alle Apps. Bestehende Konten
  werden über die E-Mail-Adresse zusammengeführt, mit Bestätigung.
- Danach Fortschritt und Wiederholungen pfadübergreifend im Hub, unabhängig von
  Domain-Grenzen. Das löst auch L6.

**Braucht eine Entscheidung:** einen eigenen Identitätsdienst betreiben (Daten
bleiben in der EU, mehr Aufwand) oder einen gehosteten Anbieter nutzen
(schneller, laufende Kosten, AVV nötig).

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

### E6 · Betrieb auf Produktniveau (L7)

- Tägliche Datenbanksicherungen mit geprüfter Wiederherstellung.
- Erreichbarkeitsüberwachung, Fehlerberichte und eine Statusseite.
- Rechtsseiten: Impressum, Datenschutz und AVV-Vorlage für Unternehmen.
- Aufbewahrungslauf von Trockenlauf auf Ernstfall, nach geprüften Läufen.

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
