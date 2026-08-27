# Testing

Teststrategie und aktueller, tatsächlich verifizierter Stand (nicht
Zielbild — was hier steht, wurde beim Schreiben ausgeführt und ist grün).

## Ebenen

```bash
npm run test:unit          # Domainlogik, keine I/O — Millisekunden
npm run test:integration   # Server-Dienste gegen echte PostgreSQL-Testdatenbank
npm run test:e2e           # Playwright gegen den Produktionsbuild
npm run verify              # typecheck + lint + unit + build
```

### Unit-Tests — 64 bestehen

`tests/unit/`: `mastery.test.ts`, `spaced-repetition.test.ts`,
`hint-ladder.test.ts`, `placement.test.ts`, `grade.test.ts`,
`content-validation.test.ts`. Reine Domainlogik ohne Datenbank — deckt
Kompetenzberechnung (inkl. Deckelung nach gesehener Lösung, abnehmender
Ertrag, Gerüst-Stufen-Faktoren), Wiederholungsplanung, Hinweisleiter-Sperren,
Einstufungslogik, Bewertung je Aufgabentyp (inkl. Verbot von
Floskel-Rückmeldungen) und die tatsächlich seed-fertigen Inhalte selbst ab
(Zyklenfreiheit, Platzhaltererkennung, Mindestanzahl Reflexionsfragen).

### Integrationstests — 3 bestehen

`tests/integration/auth.test.ts`, gegen eine echte, separate
PostgreSQL-Testdatenbank (`TEST_DATABASE_URL`, per Docker-Compose auf
Port 5433 wie die Entwicklungsdatenbank, eigene Datenbank `aipfad_test`
innerhalb desselben Containers). Deckt: Passwort-Hash wird korrekt
verifiziert, eindeutiger Index auf `email` wird durchgesetzt,
`onDelete: Cascade` entfernt abhängige Sitzungen beim Löschen eines Kontos.

**Noch nicht abgedeckt:** Server-Actions-Integrationstests für
`exercise-service`/`lesson-service`/`path-service` gegen die Testdatenbank
— bisher nur indirekt über den E2E-Test verifiziert. Naheliegender nächster
Schritt.

### End-to-End — 2 bestehen, gegen den echten Produktionsbuild

`e2e/kernablauf.spec.ts` (Desktop): Registrierung → Onboarding → Pfad →
Lektion → Aufgabe einreichen → Kompetenz-Rückmeldung sichtbar → Lektion
abschließen → Fortschrittsseite zeigt Aktualisierung. Das ist derselbe Weg,
der während der Entwicklung manuell im Browser mit
`playwright-project`/Chrome verifiziert wurde (inklusive Kontrolle der
tatsächlich in der Datenbank gespeicherten `ConceptMastery`-Zeile).

`e2e/mobil.spec.ts` (Pixel-7-Viewport): Startseite und Navigation bleiben
auf einem schmalen Bildschirm bedienbar.

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

- Kein automatisierter Accessibility-Scan (axe o. ä.) — bisher nur manuelle
  Prüfung (semantisches HTML, sichtbarer Fokus, Formular-Labels, keine
  Farbe als einziges Signal). Naheliegender nächster Schritt.
- Kein Performance-Budget-Check-Skript (`perf-budget.json` +
  Prüfskript aus PythonPfad) — diese Ausbaustufe hat kein
  Pyodide-artiges Gewicht, das ein solches Budget dringend nötig macht,
  aber es fehlt trotzdem für den Fall wachsender Bundle-Größe.
- CI-Workflow-Datei für `aipfad/` selbst ist noch nicht angelegt (siehe
  `docs/DEPLOYMENT.md`, "Nächste Schritte").
