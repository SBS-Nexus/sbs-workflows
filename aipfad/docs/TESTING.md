# Testing

Teststrategie und aktueller, tatsächlich verifizierter Stand (nicht
Zielbild — was hier steht, wurde beim Schreiben ausgeführt und ist grün).

## Ebenen

```bash
npm run test:unit          # Domainlogik, keine I/O — Millisekunden
npm run test:integration   # Server-Dienste gegen echte PostgreSQL-Testdatenbank
npm run test:e2e           # Playwright gegen den Produktionsbuild
npm run perf:rate-limit    # Zusatzaufwand der Ratenbegrenzung, gegen echte Datenbank
npm run verify              # typecheck + lint + content:validate + unit + build
```

### Unit-Tests — 497 bestehen

`tests/unit/` (17 Dateien): `mastery.test.ts`, `spaced-repetition.test.ts`,
`retention-runner.test.ts`, `cron-auth.test.ts`,
`hint-ladder.test.ts`, `placement.test.ts`, `grade.test.ts`,
`content-validation.test.ts`, `rate-limit.test.ts`, `terminal.test.ts`,
`eintraege.test.ts` sowie die Git-Domäne aus Ausbaustufe 2
(`git-branches`, `git-merge-conflict`, `git-schalter`,
`git-working-tree`, `grade-git-kinds`). Reine Domainlogik ohne Datenbank — deckt
Kompetenzberechnung (inkl. Deckelung nach gesehener Lösung, abnehmender
Ertrag, Gerüst-Stufen-Faktoren), Wiederholungsplanung, Hinweisleiter-Sperren,
Einstufungslogik, Bewertung je Aufgabentyp (inkl. Verbot von
Floskel-Rückmeldungen) und die tatsächlich seed-fertigen Inhalte selbst ab
(Zyklenfreiheit, Platzhaltererkennung, Mindestanzahl Reflexionsfragen).

### Integrationstests — 108 bestehen

`tests/integration/`: `auth.test.ts`, `content-publication.test.ts`,
`exercise-service.test.ts`, `lesson-progress.test.ts`,
`onboarding-placement.test.ts`, `path-service.test.ts`, `rate-limit.test.ts`,
`stage2-git.test.ts` — gegen eine echte, separate
PostgreSQL-Testdatenbank (`TEST_DATABASE_URL`, per Docker-Compose auf
Port 5433 wie die Entwicklungsdatenbank, eigene Datenbank `aipfad_test`
innerhalb desselben Containers).

`auth.test.ts` deckt ab: Passwort-Hash wird korrekt verifiziert, eindeutiger
Index auf `email` wird durchgesetzt, `onDelete: Cascade` entfernt abhängige
Sitzungen beim Löschen eines Kontos.

`rate-limit.test.ts` deckt die gemeinsame Ratenbegrenzung ab (E03) — und zwar
das, was sich nur gegen eine echte Datenbank zeigt: dass vierzig gleichzeitige
Versuche auf denselben Schlüssel zusammen genau das Limit ausschöpfen und
nicht mehr; dass ein **zweiter, frisch gestarteter Serverprozess** den Zähler
des ersten sieht, statt bei null zu beginnen; dass zwei solche Prozesse
gleichzeitig die Grenze zusammen nicht überschreiten; dass bei unerreichbarer
Datenbank abgewiesen und nicht durchgelassen wird; dass die Tabelle den
Schlüssel nur als Digest trägt und außer Digest, Zeitpunkten und Ablauf keine
Spalte hat; und dass das Aufräumen gedeckelt ist und abgelaufene Zeilen
wirklich verschwinden.

Ein Test hält das Abnahmekriterium "kein unbegrenztes Tabellenwachstum"
unmittelbar fest: "räumt schon bei wenigen Anfragen auf, auch in einem frisch
gestarteten Prozess". Er legt zehn abgelaufene Zeilen an, führt DREI ganz
normale Entscheidungen aus — weit unter hundert — und erwartet danach genau
vier übrige: aufgeräumt wurde, und zwar gedeckelt. Eine lebende Zeile bleibt
unangetastet. Danach führt ein frisch gestarteter Kindprozess EINE Entscheidung
aus und räumt weitere zwei ab; das ist der Teil, der über Prozessgrenzen hinweg
gilt und nicht von einem Zähler im Arbeitsspeicher abhängt.

