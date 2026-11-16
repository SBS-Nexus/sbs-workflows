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
