# SQL Runner: Ausführung von Lernenden-SQL

Dieses Dokument beschreibt, wie SQLPfad fremdes SQL ausführt, welche Grenzen
dabei gelten – und welche Fragen für den Produktionsbetrieb noch offen sind.

Es ist bewusst auch dort ehrlich, wo etwas **nicht** gelöst ist.

---

## 1. Warum SQL eine andere Architektur braucht als Python

PythonPfad führt Python im Browser aus (Pyodide). Nach dem Download der Laufzeit
läuft der Code der Lernenden auf deren eigenem Gerät – die Isolation übernimmt
die Sandbox des Browsers, und ein Fehler trifft niemanden außer die Person
selbst.

Für T-SQL gibt es diesen Weg nicht. T-SQL braucht ein echtes Datenbankmodul.
Das bedeutet: **Der Code fremder Menschen läuft auf unserem Server.** Damit
verschiebt sich die gesamte Sicherheitsfrage von „kann der Browser das
abfangen?" zu „was darf dieser Anmeldename in dieser Datenbank?".

Daraus folgt der Rest dieses Dokuments.

---

## 2. Zwei strikt getrennte Datenebenen

| Ebene          | Inhalt                                                                   | Wer führt dort SQL aus?      |
| -------------- | ------------------------------------------------------------------------ | ---------------------------- |
| **PostgreSQL** | Konten, Sitzungen, Fortschritt, Kompetenzstände, Inhalte, Organisationen | ausschließlich die Anwendung |
| **SQL Server** | Übungsdaten                                                              | die Lernenden                |

**Lernende führen niemals SQL gegen die Plattformdatenbank aus.** Das ist keine
Ordnungsfrage, sondern die zentrale Sicherheitsgrenze: Wären beide in einem
System, wäre jede Lücke im Berechtigungsmodell sofort ein Zugriff auf die Konten
aller anderen.

Die beiden Systeme kennen einander nicht. Es gibt keinen Verbindungsserver,
keine gemeinsamen Anmeldenamen und keinen Netzweg zwischen ihnen.

---

## 3. Kein SQL Server in einer Serverless-Funktion

Die Anwendung spricht **nicht** direkt mit Port 1433.

```
Browser
   ↓  Sitzung der angemeldeten Person
SQLPfad (Next.js)
   ↓  authentifizierter interner Aufruf
SQL Runner Service
   ↓  Anmeldename mit minimalen Rechten, je Sandbox
SQL-Server-Sandbox
```

Gründe:

- Ein SQL Server ist kein kurzlebiger Prozess. Verbindungsaufbau, Aufwärmen und
  Verbindungspool vertragen sich schlecht mit Funktionen, die nach Sekunden
  enden.
- Die Zugangsdaten zur Sandbox dürfen nicht in einer Umgebung liegen, die
  auch Anwendungslogik ausführt, die von außen erreichbar ist.
- Zeitlimit, Abbruch und Aufräumen brauchen einen Prozess, der die Ausführung
  überdauert.

---

## 4. Die Sicherheitsgrenze ist das Berechtigungsmodell

Die eigentliche Grenze sind **Datenbankberechtigungen**, nicht die Prüfung des
Abfragetexts.

Jeder Ausführungskontext bekommt:

- einen eigenen Anmeldenamen mit minimalen Rechten,
- Zugriff ausschließlich auf die eigene Sandbox-Datenbank,
- keine Serverrollen, insbesondere nicht `sysadmin`,
- keinen Zugriff auf andere Sandboxes,
- keinen Zugriff auf das Dateisystem, externe Datenquellen oder
  Betriebssystembefehle.

`src/domain/sql/statement-policy.ts` prüft zusätzlich, welche Art von Anweisung
eine Aufgabe zulässt. **Das ist ausdrücklich nicht die Sicherheitsgrenze.** Die
Datei sagt das selbst in ihrem Kopf, und zwar aus einem Grund: SQL lässt sich
beliebig verschleiern – über Kommentare, Zeilenumbrüche, dynamisches SQL,
Unicode-Varianten. Eine Textprüfung gewinnt dieses Rennen nie. Sie hat zwei
andere Aufgaben:

1. **Didaktik.** In einer `SELECT`-Lektion soll ein `UPDATE` eine Erklärung
   auslösen, nicht stillschweigend laufen.
2. **Tiefenstaffelung.** Falls eine Berechtigung je falsch gesetzt ist, ist eine
   zweite Hürde besser als keine.

---

## 5. Ressourcengrenzen

Ohne harte Grenzen kann eine einzige Abfrage den Übungsserver für alle
blockieren – absichtlich oder aus Versehen.

| Grenze                                 | Zweck                            |
| -------------------------------------- | -------------------------------- |
| Zeitlimit je Abfrage                   | verhindert Endlosläufe           |
| Abbruch (Cancel)                       | die Lernende kann selbst stoppen |
| maximale Zeilenzahl                    | verhindert Ergebnisfluten        |
| maximale Anzahl Anweisungen je Anfrage | begrenzt Stapelverarbeitung      |
| gleichzeitige Ausführungen je Person   | verhindert Selbstblockade        |
| gleichzeitige Ausführungen insgesamt   | schützt den Server               |
| Lebensdauer der Sandbox                | räumt vergessene Zustände auf    |
| Rate Limit                             | begrenzt automatisierte Last     |

