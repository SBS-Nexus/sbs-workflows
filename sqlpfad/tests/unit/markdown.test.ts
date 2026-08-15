import { describe, expect, it } from 'vitest';
import { leseMarkdown, leseZeile, NICHT_UNTERSTUETZT } from '@/domain/inhalt/markdown';
import { LEHRPLAN } from '@/content';

describe('Zeilen mit Auszeichnung', () => {
  it('erkennt Fettes', () => {
    expect(leseZeile('Ein **wichtiges** Wort')).toEqual([
      { art: 'text', text: 'Ein ' },
      { art: 'fett', text: 'wichtiges' },
      { art: 'text', text: ' Wort' },
    ]);
  });

  it('erkennt Quelltext', () => {
    expect(leseZeile('Schreib `SELECT`')).toEqual([
      { art: 'text', text: 'Schreib ' },
      { art: 'code', text: 'SELECT' },
    ]);
  });

  it('erkennt Kursives', () => {
    expect(leseZeile('nur *wahr* zählt')).toEqual([
      { art: 'text', text: 'nur ' },
      { art: 'kursiv', text: 'wahr' },
      { art: 'text', text: ' zählt' },
    ]);
  });

  it('verwechselt Fettes nicht mit zweimal Kursivem', () => {
    // Die Reihenfolge der Alternativen im Ausdruck hängt daran.
    expect(leseZeile('**fett**')).toEqual([{ art: 'fett', text: 'fett' }]);
  });

  it('lässt Sternchen innerhalb von Quelltext in Ruhe', () => {
    /*
     * Der Grund für einen Durchgang statt zweier: Wer erst fett und dann Code
     * ersetzt, macht aus `SELECT **` etwas, das niemand geschrieben hat -
     * und in SQL steht der Stern ständig.
     */
    const teile = leseZeile('Nimm `SELECT * FROM Kunden`');
    expect(teile).toContainEqual({ art: 'code', text: 'SELECT * FROM Kunden' });
    expect(teile.some((teil) => teil.art === 'fett' || teil.art === 'kursiv')).toBe(false);
  });

  it('gibt reinen Text unverändert zurück', () => {
    expect(leseZeile('Nur Text')).toEqual([{ art: 'text', text: 'Nur Text' }]);
  });
});

describe('Blöcke', () => {
  it('liest einen Codeblock mit Sprache', () => {
    const blöcke = leseMarkdown('Vorher\n\n```sql\nSELECT 1;\n```\n\nNachher');
    expect(blöcke[1]).toEqual({ art: 'code', sprache: 'sql', text: 'SELECT 1;' });
    expect(blöcke).toHaveLength(3);
  });

  it('behält Zeilenumbrüche im Codeblock', () => {
    const blöcke = leseMarkdown('```sql\nSELECT Name\nFROM Kunden;\n```');
    expect(blöcke[0]).toMatchObject({ text: 'SELECT Name\nFROM Kunden;' });
  });

  it('liest eine Tabelle mit Kopfzeile', () => {
    const blöcke = leseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |');
    expect(blöcke[0]?.art).toBe('tabelle');
    if (blöcke[0]?.art !== 'tabelle') return;
    expect(blöcke[0].kopf).toHaveLength(2);
    expect(blöcke[0].zeilen).toHaveLength(2);
  });

  it('liest eine Aufzählung', () => {
    const blöcke = leseMarkdown('- erster\n- zweiter');
    expect(blöcke[0]).toMatchObject({ art: 'liste' });
    if (blöcke[0]?.art !== 'liste') return;
    expect(blöcke[0].punkte).toHaveLength(2);
  });

  it('fasst Fortsetzungszeilen eines Punkts zusammen', () => {
    const blöcke = leseMarkdown('- ein Punkt, der\n  über zwei Zeilen geht\n- der zweite');
    if (blöcke[0]?.art !== 'liste') throw new Error('kein Listenblock');
    expect(blöcke[0].punkte).toHaveLength(2);
    expect(blöcke[0].punkte[0]?.[0]?.text).toContain('über zwei Zeilen');
  });

  it('fügt einen umbrochenen Absatz zu einem zusammen', () => {
    // Im Quelltext umbrochene Zeilen sind ein Absatz und keine drei.
    const blöcke = leseMarkdown('Erste Zeile\nzweite Zeile\ndritte Zeile');
    expect(blöcke).toHaveLength(1);
    expect(blöcke[0]).toMatchObject({ art: 'absatz' });
  });

  it('deutet fremdes Markup nicht als Markup', () => {
    /*
     * Der Grund, warum hier keine Bibliothek steht, die HTML erzeugt: Ein
     * Skript im Inhalt bleibt Text, weil er nirgends als HTML gelesen wird.
     */
    const blöcke = leseMarkdown('<script>alert(1)</script>');
    expect(blöcke[0]).toEqual({
      art: 'absatz',
      teile: [{ art: 'text', text: '<script>alert(1)</script>' }],
    });
  });
});

describe('Die Lektionstexte benutzen nur, was der Leser kann', () => {
  /*
   * Ohne diesen Test schreibt irgendwann jemand eine Überschrift in einen
   * Lektionstext, und sie erscheint als Absatz mit Rautezeichen davor - eine
   * Kleinigkeit, die niemandem auffällt, weil sie nur seltsam aussieht.
   */
  const texte = LEHRPLAN.module.flatMap((modul) =>
    modul.lektionen.map((lektion): [string, string] => [lektion.slug, lektion.text]),
  );

  it.each(texte)('%s', (_slug, text) => {
    const gefunden = NICHT_UNTERSTUETZT.filter((eintrag) => eintrag.muster.test(text)).map(
      (eintrag) => eintrag.name,
    );
    expect(gefunden).toEqual([]);
  });

  it('liest jeden Text ohne leeres Ergebnis', () => {
    for (const [slug, text] of texte) {
      expect(leseMarkdown(text).length, `Lektion ${slug}`).toBeGreaterThan(0);
    }
  });
});
