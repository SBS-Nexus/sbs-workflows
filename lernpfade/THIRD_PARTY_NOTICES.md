# Fremde Bestandteile im Lernpfade-Hub

## Aktueller Stand (LO-UI-001, 17.11.2026)

Der Hub enthält derzeit **keinen** übernommenen oder abgeleiteten Fremdcode
und keine fremden Bilder, Fonts, Shader oder Illustrationen. Laufzeit-
Abhängigkeiten stehen in `package.json` (Next.js, React, lucide-react) und
bringen ihre eigenen Lizenzen mit.

Das Learning-OS-Design (Startseite, `/design-preview`, Lernansichten) ist
eigenständig geschrieben: Wissensorbit als eigene SVG-Geometrie, CSS ohne
kopierte Komponenten, nur lokale Systemschriften. 21st.dev und HorizonX
dienten ausschließlich als Referenz; es wurden weder Code noch bezahlte
Assets, Templates, Shader oder Markenmerkmale übernommen (Quellenstudie und
Lizenzgrenze: `docs/LEARNING-OS-DESIGN-20261116.md`, Abschnitt 2).

## IBM Plex (seit Roadmap E3, 19.11.2026)

Der Hub liefert wie PythonPfad, SQLPfad und AIPfad die Schriften **IBM Plex
Sans** (variabel, 100–700) und **IBM Plex Mono** (400, 600) selbst aus:
`src/app/schriften/*.woff2`, bytegleich mit
`docs/learning-tokens/schriften/`.

- Copyright 2017, 2019 IBM Corp. (so in den Metadaten der Dateien).
- Lizenz: SIL Open Font License, Version 1.1 (in den Metadaten verwiesen als
  http://scripts.sil.org/OFL). IBM nennt in der Lizenz „Plex" als Reserved
  Font Name.
- Herkunft: dieselben Dateien wie in den drei Fach-Apps, dort seit LP-02
  ausgeliefert. Ob es vollständige Dateien oder Teilmengen der IBM-Ausgabe
  sind, ist hier nicht festgehalten; das gehört bei der nächsten Lizenzprüfung
  geklärt, ebenso eine beigelegte Textfassung der Lizenz (die Dateien tragen
  Vermerk und Lizenzverweis, aber nicht den Lizenztext).

Damit ist der Satz oben zu den Fonts für den aktuellen Stand überholt: Der Hub
enthält seit E3 diese eine fremde Schriftfamilie, sonst weiterhin keine
fremden Bilder, Shader oder Illustrationen.

## Historie: Liquid Sculpture Hero (bis LO-UI-001 enthalten)

Bis zur Learning-OS-Integration beruhte die Startseiten-Hero auf der
Komponente **„Liquid Sculpture Hero“** von **Guglielmo Giannattasio**
(https://guglielmogiannattasio.it), veröffentlicht auf 21st.dev unter
https://21st.dev/@gughigug/components/liquid-sculpture-hero. Die
Komponentenseite weist die Lizenz als `mit` aus (abgerufen am 19.10.2026).
Ein Jahr oder ein ausformulierter Urheberrechtsvermerk steht dort nicht.

Mit LO-UI-001 wurden alle abgeleiteten Dateien aus dem Hub entfernt:
`src/components/ui/liquid-sculpture-engine.ts`,
`src/components/ui/liquid-sculpture-hero.tsx`,
`src/components/ui/liquid-sculpture-model.ts` (samt Test),
`src/styles/liquid-sculpture-hero.css` und `src/components/home/lernpfade-hero.tsx`.
Ältere Stände, die die Komponente noch enthalten (etwa die auf
`8113173054865e6443128a90a741028734f0c4ab` gepinnte Railway-Staging-Version),
tragen diesen Hinweis und den sichtbaren Urheberlink weiterhin selbst. Für
diese Stände gilt:

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

### Frühere eigene Hero-Grafiken

Die beiden eigenen SVG-Grafiken `public/images/hero/lernwege.svg` und
`lernwege-mobil.svg` gehörten zur Liquid Sculpture Hero und wurden mit ihr
entfernt. Sie waren eigenständig für SBS erstellt (keine Fremdbilder).