`WAITFOR` ist zusätzlich in der Statement-Policy gesperrt: Es ist der einfachste
Weg, eine Verbindung ohne Rechenlast zu belegen.

---

## 6. Offene Frage: Lizenz für den Produktionsbetrieb

**Das ist der eine Punkt, der noch nicht entschieden ist, und er soll hier nicht
beschönigt werden.**

Für die lokale Entwicklung nutzt SQLPfad die **SQL Server Developer Edition**
(`mcr.microsoft.com/mssql/server:2025-latest`, `MSSQL_PID=Developer`). Microsoft
stellt sie für Entwicklung und Test kostenlos bereit.

Für den öffentlichen Betrieb ist sie **nicht** vorgesehen. Zu klären ist, bevor
`FEATURE_SQL_RUNNER` produktiv eingeschaltet wird:

- Azure SQL Database – verwaltet, aber nicht in allen Punkten
  T-SQL-deckungsgleich mit einer eigenen Instanz
- SQL Server Express – kostenlos, mit Grenzen bei Arbeitsspeicher und
  Datenbankgröße
- regulär lizenzierte SQL-Server-Edition
- vorhandene Infrastruktur des Betreibers

Bis das entschieden ist, gilt:

```
FEATURE_SQL_RUNNER=false
```

Die Anwendung erklärt in diesem Zustand sichtbar, dass das Ausführen von
Abfragen gerade nicht zur Verfügung steht. **Es gibt keinen stillen Rückfall auf
eine unsichere Ausführung** – lieber eine ehrlich abgeschaltete Funktion als
eine, die Lizenz oder Isolation verletzt.

---

## 7. Offline

Anders als bei PythonPfad kann SQLPfad Abfragen **nicht** ohne Verbindung
ausführen. Die Anwendung sagt das ausdrücklich und behauptet nirgends, SQL laufe
im Browser.

Ohne Verbindung nutzbar: bereits geladene Erklärungen, Navigation im Lernpfad,
Entwürfe im Editor, Aufgaben zur Ergebnisvorhersage mit eingebetteten Daten.

Nicht nutzbar: echte T-SQL-Ausführung, Grading gegen die Datenbank, Zustand der
Sandbox.

---

## 8. Integrationstests ausführen

Die Tests in `tests/sql/` sind der einzige Ort, an dem sich T-SQL-Semantik
nachweisen lässt. Ohne Zugangsdaten werden sie **übersprungen, nicht
bestanden** – ein grüner Lauf ohne Server wäre eine Auskunft, die nichts wert
ist, und sie käme genau dann, wenn man sich auf sie verlässt.

```bash
docker compose up -d sqlserver

SQL_SERVER_HOST=127.0.0.1 \
SQL_SERVER_PORT=1433 \
SQL_SERVER_SA_PASSWORD=… \
npm run test:sql
```

Läuft kein Server, meldet der Lauf ausdrücklich, dass die T-SQL-Semantik in
diesem Durchgang nicht geprüft wurde.

---

## 9. Konfiguration des Runner-Prozesses

Diese Werte gehören in die Umgebung des **Runner-Prozesses**, nicht in die der
Anwendung. Sie stehen deshalb nicht in `.env.example`: Die Anwendung liest sie
nicht, und eine Datei, in der unbenutzte Zugangsdaten stehen, lädt dazu ein,
sie irgendwann doch dort zu verwenden.

| Wert                                 | Bedeutung                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `SQL_SERVER_HOST`, `SQL_SERVER_PORT` | Adresse des Übungsservers                                                                 |
| Anmeldename für die Verwaltung       | darf Sandboxes anlegen und zurücksetzen – **nicht** derselbe, mit dem Lernenden-SQL läuft |
| Verschlüsselung                      | außerhalb der lokalen Entwicklung immer eingeschaltet                                     |

Die Anwendung selbst kennt nur `SQL_RUNNER_URL` und `SQL_RUNNER_TOKEN`. Sie
spricht nie direkt Port 1433 – siehe Abschnitt 3.

---

## 10. Der Dienst

```bash
SQL_RUNNER_TOKEN=…                       # dasselbe wie in der Anwendung
SQL_SERVER_HOST=127.0.0.1
SQL_SERVER_VERWALTUNG_BENUTZER=…
SQL_SERVER_VERWALTUNG_PASSWORT=…
SQL_SERVER_ZERTIFIKAT_NICHT_PRUEFEN=true # nur lokal
npm run runner
```

Der Prozess liegt unter `runner/` und ist ausdrücklich **kein Teil der
Next-Anwendung**. Der Motor lag früher unter `src/server/` und trug
`server-only`; beides war falsch, seit es den Dienst gibt. Er läuft dort, wo
der Übungsserver steht, und die Anwendung erreicht ihn über `SQL_RUNNER_URL`.

### Die Schnittstelle

