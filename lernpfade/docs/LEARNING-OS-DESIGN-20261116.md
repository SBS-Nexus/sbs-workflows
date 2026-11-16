# Lernpfade – Learning OS / Design- und Umsetzungsbrief

**Stand:** 16.11.2026 · **Status:** Designstudie / Draft-PR · **Keine Freigabe für produktive Homepage**.

## 1. Ziel

Eine eigenständige Premium-EdTech-Marke, die eher nach einem kuratierten
Digitalprodukt als nach einem SaaS-Baukasten aussieht. Die Hauptseite
zeigt nicht einfach vier farbige Kacheln, sondern vermittelt eine starke
These über Lernen und führt in reale Lernhandlungen.

Erste Umsetzung: \`/design-preview\` auf einem separaten Review-Branch.
Die bestehende \`/\`-Seite, Vokabel-Persistenz, Federation, App-Shell,
\`main\`, PR #41/#73/#74/#75 und Railway-Staging sind nicht Teil dieses Diffs.

## 2. Quellenstudie (nur Referenz, kein fremder Code)

- [21st.dev](https://21st.dev/) – visuelle Kuratierung, Hover-Vorschau,
  hochwertige Bewegungskomponenten und prägnante typografische Hierarchie.
- [21st.dev / Components](https://21st.dev/community/components) –
  zum Recherchezeitpunkt u.a. „Scroll media expansion hero“ (11.1K),
  „Container Scroll Animation“ (10.6K), „Spline Scene“ (9.7K),
  „Liquid Glass Button“ (7K). Zahlen sind dynamische Websiteanzeigen,
  **keine** Lizenz oder Produktfreigabe.
- [HorizonX / Kurage Dashboard](https://horizonx.so/explore/kurage-dashboard) –
  eigenes grafisches Motiv als Interface-Identität, kontrollierte
  Bewegung, direkt bedienbare Oberfläche, reduzierter Bewegungsmodus.
- [HorizonX / Hadal](https://horizonx.so/explore/hadal) –
  ein räumlicher Hero und zusammenhängende Scroll-Erzählung statt
  gleichförmiger, austauschbarer Feature-Karten.
- [HorizonX / Crest Water Hero](https://horizonx.so/explore/crest-water-hero) –
  konsequent generierte Bildwelt und klare räumliche Komposition.

**Lizenzgrenze:** HorizonX verkauft Premium-Assets mit kommerzieller
Lizenz gegen Mitgliedschaft. Hier wurden weder diese Assets, noch
Templates, bezahlter Code, Bilder, Shader oder Markenmerkmale kopiert.
Die implementierten SVG-Elemente und CSS-Muster wurden für diese
Lernpfade-Studie eigenständig geschrieben. Vorhandene
Hub-Drittanbieterhinweise bleiben unverändert.

## 3. Visuelle Idee

**Arbeitstitel: „Learning OS – Wissen. Verstehen. Können.“**

- **Charakter:** editoriales, dunkles Labor statt grelles Gamification-Produkt;
  motivierend über Klarheit, Interaktion und Progression, nicht über erfundene
  XP-Werte oder leere Statistik.
- **Visuelles Leitmotiv:** Wissensorbit / Lerninstrument aus selbst erstellten
  elliptischen Linien, Punkt- und Verbindungsgeometrie; als React-SVG,
  keine externe Textur oder WebGL-Pflicht.
- **Typografie:** große Grotesk-Headlines, gezielte Serif-Kursivakzente;
  starke Zeichenabstände und bewusst breite Negativräume;
  ausschließlich lokale Systemfonts, keine Google Fonts.
- **Farben:** \`#0b0e0e\` Ink, \`#151b19\` Chalk/Charcoal,
  \`#f2f2e9\` Paper, \`#d0fa83\` Signal Lime,
  \`#b4f5d2\` Mint. Lime ist ein funktionaler Akzent, kein flächiges Badge-System.
- **Komposition:** stark asymmetrischer Hero, große redaktionelle
  Typografie, Wissensreihen mit Typographic Hover, einzelne
  kontrastierende Lernfläche, ausgesparte generische Kachelraster.
- **Motion:** sehr langsames Instrumenten-Drehen, Micro-Hover nur bei
  Navigation und Aktionen, \`prefers-reduced-motion\` stoppt alles.

## 4. Informationsarchitektur

1. **Hero:** klarer Satz, primäre Aktion zu echten Lernpfaden,
   abstrahierte Orbit-Visualisierung im rechten Panel.
2. **Manifest:** Warum Verstehen → Anwenden → Verankern. Keine unbewiesenen KPIs.
3. **Lernpfade:** vier redaktionelle Zeilen (Python, SQL, Git/GitHub, AI),
   echte Links aus dem vorhandenen App-Katalog; fehlende Deploy-URLs werden
   als nicht verbunden gekennzeichnet und nicht als tote Links ausgegeben.
4. **Lernmoment:** lokaler Mini-Quiz zu SQL-JOIN, mit echter Auswahl,
   zugänglicher Rückmeldung und Wiederholen. **Demonstration**, keine
   Speicherung, keine Veränderung an Lernfortschritten.
5. **Vokabeln:** fokussierter Weg zum produktiven lokalen VokabelPfad;
   Hinweis: IndexedDB nur im Browser, keine Cloud-Synchronisation.
6. **Footer:** eindeutige Navigation zu vorhandenen Lernbereichen.

## 5. UX- und Sicherheitsregeln

- Direkt im SSR sichtbare Titel, Navigation und Links.
- Exakt eine H1. Semantische Sections und beschriftete Links/Buttons.
- Focus-Visible, Tastaturinteraktion, \`aria-live\` für Quiz-Feedback.
- Responsive: 375, 640, 920, 1280, 1440 px und 200 % Zoom.
- Keine Angaben zu persönlichen Lernfortschritten, Leistungen oder
  Auslastung ohne echte Datenquelle.
- Keine Third-Party-Requests oder externen Fonts im neuen Design.
- \`robots: noindex, nofollow\` auf dem Preview-Pfad.
- Keine produktive Domain und kein Railway-Codewechsel ohne visuelle
  Abnahme. Kein Merge in Parent oder \`main\`.

## 6. Prüf- und Abnahmegates

- CI: Typecheck, Unit, vollständiger Hub-E2E/Accessibility-Lauf,
  Produktionsbuild, npm-Audit, Drift-Verträge.
- Zusätzliche Playwright-Tests für Preview: Desktop/Mobil-Screenshots,
  horizontale Überschriften-Überläufe, Hauptnavigation, Quiz,
  No-JS SSR und Reduced Motion.
- Visuelle Prüfung: Hero-Verhältnis, CTAs above-the-fold bei 375px,
  gute lesbare Textbreiten, explizite keine generischen Featurekarten.
- Nach Abnahme: separate Migration des neuen visuellen Systems auf \`/\`
  und später die bestehenden \`/vokabeln\`, \`/wiederholen\`,
  \`/fortschritt\`-Flächen – jeweils mit eigener Regression.

## 7. Nicht im Scope

Keine Datenbankmigration, keine neuen Fremdlizenzen, kein Kauf bei HorizonX,
keine künstliche Gamification, keine Änderung an vorhandener Vokabel-Logik,
keine Änderung von Auth/Cookies/CORS oder Produktions-DNS.
