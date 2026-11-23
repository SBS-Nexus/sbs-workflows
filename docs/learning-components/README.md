# Lernpfade — Komponentenvertrag für Aktionen, Flächen und Zustände (LP-03C)

Knöpfe, Karten, Fortschrittsbalken, Leer- und Fehlerzustände sehen in
PythonPfad, SQLPfad, AIPfad und im Hub gleich aus, fühlen sich gleich an und
bedeuten dasselbe. Damit ist der in LP-03 vorgesehene Komponentenvertrag
vollständig: Shell und Navigation (LP-03A), Badges und Callouts (LP-03B) und
hier die übrigen fünf Bausteine.

Leitidee: **professionell und zugleich gern benutzt.** Die Bausteine
antworten sichtbar auf jede Handlung — tragende Knöpfe haben eine Unterkante,
die beim Drücken einsinkt, klickbare Karten ebenso, ein abgeschlossener
Fortschrittsbalken bekommt einmal einen Lichtstreif. Was bewusst fehlt:
Wackeln, Hüpfen, Daueranimation, Ranglisten, Großbuchstaben-Beschriftungen.
Rückmeldung ja, Spielhalle nein (`docs/LEARNING-DESIGN-SYSTEM.md` §7).

## Ablage und Synchronisation

Wie bei Shell- und Statusvertrag: kein gemeinsames Paket, kein
Laufzeit-Import aus einer anderen App-Wurzel. Kanonisch ist dieser Ordner;
die Apps führen **bytegleiche Kopien**:

| Kanonisch (`docs/learning-components/`) | Kopie                                    | Apps                     |
| --------------------------------------- | ---------------------------------------- | ------------------------ |
| `learning-components.css`               | `src/styles/learning-components.css`     | Python, SQL, AIPfad, Hub |
| `learning-components.ts`                | `src/lib/learning-components.ts`         | Python, SQL, AIPfad, Hub |
| `learning-components.test.ts`           | `tests/unit/learning-components.test.ts` | Python, SQL, AIPfad      |

Das CSS wird in `src/app/globals.css` jeder App eingebunden; der
Pfad-Akzent kommt aus `data-lp-app` am `<html>`-Element (`python`, `sql`,
`ai`, `hub`). Geändert wird nur hier, danach in alle Apps kopieren. Prüfen:

```bash
node scripts/check-learning-components.mjs
```

Der Check (nur Node-Bordmittel, repariert nichts) scheitert, wenn eine Kopie
fehlt oder abweicht, eine App das CSS nicht einbindet oder `data-lp-app`
nicht setzt, ein Adapter die Vertragsfunktionen nicht benutzt oder wieder
eigene Farben, Ränder, Rundungen oder Kanten trägt, eine Fehler- oder
404-Seite keinen `ErrorState` zeigt oder im Hub alte Knopfklassen bzw. ein
natives `<progress>` auftauchen. Er läuft in
`.github/workflows/lernpfade-ci.yml` als Job „Komponentenvertrag
(Drift-Check)". Den Vertragstest führt die AIPfad-CI aus; da Test und CSS
bytegleich sind, gilt das Ergebnis für jede Kopie.

## Button

| Variante            | Wofür                                                                   | Unterkante |
| ------------------- | ----------------------------------------------------------------------- | ---------- |
| `primary`           | genau eine Haupthandlung je Entscheidungsbereich                        | ja         |
| `secondary`         | sichere Alternative                                                     | ja         |
| `ghost`             | Navigation oder niedrige Priorität                                      | nein       |
| `danger`            | die destruktive Handlung selbst (im Bestätigungsdialog)                 | ja         |
| `danger-secondary`  | Einstieg in eine destruktive Handlung, z. B. „Löschen" je Listeneintrag | ja         |
| `on-dark`           | Haupthandlung auf einer dunklen Kopffläche                              | ja         |
| `on-dark-secondary` | Alternative auf einer dunklen Kopffläche                                | nein       |

Ältere Namen bleiben gültig und werden an der Adaptergrenze aufgelöst:
`onDark` → `on-dark`, `onDarkGhost` → `on-dark-secondary`, `ghost-danger` →
`danger-secondary`.

Größen: `sm` (mind. 36 px, nur für dichte Zusammenhänge), `md` (44 px,
Vorgabe, Zielgröße der Shell), `lg` (52 px).

