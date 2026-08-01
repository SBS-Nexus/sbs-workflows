# Architektur

Dieses Dokument beschreibt die tragenden Entscheidungen und deren Begründung.
Es ist bewusst als Entscheidungsprotokoll geschrieben: Was wurde gewählt, was
war die Alternative, und warum fiel die Wahl so aus?

---

## 1. Schichtung

```
app/  components/        Darstellung und Interaktion – keine Geschäftslogik
        │
server/                  Persistenz, Berechtigungen, Server Actions, Dienste
        │
domain/                  Reine Fachlogik – kein Framework, keine Datenbank
        │
lib/runner/              Abstraktion der Python-Ausführung
```

**Regel:** `domain/` importiert nichts aus `server/`, `app/` oder
`components/`. Jede Funktion dort ist eine reine Funktion und ohne
Infrastruktur testbar. Das ist der Grund, warum die 140 Unit-Tests in weniger
als zwei Sekunden durchlaufen.

**Was das praktisch bedeutet:** Die Kompetenzberechnung
(`domain/mastery/mastery.ts`) kennt weder Prisma noch React. Sie bekommt einen
Zustand und ein Ergebnis und liefert einen neuen Zustand samt Begründung.
`server/services/exercise-service.ts` kümmert sich darum, diesen Zustand zu
laden und zu speichern.

---

## 2. Entscheidungen im Einzelnen

### 2.1 Inhalte als typisierte TypeScript-Module statt Markdown oder JSON

**Gewählt:** `src/content/` mit Zod-geprüften TypeScript-Modulen.

**Alternativen:** Markdown mit Frontmatter, JSON-Dateien, ein Headless-CMS.

**Begründung.** Eine Lektion ist keine Textseite. Sie enthält ein
durchgerechnetes Beispiel mit Zeilenanmerkungen, eine fünfstufige
Hinweisleiter, sichtbare und versteckte Testfälle, Konzeptverweise und
Gerüst-Stufen. In Markdown wäre das eine Ansammlung von Konventionen, die
niemand prüft. Als TypeScript bekommt die Redaktion beim Schreiben sofortige
Rückmeldung, und `parseContent()` prüft zusätzlich alles, was Typen allein
nicht abdecken: existierende Konzepte, Zyklen im Konzeptgraph, aufsteigende
Hinweisstufen, Testbarkeit jeder Code-Aufgabe, Platzhaltertexte.

**Zwei Typenfamilien.** `ModuleDraft` (Autorensicht, Standardwerte optional)
und `ModuleContent` (nach der Prüfung, alle Felder gesetzt). Dadurch bleibt das
Schreiben bequem, und nachgelagerter Code muss nirgends auf fehlende Felder
prüfen.

**Preis.** Redaktionelle Änderungen erfordern ein Deployment. Für eine erste
Version mit ausgearbeitetem Curriculum ist das vertretbar; der Adminbereich
zeigt bereits Veröffentlichungsstand und Prüfergebnisse und ist der natürliche
Ort für eine spätere Bearbeitungsoberfläche.

### 2.2 Eigene Sitzungsverwaltung statt Auth.js

**Gewählt:** scrypt-Hashing und opake, serverseitig gespeicherte Sitzungen
(`src/server/auth/`).

**Alternative:** Auth.js (NextAuth) v5.

**Begründung.** Auth.js liegt für den App Router als Vorabversion vor. Die
Vorgabe lautet ausdrücklich, keine nicht produktionsreifen Funktionen ohne
klaren Mehrwert einzusetzen. Die Anwendung braucht genau einen
Anmeldeweg – E-Mail und Passwort, ohne Fremdanbieter. Das ist ein
überschaubares, gut verstandenes Muster:

- Token: 32 zufällige Bytes, ohne Inhalt.
- In der Datenbank liegt nur der SHA-256-Hash. Ein Datenbankleck gibt damit
  keine übernehmbaren Sitzungen preis.
- Cookie: `httpOnly`, `SameSite=Lax`, in Produktion `secure`.
- Passwort: scrypt mit den OWASP-Parametern; die Parameter stehen im Hash und
  lassen sich später erhöhen, ohne bestehende Konten zu entwerten.

scrypt statt argon2 oder bcrypt, weil es in Node enthalten ist. Eine native
Abhängigkeit weniger bedeutet eine Kompilierstufe weniger bei jedem Deployment
und eine kleinere Angriffsfläche in der Lieferkette.

**Preis.** Fremdanbieter-Anmeldung, E-Mail-Bestätigung und Passwort-Zurücksetzen
fehlen. Alle drei brauchen ohnehin zusätzliche Infrastruktur.

### 2.3 CodeMirror 6 statt Monaco

**Begründung.** Rund ein Zehntel der Bundle-Größe, deutlich bessere Bedienung
auf Mobilgeräten, und die Tab-Belegung lässt sich so einstellen, dass keine
Tastaturfalle entsteht (WCAG 2.1.2). Für den Sprachumfang dieses Kurses ist die
Autovervollständigung von Monaco kein Vorteil – sie würde eher davon
ablenken, Namen selbst zu tippen.

