# Startseiten-Hero: Liquid Sculpture

Stand: 19.10.2026 · Branch `claude/lernpfade-liquid-hero` · Basis
`claude/lernpfade-unified-hub` @ `72fbe7d`

Die Startseite zeigt eine metallische Skulptur. Unter dem Zeiger zerfließt sie
lokal zu Partikeln und wird danach wieder zum ruhigen, scharfen Bild. Grundlage
ist „Liquid Sculpture Hero“ von Guglielmo Giannattasio (21st.dev, MIT). Lizenz,
Bildherkunft und der offene Rechtestand der Bilder stehen in
`../THIRD_PARTY_NOTICES.md`.

## Dateien

| Datei | Rolle |
|---|---|
| `src/app/page.tsx` | Server Component; nur der bisherige Hero-Abschnitt ist ersetzt |
| `src/components/home/lernpfade-hero.tsx` | Server Component mit Produkttexten und Konfiguration |
| `src/components/ui/liquid-sculpture-hero.tsx` | Client Component (`'use client'`), vollständig im Server-HTML vorgerendert |
| `src/components/ui/liquid-sculpture-engine.ts` | WebGL2-Engine, erst nach der Hydration per `import()` geladen (eigener Chunk) |
| `src/components/ui/liquid-sculpture-model.ts` | reine Logik: Farben, Bildauswahl, Geometrie (Unit-Tests daneben) |
| `src/styles/liquid-sculpture-hero.css` | `.sh-*`-Styles, über `src/app/globals.css` eingebunden |
| `public/images/hero/` | zwei lokale Bilder (Desktop 1983 × 793, Mobil 1024 × 1300) |
| `e2e/liquid-hero.spec.ts`, `e2e/liquid-hero-mobil.spec.ts` | Browserfälle; laufen im normalen `npm run test:e2e` |

`@/components/ui/liquid-sculpture-hero` zeigt über den bestehenden Alias
`@/* → ./src/*` auf `src/components/ui/`. Einen `components/ui`-Ordner im
Repository-Root gibt es nicht. Der Ordner `ui` ist die übliche Ablage für
wiederverwendbare Oberflächenbausteine. shadcn legt dort Komponenten ab
(`aliases.ui`), und gleichbleibende Importpfade erleichtern den Austausch.
React selbst verlangt den Ordner nicht.

## Integrationsentscheidungen

- **Keine zweite Navigation, eine H1:** `showNav={false}`. Kopfzeile,
  Skip-Link, `main#hauptinhalt` und alle Abschnitte darunter bleiben
  unverändert.
- **Hell, Hub-Tokens:** `themeToggle={false}`, Fläche `var(--bg)`, Text
  `var(--text)`, gedämpfter Text `var(--muted)`, Akzent `var(--indigo)`, Schrift
  `var(--font-sans)`.
- **Keine Google Fonts:** `loadFonts={false}`. Die Komponente lädt
  standardmäßig keine Fonts mehr.
- **Ruhiger Ausgangspunkt:** `restStyle="image"`, `ambient={false}`,
  `intro={false}`.
- **Partikeldichte als Startwert:** `particleDensity={0.45}` ist ein Startwert,
  kein gemessenes Optimum (siehe Leistung).
- **Texte:** Eyebrow „Eine Plattform. Mehrere Fähigkeiten.“, H1 „Technologie
  lernen. / Zusammenhänge verstehen.“, Akzent auf der zweiten Zeile. CTAs:
  „Lernpfad wählen“ → `#pfade`, „So funktioniert das Lernen“ → `#lernmodell`.
  Hinweis: „Bewege den Zeiger über die Form“, auf Touch-Geräten „Berühre die
  Form“.
- **Bilder:** gleiche Herkunft, also keine CORS-Abhängigkeit. Das statische
  `<img>` setzt kein `crossOrigin`; nur das Bild der Engine bekommt es, und auch
  nur bei fremder Herkunft. So bleibt das statische Bild sichtbar, selbst wenn
  ein fremder Host den Pixelzugriff verweigert.
- **Farben für WebGL:** Die Engine liest die Fläche aus den berechneten Styles
  (`--sh-bg`, also auch `var(--bg)` oder `oklch(…)`) und wandelt sie über ein
  1×1-Canvas in sRGB um. CSS-Ausdrücke werden nie als Hex-Werte gelesen. Für
  die Textfarbe gilt ohne lesbares Literal das Design (hell/dunkel).
