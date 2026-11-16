# Lernpfade Hub – Experience Refresh 01 (Railway-Staging)

Stand: 16.11.2026 · eigenständiger Draft-Slice auf dem geprüften
Hero-/Security-Stand von PR #75. Kein produktiver Rollout durch diesen Slice.

## Zielbild

Die Startseite soll sich wie ein nutzbarer Lernarbeitsplatz anfühlen, nicht wie
ein langer Produktkatalog. Ein Hauptziel: Nutzerinnen und Nutzer finden
sofort einen funktionierenden Einstieg in den lokalen VokabelPfad. Der
vorhandene Daily Review bleibt ehrlich als Demo, solange keine LIVE-Quellen
konfiguriert sind.

Gestaltungsrichtung: klare, ruhige Lern-SaaS-Oberfläche; viel Weißraum an
den richtigen Stellen, dunkelblaue Typografie, differenzierte Indigoflächen,
kleinere Karten, lesbare Texte und eindeutige Primäraktionen.

## Änderungen

- `src/styles/hub-experience.css`: hub-spezifisches Layout und eigene
  Präsentationstokens, bewusst **keine** Änderung der kanonischen LP-03-Styles.
- Hero auf breiten Bildschirmen kürzer und zweispaltig; Illustration rechts,
  Text plus CTA links. Bis 1023 px bleibt die für WebGL und Touch geprüfte
  Grafik vor dem Text in einer zugänglichen Einzelspalte. Kein neues Asset
  und kein Eingriff in die WebGL-Engine.
- Startbereich mit klarer Hauptaktion `/vokabeln` und sekundärem,
  ausdrücklich als Demo gekennzeichnetem `/wiederholen`-Einstieg.
- Pfadkarten kompakter. Ohne konfigurierte Fach-App-URL wird **nicht**
  `Verfügbar` behauptet, sondern `Noch nicht verbunden`; die Karte
  erzeugt weiterhin keinen toten Link.
- VokabelPfad: Session-Aufbau in der DOM-Reihenfolge vor der Statistik,
  damit der wichtigste Nutzerweg früher erreichbar ist. Die lokale
  Speicherwarnung bleibt sichtbar und inhaltlich unverändert.
- Karten, Eingaben, Fortschritt, Wiederholung, Mobilnavigation, Fokus und
  Formulare erhalten ein gemeinsames visuelles Raster und konsistente
  Flächen/Radien.

## Bewusste Grenzen

- Keine Scheduler-/Review-/IndexedDB-/Import-/Export-/API-Änderung.
- Keine erfundenen Nutzerzahlen, Lernzeiten, Ergebnisse oder
  plattformübergreifenden Identitäten.
- Kein Hinzufügen von SSO, externen Fonts oder Analytics.
- `lernpfade` bleibt das einzige betroffene Deployable.
- Keine Änderungen an PythonPfad, SQLPfad, AIPfad oder der gemeinsamen
  LP-03A/B/C-Shell.
- Das bestehende Railway-Staging wird erst nach grüner CI auf den neuen
  Exact-SHA-Stand gesetzt; `main` und PR #41 bleiben unberührt.

## Abnahme und Tests

