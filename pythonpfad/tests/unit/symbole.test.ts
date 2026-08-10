import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMOJI_NAMEN, EMOJI_ZEICHEN } from '@/components/ui/emoji';
import { VOLL_SYMBOL_NAMEN } from '@/components/ui/icon-voll';

const WURZEL = path.resolve(import.meta.dirname, '..', '..');
const lies = (datei: string): string => readFileSync(path.join(WURZEL, datei), 'utf8');

/**
 * Die Trennung zwischen Navigation und Inhalt.
 *
 * In der Navigation stehen gezeichnete Vollsymbole, im Inhalt Emojis. Das ist
 * keine Geschmacksfrage: Eine Leiste, die auf jeder Seite oben klebt, muss auf
 * jedem Betriebssystem gleich aussehen und die Bereichsfarbe annehmen können.
 * Beides kann ein Emoji nicht.
 *
 * Diese Regel steht in Kommentaren – Kommentare werden aber nicht ausgeführt.
 * Deshalb hier.
 */
describe('Navigation trägt keine Emojis', () => {
  it('die Navigationsleiste enthält kein Emoji-Zeichen', () => {
    const quelle = lies('src/components/navigation/app-nav.tsx');
    const gefunden = Object.values(EMOJI_ZEICHEN).filter((zeichen) => quelle.includes(zeichen));

    expect(
      gefunden,
      'In der Navigation stehen gezeichnete Vollsymbole. Ein Emoji sähe je ' +
        'nach Betriebssystem anders aus und ließe sich nicht einfärben.',
    ).toEqual([]);
  });

  it('die Navigation benutzt die Vollsymbole', () => {
    expect(lies('src/components/navigation/app-nav.tsx')).toContain('VollSymbol');
  });
});

describe('Vollsymbole', () => {
  it('deckt jeden Navigationseintrag ab', () => {
    // Fehlt eine Form, rendert das Symbol ein leeres SVG – sichtbar wäre eine
    // Lücke in der Leiste, und zwar erst im Browser.
    const nav = lies('src/components/navigation/app-nav.tsx');
    const verwendet = [...nav.matchAll(/icon: '([a-z]+)'/g)].map((treffer) => treffer[1]);

    expect(verwendet.length).toBeGreaterThan(0);
    for (const name of verwendet) {
      expect(VOLL_SYMBOL_NAMEN, `Vollsymbol "${name}" fehlt`).toContain(name);
    }
  });

  it('zeichnet gefüllte Formen, keine Striche', () => {
    // Der ganze Zweck des zweiten Satzes. Eine Strichzeichnung hier wäre ein
    // stiller Rückfall in genau das, was ersetzt werden sollte.
    const quelle = lies('src/components/ui/icon-voll.tsx');
    expect(quelle).toContain('fill="currentColor"');
    expect(quelle).not.toContain('stroke="currentColor"');
  });
});

describe('Emoji-Satz', () => {
  it('kennt zu jedem Namen ein Zeichen', () => {
    for (const name of EMOJI_NAMEN) {
      expect(EMOJI_ZEICHEN[name].length).toBeGreaterThan(0);
    }
  });

  it('enthält nichts Strafendes', () => {
    /*
     * Diese Anwendung kennt keine Verlustmechanik, keinen Serienzwang und
     * keine Ranglisten. Ein Daumen nach unten, ein trauriges Gesicht oder eine
     * Flamme für Serien würde genau das durch die Hintertür einführen –
     * Bildsprache wirkt schneller als Text.
     */
    const verboten = ['👎', '😢', '😞', '🔥', '💔', '⏰', '❌', '😱', '🏆', '🥇'];
    const gefunden = Object.values(EMOJI_ZEICHEN).filter((zeichen) => verboten.includes(zeichen));
    expect(gefunden).toEqual([]);
  });

  it('bleibt klein genug, um einheitlich zu bleiben', () => {
    // Ein frei wählbares Zeichen führt binnen Wochen zu dreißig verschiedenen
    // Jubel-Emojis. Der Satz ist bewusst benannt und begrenzt.
    expect(EMOJI_NAMEN.length).toBeLessThanOrEqual(20);
  });
});