- **Gedrückt** ist an der Geometrie erkennbar: Die 4-px-Unterkante (bei `sm`
  3 px) sinkt um 2 px ein. Das gilt auch unter „Bewegung reduzieren" — dann
  ohne Übergang.
- **Gesperrt** ist flach: eigene graue Fläche, keine Kante, kein Einsinken —
  statt bloßer Transparenz.
- **Fokus**: 3-px-Ring mit 2 px Abstand in der Fokusfarbe der Shell; auf
  dunklen Kopfflächen weiß.
- **Schrift**: Produktschrift (`--font-sans`), Satzschreibung, keine
  Großbuchstaben — auch in AIPfad, dessen Monospace den Fachinhalten bleibt.

## Card

Eine Karte ist **entweder** Information (`Card`, `static`) **oder** als
Ganzes ein Ziel (`CardLink`, `interactive`) — nie beides, und eine
klickbare Karte enthält keine weiteren Bedienelemente. Die klickbare Karte
trägt dieselbe taktile Unterkante wie ein Knopf.

Betonung (`emphasis`): `accent` hebt den nächsten Schritt hervor, `danger`
einen Bereich mit destruktivem Inhalt (etwa Konto löschen). Die Bedeutung
steht immer zusätzlich im Text.

**Bereichsfarbe.** Fläche und Rand nehmen eine Bereichsfarbe ganz leicht an
(4 % / 16 %). Sie kommt über die einzige Eingabe des Vertrags,
`--lp-ui-area`, die ein Vorfahr setzen darf — in PythonPfad und SQLPfad
setzt `themeStyle()` sie auf die Modulfarbe. Ohne Angabe gilt der
Pfad-Akzent.

## ProgressBar

- Wert, Grenzen und sprechbarer Wert kommen aus `progressValue()`:
  `aria-valuetext` lautet „3 von 10", bei einer Skala bis 100 „62 %".
- Abgerundet: 99,6 % sind nicht fertig und heißen nicht „100 %".
- Ungültige Daten (`NaN`, negativ, unendlich, `max` ≤ 0) ergeben einen
  **leeren** Balken, nie einen vollen. Ein Datenfehler darf nicht wie ein
  Erfolg aussehen.
- Füllung `accent` (Bereichsfarbe bzw. Pfad-Akzent), `success`, `warning`,
  `neutral`; ältere Namen `caution`, `signal`, `module` bleiben gültig.
- Die sichtbare Zahl steht an der Aufrufstelle — Farbe allein trägt keine
  Bedeutung. Der Abschluss bekommt einmal einen Lichtstreif, unter
  „Bewegung reduzieren" keinen.

## EmptyState

Ein leerer Bereich sagt eines von drei Dingen, und die Gestaltung
unterscheidet sie:

| Art        | Aussage                                   | Darstellung                       |
| ---------- | ----------------------------------------- | --------------------------------- |
| `start`    | hier ist noch nichts — erster Schritt     | gestrichelt, Akzent, Glühbirne    |
| `done`     | gerade nichts zu tun, weil alles erledigt | ruhig, Erfolgston, Haken          |
| `filtered` | die Auswahl trifft nichts                 | zurückgenommen, ohne Fläche, Lupe |

Größe `regular` (eigener Bereich, zentriert, mit Symbol oder Zeichnung) oder
`compact` (Hinweis in einem Panel, eine Zeile, linksbündig). Ein Leerzustand
ist keine Live-Region.

## ErrorState

Seitenweiter Zustand für `error.tsx` und `not-found.tsx` aller Apps — keine
Feldfehler, keine Hinweise im Fluss (dafür der Callout aus LP-03B).

| Art           | Standardtitel               | Ton                              |
| ------------- | --------------------------- | -------------------------------- |
| `unexpected`  | Da ist etwas schiefgegangen | Fehler                           |
| `not-found`   | Diese Seite gibt es nicht   | Hinweis — kein Fehler der Person |
| `unavailable` | Gerade nicht erreichbar     | Warnung                          |