### 2.4 Pyodide im Web Worker, selbst gehostet

**Begründung.** Drei Gründe für die eigene Kopie unter `public/pyodide` statt
eines CDN:

1. **Datenschutz.** Ohne CDN erfährt kein Dritter, wer wann Python lernt.
2. **Content Security Policy.** `script-src 'self'` kann streng bleiben.
3. **Reproduzierbarkeit.** Die Version ist über `package-lock.json` gepinnt.

Der Worker sorgt dafür, dass die Oberfläche bedienbar bleibt, und lässt sich
hart beenden. Abbruch per `terminate()` statt kooperativer Unterbrechung, weil
`while True: pass` keine Gelegenheit zum Prüfen eines Interrupt-Flags lässt.

**Preis.** Rund 13 MB beim ersten Laden. Der Ladefortschritt wird angezeigt,
die Dateien werden ein Jahr lang zwischengespeichert (`immutable`).

### 2.5 Runner-Abstraktion

Die Anwendung spricht ausschließlich gegen `PythonRunner`
(`src/lib/runner/types.ts`): `init`, `run`, `stop`, `reset`, `dispose`,
`subscribe`, `onOutput`.

Ein späterer `ContainerRunner` gegen einen isolierten Sandbox-Dienst
implementiert dasselbe Interface. Weder UI noch Domainlogik ändern sich. Der
einzige Unterschied wäre, dass die Testausführung dann serverseitig stattfindet
und der Browser aufhört, eine Vertrauenslücke zu sein.

### 2.6 Zwei Achsen bei Aufgaben

`ExerciseType` beschreibt die **didaktische Rolle** (`TRANSFER`,
`SPACED_REVIEW`, `REFACTOR`, `WRITE_CODE` …), `payload.kind` die
**Interaktionsform** (`singleChoice`, `parsons`, `code` …).

**Warum getrennt.** Eine Transferaufgabe braucht keine eigene
Bewertungslogik – sie ist eine Code-Aufgabe mit anderer didaktischer Rolle. Die
Rolle steuert die Gewichtung im Kompetenzmodell, die Interaktionsform steuert
Darstellung und Bewertung. Ohne diese Trennung bräuchte jede Kombination einen
eigenen Zweig. So genügen acht Bewertungsfunktionen für zwölf Aufgabentypen.

### 2.7 Bewertung auf dem Server

`toPublicPayload()` entfernt aus jeder Aufgabe alles, was die Lösung verrät,
bevor sie den Server verlässt: richtige Optionen, akzeptierte Lückenfüllungen,
erwartete Ausgaben, Erklärungen, Musterlösungen. Ein Unit-Test prüft das für
jede einzelne der 61 Aufgaben.

**Ausnahme mit Ansage:** Bei Code-Aufgaben führt der Browser die Tests aus. Die
Testfälle müssen dafür beim Absenden ausgeliefert werden. Was das für das
Vertrauensmodell bedeutet, steht in [SICHERHEIT.md](SICHERHEIT.md).

### 2.8 Kompetenzmodell: deterministisch statt gelernt

**Begründung.** Ein Modell, dessen Entscheidungen sich nicht erklären lassen,
ist in einer Lernumgebung ein Problem: Es steuert, was als beherrscht gilt und
wann wiederholt wird. Deshalb ist jede Regel im Klartext hinterlegt, getestet
und versioniert. Die Oberfläche zeigt der lernenden Person zu jeder Veränderung
die Begründung.

Ausdrücklich **nicht** eingerechnet: Bearbeitungsgeschwindigkeit. Gründliches
Nachdenken ist erwünscht, nicht Tempo. Ebenso wenig fließen demografische
Merkmale ein – sie werden gar nicht erst erhoben.

Details in [LERNMODELL.md](LERNMODELL.md).

### 2.9 Keine Komponentenbibliothek

`src/components/ui/primitives.tsx` enthält gut ein Dutzend Bausteine in rund
350 Zeilen: Button, Card, Callout, Badge, ProgressBar, Field, CodeBlock,
EmptyState. Alle mit semantischem HTML, sichtbarem Fokus und
Text-Alternativen.

**Begründung.** Der Bedarf ist überschaubar, und jede Abhängigkeit weniger
bedeutet weniger Ballast im Client-Bundle und weniger Angriffsfläche in der
Lieferkette. Die Rückmeldungs-Komponente `Callout` zeigt Farbe **und** Symbol
**und** Text – Farbe ist nirgends das einzige Unterscheidungsmerkmal
(WCAG 1.4.1).

---

## 3. Datenmodell

Vollständig in `prisma/schema.prisma`. Die Leitgedanken:

**Inhalt und Verlauf sind getrennt.** `Course`, `CourseModule`, `Lesson`,
`Exercise`, `Concept`, `Project`, `ReviewSet` kommen aus versionierten Dateien.
`Attempt`, `ConceptMastery`, `LessonProgress`, `ReviewQueueItem`,
`ProjectSubmission`, `LearningSession` entstehen zur Laufzeit.

