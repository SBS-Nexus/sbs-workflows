# Lernpfade-Shell — Tokens und Navigationsvertrag (LP-03A)

Die Shell ist das, was in PythonPfad, SQLPfad und AIPfad gleich aussieht und
sich gleich bedienen lässt: Plattform-Dachleiste, App-Kopf, Hauptnavigation
(oben und als untere Leiste) und ihre Menüs. Lernseiten, Cards, Editoren,
Labs und Diagramme gehören nicht dazu.

## Ablage und Synchronisation

Die drei Apps bleiben unabhängig baubar — kein gemeinsames Paket, kein
Laufzeit-Import aus einer anderen App-Wurzel. Kanonisch ist dieser Ordner;
jede App führt **bytegleiche Kopien**:

| Kanonisch (`docs/learning-shell/`) | Kopie je App                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `learning-shell.css`               | `src/styles/learning-shell.css` (eingebunden in `src/app/globals.css`)                         |
| `learning-shell.ts`                | `src/lib/learning-shell.ts`                                                                    |
| `learning-shell.test.ts`           | `tests/unit/learning-shell.test.ts`                                                            |
| `learning-platform-bar.tsx`        | Python/SQL `src/components/navigation/…`, AIPfad `src/components/app/…`                        |
| `shell-menu.tsx`                   | Python/SQL `src/components/navigation/…`, AIPfad `src/components/app/…`                        |

Geändert wird nur hier; danach in alle drei Apps kopieren. Prüfen:

```bash
node scripts/check-learning-shell.mjs
```

Der Check (nur Node-Bordmittel, repariert nichts) scheitert, wenn eine Kopie
fehlt oder abweicht, eine App das Shell-CSS nicht einbindet, eine der sechs
Dachleistenfarben abweicht oder eine Navigation den Vertrag nicht benutzt
(`shellNav('<app>')`, `data-lp-app="<app>"`). Er läuft in
`.github/workflows/lernpfade-ci.yml` als eigener Job, auch wenn nur eine
App-Kopie geändert wurde.

App-eigen bleiben: Symbole, fachliche Farben (z. B. PythonPfads
Bereichsfarben am Symbol), Theme-Schalter, Suche/Befehlspalette,
Code-Labor, Organisationen, Redaktion, AIPfads Zusatzziele.

## Tokens (`--lp-shell-*`)

Definiert auf `.lp-shell` (Dachleiste, Kopf, untere Leiste) — nie auf `:root`
und ohne Umdefinition vorhandener App-Tokens.

| Gruppe          | Tokens                                                                              | Hell / Dunkel                                     |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| Fläche          | `surface`, `surface-hover`                                                          | `#ffffff`, `#eef1f6` / `#151a24`, `#232a37`       |
| Text            | `text`, `text-muted`                                                                | `#111827`, `#4b5563` / `#f3f4f6`, `#c4cad5`       |
| Rand            | `border`                                                                            | `#dfe3eb` / `#2e3646`                             |
| Fokus           | `focus`, `focus-width` 3px, `focus-offset` 2px; Dachleiste `platform-focus` #93c5fd | `#1d4ed8` / `#93c5fd`                             |
| Pfad-Akzent     | `accent`, `accent-soft`, `on-accent`                                                | Python blau, SQL petrol, AIPfad bernstein         |
| Form            | `radius` 0.75rem, `radius-small` 0.5rem, `space-1…3`, `target` 2.75rem (44 px)      |                                                   |
| Menü            | `menu-shadow`                                                                       |                                                   |
| Bewegung        | `duration-fast` 120ms, `duration-base` 200ms, `ease`                                | 0,01 ms bei „Bewegung reduzieren“                 |
| Schrift         | `font` = `--font-sans` der App                                                       | Monospace bleibt Fachinhalten vorbehalten         |

Pfad-Akzente (hell / dunkel): Python `#1d4ed8` auf `#dbeafe` / `#93c5fd` auf
`#1e2f52`; SQL `#0f766e` auf `#ccfbf1` / `#5eead4` auf `#12403c`; AIPfad
`#92400e` auf `#fef3c7` / `#fcd34d` auf `#42300c`. Alle Text-/Flächenpaare
≥ 4,5 : 1, Fokus ≥ 3 : 1 (gemessen; die E2E-Tests prüfen es am gerenderten
Element).

Dunkel gilt bei `data-theme="dark"` oder bei System-Dunkel, solange nicht
`data-theme="light"` gewählt ist — dieselbe Regel wie in den Apps.
„Bewegung reduzieren“ folgt System (`prefers-reduced-motion`) und
Kontoeinstellung (`data-reduce-motion`).