| Weg                           | Zweck                                |
| ----------------------------- | ------------------------------------ |
| `POST /ausfuehren`            | eine Abfrage in einer Sandbox        |
| `POST /abbrechen`             | genau diese eine Ausführung stoppen  |
| `POST /sandbox/zuruecksetzen` | Datenbank verwerfen und neu aufbauen |
| `POST /zustand`               | antwortet der Übungsserver?          |

Alle Wege verlangen `Authorization: Bearer <SQL_RUNNER_TOKEN>`. Der Vergleich
läuft **zeitkonstant**: Ein `===` auf Zeichenketten bricht beim ersten
Unterschied ab, und aus den Laufzeitunterschieden lässt sich ein Token Zeichen
für Zeichen erraten.

Der Dienst gehört **nicht ins offene Netz**. Kein Browser spricht je mit ihm;
das Token ist die zweite Sicherung, nicht die erste.

### Zwei Anmeldenamen, nicht einer

Das ist die Umsetzung von Abschnitt 4, und sie hat eine Zeile, an der alles
hängt – die in `fuehreAus`, die den **Ausführungspool** holt und nicht den
Verwaltungspool.

| Name                          | Darf                                                      |
| ----------------------------- | --------------------------------------------------------- |
| Verwaltung (aus der Umgebung) | Datenbanken und Anmeldenamen anlegen, Struktur einspielen |
| `lrn_<sandbox>` (je Sandbox)  | in **seiner** Datenbank lesen, schreiben, Struktur ändern |

Der Sandbox-Name bekommt `db_datareader`, `db_datawriter` und `db_ddladmin` –
**nicht** `db_owner`, keine Serverrolle und `DENY VIEW ANY DATABASE`, damit
fremde Sandboxes nicht einmal in der Liste auftauchen. Das Ändern der Struktur
ist nötig, weil Modul 4 `CREATE TABLE` und `ALTER TABLE` übt.

Das Kennwort dieses Anmeldenamens liegt **nur im Speicher des
Runner-Prozesses** und wird nirgends abgelegt. Nach einem Neustart ist die
Karte leer und der nächste Zugriff setzt es neu (`ALTER LOGIN … WITH
PASSWORD`). Ein Kennwort, das man neu vergeben kann, muss man nicht
aufbewahren – und was nicht abgelegt ist, kann nicht abfließen.

### Die Grenzen aus Abschnitt 5 – jetzt als Code

`runner/grenzen.ts` setzt durch, was dort als Tabelle stand: gleichzeitige
Ausführungen je Sandbox und insgesamt, dazu ein Zeitfenster je Sandbox. Bis
dahin war es eine Absichtserklärung, auf die sich jemand verlassen hat.

Abgewiesen wird mit `429` und einem Satz, der erklärt statt zu tadeln. „Zu
schnell" ist meist ein doppelter Klick, kein Angriff.

---

## 11. Was Stand heute noch nicht bewiesen ist

Ehrlichkeitshalber, damit dieses Dokument nicht mehr verspricht als der Code
hält:

- **Ein grün gelaufener Durchgang der SQL-Integrationstests.** Bis dahin gilt
  `runner/mssql-motor.ts` als unbewiesen: Er ist nach der Treiberdokumentation
  geschrieben und **gegen keinen laufenden SQL Server gelaufen**. Das gilt
  ausdrücklich auch für die Vergabe der Anmeldenamen und die Rechtevergabe aus
  Abschnitt 10 – das T-SQL dafür ist geschrieben, nicht erprobt.

  Was **geprüft** ist: die Schnittstelle des Dienstes, die Token-Prüfung, die
  Grenzen, die Übersetzung von Fehlern und Zeitlimits sowie das Freigeben
  belegter Plätze. `tests/unit/runner-dienst.test.ts` startet dafür den
  echten Dienstprozess und spricht ihn über HTTP an; nur der Motor dahinter
  ist ein Prüfstand. Die Trennlinie verläuft genau dort, wo T-SQL-Semantik
  beginnt.

- die Entscheidung aus Abschnitt 6

### Was ohne Runner trotzdem geht

Aufgaben sind bearbeitbar, und zwar nicht als Notlösung: Auswahl,
Mehrfachauswahl, Reihenfolge und die Vorhersage der Zeilenzahl werden
vollständig bewertet, ohne dass eine einzige Anweisung ausgeführt wird. Die
Bewertung steht in `src/domain/aufgabe/bewertung.ts` und kennt weder Datenbank
noch Netz.

Nicht bewertbar sind die Aufgaben, die eine geschriebene Abfrage verlangen. Sie
laufen durch die Statement-Policy – ein UPDATE in einer Leselektion wird also
sofort erklärt –, bekommen danach aber die Auskunft „geprüft, aber nicht
ausgeführt". Es wird ausdrücklich **nicht** behauptet, eine Abfrage sei richtig,
weil sie richtig aussieht.

Antworten in eigenen Worten bewertet die Lernende selbst neben der
Musterantwort. Das ist keine Ersatzhandlung für fehlende Technik: Ein
Textvergleich, der „ungefähr richtig" behauptet, wäre eine Anmaßung, und der
eigene Vergleich ist ohnehin der lernwirksamere Teil.