- **Statisches Bild ohne Kante:** Die Bilder haben einen flachen Grund
  (`#E9EAE5`). Ein SVG-Filter rechnet wie der Bild-Shader (`Bild × Fläche ÷
  Bildgrund`). Dadurch verschmilzt das statische Bild schon ohne JavaScript mit
  der Hub-Fläche, und beim Überblenden zur GPU-Darstellung springt die Farbe
  nicht.
- **Hinweis:** nur sichtbar, wenn die Skulptur wirklich reagiert (Engine
  aktiv). Er pulsiert dreimal und ruht dann, gemäß Design-Vertrag §7 „keine
  dauerhafte dekorative Bewegung“.
- **Urheberhinweis:** bleibt sichtbar als „Skulptur und Partikeleffekt:
  Guglielmo Giannattasio“. Kontrast und Zielgröße sind ausreichend; der Link
  öffnet nicht in einem neuen Tab.
- **Icons:** `ArrowRight`, `Sun` und `Moon` aus `lucide-react` (exakt `1.50.0`)
  statt handgeschriebener SVGs.

## Behobene Fehler A–E

| | Befund im Original | Lösung | Test |
|---|---|---|---|
| A | Fehler nach `setImage` setzte nur `data-gl="off"`; ein laufendes `data-swap` versteckte auch das statische Bild | ein zentraler Fehlerpfad `fail()`: Token entwerten, Bildwechsel beenden, Engine und Kontext freigeben, Canvas entfernen; späte Frame-Callbacks prüfen Token und Engine-Zustand. Zusätzlich gewinnt per CSS `[data-gl='off'] .sh-fallback` gegen `[data-swap]` | Upload- und Kontextverlust mitten im Bildwechsel, Kontextverlust im Betrieb, fehlendes WebGL2/Float-Ziel/Shader, Pixelabfrage |
| B | `darkSrc`/`mobileSrc`/`mobileDarkSrc` hatten Demo-Vorgaben: eigenes `src` + Mobil zeigte die fremde Skulptur | `resolveSources`: Demo-Varianten nur ohne eigenes `src`; `selectSculptureSource`: ausdrückliche Variante → Design → Layout → Basis; nur die jüngste Anforderung zählt | Unit-Tests aller Kombinationen; E2E schnelle Quellenwechsel |
| C | Reduced Motion halbierte nur Kräfte, Zeiger wirkte weiter | Reduced Motion = keine Engine, kein Canvas, kein rAF, keine Zeiger-Listener; Wechsel zur Laufzeit baut die Engine ab bzw. auf (Engine ignoriert Zeiger zusätzlich selbst) | E2E reduzierte Bewegung vor dem Start und nach Wechseln (rAF-Zählung) |
| D | feste Höhe 100svh, `overflow:hidden`, Größen-Containment, Bild per JavaScript positioniert | `min-height` statt Höhe, kein Abschneiden, `aspect-ratio` reserviert die Bildfläche im Server-HTML, `<picture>` wählt die Mobilvariante ohne JavaScript | E2E 375/640/700/1024/1440 px, 200 % Zoom, 1280 × 480, ohne JavaScript; bestehende Starttests |
| E | teilweise gescheiterte Initialisierung ließ Shader/Programme/Kontext liegen; `visibilitychange` weckte auch eine Hero außerhalb des Viewports | Aufräumen in `compile()`/Konstruktor/`destroy()`; Sichtbarkeit = im Viewport UND Tab sichtbar | E2E Ressourcen-Zählung (Shader, Programme, Kontexte), Aufbau→Abbau→Aufbau, Sichtbarkeit |

## Änderungen an der Engine gegenüber der Referenz

Referenz: `reference/liquid-sculpture-hero.tsx` aus dem Integrationspaket
(SHA-256 `adc8824dbd50f96ad20ba9691de4b7bcba7c14354a3a273f1f4494730443b473`),
Zeilen 14–1012. Shader, Simulation, Zeichnen und alle Parameter sind
unverändert, die Formatierung ebenfalls. Der Diff besteht aus 12 Stellen:

1. Kopfkommentar; `clamp` und `Rect` kommen aus `liquid-sculpture-model.ts`.
   `hexToRgb` entfällt (Farben löst die Komponente auf).
2. `compile()` gibt Shader und Programm frei, wenn Kompilieren oder Linken
   scheitert, auch bei verlorenem Kontext.
3. Der Konstruktor ruft bei Fehlern in `initGL()` `destroy()` auf (Kontext
   freigeben) und wirft dann weiter.
