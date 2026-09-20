# Testing

Teststrategie und aktueller, tatsächlich verifizierter Stand (nicht
Zielbild — was hier steht, wurde beim Schreiben ausgeführt und ist grün).

## Ebenen

```bash
npm run test:unit          # Domainlogik, keine I/O — Millisekunden
npm run test:integration   # Server-Dienste gegen echte PostgreSQL-Testdatenbank
npm run test:e2e           # Playwright gegen den Produktionsbuild
npm run verify              # typecheck + lint + content:validate + unit + build
```

### Unit-Tests — 456 bestehen

`tests/unit/` (14 Dateien): `mastery.test.ts`, `spaced-repetition.test.ts`,
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

### Integrationstests — 73 bestehen

`tests/integration/`: `auth.test.ts`, `content-publication.test.ts`,
`exercise-service.test.ts`, `lesson-progress.test.ts`,
`onboarding-placement.test.ts`, `stage2-git.test.ts` — gegen eine echte, separate
PostgreSQL-Testdatenbank (`TEST_DATABASE_URL`, per Docker-Compose auf
Port 5433 wie die Entwicklungsdatenbank, eigene Datenbank `aipfad_test`
innerhalb desselben Containers).

`auth.test.ts` deckt ab: Passwort-Hash wird korrekt verifiziert, eindeutiger
Index auf `email` wird durchgesetzt, `onDelete: Cascade` entfernt abhängige
Sitzungen beim Löschen eines Kontos.

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
Einstufung. Die axe-Prüfung des Onboardings geht jetzt bis zum
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
- Keine Lastprüfung. Die Sperre gegen zwei gleichzeitige Abschlüsse ist mit
  genau zwei Vorgängen nachgestellt, nicht mit vielen.

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
