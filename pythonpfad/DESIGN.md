---
meta:
  name: PythonPfad
  version: 2.0.0
  status: aktiv

colors:
  ink:
    50: '#f4f2fb'
    100: '#e9e5f6'
    200: '#ded9f0'
    300: '#bdb5dd'
    400: '#8981ae'
    500: '#565080'
    600: '#423c66'
    700: '#332e52'
    800: '#2a2545'
    900: '#211d47'
    950: '#12102b'
  accent:
    soft: '#eef4ff'
    default: '#1d3fc4'
    hover: '#1e379f'
    deep: '#1d337d'
  modul:
    grundlagen: '#7c3aed'
    schritte: '#0d9488'
    entscheidungen: '#ea580c'
    schleifen: '#2563eb'
    projekt: '#db2777'
    wiederholen: '#4d7c0f'
  status:
    erfolg: '#0f6b41'
    achtung: '#8a5509'
    fehler: '#99231a'
  flaeche:
    hell:
      leinwand: '{colors.ink.50}'
      karte: '#ffffff'
      vertieft: '{colors.ink.100}'
      text: '{colors.ink.900}'
      textGedaempft: '{colors.ink.500}'
    dunkel:
      leinwand: '{colors.ink.950}'
      karte: '{colors.ink.900}'
      vertieft: '#070a10'
      text: '{colors.ink.50}'
      textGedaempft: '{colors.ink.300}'

typography:
  familie:
    sans: 'IBM Plex Sans'
    mono: 'IBM Plex Mono'
  display:
    fontFamily: '{typography.familie.sans}'
    fontSize: 'clamp(2rem, 1.35rem + 2.7vw, 3.25rem)'
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: '-0.03em'
  displayKlein:
    fontFamily: '{typography.familie.sans}'
    fontSize: 'clamp(1.625rem, 1.1rem + 2.2vw, 2.5rem)'
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: '-0.02em'
  abschnitt:
    fontFamily: '{typography.familie.sans}'
    fontSize: '1.5rem'
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: '-0.01em'
  fliesstext:
    fontFamily: '{typography.familie.sans}'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.65
  quelltext:
    fontFamily: '{typography.familie.mono}'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.7

layout:
  breite:
    lesen: '65ch'
    inhalt: '56rem'
    weit: '80rem'
  abstand:
    eng: '0.5rem'
    normal: '1rem'
    weit: '1.5rem'
    abschnitt: '2rem'

elevation:
  1: '0 1px 2px hsl(var(--shadow-tint) / 0.06), 0 1px 3px hsl(var(--shadow-tint) / 0.08)'
  2: '0 2px 4px hsl(var(--shadow-tint) / 0.06), 0 8px 16px -4px hsl(var(--shadow-tint) / 0.12)'
  3: '0 4px 8px hsl(var(--shadow-tint) / 0.08), 0 24px 48px -12px hsl(var(--shadow-tint) / 0.24)'

shapes:
  radius:
    klein: '0.75rem'
    normal: '1rem'
    karte: '1.5rem'
    voll: '9999px'

motion:
  dauer:
    schnell: '120ms'
    normal: '220ms'
    langsam: '380ms'
  kurve:
    standard: 'cubic-bezier(0.2, 0, 0, 1)'
    abbremsend: 'cubic-bezier(0, 0, 0, 1)'
    betont: 'cubic-bezier(0.2, 0.9, 0.25, 1.06)'
    feder: 'cubic-bezier(0.22, 1.12, 0.36, 1)'

components:
  karte:
    backgroundColor: '{colors.flaeche.hell.karte}'
    textColor: '{colors.flaeche.hell.text}'
    rounded: '{shapes.radius.karte}'
    padding: '{layout.abstand.weit}'
  knopfHaupt:
    backgroundColor: '{colors.accent.default}'
    textColor: '#ffffff'
    rounded: '{shapes.radius.normal}'
---

# Gestaltung von PythonPfad

## Overview

PythonPfad bringt erwachsenen Anfängern Python bei. Die typische Nutzerin ist
berufstätig, sitzt abends zwanzig Minuten davor und hat schon zwei Kurse
abgebrochen. Daraus folgt alles Weitere.