Der Test ist deterministisch (die abgelaufenen Zeilen tragen Ablaufzeitpunkte
im Jahr 2000 und sind damit sicher die ältesten der Tabelle) und schlägt unter
der Vorgängerfassung fehl: Dort räumte nur jede hundertste Anfrage auf, drei
Entscheidungen bewirkten nichts, und die Zusicherung war "expected 10 to be 4".

Ein zweiter Test prüft, was der erste ausdrücklich nicht prüft: ob die Abfuhr
auch unter GLEICHZEITIGEN Entscheidungen über der Zufuhr bleibt. Zwanzig
gleichzeitige Entscheidungen auf frischen Schlüsseln legen zwanzig Zeilen an;
mindestens zwanzig abgelaufene müssen verschwinden. Eine frühere Fassung ohne
jede Sperrklausel in der Auswahl scheiterte daran: gegen zwanzig angelegte
Zeilen wurden in drei Läufen nur 32, 10 und 12 entfernt, wo vierzig möglich
gewesen wären. Tragend ist die Sperrklausel selbst — `FOR UPDATE` allein
genügt bereits —, nicht `SKIP LOCKED`; hier stand zuvor das Gegenteil.

Ein dritter Test hält fest, dass die Ratenbegrenzung unter dauerndem,
aggressivem Aufräumen antwortfähig bleibt. Sein Löschlauf ist adversariell:
Er nimmt einen Vergleichszeitpunkt in der Zukunft und trifft damit auch
LEBENDE Zeilen, was die Produktion nicht kann. Geprüft wird deshalb, dass
jede Anfrage entweder eine wohlgeformte Entscheidung liefert ODER mit
`RateLimitUnavailableError` sperrt — nichts hängt, nichts zählt still falsch.

Zur Abdeckung des Neu-Ansatzes (`HOECHSTENS_ANLAEUFE`) gehört eine ehrliche
Einschränkung: Der adversarielle Löschlauf KANN die Wiederholschleife bis zur
Abweisung treiben, tut das aber nicht verlässlich. Gemessen wurden bei fünf
Läufen insgesamt 150 Anfragen mit genau einer Erschöpfung; eine unabhängige
Prüfung sah bei ebenfalls 150 Anfragen keine. Mit `HOECHSTENS_ANLAEUFE = 1`
bestehen die Tests deshalb weiterhin — Sperren ist in diesem Szenario ein
zulässiges Ergebnis. Der Test belegt robuste Antwortfähigkeit unter dem
adversariellen Löschlauf, nicht die Wirksamkeit einer bestimmten Zahl von
Neu-Anläufen.

### Aufbewahrung (E04A)

Die Aufbewahrung ist auf drei Dateien verteilt, entlang dessen, was sich wo
überhaupt zeigen lässt.

`tests/unit/retention-runner.test.ts` prüft die Orchestrierung mit
EINGESCHLEUSTEN Regeln, ohne Datenbank: dass Zählen und Löschen denselben
Grenzwert bekommen und eine Mutation des `Date`-Objekts im Zählweg die
Löschgrenze nicht verändern kann; dass Frist 0 als abgeschaltet gilt und nicht als "alles
löschen" (`skipped-disabled` ist etwas anderes als "gelaufen, nichts
gefunden"); dass eine zweite angemeldete Regel mit eigener Frist läuft, ohne
das Ergebnis der ersten zu berühren; und dass nach einem Regelfehler die
nachfolgenden Regeln weiterlaufen, der Lauf aber `partial-failure` meldet.

Die Regeln sind eingeschleust, weil beides anders kaum zu zeigen wäre: Einen
Teilfehler mit echten Tabellen verlässlich herbeizuführen ist schwer, und
eine zweite produktive Datenart nur für einen Test zu erfinden wäre teurer
als die Eigenschaft, die sie belegen soll.

`tests/integration/retention.test.ts` prüft gegen echte Zeilen, was nur dort
sichtbar wird: Der Trockenlauf zählt eine Zeile und lässt beide stehen; der
Ernstfall entfernt genau die zu alte; ein zweiter Ernstfall meldet
`deletedCount: 0`; zwei gleichzeitige Läufe entfernen zusammen genau die
alten Zeilen und scheitern nicht; und die Grenze liegt bei `createdAt <
cutoff` — derselbe Datensatz liefert im Trockenlauf genau einen Kandidaten und
im anschließenden Ernstfall genau eine Löschung; eine Zeile GENAU auf der
Grenze bleibt stehen (`lt`, nicht `lte`, unverändert aus der
Vorgängerfassung übernommen).