```bash
cd lernpfade
npm install --no-audit --no-fund
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Browser-Gates müssen gegen den echten Production-Build ohne Retries
Desktop 1280/1440, Zwischenbreiten 700–1024, Mobil 375 px,
200-%-Zoom, WebGL-Interaktion, Tastaturwege, fehlenden horizontalen
Scrollbereich und Accessibility prüfen. Bereits bestehende E2E-Fälle
werden nicht entfernt oder abgeschwächt.

## Unabhängiger Review-Fokus

1. CSS-Grid des Hero: Schrift und Artwork dürfen auch mit breiter
   Linux-Ersatzschrift und bei 200-%-Zoom nicht überlappen.
2. 375/640/700 px: Navigation muss vollständig bedienbar sein;
   durch den Refresh dürfen weder Links noch Tastaturfokus verschwinden.
3. Browserlokale Speicherung und ehrliche Verfügbarkeitslabels bleiben
   unverändert.
4. Marken- und Interaktionsgestaltung ist eine **erste Designvariante**,
   keine endgültige Produktfreigabe ohne tatsächliche visuelle Abnahme.


## Creative Direction 02 – „Learning in Motion“ (21st.dev × HorizonX)

### Quellenanalyse und Transfer (16.11.2026)

Öffentlich zugängliche Referenzen, keine Installation fremder Premium-Assets:
- 21st.dev, öffentliches Popular-Ranking: https://21st.dev/community/components
  „Scroll media expansion hero“, „Container Scroll Animation“, „Spotlight Card“,
  „Radial Orbital Timeline“, „Scroll Morph Hero“, „Motion Footer“.
  Übernahme als Gestaltungsprinzip: **Motion erzählt einen Zweck und erklärt eine
  Interaktion**, statt universeller Glühkarten und parallax auf jeder Fläche.
- HorizonX, kuratierte Arbeiten: https://horizonx.so/explore
  MOTIF (massive typografische Identität und strenge Materialpalette):
  https://horizonx.so/explore/motif
  Cinderline (editoriale Hierarchie und Projekt-Rhythmus):
  https://horizonx.so/explore/cinderline
  Veyra (sinnvolle Orbit-/Capability-Navigation, Reduced Motion):
  https://horizonx.so/explore/veyra
  Good Move (klare Haltung, gestaffeltes Informationsnarrativ):
  https://horizonx.so/explore/good-move
  Keine Komponente, Bilddatei, CSS-Datei oder käufliches Template wird kopiert.
  Eigene Präsentation und Produktsemantik; Lizenz des bestehenden Partikeleffekts
  siehe THIRD_PARTY_NOTICES.md.

### Positionierung und Designethik

**Nicht:** SaaS-Template mit 6 gleichen Boxen, erfundenen Prozentwerten,
Schein-LIVE-Dashboards, Glassmorphism über allen Komponenten, ziellosen
Bewegungseffekten oder generischen „Feature-Karten“.

**Stattdessen:** Lernpfade ist ein Learning Operating System – weniger
Kurskatalog, mehr eigener digitaler Arbeitsraum. Öffentliche Startseite:
editorial, ruhig und ikonisch. Lernansichten: präzise, handlungsorientiert und
ausnahmslos ehrlich über lokalen Speicher, Demo und LIVE.

### Tokens (eigene, ohne externen Webfont)

| Rolle | Token | Farbe / Logik |
|---|---|---|
| Warmes Papier | LP Canvas | #f6f5f0 |
| Dunkle Tinte | LP Ink | #151c1a |
| Primärtext | LP Type | #222b29 |
| Muted | LP Slate | #57645e |
| Akzent / Energie | LP Signal | #d4f87d, auf dunklem Grund |
| Sekundärakzent | LP Cobalt | #345ca7 für informative Links |
| Flächenkante | LP Hairline | #d5d9d1 |

Schrift: System-Sans als funktionaler Lauftext, redaktioneller Serif-Akzent
für ausgewählte Aussagen, Mono ausschließlich für Code, Aufgabenmetadaten und
Zähler. Keine extern geladenen Fonts.

### Fünf verbindliche UX-Kompositionen

1. **Hero / erste Bildschirmhöhe:** Text und primäre Handlung zuerst –
   auf Mobil vor dem Artwork. Vorhandener WebGL-Motor bleibt eine optionale
   progressive Enhancement und respektiert Reduced Motion, lädt kein fremdes
   Bild und übernimmt keine Navigationsinteraktion.
2. **Learning Studio:** echte, lokal gerenderte, zugängliche Vorschau mit
   Lernkarten-Interaktion (Antwort bewusst aufdecken), klar als Demo
   gekennzeichnet. Keine Datenbank, keine Fake-Ergebnisse. UI ist eine
   eigenständige interaktive Arbeitsfläche, keine leere Marketing-Kachel.
3. **Lernwege-Index:** nummerierte editoriale Kurszeilen, unterschiedlich
   gewichtete Flächen, große Typografie und echte Statusangaben; keine
   sechsmal identische Kachel. Nicht verbundene Apps sind keine Links.
4. **Lernmodell:** Vier Schritte als visuelle, durchgehende Sequenz statt
   vier austauschbare Boxen. Keine erfundenen Lern- oder Erfolgszahlen.
5. **Persönlicher VokabelPfad:** Tagesaufgabe vor Statistiken und
   Administration; größere, beruhigte Eingabeflächen und klare
   Lernrichtungsauswahl. Datenwarnungen, bestätigte Löschungen,
   Importschranken und reale Review-Semantik sind unangetastet.

### Responsive / Accessibility-Vertrag

- >= 1080 px: editorial Hero 2-spaltig, Visualisierung nie über Text.
- 820–1079 px: kontrollierte 2-Spalten-Komposition ohne ungetrennten
  Überlauf, bei realen Fontmetriken; Höhen dürfen mit Text wachsen.
- <= 819 px: **Text und CTA vor Grafik**, kompakte zugängliche Navigation,
  keine reine Desktop-Hero in einer endlosen Mobilspalte.
- 375 px und Browserzoom 200 %: keine abgeschnittenen Headings, Links,
  Fieldsets oder Fokusringe.
- Touch-Ziele >= 44 px, Focus-Visible, Tastatur, kein Hover-only-Zugang,
  keine Content-Ersetzung durch Animation, prefers-reduced-motion.
- Kontrast: Text >= 4.5:1, sichtbare UI-Kanten/Fokus >= 3:1 wo relevant.
- Keine Umgehung/Entfernung von bestehenden Playwright-Assertions,
  keine neuen echten LIVE-Quellen, keine Deployments.

### Abnahme

Unit/Typecheck/Build/npm-Audit, bestehende Browser-Suite und neue zielgenaue
Tests für Arbeitsfläche und Mobile First View. Ein grüner CI-Lauf garantiert
nicht Designqualität; zusätzlich müssen Pixelbilder (Desktop/Mobil)
visuell geprüft werden. Railway-Staging verbleibt auf der freigegebenen
Vorgängerversion. Merge/Deployment bleibt manuelle Freigabe.
