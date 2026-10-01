# Lernpfade — Navigation Contract

Stand: 2026-10-01

## Ziel

PythonPfad, SQLPfad und AIPfad verwenden dieselbe Navigationslogik, ohne
fachliche Unterschiede zu verstecken.

Die Person soll beim Wechsel des Lernpfads nicht neu lernen müssen, **wie**
die Anwendung bedient wird.

## 1. Shell-Hierarchie

Jede Lernapp besteht aus drei Navigationsebenen.

### Ebene 1 — Lernpfade

Globale Dachleiste:

```text
Lernpfade / <aktueller Pfad>          Wiederholen   Alle Pfade →
```

Sie gehört zur Plattform, nicht zum Fachpfad.

### Ebene 2 — Fachpfad

Angemeldete Kernnavigation.

Semantische Reihenfolge:

```text
Überblick
Lernen
Üben / Labs
Projekte
Wiederholen
Fortschritt
Profil
```

Nur tatsächlich vorhandene Bereiche werden angezeigt.

### Ebene 3 — Fachwerkzeug

Innerhalb einer Seite:

- Python Editor
- SQL Runner
- AI Lab
- Git Visualizer
- Review Card

Diese Navigation ist fachlich und muss nicht vereinheitlicht werden.

## 2. Desktop-Vertrag

Ab `sm`:

- Fachmarke links
- primäre Bereiche in der Mitte
- Theme/Account-Aktionen rechts, soweit der Pfad sie unterstützt
- aktive Seite mit `aria-current="page"`
- Kontoaktionen nicht als primäre Navigation behandeln
- Admin-/Redaktionsziele dürfen sichtbar sein, bleiben aber serverseitig
  autorisiert

## 3. Mobile-Vertrag

Unter `sm`:

- kompakter Top Header für Marke und Konto
- Kernnavigation als feste Bottom Navigation
- Hauptinhalt reserviert ausreichend Bottom Padding
- kein horizontaler Zwangsscroll für die primären Lernbereiche
- gleiche Labels wie auf Desktop
- `aria-current="page"` bleibt erhalten

## 4. Aktuelle Pfadzuordnung

| Semantik | PythonPfad | SQLPfad | AIPfad |
|---|---|---|---|
| Überblick | Lernen als Einstieg | Fortschritt | Pfad |
| Lernen | Lernen | Lernen | Lernen |
| Üben | Üben | Üben | Labs |
| Projekte | Projekte | Projekte | noch nicht eigener Bereich |
| Wiederholen | Wiederholen | Wiederholen | Wiederholen |
| Fortschritt | Fortschritt | Überblick/Fortschritt | Fortschritt |
| Profil | Profil | Profil | noch kein eigener Profilbereich |

Die Tabelle ist bewusst ehrlich: Homogenität bedeutet nicht, leere Bereiche
zu erfinden.

## 5. Mobile Kernnavigation

### PythonPfad

- Lernen
- Üben
- Projekte
- Wiederholen
- Fortschritt
- Profil

### SQLPfad

- Überblick
- Lernen
- Üben
- Projekte
- Wiederholen
- Profil

### AIPfad

- Überblick
- Lernen
- Labs
- Wiederholen
- Fortschritt

AIPfad erhält erst dann einen Profil- oder Projekt-Tab, wenn dahinter eine
echte Funktion steht.

## 6. Account-Menü

Kontoaktionen stehen außerhalb der primären Lernnavigation.

Mindestens:

- aktuelle Person erkennbar
- Abmelden

Wenn vorhanden:

- Profil/Einstellungen
- Darstellung
- Admin/Redaktion
- Setup

Abmelden bleibt eine Server Action; ein ausgeblendeter Link ist niemals
Zugangskontrolle.

## 7. Review-Signal

Wenn ein Fachpfad die Zahl fälliger Reviews bereits effizient serverseitig
kennt, darf `Wiederholen` einen Zähler bzw. mobilen Punkt zeigen.

Regeln:

- keine aggressive Notification-Farbe
- keine Verlustmechanik
- keine Streak-Drohung
- Textalternative für Screenreader
- Zähler stammt aus serverseitig gescopten Nutzerdaten

## 8. Accessibility

Pflicht:

- `aria-current="page"`
- sichtbarer Fokus
- Bottom Navigation per Tastatur erreichbar
- mindestens WCAG 2.2 AA Kontrast
- Textlabel zusätzlich zum Symbol
- keine Navigation nur über Farbe
- Mobile Content nicht von fixer Navigation verdecken

## 9. Technischer Scope

LP-03/LP-04 vereinheitlicht die Shell.

Nicht enthalten:

- gemeinsames Konto
- Session-Federation
- gemeinsame Datenbank
- Review-Adapter
- gemeinsame Progress-API
- fachliche Route-Migration

Diese Entscheidungen folgen separat gemäß `ROADMAP.md`.
