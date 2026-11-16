# Fremde Bestandteile im Lernpfade-Hub

## Liquid Sculpture Hero

Die Startseiten-Hero beruht auf der Komponente **„Liquid Sculpture Hero“** von
**Guglielmo Giannattasio** (https://guglielmogiannattasio.it), veröffentlicht
auf 21st.dev unter https://21st.dev/@gughigug/components/liquid-sculpture-hero.
Die Komponentenseite weist die Lizenz als `mit` aus (abgerufen am 19.10.2026).
Ein Jahr oder ein ausformulierter Urheberrechtsvermerk steht dort nicht.

Abgeleitete Dateien:

- `src/components/ui/liquid-sculpture-engine.ts` — Shader, Simulation und
  Zeichnen unverändert, Fehlerpfade korrigiert
- `src/components/ui/liquid-sculpture-hero.tsx` — React-Teil, für den Hub
  umgebaut
- `src/styles/liquid-sculpture-hero.css` — aus den `.sh-*`-Styles der
  Komponente umgebaut

Der Urheberhinweis auf die MIT-Komponente bleibt in der Hero sichtbar verlinkt
(„Partikeleffekt: Guglielmo Giannattasio“). Die Artwork-Grafiken sind unabhängig hiervon erstellt.

```text
MIT License

Copyright (c) Guglielmo Giannattasio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Eigene Hero-Grafiken (`public/images/hero/`)

Die zuvor verwendeten WebP-Referenzbilder von 21st.dev wurden vor dem
Railway-Publikumszugang **vollständig aus dem Projektstand entfernt**.
Die Rechte an diesen Fremdbildern waren nicht bestätigt.

Stattdessen enthält der Hub zwei eigenständige, für SBS konstruierte
statische Vektorgrafiken: abstrakte ineinandergreifende Lernpfad-Kurven,
Knoten und Verbindungen auf einem hellen Hintergrund. Es wurden keine
fremden Bilddateien kopiert oder aus der bisherigen Referenzgrafik
nachgezeichnet. Die Vektoren sind rein dekorativ und enthalten weder
Skripte, externe Referenzen noch Schriften.

| Datei | Auflösung / `viewBox` | Zweck |
|---|---|---|
| `lernwege.svg` | 1983 × 793 | Desktop-/Tablet-Hero |
| `lernwege-mobil.svg` | 1024 × 1300 | Mobile-Hero |

Die Originalkomponente (WebGL-/React-/CSS-Anteile) bleibt MIT-lizenziert
und wird weiterhin unter Angabe ihres Autors verwendet. Der frühere
Bildrechte-Blocker gilt für diese beiden nun entfernten Fremdassets
nicht mehr. Die Softwarelizenz ist getrennt davon zu behandeln.