Die Oberfläche muss zwei Dinge gleichzeitig sein: **zugewandt genug**, dass man
sie freiwillig öffnet, und **ernst genug**, dass man ihr die Sache zutraut. Das
ist kein Widerspruch, aber eine schmale Gasse. Zu viel Buntheit wirkt wie eine
Kinder-App und beschädigt genau das Zutrauen, das jemand braucht, der sich für
zu dumm zum Programmieren hält. Zu wenig wirkt wie eine Dokumentation.

Was diese Anwendung ausdrücklich **nicht** tut: Punkte vergeben, Serien
erzwingen, Ranglisten führen, mit Verlust drohen. Das gehört ins Design, nicht
nur in die Produktentscheidung – Bildsprache wirkt schneller als Text. Ein
Flammensymbol für eine Lernserie führt Serienzwang ein, auch wenn nirgends
steht, dass man sie halten muss.

## Colors

Die Grundskala trägt durchgehend einen Indigoanteil. Es gibt kein neutrales
Grau und kein reines Schwarz in dieser Anwendung.

Das ist die wichtigste Farbentscheidung, und sie ist eine Korrektur: Die erste
Fassung benutzte ein neutrales Kaltgrau von `#f6f7f9` bis `#161b25`. Damit stand
jede Farbe auf einer grauen Fläche, und die Seiten wirkten wie ein unverputztes
Haus – der Schmuck war da, der Untergrund nicht. Der Indigoanteil ist im
einzelnen Wert kaum zu benennen und in der Fläche sofort zu sehen: helle Töne
wirken wie getöntes Papier statt wie Bildschirmweiß, dunkle wie Tinte statt wie
Ruß.

**Modulfarben.** Jedes Modul hat eine Leitfarbe, die auf der Lernpfadseite, im
Kopfbereich der Lektion und in der Navigation wieder auftaucht. Wer die Farbe
einmal kennt, findet den Bereich, ohne zu lesen. Die sechs Farben unterscheiden
sich zusätzlich zur Buntheit in der Helligkeit, damit sie bei Farbsehschwäche
auseinanderzuhalten bleiben.

**Kontrast ist gemessen, nicht geschätzt.** Alle Textpaarungen erfüllen WCAG 2.2
Stufe AA in beiden Farbschemata. `tests/unit/farbkontrast.test.ts` liest die
Werte aus `globals.css` und rechnet nach; eine Farbänderung, die die Lesbarkeit
kippt, lässt die Testsuite scheitern.

## Typography

**IBM Plex Sans** für alles, **IBM Plex Mono** für Quelltext. Beide selbst
ausgeliefert.

Vorher stand hier die Systemschrift (`ui-sans-serif, system-ui`). Das ist die
Voreinstellung, die man wählt, wenn man über Schrift nicht nachgedacht hat – und
man sieht es einer Oberfläche sofort an. Plex ist eine ausdrücklich für ein
Unternehmen entworfene Schrift: sachlich, in kleinen Graden gut lesbar, mit
sauberen Umlauten und ß. Dass Fließtext und Quelltext aus derselben Familie
stammen, ist bei einer Programmieranwendung mehr als Kosmetik: Der Wechsel
zwischen Erklärung und Code ist der häufigste Blicksprung überhaupt.

Bewusst **nicht Inter**. Die steckt inzwischen in so vielen Oberflächen, dass sie
selbst zum Systemgeschmack geworden ist.

**Der Sprung zwischen Überschrift und Text ist groß.** Eine Überschrift, die nur
zwei Punkt größer ist als der Absatz darunter, ordnet nichts – sie sieht nur
nach Überschrift aus. Alle Größen stehen in `rem`, damit die Browsereinstellung
greift.

## Layout

Lesetexte laufen auf `65ch`. Längere Zeilen zwingen das Auge zum Suchen der
nächsten Zeile, und das merkt man erst nach zwei Absätzen als Ermüdung.

Inhaltsseiten sind auf `56rem` begrenzt, Übersichten mit Tabellen auf `80rem`.

## Elevation & Depth

Drei Stufen reichen: **aufliegend** (Karte mit Betonung), **schwebend** (Menü,
Popover), **abgehoben** (Dialog). Alle drei leiten sich aus einem gemeinsamen
Grundton ab, der je Farbschema wechselt – sonst wirken Schatten im dunklen
Schema milchig statt tief.

