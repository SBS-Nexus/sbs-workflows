# Lernpfade – Learning OS / Design- und Umsetzungsbrief

**Stand:** 16.11.2026 (Studie) · 17.11.2026 (Integration LO-UI-001, Abschnitt 8) · **Status:** Draft-PR · **Keine Produktionsfreigabe, kein Deployment**.

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

## 8. Integration in die echten Routen (LO-UI-001, 17.11.2026)

Umsetzung von Issue #78 auf Branch
`codex/lernpfade-learning-os-integration-20261116`, Basis PR #77
(`ee8cea36a8d28899c69231d6defa7a752d4b18cf`). Kein Merge, kein Deployment.

### Was übernommen wurde

| Route | Umsetzung |
|---|---|
| `/` | Dieselben Abschnitte wie die Studie (`src/components/learning-os/home-sections.tsx`): Hero mit Wissensorbit, Laufband, Idee, Pfadzeilen, Lernmoment, VokabelPfad, Fuß. Gemeinsame Kopfzeile statt Studienkopf. |
| `/design-preview` | Bleibt als `noindex`-Review-Referenz, rendert aber dieselben Bausteine — keine zweite, abweichende Variante. Nur Kopfzeile (mit „Learning OS Navigation") und Rücksprungziel gehören zur Studie. |
| `/vokabeln` | Dunkler Kopf mit Speicherhinweis und Bereichslinks; **Lernmodus (Daily Review) direkt darunter** als Fokusfläche mit fälliger Anzahl; danach Stand, Decks & Export, Starterdecks, Import. Session als dunkle Bühne wie der Lernmoment der Startseite. Decks, Starterdecks und Karten als Zeilen statt Kacheln. |
| `/wiederholen` | Kopf mit Legende der drei Bahnen **LIVE / LOKAL / DEMO**; jede Bahn eigener Abschnitt mit eigener Kennung, in fester Reihenfolge, ohne Vermischung. Quellen-, Anmelde- und Ausfallzustände unverändert. |
| `/fortschritt` | Kopf mit den drei Regeln (nur gelesen, je Pfad für sich, kein Gesamtprozent); Pfade als ruhige Zeilen (Name links, Kennzahlen rechts) statt Kartenraster. Föderation, Same-Site-/CORS-Grenzen und Zählweise unverändert. |
| 404/Fehler | Gemeinsame Kopfzeile und Papierfläche; `ErrorState` aus dem Vertrag. |

### Entscheidungen

- **Verträge bleiben Vertrag.** `learning-components.css` und
  `learning-feedback.css` werden nicht umgefärbt (Drift-Checks, und
  `komponenten.spec` misst den Hub-Akzent Indigo). Deshalb stehen alle
  Vertragsbausteine auf hellen Papierflächen; dunkel sind nur Kopfzeile,
  Seitenköpfe, Session-Bühne und die Editorial-Flächen der Startseite.
- **Laufweite nach der Linux-Sichtprüfung gelockert.** Die Werte der Studie
  waren zu eng:
  - Die Wortmarke las sich bei `-.065em`/`-.08em` auf macOS *und* Linux als
    „lempfade.".
  - In den Ersatzschriften Arial/Times (Linux, Windows) berührten sich
    Buchstaben der Display-Überschriften.

  Die Untergrenzen stammen aus einer Schriftprobe in beiden Schriftfamilien:

  | Element | vorher | jetzt |
  |---|---|---|
  | Wortmarke | `-.065em`/`-.08em` | `-.03em` |
  | Hero-H1 | `-.088em` | `-.055em` |
  | Abschnitts-H2, Pfad-H3, Fußzeile | `-.078`/`-.08`/`-.075em` | `-.055em` |
  | Kopf-H1 | `-.062em` | `-.045em` |
  | Serif-Kursive | `-.086`/`-.069`/`-.05em` | `-.04em` |
  | Abfragetext | `-.05em` | `-.035em` |

  Kursive Akzentzeilen brechen bei Bedarf ausgewogen um (`text-wrap: balance`)
  statt mit Einzelwort. Bei „6 fällig" steht nach der großen Zahl ein eigener
  Abstand. Der Gate-Test „Typografie" hält diese Untergrenzen.
- **Fokusringe:** Alle Hub-Regeln haben Spezifität 0 (`:where`), damit die
  Ringe der Vertragsbausteine (3 px, Abstand 2 px) unverändert gewinnen. Auf
  dunklen Flächen Lime, auf Papier dunkles Moosgrün.
- **Kopfzeile:** eine Komponente für alle Routen, nicht klebend (kein
  verdeckter Fokus), unter 900 px Navigation als eigene Zeile im Fluss.
- **Pfadzeilen:** Ziel und Status nur aus `catalog.ts`; ohne Adresse
  „Noch nicht verbunden" ohne Link. Geplante Pfade als Liste ohne Link und
  ohne Termin. Unit-Tests: `src/lib/learning-os*.test.ts`.
- **Lernmoment:** unverändert rein lokal; neu nur ein echter Link
  „JOINs im SQLPfad vertiefen", wenn SQLPfad konfiguriert ist.
- **Liquid Sculpture Hero entfernt.** Mit der Übernahme des Wissensorbits
  auf `/` hatte die Komponente keine Verwendung mehr. Code, CSS, Bilder,
  Unit- und Browserfälle (27 von 91 E2E-Fällen) sind gelöscht, Lizenzhistorie
  in `THIRD_PARTY_NOTICES.md`, Archiv in `docs/LIQUID-HERO.md`.
- **Ohne JavaScript:** Startseite, `/wiederholen`, `/fortschritt` und 404
  stehen vollständig im Server-HTML. `/vokabeln` zeigt im Ladekopf nach 4 s
  einen Hinweis, falls nichts lädt (ohne JavaScript oder bei gesperrtem
  Browserspeicher): Die Daten liegen nur im Browser. Ein `<noscript>` wurde
  verworfen, weil es hängendes JavaScript nicht abdeckt.
- **Keine Änderungen** an Domäne, Speicherformat, Import/Export, Limits,
  Konfliktsperre, Zeitbasis, Föderation, Auth/Cookies/CORS, Abhängigkeiten
  oder Next.js-Version.

### Gates

- `npm audit --omit=dev --audit-level=high`, `npm run typecheck`,
  `npm run test`, `npm run build`, `npm run test:e2e` (ohne Retries).
- Neu `e2e/learning-os-integration.spec.ts`: alle vier Routen bei 375, 390,
  640, 920, 1280 und 1440 px — gemeinsame Kopfzeile (Reihenfolge,
  `aria-current`, Ink), Flächen (Papier, Kopf direkt unter der Kopfzeile),
  genau eine H1, kein Überlauf, keine abgeschnittenen Überschriften, axe,
  Ganzseitenaufnahmen; reduzierte Bewegung (keine laufende Animation, mit
  Gegenprobe), Tastatur und Sprunglink, Pfadziele aus dem Katalog,
  keine Fremdanfragen, Reihenfolge im VokabelPfad, LIVE/LOKAL/DEMO-Trennung,
  Fortschritt ohne Prozent, SSR ohne JavaScript.
- `e2e/learning-os-browser-zoom.spec.ts`: echter Chrome-Seitenzoom 200 %
  (`chrome.tabs.setZoom`) auf allen vier Routen.
- `e2e/startseite.spec.ts`: Überschriftenzeilen nie unter Orbit oder
  RECALL-Tafel (900–1440 px).

### Bekannte Grenzen

- Visuelle Regression ohne Pixel-Baselines: Schriften unterscheiden sich
  zwischen macOS (SF/Helvetica) und Linux-CI (Ersatzschrift). Geprüft werden
  Geometrie, Farben, Struktur und Laufweiten-Untergrenzen; die Aufnahmen liegen
  im CI-Artefakt. Die Linux-Aufnahmen wurden am 17.11.2026 von Hand gesichtet.
  Die Schriftprobe nutzte Arial und Times New Roman unter macOS als
  metrikgleiche Stellvertreter der Linux-Ersatzschriften. Die Bestätigung in
  der echten Linux-Umgebung liefert der nächste CI-Lauf.
- Indigo-Knöpfe des Komponentenvertrags neben Lime-Akzenten: bewusst, bis
  der Vertrag selbst einen Hub-Akzent für das Learning OS bekommt (eigener,
  app-übergreifender Schritt).
- Der Lernmoment der Startseite ist ohne JavaScript sichtbar, aber nicht
  bedienbar.
