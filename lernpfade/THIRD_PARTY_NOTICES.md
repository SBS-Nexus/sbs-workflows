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

Der Urheberhinweis ist in der Hero sichtbar verlinkt
(„Skulptur und Partikeleffekt: Guglielmo Giannattasio“).

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

## Skulptur-Bilder (`public/images/hero/`)

Die beiden Bilder sind die hellen Referenzbilder derselben Komponente,
byte-identisch übernommen. Die Prüfsummen stimmen mit den inhaltsadressierten
Pfaden auf dem CDN überein.

| Datei | Quelle | SHA-256 | Format |
|---|---|---|---|
| `skulptur.webp` | `https://cdn.21st.dev/assets/mirror/ae/ae8c3de9003460e59182e950ccd345f68f27f9d0e4808b64c92c962a4eca7120.webp` | `ae8c3de9003460e59182e950ccd345f68f27f9d0e4808b64c92c962a4eca7120` | WebP (VP8, ohne Alpha), 1983 × 793, 192 398 Byte |
| `skulptur-mobil.webp` | `https://cdn.21st.dev/assets/mirror/b0/b0c8d8e5d64b8cec906a3b390e3dc7c9a5af08334bf0632873c601782cb4bc46.webp` | `b0c8d8e5d64b8cec906a3b390e3dc7c9a5af08334bf0632873c601782cb4bc46` | WebP (VP8, ohne Alpha), 1024 × 1300, 173 650 Byte |

Abgerufen am 19.10.2026. Der CDN lieferte `Last-Modified: Tue, 13 Oct 2026`,
`Access-Control-Allow-Origin: *` und `Cache-Control: public, max-age=31536000,
immutable`. Motiv: eine abstrakte Skulptur aus verwobenen metallisch-seidigen
Fäden mit Partikeln, auf flachem hellgrauem Grund (gemessen `#E9EAE5` bzw.
`#EAE9E5`).

**Rechtestand: offen.** 21st.dev nennt für die Komponente MIT. Für die Bilder
gibt es dort keine eigene Angabe. Ob sie unter dieselbe Lizenz fallen, ist
nicht bestätigt, und aus dem sichtbaren Credit wird keine Lizenz abgeleitet.
Die lokale Ablage hat der Projektinhaber am 19.10.2026 freigegeben. **Vor einer
Produktivveröffentlichung muss der Autor die Nutzungsrechte an den Bildern
bestätigen**, sonst werden sie ersetzt.