**Kein `backdrop-filter` auf dauerhaft sichtbaren Flächen.** Das ist keine
Geschmacksfrage, sondern zweimal teuer bezahlt: Eine durchscheinende, klebende
Kopfleiste zwingt den Browser, bei jedem Bildaufbau den Bereich dahinter neu
weichzuzeichnen. In einem Testlauf liefen dadurch sogar Serveraufrufe ins
Zeitlimit.

## Shapes

Karten haben einen Radius von 24 Pixeln. Ein Radius von 16 wirkt sachlich, einer
von 24 zugewandt – bei einer Anwendung für Menschen, die sich für zu dumm zum
Programmieren halten, ist das keine Geschmacksfrage.

Flächen tragen Struktur statt Leere: Punktraster, Karopapier, Schraffur,
konzentrische Bögen, Stufen. Alle bestehen ausschließlich aus CSS-Verläufen –
keine Bilddatei, kein zusätzlicher Abruf. Jedes Muster läuft zum Rand hin aus;
ein hart abgeschnittenes Raster liest sich als Fehler, nicht als Gestaltung.

Die Muster liegen auf einem eigenen `::after` hinter dem Inhalt. Der
naheliegende Weg – Muster und Maske direkt auf die Karte – ist falsch:
`mask-image` gilt für das Element samt allen Kindern und blendet den Text mit
aus.

## Components

**Symbole gibt es in zwei Sätzen mit unterschiedlichen Regeln.** In der
Navigation stehen gefüllte, zweitönige Formen, die die Bereichsfarbe annehmen.
Im Inhalt stehen Emojis. Die Trennung ist keine Laune: Eine Leiste, die auf
jeder Seite oben klebt, muss auf jedem Betriebssystem gleich aussehen und sich
einfärben lassen. Beides kann ein Emoji nicht.

**Knöpfe haben eine sichtbare Unterkante, die beim Drücken einsinkt.** Damit ist
der Zustand „gedrückt" an der Geometrie erkennbar und nicht allein an einem
Farbwechsel – ein Vorteil bei Farbsehschwäche und bei hellem Umgebungslicht.

**Diagramme rechnen außerhalb der Komponente.** Die Geometrie steht in
`domain/design/chart-layout.ts` und ist ohne Browser prüfbar. Diagramme sind der
Ort, an dem sich Darstellungsfehler am leichtesten verstecken: eine Säule, die
bei einem Wert von null trotzdem einen Pixel hoch ist, eine Achse, die „0,3
Aufgaben" behauptet. Man sieht ein Bild, es sieht plausibel aus, und es stimmt
nicht.

## Do's and Don'ts

**Tun:**

- Farbe in die Fläche legen, nicht nur obendrauf. Ein farbiger Kopfbereich über
  weißen Karten auf grauem Grund bleibt ein Rohbau.
- Zu jeder farblichen Rückmeldung Symbol und Text setzen (WCAG 1.4.1).
- Kontraste nachrechnen. „Sieht lesbar aus" heißt bei hellem Grau auf Weiß
  regelmäßig 3:1.
- Muster und Zierformen aus CSS bauen, nicht aus Bilddateien.
- Feste Positionen für dekorative Streuungen wählen. Eine Zierde, die bei jedem
  Aufbau anders aussieht, macht jeden Bildvergleich im Test wertlos.

**Lassen:**

- **Keine Systemschrift.** Sie ist der schnellste Hinweis darauf, dass über
  Gestaltung nicht nachgedacht wurde.
- **Kein reines Schwarz, kein neutrales Grau.** Immer getönt.
- **Keine Federkurven mit starkem Überschwingen.** Eine Oberfläche, die bei
  jeder Bestätigung nachwippt, wirkt nicht lebendig, sondern billig. Über zehn
  Prozent Überschwingen wird es sichtbar.
- **Keine Dauerbewegung auf großen, weichgezeichneten Flächen.** Zweimal hat das
  hier Serveraufrufe ins Zeitlimit getrieben.
- **Keine Karte in einer Karte.** Wenn alles hervorgehoben ist, ist nichts
  hervorgehoben.
- **Keine strafende Bildsprache.** Kein Daumen nach unten, kein trauriges
  Gesicht, keine Flamme für Serien.

---

_Format nach der DESIGN.md-Spezifikation (google-labs-code/design.md): YAML-Token
für Maschinen, Prosa für Menschen, Abschnitte in fester Reihenfolge._
