import { describe, expect, it } from 'vitest';
import {
  beurteileAktivitaet,
  formatiereDauer,
  PAUSE_MINUTEN,
  type Sitzungsstand,
} from '@/domain/lernsitzung';

/**
 * Eine Lernzeit, die zu hoch ist, ist keine Motivationshilfe, sondern eine
 * Falschauskunft über den eigenen Tag – und wer sie einmal durchschaut, glaubt
 * auch den übrigen Zahlen nicht mehr.
 */

const um = (minuten: number): Date => new Date(Date.UTC(2026, 4, 1, 10, minuten, 0));

describe('Wann eine Sitzung weiterläuft', () => {
  it('beginnt neu, wenn es noch keine gibt', () => {
    expect(beurteileAktivitaet(null, um(0))).toEqual({ art: 'neu-beginnen' });
  });

  it('schreibt die Zeit zwischen zwei Aktivitäten gut', () => {
    const stand: Sitzungsstand = { lastActiveAt: um(0), activeMinutes: 0 };
    expect(beurteileAktivitaet(stand, um(7))).toEqual({ art: 'fortsetzen', aktiveMinuten: 7 });
  });

  it('summiert über mehrere Aktivitäten', () => {
    const stand: Sitzungsstand = { lastActiveAt: um(7), activeMinutes: 7 };
    expect(beurteileAktivitaet(stand, um(12))).toEqual({ art: 'fortsetzen', aktiveMinuten: 12 });
  });

  it('beginnt nach einer langen Pause neu und zählt die Pause nicht mit', () => {
    /*
     * Der Kern der Sache: Wer die Seite offen liegen lässt und abends
     * wiederkommt, hat nicht den ganzen Nachmittag gelernt.
     */
    const stand: Sitzungsstand = { lastActiveAt: um(0), activeMinutes: 12 };
    expect(beurteileAktivitaet(stand, um(PAUSE_MINUTEN + 1))).toEqual({ art: 'neu-beginnen' });
  });

  it('läuft genau an der Grenze noch weiter', () => {
    const stand: Sitzungsstand = { lastActiveAt: um(0), activeMinutes: 0 };
    expect(beurteileAktivitaet(stand, um(PAUSE_MINUTEN))).toEqual({
      art: 'fortsetzen',
      aktiveMinuten: PAUSE_MINUTEN,
    });
  });

  it('rundet angefangene Minuten ab', () => {
    // Sonst sammelt eine Reihe schneller Klicks Zeit, die niemand verbracht hat.
    const stand: Sitzungsstand = { lastActiveAt: um(0), activeMinutes: 0 };
    const gleichZeitig = new Date(um(0).getTime() + 59_000);
    expect(beurteileAktivitaet(stand, gleichZeitig)).toEqual({
      art: 'fortsetzen',
      aktiveMinuten: 0,
    });
  });

  it('verkraftet eine Zeit aus der Zukunft, ohne etwas zu erfinden', () => {
    // Kommt bei auseinanderlaufenden Uhren vor. Weder eine riesige Pause noch
    // eine Gutschrift - schlicht nichts dazu.
    const stand: Sitzungsstand = { lastActiveAt: um(10), activeMinutes: 5 };
    expect(beurteileAktivitaet(stand, um(3))).toEqual({ art: 'fortsetzen', aktiveMinuten: 5 });
  });
});

describe('Wie die Dauer dasteht', () => {
  it('schreibt Minuten aus', () => {
    expect(formatiereDauer(0)).toBe('0 Minuten');
    expect(formatiereDauer(1)).toBe('1 Minute');
    expect(formatiereDauer(25)).toBe('25 Minuten');
  });

  it('schreibt Stunden aus, statt Dezimalstellen zu zeigen', () => {
    expect(formatiereDauer(60)).toBe('1 Stunde');
    expect(formatiereDauer(65)).toBe('1 Stunde 5 Minuten');
    expect(formatiereDauer(121)).toBe('2 Stunden 1 Minute');
  });

  it('zeigt keine negative Dauer', () => {
    expect(formatiereDauer(-5)).toBe('0 Minuten');
  });
});
