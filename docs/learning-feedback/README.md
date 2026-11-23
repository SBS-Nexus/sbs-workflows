# Lernpfade — Statusvertrag für Badges und Callouts (LP-03B)

Hinweise, erfolgreiche Aktionen, Warnungen, Fehler und Lernzustände sehen in
PythonPfad, SQLPfad, AIPfad und im Hub gleich aus und bedeuten dasselbe.
„Fällig", „begonnen" und „gesperrt" bleiben eigene Zustände; gleiche
Gestaltung setzt keine unterschiedlichen Lernnachweise gleich.

LP-03B ist ein Teil von LP-03. Buttons, Cards, ProgressBar, EmptyState und
ErrorState sind weitere, noch offene Teile des Komponentenvertrags.

## Ablage und Synchronisation

Wie beim Shell-Vertrag (`docs/learning-shell/`): kein gemeinsames Paket, kein
Laufzeit-Import aus einer anderen App-Wurzel. Kanonisch ist dieser Ordner;
die Apps führen **bytegleiche Kopien**:

| Kanonisch (`docs/learning-feedback/`) | Kopie                                  | Apps                     |
| ------------------------------------- | -------------------------------------- | ------------------------ |
| `learning-feedback.css`               | `src/styles/learning-feedback.css`     | Python, SQL, AIPfad, Hub |
| `learning-feedback.ts`                | `src/lib/learning-feedback.ts`         | Python, SQL, AIPfad, Hub |
| `learning-feedback.test.ts`           | `tests/unit/learning-feedback.test.ts` | Python, SQL, AIPfad      |

Das CSS wird in `src/app/globals.css` jeder App eingebunden. Geändert wird nur
hier, danach in alle Apps kopieren. Prüfen:

```bash
node scripts/check-learning-feedback.mjs
```

Der Check (nur Node-Bordmittel, repariert nichts) scheitert, wenn eine Kopie
fehlt oder abweicht, eine App das CSS nicht einbindet, ein Adapter den Vertrag
nicht benutzt (`feedbackBadge(tone)`, `feedbackCallout(tone)`,
`feedbackLive(live)`; im Hub der Feedback-Baustein und die Zustandszuordnung)
oder Badge/Callout wieder eigene Statusfarben tragen. Er läuft in
`.github/workflows/lernpfade-ci.yml` als Job „Statusvertrag (Drift-Check)",
auch wenn nur eine App-Kopie oder `primitives.tsx` geändert wurde. Ob die
gerenderten Farben stimmen, prüfen die Browser-Tests (`status-feedback.spec.ts`
je Fach-App, `fortschritt-rueckmeldung.spec.ts` im Hub) gegen dieselben Werte.

## Zustände

