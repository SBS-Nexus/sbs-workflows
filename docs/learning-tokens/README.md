# Lernpfade — Token-Vertrag des Learning OS (Roadmap E3)

Eine Datei, aus der der Hub und alle drei Fach-Apps ihre Grundfarben beziehen:
die Grundskala von Papier bis Tinte, die Signalfarben Minze und Limette, die
Dachleiste und die Modul- und Bereichsfarben. Vorher stand jeder dieser Werte
in vier `globals.css` und drei Verträgen noch einmal, und die gemeinsamen
Komponenten trugen ein eigenes Kaltgrau – im dunklen Schema ein Blaugrau
neben der Tinte der Apps.

## Ablage und Synchronisation

Wie bei Shell-, Status- und Komponentenvertrag: kein Paket, kein
Laufzeit-Import aus einer anderen App-Wurzel, sondern **bytegleiche Kopien**.

| Kanonisch (`docs/learning-tokens/`) | Kopie                            | Apps                     |
| ----------------------------------- | -------------------------------- | ------------------------ |
| `learning-tokens.css`               | `src/styles/learning-tokens.css` | Python, SQL, AIPfad, Hub |

Jede App bindet die Kopie in `src/app/globals.css` ein. Geändert wird nur
hier, danach in alle vier Apps kopieren. Prüfen:

```bash
node scripts/check-learning-tokens.mjs
```

Der Check (nur Node-Bordmittel, repariert nichts) scheitert, wenn

- eine Kopie fehlt oder abweicht oder eine App sie nicht einbindet,
- eine App (oder `learning-os.css` im Hub) einen Namen aus der Token-Datei
  selbst neu belegt – es gibt genau eine Quelle,
- die Grundskala `--color-ink-*` einer Fach-App oder die Modulfarben von
  PythonPfad und SQLPfad eigene Hexwerte tragen statt `var(--los-…)`,
- die neutralen Töne von Shell, Komponenten oder Statusvertrag nicht auf die
  Tokens verweisen,
- eine Schriftdatei fehlt oder abweicht, ein Layout sie nicht lädt oder eine
  App einen eigenen Schriftstapel trägt.

Er läuft in `.github/workflows/lernpfade-ci.yml` als eigener Job. Die
Dachleistenfarben hält zusätzlich `check-learning-shell.mjs` mit ihren
Werten fest.

## Was drinsteht

- `--los-ton-50 … --los-ton-950` – Grundskala, Papier `#f2f2e9` bis Tinte
  `#0b0e0e`, Graugrün dazwischen.
- Rollen mit den Namen des Hubs: `--los-paper`, `--los-surface`, `--los-text`,
  `--los-text-muted`, `--los-moss`, `--los-ink`, `--los-ink-2`,
  `--los-charcoal`, `--los-cream`, `--los-line…`, `--los-focus-paper`.
- Signalfarben `--los-lime`, `--los-mint` – nur auf Tinte, nie als Fläche
  unter Fließtext.
- Dachleiste `--lp-platform-*`.
- Modul- und Bereichsfarben `--los-modul-0 … -3`, `--los-projekt`,
  `--los-wiederholen`, je mit `-weich`, `-dunkel` und `-dunkel-weich`
  (Tabelle und Regeln: `docs/LEARNING-DESIGN-SYSTEM.md`, Ebene B).
- Schriftstapel `--los-sans`, `--los-mono` (IBM Plex) und `--los-serif`
  (System, nur für die Akzentzeile).

## Schriftdateien

`schriften/` enthält IBM Plex Sans (variabel, 100–700) und IBM Plex Mono
(400, 600) als woff2, Copyright IBM Corp., SIL Open Font License 1.1 – der
Vermerk und der Lizenzverweis stehen in den Metadaten jeder Datei, der
Lizenztext selbst noch nicht (offener Punkt, siehe
`lernpfade/THIRD_PARTY_NOTICES.md`). Kopien:

| Kanonisch (`docs/learning-tokens/schriften/`) | Kopie                  | Apps                     |
| --------------------------------------------- | ---------------------- | ------------------------ |
| `plex-sans.woff2`, `plex-mono-400.woff2`, `plex-mono-600.woff2` | `src/app/schriften/` | Python, SQL, AIPfad, Hub |

Jede App lädt sie in `src/app/layout.tsx` mit `next/font/local`
(`variable: '--font-plex-sans'` bzw. `'--font-plex-mono'`) und setzt beide
Variablen als Klassen auf `<html>`; `--los-sans` und `--los-mono` greifen
darauf zu. Der Check prüft Dateien, Laden und dass niemand einen eigenen
Stapel daneben notiert.

## Was bewusst nicht drinsteht

- **Kein Farbschema-Wechsel.** Welche Stufe hell und welche dunkel gilt,
  entscheiden die Verbraucher; der Hub ist nur hell, die Apps schalten über
  `data-theme` und die Systemeinstellung.
- **Keine Regeln**, keine Klassen, kein Cascade-Layer – nur Variablen am
  Wurzelelement.
- **Keine Fach- oder Statusfarben.** Petrol, Blau und Bernstein bleiben bei den
  Apps, Erfolg/Warnung/Gefahr beim Statusvertrag.
- **Kontraste** werden dort geprüft, wo die Paarungen entstehen:
  `tests/unit/farbkontrast.test.ts` (PythonPfad, SQLPfad) und
  `tests/unit/learning-components.test.ts` (alle Fach-Apps). Beide lösen die
  `var(--los-…)`-Verweise über die Kopie dieser Datei auf.