`tests/integration/retention-route.test.ts` prüft die Route: ohne Kopfzeile
401 und nichts gelöscht, falsches Geheimnis 401 und nichts gelöscht,
gültiges Geheimnis im Trockenlauf 200 ohne Löschung, im Ernstfall 200 mit
Löschung, zweiter Aufruf 200 mit `deletedCount: 0`, `Cache-Control:
no-store`, und weder Geheimnis noch Datensatzinhalte in der Antwort. Der
Teilfehlerfall ersetzt dafür die produktive Regelliste und belegt, dass die
Route dann mit 500 antwortet, während die nachfolgende Regel trotzdem läuft.

Ein Umstand, von dem die Isolation dieser Datei abhängt: `vitest.config.ts`
setzt `fileParallelism: false`. Der Test zum aggressiven Aufräumen leert die
Tabelle `rate_limit_buckets` absichtlich vollständig, und mehrere andere
Integrationsdateien schreiben dort hinein (über `submitAttempt`,
`revealNextHint`, `recordLabAttempt`). Ohne die serielle Ausführung — oder ohne
das `finally`, das den Löschlauf abwartet — griffe dieser Test in fremde
Dateien.

Die beiden Prozess-Tests starten `rate-limit-worker.ts` über `tsx` als echten
Kindprozess — zwei `PrismaClient` nebeneinander wären zwar zwei
Verbindungspools, aber ein Prozess mit gemeinsamem Modulzustand, und genau
dieser Modulzustand war das Problem, das E03 beseitigt. Sie brauchen deshalb
spürbar länger als die übrigen Tests.

Zwei Tests dort sind Regressionstests und sehen harmlos aus.

"hält eine eben erst geschriebene Zeile nicht für abgelaufen" würde in der CI
nie anschlagen. Vergliche das Aufräumen `expiresAt` gegen `now()` der
Datenbank, wäre es falsch: In der Spalte steht die UTC-Wanduhrzeit, `now()`
ist `timestamptz`, und beim Vergleich deutet PostgreSQL die Spalte mit der
Zeitzone der Sitzung. Auf einem Rechner in `Europe/Berlin` gilt damit jede
frisch geschriebene Zeile sofort als abgelaufen — um den Zonenversatz, eine
Stunde im Winter, zwei in der Sommerzeit — und würde mitten im Fenster
aufgeräumt. Die CI läuft in UTC, wo der Versatz null ist; dort wäre nichts zu
sehen.

Das liegt NICHT an der Spaltenart: Der Fehler tritt mit `timestamp` genauso
auf wie mit `timestamptz`. Tragend ist allein, dass der Vergleichszeitpunkt
aus der Anwendung kommt (`pruneExpiredBuckets()`).

"überspringt eine gesperrte Zeile, die gleichzeitig aufgefrischt wird" prüft
die HEUTIGE Wettlaufsicherung: Eine zweite, unabhängige Verbindung hält eine
abgelaufene Zeile mit `FOR UPDATE` fest; der Aufräumlauf muss sie wegen
`FOR UPDATE SKIP LOCKED` sofort überspringen und null Zeilen entfernen.
Anschließend wird die gesperrte Zeile auf einen lebenden Ablaufzeitpunkt
fortgeschrieben und muss bestehen bleiben.

Das zusätzliche `expiresAt`-Prädikat am äußeren `DELETE` bleibt als
defensive Redundanz bestehen. Es ist unter der aktuellen SKIP-LOCKED-Auswahl
nicht der Mechanismus dieses Tests: Entfernt man nur dieses Prädikat, bleibt
die Suite grün. Deshalb wird hier ausdrücklich KEINE eigenständige
Testabdeckung oder aktuelle Lasttragfähigkeit dieses zweiten Prädikats
behauptet.