| ID            | Bedeutung                                     | Standardtitel (Callout) | Grenze                                                        |
| ------------- | --------------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| `neutral`     | normale Information, keine Wertung            | — (Titel nötig)         | fehlende Daten nie als Erfolg                                 |
| `info`        | erklärender Hinweis                           | Hinweis                 |                                                               |
| `success`     | tatsächlich erfolgreich abgeschlossene Aktion | Erfolg                  | nicht für bloße Erreichbarkeit („verfügbar")                  |
| `warning`     | Aufmerksamkeit erforderlich                   | Achtung                 | Alias `caution`                                               |
| `danger`      | Fehler oder destruktiver Kontext              | Fehler                  | Alias `alert`; fachliche Titel haben Vorrang                  |
| `due`         | Wiederholung ist fällig                       | — (nur Badge)           | kein Fehlerzustand                                            |
| `in-progress` | begonnen, nicht abgeschlossen                 | — (nur Badge)           | Text vom Aufrufer („Begonnen", „in Arbeit", „Im Aufbau")      |
| `locked`      | fachlich noch nicht verfügbar                 | — (nur Badge)           | gestrichelter Rand als zweites Signal; Sperre bleibt bestehen |

Die IDs sind technische Werte; sichtbare Begriffe bleiben deutsch und kommen
vom Aufrufer. Farbe ist nie das einzige Signal: Badges tragen Text, Callouts
Titel und ein dekoratives Symbol (`aria-hidden`).

Nicht Teil dieses Vertrags: Herkunft (`LIVE`, `DEMO`, `EIGENES DECK`,
`LOKAL · nur in diesem Browser`), Hub-Verfügbarkeit („Verfügbar", „In
Ausbau", „Geplant"), Feldfehler, Toasts und Dialoge.

## Darstellung (`--lp-feedback-*`)

Werte nur auf `.lp-feedback`-Elementen — nie auf `:root`, ohne Regeln für
bloße Elemente und ohne Umdefinition vorhandener App-Tokens. Das CSS steht
bewusst nicht in einem Cascade-Layer (wie das Shell-CSS) und setzt weder
`display` für responsiv geschaltete Elemente noch Außenabstände.

| Zustand       | Hell: Fläche / Rand / Text    | Dunkel: Fläche / Rand / Text  |
| ------------- | ----------------------------- | ----------------------------- |
| `neutral`     | `#f3f4f6` `#6b7280` `#374151` | `#1f2530` `#8b95a5` `#d4d9e1` |
| `info`        | `#e8f1fb` `#2563a6` `#1c4f86` | `#11263d` `#6aaee8` `#b3d6f6` |
| `success`     | `#e7f5ec` `#1d7a46` `#155c35` | `#0f2b1c` `#4cc38a` `#9be3bd` |
| `warning`     | `#fdf4dd` `#a16207` `#734805` | `#30240b` `#e2a83c` `#f5d38f` |
| `danger`      | `#fdeeed` `#c0281c` `#981c12` | `#371614` `#f2867c` `#f9b9b3` |
| `due`         | `#f2eefc` `#6d45c6` `#55349f` | `#231a3c` `#a98ae8` `#d2c2f6` |
| `in-progress` | `#e5f4f8` `#0e7490` `#0b5c72` | `#0c2a33` `#4fc1dd` `#a6dfee` |
| `locked`      | `#f4f4f5` `#71717a` `#3f3f46` | `#23252a` `#8d929b` `#c9cdd4` |

Fließtext im Callout: `#111827` hell, `#f3f4f6` dunkel. Gerechnet und im
Browser gemessen: Titel/Badge-Text auf Fläche ≥ 6,6 : 1, Fließtext ≥ 13,6 : 1,
Randsignal gegen Fläche und die Seitenflächen der Apps ≥ 3,9 : 1.

Statusfarbe ist nicht der Pfad-Akzent: Ein `info`-Badge sieht in PythonPfad,
SQLPfad und AIPfad gleich aus. Titel und Badge-Text stehen in der
Produktschrift (`--font-sans`, auch in AIPfad statt Monospace); Code, SQL und
Befehle im Callout-Text behalten ihre Fachtypografie.

Dunkel gilt bei `data-theme="dark"` (bzw. `.dark`) oder bei System-Dunkel,
solange nicht `data-theme="light"` gewählt ist — dieselbe Regel wie in den
Apps. Der Hub hat nur ein helles Schema und setzt deshalb
`data-theme="light"`; einen Theme-Schalter gibt es dort nicht.

## Adapter

- **Fach-Apps:** `Badge` und `Callout` in `src/components/ui/primitives.tsx`
  behalten ihre öffentliche API (`tone`, `title`, `live`, `className`; alte
  Tonnamen gültig). Sie beziehen Klassen, Zustandsattribut
  (`data-lp-tone`), Standardtitel und Live-Regel aus dem Vertrag; app-eigen
  bleibt nur das Symbol. Keine neue Client-Grenze, kein Context-Provider.
- **Hub:** `src/components/feedback/` — `source-feedback.ts` ordnet die
  Quellzustände von `/fortschritt` zu (getestet), `callout.tsx` rendert sie.
  Ladeeffekte, Timer, Ereignisse, Parser und Statistik bleiben unverändert.

| Quellzustand auf `/fortschritt`      | Zustand   | Titel                           |
| ------------------------------------ | --------- | ------------------------------- |
| lädt                                 | `neutral` | Wird geladen (höflich angesagt) |
| nicht verbunden                      | `neutral` | Nicht verbunden                 |
| nicht angemeldet                     | `info`    | Nicht angemeldet                |
| nicht erreichbar / ungültige Antwort | `warning` | Nicht erreichbar                |
| gültig, ohne Aktivität               | `neutral` | Noch nichts erfasst             |
| Vokabeldaten unlesbar                | `danger`  | Vokabeldaten nicht lesbar       |
| Vokabeldaten aus neuerer Version     | `warning` | Neuere Version                  |
| lokaler Speicher nicht zugänglich    | `warning` | Speicher nicht zugänglich       |
| keine eigenen Vokabeln               | `neutral` | Noch keine Vokabeln             |

Gültige Daten zeigen weiterhin nur die Kennzahlen — eine echte 0 bleibt eine
echte 0; Fehler und fehlende Anmeldung zeigen keine Zahlen.

## Live-Meldungen

Statische Callouts sind keine Live-Region. `live` setzt `role="status"` mit
`aria-live="polite"`; auch `danger` wird nicht zu `role="alert"`. Ein Hinweis
nimmt nie den Fokus. Keine verschachtelten Live-Regionen. Im Hub liegt die
Statusregion der Ladeanzeige auf dem Text, nicht auf dem ganzen Callout:
Angesagt wird wie seit LP-07 genau „Fortschritt aus … wird geladen …".
