import { describe, expect, it } from 'vitest';
import { layoutTrail } from '@/domain/design/trail-layout';
import { MODULE_THEMES, PROJECT_THEME, REVIEW_THEME, moduleTheme, themeStyle } from '@/domain/design/module-theme';

describe('Strecke des Lernpfads', () => {
  it('liefert für null Stationen nichts zu zeichnen', () => {
    const layout = layoutTrail(0);
    expect(layout.points).toEqual([]);
    expect(layout.path).toBe('');
    expect(layout.height).toBe(0);
  });

  it('setzt die erste Station in die Mitte', () => {
    const layout = layoutTrail(1);
    expect(layout.points).toHaveLength(1);
    expect(layout.points[0]!.x).toBe(50);
    // Eine einzelne Station bekommt einen Punkt, aber keine Kurve.
    expect(layout.path).toBe('M 50 54');
  });

  it('schwingt nach rechts, zurück zur Mitte, nach links und wieder zurück', () => {
    const layout = layoutTrail(5, { amplitude: 20 });
    expect(layout.points.map((p) => p.x)).toEqual([50, 70, 50, 30, 50]);
  });

  it('hält den senkrechten Abstand gleich', () => {
    const layout = layoutTrail(4, { step: 100 });
    expect(layout.points.map((p) => p.y)).toEqual([50, 150, 250, 350]);
    expect(layout.height).toBe(400);
  });

  it('zeichnet je Übergang genau eine Kurve', () => {
    const layout = layoutTrail(4);
    expect(layout.path.startsWith('M ')).toBe(true);
    expect(layout.path.split('C').length - 1).toBe(3);
  });

  it('trifft jede Station mit senkrechten Steuerpunkten', () => {
    // Die Steuerpunkte liegen auf halber Höhe zwischen den Stationen und
    // teilen deren x-Wert. Nur so knickt die Linie an keiner Station.
    const layout = layoutTrail(2, { step: 100, amplitude: 20 });
    expect(layout.path).toBe('M 50 50 C 50 100, 70 100, 70 150');
  });

  it('ist ein echter Anfang der längeren Strecke', () => {
    // Darauf beruht die farbige Markierung des zurückgelegten Wegs: Die
    // Komponente rechnet den Anfang einfach mit weniger Stationen aus.
    const kurz = layoutTrail(3);
    const lang = layoutTrail(7);
    expect(lang.path.startsWith(kurz.path)).toBe(true);
    expect(lang.points.slice(0, 3)).toEqual(kurz.points);
  });

  it('nimmt auch sehr viele Stationen ohne Ausreißer', () => {
    const layout = layoutTrail(60, { amplitude: 22 });
    for (const point of layout.points) {
      expect(point.x).toBeGreaterThanOrEqual(28);
      expect(point.x).toBeLessThanOrEqual(72);
    }
  });
});

describe('Modulfarben', () => {
  it('gibt jedem der ersten Module eine eigene Farbe', () => {
    const farben = MODULE_THEMES.map((_, index) => moduleTheme(index).color);
    expect(new Set(farben).size).toBe(MODULE_THEMES.length);
  });

  it('läuft bei mehr Modulen um, statt zu scheitern', () => {
    expect(moduleTheme(MODULE_THEMES.length)).toEqual(moduleTheme(0));
    expect(moduleTheme(MODULE_THEMES.length + 2)).toEqual(moduleTheme(2));
  });

  it('kommt mit negativen und gebrochenen Nummern zurecht', () => {
    // Die Reihenfolge kommt aus der Datenbank; ein unerwarteter Wert darf
    // keine farblose Kachel und erst recht keinen Absturz ergeben.
    expect(moduleTheme(-1)).toEqual(moduleTheme(MODULE_THEMES.length - 1));
    expect(moduleTheme(2.7)).toEqual(moduleTheme(2));
  });

  it('hält Projekte und Wiederholen von den Modulfarben getrennt', () => {
    const modulfarben = new Set(MODULE_THEMES.map((theme) => theme.color));
    expect(modulfarben.has(PROJECT_THEME.color)).toBe(false);
    expect(modulfarben.has(REVIEW_THEME.color)).toBe(false);
  });

  it('liefert ein Stilobjekt mit beiden Eigenschaften', () => {
    expect(themeStyle(moduleTheme(1))).toEqual({
      '--akzent': 'var(--color-modul-1)',
      '--akzent-soft': 'var(--color-modul-1-soft)',
    });
  });
});