`onboarding-placement.test.ts` deckt den Abschluss des Onboardings ab:
Abbruch vor der Transaktion, Abbruch MITTEN in ihr (die Kurse werden dafür
kurz auf `DRAFT` gesetzt, damit der Fehler erst nach dem Schreiben der
Nutzerzeile auftritt), Abweisung eines zweiten Durchlaufs, Trennung der
Konten und die Rückrechnung Punktzahl → Band. Dazu die Client-Grenze: Was
nach dem Abschluss zurückgegeben wird, ist Wort für Wort gegen die Fragen
geprüft und seine Schlüsselmenge abschließend aufgezählt — mit gemischt
richtigen und falschen Antworten, damit auch ein Feld auffällt, das der
Server nur im Fehlerfall anhängte.

### End-to-End — 37 bestehen, gegen den echten Produktionsbuild

`e2e/kernablauf.spec.ts` (Desktop): Registrierung → Onboarding → Pfad →
Lektion → Aufgabe einreichen → Kompetenz-Rückmeldung sichtbar → Lektion
abschließen → Fortschrittsseite zeigt Aktualisierung. Das ist derselbe Weg,
der während der Entwicklung manuell im Browser mit
`playwright-project`/Chrome verifiziert wurde (inklusive Kontrolle der
tatsächlich in der Datenbank gespeicherten `ConceptMastery`-Zeile).

`e2e/mobil.spec.ts` (Pixel-7-Viewport): Startseite und Navigation bleiben
auf einem schmalen Bildschirm bedienbar.

`e2e/onboarding-placement.spec.ts`: der Einstufungsablauf — überspringen,
vollständig beantworten, zurückgehen ohne Antwortverlust, und die Sperre
gegen ein Absenden mitten im Ablauf (mit Gegenprobe, dass das Absenden am
Ende durchkommt). Dazu: Nach dem Absenden springt der Fokus auf das
Ergebnis statt auf den Seitenanfang — für beide Ausgänge, mit und ohne
Einstufung. Dass dabei wirklich ein Rahmen gezeichnet wird, prüft der
beantwortete Weg, über die Tastatur ausgelöst (nach einem Mausklick bleibt
er richtigerweise aus). Der übersprungene Weg prüft nur Sprungpunkt und
Beschriftung. Die axe-Prüfung des Onboardings geht jetzt bis zum
Ergebnisbildschirm.

`e2e/accessibility.spec.ts`: axe-Prüfung je Seite. `e2e/stage2-git.spec.ts`
und `e2e/regression-codex-pr29.spec.ts` stammen aus Ausbaustufe 2.

Läuft gegen `npm run build && npm run start` auf Port 3101 (nicht gegen den
Entwicklungsserver) — bildet damit Server Components, Caching und die
Content-Security-Policy realistisch ab.

## Was während der Entwicklung zusätzlich manuell verifiziert wurde

Über `playwright-project` (echter Chrome, kein Headless-Mock) wurden diese
Bildschirme tatsächlich gerendert und auf Konsolenfehler geprüft (Desktop
1280px und Mobil 390px): Startseite, Registrierung, Setup-Center,
Nachschlagen (inkl. funktionierender diakritik-toleranter Suche),
Wissenslandkarte (voller 17-Konzepte-Graph), Lernen/Bibliothek,
Onboarding-Formular, Pfad-Übersicht, alle vier Lektionsschritte inklusive
Aufgaben-Einreichung, Labs-Übersicht und das Tokenizer-Lab. In jedem Fall:
0 Konsolenfehler.

## Bekannte Lücken (ehrlich, nicht verschwiegen)

- `path-service` hat keine eigenen Integrationstests — er wird bisher nur
  über Onboarding und E2E mitgeprüft.
- `evaluatePlacement()` wird auf der Unit-Ebene mit Teilmengen geprüft,
  `finalisiereOnboarding()` dagegen nie: Das Schema ließe eine einzelne
  Antwort zu, die Oberfläche erzeugt das nicht, und die dann gespeicherte
  Punktzahl fiele irreführend niedrig aus.
- Die Rahmenprüfung liest `outlineStyle` und `outlineWidth`, nicht
  `outlineColor`. Ein von Hand geschriebenes `outline: 2px solid transparent`
  käme also durch, ohne dass etwas gezeichnet wird. (Tailwinds
  `outline-hidden` ist NICHT dieser Fall: Es setzt außerhalb von
  `forced-colors` `outline-style: none` und wird erkannt.)
- Keine Lastprüfung. Die Sperre gegen zwei gleichzeitige Abschlüsse ist mit
  genau zwei Vorgängen nachgestellt, nicht mit vielen.