Ein fachlicher Titel hat Vorrang. Eine Kennung für die Fehlersuche (Next.js
`digest`) erscheint nur, wenn sie wie eine Kennung aussieht
(`errorReference()`: Buchstaben, Ziffern, `-`, `_`, höchstens 64 Zeichen) —
eine versehentlich dort gelandete Fehlermeldung nie. SQLPfad und der Hub
hatten vorher keine eigene Fehler- und 404-Seite und zeigten die englische
Vorgabe von Next.js.

## Darstellung (`--lp-ui-*`)

Das CSS hat zwei Ebenen, und das ist Absicht:

1. **Ungeschichtet** steht das Aussehen — Farben, Ränder, Rundung, Schrift,
   Unterkante, Fokus, Bewegung. Nur so setzt es sich gegen die
   ungeschichteten Grundregeln der Apps durch (PythonPfad/SQLPfad:
   `* { border-color }` und `:focus-visible { border-radius: 4px }`; Hub:
   `a { color: inherit }`).
2. **In `@layer components`** steht die Anordnung — Anzeigeart, Ausrichtung,
   Innenabstand, Mindesthöhe, Schriftgröße. Tailwind-Klassen einer
   Aufrufstelle (`w-full`, `justify-start`, Abstände) bleiben dadurch
   wirksam.

Jede Regel hängt an einer `.lp-ui…`-Klasse; es gibt keine Regel für bloße
Elemente, keinen `:root`-Wert und keinen Außenabstand der Bausteine selbst.

| Pfad (`data-lp-app`) | Akzent hell (Fläche / Kante / Text darauf) | Akzent dunkel                     |
| -------------------- | ------------------------------------------ | --------------------------------- |
| `python`             | `#1d3fc4` / `#1d337d` / `#ffffff`          | `#93b4fd` / `#5a7fe6` / `#0b1220` |
| `sql`                | `#095d56` / `#062f2c` / `#ffffff`          | `#6ed3c7` / `#2f9c8f` / `#04201d` |
| `ai`                 | `#b45309` / `#6b3105` / `#ffffff`          | `#efb26a` / `#b97b34` / `#1d1a15` |
| `hub`                | `#3155d5` / `#1f3690` / `#ffffff`          | (der Hub ist nur hell)            |

In den Fach-Apps entsprechen die Akzente ihren bisherigen Primärfarben
(hell wie dunkel), damit sich keine Marke verschiebt. Im Hub ersetzt das
Indigo seiner Pfad-Akzente das bisherige Navy der Knöpfe — Navy bleibt der
Plattformleiste vorbehalten. Gefahr, Erfolg und Warnung entsprechen dem
Statusvertrag (LP-03B) und sind in allen Apps gleich.

**Kontraste werden nachgerechnet, nicht behauptet.** Der Vertragstest liest
die CSS-Kopie der App und prüft für jeden Pfad in hell und dunkel: jeder Text
auf seiner Fläche ≥ 4,5 : 1 (auch im Hover), Füllungen gegen die Spur und
der Fokusring gegen die Fläche ≥ 3 : 1, Unterkanten dunkler als ihre Fläche
und die Blöcke für ausdrückliches und System-Dunkel identisch.

Dunkel gilt bei `data-theme="dark"` (bzw. `.dark`) oder bei System-Dunkel,
solange nicht `data-theme="light"` gewählt ist. „Bewegung reduzieren" folgt
System und Konto (`data-reduce-motion`); die Dauern sind Tokens und werden
dort auf 0,01 ms gesetzt. Im Windows-Kontrastmodus (`forced-colors`) erhalten
Spur, Füllung und Knopfränder Systemfarben.

## Adapter

- **Fach-Apps:** `src/components/ui/primitives.tsx` — `Button`, `ButtonLink`,
  `Card`, `CardLink`, `ProgressBar`, `EmptyState`, `ErrorState` behalten bzw.
  bekommen eine kleine, stabile API (`variant`, `size`, `emphasis`, `tone`,
  `kind`) und beziehen Klassen und Zustandsattribute aus dem Vertrag.
  App-eigen bleiben nur Symbole und Zeichnungen.
- **Hub:** `lernpfade/src/components/ui/primitives.tsx` mit denselben Namen
  (Ziele als gewöhnliche Links, Symbole aus `lucide-react`).

Nicht Teil dieses Vertrags: Fachwerkzeuge (Editor, SQL-Runner,
Git-Visualisierer, Labs), die Review-Bewertungsknöpfe, Formularfelder,
Dialoge und Toasts.