Das Shell-CSS steht bewusst **nicht** in einem Cascade-Layer: PythonPfad und
SQLPfad setzen `:focus-visible` ungeschichtet, und nur eine ungeschichtete
Regel schlägt sie. Jede Regel hängt an einer `.lp-shell…`-Klasse; es gibt
keine Regel für bloße Elemente — AIPfads geschichtete Link-Farben (behobener
Kontrastfehler) bleiben unberührt. Sichtbarkeit nach Breakpoint regeln
weiter die Tailwind-Klassen der Apps; das Shell-CSS setzt kein `display` auf
responsiv ein- oder ausgeblendete Elemente.

## Navigationsvertrag

Stabile semantische IDs, getrennt von Beschriftung, Route und Symbol. Eine
Liste je App speist Kopf und untere Leiste; die Reihenfolge ist verbindlich,
nicht vorhandene Bereiche fehlen.

| Bereich (`id`)        | PythonPfad          | SQLPfad             | AIPfad                         |
| --------------------- | ------------------- | ------------------- | ------------------------------ |
| Überblick `overview`  | `/fortschritt`      | `/fortschritt`      | `/pfad`                        |
| Lernen `learn`        | `/lernen`           | `/lernen`           | `/lernen` (+ `/lektion/...`)   |
| Praxis `practice`     | Üben `/ueben`       | Üben `/ueben`       | Labs `/labs`                   |
| Projekte `projects`   | `/projekte`         | `/projekte`         | —                              |
| Wiederholen `review`  | `/wiederholen`      | `/wiederholen`      | `/wiederholen`                 |
| Fortschritt `progress`| — (ist Überblick)   | — (ist Überblick)   | `/fortschritt`                 |
| Profil `profile`      | `/profil`           | `/profil`           | —                              |

Aktiv ist höchstens ein Eintrag je Navigation: Treffer nur an
Segmentgrenzen (`/lernen-extra` gehört nicht zu `/lernen`), bei mehreren der
längste passende Präfix; Detailrouten außerhalb des Präfixes werden
ausdrücklich zugeordnet (AIPfad `/lektion/...` → Lernen).

## Anordnung und Menüs

- **< 640 px:** Hauptnavigation als untere Leiste (alle Vertragsziele, Badge
  als Zahl mit Screenreader-Text). Sitzung und Zusatzziele im Menü oben
  rechts (Python: Name, SQL: „Konto“, AIPfad: „Mehr“).
- **640–1279 px:** Hauptnavigation in eigener Zeile unter der Marke, bricht
  um statt versteckt seitlich zu scrollen.
- **ab 1280 px:** Hauptnavigation in der Kopfzeile. (Bei 1024 px passte
  PythonPfad nachweislich nicht in eine Zeile.)
- Menüs sind ein Disclosure (Knopf mit `aria-expanded` + Liste), bewusst
  ohne `role="menu"`: Tab durch die Einträge, Escape schließt und gibt den
  Fokus zurück, Klick oder Fokus außerhalb schließt.
  - Navigation schließt dauerhaft: Auch Browser-Zurück/Vorwärts auf die
    Seite, auf der es offen war, öffnet es nicht wieder.
  - Ein Breakpoint-Wechsel (Tailwind `sm` 640, `md` 768, `xl` 1280 px)
    schließt, ebenso eine Größenänderung, die den Knopf ausblendet. Lag der
    Fokus im Menü, kehrt er zum sichtbaren Knopf zurück, sonst wird er
    abgegeben — nie auf einem verborgenen Eintrag oder unsichtbaren Knopf.
  - Innerhalb eines Breakpoints bleibt es offen und wird bei jeder
    Größenänderung neu ausgerichtet (der Knopf wandert durch Umbruch), so
    dass die Liste im Bild bleibt.
- Bedienziele mindestens 44 px hoch. Ausnahme: die vorhandenen
  Theme-Schalter von Python/SQL (40 × 40 px, App-Komponente außerhalb der
  Shell; WCAG 2.5.8 mit 24 px erfüllt).

## Plattform-Dachleiste

Mit `NEXT_PUBLIC_LEARNING_HUB_URL` (nur gelesen, abschließende Schrägstriche
werden entfernt; Zugangsdaten, Abfrage oder Fragment machen die Angabe
ungültig) steht dort eine benannte Navigation „Lernpfade-Plattform“ mit
„Alle Pfade“, „Alle Wiederholungen“ und „Gesamtfortschritt“ — eigens
benannt, damit sie von den App-Zielen „Wiederholen“/„Fortschritt“
unterscheidbar bleibt. Ohne Angabe gibt es keine Verweise und keine
erfundene Adresse.