- Die Messung von `npm run perf:rate-limit` läuft gegen eine Datenbank auf
  demselben Rechner. Sie beziffert eine Untergrenze, keine Produktionslatenz,
  und sie läuft nicht in der CI — sie ist ein Werkzeug zum Nachrechnen, kein
  Tor.

Drei Einträge standen hier, die es nicht mehr gibt: Der
Accessibility-Scan (`e2e/accessibility.spec.ts`, 8 axe-Prüfungen), das
Leistungsbudget (`perf-budget.json`, `scripts/pruefe-leistungsbudget.mjs`,
`npm run perf`) und der CI-Workflow (`.github/workflows/aipfad-ci.yml`)
sind vorhanden. Sie wurden angelegt, ohne dass diese Liste nachgezogen
wurde — eine Lückenliste, die erfundene Lücken nennt, ist schlimmer als
keine.

## Ausbaustufe 2 (Git & GitHub)

Die Zahlen unten sind ausgeführt, nicht geschätzt.

### Unit

Drei neue Domainmodule sind vollständig ohne Datenbank geprüft:

- `git-working-tree.test.ts` — die drei Orte und ihr Zusammenspiel.
  Kern der Prüfung sind die Stellen, an denen das Verständnis in der Praxis
  scheitert: dass `git add` eine Momentaufnahme macht, dass eine danach
  erneut geänderte Datei in BEIDEN Abschnitten steht, dass `git diff` ohne
  Zusatz nur die nicht vorgemerkten Änderungen zeigt, und dass ein Commit
  ausschließlich Vorgemerktes mitnimmt.
- `git-branches.test.ts` — Branch als Zeiger, Fast-Forward gegen
  Merge-Commit, Anordnung des Commit-Graphen. Ausdrücklich geprüft: Der
  hereingeholte Ast behält nach dem Merge seine eigene Zeile — sonst flacht
  der Graph genau dort ab, wo die Verzweigung erklärt werden soll.
- `git-merge-conflict.test.ts` — Marker lesen, je Stelle entscheiden, und die
  Reihenfolge auflösen → `git add` → `git commit`. Geprüft wird auch, dass
  ein Vormerken mit verbliebenen Markern abgelehnt wird: Git selbst prüft das
  nicht.
- `grade-git-kinds.test.ts` — die drei neuen Interaktionsformen, jeweils
  einschließlich der Zusicherung, dass die öffentliche Fassung keine
  Lösungsdaten enthält.

Die Inhaltsprüfung ist erweitert: Sie meldet destruktive Befehle ohne
Erklärung, widersprüchliche Wirkbereiche, im Lernstoff genannte Befehle ohne
Eintrag in der Referenz, Labs ohne Konzeptbezug und Textwände.

### Integration

`stage2-git.test.ts` prüft gegen die echte Datenbank, dass die neuen Inhalte
durch dieselbe Maschinerie laufen wie die der ersten Ausbaustufe: Bewertung,
Kompetenzfortschreibung, Wiederholungsplanung, Lektionsabschluss und die
Veröffentlichungskette über alle Ebenen.

### End-to-End und Accessibility

`stage2-git.spec.ts` deckt den Weg der lernenden Person ab: Module in der
Bibliothek finden, eine Lektion mit den neuen Aufgabenformen abschließen, die
drei Labs bedienen und den Fortschritt wiederfinden.

Der Axe-Gate ist um die neuen, interaktiven Bestandteile erweitert:
Commit-Graph, Git-Simulator, Konflikteditor, Einsortier- und
Interpretationsaufgabe. Bewusst als EIN Test über alle Seiten: Jede Anmeldung
legt ein Konto an, und die Registrierung ist absichtlich mengenbegrenzt — ein
Testlauf, der diese Grenze selbst reißt, prüft am Ende nur noch sich selbst.

### Visual QA

Gemessen statt betrachtet: Auf zehn Seiten und in drei Breiten (1280, 412 und
320 Pixel) wurde geprüft, dass die Seite nicht waagerecht überläuft und dass
kein Element breiter ist als der Bildschirm, ohne in einem eigenen
scrollbaren Behälter zu stecken. Zusätzlich unter Last: Commit-Graph nach
sieben Befehlen, Konflikteditor mit einer sehr langen eigenen Zeile,
Git-State-Lab nach mehreren Befehlen. Ergebnis: kein Überlauf.
