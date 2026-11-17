# Learning OS – Screenshot-Nachweise (LO-UI-001)

Aufgenommen am 17.11.2026 gegen den Produktionsbuild (`next build` + `next start`)
von Commit `2d626b33aac80836573585e4931d670a19fd06ab` (Stand nach der Laufweiten-Korrektur F), Playwright-Chromium 1.62.1
auf macOS. Live- und Fortschrittsquellen sind **MOCKS** (`page.route`) unter
denselben Adressen wie in `playwright.config.ts`; es lief keine echte Fach-App.
VokabelPfad-Daten: ein frisch übernommenes Starterdeck in einem leeren Profil.

| Datei | Ansicht |
|---|---|
| `01-start-{desktop,mobil}.png` | `/` ganzseitig |
| `02-vokabeln-{desktop,mobil}.png` | `/vokabeln` mit Starterdeck, Lernmodus oben |
| `03-vokabeln-session-{desktop,mobil}.png` | Session-Bühne, Antwort aufgedeckt |
| `04-wiederholen-{desktop,mobil}.png` | `/wiederholen`: LIVE (Python nicht angemeldet, SQL/AI mit MOCK-Karten), LOKAL, DEMO |
| `05-fortschritt-{desktop,mobil}.png` | `/fortschritt` mit MOCK-Ständen aller drei Apps |
| `06-tastatur-kopfzeile-desktop.png` | Tastaturfokus in der Kopfzeile (Lime auf Ink) |
| `07-tastatur-papier-desktop.png` | Tastaturfokus auf Papier („Konzept zeigen", Moosgrün) |
| `08-reduzierte-bewegung-desktop.png` | `/` mit `prefers-reduced-motion: reduce`, 0 laufende Animationen |
| `09-ohne-js-start-{desktop,mobil}.png` | `/` ohne JavaScript (Server-HTML) |
| `10-ohne-js-vokabeln-{desktop,mobil}.png` | `/vokabeln` ohne JavaScript, Hinweis nach 4 s |
| `11-zoom-200-*.png` | echter Chrome-Seitenzoom 200 % (`chrome.tabs.setZoom`) aus `e2e/learning-os-browser-zoom.spec.ts` |

Desktop: 1440 × 900, DPR 1. Mobil: 390 × 844, DPR 2, Touch.
Die vollständigen Aufnahmen aller Routen bei 375/390/640/920/1280/1440 px legt
`e2e/learning-os-integration.spec.ts` bei jedem Lauf unter
`test-results/screenshots/learning-os-*.png` ab (CI-Artefakt `lernpfade-playwright`).