**Personenbezug und Produktanalyse sind getrennt.** `AnalyticsEvent` hat
bewusst keinen Fremdschlüssel auf `User` und kein Zeitfeld feiner als den Tag.
Eine Zuordnung zu einzelnen Personen ist damit technisch nicht möglich – ein
Integrationstest prüft, dass die Tabelle keine Nutzerspalte enthält.

**Jeder Fremdschlüssel hat eine explizite Löschregel.** Alle nutzerbezogenen
Beziehungen sind `onDelete: Cascade`. Dadurch entfernt ein einziges
`prisma.user.delete()` sämtliche personenbezogenen Daten. Auch das ist durch
einen Integrationstest abgedeckt.

**Indizes** liegen auf den tatsächlichen Zugriffsmustern: `(userId, dueAt)` für
fällige Wiederholungen, `(userId, createdAt)` für den Verlauf,
`(userId, state)` für den Lektionsfortschritt, `tokenHash` eindeutig für
Sitzungen.

### Zentrale Entitäten

| Entität           | Zweck                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| `User`            | Konto, Onboarding-Angaben, Barrierefreiheits- und KI-Einstellungen           |
| `AuthSession`     | Sitzung; speichert nur den Token-Hash                                        |
| `Concept`         | kleinste Einheit, für die Kompetenz gemessen wird; Graph mit Voraussetzungen |
| `Exercise`        | Aufgabe mit Nutzlast, Tests, Hinweisleiter, Gerüst-Stufe                     |
| `Attempt`         | Einzelabgabe mit Ergebnis, Fehlerart, Hinweisen, Dauer, Sicherheit           |
| `ConceptMastery`  | Kompetenzstand, Stabilität, Schwierigkeit, Algorithmusversion                |
| `ReviewQueueItem` | konkret eingeplante Wiederholung samt Begründung                             |
| `LearningPath`    | individuelle Lektionsreihenfolge samt Begründungstext                        |
| `AnalyticsEvent`  | anonyme Produktanalyse, ohne Nutzerbezug                                     |

---

## 4. Risiken und wie ihnen begegnet wird

| Risiko                                                      | Auswirkung                          | Maßnahme                                                                                                                                        |
| ----------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Manipulierte Testergebnisse aus dem Browser                 | Fortschritt stimmt nicht            | Bewertung sonst vollständig serverseitig; Quelltextregeln werden serverseitig nachgeprüft; Runner-Abstraktion für einen späteren Sandbox-Dienst |
| Pyodide lädt nicht (alter Browser, blockiertes WebAssembly) | Code-Aufgaben nicht bearbeitbar     | Verständliche Fehlermeldung mit Hinweis; alle nicht-Code-Aufgaben bleiben nutzbar                                                               |
| Kompetenzmodell wirkt wie eine objektive Messung            | falsches Selbstbild                 | Anzeige über Bänder statt Zahlen, ausdrücklicher Hinweis „Orientierungswert, keine Messung“, jede Veränderung wird begründet                    |
| Wiederholungen häufen sich nach einer Pause                 | Überforderung, Abbruch              | Höchstens zwölf Aufgaben je Runde, überfällige zuerst, neutrale Formulierung ohne Schuldzuweisung                                               |
| Interleaving überfordert Anfänger                           | Frustration in den ersten Lektionen | Mischen erst ab drei eingeführten Konzepten                                                                                                     |
| Redaktioneller Fehler gelangt in die Auslieferung           | fehlerhafte Lektion                 | Inhaltsvalidierung im Seed-Skript, im Adminbereich und in den Tests; alle Musterlösungen laufen gegen ihre eigenen Testfälle                    |
| Ratenbegrenzung im Arbeitsspeicher                          | wirkungslos bei mehreren Instanzen  | dokumentiert; Schnittstelle bleibt bei einem gemeinsamen Zähler gleich                                                                          |

---

## 5. Nächste sinnvolle Ausbauschritte

Fachlich begründet, in der Reihenfolge des Nutzens:

1. **Container-Sandbox als zweiter Runner.** Schließt die einzige echte
   Vertrauenslücke und ermöglicht Aufgaben mit Dateizugriff und externen
   Paketen (Stufe 7 und 12 des Curriculums).
2. **Stufen 4 bis 6 des Curriculums** – Datenstrukturen, Funktionen, Debugging.
   Die Infrastruktur trägt das bereits vollständig; es fehlt nur der Inhalt.
3. **Bearbeitungsoberfläche im Adminbereich.** Der Lesebereich samt Validierung
   steht; ergänzt werden müssten Formulare und ein Freigabeprozess.
4. **Aufgabenvarianten.** Derzeit wiederholt jede Wiederholung dieselbe
   Aufgabe. Semantisch gleichwertige Varianten mit anderen Zahlen und
   Kontexten würden den Abruf weiter stärken.
5. **E-Mail-Anbindung** für Bestätigung und Passwort-Zurücksetzen.
6. **Gemeinsame Ratenbegrenzung**, sobald mehr als eine Instanz läuft.