4. `buildParticles()` merkt sich Float-Ziele vor der Vollständigkeitsprüfung.
5. Der „erster Frame“-Callback läuft über ein verfolgtes rAF; Kontextverlust
   und `destroy()` brechen es ab.
6. `pointer()` ignoriert Eingaben bei `reducedMotion`.
7. `onActivity` meldet Start und Ende der Bildschleife (`data-motion`).
8. `destroy()` verträgt eine nur teilweise gebaute Engine.

## Nachweisarten

| Art | Wo | Was |
|---|---|---|
| Unit-Tests | `npm test` | Farbparser (auch `var()`/`oklch()` → `null`), Bildauswahl aller Varianten, Geometrie, Farbmatrix, Herkunft |
| Simulation/Mock im Browser | `e2e/liquid-hero.spec.ts` | Init-Skript nimmt WebGL2/Float-Ziele, lässt Shader, Pixelabfrage oder Upload scheitern, verliert den Kontext; `page.route` verweigert die Bilddatei |
| echter WebGL-Lauf, Software-Renderer | Playwright-Chromium 151 | `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device …))`: Interaktion, Ruhe, Wechsel, Sichtbarkeit, axe |
| echter WebGL-Lauf, Hardware-GPU | installiertes Google Chrome (Headless, frisches Profil) und eingebauter Browser der Claude-App, Produktionsbuild | `ANGLE (Apple, ANGLE Metal Renderer: Apple M1)` — Werte unten; manueller Lauf, nicht Teil der CI |
| React Strict Mode | `next dev` (Strict Mode ist im App Router Standard) | manueller Lauf, siehe unten |

## Leistung (gemessen)

- **SwiftShader** (Playwright-Chromium, MacBook mit Apple M1, 1280 × 800):
  - Mit ruhender Skulptur läuft keine Bildschleife.
  - Bei Interaktion schafft die Engine 1,3 fps, im Low-Power-Pfad mit 4 Kernen
    3,3 fps; ohne Partikelpass wären es 58 fps.
  - Pro Frame laufen genau 3 Vollbild- bzw. Simulationspässe und 1
    instanzierter Partikelpass. `readPixels` ruft die Seite nicht auf. Die
    Konsolenmeldung „GPU stall due to ReadPixels“ kommt von Chromiums
    Bildübergabe beim Software-Renderer.
  - Rückweg in die Ruhe: 152 Frames bzw. 69 s.
  - Die Suite wartet diesen Rückweg nur in einem Test ab, mit begründetem
    Budget.
- **Hardware-GPU:** siehe Abschnitt „Hardware-GPU-Lauf“.

## Hardware-GPU-Lauf

Gemessen am 20.10.2026 auf dem Produktionsbuild (`next start`) mit dem
installierten Google Chrome (Headless, frisches temporäres Profil) auf einem
MacBook mit Apple M1. Renderer: `ANGLE (Apple, ANGLE Metal Renderer: Apple
M1)`.

| | Desktop 1440 × 900, DPR 2 | Telefon 375 × 812, DPR 3, Touch |
|---|---|---|
| Bild | `skulptur.webp` | `skulptur-mobil.webp` |
| Engine aktiv nach dem Laden | 1,56 s (erster Abruf) | 0,23 s (aus dem Cache) |
| rAF-Aufrufe in Ruhe | 0 pro Sekunde | 0 pro Sekunde |
| Bildrate bei Interaktion | 59 fps | 61 fps |
| zurück in Ruhe nach Ende der Interaktion | 7,7 s | 7,3 s |
| rAF-Aufrufe in der Sekunde danach | 0 | 0 |

Auf der GPU erscheint keine „GPU stall“-Meldung; die Konsole meldet nur das
schon vorher fehlende `/favicon.ico` (404). Der eingebaute Browser der
Claude-App zeigte denselben Metal-Renderer und die Hero mit aktiver Engine. Für
Zeitmessungen taugt er nicht, wenn sein Bereich ausgeblendet ist: Dann drosselt
Chromium `requestAnimationFrame`.

## React Strict Mode (`next dev`)

Manueller Lauf am 20.10.2026 (`next dev`, Playwright-Chromium, SwiftShader).
Gezählt wurde jeder Durchlauf des Engine-Effekts (nur er fragt die
Telefon-Abfrage ab) sowie WebGL-Kontexte:

- **Start:** 2 Effekt-Durchläufe (Aufbau → Abbau → Aufbau), 1 Kontext, 0
  freigegeben, 1 Canvas, Engine aktiv. Der erste Aufbau endet, bevor die
  nachgeladene Engine einen Kontext anlegt.
- **Nach 3 echten Reduced-Motion-Zyklen:** 5 Durchläufe, 4 Kontexte, 3
  freigegeben, also genau ein lebender.
- **Wechsel auf 375 px:** Mobilbild aktiv, weiterhin ein lebender Kontext.
- Keine Konsolenfehler, keine Warnungen, kein Next-Fehler-Overlay.
- **Gegenprobe im Produktionsbuild:** 1 Effekt-Durchlauf beim Start.

`next dev` legt dabei in einer Agent-Sitzung `lernpfade/AGENTS.md` und
`CLAUDE.md` an. Die wurden wieder entfernt, weil sie nicht zu dieser Änderung
gehören.

## Screenshots (`docs/screenshots/`)

| Datei | Nachweisart | Ansicht |
|---|---|---|
| `liquid-hero-gpu-desktop-ruhe.png` | Hardware-GPU (Apple M1, Chrome) | 1440 × 900, Ruhe |
| `liquid-hero-gpu-desktop-interaktion.png` | Hardware-GPU (Apple M1, Chrome) | 1440 × 900, unter dem Zeiger |
| `liquid-hero-gpu-mobil-interaktion.png` | Hardware-GPU (Apple M1, Chrome) | 375 × 812, nach dem Tippen |
| `liquid-hero-mobil-375.png` | Software-Renderer (SwiftShader, E2E) | 375 × 812 Touch, Ruhe |
| `liquid-hero-statisch-1280.png` | statisch, keine Engine (E2E) | 1280 × 800, ohne JavaScript bzw. reduzierte Bewegung |

Die Aufnahmen ohne JavaScript und bei reduzierter Bewegung waren im letzten
E2E-Lauf byte-identisch: Die statische Ansicht aus dem Server-HTML samt
Farbfilter sieht genauso aus wie die mit JavaScript gerenderte.

Die E2E-Suite legt bei jedem Lauf weitere Aufnahmen unter
`test-results/screenshots/liquid-hero-*.png` ab.

## Tailwind und shadcn

Der Hub hat weder Tailwind noch shadcn. Die Hero ist eine eigenständige
React-/CSS-Komponente und braucht beides nicht. **Das ist keine vollständig
eingerichtete shadcn-Anwendung.** Eine shadcn-Basis wäre ein gesondert zu
prüfender Schritt. Hier wurde nichts davon ausgeführt:

```bash
cd lernpfade
npx shadcn@latest info --json
npm install --save-dev --save-exact tailwindcss @tailwindcss/postcss postcss
npx shadcn@latest init
```

Dafür gelten diese Regeln:
- keine `--force`- oder `--overwrite`-Option;
- CLI-Änderungen einzeln prüfen;
- `components.json` mit `tailwind.css: "src/app/globals.css"` und den Aliasen
  `@/components`, `@/components/ui`, `@/lib`, `@/hooks`;
- `utils` erst eintragen, wenn `src/lib/utils.ts` existiert.

Tailwinds Preflight verändert globale Elementstile. Deshalb kein ungeprüftes
`@import "tailwindcss"` in `globals.css`. Gegebenenfalls nur Theme und
Utilities ohne Preflight einbinden, die übrigen Hub-Seiten auf Regression
prüfen und das bestehende `postcss.config.mjs` erhalten.

## Bekannte Grenzen

- **Bildrechte:** nicht bestätigt (siehe `THIRD_PARTY_NOTICES.md`). Vor
  Produktion klären.
- **Software-Renderer:** Gibt es nur SwiftShader und kein GPU, ruckelt die
  Interaktion mit 1–3 fps. Text und Aktionen bleiben bedienbar. Ein möglicher
  Folgeschritt: Software-Renderer erkennen und statisch bleiben.
- **Partikeldichte:** `0,45` ist ein Startwert. Auf echter Hardware ist er noch
  nicht über verschiedene Geräte gemessen.
- **Strict Mode:** Der echte Doppellauf existiert nur in `next dev` und ist
  dort manuell geprüft (siehe oben). Die E2E-Suite läuft gegen den
  Produktionsbuild und prüft Aufbau → Abbau → Aufbau über echte
  Reduced-Motion-Zyklen.
- **Hardware-GPU:** nur manuell auf einem Apple M1 gemessen. Die CI hat keine
  GPU.
